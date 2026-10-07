import { ads } from '@/core/ads'
import { audio } from '@/core/audio'
import { bus } from '@/core/bus'
import { t } from '@/core/i18n'
import { exitApp } from '@/core/platform'
import { addText, Button, disc, iconButton, panel, rect } from '@/ui/components'
import { pillTexture } from '@/ui/textures'
import { BaseScene } from './BaseScene'

/**
 * Always-on-top scene for modals, toasts, loading spinners and the web ad
 * simulator. Its input blocker stops taps reaching the scenes below while a
 * modal is open (Phaser's global top-only input).
 */
export class OverlayScene extends BaseScene {
  music = null

  constructor() {
    super({ key: 'Overlay' })
    this.stack = []
  }

  create() {
    this.layoutOverlay()
    this.toasts = []
    bus.on('app:back', this.handleBack, this)
    ads.webSimulator = () => this.simulateAd()
  }

  layoutOverlay() {
    const activeScene = this.registry.get('activeScene')
    this.setupLayout()
    this.registry.set('activeScene', activeScene)
  }

  onResize() {
    this.layoutOverlay()
    for (const entry of this.stack)
      entry.container.setPosition(this.W / 2, this.H / 2)
    this.busy?.setPosition(this.W / 2, this.H / 2)
  }

  get isBusy() {
    return this.stack.length > 0
  }

  handleBack() {
    const top = this.stack.at(-1)
    if (top) {
      if (top.dismissible !== false)
        top.close(top.dismissValue)
      return
    }
    const key = this.registry.get('activeScene')
    const scene = key && this.scene.get(key)
    if (scene?.sys.isActive() && scene.onBack?.())
      return
    this.confirm({ title: t('exit'), message: t('exit_game_confirm'), confirmText: t('exit'), cancelText: t('cancel') })
      .then(ok => ok && exitApp())
  }

