import { audio } from '@/core/audio'
import { hideSplash } from '@/core/platform'
import { createFxTextures } from '@/ui/textures'
import { BaseScene } from './BaseScene'

const SFX = [
  'alert',
  'click',
  'click_effect',
  'click_effect_2',
  'coin',
  'correct_effect',
  'correct_effect_2',
  'earn_sound',
  'lose',
  'pop',
  'powerup_use',
  'select',
  'success',
  'swipe',
  'time_is_up',
  'win_game',
  'won_sound',
]

const IMAGES = [
  'endless_game_side_spring',
  'endless_game_bg_wood',
  'cardboard_background',
  'wooden_background',
  'shop_bg',
  'inventory_bg',
  'map_full',
  'waternormals',
  'endless_mode_card',
  'classic_mode_card',
  'screen_crack',
  'isle_village',
  'isle_town_center',
  'isle_hut',
  'isle_dock',
  'isle_shop',
  'isle_pirate',
]

/**
 * Shows the logo with a progress bar while every atlas, image and sound is
 * loaded, then hands over to the Home scene.
 */
export class PreloadScene extends BaseScene {
  music = null

  constructor() {
    super({ key: 'Preload' })
  }

  onResize() {}

  preload() {
    // The logo + backdrop are loaded first so the loading screen has art.
    this.load.setPath('assets/')
    this.load.image('logo', 'img/logo.webp')
    this.load.image('bg_spring', 'img/spring_bg.webp')
  }

  create() {
    this.setupLayout()
    const { W, H } = this
    this.addCover('bg_spring')
    this.add.rectangle(W / 2, H / 2, W, H, 0x0B1A3A, 0.35)
    const logo = this.add.image(W / 2, H * 0.4, 'logo')
    logo.setScale(Math.min(620 / logo.width, (H * 0.42) / logo.height))
    this.tweens.add({ targets: logo, y: logo.y - 10, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })

    const barW = Math.min(560, W * 0.5)
    const barY = H * 0.74
    const g = this.add.graphics()
    g.fillStyle(0x0B1A3A, 0.7).fillRoundedRect(W / 2 - barW / 2 - 6, barY - 20, barW + 12, 40, 20)
    const fill = this.add.graphics()
    const drawBar = (p) => {
      fill.clear()
      fill.fillStyle(0xFFB21A, 1).fillRoundedRect(W / 2 - barW / 2, barY - 14, Math.max(28, barW * p), 28, 14)
      fill.fillStyle(0xFFFFFF, 0.35).fillRoundedRect(W / 2 - barW / 2 + 6, barY - 11, Math.max(16, barW * p - 12), 9, 5)
    }
    drawBar(0)
    document.getElementById('boot')?.classList.add('hidden')
    hideSplash()

    const load = this.load
    load.setPath('assets/')
    load.atlas('ui', 'atlas/ui.webp', 'atlas/ui.json')
    load.atlas('art', 'atlas/art.webp', 'atlas/art.json')
    load.atlas('islands', 'atlas/islands.webp', 'atlas/islands.json')
    load.atlas('items', 'atlas/items.webp', 'atlas/items.json')
    for (const key of IMAGES)
      load.image(key, `img/${key}.webp`)
    for (const key of SFX)
      load.audio(key, `audio/${key}.mp3`)

    load.on('progress', drawBar)
    load.once('complete', () => {
      createFxTextures(this)
      audio.init(this.game)
      setTimeout(() => document.getElementById('boot')?.remove(), 400)
      this.scene.launch('Overlay')
      this.go('Home')
    })
    load.start()
  }
}
