import Phaser from 'phaser'
import { audio } from '@/core/audio'
import { haptics } from '@/core/haptics'
import { formatNumber, t } from '@/core/i18n'
import { state } from '@/core/state'
import { ISLANDS } from '@/data/catalog'
import { showTutorial } from '@/game/GameUI'
import { addOcean } from '@/game/Water'
import { addText, CoinCounter, disc, iconButton } from '@/ui/components'
import { burst, flyCoins } from '@/ui/fx'
import { pillTexture } from '@/ui/textures'
import { BaseScene } from './BaseScene'

// Island anchor points along a winding route (fractions of the world).
const ROUTE = [
  [0.09, 0.6],
  [0.25, 0.36],
  [0.41, 0.66],
  [0.57, 0.38],
  [0.73, 0.65],
  [0.9, 0.4],
]

/**
 * Adventure map: an animated ocean the player can drag sideways, with the
 * islands linked by a dotted route. Locked islands can be bought with coins.
 */
export class MapScene extends BaseScene {
  constructor() {
    super({ key: 'Map' })
  }

  create() {
    this.setupLayout()
    const { W, H } = this
    this.worldW = Math.max(W, 2100)
    this.scrollX = 0
    this.velocity = 0
    this.dragging = false
    this.dragDist = 0

    this.world = this.add.container(0, 0)
    this.ocean = addOcean(this, 0, 0, this.worldW, H, 0)
    this.world.add(this.ocean)
    this.sparkles = this.add.particles(0, 0, 'fx_spark', {
      x: { min: 0, max: this.worldW },
      y: { min: 0, max: H },
      scale: { start: 0.25, end: 0 },
      alpha: { start: 0.8, end: 0 },
      lifespan: 900,
      frequency: 120,
      blendMode: Phaser.BlendModes.ADD,
    })
    this.world.add(this.sparkles)

    this.drawRoute()
    this.islandViews = ISLANDS.map((island, i) => this.createIsland(island, i))

    // HUD
    iconButton(this, this.left + 44, this.top + 44, 'left_badge', 88, () => this.go('Home')).setDepth(20)
    const title = addText(this, W / 2, this.top + 44, t('adventure_mode'), { size: 44, display: true }).setDepth(20)
    title.setScale(0.6)
    this.tweens.add({ targets: title, scale: 1, duration: 500, ease: 'Back.easeOut' })
    this.coins = new CoinCounter(this, this.right - 112, this.top + 44, { onPlus: () => this.go('Store') }).setDepth(20)

    this.input.on('pointerdown', this.onDown, this)
    this.input.on('pointermove', this.onMove, this)
    this.input.on('pointerup', this.onUp, this)
    this.input.on('wheel', (_p, _o, dx, dy) => {
      this.scrollX = this.clampScroll(this.scrollX - (dx + dy) * 0.8)
    })

    // Start focused on the furthest unlocked island.
    const lastUnlocked = ISLANDS.reduce((acc, isl, i) => (state.isIslandUnlocked(isl.id) ? i : acc), 0)
    const focusX = ROUTE[Math.min(lastUnlocked + 1, ROUTE.length - 1)][0] * this.worldW
    this.scrollX = this.clampScroll(W / 2 - focusX)
    this.world.x = this.scrollX

    this.fadeIn()
    showTutorial(this, 'map_guide', [
      { title: t('tutorial_map_mode_intro_page1_title'), text: t('tutorial_map_mode_intro_page1_text'), frame: 'mascot_discover' },
      { title: t('tutorial_map_mode_intro_page2_title'), text: t('tutorial_map_mode_intro_page2_text'), atlas: 'ui', frame: 'icon_compass' },
      { title: t('tutorial_map_mode_intro_page3_title'), text: t('tutorial_map_mode_intro_page3_text'), frame: 'mascot_rich3' },
      { title: t('tutorial_map_mode_intro_page4_title'), text: t('tutorial_map_mode_intro_page4_text'), atlas: 'ui', frame: 'icon_lock2' },
    ], 'tutorial_map_mode_intro_finish_button')
  }

  islandPos(i) {
    const [fx, fy] = ROUTE[i]
    const top = this.top + 110
    const bottom = this.H - 60
    return { x: fx * this.worldW, y: top + (bottom - top) * fy }
  }

