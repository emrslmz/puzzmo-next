import Phaser from 'phaser'
import { audio } from '@/core/audio'
import { haptics } from '@/core/haptics'
import { formatNumber, t } from '@/core/i18n'
import { state } from '@/core/state'
import { qualityLevel } from '@/core/viewport'
import { CARD_ITEMS, ENDLESS_POWER_UPS } from '@/data/catalog'
import { Card } from '@/game/Card'
import { PowerUpBar, showTutorial, StatChip } from '@/game/GameUI'
import { MemoryGameScene } from '@/game/MemoryGameScene'
import { Water } from '@/game/Water'
import { addText } from '@/ui/components'
import { banner, burst, floatText } from '@/ui/fx'
import { pillTexture, slotTexture } from '@/ui/textures'

const COLS = 6
const ROWS = 3
const CELLS = COLS * ROWS
const MAX_LIVES = 5
const FULL_GRACE = 10

export class EndlessScene extends MemoryGameScene {
  music = 'endless'

  constructor() {
    super({ key: 'Endless' })
  }

  create() {
    this.setupLayout()
    this.initGameState()
    this.exitLabel = t('back_to_home')
    this.lives = MAX_LIVES
    this.score = 0
    this.matches = 0
    this.errors = 0
    this.grid = null
    this.slots = Array.from({ length: CELLS }).fill(null)
    this.fullTime = 0
    this.elapsed = 0
    this.spawnTimer = null
    this.peekTimer = null
    this.hurry = null

    this.water = new Water(this, {
      x: 0,
      y: 0,
      w: this.W,
      h: this.H,
      backdrop: 'bg_spring',
      focusY: 0.6,
      level: 0.06,
      depth: 0,
      deep: [0.03, 0.24, 0.36],
      shallow: [0.16, 0.6, 0.66],
      quality: qualityLevel(),
    })
    this.buildHud()
    this.layoutGame()
    this.fadeIn()
    this.runIntro()
  }

  get activeCards() {
    return this.slots.filter(c => c && !c.matched)
  }

  get occupancy() {
    return this.slots.filter(Boolean).length / CELLS
  }

  // --- Build ----------------------------------------------------------------------
  buildHud() {
    this.addPauseButton(0, 0, 82)
    this.livesChip = new StatChip(this, 0, 0, { icon: 'icon_heart', value: `${MAX_LIVES}/${MAX_LIVES}`, w: 170, label: t('lives_header') }).setDepth(50)
    this.scoreChip = new StatChip(this, 0, 0, { icon: 'icon_star', value: '0', w: 230, label: t('score') }).setDepth(50)
    this.matchChip = new StatChip(this, 0, 0, { icon: 'icon_cards', value: '0', w: 160, label: t('correct') }).setDepth(50)
    this.bestText = addText(this, 0, 0, `${t('highest_score')}: ${formatNumber(state.endlessStats.highScore)}`, { size: 22, color: '#fff3c4', originX: 1 }).setDepth(50)
    this.multBadge = addText(this, 0, 0, '', { size: 34, color: '#ffe36b', display: true }).setDepth(51).setVisible(false)
    this.cellMarks = Array.from({ length: CELLS }).fill(this.add.image(0, 0, slotTexture(this, 150, 168)).setDepth(5))
    this.powerBar = null
  }

  layoutGame() {
    const { W, H } = this
    this.water.layout(0, 0, W, H)
    const rx0 = this.left + 4
    const rx1 = this.right
    const puSize = Math.min(84, (H - 130) / 7.9)
    this.powerBar?.destroy()
    this.powerBar = new PowerUpBar(this, rx1 - puSize / 2 - 8, H / 2 + 34, ENDLESS_POWER_UPS, { size: puSize, onUse: id => this.usePowerUp(id) }).setDepth(50)

    const hy = this.top + 40
    this.pauseBtn.setPosition(rx0 + 38, hy)
    this.livesChip.setPosition(rx0 + 100 + 85, hy)
    this.scoreChip.setPosition(rx0 + 100 + 170 + 16 + 115, hy)
    this.matchChip.setPosition(rx0 + 100 + 170 + 16 + 230 + 16 + 80, hy)
    this.multBadge.setPosition(this.scoreChip.x + 115 + 40, hy - 26)
    this.bestText.setPosition(rx1 - puSize - 30, hy)
    this.bestText.setVisible(rx1 - puSize - 30 - (this.matchChip.x + 80) > this.bestText.width + 20)

    const area = { x: rx0, y: this.top + 90, w: rx1 - puSize - 30 - rx0, h: this.bottom - (this.top + 90) }
    this.grid = this.gridLayout(COLS, ROWS, area, { gap: 14 })
    this.grid.cells.forEach((cell, i) => {
      this.cellMarks[i].setPosition(cell.x, cell.y).setDisplaySize(this.grid.cw, this.grid.ch)
      const card = this.slots[i]
      if (card)
        card.setPosition(cell.x, cell.y).setBaseScale(this.grid.scale)
    })
    if (this.dangerVignette)
      this.dangerVignette.setPosition(W / 2, H / 2).setDisplaySize(W * 1.1, H * 1.1)
    this.hurry?.setPosition(W / 2, this.bottom - 30)
  }

