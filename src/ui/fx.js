import Phaser from 'phaser'
import { audio } from '@/core/audio'
import { addText, rect } from './components'

/** Coins flying along a curve into the balance counter. */
export function flyCoins(scene, from, to, count = 10, onEach) {
  for (let i = 0; i < count; i++) {
    const coin = scene.add.image(from.x, from.y, 'ui', 'icon_coin').setDepth(1000)
    coin.setScale(46 / coin.width)
    const ctrl = {
      x: Phaser.Math.Linear(from.x, to.x, 0.3) + Phaser.Math.Between(-160, 160),
      y: Math.min(from.y, to.y) - Phaser.Math.Between(60, 200),
    }
    const curve = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(from.x, from.y), new Phaser.Math.Vector2(ctrl.x, ctrl.y), new Phaser.Math.Vector2(to.x, to.y))
    const tracker = { t: 0 }
    coin.setAlpha(0)
    scene.tweens.add({
      targets: tracker,
      t: 1,
      delay: i * 55,
      duration: 700 + Math.random() * 200,
      ease: 'Cubic.easeIn',
      onStart: () => coin.setAlpha(1),
      onUpdate: () => {
        const p = curve.getPoint(tracker.t)
        coin.setPosition(p.x, p.y)
        coin.rotation = tracker.t * 6
      },
      onComplete: () => {
        coin.destroy()
        if (i % 2 === 0)
          audio.play('coin', { volume: 0.35, rate: 1 + Math.random() * 0.2 })
        onEach?.(i)
      },
    })
  }
}

/** Star / sparkle burst at a point. */
export function burst(scene, x, y, { colors = [0xFFE36B, 0xFFFFFF, 0x7CF2E2], count = 18, speed = 420, scale = 0.7, texture = 'fx_spark', depth = 500, lifespan = 700, gravityY = 300 } = {}) {
  const emitter = scene.add.particles(x, y, texture, {
    speed: { min: speed * 0.35, max: speed },
    angle: { min: 0, max: 360 },
    scale: { start: scale, end: 0 },
    alpha: { start: 1, end: 0 },
    rotate: { min: 0, max: 360 },
    lifespan: { min: lifespan * 0.6, max: lifespan },
    gravityY,
    tint: colors,
    blendMode: Phaser.BlendModes.ADD,
    emitting: false,
  }).setDepth(depth)
  emitter.explode(count)
  scene.time.delayedCall(lifespan + 100, () => emitter.destroy())
  return emitter
}

/** Expanding ring shockwave. */
export function ring(scene, x, y, { color = 0xFFFFFF, size = 260, duration = 420, depth = 499 } = {}) {
  const r = scene.add.image(x, y, 'fx_ring').setDepth(depth).setTint(color).setBlendMode(Phaser.BlendModes.ADD)
  r.setScale(0.1)
  scene.tweens.add({ targets: r, scale: size / 128, alpha: { from: 0.9, to: 0 }, duration, ease: 'Cubic.easeOut', onComplete: () => r.destroy() })
}

/** Floating text (score popups, combo, "+1 life"). */
export function floatText(scene, x, y, str, { color = '#ffe36b', size = 44, rise = 90, duration = 900, depth = 600, display = true } = {}) {
  const txt = addText(scene, x, y, str, { size, color, display }).setDepth(depth)
  txt.setScale(0.3)
  scene.tweens.add({ targets: txt, scale: 1, duration: 260, ease: 'Back.easeOut' })
  scene.tweens.add({ targets: txt, y: y - rise, alpha: { from: 1, to: 0 }, delay: 260, duration, ease: 'Sine.easeIn', onComplete: () => txt.destroy() })
  return txt
}

/** Big centered banner ("x2 SCORE!", "LEVEL COMPLETE"...). */
export function banner(scene, str, { color = '#ffe36b', size = 72, hold = 900, y } = {}) {
  const txt = addText(scene, scene.W / 2, y ?? scene.H * 0.42, str, { size, color, display: true, maxWidth: scene.W * 0.85 }).setDepth(900)
  txt.setScale(0.2).setAlpha(0)
  scene.tweens.chain({
    targets: txt,
    tweens: [
      { scale: 1.08, alpha: 1, duration: 260, ease: 'Back.easeOut' },
      { scale: 1, duration: 120 },
      { alpha: 0, scale: 1.25, delay: hold, duration: 260, ease: 'Quad.easeIn' },
    ],
    onComplete: () => txt.destroy(),
  })
  return txt
}

/** Full-screen colour flash (success green / fail red / white). */
export function flash(scene, color = 0xFFFFFF, alpha = 0.35, duration = 260) {
  const r = rect(scene, scene.W / 2, scene.H / 2, scene.W, scene.H, color, alpha).setDepth(950).setBlendMode(Phaser.BlendModes.ADD)
  scene.tweens.add({ targets: r, alpha: 0, duration, ease: 'Quad.easeOut', onComplete: () => r.destroy() })
}

/** Ambient floating sparkles for menu backgrounds. */
export function ambientSparkles(scene, { depth = 1, tint = [0xFFFFFF, 0xFFF3B0, 0xBFE9FF], quantity = 1, frequency = 260 } = {}) {
  return scene.add.particles(0, 0, 'fx_glow', {
    x: { min: 0, max: scene.W },
    y: { min: scene.H * 0.2, max: scene.H + 20 },
    speedY: { min: -40, max: -12 },
    speedX: { min: -10, max: 10 },
    scale: { start: 0.35, end: 0 },
    alpha: { start: 0.9, end: 0, ease: 'Sine.easeIn' },
    lifespan: { min: 2500, max: 5000 },
    tint,
    blendMode: Phaser.BlendModes.ADD,
    frequency,
    quantity,
  }).setDepth(depth)
}
