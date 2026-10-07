import { state } from './state'

/**
 * Logical design space. Every scene lays itself out in "design units":
 * the shorter side always maps to at least 1280x720 and the extra space on
 * wider (20:9, 21:9) or taller (4:3, 16:10) screens is revealed rather than
 * letterboxed. The camera zoom converts design units to canvas pixels.
 */
export const DESIGN_W = 1280
export const DESIGN_H = 720

// Upper bound for the canvas backing store. Keeps fill-rate sane on tablets.
const PIXEL_BUDGET_HIGH = 3_600_000
const PIXEL_BUDGET_LOW = 1_600_000

export function cssSize() {
  return {
    width: Math.max(1, Math.round(window.innerWidth)),
    height: Math.max(1, Math.round(window.innerHeight)),
  }
}

/**
 * 'high' | 'low'. "auto" picks low on weak devices (little RAM / few cores).
 */
export function qualityLevel(mode = state.settings.performanceMode) {
  if (mode === 'high' || mode === 'low')
    return mode
  const memory = navigator.deviceMemory ?? 4
  const cores = navigator.hardwareConcurrency ?? 4
  return memory <= 2 || cores <= 2 ? 'low' : 'high'
}

/** Canvas pixels per CSS pixel (sharp on retina, bounded for performance). */
export function renderScale(quality = qualityLevel()) {
  const { width, height } = cssSize()
  const dpr = window.devicePixelRatio || 1
  const low = quality === 'low'
  const maxScale = low ? 1.5 : 2.5
  const budget = low ? PIXEL_BUDGET_LOW : PIXEL_BUDGET_HIGH
  const budgetScale = Math.sqrt(budget / (width * height))
  return Math.max(1, Math.min(dpr, maxScale, budgetScale))
}

/** Safe-area insets (notches, rounded corners, home indicator) in CSS px. */
export function safeAreaInsets() {
  const probe = document.getElementById('safe-area-probe')
  if (!probe)
    return { top: 0, right: 0, bottom: 0, left: 0 }
  const cs = getComputedStyle(probe)
  return {
    top: Number.parseFloat(cs.paddingTop) || 0,
    right: Number.parseFloat(cs.paddingRight) || 0,
    bottom: Number.parseFloat(cs.paddingBottom) || 0,
    left: Number.parseFloat(cs.paddingLeft) || 0,
  }
}

/**
 * Computes the layout metrics for a canvas of `width` x `height` pixels.
 * `zoom` is canvas px per design unit; `w`/`h` the visible design size;
 * `safe` the insets converted to design units.
 */
export function computeLayout(width, height, rs) {
  const zoom = Math.min(width / DESIGN_W, height / DESIGN_H)
  const w = width / zoom
  const h = height / zoom
  const insets = safeAreaInsets()
  const k = rs / zoom
  const safe = {
    left: Math.max(insets.left * k, 0),
    right: Math.max(insets.right * k, 0),
    top: Math.max(insets.top * k, 0),
    bottom: Math.max(insets.bottom * k, 0),
  }
  return { zoom, w, h, safe, rs }
}