  // --- Flow ----------------------------------------------------------------------
  async runIntro() {
    await showTutorial(this, 'endless_mode_guide', [
      { title: t('endless_mode_guide_page1_title'), text: t('endless_mode_guide_page1_text'), frame: 'mascot_discover' },
      { title: t('endless_mode_guide_page2_title'), text: t('endless_mode_guide_page2_text'), atlas: 'ui', frame: 'icon_powerup_icon' },
      { title: t('endless_mode_guide_page3_title'), text: t('endless_mode_guide_page3_text'), frame: 'mascot_angry' },
      { title: t('endless_mode_guide_page4_title'), text: t('endless_mode_guide_page4_text'), frame: 'mascot_happy' },
    ], 'endless_mode_guide_finish_button')
    if (!this.scene.isActive())
      return
    const start = await this.overlay.modal({
      title: t('endless_mode_title'),
      message: t('endless_mode_intro_text'),
      icon: { atlas: 'ui', frame: 'icon_cup', size: 130 },
      width: 860,
      content: (s, container, width, y0) => {
        const chips = [
          { icon: 'icon_heart', text: `${t('lives')} ${MAX_LIVES}` },
          { icon: 'icon_star', text: formatNumber(state.endlessStats.highScore) },
          { icon: 'icon_cancel', text: t('lose_life_on_wrong_match') },
        ]
        chips.forEach((c, i) => {
          const w = i === 2 ? width - 20 : width / 2 - 20
          const x = i === 2 ? 0 : (i - 0.5) * (width / 2)
          const y = y0 + 36 + (i === 2 ? 76 : 0)
          container.add(new StatChip(s, x, y, { icon: c.icon, value: c.text, w, h: 60 }))
        })
        return 152
      },
      dismissValue: false,
      buttons: [
        { label: t('back_to_home'), color: 'gray', value: false },
        { label: t('start_game'), color: 'green', value: true },
      ],
    })
    if (!start) {
      this.onExit()
      return
    }
    this.phase = 'countdown'
    await this.countdown()
    this.phase = 'playing'
    // Kick off with a few cards so the board never starts empty.
    for (let i = 0; i < 4; i++)
      this.time.delayedCall(i * 260, () => this.spawnCard())
    this.scheduleSpawn(1400)
    this.schedulePeek()
  }

  spawnDelay() {
    const base = 2500
    const min = 350
    const scoreProgress = Math.min(this.score / 40000, 1)
    const timeProgress = Math.min(this.elapsed / 240, 1)
    const eased = Math.min(scoreProgress * 0.8 + timeProgress * 0.2, 1) ** 1.7
    let delay = base - (base - min) * eased
    const occ = this.occupancy
    if (occ < 0.6)
      delay *= 0.3 + (occ / 0.6) * 0.7
    return Math.max(min, delay)
  }

  scheduleSpawn(delay = this.spawnDelay()) {
    this.spawnTimer?.remove()
    this.spawnTimer = this.time.delayedCall(delay, () => {
      if (this.phase === 'over')
        return
      if (this.isPlaying && !this.frozen && !this.lock && this.selected.length === 0)
        this.spawnCard()
      this.scheduleSpawn()
    })
  }

  schedulePeek() {
    const low = qualityLevel() === 'low'
    this.peekTimer = this.time.delayedCall(Phaser.Math.Between(low ? 9000 : 5000, low ? 13000 : 8000), () => {
      if (this.phase === 'over')
        return
      if (this.isPlaying && !this.effectBusy) {
        const hidden = this.activeCards.filter(c => !c.faceUp && !this.selected.includes(c) && !c._flipping)
        const card = Phaser.Utils.Array.GetRandom(hidden)
        if (card) {
          card.flip(true)
          this.time.delayedCall(1200, () => {
            if (!card.matched && !this.selected.includes(card) && card.active)
              card.flip(false)
          })
        }
      }
      this.schedulePeek()
    })
  }

