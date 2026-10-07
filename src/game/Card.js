import Phaser from 'phaser'
import { cardFrontTexture, shadowTexture } from '@/ui/textures'

// Cards are authored at this size and scaled to fit each layout.
export const CARD_W = 150
export const CARD_H = 168

/**
 * A memory card: outer container (position / selection scale), a soft
 * shadow, and an inner "face" container that squashes horizontally to fake
 * a 3D flip while lifting off the table.
 */
export class Card extends Phaser.GameObjects.Container {
  constructor(scene, x, y, type, skinFrame, onTap) {
    super(scene, x, y)
    this.type = type
    this.faceUp = false
    this.matched = false
    this.busy = false

    this.shadow = scene.add.image(4, 10, shadowTexture(scene, CARD_W, CARD_H)).setDisplaySize(CARD_W + 48, CARD_H + 48).setAlpha(0.55)
    this.face = scene.add.container(0, 0)
    this.back = scene.add.image(0, 0, 'art', skinFrame).setDisplaySize(CARD_W, CARD_H)
    this.front = scene.add.image(0, 0, cardFrontTexture(scene, CARD_W, CARD_H)).setDisplaySize(CARD_W, CARD_H)
    this.icon = scene.add.image(0, 0, 'items', type)
    this.icon.setScale((CARD_W * 0.72) / this.icon.width)
    this.glow = scene.add.image(0, 0, 'fx_glow').setDisplaySize(CARD_W * 1.9, CARD_H * 1.9).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0)
    this.face.add([this.back, this.front, this.icon])
    this.add([this.glow, this.shadow, this.face])
    this.showSide(false)

    this.setSize(CARD_W, CARD_H)
    this.setInteractive()
    if (this.input)
      this.input.cursor = 'pointer'
    this.on('pointerdown', () => onTap?.(this))
    scene.add.existing(this)
  }

  showSide(up) {
    this.front.setVisible(up)
    this.icon.setVisible(up)
    this.back.setVisible(!up)
  }

  setSkin(frame) {
    this.back.setFrame(frame)
    this.back.setDisplaySize(CARD_W, CARD_H)
  }

  /** Flip to face up/down. Returns a promise resolved when done. */
  flip(up, duration = 260) {
    if (this.faceUp === up && !this._flipping)
      return Promise.resolve()
    this.faceUp = up
    this._flipping = true
    const scene = this.scene
    scene.tweens.killTweensOf(this.face)
    return new Promise((resolve) => {
      scene.tweens.chain({
        targets: this.face,
        tweens: [
          { scaleX: 0, scaleY: 1.06, y: -10, duration: duration / 2, ease: 'Quad.easeIn' },
          {
            scaleX: 1,
            scaleY: 1,
            y: 0,
            duration: duration / 2,
            ease: 'Back.easeOut',
            onStart: () => this.showSide(this.faceUp),
          },
        ],
        onComplete: () => {
          this._flipping = false
          resolve()
        },
      })
      scene.tweens.add({ targets: this.shadow, x: 12, y: 22, alpha: 0.35, duration: duration / 2, yoyo: true, ease: 'Quad.easeOut' })
    })
  }

  /** Instantly set face without animation. */
  setFace(up) {
    this.faceUp = up
    this.face.setScale(1).setY(0)
    this.showSide(up)
  }

  select(on) {
    const base = this.getData('baseScale') ?? 1
    this.scene.tweens.add({ targets: this, scale: on ? base * 1.08 : base, duration: 180, ease: on ? 'Back.easeOut' : 'Quad.easeOut' })
    this.scene.tweens.killTweensOf(this.glow)
    if (on) {
      this.glow.setTint(0xFFE36B)
      this.scene.tweens.add({ targets: this.glow, alpha: { from: 0.25, to: 0.6 }, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
    }
    else {
      this.scene.tweens.add({ targets: this.glow, alpha: 0, duration: 160 })
    }
  }

  /** Red flash + shake for a wrong match. */
  wrong() {
    const scene = this.scene
    const x = this.x
    this.front.setTint(0xFFB0B0)
    scene.tweens.chain({
      targets: this,
      tweens: [
        { x: x - 10, duration: 50 },
        { x: x + 10, duration: 70 },
        { x: x - 7, duration: 60 },
        { x: x + 5, duration: 60 },
        { x, duration: 50 },
      ],
    })
    this.glow.setTint(0xFF4444)
    scene.tweens.add({ targets: this.glow, alpha: { from: 0.7, to: 0 }, duration: 500 })
    scene.time.delayedCall(420, () => this.front.clearTint())
  }

  /** Celebrate + vanish. */
  matchOut(delay = 0) {
    const scene = this.scene
    this.matched = true
    this.disableInteractive()
    scene.tweens.killTweensOf(this.glow)
    this.glow.setTint(0x7CFFB2).setAlpha(0.8)
    const base = this.getData('baseScale') ?? 1
    return new Promise((resolve) => {
      scene.tweens.chain({
        targets: this,
        delay,
        tweens: [
          { scale: base * 1.22, duration: 160, ease: 'Back.easeOut' },
          { scale: 0, angle: Phaser.Math.Between(-25, 25), alpha: 0, duration: 260, ease: 'Back.easeIn' },
        ],
        onComplete: resolve,
      })
    })
  }

  /** Pop in (spawn). */
  spawnIn(delay = 0) {
    const base = this.getData('baseScale') ?? 1
    this.setScale(0).setAlpha(1).setAngle(Phaser.Math.Between(-12, 12))
    return new Promise((resolve) => {
      this.scene.tweens.add({ targets: this, scale: base, angle: 0, delay, duration: 380, ease: 'Back.easeOut', onComplete: resolve })
    })
  }

  setBaseScale(s) {
    this.setData('baseScale', s)
    this.setScale(s)
    return this
  }
}
