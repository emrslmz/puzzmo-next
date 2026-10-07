import Phaser from 'phaser'
import { ads } from '@/core/ads'
import { bus } from '@/core/bus'
import { setLanguage } from '@/core/i18n'
import { iap } from '@/core/iap'
import { hideSplash, initPlatform } from '@/core/platform'
import { state } from '@/core/state'
import { cssSize, renderScale } from '@/core/viewport'
import { AdventureScene } from '@/scenes/AdventureScene'
import { EndlessScene } from '@/scenes/EndlessScene'
import { HomeScene } from '@/scenes/HomeScene'
import { MapScene } from '@/scenes/MapScene'
import { OverlayScene } from '@/scenes/OverlayScene'
import { PreloadScene } from '@/scenes/PreloadScene'
import { SettingsScene } from '@/scenes/SettingsScene'
import { ShopScene } from '@/scenes/ShopScene'
import { StatsScene } from '@/scenes/StatsScene'
import { StoreScene } from '@/scenes/StoreScene'

async function loadFonts() {
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load('40px "Lilita One"'),
        document.fonts.load('40px "Luckiest Guy"'),
      ]),
      new Promise(resolve => setTimeout(resolve, 2500)),
    ])
  }
  catch {}
}

/**
 * The canvas backing store is sized in device pixels (bounded by a pixel
 * budget) while its CSS size matches the viewport, so everything renders
 * crisply on any density without wasting fill-rate.
 */
function applyCanvasSize(game) {
  const rs = renderScale()
  const { width, height } = cssSize()
  game.registry.set('renderScale', rs)
  game.scale.setZoom(1 / rs)
  game.scale.resize(Math.round(width * rs), Math.round(height * rs))
  const canvas = game.canvas
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`
}

async function boot() {
  await Promise.all([state.load(), loadFonts()])
  setLanguage(state.settings.language)
  await initPlatform()

  const rs = renderScale()
  const { width, height } = cssSize()

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#0b1a3a',
    banner: false,
    disableContextMenu: true,
    scale: {
      mode: Phaser.Scale.NONE,
      width: Math.round(width * rs),
      height: Math.round(height * rs),
      zoom: 1 / rs,
      autoRound: false,
      expandParent: false,
    },
    render: {
      antialias: true,
      powerPreference: 'high-performance',
      autoMobileTextures: true,
      // One texture unit per batch on every device. Phaser's multi-texture
      // shader picks the unit with an exact float compare on an interpolated
      // varying, which some GPUs (and SwiftShader) get wrong, leaving
      // wedge-shaped holes in sprites. Our art is atlased, so this is cheap.
      maxTextures: 1,
      roundPixels: false,
    },
    input: { activePointers: 3 },
    fps: { target: 60, smoothStep: true },
    scene: [PreloadScene, HomeScene, MapScene, AdventureScene, EndlessScene, ShopScene, StoreScene, SettingsScene, StatsScene, OverlayScene],
  })

  game.registry.set('renderScale', rs)
  game.events.once(Phaser.Core.Events.READY, () => applyCanvasSize(game))

  let resizeTimer = null
  const onResize = () => {
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => {
      applyCanvasSize(game)
      bus.emit('viewport:resize')
    }, 100)
  }
  window.addEventListener('resize', onResize)
  window.addEventListener('orientationchange', onResize)
  bus.on('state:settings', (settings) => {
    // Graphics quality changes the render scale.
    if (settings.performanceMode !== game.registry.get('quality')) {
      game.registry.set('quality', settings.performanceMode)
      onResize()
    }
  })
  game.registry.set('quality', state.settings.performanceMode)

  // Monetisation SDKs initialise in the background; nothing waits on them.
  setTimeout(() => {
    iap.init()
    ads.init()
  }, 1500)

  if (import.meta.env.DEV) {
    window.__game = game
    window.__state = state
    window.__setLanguage = setLanguage
  }
}

// Never leave the native splash up if something goes wrong during boot.
setTimeout(hideSplash, 8000)
boot().catch((error) => {
  console.error('[boot]', error)
  hideSplash()
  const el = document.getElementById('boot')
  if (el)
    el.textContent = 'Something went wrong. Please restart the game.'
})
