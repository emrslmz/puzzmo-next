#!/usr/bin/env node
/**
 * Asset pipeline: turns the source art in `assets-src/` into the optimized,
 * runtime-ready files in `public/assets/`.
 *
 *  - Packs small images into WebP texture atlases (Phaser JSON-hash format)
 *    so the GPU can batch draws and the game loads a handful of files
 *    instead of hundreds.
 *  - Rasterizes the card item SVGs once at build time (no runtime SVG decode).
 *  - Re-encodes large backgrounds as WebP at sensible resolutions.
 *  - Converts WAV/MP3 audio to compact MP3 (requires ffmpeg on PATH).
 *
 * Usage: npm run assets
 */
import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'assets-src')
const OUT = path.join(ROOT, 'public', 'assets')
const PADDING = 2
const MAX_ATLAS = 2048

const img = (...p) => path.join(SRC, 'images', ...p)
function listDir(dir, exts) {
  return fs.readdirSync(dir)
    .filter(f => exts.some(e => f.toLowerCase().endsWith(e)))
    .sort()
    .map(f => path.join(dir, f))
}
const EXT_RE = /\.[^.]+$/
const keyOf = file => path.basename(file).replace(EXT_RE, '').toLowerCase()

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

/**
 * Loads one source into a trimmed RGBA buffer that fits inside `size`.
 * Returns the metadata needed for a trimmed atlas frame.
 */
