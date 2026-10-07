import Phaser from 'phaser'
import { audio } from '@/core/audio'
import { OCEAN_FRAG, SPRING_COUNT, WATER_FRAG } from './shaders'

const TENSION = 0.028
const DAMPING = 0.022
const SPREAD = 0.24
const STEP = 1 / 60

function isWebGL(scene) {
  return scene.sys.renderer.type === Phaser.WEBGL
}

function coverRect(scene, key, w, h, focusX = 0.5, focusY = 0.5) {
  const src = scene.textures.get(key).getSourceImage()
  const iw = src.width
  const ih = src.height
  const s = Math.max(w / iw, h / ih)
  const sw = w / s / iw
  const sh = h / s / ih
  // Texture v runs bottom-up in Phaser 4 shaders.
  const ox = (1 - sw) * focusX
  const oy = (1 - sh) * (1 - focusY)
  return [ox, oy, sw, sh]
}

/**
 * A body of water rising over a backdrop, rendered by one fragment shader.
 *
 * The free surface is a 1D chain of damped springs (classic "2D water"
 * technique): splashes inject velocity, waves travel sideways and settle.
 * The level itself eases with a slightly under-damped spring so it sloshes
 * when it jumps. Bubbles, floating props and the surface queries used by
 * gameplay all read the same simulated surface.
 */
export class Water {
  constructor(scene, { x, y, w, h, backdrop, focusX = 0.5, focusY = 0.5, level = 0.1, deep = [0.02, 0.2, 0.34], shallow = [0.12, 0.55, 0.68], depth = 0, bubbles = true, quality = 'high' }) {
    this.scene = scene
    this.backdrop = backdrop
    this.focusX = focusX
    this.focusY = focusY
    this.level = level
    this.target = level
    this.levelVel = 0
    this.freeze = 0
    this.wave = 1
    this.time = 0
    this.acc = 0
    this.h = new Float32Array(SPRING_COUNT)
    this.v = new Float32Array(SPRING_COUNT)
    this.left = new Float32Array(SPRING_COUNT)
    this.right = new Float32Array(SPRING_COUNT)
    this.floaters = []
    this.quality = quality

    scene.textures.get('waternormals').setWrap(Phaser.Textures.WrapMode.REPEAT)

    if (isWebGL(scene)) {
      this.shader = scene.add.shader({
        name: 'water',
        fragmentSource: WATER_FRAG,
        initialUniforms: { iChannel0: 0, iChannel1: 1 },
        setupUniforms: (set) => {
          set('uTime', this.time)
          set('uLevel', this.level)
          set('uSprings[0]', this.h)
          set('uFreeze', this.freeze)
          set('uAspect', this.w / this.hgt)
          set('uPx', 1 / Math.max(1, this.hgt * this.scene.cameras.main.zoom))
          set('uWave', this.wave * (1 - this.freeze))
          set('uBgRect', this.bgRect)
          set('uDeep', deep)
          set('uShallow', shallow)
        },
      }, 0, 0, w, h, [backdrop, 'waternormals']).setDepth(depth)
    }
    else {
      // Canvas fallback: plain backdrop + translucent water rectangle.
      this.fallbackBg = scene.add.image(0, 0, backdrop).setDepth(depth)
      this.fallbackWater = scene.add.image(0, 0, 'fx_px').setTint(0x1E88C8).setAlpha(0.6).setDepth(depth)
    }

    if (bubbles)
      this.createBubbles(depth + 1)
    this.layout(x, y, w, h)
  }

  layout(x, y, w, h) {
    this.x = x
    this.y = y
    this.w = w
    this.hgt = h
    this.bgRect = coverRect(this.scene, this.backdrop, w, h, this.focusX, this.focusY)
    if (this.shader) {
      this.shader.setSize(w, h)
      this.shader.setOrigin(0, 0)
      this.shader.setPosition(x, y)
    }
    if (this.fallbackBg) {
      const img = this.fallbackBg
      const s = Math.max(w / img.width, h / img.height)
      img.setScale(s).setPosition(x + w / 2, y + h / 2)
      img.setCrop((img.width - w / s) / 2, (img.height - h / s) / 2, w / s, h / s)
    }
    if (this.bubbles) {
      this.bubbles.setEmitZone({ type: 'random', source: new Phaser.Geom.Rectangle(x + 10, y + h - 6, w - 20, 4) })
    }
  }

