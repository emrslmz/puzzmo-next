import Phaser from 'phaser'
import { audio } from '@/core/audio'
import { haptics } from '@/core/haptics'
import { formatNumber, t } from '@/core/i18n'
import { state } from '@/core/state'
import { qualityLevel } from '@/core/viewport'
import { ADVENTURE_POWER_UPS, CARD_ITEMS, getIsland } from '@/data/catalog'
import { Card } from '@/game/Card'
import { PowerUpBar, showTutorial, shuffle, StatChip } from '@/game/GameUI'
import { MemoryGameScene } from '@/game/MemoryGameScene'
import { Water } from '@/game/Water'
import { addText, rect } from '@/ui/components'
import { burst, floatText } from '@/ui/fx'
import { gradientTexture, pillTexture } from '@/ui/textures'

const COLS = 4
const ROWS = 3

export class AdventureScene extends MemoryGameScene {
  music = 'adventure'
  exitLabel = null

  constructor() {
    super({ key: 'Adventure' })
  }

  init(data) {
    this.islandId = data?.islandId ?? state.data.adventure.currentIslandId ?? 'village_island'
  }

  create() {
    this.setupLayout()
    this.initGameState()
    this.exitLabel = t('back_to_map')
    this.island = getIsland(this.islandId) ?? getIsland('village_island')
    this.levelNum = state.islandLevel(this.island.id)
    const lv = this.levelNum
    this.required = 8 + lv * 2
    this.reward = 50 + lv * 15
    this.riseRate = 2.2 + (Math.min(lv, 15) - 1) * 0.25
    this.drain = Math.max(2, 10 - lv * 0.5)
    this.danger = 0
    this.matches = 0
    this.wrongCount = 0
    this.cards = []
    this.respawning = false

    this.bg = this.addCover('cardboard_background')
    this.bgShade = this.add.image(0, 0, gradientTexture(this, 64, 256, 'rgba(10,20,50,0.05)', 'rgba(10,20,50,0.35)')).setOrigin(0)

    this.water = new Water(this, {
      x: 0,
      y: 0,
      w: 400,
      h: this.H,
      backdrop: `isle_${this.island.theme}`,
      focusX: 0.25,
      focusY: 0.35,
      level: 0.04,
      depth: 2,
      quality: qualityLevel(),
    })
    this.buildPanelDecor()
    this.buildHud()
    this.layoutGame()
    this.fadeIn()
    this.runIntro()
  }

  get activeCards() {
    return this.cards.filter(c => !c.matched)
  }

  canUsePowerUp(id) {
    return ADVENTURE_POWER_UPS.includes(id)
  }

  levelFor(danger) {
    return 0.04 + 0.92 * Phaser.Math.Clamp(danger / 100, 0, 1.05)
  }