async function prepareSprite({ key, file, size, trim = true, svgWidth }) {
  let pipeline = file.endsWith('.svg')
    ? sharp(file, { density: 300 }).resize(svgWidth ?? size, svgWidth ? null : size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    : sharp(file).resize(size, size, { fit: 'inside', withoutEnlargement: true })

  const resized = await pipeline.ensureAlpha().png().toBuffer({ resolveWithObject: true })
  const sourceW = resized.info.width
  const sourceH = resized.info.height

  if (!trim)
    return { key, buffer: resized.data, w: sourceW, h: sourceH, ox: 0, oy: 0, sourceW, sourceH }

  pipeline = sharp(resized.data)
  const { data, info } = await pipeline.trim({ threshold: 1 }).png().toBuffer({ resolveWithObject: true })
  // sharp reports the trim offsets as negative numbers.
  return {
    key,
    buffer: data,
    w: info.width,
    h: info.height,
    ox: Math.abs(info.trimOffsetLeft ?? 0),
    oy: Math.abs(info.trimOffsetTop ?? 0),
    sourceW,
    sourceH,
  }
}

/** Simple shelf packer: tallest sprites first, rows left-to-right. */
function pack(sprites) {
  const sorted = [...sprites].sort((a, b) => b.h - a.h || b.w - a.w)
  const width = Math.min(MAX_ATLAS, Math.max(256, 2 ** Math.ceil(Math.log2(Math.sqrt(sorted.reduce((s, sp) => s + (sp.w + PADDING) * (sp.h + PADDING), 0)) * 1.15))))
  let x = PADDING
  let y = PADDING
  let rowH = 0
  for (const sp of sorted) {
    if (x + sp.w + PADDING > width) {
      x = PADDING
      y += rowH + PADDING
      rowH = 0
    }
    sp.x = x
    sp.y = y
    x += sp.w + PADDING
    rowH = Math.max(rowH, sp.h)
  }
  const height = 2 ** Math.ceil(Math.log2(y + rowH + PADDING))
  if (height > MAX_ATLAS)
    throw new Error(`Atlas too large (${width}x${height}); split the group.`)
  return { width, height, sprites: sorted }
}

async function buildAtlas(name, entries, quality = 88) {
  const sprites = await Promise.all(entries.map(prepareSprite))
  const { width, height } = pack(sprites)

  const composite = sprites.map(sp => ({ input: sp.buffer, left: sp.x, top: sp.y }))
  await sharp({ create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(composite)
    .webp({ quality, alphaQuality: 90, effort: 6 })
    .toFile(path.join(OUT, 'atlas', `${name}.webp`))

  const frames = {}
  for (const sp of sprites) {
    frames[sp.key] = {
      frame: { x: sp.x, y: sp.y, w: sp.w, h: sp.h },
      rotated: false,
      trimmed: sp.w !== sp.sourceW || sp.h !== sp.sourceH,
      spriteSourceSize: { x: sp.ox, y: sp.oy, w: sp.w, h: sp.h },
      sourceSize: { w: sp.sourceW, h: sp.sourceH },
    }
  }
  const json = { frames, meta: { app: 'puzzmo-build-assets', image: `${name}.webp`, format: 'RGBA8888', size: { w: width, h: height }, scale: '1' } }
  fs.writeFileSync(path.join(OUT, 'atlas', `${name}.json`), JSON.stringify(json))
  console.log(`atlas ${name}: ${sprites.length} frames, ${width}x${height}`)
}

async function buildImage(file, outName, { width, height, quality = 82, alpha = false } = {}) {
  let pipeline = sharp(file)
  if (width || height)
    pipeline = pipeline.resize(width, height, { fit: 'inside', withoutEnlargement: true })
  pipeline = alpha ? pipeline.webp({ quality, alphaQuality: 90, effort: 6 }) : pipeline.removeAlpha().webp({ quality, effort: 6 })
  await pipeline.toFile(path.join(OUT, 'img', `${outName}.webp`))
}

function hasFfmpeg() {
  return spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0
}

function buildAudio() {
  if (!hasFfmpeg()) {
    console.warn('ffmpeg not found: skipping audio conversion')
    return
  }
  const music = new Set(['game_theme1', 'game_theme2', 'carton_game_song_2'])
  const rename = { popSound: 'pop' }
  for (const file of listDir(path.join(SRC, 'sounds'), ['.wav', '.mp3'])) {
    const base = path.basename(file).replace(EXT_RE, '')
    const name = rename[base] ?? base
    const isMusic = music.has(base)
    const args = ['-y', '-loglevel', 'error', '-i', file, '-map_metadata', '-1', '-vn']
    if (isMusic)
      args.push('-ac', '2', '-ar', '44100', '-b:a', '128k')
    else
      // Short effects: mono with trailing silence trimmed.
      args.push('-ac', '1', '-ar', '44100', '-b:a', '96k', '-af', 'silenceremove=stop_periods=-1:stop_duration=0.15:stop_threshold=-55dB')
    args.push(path.join(OUT, 'audio', `${name}.mp3`))
    execFileSync('ffmpeg', args)
  }
  console.log('audio converted')
}

async function main() {
  for (const dir of ['atlas', 'img', 'audio', 'fonts'])
    ensureDir(path.join(OUT, dir))

  // --- Atlases -------------------------------------------------------------
  const ui = [
    ...listDir(img('icons'), ['.png']).map(file => ({ key: `icon_${keyOf(file)}`, file, size: 160 })),
    ...listDir(img('badge'), ['.png']).map(file => ({ key: keyOf(file), file, size: 144 })),
    ...listDir(img('powerups'), ['.png']).map(file => ({ key: `pu_${keyOf(file)}`, file, size: 192 })),
    ...listDir(img('flags'), ['.svg']).map(file => ({ key: `flag_${keyOf(file).replace('flag', '')}`, file, size: 96, svgWidth: 96, trim: false })),
  ]
  await buildAtlas('ui', ui)

  const art = [
    ...listDir(img('mascots'), ['.png']).map(file => ({ key: `mascot_${keyOf(file)}`, file, size: 224 })),
    ...listDir(img('cards'), ['.png']).map(file => ({ key: `skin_${keyOf(file).replace('_card', '')}`, file, size: 256, trim: false })),
    ...listDir(img('coin-packages'), ['.png']).map(file => ({ key: keyOf(file), file, size: 256 })),
  ]
  await buildAtlas('art', art)

  const islands = listDir(img('island'), ['.png']).map(file => ({ key: `island_${keyOf(file).replace('_island', '')}`, file, size: 256 }))
  await buildAtlas('islands', islands)

  const items = listDir(img('card_item'), ['.svg']).map(file => ({ key: keyOf(file), file, size: 176, trim: false }))
  await buildAtlas('items', items, 90)

  // --- Large images ----------------------------------------------------------
  const bg = (name, opts) => buildImage(img('backgrounds', `${name}`), keyOf(name), opts)
  await bg('spring_bg.jpg', { width: 1408 })
  await bg('endless_game_side_spring.jpg', { width: 1408 })
  await bg('endless_game_bg_wood.jpg', { width: 1408 })
  await bg('cardboard_background.jpg', { width: 1408 })
  await bg('wooden_background.jpg', { width: 1408 })
  await bg('shop_bg.jpg', { width: 1408 })
  await bg('inventory_bg.jpg', { width: 1408 })
  await bg('map_full.png', { width: 2400, quality: 78 })
  await buildImage(img('backgrounds', 'waternormals.jpg'), 'waternormals', { width: 512, quality: 90 })
  for (const file of listDir(img('island_backgrounds'), ['.jpg']))
    await buildImage(file, `isle_${keyOf(file)}`, { width: 896, quality: 84 })
  for (const file of listDir(img('level-cards'), ['.jpg']))
    await buildImage(file, keyOf(file), { width: 512, quality: 84 })
  await buildImage(img('logo', 'puzzmo_logo_3.png'), 'logo', { width: 960, alpha: true, quality: 90 })
  await buildImage(img('effects', 'screen-crack.png'), 'screen_crack', { width: 1024, alpha: true, quality: 80 })

  // --- Favicons -------------------------------------------------------------------
  const icon = path.join(SRC, 'icons', 'puzzmo_favicon_v3.png')
  await sharp(icon).resize(64, 64).png({ compressionLevel: 9, palette: true }).toFile(path.join(ROOT, 'public', 'favicon.png'))
  await sharp(icon).resize(180, 180).flatten({ background: '#0b1a3a' }).png({ compressionLevel: 9 }).toFile(path.join(ROOT, 'public', 'apple-touch-icon.png'))

  // --- Fonts & audio -------------------------------------------------------------
  for (const font of ['LilitaOne-Regular.ttf', 'LuckiestGuy-Regular.ttf'])
    fs.copyFileSync(path.join(SRC, 'fonts', font), path.join(OUT, 'fonts', font))
  buildAudio()

  console.log('done')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
