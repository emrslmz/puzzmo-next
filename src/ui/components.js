import Phaser from 'phaser'
import { audio } from '@/core/audio'
import { bus } from '@/core/bus'
import { haptics } from '@/core/haptics'
import { formatNumber } from '@/core/i18n'
import { state } from '@/core/state'
import { buttonTexture, panelTexture, pillTexture } from './textures'
import { FONT, FONT_DISPLAY, TEXT_STROKE } from './theme'

/**
 * Solid rectangle as a tinted quad. Cheaper than Shape objects (it batches
 * with sprites) and avoids state issues when nested in containers.
 */
export function rect(scene, x, y, w, h, color = 0x000000, alpha = 1) {
  return scene.add.image(x, y, 'fx_px').setDisplaySize(w, h).setTint(color).setAlpha(alpha)
}

/** Solid circle as a tinted quad. */
export function disc(scene, x, y, radius, color = 0xFFFFFF, alpha = 1) {
  return scene.add.image(x, y, 'fx_circle').setDisplaySize(radius * 2, radius * 2).setTint(color).setAlpha(alpha)
}

/** Text with the game's default look (rounded font, dark outline, soft shadow). */
export function addText(scene, x, y, str, opts = {}) {
  const size = opts.size ?? 32
  const style = {
    fontFamily: opts.display ? FONT_DISPLAY : FONT,
    fontSize: `${size}px`,
    color: opts.color ?? '#ffffff',
    align: opts.align ?? 'center',
    stroke: opts.stroke === false ? undefined : (opts.stroke ?? TEXT_STROKE),
    strokeThickness: opts.stroke === false ? 0 : (opts.strokeThickness ?? Math.max(2, Math.round(size * 0.16))),
    resolution: scene.textResolution ?? 2,
  }
  if (opts.wrap)
    style.wordWrap = { width: opts.wrap, useAdvancedWrap: true }
  if (opts.shadow !== false) {
    style.shadow = { offsetX: 0, offsetY: Math.max(1, size * 0.08), color: 'rgba(10,20,60,0.55)', blur: Math.max(1, size * 0.08), stroke: true, fill: true }
  }
  if (opts.lineSpacing)
    style.lineSpacing = opts.lineSpacing
  const text = scene.add.text(x, y, String(str), style)
  text.setOrigin(opts.originX ?? 0.5, opts.originY ?? 0.5)
  if (opts.maxWidth)
    fitText(text, opts.maxWidth, size)
  return text
}

/** Shrinks a single-line text until it fits `maxWidth`. */
export function fitText(text, maxWidth, baseSize) {
  let size = baseSize
  text.setFontSize(size)
  while (text.width > maxWidth && size > 10) {
    size -= 2
    text.setFontSize(size)
    if (text.style.strokeThickness > 0)
      text.setStroke(text.style.stroke, Math.max(2, Math.round(size * 0.16)))
  }
  return text
}

/** Press/release animation and feedback shared by every tappable thing. */
export function makePressable(target, onClick, { sound = true, haptic = 'light', scale = 1, hitArea } = {}) {
  const scene = target.scene
  const baseScale = () => target.getData('baseScale') ?? scale
  target.setData('baseScale', scale)
  if (hitArea)
    target.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains)
  else
    target.setInteractive()
  if (target.input)
    target.input.cursor = 'pointer'

  let pressed = false
  let pressTween = null
  const animate = (to, duration, ease) => {
    pressTween?.stop()
    pressTween = scene.tweens.add({ targets: target, scale: to, duration, ease })
  }
  target.on('pointerdown', () => {
    if (target.getData('disabled'))
      return
    pressed = true
    target.getData('idleTween')?.pause()
    animate(baseScale() * 0.92, 70, 'Quad.easeOut')
  })
  const release = (fire) => {
    if (!pressed)
      return
    pressed = false
    animate(baseScale(), 260, 'Back.easeOut')
    const idle = target.getData('idleTween')
    if (idle)
      scene.time.delayedCall(280, () => idle.resume())
    if (fire && !target.getData('disabled')) {
      if (sound)
        audio.click()
      if (haptic)
        haptics.impact(haptic)
      onClick?.()
    }
  }
  target.on('pointerup', () => release(true))
  target.on('pointerout', () => release(false))
  return target
}

