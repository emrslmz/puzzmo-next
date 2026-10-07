import Phaser from 'phaser'
import { audio } from '@/core/audio'
import { bus } from '@/core/bus'
import { formatNumber, t } from '@/core/i18n'
import { state } from '@/core/state'
import { getPowerUp } from '@/data/catalog'
import { addText, disc, fitText, makePressable, Toggle } from '@/ui/components'
import { pillTexture } from '@/ui/textures'

export function shuffle(list) {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Up to `limit` pairs of identical, unmatched cards. */
export function findPairs(cards, limit = Infinity) {
  const groups = new Map()
  for (const c of cards) {
    if (c.matched)
      continue
    if (!groups.has(c.type))
      groups.set(c.type, [])
    groups.get(c.type).push(c)
  }
  const pairs = []
  for (const group of shuffle([...groups.values()])) {
    for (let i = 0; i + 1 < group.length && pairs.length < limit; i += 2)
      pairs.push([group[i], group[i + 1]])
  }
  return pairs
}

/** Icon + value pill used in game headers. */
export class StatChip extends Phaser.GameObjects.Container {
  constructor(scene, x, y, { icon, atlas = 'ui', value = '', w = 190, h = 62, label } = {}) {
    super(scene, x, y)
    this.w = w
    this.bg = scene.add.image(0, 0, pillTexture(scene, w, h)).setDisplaySize(w, h)
    this.icon = scene.add.image(-w / 2 + h * 0.45, 0, atlas, icon)
    this.icon.setScale((h * 1.0) / Math.max(this.icon.width, this.icon.height))
    this.text = addText(scene, h * 0.3, label ? -h * 0.1 : 0, String(value), { size: Math.round(h * 0.48), maxWidth: w - h * 1.2 })
    this.add([this.bg, this.icon, this.text])
    if (label) {
      this.label = addText(scene, h * 0.3, h * 0.27, label, { size: Math.round(h * 0.24), color: '#bfe2ff', maxWidth: w - h * 1.2, strokeThickness: 2 })
      this.add(this.label)
    }
    scene.add.existing(this)
  }

  setValue(v, bump = true) {
    this.text.setText(String(v))
    fitText(this.text, this.w - this.bg.displayHeight * 1.2, Number.parseInt(this.text.style.fontSize))
    if (bump) {
      this.scene.tweens.killTweensOf(this.icon)
      const s = this.icon.getData('s') ?? this.icon.scale
      this.icon.setData('s', s)
      this.icon.setScale(s)
      this.scene.tweens.add({ targets: this.icon, scale: s * 1.3, duration: 110, yoyo: true, ease: 'Quad.easeOut' })
    }
  }
}

/**
 * Vertical power-up tray. Empty slots offer a quick coin purchase.
 */
export class PowerUpBar extends Phaser.GameObjects.Container {
  constructor(scene, x, y, ids, { size = 96, onUse } = {}) {
    super(scene, x, y)
    this.ids = ids
    this.size = size
    this.onUse = onUse
    this.slots = new Map()
    const gap = size * 0.12
    const total = ids.length * size + (ids.length - 1) * gap
    ids.forEach((id, i) => {
      const sy = -total / 2 + size / 2 + i * (size + gap)
      this.slots.set(id, this.createSlot(id, 0, sy))
    })
    this.backing = scene.add.image(0, 0, pillTexture(scene, size + 24, total + 24, 'rgba(10,24,62,0.55)', 'rgba(255,255,255,0.25)')).setDisplaySize(size + 24, total + 24)
    this.addAt(this.backing, 0)
    scene.add.existing(this)
    this._onInv = () => this.refresh()
    bus.on('state:inventory', this._onInv)
    this.once('destroy', () => bus.off('state:inventory', this._onInv))
    this.refresh()
  }

  createSlot(id, x, y) {
    const scene = this.scene
    const size = this.size
    const pu = getPowerUp(id)
    const slot = scene.add.container(x, y)
    const ring = disc(scene, 0, 0, size * 0.48, 0xFFFFFF, 0.16)
    const icon = scene.add.image(0, 0, 'ui', pu.frame)
    icon.setScale((size * 0.92) / Math.max(icon.width, icon.height))
    const badge = disc(scene, size * 0.34, size * 0.34, size * 0.19, 0xEF3B3B)
    const count = addText(scene, size * 0.34, size * 0.33, '0', { size: Math.round(size * 0.24), strokeThickness: 3 })
    const plus = scene.add.image(size * 0.34, size * 0.34, 'ui', 'icon_plus')
    plus.setScale((size * 0.36) / plus.width)
    const cooldown = disc(scene, 0, 0, size * 0.48, 0x061126, 0.55).setVisible(false)
    slot.add([ring, icon, cooldown, badge, count, plus])
    slot.setSize(size, size)
    slot.setData({ icon, badge, count, plus, cooldown, baseScale: 1 })
    makePressable(slot, () => this.tap(id), { haptic: 'medium' })
    this.add(slot)
    return slot
  }

  refresh() {
    for (const [id, slot] of this.slots) {
      const amount = state.powerUpAmount(id)
      const { badge, count, plus, icon } = slot.data.values
      count.setText(amount > 9 ? '9+' : String(amount))
      badge.setVisible(amount > 0)
      count.setVisible(amount > 0)
      plus.setVisible(amount === 0)
      icon.setAlpha(amount > 0 ? 1 : 0.55)
    }
  }

  /** Visual lock while an effect is running. */
  setBusy(id, ms) {
    const slot = this.slots.get(id)
    if (!slot)
      return
    const cd = slot.data.values.cooldown
    cd.setVisible(true).setAlpha(0.6)
    this.scene.tweens.add({ targets: cd, alpha: 0, duration: ms, onComplete: () => cd.setVisible(false) })
  }

  async tap(id) {
    if (state.powerUpAmount(id) > 0) {
      this.onUse?.(id)
      return
    }
    const pu = getPowerUp(id)
    const overlay = this.scene.scene.get('Overlay')
    this.scene.onModalOpen?.()
    const ok = await overlay.confirm({
      title: t(pu.nameKey),
      message: `${t(pu.descKey)}\n\n${formatNumber(pu.price)} ${t('coin')}`,
      icon: { atlas: 'ui', frame: pu.frame, size: 120 },
      confirmText: t('purchase'),
    })
    this.scene.onModalClose?.()
    if (!ok)
      return
    if (state.buyPowerUp(id, 1)) {
      audio.play('coin')
      overlay.toast(t('powerup_purchase_success', { name: t(pu.nameKey), quantity: 1 }), 'success')
    }
    else {
      overlay.toast(t('not_enough_balance_message'), 'error')
    }
  }
}

/**
 * Pause menu with sound/music/vibration toggles.
 * Resolves 'resume' | 'restart' | 'exit'.
 */
export function pauseMenu(scene, { exitLabel } = {}) {
  const overlay = scene.scene.get('Overlay')
  return overlay.modal({
    title: t('pause_menu'),
    width: 640,
    dismissValue: 'resume',
    content: (s, container, width, y0) => {
      const rows = [
        { label: t('sound'), key: 'soundEnabled' },
        { label: t('music'), key: 'musicEnabled' },
        { label: t('vibration'), key: 'vibration' },
      ]
      rows.forEach((row, i) => {
        const y = y0 + 40 + i * 78
        const lbl = addText(s, -width / 2 + 20, y, row.label, { size: 32, color: '#5a3410', stroke: false, shadow: false, originX: 0 })
        const toggle = new Toggle(s, width / 2 - 70, y, state.settings[row.key], (v) => {
          state.updateSettings({ [row.key]: v })
          audio.refresh()
        })
        container.add([lbl, toggle])
      })
      return rows.length * 78 + 10
    },
    buttons: [
      { label: exitLabel ?? t('exit'), color: 'red', value: 'exit' },
      { label: t('restart'), color: 'blue', value: 'restart' },
      { label: t('resume'), color: 'green', value: 'resume' },
    ],
  })
}

/**
 * First-time tutorial: a short sequence of pages (mascot + text).
 * Shown once per `id`; resolves when finished.
 */
export async function showTutorial(scene, id, pages, finishKey) {
  if (state.data.tutorials[id])
    return
  const overlay = scene.scene.get('Overlay')
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i]
    const last = i === pages.length - 1
    const res = await overlay.modal({
      title: page.title || t('game_rules'),
      message: page.text,
      icon: { atlas: page.atlas ?? 'art', frame: page.frame, size: 150 },
      width: 760,
      dismissValue: 'skip',
      buttons: last
        ? [{ label: t(finishKey ?? 'finish'), color: 'green', value: 'next' }]
        : [{ label: `${t('next')}  ${i + 1}/${pages.length}`, color: 'blue', value: 'next' }],
    })
    if (res === 'skip')
      break
  }
  state.markTutorialSeen(id)
}
