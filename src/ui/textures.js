import { PALETTE } from './theme'

/** Pixels per design unit for generated UI textures (crisp up to ~2.5x zoom). */
export const TEX_SCALE = 2

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2))
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

function makeCanvas(scene, key, w, h, draw) {
  if (scene.textures.exists(key))
    return key
  const W = Math.max(2, Math.ceil(w))
  const H = Math.max(2, Math.ceil(h))
  const tex = scene.textures.createCanvas(key, W, H)
  const ctx = tex.getContext()
  draw(ctx, W, H)
  tex.refresh()
  return key
}

/**
 * Glossy casual-game button with a 3D lip. Sized in design units.
 */
export function buttonTexture(scene, w, h, color = 'yellow', radius) {
  const key = `btn_${color}_${Math.round(w)}x${Math.round(h)}_${radius ?? 'a'}`
  const [top, bottom, lip, outline] = PALETTE[color] ?? PALETTE.yellow
  return makeCanvas(scene, key, w * TEX_SCALE, h * TEX_SCALE, (ctx, W, H) => {
    const s = TEX_SCALE
    const lipH = Math.max(5, Math.min(12, h * 0.1)) * s
    const r = (radius ?? Math.min(h * 0.32, 30)) * s
    const border = 3 * s

    // Lip (the button's "thickness")
    roundRect(ctx, 0, lipH, W, H - lipH, r)
    ctx.fillStyle = outline
    ctx.fill()
    roundRect(ctx, border, lipH + border, W - border * 2, H - lipH - border * 2, r - border)
    ctx.fillStyle = lip
    ctx.fill()

    // Face
    roundRect(ctx, 0, 0, W, H - lipH, r)
    ctx.fillStyle = outline
    ctx.fill()
    const grad = ctx.createLinearGradient(0, 0, 0, H - lipH)
    grad.addColorStop(0, top)
    grad.addColorStop(1, bottom)
    roundRect(ctx, border, border, W - border * 2, H - lipH - border * 2, r - border)
    ctx.fillStyle = grad
    ctx.fill()

    // Gloss
    const glossH = (H - lipH) * 0.46
    const gloss = ctx.createLinearGradient(0, border, 0, glossH)
    gloss.addColorStop(0, 'rgba(255,255,255,0.55)')
    gloss.addColorStop(1, 'rgba(255,255,255,0.05)')
    roundRect(ctx, border * 2.4, border * 1.8, W - border * 4.8, glossH, Math.max(2, r - border * 2))
    ctx.fillStyle = gloss
    ctx.fill()

    // Bottom inner shade
    const shade = ctx.createLinearGradient(0, (H - lipH) * 0.6, 0, H - lipH)
    shade.addColorStop(0, 'rgba(0,0,0,0)')
    shade.addColorStop(1, 'rgba(0,0,0,0.16)')
    roundRect(ctx, border, border, W - border * 2, H - lipH - border * 2, r - border)
    ctx.fillStyle = shade
    ctx.fill()
  })
}

/**
 * Panels: 'cream' (paper card), 'glass' (dark translucent), 'sky' (light blue).
 */
export function panelTexture(scene, w, h, style = 'cream', radius = 28) {
  const key = `panel_${style}_${Math.round(w)}x${Math.round(h)}_${radius}`
  return makeCanvas(scene, key, w * TEX_SCALE, h * TEX_SCALE, (ctx, W, H) => {
    const s = TEX_SCALE
    const r = radius * s
    if (style === 'glass') {
      roundRect(ctx, 0, 0, W, H, r)
      const g = ctx.createLinearGradient(0, 0, 0, H)
      g.addColorStop(0, 'rgba(28,58,128,0.86)')
      g.addColorStop(1, 'rgba(10,24,62,0.92)')
      ctx.fillStyle = g
      ctx.fill()
      ctx.lineWidth = 3 * s
      ctx.strokeStyle = 'rgba(160,205,255,0.55)'
      roundRect(ctx, 1.5 * s, 1.5 * s, W - 3 * s, H - 3 * s, r - 1.5 * s)
      ctx.stroke()
      const gloss = ctx.createLinearGradient(0, 0, 0, H * 0.35)
      gloss.addColorStop(0, 'rgba(255,255,255,0.14)')
      gloss.addColorStop(1, 'rgba(255,255,255,0)')
      roundRect(ctx, 4 * s, 4 * s, W - 8 * s, H * 0.35, r - 4 * s)
      ctx.fillStyle = gloss
      ctx.fill()
      return
    }
    const palettes = {
      cream: { border: '#8a4a12', inner: '#fff9ea', outer: '#ffe2a8', line: 'rgba(255,255,255,0.9)' },
      sky: { border: '#1a4fa8', inner: '#f2f9ff', outer: '#bfe2ff', line: 'rgba(255,255,255,0.9)' },
      wood: { border: '#4a2508', inner: '#c8823f', outer: '#8f4f1c', line: 'rgba(255,220,170,0.5)' },
    }
    const p = palettes[style] ?? palettes.cream
    const border = 6 * s
    roundRect(ctx, 0, 0, W, H, r)
    ctx.fillStyle = p.border
    ctx.fill()
    const g = ctx.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, p.inner)
    g.addColorStop(1, p.outer)
    roundRect(ctx, border, border, W - border * 2, H - border * 2, r - border)
    ctx.fillStyle = g
    ctx.fill()
    ctx.lineWidth = 2.5 * s
    ctx.strokeStyle = p.line
    roundRect(ctx, border + 4 * s, border + 4 * s, W - (border + 4 * s) * 2, H - (border + 4 * s) * 2, r - border - 4 * s)
    ctx.stroke()
  })
}