/**
 * Big glossy button: label and/or atlas icon.
 */
export class Button extends Phaser.GameObjects.Container {
  constructor(scene, x, y, { w = 280, h = 92, color = 'yellow', label = '', icon, iconSize, fontSize, onClick, textColor, sub } = {}) {
    super(scene, x, y)
    this.w = w
    this.h = h
    this.color = color
    const lip = Math.max(5, Math.min(12, h * 0.1))
    this.bg = scene.add.image(0, 0, buttonTexture(scene, w, h, color)).setDisplaySize(w, h)
    this.add(this.bg)

    const faceCenterY = -lip / 2
    const iconBox = iconSize ?? h * 0.78
    let textX = 0
    if (icon) {
      const hasLabel = !!label
      const ix = hasLabel ? -w / 2 + iconBox * 0.5 + h * 0.16 : 0
      this.icon = scene.add.image(ix, faceCenterY, 'ui', icon)
      this.icon.setScale(iconBox / Math.max(this.icon.width, this.icon.height))
      this.add(this.icon)
      textX = hasLabel ? (iconBox * 0.5 + h * 0.08) / 2 + h * 0.05 : 0
    }
    if (label) {
      const size = fontSize ?? Math.round(h * 0.4)
      const maxW = w - (icon ? iconBox + h * 0.5 : h * 0.5)
      this.label = addText(scene, textX, faceCenterY + (sub ? -h * 0.1 : 0), label, { size, color: textColor ?? '#ffffff', maxWidth: maxW })
      this.add(this.label)
      if (sub) {
        this.sub = addText(scene, textX, faceCenterY + h * 0.2, sub, { size: Math.round(size * 0.55), maxWidth: maxW })
        this.add(this.sub)
      }
    }
    this.setSize(w, h)
    scene.add.existing(this)
    makePressable(this, onClick)
  }

  setLabel(str) {
    if (this.label) {
      this.label.setText(str)
      fitText(this.label, this.w - (this.icon ? this.h * 1.2 : this.h * 0.5), Number.parseInt(this.label.style.fontSize))
    }
    return this
  }

  setDisabled(disabled) {
    this.setData('disabled', disabled)
    this.setAlpha(disabled ? 0.55 : 1)
    return this
  }