  // --- Build ----------------------------------------------------------------------
  buildPanelDecor() {
    this.plank = rect(this, 0, 0, 16, this.H, 0x6B3A12).setOrigin(0.5, 0).setDepth(6)
    this.plankHi = rect(this, 0, 0, 4, this.H, 0xC98A4B).setOrigin(0.5, 0).setDepth(6)
    this.panelShadow = rect(this, 0, 0, 14, this.H, 0x000000, 0.22).setOrigin(0, 0).setDepth(5)

    // Water gauge ticks.
    this.ticks = []
    for (let i = 1; i < 10; i++) {
      const major = i % 5 === 0
      const tick = rect(this, 0, 0, major ? 26 : 14, major ? 5 : 3, i >= 8 ? 0xFF6B6B : 0xFFFFFF, 0.85).setOrigin(1, 0.5).setDepth(6)
      tick.setData('frac', i / 10)
      this.ticks.push(tick)
    }

    this.nameBanner = this.add.container(0, 0).setDepth(20)
    const name = t(this.island.nameKey)
    const nameText = addText(this, 0, -6, name, { size: 30, maxWidth: 330 })
    const lvText = addText(this, 0, 26, `${t('level')} ${this.levelNum}`, { size: 22, color: '#ffe36b' })
    const bw = Math.min(360, Math.max(220, nameText.width + 60))
    const plate = this.add.image(0, 8, pillTexture(this, bw, 86, 'rgba(10,28,70,0.82)', 'rgba(140,200,255,0.6)')).setDisplaySize(bw, 86)
    this.nameBanner.add([plate, nameText, lvText])

    this.mascot = this.add.image(0, 0, 'art', 'mascot_water_happy').setDepth(20)
    this.mascot.setScale(96 / this.mascot.width)
    this.tweens.add({ targets: this.mascot, angle: { from: -6, to: 6 }, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })

    // A rubber duck rides the surface; fish swim below it.
    this.duck = this.add.image(0, 0, 'items', 'duck').setDepth(4)
    this.duck.setScale(64 / this.duck.width)
    this.water.addFloater(this.duck, { offsetY: -20, drift: 26 })
    this.fish = ['fish', 'whale'].map((frame, i) => {
      const f = this.add.image(0, 0, 'items', frame).setDepth(3).setAlpha(0.85).setTint(0xBFE6FF)
      f.setScale((i === 0 ? 46 : 58) / f.width)
      f.setData({ phase: Math.random() * 6, dir: i === 0 ? 1 : -1, speed: 34 + i * 12, depthFrac: 0.35 + i * 0.3 })
      return f
    })
  }

  buildHud() {
    this.addPauseButton(0, 0, 82)
    this.levelChip = new StatChip(this, 0, 0, { icon: 'icon_star', value: this.levelNum, w: 150, label: t('level') }).setDepth(50)
    this.matchChip = new StatChip(this, 0, 0, { icon: 'icon_cards', value: `0/${this.required}`, w: 200, label: t('match') }).setDepth(50)
    this.wrongChip = new StatChip(this, 0, 0, { icon: 'icon_cancel', value: 0, w: 150, label: t('wrong') }).setDepth(50)
    this.progressBg = rect(this, 0, 0, 10, 10, 0x0B1A3A, 0.6).setOrigin(0, 0.5).setDepth(50)
    this.progressFill = rect(this, 0, 0, 10, 10, 0x34D399).setOrigin(0, 0.5).setDepth(51)
    this.powerBar = null
  }

  layoutGame() {
    const { W, H } = this
    const panelW = Phaser.Math.Clamp(W * 0.3, 300, 470) + this.safe.left
    this.panelW = panelW
    this.bg.setPosition(W / 2, H / 2).setScale(Math.max(W / this.bg.width, H / this.bg.height))
    this.bgShade.setDisplaySize(W, H)
    this.water.layout(0, 0, panelW, H)

    this.plank.setPosition(panelW + 4, 0).setDisplaySize(16, H)
    this.plankHi.setPosition(panelW + 8, 0).setDisplaySize(4, H)
    this.panelShadow.setPosition(panelW + 12, 0).setDisplaySize(14, H)
    for (const tick of this.ticks)
      tick.setPosition(panelW - 4, H * (1 - this.levelFor(tick.getData('frac') * 100)))

    const bannerY = this.top + 44
    this.nameBanner.setPosition(this.safe.left + (panelW - this.safe.left) / 2 - 20, bannerY)
    this.mascot.setPosition(panelW - 56, bannerY + 4)
    this.duck.x = Phaser.Math.Clamp(this.duck.x || panelW * 0.4, 60, panelW - 60)
    this.fish.forEach((f) => {
      if (!f.x)
        f.x = panelW * (0.3 + Math.random() * 0.4)
    })

    // Right side.
    const rx0 = panelW + 40
    const rx1 = this.right
    const puSize = Math.min(92, (H - 140) / 4.6)
    this.powerBar?.destroy()
    this.powerBar = new PowerUpBar(this, rx1 - puSize / 2 - 8, H / 2 + 30, ADVENTURE_POWER_UPS, { size: puSize, onUse: id => this.usePowerUp(id) }).setDepth(50)

    const hy = this.top + 40
    this.pauseBtn.setPosition(rx0 + 38, hy)
    const chipsX0 = rx0 + 100
    const chipsW = rx1 - chipsX0
    const compact = chipsW < 560
    this.levelChip.setPosition(chipsX0 + 75, hy)
    this.matchChip.setPosition(chipsX0 + 150 + 16 + 100, hy)
    this.wrongChip.setPosition(chipsX0 + 150 + 16 + 200 + 16 + 75, hy)
    this.wrongChip.setVisible(!compact)
    this.progressBg.setPosition(this.matchChip.x - 80, hy + 38).setDisplaySize(160, 8)
    this.progressFill.setPosition(this.matchChip.x - 80, hy + 38)
    this.updateProgress(false)

    const area = { x: rx0, y: this.top + 92, w: rx1 - puSize - 36 - rx0, h: this.bottom - (this.top + 92) }
    this.grid = this.gridLayout(COLS, ROWS, area, { gap: 18 })
    this.cards.forEach((c, i) => {
      const cell = this.grid.cells[i]
      c.setPosition(cell.x, cell.y).setBaseScale(this.grid.scale)
    })

    if (this.dangerVignette)
      this.dangerVignette.setPosition(W / 2, H / 2).setDisplaySize(W * 1.1, H * 1.1)
  }