  createBubbles(depth) {
    const deathSource = { contains: (px, py) => py < this.surfaceY(px) + 6 || py > this.y + this.hgt + 10 }
    this.bubbles = this.scene.add.particles(0, 0, 'fx_bubble', {
      speedY: { min: -170, max: -70 },
      speedX: { min: -12, max: 12 },
      accelerationX: { min: -30, max: 30 },
      scale: { min: 0.18, max: 0.55 },
      alpha: { start: 0.9, end: 0.55 },
      lifespan: 9000,
      frequency: this.quality === 'low' ? 360 : 150,
      deathZone: { type: 'onEnter', source: deathSource },
    }).setDepth(depth)
  }

  // --- Surface queries ------------------------------------------------------
  /** Spring displacement at normalized x (0..1). */
  springAt(nx) {
    const fx = Phaser.Math.Clamp(nx, 0, 1) * (SPRING_COUNT - 1)
    const i0 = Math.floor(fx)
    const i1 = Math.min(SPRING_COUNT - 1, i0 + 1)
    const f = fx - i0
    const s = f * f * (3 - 2 * f)
    return this.h[i0] * (1 - s) + this.h[i1] * s
  }

  /** Surface height (0..1 from the bottom) at normalized x; mirrors the shader. */
  surfaceAt(nx) {
    const t = this.time
    const a = this.w / this.hgt
    const w = Math.sin(nx * 11 * a + t * 1.6) * 0.0045 + Math.sin(nx * 23 * a - t * 2.3) * 0.0025 + Math.sin(nx * 4 * a + t * 0.7) * 0.0035
    return this.level + this.springAt(nx) + w * this.wave * (1 - this.freeze)
  }

  /** World Y of the surface at world X. */
  surfaceY(worldX) {
    const nx = (worldX - this.x) / this.w
    return this.y + this.hgt * (1 - this.surfaceAt(nx))
  }

  /** Surface slope (for tilting floating props). */
  surfaceAngle(worldX) {
    const d = 6
    return Math.atan2(this.surfaceY(worldX + d) - this.surfaceY(worldX - d), d * 2)
  }

  // --- Control ------------------------------------------------------------------
  setLevel(target) {
    this.target = Phaser.Math.Clamp(target, 0, 1.05)
  }

  /** Disturb the surface. `nx` normalized x, `strength` ~0.5..2. */
  splash(nx = Math.random(), strength = 1, { sound = true, droplets = true } = {}) {
    if (this.freeze > 0.5)
      return
    const i = Math.round(Phaser.Math.Clamp(nx, 0, 1) * (SPRING_COUNT - 1))
    const impulse = -0.012 * strength
    for (let k = -2; k <= 2; k++) {
      const j = i + k
      if (j >= 0 && j < SPRING_COUNT)
        this.v[j] += impulse * (1 - Math.abs(k) * 0.3)
    }
    if (droplets)
      this.spray(this.x + nx * this.w, strength)
    if (sound)
      audio.splash(strength)
  }

  /** Droplets thrown up from the surface. */
  spray(worldX, strength = 1) {
    const sy = this.surfaceY(worldX)
    const count = Math.round(8 + strength * 10)
    const p = this.scene.add.particles(worldX, sy, 'fx_drop', {
      speed: { min: 160 * strength, max: 380 * strength },
      angle: { min: 235, max: 305 },
      gravityY: 900,
      scale: { start: 0.55, end: 0.25 },
      alpha: { start: 0.95, end: 0.3 },
      rotate: { onEmit: () => 0, onUpdate: particle => Phaser.Math.RadToDeg(Math.atan2(particle.velocityY, particle.velocityX)) + 90 },
      lifespan: 900,
      emitting: false,
      deathZone: { type: 'onEnter', source: { contains: (px, py) => py > 0 && sy + py > this.surfaceY(worldX + px) + 4 } },
    }).setDepth((this.shader?.depth ?? 0) + 3)
    p.explode(count)
    this.scene.time.delayedCall(1000, () => p.destroy())
  }

  /** Freeze (ice) on/off with a smooth transition. */
  setFrozen(frozen) {
    this.scene.tweens.add({ targets: this, freeze: frozen ? 1 : 0, duration: frozen ? 700 : 900, ease: 'Sine.easeInOut' })
    if (this.bubbles) {
      if (frozen)
        this.bubbles.stop()
      else
        this.bubbles.start()
    }
  }