  /** Gentle idle "breathing" to draw attention (main CTA). */
  pulse() {
    const tween = this.scene.tweens.add({ targets: this, scale: { from: 1, to: 1.05 }, duration: 750, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
    this.setData('idleTween', tween)
    return this
  }
}

/** Round badge/icon button taken straight from the atlas. */
export function iconButton(scene, x, y, frame, size, onClick, atlas = 'ui') {
  const img = scene.add.image(x, y, atlas, frame)
  const s = size / Math.max(img.width, img.height)
  img.setScale(s)
  makePressable(img, onClick, { scale: s })
  return img
}

export function panel(scene, x, y, w, h, style = 'cream', radius = 28) {
  return scene.add.image(x, y, panelTexture(scene, w, h, style, radius)).setDisplaySize(w, h)
}

/**
 * Coin balance pill with a "+" button that opens the coin store.
 * Animates (counts up) whenever the balance changes.
 */
export class CoinCounter extends Phaser.GameObjects.Container {
  constructor(scene, x, y, { onPlus, h = 64 } = {}) {
    super(scene, x, y)
    const w = h * 3.5
    this.w = w
    this.bg = scene.add.image(0, 0, pillTexture(scene, w, h)).setDisplaySize(w, h)
    this.coin = scene.add.image(-w / 2 + h * 0.42, 0, 'ui', 'icon_coin')
    this.coin.setScale((h * 1.05) / this.coin.width)
    this.value = state.coins
    this.text = addText(scene, h * 0.1, 0, formatNumber(this.value), { size: Math.round(h * 0.5), maxWidth: w - h * 1.7 })
    this.add([this.bg, this.coin, this.text])
    if (onPlus) {
      this.plus = scene.add.image(w / 2 - h * 0.12, 0, 'ui', 'icon_plus')
      this.plus.setScale((h * 0.78) / this.plus.width)
      this.add(this.plus)
      makePressable(this.plus, onPlus, { scale: this.plus.scale })
    }
    this.setSize(w, h)
    scene.add.existing(this)

    this._onCoins = coins => this.animateTo(coins)
    bus.on('state:coins', this._onCoins)
    this.once('destroy', () => bus.off('state:coins', this._onCoins))
  }

  animateTo(target) {
    if (!this.scene)
      return
    const from = this.value
    this.value = target
    this.scene.tweens.addCounter({
      from,
      to: target,
      duration: Math.min(1200, 300 + Math.abs(target - from) * 0.4),
      ease: 'Cubic.easeOut',
      onUpdate: tween => this.text?.setText(formatNumber(tween.getValue())),
    })
    this.scene.tweens.add({ targets: this.coin, scale: this.coin.scale * 1.25, duration: 120, yoyo: true, ease: 'Quad.easeOut' })
  }

  /** World position of the coin icon (fly-to target for coin rewards). */
  getCoinPosition() {
    const m = this.coin.getWorldTransformMatrix()
    return { x: m.tx, y: m.ty }
  }
}

/** On/off switch. */
export class Toggle extends Phaser.GameObjects.Container {
  constructor(scene, x, y, value, onChange, { w = 120, h = 58 } = {}) {
    super(scene, x, y)
    this.w = w
    this.h = h
    this.value = value
    this.track = scene.add.image(0, 0, pillTexture(scene, w, h, 'rgba(255,255,255,0.0)', 'rgba(0,0,0,0)')).setDisplaySize(w, h)
    this.onTrack = scene.add.image(0, 0, pillTexture(scene, w, h, '#2fbf3c', '#1c7d27')).setDisplaySize(w, h)
    this.offTrack = scene.add.image(0, 0, pillTexture(scene, w, h, '#7a8496', '#4a5262')).setDisplaySize(w, h)
    this.knob = disc(scene, 0, 0, h * 0.4, 0xFFFFFF)
    this.add([this.track, this.offTrack, this.onTrack, this.knob])
    this.setSize(w, h)
    scene.add.existing(this)
    this.render(false)
    makePressable(this, () => {
      this.value = !this.value
      this.render(true)
      onChange?.(this.value)
    }, { haptic: 'light' })
  }

  render(animate) {
    const x = this.value ? this.w / 2 - this.h * 0.5 : -this.w / 2 + this.h * 0.5
    if (animate) {
      this.scene.tweens.add({ targets: this.knob, x, duration: 180, ease: 'Back.easeOut' })
      this.scene.tweens.add({ targets: this.onTrack, alpha: this.value ? 1 : 0, duration: 160 })
    }
    else {
      this.knob.x = x
      this.onTrack.alpha = this.value ? 1 : 0
    }
  }
}

/**
 * Crops an image so it covers a `bw` x `bh` box centred on (x, y), like CSS
 * `object-fit: cover`. `fx`/`fy` pick which part of the image stays visible.
 */
export function coverCrop(img, x, y, bw, bh, fx = 0.5, fy = 0.5) {
  const iw = img.frame.realWidth
  const ih = img.frame.realHeight
  const s = Math.max(bw / iw, bh / ih)
  const cw = bw / s
  const ch = bh / s
  const cx = (iw - cw) * fx
  const cy = (ih - ch) * fy
  img.setScale(s)
  img.setCrop(cx, cy, cw, ch)
  img.setPosition(x - (cx + cw / 2 - iw / 2) * s, y - (cy + ch / 2 - ih / 2) * s)
  return img
}