  updateProgress(animate = true) {
    const p = Phaser.Math.Clamp(this.matches / this.required, 0, 1)
    const w = Math.max(8, 160 * p)
    if (animate)
      this.tweens.add({ targets: this.progressFill, displayWidth: w, duration: 300, ease: 'Quad.easeOut' })
    else
      this.progressFill.setDisplaySize(w, 8)
  }

  // --- Board ------------------------------------------------------------------------
  createBoard(faceUp) {
    this.cards.forEach(c => c.destroy())
    const types = shuffle(CARD_ITEMS).slice(0, (COLS * ROWS) / 2)
    const deck = shuffle([...types, ...types])
    const skin = state.selectedSkin.frame
    this.cards = deck.map((type, i) => {
      const cell = this.grid.cells[i]
      const card = new Card(this, cell.x, cell.y, type, skin, c => this.tapCard(c)).setDepth(10)
      card.setBaseScale(this.grid.scale)
      card.setFace(faceUp)
      return card
    })
    return Promise.all(this.cards.map((c, i) => c.spawnIn(i * 45)))
  }

  async respawnBoard() {
    if (this.respawning)
      return
    this.respawning = true
    this.lock = true
    haptics.impact('heavy')
    await this.createBoard(true)
    audio.play('success', { volume: 0.4 })
    await new Promise(resolve => this.time.delayedCall(1300, resolve))
    await Promise.all(this.cards.map((c, i) => new Promise(resolve => this.time.delayedCall(i * 30, () => c.flip(false).then(resolve)))))
    this.lock = false
    this.respawning = false
  }

  // --- Flow -------------------------------------------------------------------------
  async runIntro() {
    await showTutorial(this, 'adventure_mode_guide', [
      { title: t('adventure_mode_guide_page1_title'), text: t('adventure_mode_guide_page1_text'), frame: 'mascot_showing_right' },
      { title: t('adventure_mode_guide_page2_title'), text: t('adventure_mode_guide_page2_text'), frame: 'mascot_water_save' },
      { title: t('adventure_mode_guide_page3_title'), text: t('adventure_mode_guide_page3_text'), frame: 'mascot_discover' },
      { title: t('adventure_mode_guide_page4_title'), text: t('adventure_mode_guide_page4_text'), atlas: 'ui', frame: 'icon_powerup_icon' },
      { title: t('adventure_mode_guide_page5_title'), text: t('adventure_mode_guide_page5_text'), frame: 'mascot_happy' },
    ], 'adventure_mode_guide_finish_button')
    if (!this.scene.isActive())
      return
    const name = t(this.island.nameKey)
    const start = await this.overlay.modal({
      title: t('adventure_mode_title', { name }),
      message: t('welcome_to_island', { name }),
      icon: { atlas: 'islands', frame: this.island.frame, size: 150 },
      width: 820,
      content: (s, container, width, y0) => {
        const chips = [
          { icon: 'icon_cards', text: t('required_matches', { count: this.required }) },
          { icon: 'icon_coin', text: `+${formatNumber(this.reward)}` },
        ]
        chips.forEach((c, i) => {
          const chip = new StatChip(s, (i - 0.5) * (width / 2), y0 + 36, { icon: c.icon, value: c.text, w: width / 2 - 20, h: 60 })
          container.add(chip)
        })
        return 76
      },
      dismissValue: false,
      buttons: [
        { label: t('back_to_map'), color: 'gray', value: false },
        { label: t('start_game'), color: 'green', value: true },
      ],
    })
    if (!start) {
      this.onExit()
      return
    }
    this.startRound()
  }