/** Simple rounded "pill" for counters and chips. */
export function pillTexture(scene, w, h, fill = 'rgba(12,28,70,0.78)', stroke = 'rgba(255,255,255,0.35)') {
  const key = `pill_${Math.round(w)}x${Math.round(h)}_${fill}_${stroke}`
  return makeCanvas(scene, key, w * TEX_SCALE, h * TEX_SCALE, (ctx, W, H) => {
    const s = TEX_SCALE
    roundRect(ctx, 1.5 * s, 1.5 * s, W - 3 * s, H - 3 * s, H / 2)
    ctx.fillStyle = fill
    ctx.fill()
    ctx.lineWidth = 3 * s
    ctx.strokeStyle = stroke
    ctx.stroke()
  })
}

/** Card face (front, white with a coloured frame) at a fixed design size. */
export function cardFrontTexture(scene, w, h) {
  const key = `card_front_${w}x${h}`
  return makeCanvas(scene, key, w * TEX_SCALE, h * TEX_SCALE, (ctx, W, H) => {
    const s = TEX_SCALE
    const r = 18 * s
    roundRect(ctx, 0, 0, W, H, r)
    ctx.fillStyle = '#3a7bd5'
    ctx.fill()
    const g = ctx.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, '#ffffff')
    g.addColorStop(1, '#e6f0ff')
    roundRect(ctx, 5 * s, 5 * s, W - 10 * s, H - 10 * s, r - 5 * s)
    ctx.fillStyle = g
    ctx.fill()
    const radial = ctx.createRadialGradient(W / 2, H * 0.45, 4, W / 2, H * 0.45, W * 0.6)
    radial.addColorStop(0, 'rgba(255,240,180,0.55)')
    radial.addColorStop(1, 'rgba(255,240,180,0)')
    ctx.fillStyle = radial
    roundRect(ctx, 5 * s, 5 * s, W - 10 * s, H - 10 * s, r - 5 * s)
    ctx.fill()
  })
}

/** Soft drop shadow for cards / panels. */
export function shadowTexture(scene, w, h, radius = 18) {
  const key = `shadow_${w}x${h}_${radius}`
  const pad = 24
  return makeCanvas(scene, key, (w + pad * 2) * TEX_SCALE / 2, (h + pad * 2) * TEX_SCALE / 2, (ctx) => {
    const k = TEX_SCALE / 2
    ctx.filter = `blur(${10 * k}px)`
    roundRect(ctx, pad * k, pad * k, w * k, h * k, radius * k)
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.fill()
    ctx.filter = 'none'
  })
}

