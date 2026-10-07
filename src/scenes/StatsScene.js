import { formatNumber, t } from '@/core/i18n'
import { state } from '@/core/state'
import { ISLANDS } from '@/data/catalog'
import { StatChip } from '@/game/GameUI'
import { addText, panel } from '@/ui/components'
import { gradientTexture } from '@/ui/textures'
import { BaseScene } from './BaseScene'

/** Player statistics: endless records and adventure progress per island. */
export class StatsScene extends BaseScene {
  constructor() {
    super({ key: 'Stats' })
  }

  create() {
    this.setupLayout()
    const { W, H } = this
    this.addCover('bg_spring')
    this.add.image(W / 2, H / 2, gradientTexture(this, W, H, 'rgba(8,20,55,0.5)', 'rgba(8,20,55,0.8)')).setDisplaySize(W, H)
    this.addHeader(t('stats'))

    const top = this.top + 100
    const bottom = this.bottom - 10
    const ph = bottom - top
    const colW = Math.min(600, (this.right - this.left - 40) / 2)
    const lx = W / 2 - 15 - colW / 2
    const rx = W / 2 + 15 + colW / 2
    panel(this, lx, top + ph / 2, colW, ph, 'glass', 30)
    panel(this, rx, top + ph / 2, colW, ph, 'glass', 30)

    // --- Endless ---
    const e = state.endlessStats
    const games = e.totalGamesPlayed
    const accuracy = e.totalMatches + e.totalErrors > 0 ? Math.round((e.totalMatches / (e.totalMatches + e.totalErrors)) * 100) : 0
    addText(this, lx, top + 40, t('endless_mode'), { size: 32, color: '#ffe36b' })
    const items = [
      { icon: 'icon_star', value: formatNumber(e.highScore), label: t('highest_score') },
      { icon: 'icon_cup', value: formatNumber(e.totalScore), label: t('total_score') },
      { icon: 'icon_cartridge', value: formatNumber(games), label: t('total_game') },
      { icon: 'icon_arrangement', value: formatNumber(games ? Math.round(e.totalScore / games) : 0), label: t('average') },
      { icon: 'icon_cards', value: formatNumber(e.totalMatches), label: t('matches') },
      { icon: 'icon_green_check', value: `${accuracy}%`, label: t('accuracy') },
      { icon: 'icon_crystal', value: formatNumber(e.bestMatchStreak), label: t('best_series') },
      { icon: 'icon_coin', value: formatNumber(state.coins), label: t('coin') },
    ]
    const chipW = (colW - 60) / 2
    const rowH = Math.min(86, (ph - 90) / 4)
    items.forEach((it, i) => {
      const x = lx - colW / 2 + 30 + chipW / 2 + (i % 2) * chipW
      const y = top + 100 + Math.floor(i / 2) * rowH
      const chip = new StatChip(this, x, y, { icon: it.icon, value: it.value, label: it.label, w: chipW - 12, h: Math.min(68, rowH - 10) })
      chip.setScale(0.6).setAlpha(0)
      this.tweens.add({ targets: chip, scale: 1, alpha: 1, delay: i * 50, duration: 360, ease: 'Back.easeOut' })
    })

    // --- Adventure ---
    addText(this, rx, top + 40, t('adventure_mode'), { size: 32, color: '#ffe36b' })
    const a = state.adventureStats
    const unlocked = state.data.adventure.unlockedIslands.length
    new StatChip(this, rx - colW / 4 + 5, top + 100, { icon: 'icon_compass', value: `${unlocked}/${ISLANDS.length}`, label: t('opened_island'), w: colW / 2 - 30, h: 66 })
    new StatChip(this, rx + colW / 4 - 5, top + 100, { icon: 'icon_star', value: formatNumber(a.levelsCompleted), label: t('level_completed_short'), w: colW / 2 - 30, h: 66 })
    const listTop = top + 160
    const cellH = Math.min(70, (bottom - listTop - 20) / ISLANDS.length)
    ISLANDS.forEach((isl, i) => {
      const y = listTop + i * cellH + cellH / 2
      const open = state.isIslandUnlocked(isl.id)
      const img = this.add.image(rx - colW / 2 + 60, y, 'islands', isl.frame)
      img.setScale((cellH * 1.05) / img.width)
      if (!open)
        img.setTint(0x6F7D92)
      addText(this, rx - colW / 2 + 110, y, t(isl.nameKey), { size: 24, originX: 0, color: open ? '#ffffff' : '#9fb3d1', maxWidth: colW * 0.45 })
      const right = open ? `${t('level')} ${state.islandLevel(isl.id)}  ·  ${formatNumber(state.islandHighScore(isl.id))}` : `🔒 ${formatNumber(isl.cost)}`
      addText(this, rx + colW / 2 - 30, y, right, { size: 22, originX: 1, color: open ? '#ffe36b' : '#9fb3d1' })
    })
    this.fadeIn()
  }
}