  async startRound() {
    this.phase = 'countdown'
    await this.createBoard(true)
    await this.countdown()
    await Promise.all(this.cards.map((c, i) => new Promise(resolve => this.time.delayedCall(i * 30, () => c.flip(false).then(resolve)))))
    this.phase = 'playing'
  }

  update(_time, delta) {
    this.water.update(delta)
    const dt = Math.min(delta, 50) / 1000
    if (this.isPlaying) {
      if (!this.frozen)
        this.danger += this.riseRate * dt
      // Checked even while frozen: a wrong match can still flood the island.
      if (this.danger >= 100) {
        this.danger = 100
        this.lose()
      }
    }
    this.water.setLevel(this.levelFor(this.danger))
    this.updateDanger(this.danger / 100)
    const sad = this.danger > 60
    const frame = sad ? 'mascot_water_sad' : 'mascot_water_happy'
    if (this.mascot.frame.name !== frame)
      this.mascot.setFrame(frame)

    // Fish keep below the surface.
    for (const f of this.fish) {
      const d = f.data.values
      d.phase += dt
      f.x += d.dir * d.speed * dt
      if (f.x > this.panelW - 40)
        d.dir = -1
      if (f.x < 40)
        d.dir = 1
      f.setFlipX(d.dir < 0)
      const surface = this.water.surfaceY(f.x)
      const bottom = this.H - 40
      const room = bottom - surface
      f.setVisible(room > 70)
      f.y = surface + Math.max(40, room * d.depthFrac) + Math.sin(d.phase * 2) * 8
    }
  }

  // --- Hooks ----------------------------------------------------------------------
  onCorrect(a, b, source, mid) {
    this.matches++
    const before = this.danger
    this.danger = Math.max(0, this.danger - this.drain)
    this.matchChip.setValue(`${this.matches}/${this.required}`)
    this.updateProgress()
    floatText(this, mid.x, mid.y, '+100', { color: '#ffe36b' })
    if (before - this.danger > 0.5) {
      const nx = 0.2 + Math.random() * 0.6
      this.water.splash(nx, 0.9, { sound: source === 'manual' })
      floatText(this, this.panelW * 0.5, this.water.surfaceY(this.panelW * 0.5) - 30, `-${Math.round(before - this.danger)}%`, { color: '#9fe4ff', size: 40 })
    }
  }

  onPairRemoved() {
    if (this.phase !== 'playing' && this.phase !== 'countdown')
      return
    if (this.matches >= this.required) {
      this.win()
      return
    }
    if (this.cards.every(c => c.matched))
      this.time.delayedCall(250, () => this.respawnBoard())
  }

  onWrong() {
    this.wrongCount++
    this.danger = Math.min(100, this.danger + 5)
    this.wrongChip.setValue(this.wrongCount)
    this.water.splash(0.5, 1.6)
    this.cameras.main.shake(160, 0.004)
  }

  onFreeze(on) {
    this.water.setFrozen(on)
  }

