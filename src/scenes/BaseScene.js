import Phaser from 'phaser'
import { audio } from '@/core/audio'
import { bus } from '@/core/bus'
import { computeLayout } from '@/core/viewport'
import { addText, CoinCounter, iconButton } from '@/ui/components'

/**
 * Every scene lays out in design units (see core/viewport.js). The main
 * camera is zoomed so that the visible world is `this.W` x `this.H` units with
 * (0,0) at the top-left, whatever the device resolution or aspect ratio.
 */
export class BaseScene extends Phaser.Scene {
  /** Music track for this scene ('menu' | 'endless' | 'adventure' | null). */
  music = 'menu'

  setupLayout() {
    const rs = this.registry.get('renderScale') ?? 1
    const L = computeLayout(this.scale.width, this.scale.height, rs)
    this.L = L
    this.W = L.w
    this.H = L.h
    this.safe = L.safe
    this.textResolution = Phaser.Math.Clamp(L.zoom * 1.05, 1, 3)

    const cam = this.cameras.main
    cam.setSize(this.scale.width, this.scale.height)
    cam.setZoom(L.zoom)
    cam.centerOn(L.w / 2, L.h / 2)

    if (!this._lifecycleBound) {
      this._lifecycleBound = true
      this.scale.on('resize', this._handleResize, this)
      bus.on('app:pause', this._handleAppPause, this)
      this.events.once('shutdown', () => {
        this._lifecycleBound = false
        this.scale.off('resize', this._handleResize, this)
        bus.off('app:pause', this._handleAppPause, this)
        clearTimeout(this._resizeTimer)
      })
    }
    this.registry.set('activeScene', this.scene.key)
    if (this.music !== undefined && this.music !== null)
      audio.playMusic(this.music)
  }

  // Insets: keep interactive UI clear of notches / rounded corners.
  get left() { return Math.max(this.safe.left, 0) + 24 }
  get right() { return this.W - Math.max(this.safe.right, 0) - 24 }
  get top() { return Math.max(this.safe.top, 0) + 18 }
  get bottom() { return this.H - Math.max(this.safe.bottom, 0) - 18 }
  get cx() { return this.W / 2 }
  get cy() { return this.H / 2 }

  _handleResize() {
    clearTimeout(this._resizeTimer)
    this._resizeTimer = setTimeout(() => {
      if (this.sys.isActive() || this.sys.isPaused())
        this.onResize()
    }, 120)
  }

  /** Default: rebuild the scene for the new size (menus are stateless). */
  onResize() {
    this.scene.restart(this.sys.settings.data)
  }

  _handleAppPause() {
    this.onAppPause?.()
  }

  /** Android back button. Return true if handled. */
  onBack() {
    this.go('Home')
    return true
  }

  get overlay() {
    return this.scene.get('Overlay')
  }

  /** Cover-fit an image to fill the whole view. */
  addCover(key, { tint, alpha = 1, focusY = 0.5 } = {}) {
    const img = this.add.image(this.W / 2, this.H / 2, key)
    const s = Math.max(this.W / img.width, this.H / img.height)
    img.setScale(s)
    img.y = this.H / 2 + (img.displayHeight - this.H) * (0.5 - focusY)
    if (tint !== undefined)
      img.setTint(tint)
    img.setAlpha(alpha)
    return img
  }

  /** Standard menu header: back button, title, optional coin counter. */
  addHeader(title, { back = 'Home', coins = true } = {}) {
    const y = this.top + 44
    const backBtn = iconButton(this, this.left + 44, y, 'left_badge', 88, () => this.go(back)).setDepth(40)
    const titleText = addText(this, this.W / 2, y, title, { size: 46, display: true, maxWidth: this.W * 0.5 }).setDepth(40)
    titleText.setScale(0.5)
    this.tweens.add({ targets: titleText, scale: 1, duration: 450, ease: 'Back.easeOut' })
    let counter = null
    if (coins)
      counter = new CoinCounter(this, this.right - 112, y, { onPlus: this.scene.key === 'Store' ? null : () => this.go('Store', { from: this.scene.key }) }).setDepth(40)
    return { backBtn, titleText, counter }
  }

  /** Fade out and switch scene. */
  go(key, data) {
    if (this._leaving)
      return
    this._leaving = true
    this.input.enabled = false
    this.cameras.main.fadeOut(180, 6, 17, 38)
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(key, data)
    })
  }

  fadeIn() {
    this._leaving = false
    this.cameras.main.fadeIn(260, 6, 17, 38)
  }
}