  // --- Modal --------------------------------------------------------------
  /**
   * Opens a modal and resolves with the value of the pressed button
   * (or `dismissValue` when closed via the X / backdrop / back button).
   *
   * opts: { title, message, icon:{atlas,frame}, content(scene, container, width) => height,
   *         buttons:[{label,color,value,icon}], width, dismissValue, dismissible, closeButton }
   */
  modal(opts) {
    return new Promise((resolve) => {
      const W = this.W
      const H = this.H
      const width = Math.min(opts.width ?? 720, W - 80)
      const pad = 40
      // Backdrop (below the dialog; also swallows taps meant for the game).
      const backdrop = rect(this, W / 2, H / 2, W * 3, H * 3, 0x061126, 0.68)
      backdrop.setAlpha(0)
      const container = this.add.container(W / 2, H / 2)
      backdrop.setInteractive()
      this.tweens.add({ targets: backdrop, alpha: 0.68, duration: 180 })

      // Content measurement
      const inner = this.add.container(0, 0)
      let y = 0
      if (opts.icon) {
        const icon = this.add.image(0, 0, opts.icon.atlas ?? 'ui', opts.icon.frame)
        const size = opts.icon.size ?? 120
        icon.setScale(size / Math.max(icon.width, icon.height))
        icon.y = y + size / 2
        inner.add(icon)
        y += size + 14
        this.tweens.add({ targets: icon, y: icon.y - 6, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
      }
      if (opts.message) {
        const msg = addText(this, 0, y, opts.message, { size: opts.messageSize ?? 30, color: '#5a3410', stroke: false, shadow: false, wrap: width - pad * 2, originY: 0, lineSpacing: 6 })
        inner.add(msg)
        y += msg.height + 18
      }
      if (opts.content) {
        const h = opts.content(this, inner, width - pad * 2, y) ?? 0
        y += h + 10
      }
      const buttons = opts.buttons ?? []
      const btnH = 84
      const contentH = y + (buttons.length ? btnH + 22 : 0)
      const titleH = opts.title ? 64 : 0
      const height = Math.min(H - 40, contentH + pad * 2 + titleH * 0.6)

      const bg = panel(this, 0, 0, width, height, 'cream', 34)
      container.add(bg)
      const top = -height / 2 + pad + titleH * 0.6
      inner.y = top
      container.add(inner)

      if (opts.title) {
        const ribbonW = Math.min(width * 0.86, 560)
        const ribbon = this.add.image(0, -height / 2 + 4, pillTexture(this, ribbonW, 76, '#ff9a1f', '#8a4600')).setDisplaySize(ribbonW, 76)
        const title = addText(this, 0, -height / 2 + 2, opts.title, { size: 36, maxWidth: ribbonW - 60 })
        container.add([ribbon, title])
      }

      const entry = { dismissValue: opts.dismissValue ?? null, dismissible: opts.dismissible, closed: false, container }
      const close = (value) => {
        if (entry.closed)
          return
        entry.closed = true
        this.stack.splice(this.stack.indexOf(entry), 1)
        this.tweens.add({ targets: backdrop, alpha: 0, duration: 160, onComplete: () => backdrop.destroy() })
        this.tweens.add({
          targets: container,
          scale: 0.85,
          alpha: 0,
          duration: 150,
          ease: 'Quad.easeIn',
          onComplete: () => container.destroy(),
        })
        if (!this.stack.length)
          audio.duck(false)
        resolve(value)
      }

      // Buttons
      if (buttons.length) {
        const gap = 22
        const bw = Math.min(300, (width - pad * 2 - gap * (buttons.length - 1)) / buttons.length)
        const by = height / 2 - pad - btnH / 2 + 8
        buttons.forEach((b, i) => {
          const bx = -((buttons.length - 1) * (bw + gap)) / 2 + i * (bw + gap)
          const btn = new Button(this, bx, by, { w: bw, h: btnH, color: b.color ?? (i === buttons.length - 1 ? 'green' : 'gray'), label: b.label, icon: b.icon, onClick: () => close(b.value) })
          container.add(btn)
        })
      }

      if (opts.closeButton !== false && opts.dismissible !== false) {
        const x = iconButton(this, width / 2 - 18, -height / 2 + 18, 'cancel_badge', 76, () => close(opts.dismissValue ?? null))
        container.add(x)
      }
      if (opts.dismissible !== false)
        backdrop.on('pointerup', () => close(opts.dismissValue ?? null))

      entry.close = close
      this.stack.push(entry)
      audio.duck(true)
      audio.play('select', { volume: 0.6 })

      container.setScale(0.6).setAlpha(0)
      this.tweens.add({ targets: container, scale: 1, alpha: 1, duration: 320, ease: 'Back.easeOut' })
      this.scene.bringToTop()
    })
  }

  /** Two-button confirmation. Resolves true/false. */
  confirm({ title, message, confirmText, cancelText, icon, color = 'green' }) {
    return this.modal({
      title,
      message,
      icon,
      dismissValue: false,
      buttons: [
        { label: cancelText ?? t('cancel'), color: 'gray', value: false },
        { label: confirmText ?? t('ok'), color, value: true },
      ],
    })
  }

  alert({ title, message, icon, buttonText }) {
    return this.modal({ title, message, icon, buttons: [{ label: buttonText ?? t('ok'), color: 'green', value: true }], dismissValue: true })
  }

  // --- Toasts -------------------------------------------------------------
  toast(message, type = 'info') {
    const colors = { info: '#2a86f0', success: '#22a843', warning: '#f59e0b', error: '#e23b3b' }
    const icons = { info: 'info_badge', success: 'check_badge', warning: 'question_badge', error: 'cancel_badge' }
    const y = this.top + 50
    const c = this.add.container(this.W / 2, -80)
    const txt = addText(this, 26, 0, message, { size: 28, maxWidth: Math.min(760, this.W - 200) })
    const w = Math.max(320, txt.width + 120)
    const bg = this.add.image(0, 0, pillTexture(this, w, 76, colors[type] ?? colors.info, 'rgba(255,255,255,0.7)')).setDisplaySize(w, 76)
    const icon = this.add.image(-w / 2 + 40, 0, 'ui', icons[type] ?? icons.info)
    icon.setScale(62 / icon.width)
    txt.x = 26
    c.add([bg, icon, txt])
    this.toasts.forEach(other => this.tweens.add({ targets: other, y: other.y + 90, duration: 200 }))
    this.toasts.push(c)
    this.tweens.add({ targets: c, y, duration: 380, ease: 'Back.easeOut' })
    this.time.delayedCall(2300, () => {
      this.tweens.add({
        targets: c,
        alpha: 0,
        y: c.y - 40,
        duration: 260,
        onComplete: () => {
          this.toasts.splice(this.toasts.indexOf(c), 1)
          c.destroy()
        },
      })
    })
    this.scene.bringToTop()
  }

  // --- Busy spinner --------------------------------------------------------
  showBusy(message) {
    this.hideBusy()
    const c = this.add.container(this.W / 2, this.H / 2)
    const backdrop = rect(this, 0, 0, this.W * 3, this.H * 3, 0x061126, 0.7).setInteractive()
    const ring = this.add.image(0, -20, 'fx_ring').setDisplaySize(90, 90).setTint(0xFFD34D)
    const dot = disc(this, 0, -60, 9, 0xFFFFFF)
    ring.setCrop(0, 0, 128, 64)
    const label = addText(this, 0, 60, message ?? t('please_wait'), { size: 30 })
    c.add([backdrop, ring, dot, label])
    this.tweens.add({ targets: ring, angle: 360, duration: 900, repeat: -1 })
    this.tweens.add({ targets: dot, scale: { from: dot.scale * 0.6, to: dot.scale * 1.3 }, duration: 450, yoyo: true, repeat: -1 })
    this.busy = c
    this.scene.bringToTop()
  }

  hideBusy() {
    this.busy?.destroy()
    this.busy = null
  }

  // --- Web ad simulator --------------------------------------------------------
  /** Shows a fake 3-second "ad" on the web so the reward flow can be tested. */
  simulateAd() {
    return new Promise((resolve) => {
      const c = this.add.container(this.W / 2, this.H / 2)
      const bg = rect(this, 0, 0, this.W * 3, this.H * 3, 0x000000, 0.92).setInteractive()
      const label = addText(this, 0, -40, 'AD (web simulation)', { size: 40 })
      const count = addText(this, 0, 40, '3', { size: 64, display: true })
      c.add([bg, label, count])
      audio.suspend()
      let n = 3
      this.time.addEvent({
        delay: 700,
        repeat: 2,
        callback: () => {
          n--
          count.setText(String(n))
          if (n <= 0) {
            c.destroy()
            audio.resume()
            resolve(true)
          }
        },
      })
      this.scene.bringToTop()
    })
  }

  // --- Celebrations ------------------------------------------------------------
  /** Confetti burst from both sides of the screen. */
  confetti(duration = 1600) {
    const colors = [0xFFD34D, 0xFF5AA8, 0x34D399, 0x6CC8FF, 0xFF8A3D, 0xB67CFF]
    const make = (x, angle) => this.add.particles(x, this.H + 20, 'fx_confetti', {
      angle: { min: angle - 18, max: angle + 18 },
      speed: { min: 900, max: 1500 },
      gravityY: 1300,
      lifespan: 2400,
      rotate: { start: 0, end: 720 },
      scaleX: { min: 0.8, max: 1.4 },
      scaleY: { min: 0.5, max: 1.2 },
      tint: colors,
      quantity: 6,
      frequency: 30,
      duration,
    })
    const left = make(this.W * 0.05, -65)
    const right = make(this.W * 0.95, -115)
    this.time.delayedCall(duration + 2600, () => {
      left.destroy()
      right.destroy()
    })
    this.scene.bringToTop()
  }
}