  /**
   * Keeps a game object floating on the surface (bobbing + tilting).
   * `offsetY` lifts it so it sits *in* the water, not on top.
   */
  addFloater(obj, { offsetY = 0, drift = 0, minX, maxX } = {}) {
    this.floaters.push({ obj, offsetY, drift, dir: 1, minX, maxX })
  }

  update(delta) {
    const dt = Math.min(delta, 50) / 1000
    this.time += dt
    this.acc += dt
    let steps = 0
    while (this.acc >= STEP && steps < 4) {
      this.acc -= STEP
      steps++
      this.step()
    }

    // Level: under-damped spring towards the target (gentle sloshing).
    const k = 22
    const c = 8.5
    const a = (this.target - this.level) * k - this.levelVel * c
    this.levelVel += a * dt
    this.level += this.levelVel * dt

    for (const f of this.floaters) {
      const o = f.obj
      if (!o.active)
        continue
      if (f.drift) {
        o.x += f.drift * f.dir * dt
        if (o.x > (f.maxX ?? this.x + this.w - 40))
          f.dir = -1
        if (o.x < (f.minX ?? this.x + 40))
          f.dir = 1
        if (o.setFlipX)
          o.setFlipX(f.dir < 0)
      }
      const targetY = this.surfaceY(o.x) + f.offsetY
      o.y += (targetY - o.y) * Math.min(1, dt * 12)
      o.rotation += (this.surfaceAngle(o.x) * 0.8 - o.rotation) * Math.min(1, dt * 6)
    }

    if (this.fallbackWater) {
      const top = this.y + this.hgt * (1 - this.level)
      this.fallbackWater.setPosition(this.x + this.w / 2, (top + this.y + this.hgt) / 2).setDisplaySize(this.w, Math.max(1, this.y + this.hgt - top))
    }
  }

  step() {
    const n = SPRING_COUNT
    const damp = DAMPING + this.freeze * 0.2
    for (let i = 0; i < n; i++) {
      const acc = -TENSION * this.h[i] - damp * this.v[i]
      this.v[i] += acc
      this.h[i] += this.v[i]
      if (this.freeze > 0)
        this.h[i] *= 1 - this.freeze * 0.08
    }
    for (let pass = 0; pass < 4; pass++) {
      for (let i = 0; i < n; i++) {
        if (i > 0) {
          this.left[i] = SPREAD * (this.h[i] - this.h[i - 1])
          this.v[i - 1] += this.left[i]
        }
        if (i < n - 1) {
          this.right[i] = SPREAD * (this.h[i] - this.h[i + 1])
          this.v[i + 1] += this.right[i]
        }
      }
      for (let i = 0; i < n; i++) {
        if (i > 0)
          this.h[i - 1] += this.left[i]
        if (i < n - 1)
          this.h[i + 1] += this.right[i]
      }
    }
  }

  destroy() {
    this.shader?.destroy()
    this.bubbles?.destroy()
    this.fallbackBg?.destroy()
    this.fallbackWater?.destroy()
    this.floaters.length = 0
  }
}

/** Animated sea used as the map backdrop. */
export function addOcean(scene, x, y, w, h, depth = 0) {
  scene.textures.get('waternormals').setWrap(Phaser.Textures.WrapMode.REPEAT)
  if (!isWebGL(scene)) {
    const img = scene.add.image(x + w / 2, y + h / 2, 'map_full').setDepth(depth)
    img.setScale(Math.max(w / img.width, h / img.height))
    return img
  }
  const state = { time: 0, rect: coverRect(scene, 'map_full', w, h) }
  const shader = scene.add.shader({
    name: 'ocean',
    fragmentSource: OCEAN_FRAG,
    initialUniforms: { iChannel0: 0, iChannel1: 1 },
    setupUniforms: (set) => {
      set('uTime', state.time)
      set('uBgRect', state.rect)
      set('uAspect', w / h)
    },
  }, x + w / 2, y + h / 2, w, h, ['map_full', 'waternormals']).setDepth(depth)
  const tick = (_t, delta) => {
    state.time += delta / 1000
  }
  scene.events.on('update', tick)
  scene.events.once('shutdown', () => scene.events.off('update', tick))
  return shader
}