  drawRoute() {
    for (let i = 0; i < ROUTE.length - 1; i++) {
      const a = this.islandPos(i)
      const b = this.islandPos(i + 1)
      const unlocked = state.isIslandUnlocked(ISLANDS[i + 1].id)
      const ctrl = new Phaser.Math.Vector2((a.x + b.x) / 2, (a.y + b.y) / 2 + (i % 2 ? -90 : 90))
      const curve = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(a.x, a.y), ctrl, new Phaser.Math.Vector2(b.x, b.y))
      const pts = curve.getSpacedPoints(16)
      pts.slice(3, -3).forEach((p, k) => {
        const dot = disc(this, p.x, p.y, 7, unlocked ? 0xFFFFFF : 0x9FB3D1, unlocked ? 0.95 : 0.6)
        this.world.add(dot)
        if (unlocked)
          this.tweens.add({ targets: dot, scale: dot.scale * 1.35, duration: 600, yoyo: true, repeat: -1, delay: k * 90, ease: 'Sine.easeInOut' })
      })
    }
  }

  createIsland(island, i) {
    const { x, y } = this.islandPos(i)
    const unlocked = state.isIslandUnlocked(island.id)
    const size = Math.min(250, this.H * 0.36)
    const c = this.add.container(x, y)

    const shadow = disc(this, 0, size * 0.32, size * 0.42, 0x05324F, 0.35)
    shadow.setScale(shadow.scaleX * 1.2, shadow.scaleY * 0.35)
    const glow = this.add.image(0, 0, 'fx_glow').setDisplaySize(size * 1.6, size * 1.6).setTint(0xFFF3B0).setBlendMode(Phaser.BlendModes.ADD).setAlpha(unlocked ? 0.35 : 0)
    const img = this.add.image(0, 0, 'islands', island.frame)
    img.setScale(size / Math.max(img.width, img.height))
    if (!unlocked)
      img.setTint(0x8C9BB0)
    c.add([shadow, glow, img])

    const name = addText(this, 0, size * 0.5 + 6, t(island.nameKey), { size: 26, maxWidth: size * 1.2 })
    const plateW = Math.max(160, name.width + 40)
    const plate = this.add.image(0, size * 0.5 + 8, pillTexture(this, plateW, 48)).setDisplaySize(plateW, 48)
    c.add([plate, name])

    if (unlocked) {
      const level = state.islandLevel(island.id)
      const star = this.add.image(size * 0.36, -size * 0.36, 'ui', 'icon_star')
      star.setScale(70 / star.width)
      const lv = addText(this, size * 0.36, -size * 0.35, String(level), { size: 26 })
      c.add([star, lv])
      this.tweens.add({ targets: star, angle: { from: -8, to: 8 }, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
    }
    else {
      const lock = this.add.image(0, -size * 0.05, 'ui', 'icon_lock')
      lock.setScale(80 / lock.width)
      const pw = 150
      const price = this.add.image(0, size * 0.22, pillTexture(this, pw, 50, 'rgba(255,178,26,0.95)', '#8a4600')).setDisplaySize(pw, 50)
      const coin = this.add.image(-pw / 2 + 26, size * 0.22, 'ui', 'icon_coin')
      coin.setScale(44 / coin.width)
      const cost = addText(this, 14, size * 0.22, formatNumber(island.cost), { size: 26 })
      c.add([lock, price, coin, cost])
      this.tweens.add({ targets: lock, y: lock.y - 6, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
    }

    // Gentle float on the waves.
    this.tweens.add({ targets: img, y: -8, angle: { from: -1.5, to: 1.5 }, duration: 1800 + i * 170, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
    this.tweens.add({ targets: shadow, scaleX: shadow.scaleX * 0.92, duration: 1800 + i * 170, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })

    c.setSize(size, size)
    c.setInteractive()
    c.on('pointerup', () => {
      if (this.dragDist < 14)
        this.onIsland(island, c)
    })
    c.on('pointerdown', () => {
      this.tweens.add({ targets: c, scale: 0.94, duration: 80 })
    })
    c.on('pointerout', () => this.tweens.add({ targets: c, scale: 1, duration: 200, ease: 'Back.easeOut' }))
    this.world.add(c)
    return c
  }

  async onIsland(island, view) {
    this.tweens.add({ targets: view, scale: 1, duration: 220, ease: 'Back.easeOut' })
    audio.play('select')
    haptics.impact('light')
    if (state.isIslandUnlocked(island.id)) {
      state.selectIsland(island.id)
      this.go('Adventure', { islandId: island.id })
      return
    }
    const name = t(island.nameKey)
    const icon = { atlas: 'islands', frame: island.frame, size: 160 }
    if (state.coins < island.cost) {
      const goStore = await this.overlay.confirm({
        title: t('not_enough_balance_title'),
        message: `${t('required_amount')}: ${formatNumber(island.cost)} ${t('coin')}`,
        icon,
        confirmText: t('extra_coin'),
        cancelText: t('okay'),
        color: 'orange',
      })
      if (goStore)
        this.go('Store')
      return
    }
    const ok = await this.overlay.confirm({
      title: t('purchase_confirmation_title'),
      message: `${name}\n${formatNumber(island.cost)} ${t('coin')}`,
      icon,
      confirmText: t('purchase'),
    })
    if (!ok)
      return
    const from = this.coins.getCoinPosition()
    if (state.unlockIsland(island.id)) {
      flyCoins(this, from, { x: view.x + this.world.x, y: view.y }, 10)
      this.time.delayedCall(800, () => {
        burst(this, view.x + this.world.x, view.y, { count: 40, speed: 600, scale: 1 })
        audio.play('won_sound')
        haptics.notify('success')
        this.overlay.toast(t('island_purchase_success', { name }), 'success')
        this.overlay.confetti(900)
      })
      this.time.delayedCall(1800, () => this.scene.restart())
    }
  }

  // --- Drag / inertia -------------------------------------------------------------
  clampScroll(x) {
    return Phaser.Math.Clamp(x, this.W - this.worldW, 0)
  }

  onDown(pointer) {
    this.dragging = true
    this.dragDist = 0
    this.velocity = 0
    this.lastX = pointer.x
  }

  onMove(pointer) {
    if (!this.dragging || !pointer.isDown)
      return
    const zoom = this.cameras.main.zoom
    const dx = (pointer.x - this.lastX) / zoom
    this.lastX = pointer.x
    this.dragDist += Math.abs(dx)
    this.scrollX = this.clampScroll(this.scrollX + dx)
    this.velocity = dx / Math.max(this.game.loop.delta / 1000, 0.001)
  }

  onUp() {
    this.dragging = false
  }

  update(_time, delta) {
    const dt = Math.min(delta, 50) / 1000
    if (!this.dragging && Math.abs(this.velocity) > 5) {
      this.scrollX = this.clampScroll(this.scrollX + this.velocity * dt)
      this.velocity *= 0.92 ** (dt * 60)
    }
    this.world.x += (this.scrollX - this.world.x) * Math.min(1, dt * 18)
  }
}