  spawnCard() {
    const free = this.slots.map((c, i) => (c ? -1 : i)).filter(i => i >= 0)
    if (!free.length || !this.grid)
      return
    const counts = new Map()
    for (const c of this.activeCards)
      counts.set(c.type, (counts.get(c.type) ?? 0) + 1)
    const singles = [...counts.entries()].filter(([, n]) => n % 2 === 1).map(([type]) => type)
    const type = singles.length && Math.random() < 0.7 ? Phaser.Utils.Array.GetRandom(singles) : Phaser.Utils.Array.GetRandom(CARD_ITEMS)
    const index = Phaser.Utils.Array.GetRandom(free)
    const cell = this.grid.cells[index]
    const card = new Card(this, cell.x, cell.y, type, state.selectedSkin.frame, c => this.tapCard(c)).setDepth(10)
    card.setBaseScale(this.grid.scale)
    card.setFace(true)
    card.setData('slot', index)
    this.slots[index] = card
    audio.play('plop', { volume: 0.45, rate: 0.9 + Math.random() * 0.3 })
    card.spawnIn().then(() => {
      this.time.delayedCall(850, () => {
        if (card.active && !card.matched && !this.selected.includes(card) && !this.effectBusy)
          card.flip(false)
      })
    })
  }

  update(_time, delta) {
    this.water.update(delta)
    const dt = Math.min(delta, 50) / 1000
    if (this.isPlaying)
      this.elapsed += dt

    const occ = this.occupancy
    const full = occ >= 1
    if (this.isPlaying && full && !this.frozen) {
      if (this.fullTime === 0)
        haptics.notify('warning')
      this.fullTime += dt
      this.showHurry(Math.max(0, Math.ceil(FULL_GRACE - this.fullTime)))
      if (this.fullTime >= FULL_GRACE)
        this.lose(t('screen_filled'))
    }
    else if (!full && this.fullTime > 0) {
      this.fullTime = 0
      this.showHurry(null)
    }
    const level = full ? 0.76 + 0.2 * Math.min(1, this.fullTime / FULL_GRACE) : 0.06 + 0.7 * occ
    this.water.setLevel(level)
    this.updateDanger(full ? 0.7 + 0.3 * (this.fullTime / FULL_GRACE) : occ * 0.85)
  }

  showHurry(seconds) {
    if (seconds === null) {
      this.hurry?.destroy()
      this.hurry = null
      return
    }
    if (!this.hurry) {
      this.hurry = this.add.container(this.W / 2, this.bottom - 30).setDepth(60)
      const label = addText(this, 0, 0, '', { size: 30 })
      const bg = this.add.image(0, 0, pillTexture(this, 640, 60, 'rgba(239,59,59,0.92)', 'rgba(255,255,255,0.8)')).setDisplaySize(640, 60)
      this.hurry.add([bg, label])
      this.hurry.setData('label', label)
      this.tweens.add({ targets: this.hurry, scale: { from: 1, to: 1.06 }, duration: 380, yoyo: true, repeat: -1 })
    }
    this.hurry.getData('label').setText(`${t('hurry_up')} (${seconds})`)
  }

  // --- Hooks ----------------------------------------------------------------------
  onCorrect(a, b, source, mid) {
    this.matches++
    const combo = source === 'manual' && this.streak >= 2 ? (this.streak - 1) * 10 : 0
    const gained = 50 * this.multiplier + combo
    this.score += gained
    this.scoreChip.setValue(formatNumber(this.score))
    this.matchChip.setValue(this.matches)
    floatText(this, mid.x, mid.y, `+${gained}`, { color: this.multiplier > 1 ? '#ffb347' : '#ffe36b' })
    if (combo)
      floatText(this, mid.x, mid.y - 60, `${t('combo')} x${this.streak}`, { color: '#7cf2e2', size: 34, rise: 120 })
    this.water.splash((mid.x - this.water.x) / this.water.w, 0.7, { sound: source === 'manual' })
  }

  onPairRemoved(a, b) {
    for (const c of [a, b]) {
      const i = c.getData('slot')
      if (this.slots[i] === c)
        this.slots[i] = null
      c.destroy()
    }
  }

  onWrong() {
    this.errors++
    this.lives--
    this.livesChip.setValue(`${Math.max(0, this.lives)}/${MAX_LIVES}`)
    const p = this.livesChip.icon.getWorldTransformMatrix()
    burst(this, p.tx, p.ty, { colors: [0xFF5A7A, 0xFFFFFF], count: 14, speed: 260 })
    this.cameras.main.shake(140, 0.004)
    if (this.lives <= 0)
      this.time.delayedCall(450, () => this.lose(t('lives_are_over')))
  }

