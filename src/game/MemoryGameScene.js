import Phaser from 'phaser'
import { ads } from '@/core/ads'
import { audio } from '@/core/audio'
import { haptics } from '@/core/haptics'
import { t } from '@/core/i18n'
import { notifications } from '@/core/notifications'
import { isNative } from '@/core/platform'
import { state } from '@/core/state'
import { BaseScene } from '@/scenes/BaseScene'
import { addText, iconButton, rect } from '@/ui/components'
import { banner, burst, flash, floatText, ring } from '@/ui/fx'
import { CARD_H, CARD_W } from './Card'
import { findPairs, pauseMenu } from './GameUI'

const PAIR_CHECK_DELAY = 260
const SINGLE_SELECTION_TIMEOUT = 5000

/**
 * Shared memory-game behaviour for Adventure and Endless: tap/selection
 * rules, match resolution, power-ups, pause/resume, countdown, frost and
 * danger overlays. Subclasses provide the board and react through hooks:
 *
 *  get activeCards()                 unmatched cards on the board
 *  onCorrect(c1, c2, source, mid)    after a pair is matched
 *  onWrong(c1, c2)                   after a wrong pair
 *  onFreeze(on)                      freeze power-up toggled
 *  canUsePowerUp(id)                 mode restrictions
 */
export class MemoryGameScene extends BaseScene {
  initGameState() {
    this.selected = []
    this.lock = false
    this.phase = 'intro'
    this.frozen = false
    this.multiplier = 1
    this.effectBusy = false
    this.singleTimer = null
    this.streak = 0
    this.bestStreak = 0
    this.lastMatchAt = 0
    // Scene instances are reused on restart: drop references to old objects.
    this.revived = false
    this.dangerVignette = null
    this.frost = null
    this.snow = null
    this.freezeTimer = null
    this._alarmAt = 0
    this._pauseOpen = false
    this._modalPaused = false
  }

  get isPlaying() {
    return this.phase === 'playing'
  }

