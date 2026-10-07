import { audio } from '@/core/audio'
import { bus } from '@/core/bus'
import { haptics } from '@/core/haptics'
import { formatNumber, t } from '@/core/i18n'
import { state } from '@/core/state'
import { POWER_UPS, SKINS } from '@/data/catalog'
import { addText, Button, panel } from '@/ui/components'
import { burst, flyCoins } from '@/ui/fx'
import { gradientTexture, pillTexture } from '@/ui/textures'
import { BaseScene } from './BaseScene'

/**
 * Coin shop: card skins (buy / select) and power-ups (buy x1 / x3).
 */
export class ShopScene extends BaseScene {
  constructor() {
    super({ key: 'Shop' })
  }

  init(data) {
    this.tab = data?.tab ?? this.tab ?? 'skins'
  }

  create() {
    this.setupLayout()
    const { W, H } = this
    this.addCover('shop_bg')
    this.add.image(W / 2, H, gradientTexture(this, W, H, 'rgba(12,20,50,0.15)', 'rgba(12,20,50,0.6)')).setOrigin(0.5, 1).setDisplaySize(W, H)
    const { counter } = this.addHeader(t('shop'))
    this.counter = counter

    // Tabs
    const tabY = this.top + 128
    this.tabs = {}
    const tabs = [
      { id: 'skins', label: t('card_skins'), icon: 'icon_card_icon' },
      { id: 'powerups', label: t('power_ups'), icon: 'icon_powerup_icon' },
    ]
    tabs.forEach((tab, i) => {
      const btn = new Button(this, W / 2 + (i - 0.5) * 300, tabY, { w: 280, h: 72, color: this.tab === tab.id ? 'yellow' : 'gray', label: tab.label, icon: tab.icon, onClick: () => this.switchTab(tab.id) })
      btn.setDepth(30)
      this.tabs[tab.id] = btn
    })

    this.content = this.add.container(0, 0)
    this.buildItems()

    this._onInventory = () => this.time.delayedCall(10, () => this.refreshItems())
    bus.on('state:inventory', this._onInventory)
    bus.on('state:coins', this._onInventory)
    this.events.once('shutdown', () => {
      bus.off('state:inventory', this._onInventory)
      bus.off('state:coins', this._onInventory)
    })
    this.fadeIn()
  }

  switchTab(id) {
    if (this.tab === id)
      return
    this.scene.restart({ tab: id })
  }

  buildItems() {
    this.content.removeAll(true)
    const items = this.tab === 'skins' ? SKINS : POWER_UPS
    const area = { x: this.left + 10, y: this.top + 180, w: this.right - this.left - 20, h: this.bottom - (this.top + 180) }
    const rows = 2
    const cols = Math.ceil(items.length / rows)
    const gap = 22
    let cw = (area.w - gap * (cols - 1)) / cols
    let ch = (area.h - gap) / rows
    cw = Math.min(cw, ch * 0.82, 260)
    ch = Math.min(ch, cw * 1.32)
    const totalW = cols * cw + (cols - 1) * gap
    const totalH = rows * ch + gap
    const x0 = area.x + (area.w - totalW) / 2 + cw / 2
    const y0 = area.y + (area.h - totalH) / 2 + ch / 2
    this.views = items.map((item, i) => {
      const r = Math.floor(i / cols)
      const c = i % cols
      // Center a shorter last row.
      const inRow = r === rows - 1 ? items.length - cols * (rows - 1) : cols
      const rowOffset = ((cols - inRow) * (cw + gap)) / 2
      const x = x0 + c * (cw + gap) + rowOffset
      const y = y0 + r * (ch + gap)
      const view = this.tab === 'skins' ? this.skinCard(item, x, y, cw, ch) : this.powerUpCard(item, x, y, cw, ch)
      view.setScale(0.7).setAlpha(0)
      this.tweens.add({ targets: view, scale: 1, alpha: 1, delay: i * 45, duration: 360, ease: 'Back.easeOut' })
      this.content.add(view)
      return view
    })
  }

  refreshItems() {
    if (!this.scene.isActive())
      return
    this.views?.forEach(v => v.getData('refresh')?.())
  }