  // --- End states -------------------------------------------------------------------
  resultContent(stats) {
    return (s, container, width, y0) => {
      const w = Math.min(220, (width - 40) / stats.length)
      stats.forEach((st, i) => {
        const x = (i - (stats.length - 1) / 2) * (w + 14)
        container.add(new StatChip(s, x, y0 + 40, { icon: st.icon, value: st.value, w, h: 66, label: st.label }))
      })
      return 84
    }
  }

  async win() {
    if (this.phase === 'over')
      return
    this.phase = 'over'
    this.lock = true
    const score = this.matches * 100 - this.wrongCount * 10
    state.completeIslandLevel(this.island.id, score, this.matches)
    state.addCoins(this.reward)
    audio.play('win_game')
    haptics.notify('success')
    this.overlay.confetti()
    this.danger = 0
    this.water.splash(0.5, 1.4)
    burst(this, this.panelW / 2, this.H * 0.6, { count: 30, colors: [0x9FE4FF, 0xFFFFFF], texture: 'fx_bubble', speed: 500, scale: 0.9, gravityY: -200 })

    await new Promise(resolve => this.time.delayedCall(900, resolve))
    const choice = await this.overlay.modal({
      title: t('level_completed'),
      icon: { atlas: 'art', frame: 'mascot_rich3', size: 150 },
      width: 820,
      content: this.resultContent([
        { icon: 'icon_coin', value: `+${formatNumber(this.reward)}`, label: t('coin') },
        { icon: 'icon_cards', value: this.matches, label: t('match') },
        { icon: 'icon_cancel', value: this.wrongCount, label: t('wrong') },
      ]),
      dismissValue: 'map',
      dismissible: false,
      buttons: [
        { label: t('back_to_map'), color: 'gray', value: 'map' },
        { label: `${t('next')} ▶`, color: 'green', value: 'next' },
      ],
    })
    await this.maybeInterstitial()
    if (choice === 'next')
      this.scene.restart({ islandId: this.island.id })
    else
      this.go('Map')
  }

  async lose() {
    if (this.phase === 'over')
      return
    this.phase = 'over'
    this.lock = true
    this.selected.forEach(c => c.select(false))
    this.selected = []
    audio.play('time_is_up')
    haptics.notify('error')
    this.cameras.main.shake(500, 0.01)
    this.water.splash(0.3, 1.8)
    this.water.splash(0.75, 1.5, { sound: false })
    const coins = Math.floor(this.matches * 2)

    await new Promise(resolve => this.time.delayedCall(800, resolve))
    const buttons = [
      { label: t('back_to_map'), color: 'gray', value: 'map' },
      { label: t('restart_level'), color: 'blue', value: 'retry' },
    ]
    if (!this.revived)
      buttons.push({ label: t('continue'), icon: 'icon_ad_icon', color: 'purple', value: 'revive' })
    const choice = await this.overlay.modal({
      title: t('game_over'),
      message: t('danger_level_reached'),
      icon: { atlas: 'art', frame: 'mascot_water_sad', size: 130 },
      width: 900,
      content: this.resultContent([
        { icon: 'icon_coin', value: `+${coins}`, label: t('coin') },
        { icon: 'icon_cards', value: `${this.matches}/${this.required}`, label: t('match') },
        { icon: 'icon_cancel', value: this.wrongCount, label: t('wrong') },
      ]),
      dismissible: false,
      buttons,
    })

    if (choice === 'revive' && await this.offerRevive()) {
      this.danger = 45
      this.water.splash(0.5, 1.2)
      this.lock = false
      this.phase = 'playing'
      this.overlay.toast(t('water_drained'), 'success')
      return
    }
    if (choice === 'revive') {
      // Ad unavailable: fall back to the normal options.
      this.phase = 'playing'
      this.revived = true
      this.danger = 99.9
      this.lose()
      return
    }

    if (coins > 0)
      state.addCoins(coins)
    state.failIslandLevel(this.matches)
    await this.maybeInterstitial()
    if (choice === 'retry')
      this.scene.restart({ islandId: this.island.id })
    else
      this.go('Map')
  }

  onExit() {
    this.go('Map')
  }
}
