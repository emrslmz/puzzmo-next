import { ads } from '@/core/ads'
import { audio } from '@/core/audio'
import { languageInfo, t } from '@/core/i18n'
import { iap } from '@/core/iap'
import { notifications } from '@/core/notifications'
import { isNative } from '@/core/platform'
import { state } from '@/core/state'
import { addText, Button, panel, Toggle } from '@/ui/components'
import { CONTACT_EMAIL, openLanguagePicker, openPrivacyPolicy } from '@/ui/dialogs'
import { gradientTexture } from '@/ui/textures'
import { BaseScene } from './BaseScene'

const VERSION = '2.0.0'

export class SettingsScene extends BaseScene {
  constructor() {
    super({ key: 'Settings' })
  }

  create() {
    this.setupLayout()
    const { W, H } = this
    this.addCover('bg_spring')
    this.add.image(W / 2, H / 2, gradientTexture(this, W, H, 'rgba(8,20,55,0.55)', 'rgba(8,20,55,0.8)')).setDisplaySize(W, H)
    this.addHeader(t('settings'), { coins: false })

    const top = this.top + 100
    const bottom = this.bottom - 10
    const colW = Math.min(560, (this.right - this.left - 40) / 2)
    const gap = 30
    const lx = W / 2 - gap / 2 - colW / 2
    const rx = W / 2 + gap / 2 + colW / 2
    const ph = bottom - top
    panel(this, lx, top + ph / 2, colW, ph, 'glass', 30)
    panel(this, rx, top + ph / 2, colW, ph, 'glass', 30)

    // --- Left: game settings ---
    addText(this, lx, top + 40, t('game_settings'), { size: 32, color: '#ffe36b' })
    const rows = [
      { label: t('sound_effects'), icon: 'sound_badge', key: 'soundEnabled' },
      { label: t('music'), icon: 'music_badge', key: 'musicEnabled' },
      { label: t('vibration'), icon: 'vibration_badge', key: 'vibration' },
      { label: t('notifications'), icon: 'announcement_badge', key: 'notifications' },
    ]
    const rowH = Math.min(84, (ph - 200) / (rows.length + 1))
    rows.forEach((row, i) => {
      const y = top + 100 + i * rowH
      const icon = this.add.image(lx - colW / 2 + 50, y, 'ui', row.icon)
      icon.setScale(58 / icon.width)
      addText(this, lx - colW / 2 + 92, y, row.label, { size: 28, originX: 0, maxWidth: colW - 260 })
      new Toggle(this, lx + colW / 2 - 80, y, !!state.settings[row.key], v => this.toggle(row.key, v))
    })

    // Graphics quality: auto / high / low
    const qy = top + 100 + rows.length * rowH + 10
    addText(this, lx - colW / 2 + 30, qy, t('graphics_quality'), { size: 26, originX: 0, color: '#bfe2ff' })
    const modes = [
      { id: 'auto', label: t('quality_auto') },
      { id: 'high', label: t('quality_high') },
      { id: 'low', label: t('quality_low') },
    ]
    const current = state.settings.performanceMode === 'medium' ? 'auto' : state.settings.performanceMode
    const segW = (colW - 60) / 3
    modes.forEach((m, i) => {
      new Button(this, lx - colW / 2 + 30 + segW / 2 + i * segW, qy + 56, {
        w: segW - 10,
        h: 60,
        color: current === m.id ? 'yellow' : 'gray',
        label: m.label,
        fontSize: 22,
        onClick: () => {
          state.updateSettings({ performanceMode: m.id })
          this.scene.restart()
        },
      })
    })

    // --- Right: account / support ---
    addText(this, rx, top + 40, t('support_and_information'), { size: 32, color: '#ffe36b', maxWidth: colW - 40 })
    const lang = languageInfo(state.settings.language)
    const bw = colW - 70
    const actions = [
      { label: `${t('game_language')}: ${lang.label}`, icon: lang.flag, color: 'blue', onClick: () => this.changeLanguage() },
      { label: t('restore_purchases'), icon: 'icon_reverse', color: 'teal', onClick: () => this.restore() },
      { label: t('privacy_policy'), icon: 'info_badge', color: 'purple', onClick: () => openPrivacyPolicy(this) },
      { label: t('contact_us'), icon: 'mail_badge', color: 'orange', onClick: () => window.open(`mailto:${CONTACT_EMAIL}?subject=Puzzmo`, '_system') },
    ]
    if (isNative)
      actions.splice(3, 0, { label: t('privacy_options'), icon: 'cog_badge', color: 'gray', onClick: () => ads.showPrivacyOptions() })
    const aH = Math.min(78, (ph - 150) / actions.length - 10)
    actions.forEach((a, i) => {
      new Button(this, rx, top + 100 + i * (aH + 12) + aH / 2 - 10, { w: bw, h: aH, color: a.color, icon: a.icon, label: a.label, fontSize: Math.round(aH * 0.34), onClick: a.onClick })
    })
    addText(this, rx, bottom - 26, `Puzzmo v${VERSION}`, { size: 20, color: '#9fb3d1' })
    this.fadeIn()
  }

  async toggle(key, value) {
    if (key === 'notifications') {
      if (value) {
        const granted = await notifications.requestPermission()
        if (!granted) {
          this.overlay.toast(t('notifications_denied'), 'warning')
          this.scene.restart()
        }
      }
      else {
        await notifications.disable()
      }
      return
    }
    state.updateSettings({ [key]: value })
    audio.refresh()
    if (key === 'soundEnabled' && value)
      audio.click()
  }

  async changeLanguage() {
    if (await openLanguagePicker(this))
      this.scene.restart()
  }

  async restore() {
    this.overlay.showBusy(t('processing'))
    const res = await iap.restore()
    this.overlay.hideBusy()
    const map = { restored: ['restore_success', 'success'], nothing: ['restore_nothing', 'info'], failed: ['purchase_failed', 'error'] }
    const [key, type] = map[res]
    this.overlay.toast(t(key), type)
  }
}