  // --- Layout helpers -------------------------------------------------------
  /** Scale + positions for a cols x rows grid inside a rect. */
  gridLayout(cols, rows, area, { gap = 16, maxScale = 1.3 } = {}) {
    const s = Math.min(
      (area.w - gap * (cols - 1)) / (cols * CARD_W),
      (area.h - gap * (rows - 1)) / (rows * CARD_H),
      maxScale,
    )
    const cw = CARD_W * s
    const ch = CARD_H * s
    const gx = cols > 1 ? Math.min(gap * 2, (area.w - cw * cols) / (cols - 1)) : 0
    const gy = rows > 1 ? Math.min(gap * 2, (area.h - ch * rows) / (rows - 1)) : 0
    const totalW = cw * cols + gx * (cols - 1)
    const totalH = ch * rows + gy * (rows - 1)
    const x0 = area.x + (area.w - totalW) / 2 + cw / 2
    const y0 = area.y + (area.h - totalH) / 2 + ch / 2
    const cells = []
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++)
        cells.push({ x: x0 + c * (cw + gx), y: y0 + r * (ch + gy), row: r, col: c })
    }
    return { scale: s, cells, cw, ch }
  }

  addPauseButton(x, y, size = 84) {
    this.pauseBtn = iconButton(this, x, y, 'icon_pause', size, () => this.openPause())
    this.pauseBtn.setDepth(50)
    return this.pauseBtn
  }

  // --- Taps -------------------------------------------------------------------
  tapCard(card) {
    // Taps are accepted mid-flip (e.g. while a freshly spawned card turns
    // face down) so the board never feels unresponsive.
    if (!this.isPlaying || this.lock || card.matched)
      return

    const idx = this.selected.indexOf(card)
    if (idx !== -1) {
      audio.play('click_effect', { volume: 0.7 })
      haptics.impact('light')
      this.selected.splice(idx, 1)
      card.select(false)
      card.flip(false)
      return
    }
    if (this.selected.length >= 2)
      return

    audio.play('click_effect_2', { volume: 0.8 })
    haptics.impact('light')
    this.selected.push(card)
    card.select(true)
    if (!card.faceUp)
      card.flip(true)

    this.singleTimer?.remove()
    if (this.selected.length === 1) {
      this.singleTimer = this.time.delayedCall(SINGLE_SELECTION_TIMEOUT, () => {
        if (this.selected.length === 1 && this.selected[0] === card) {
          this.selected = []
          card.select(false)
          card.flip(false)
        }
      })
    }
    if (this.selected.length === 2) {
      this.lock = true
      const [a, b] = this.selected
      this.time.delayedCall(PAIR_CHECK_DELAY + 120, () => this.resolvePair(a, b))
    }
  }

  async resolvePair(a, b) {
    if (a.type === b.type) {
      await this.matchPair(a, b, 'manual')
    }
    else {
      this.streak = 0
      audio.play('swipe')
      haptics.notify('error')
      a.wrong()
      b.wrong()
      flash(this, 0xFF2D2D, 0.18, 300)
      this.onWrong?.(a, b)
      await new Promise(resolve => this.time.delayedCall(520, resolve))
      a.select(false)
      b.select(false)
      if (!a.matched)
        a.flip(false)
      if (!b.matched)
        b.flip(false)
    }
    this.selected = this.selected.filter(c => c !== a && c !== b)
    this.lock = false
  }

  /** Match two cards (manual or via power-up) with full celebration. */
  async matchPair(a, b, source = 'manual') {
    a.matched = true
    b.matched = true
    a.disableInteractive()
    b.disableInteractive()
    this.selected = this.selected.filter(c => c !== a && c !== b)
    const now = this.time.now
    if (source === 'manual') {
      this.streak = now - this.lastMatchAt < 3500 ? this.streak + 1 : 1
      this.bestStreak = Math.max(this.bestStreak, this.streak)
      this.lastMatchAt = now
    }
    if (!a.faceUp || !b.faceUp)
      await Promise.all([a.flip(true, 200), b.flip(true, 200)])

    audio.play('pop', { rate: 1 + Math.min(this.streak, 6) * 0.04 })
    audio.play('correct_effect', { volume: 0.5 })
    haptics.notify('success')
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }

    // Cards jump towards each other, then burst.
    const pull = (c, other) => this.tweens.add({ targets: c, x: c.x + (other.x - c.x) * 0.12, y: c.y + (other.y - c.y) * 0.12 - 14, duration: 150, ease: 'Quad.easeOut' })
    pull(a, b)
    pull(b, a)
    burst(this, a.x, a.y, { count: 14, scale: 0.6 })
    burst(this, b.x, b.y, { count: 14, scale: 0.6 })
    ring(this, a.x, a.y, { color: 0x7CFFB2, size: 240 })
    ring(this, b.x, b.y, { color: 0x7CFFB2, size: 240 })
    flash(this, 0x34D399, 0.12, 260)

    this.onCorrect?.(a, b, source, mid)
    await Promise.all([a.matchOut(80), b.matchOut(80)])
    this.onPairRemoved?.(a, b, source)
  }

  // --- Power-ups --------------------------------------------------------------
  usePowerUp(id) {
    if (!this.isPlaying || this.effectBusy || this.lock)
      return
    if (this.canUsePowerUp && !this.canUsePowerUp(id))
      return
    let used = false
    switch (id) {
      case 'bomb':
        used = this.detonate(3, 'bomb')
        break
      case 'sledgehammer':
        used = this.detonate(Infinity, 'sledgehammer')
        break
      case 'flash':
        used = this.revealAll(2000)
        break
      case 'freeze':
        used = this.applyFreeze(10000)
        break
      case 'pink_ixr':
        used = this.addLife?.() ?? false
        break
      case 'red_ixr':
        used = this.applyMultiplier(2, 10000)
        break
      case 'yellow_ixr':
        used = this.applyMultiplier(10, 10000)
        break
    }
    if (used) {
      state.consumePowerUp(id)
      audio.play('powerup_use')
      haptics.impact('medium')
    }
  }

  detonate(limit, kind) {
    const pairs = findPairs(this.activeCards, limit)
    if (!pairs.length) {
      this.overlay.toast(t('no_cards_to_destroy'), 'warning')
      return false
    }
    this.effectBusy = true
    this.lock = true
    // Clear any half-made selection first.
    this.selected.forEach((c) => {
      c.select(false)
      if (!c.matched)
        c.flip(false)
    })
    this.selected = []

    const { W, H } = this
    const icon = this.add.image(W / 2, H / 2, 'ui', kind === 'bomb' ? 'pu_bomb' : 'pu_sledgehammer').setDepth(800)
    icon.setScale(0)
    this.tweens.chain({
      targets: icon,
      tweens: [
        { scale: 260 / icon.width, duration: 280, ease: 'Back.easeOut' },
        kind === 'bomb'
          ? { scale: 320 / icon.width, angle: 12, duration: 300, yoyo: true, repeat: 1, ease: 'Sine.easeInOut' }
          : { angle: -50, duration: 220, ease: 'Quad.easeOut' },
        kind === 'bomb'
          ? { scale: 0, alpha: 0, duration: 150 }
          : { angle: 40, duration: 120, ease: 'Quad.easeIn' },
        { scale: 0, alpha: 0, duration: 140 },
      ],
      onComplete: () => {
        icon.destroy()
        this.cameras.main.shake(kind === 'bomb' ? 280 : 420, kind === 'bomb' ? 0.012 : 0.02)
        flash(this, 0xFFF1C1, 0.55, 380)
        burst(this, W / 2, H / 2, { count: 40, speed: 900, scale: 1.1, colors: [0xFFB21A, 0xFF5A1F, 0xFFFFFF], lifespan: 900 })
        ring(this, W / 2, H / 2, { color: 0xFFC14D, size: 900, duration: 600 })
        audio.play('time_is_up', { volume: 0.5, rate: 1.4 })
        if (kind === 'sledgehammer') {
          const crack = this.add.image(W / 2, H / 2, 'screen_crack').setDepth(790).setAlpha(0.85)
          crack.setScale(Math.max(W / crack.width, H / crack.height) * 0.9)
          this.tweens.add({ targets: crack, alpha: 0, delay: 500, duration: 700, onComplete: () => crack.destroy() })
        }
        banner(this, `${pairs.length * 2} ${t('cards_destroyed')}`, { size: 56 })
        const jobs = pairs.map(([a, b], i) => new Promise(resolve => this.time.delayedCall(i * 90, () => this.matchPair(a, b, 'powerup').then(resolve))))
        Promise.all(jobs).then(() => {
          this.effectBusy = false
          this.lock = false
          this.afterPowerUpClear?.()
        })
      },
    })
    return true
  }

  revealAll(ms) {
    const hidden = this.activeCards.filter(c => !c.faceUp && !c.matched)
    if (!hidden.length) {
      this.overlay.toast(t('no_cards_to_show'), 'info')
      return false
    }
    this.effectBusy = true
    flash(this, 0xFFFFFF, 0.65, 500)
    audio.play('success', { volume: 0.5 })
    hidden.forEach((c, i) => this.time.delayedCall(i * 25, () => c.flip(true, 220)))
    this.time.delayedCall(ms, () => {
      hidden.forEach((c) => {
        if (!c.matched && !this.selected.includes(c))
          c.flip(false, 220)
      })
      this.effectBusy = false
    })
    return true
  }

  applyFreeze(ms) {
    if (this.frozen)
      return false
    this.frozen = true
    this.frostOverlay(true)
    banner(this, t('time_frozen'), { color: '#bfefff' })
    this.onFreeze?.(true)
    this.freezeTimer = this.time.delayedCall(ms, () => {
      this.frozen = false
      this.frostOverlay(false)
      this.onFreeze?.(false)
    })
    return true
  }

  applyMultiplier(m, ms) {
    if (this.multiplier > 1)
      return false
    this.multiplier = m
    banner(this, t('score_x', { count: m }), { color: m >= 10 ? '#ffe36b' : '#ff9a9a' })
    this.onMultiplier?.(m)
    this.time.delayedCall(ms, () => {
      this.multiplier = 1
      this.onMultiplier?.(1)
    })
    return true
  }

  frostOverlay(on) {
    if (on) {
      this.frost = this.add.image(this.W / 2, this.H / 2, 'fx_vignette').setDisplaySize(this.W * 1.15, this.H * 1.15).setTint(0xBFEFFF).setDepth(700).setAlpha(0)
      this.tweens.add({ targets: this.frost, alpha: 0.85, duration: 600 })
      this.snow = this.add.particles(0, -10, 'fx_snow', {
        x: { min: 0, max: this.W },
        speedY: { min: 40, max: 110 },
        speedX: { min: -20, max: 20 },
        rotate: { min: 0, max: 360 },
        scale: { min: 0.4, max: 1 },
        alpha: { start: 0.9, end: 0 },
        lifespan: 6000,
        frequency: 90,
      }).setDepth(701)
    }
    else {
      const f = this.frost
      const s = this.snow
      this.frost = null
      this.snow = null
      if (f)
        this.tweens.add({ targets: f, alpha: 0, duration: 700, onComplete: () => f.destroy() })
      if (s) {
        s.stop()
        this.time.delayedCall(6000, () => s.destroy())
      }
    }
  }

  /** Red pulsing vignette that grows with danger (0..1). */
  updateDanger(level) {
    if (!this.dangerVignette) {
      this.dangerVignette = this.add.image(this.W / 2, this.H / 2, 'fx_vignette').setDisplaySize(this.W * 1.1, this.H * 1.1).setTint(0xFF1E1E).setDepth(690).setAlpha(0)
      this.dangerPulse = 0
    }
    const v = Phaser.Math.Clamp((level - 0.7) / 0.3, 0, 1)
    this.dangerPulse += 0.08 + v * 0.1
    this.dangerVignette.setAlpha(v * (0.45 + Math.sin(this.dangerPulse) * 0.25))
    if (v > 0 && this.isPlaying && !this.frozen) {
      this._alarmAt = this._alarmAt ?? 0
      if (this.time.now - this._alarmAt > 2600 - v * 1200) {
        this._alarmAt = this.time.now
        audio.play('alert', { volume: 0.25 + v * 0.25 })
        haptics.impact('light')
      }
    }
  }

  // --- Flow -----------------------------------------------------------------------
  countdown() {
    return new Promise((resolve) => {
      const dim = rect(this, this.W / 2, this.H / 2, this.W, this.H, 0x061126, 0.45).setDepth(880)
      const label = addText(this, this.W / 2, this.H / 2, '3', { size: 190, display: true, strokeThickness: 16 }).setDepth(881)
      let n = 3
      const show = () => {
        label.setText(String(n)).setScale(2.2).setAlpha(0)
        audio.play('select', { rate: 0.9 + (3 - n) * 0.1 })
        haptics.impact('light')
        this.tweens.chain({
          targets: label,
          tweens: [
            { scale: 1, alpha: 1, duration: 320, ease: 'Back.easeOut' },
            { scale: 0.6, alpha: 0, delay: 360, duration: 220, ease: 'Quad.easeIn' },
          ],
          onComplete: () => {
            n--
            if (n > 0) {
              show()
            }
            else {
              label.destroy()
              this.tweens.add({ targets: dim, alpha: 0, duration: 220, onComplete: () => dim.destroy() })
              resolve()
            }
          },
        })
      }
      show()
    })
  }

  async openPause() {
    if (this.phase !== 'playing' || this._pauseOpen)
      return
    this._pauseOpen = true
    this.scene.pause()
    audio.duck(true)
    const choice = await pauseMenu(this, { exitLabel: this.exitLabel })
    audio.duck(false)
    this._pauseOpen = false
    if (choice === 'restart') {
      this.scene.resume()
      this.scene.restart(this.sys.settings.data)
    }
    else if (choice === 'exit') {
      this.scene.resume()
      this.onExit()
    }
    else {
      this.scene.resume()
    }
  }

  /** Called by power-up quick-buy to stop the clock during the modal. */
  onModalOpen() {
    if (this.isPlaying) {
      this._modalPaused = true
      this.scene.pause()
    }
  }

  onModalClose() {
    if (this._modalPaused) {
      this._modalPaused = false
      this.scene.resume()
    }
  }

  onAppPause() {
    this.openPause()
  }

  onBack() {
    if (this.phase === 'playing')
      this.openPause()
    else
      this.onExit()
    return true
  }

  onResize() {
    this.setupLayout()
    this.layoutGame?.()
  }

  /** Rewarded "second chance". Resolves true if the player earned it. */
  async offerRevive() {
    if (this.revived || !ads.rewardedAvailable)
      return false
    this.overlay.showBusy(t('loading_ad'))
    const ok = await ads.showRewarded()
    this.overlay.hideBusy()
    if (!ok) {
      this.overlay.toast(t('ad_not_available'), 'warning')
      return false
    }
    this.revived = true
    return true
  }

  /**
   * After a finished game: interstitial every 2nd game (never when ads are
   * removed) and, once, a contextual notification opt-in.
   */
  async maybeInterstitial() {
    const n = (this.registry.get('gamesFinished') ?? 0) + 1
    this.registry.set('gamesFinished', n)
    if (n % 2 === 0)
      await ads.maybeShowInterstitial()
    else if (isNative && !state.settings.notificationPermissionAsked)
      await this.askNotifications()
  }

  async askNotifications() {
    state.updateSettings({ notificationPermissionAsked: true })
    const ok = await this.overlay.confirm({
      title: t('notifications'),
      message: t('notification_permission_request'),
      icon: { atlas: 'ui', frame: 'announcement_badge', size: 120 },
      confirmText: t('yes_allow'),
      cancelText: t('no_thanks'),
    })
    if (ok)
      await notifications.requestPermission()
  }

  scorePopup(x, y, text, color) {
    floatText(this, x, y, text, { color, size: 46 })
  }
}