  skinCard(skin, x, y, w, h) {
    const c = this.add.container(x, y)
    const bg = panel(this, 0, 0, w, h, 'cream', 26)
    const btnY = h / 2 - 40
    const nameY = btnY - 54
    const imgTop = -h / 2 + 16
    const imgBottom = nameY - 18
    const img = this.add.image(0, (imgTop + imgBottom) / 2, 'art', skin.frame)
    img.setScale(Math.min((w * 0.66) / img.width, (imgBottom - imgTop) / img.height))
    const name = addText(this, 0, nameY, t(skin.nameKey), { size: Math.round(Math.min(26, w * 0.12)), color: '#5a3410', stroke: false, shadow: false, maxWidth: w - 24 })
    c.add([bg, img, name])

    let btn = null
    const render = () => {
      btn?.destroy()
      const owned = state.ownsSkin(skin.id)
      const selected = state.data.selectedSkin === skin.id
      const bw = w * 0.86
      const by = btnY
      if (selected)
        btn = new Button(this, 0, by, { w: bw, h: 60, color: 'green', label: `✓ ${t('selected')}`, fontSize: 24 })
      else if (owned)
        btn = new Button(this, 0, by, { w: bw, h: 60, color: 'blue', label: t('select'), fontSize: 24, onClick: () => this.selectSkin(skin) })
      else
        btn = new Button(this, 0, by, { w: bw, h: 60, color: state.coins >= skin.price ? 'yellow' : 'gray', icon: 'icon_coin', label: formatNumber(skin.price), fontSize: 26, onClick: () => this.buySkin(skin, c) })
      c.add(btn)
      img.setAlpha(owned ? 1 : 0.9)
    }
    render()
    c.setData('refresh', render)
    // Idle shimmer on the selected skin.
    if (state.data.selectedSkin === skin.id)
      this.tweens.add({ targets: img, angle: { from: -3, to: 3 }, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
    return c
  }

  powerUpCard(pu, x, y, w, h) {
    const c = this.add.container(x, y)
    const bg = panel(this, 0, 0, w, h, 'sky', 26)
    const btnY = h / 2 - 40
    const img = this.add.image(0, -h / 2 + h * 0.2, 'ui', pu.frame)
    img.setScale(Math.min((w * 0.5) / img.width, (h * 0.3) / img.height))
    const nameY = -h / 2 + h * 0.4
    const name = addText(this, 0, nameY, t(pu.nameKey), { size: Math.round(Math.min(26, w * 0.12)), color: '#16336e', stroke: false, shadow: false, maxWidth: w - 24 })
    const desc = addText(this, 0, nameY + 20, t(pu.descKey), { size: Math.round(Math.min(18, w * 0.085)), color: '#3c5a8a', stroke: false, shadow: false, wrap: w - 30, originY: 0, lineSpacing: 2 })
    // Clamp long descriptions to the space above the button.
    const room = btnY - 34 - desc.y
    if (desc.height > room)
      desc.setScale(Math.max(0.5, room / desc.height))
    const badgeBg = this.add.image(w * 0.3, -h * 0.4, pillTexture(this, 70, 40, '#ef3b3b', '#ffffff')).setDisplaySize(70, 40)
    const badge = addText(this, w * 0.3, -h * 0.4, '', { size: 22 })
    c.add([bg, img, name, desc, badgeBg, badge])
    this.tweens.add({ targets: img, y: img.y - 6, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })

    let btn = null
    const render = () => {
      btn?.destroy()
      const amount = state.powerUpAmount(pu.id)
      badge.setText(`x${amount}`)
      badgeBg.setVisible(amount > 0)
      badge.setVisible(amount > 0)
      btn = new Button(this, 0, btnY, { w: w * 0.86, h: 60, color: state.coins >= pu.price ? 'yellow' : 'gray', icon: 'icon_coin', label: formatNumber(pu.price), fontSize: 26, onClick: () => this.buyPowerUp(pu, c) })
      c.add(btn)
    }
    render()
    c.setData('refresh', render)
    return c
  }

  async buySkin(skin, view) {
    if (state.coins < skin.price)
      return this.notEnough(skin.price)
    const ok = await this.overlay.confirm({
      title: t('purchase_confirmation_title'),
      message: t('purchase_confirmation_message', { name: t(skin.nameKey), price: formatNumber(skin.price) }),
      icon: { atlas: 'art', frame: skin.frame, size: 150 },
      confirmText: t('purchase'),
    })
    if (!ok)
      return
    if (state.buySkin(skin.id)) {
      this.celebrate(view)
      state.selectSkin(skin.id)
      this.overlay.toast(t('skin_purchase_success', { name: t(skin.nameKey) }), 'success')
    }
  }

  selectSkin(skin) {
    state.selectSkin(skin.id)
    haptics.selection()
    audio.play('select')
    this.overlay.toast(t('skin_selected', { name: t(skin.nameKey) }), 'success')
  }

  async buyPowerUp(pu, view) {
    if (state.coins < pu.price)
      return this.notEnough(pu.price)
    const canTriple = state.coins >= pu.price * 3
    const buttons = [{ label: `x1  ${formatNumber(pu.price)}`, color: 'green', value: 1, icon: 'icon_coin' }]
    if (canTriple)
      buttons.unshift({ label: `x3  ${formatNumber(pu.price * 3)}`, color: 'blue', value: 3, icon: 'icon_coin' })
    const qty = await this.overlay.modal({
      title: t(pu.nameKey),
      message: t(pu.descKey),
      icon: { atlas: 'ui', frame: pu.frame, size: 130 },
      width: 760,
      buttons,
      dismissValue: 0,
    })
    if (!qty)
      return
    if (state.buyPowerUp(pu.id, qty)) {
      this.celebrate(view)
      this.overlay.toast(t('powerup_purchase_success', { name: t(pu.nameKey), quantity: qty }), 'success')
    }
  }

  celebrate(view) {
    const from = this.counter.getCoinPosition()
    flyCoins(this, from, { x: view.x, y: view.y }, 6)
    this.time.delayedCall(700, () => {
      burst(this, view.x, view.y, { count: 30, speed: 520 })
      audio.play('success', { volume: 0.6 })
      haptics.notify('success')
      this.tweens.add({ targets: view, scale: { from: 1.1, to: 1 }, duration: 380, ease: 'Back.easeOut' })
    })
  }

  async notEnough(price) {
    haptics.notify('warning')
    const go = await this.overlay.confirm({
      title: t('not_enough_balance_title'),
      message: `${t('not_enough_balance_message')}\n${t('required_amount')}: ${formatNumber(price)}`,
      icon: { atlas: 'art', frame: 'mascot_criying', size: 130 },
      confirmText: t('extra_coin'),
      cancelText: t('okay'),
      color: 'orange',
    })
    if (go)
      this.go('Store', { from: 'Shop' })
  }

  onResize() {
    this.scene.restart({ tab: this.tab })
  }
}