/** Tiny shared textures used by particles and effects. */
export function createFxTextures(scene) {
  makeCanvas(scene, 'fx_px', 4, 4, (ctx, W, H) => {
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, W, H)
  })
  makeCanvas(scene, 'fx_circle', 128, 128, (ctx, W) => {
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(W / 2, W / 2, W / 2 - 1, 0, Math.PI * 2)
    ctx.fill()
  })
  makeCanvas(scene, 'fx_glow', 64, 64, (ctx, W) => {
    const g = ctx.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.35, 'rgba(255,255,255,0.55)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, W)
  })
  makeCanvas(scene, 'fx_spark', 64, 64, (ctx, W) => {
    const c = W / 2
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2
      const r = i % 2 === 0 ? c : c * 0.28
      ctx.lineTo(c + Math.cos(a) * r, c + Math.sin(a) * r)
    }
    ctx.closePath()
    ctx.fill()
    const g = ctx.createRadialGradient(c, c, 0, c, c, c * 0.5)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, W)
  })
  makeCanvas(scene, 'fx_bubble', 48, 48, (ctx, W) => {
    const c = W / 2
    const g = ctx.createRadialGradient(c * 0.8, c * 0.75, c * 0.1, c, c, c * 0.95)
    g.addColorStop(0, 'rgba(255,255,255,0.10)')
    g.addColorStop(0.75, 'rgba(200,240,255,0.18)')
    g.addColorStop(0.92, 'rgba(230,250,255,0.85)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(c, c, c * 0.96, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.95)'
    ctx.beginPath()
    ctx.ellipse(c * 0.68, c * 0.6, c * 0.2, c * 0.13, -0.6, 0, Math.PI * 2)
    ctx.fill()
  })
  makeCanvas(scene, 'fx_drop', 32, 44, (ctx, W, H) => {
    const g = ctx.createLinearGradient(0, 0, W, H)
    g.addColorStop(0, 'rgba(225,250,255,0.95)')
    g.addColorStop(1, 'rgba(60,170,230,0.85)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(W / 2, 0)
    ctx.bezierCurveTo(W * 0.95, H * 0.45, W, H * 0.62, W / 2, H)
    ctx.bezierCurveTo(0, H * 0.62, W * 0.05, H * 0.45, W / 2, 0)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.beginPath()
    ctx.ellipse(W * 0.38, H * 0.62, W * 0.1, H * 0.12, 0.3, 0, Math.PI * 2)
    ctx.fill()
  })
  makeCanvas(scene, 'fx_confetti', 14, 22, (ctx, W, H) => {
    ctx.fillStyle = '#fff'
    roundRect(ctx, 0, 0, W, H, 3)
    ctx.fill()
  })
  makeCanvas(scene, 'fx_ring', 128, 128, (ctx, W) => {
    const c = W / 2
    ctx.lineWidth = 10
    ctx.strokeStyle = '#fff'
    ctx.beginPath()
    ctx.arc(c, c, c - 8, 0, Math.PI * 2)
    ctx.stroke()
  })
  makeCanvas(scene, 'fx_snow', 32, 32, (ctx, W) => {
    const c = W / 2
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI
      ctx.beginPath()
      ctx.moveTo(c - Math.cos(a) * c * 0.9, c - Math.sin(a) * c * 0.9)
      ctx.lineTo(c + Math.cos(a) * c * 0.9, c + Math.sin(a) * c * 0.9)
      ctx.stroke()
    }
  })
  makeCanvas(scene, 'fx_vignette', 256, 256, (ctx, W) => {
    const c = W / 2
    const g = ctx.createRadialGradient(c, c, c * 0.45, c, c, c * 1.05)
    g.addColorStop(0, 'rgba(255,255,255,0)')
    g.addColorStop(1, 'rgba(255,255,255,1)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, W)
  })
  makeCanvas(scene, 'fx_ray', 64, 256, (ctx, W, H) => {
    const g = ctx.createLinearGradient(0, 0, W, 0)
    g.addColorStop(0, 'rgba(255,255,255,0)')
    g.addColorStop(0.5, 'rgba(255,255,255,1)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
    const fade = ctx.createLinearGradient(0, 0, 0, H)
    fade.addColorStop(0, 'rgba(0,0,0,0)')
    fade.addColorStop(1, 'rgba(0,0,0,1)')
    ctx.globalCompositeOperation = 'destination-out'
    ctx.fillStyle = fade
    ctx.fillRect(0, 0, W, H)
  })
}

/** Rounded frame with a transparent hole (drawn over cropped artwork). */
export function frameTexture(scene, w, h, { radius = 30, border = 10, color = '#ffffff', inner = '#ffd34d' } = {}) {
  const key = `frame_${Math.round(w)}x${Math.round(h)}_${radius}_${border}_${color}_${inner}`
  return makeCanvas(scene, key, w * TEX_SCALE, h * TEX_SCALE, (ctx, W, H) => {
    const s = TEX_SCALE
    roundRect(ctx, 0, 0, W, H, radius * s)
    ctx.fillStyle = color
    ctx.fill()
    roundRect(ctx, border * 0.45 * s, border * 0.45 * s, W - border * 0.9 * s, H - border * 0.9 * s, (radius - border * 0.45) * s)
    ctx.fillStyle = inner
    ctx.fill()
    ctx.globalCompositeOperation = 'destination-out'
    roundRect(ctx, border * s, border * s, W - border * 2 * s, H - border * 2 * s, (radius - border) * s)
    ctx.fill()
    ctx.globalCompositeOperation = 'source-over'
  })
}

/** Vertical gradient plate (e.g. darkening under card titles). */
export function gradientTexture(scene, w, h, from = 'rgba(8,20,55,0)', to = 'rgba(8,20,55,0.92)') {
  const key = `grad_${Math.round(w)}x${Math.round(h)}_${from}_${to}`
  return makeCanvas(scene, key, Math.max(4, w / 4), h, (ctx, W, H) => {
    const g = ctx.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, from)
    g.addColorStop(1, to)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
  })
}

/** Empty board slot: translucent rounded rect with a dashed outline. */
export function slotTexture(scene, w, h, radius = 18) {
  const key = `slot_${Math.round(w)}x${Math.round(h)}_${radius}`
  return makeCanvas(scene, key, w * TEX_SCALE, h * TEX_SCALE, (ctx, W, H) => {
    const s = TEX_SCALE
    roundRect(ctx, 3 * s, 3 * s, W - 6 * s, H - 6 * s, radius * s)
    ctx.fillStyle = 'rgba(8,24,60,0.18)'
    ctx.fill()
    ctx.setLineDash([10 * s, 8 * s])
    ctx.lineWidth = 3 * s
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'
    ctx.stroke()
  })
}