  addLife() {
    if (this.lives >= MAX_LIVES) {
      this.overlay.toast(t('lives_full'), 'warning')
      return false
    }
    this.lives++
    this.livesChip.setValue(`${this.lives}/${MAX_LIVES}`)
    const p = this.livesChip.icon.getWorldTransformMatrix()
    burst(this, p.tx, p.ty, { colors: [0xFF8AC8, 0xFFFFFF], count: 22, speed: 320 })
    floatText(this, p.tx, p.ty + 40, t('life_added'), { color: '#ff9fd0', size: 34 })
    return true
  }

  onMultiplier(m) {
    this.multBadge.setVisible(m > 1).setText(`x${m}`)
    this.tweens.killTweensOf(this.multBadge)
    if (m > 1)
      this.tweens.add({ targets: this.multBadge, scale: { from: 0.9, to: 1.2 }, duration: 300, yoyo: true, repeat: -1 })
  }

  onFreeze(on) {
    this.water.setFrozen(on)
  }

  // --- End ----------------------------------------------------------------------------
  async lose(reason) {
    if (this.phase === 'over')
      return
    this.phase = 'over'
    this.lock = true
    this.spawnTimer?.remove()
    this.showHurry(null)
    this.selected.forEach(c => c.select(false))
    this.selected = []
    audio.play('time_is_up')
    haptics.notify('error')
    this.cameras.main.shake(400, 0.008)
    this.water.splash(0.5, 1.6)

    await new Promise(resolve => this.time.delayedCall(700, resolve))
    const buttons = [
      { label: t('back_to_home'), color: 'gray', value: 'home' },
      { label: t('play_again'), color: 'green', value: 'retry' },
    ]
    if (!this.revived)
      buttons.push({ label: t('continue'), icon: 'icon_ad_icon', color: 'purple', value: 'revive' })
    const coins = Math.floor(this.score * 0.1) + this.matches * 5
    const isRecord = this.score > state.endlessStats.highScore
    const choice = await this.overlay.modal({
      title: t('game_over'),
      message: reason,
      icon: { atlas: 'art', frame: isRecord ? 'mascot_rich1' : 'mascot_criying', size: 130 },
      width: 900,
      content: (s, container, width, y0) => {
        const stats = [
          { icon: 'icon_star', value: formatNumber(this.score), label: t('score') },
          { icon: 'icon_cards', value: this.matches, label: t('match') },
          { icon: 'icon_coin', value: `+${formatNumber(coins)}`, label: t('coin') },
        ]
        const w = Math.min(230, (width - 40) / 3)
        stats.forEach((st, i) => container.add(new StatChip(s, (i - 1) * (w + 14), y0 + 40, { icon: st.icon, value: st.value, w, h: 66, label: st.label })))
        if (isRecord) {
          const rec = addText(s, 0, y0 + 108, `🏆 ${t('new_record')}`, { size: 34, color: '#ff9a1f', stroke: '#ffffff' })
          container.add(rec)
          s.tweens.add({ targets: rec, scale: { from: 1, to: 1.12 }, duration: 500, yoyo: true, repeat: -1 })
          return 140
        }
        return 84
      },
      dismissible: false,
      buttons,
    })

    if (choice === 'revive') {
      if (await this.offerRevive()) {
        this.revive()
        return
      }
      this.revived = true
      this.phase = 'playing'
      this.lose(reason)
      return
    }

    state.finishEndlessGame({ score: this.score, matches: this.matches, errors: this.errors, bestStreak: this.bestStreak })
    if (coins > 0)
      state.addCoins(coins)
    if (isRecord) {
      this.overlay.confetti()
      audio.play('won_sound')
    }
    await this.maybeInterstitial()
    if (choice === 'retry')
      this.scene.restart()
    else
      this.go('Home')
  }

  revive() {
    this.lives = Math.max(this.lives, 3)
    this.livesChip.setValue(`${this.lives}/${MAX_LIVES}`)
    // Clear a third of the board to give the player room.
    const victims = Phaser.Utils.Array.Shuffle(this.activeCards).slice(0, 6)
    victims.forEach((c, i) => {
      c.matched = true
      c.disableInteractive()
      this.time.delayedCall(i * 80, () => {
        burst(this, c.x, c.y, { count: 10 })
        c.matchOut().then(() => this.onPairRemoved(c, c))
      })
    })
    this.fullTime = 0
    this.showHurry(null)
    this.lock = false
    this.phase = 'playing'
    this.water.splash(0.5, 1.2)
    banner(this, t('continue'), { color: '#9ff0c8' })
    this.scheduleSpawn(1500)
  }

  onExit() {
    this.go('Home')
  }
}
