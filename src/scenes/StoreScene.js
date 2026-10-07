import { audio } from '@/core/audio'
import { haptics } from '@/core/haptics'
import { formatNumber, t } from '@/core/i18n'
import { iap } from '@/core/iap'
import { state } from '@/core/state'
import { addText, Button, makePressable } from '@/ui/components'
import { ambientSparkles, burst, flyCoins } from '@/ui/fx'
import { frameTexture, gradientTexture, pillTexture } from '@/ui/textures'
import { BaseScene } from './BaseScene'

/**
 * Real-money coin store (RevenueCat). Shows localized store prices,
 * handles purchase / cancel / failure and "Restore purchases".
 */
export class StoreScene extends BaseScene {
  constructor() {
    super({ key: 'Store' })
  }

  init(data) {
    this.from = data?.from ?? 'Home'
  }

  create() {
    this.setupLayout()
    const { W, H } = this
    this.addCover('wooden_background')
    this.add.image(W / 2, H, gradientTexture(this, W, H, 'rgba(20,8,0,0.1)', 'rgba(20,8,0,0.55)')).setOrigin(0.5, 1).setDisplaySize(W, H)
    ambientSparkles(this, { tint: [0xFFE36B, 0xFFFFFF], frequency: 200 })
    const { counter } = this.addHeader(t('extra_coin'), { back: this.from })
    this.counter = counter

    this.restoreBtn = new Button(this, W / 2, this.bottom - 40, { w: 360, h: 64, color: 'gray', label: t('restore_purchases'), fontSize: 24, onClick: () => this.restore() }).setDepth(20)
    this.content = this.add.container(0, 0)
    this.loadProducts()
    this.fadeIn()
  }

  async loadProducts() {
    this.content.removeAll(true)
    if (!navigator.onLine) {
      this.showMessage(t('internet_connection_required'), t('please_check_your_internet_connection'), 'mascot_showing_right')
      return
    }
    const spinner = this.add.image(this.cx, this.cy, 'fx_ring').setDisplaySize(90, 90).setTint(0xFFD34D)
    spinner.setCrop(0, 0, 128, 64)
    this.tweens.add({ targets: spinner, angle: 360, duration: 900, repeat: -1 })
    const label = addText(this, this.cx, this.cy + 80, t('loading'), { size: 30 })
    this.content.add([spinner, label])
    try {
      const products = await iap.loadProducts()
      if (!this.scene.isActive())
        return
      this.content.removeAll(true)
      this.showProducts(products)
    }
    catch (error) {
      if (!this.scene.isActive())
        return
      this.content.removeAll(true)
      console.warn('[store] products', error)
      this.showMessage(t('error_occurred'), t('purchase_failed_to_load_products_check_config'), 'mascot_angry', true)
    }
  }

  showMessage(title, text, mascot, retry = false) {
    const img = this.add.image(this.cx, this.cy - 90, 'art', mascot)
    img.setScale(150 / img.width)
    const a = addText(this, this.cx, this.cy + 20, title, { size: 40 })
    const b = addText(this, this.cx, this.cy + 70, text, { size: 26, color: '#ffe9c2', wrap: this.W * 0.6 })
    this.content.add([img, a, b])
    if (retry) {
      const btn = new Button(this, this.cx, this.cy + 150, { w: 260, h: 70, color: 'blue', label: t('restart'), onClick: () => this.loadProducts() })
      this.content.add(btn)
    }
  }

  showProducts(products) {
    const area = { x: this.left, y: this.top + 110, w: this.right - this.left, h: this.bottom - 90 - (this.top + 110) }
    const n = products.length
    const gap = 26
    const cw = Math.min(250, (area.w - gap * (n - 1)) / n, area.h * 0.7)
    const ch = Math.min(area.h, cw * 1.45)
    const total = n * cw + (n - 1) * gap
    products.forEach((p, i) => {
      const x = area.x + (area.w - total) / 2 + cw / 2 + i * (cw + gap)
      const y = area.y + area.h / 2
      const card = this.productCard(p, x, y, cw, ch)
      card.setScale(0.6).setAlpha(0)
      this.tweens.add({ targets: card, scale: 1, alpha: 1, delay: i * 80, duration: 420, ease: 'Back.easeOut' })
      this.tweens.add({ targets: card, y: y - 8, delay: 500 + i * 200, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
      this.content.add(card)
    })
  }

  productCard(p, x, y, w, h) {
    const c = this.add.container(x, y)
    const owned = p.removesAds && state.adsBlocked
    const bodyColor = p.removesAds ? 0x0E8276 : p.popular ? 0x1A52B8 : 0x5A2D0C
    const body = this.add.image(0, 0, gradientTexture(this, 64, 256, '#ffffff', '#ffffff')).setDisplaySize(w - 12, h - 12).setTint(bodyColor)
    const shine = this.add.image(0, -h * 0.18, 'fx_glow').setDisplaySize(w * 1.1, w * 1.1).setAlpha(0.35).setBlendMode('ADD')
    const frame = this.add.image(0, 0, frameTexture(this, w, h, { radius: 28, border: 9, color: '#ffffff', inner: p.popular ? '#ffd34d' : '#ffb21a' })).setDisplaySize(w, h)
    const img = this.add.image(0, -h * 0.17, p.frame.startsWith('icon_') ? 'ui' : 'art', p.frame)
    img.setScale(Math.min((w * 0.72) / img.width, (h * 0.42) / img.height))
    if (owned)
      img.setTint(0x99A0A8)
    const name = addText(this, 0, h * 0.11, t(p.nameKey), { size: 28, maxWidth: w - 30 })
    const amount = p.coins > 0 ? `${formatNumber(p.coins)}` : `+${formatNumber(p.bonus)}`
    const coinsText = addText(this, 0, h * 0.2, amount, { size: 30, color: '#ffe36b', maxWidth: w - 40 })
    c.add([body, shine, frame, img, name, coinsText])
    this.tweens.add({ targets: shine, angle: 360, duration: 9000, repeat: -1 })

    if (p.bonus > 0 && p.coins > 0) {
      const bonus = addText(this, 0, h * 0.28, `+${formatNumber(p.bonus)} ${t('bonus')}`, { size: 20, color: '#9ff0c8' })
      c.add(bonus)
    }
    if (p.badgeKey && !owned) {
      const badgeW = Math.min(w * 0.9, 220)
      const badge = this.add.container(0, -h / 2 + 4)
      const badgeBg = this.add.image(0, 0, pillTexture(this, badgeW, 44, '#ef3b3b', '#ffffff')).setDisplaySize(badgeW, 44)
      const badgeText = addText(this, 0, 0, t(p.badgeKey), { size: 20, maxWidth: badgeW - 20 })
      badge.add([badgeBg, badgeText])
      c.add(badge)
      this.tweens.add({ targets: badge, scale: { from: 1, to: 1.08 }, duration: 600, yoyo: true, repeat: -1 })
    }

    const btn = new Button(this, 0, h / 2 - 8, {
      w: w * 0.86,
      h: 72,
      color: owned ? 'green' : 'yellow',
      label: owned ? `✓ ${t('block_ads_success')}` : p.price,
      fontSize: owned ? 20 : 30,
      onClick: () => !owned && this.purchase(p, c),
    })
    c.add(btn)
    c.setSize(w, h)
    if (!owned)
      makePressable(c, () => this.purchase(p, c), { sound: false, haptic: false })
    return c
  }

  async purchase(p, view) {
    if (this._busy)
      return
    if (!navigator.onLine) {
      this.overlay.toast(t('internet_connection_required'), 'error')
      return
    }
    const ok = await this.overlay.confirm({
      title: t('purchase_confirmation_title'),
      message: `${t(p.nameKey)}\n${p.coins > 0 ? `${formatNumber(p.coins + p.bonus)} ${t('coin')}` : t('block_ads_subtitle')}\n\n${p.price}`,
      icon: { atlas: p.frame.startsWith('icon_') ? 'ui' : 'art', frame: p.frame, size: 140 },
      confirmText: t('purchase'),
    })
    if (!ok)
      return
    this._busy = true
    this.overlay.showBusy(t('processing'))
    const result = await iap.purchase(p)
    this.overlay.hideBusy()
    this._busy = false
    if (result === 'success') {
      audio.play('won_sound')
      haptics.notify('success')
      this.overlay.confetti()
      burst(this, view.x, view.y, { count: 40, speed: 700, scale: 1 })
      flyCoins(this, { x: view.x, y: view.y }, this.counter.getCoinPosition(), 16)
      this.overlay.toast(t('purchase_success'), 'success')
      if (p.removesAds)
        this.time.delayedCall(1200, () => this.scene.restart({ from: this.from }))
    }
    else if (result === 'cancelled') {
      this.overlay.toast(t('purchase_cancelled'), 'info')
    }
    else {
      haptics.notify('error')
      this.overlay.toast(t('purchase_failed'), 'error')
    }
  }

  async restore() {
    this.overlay.showBusy(t('processing'))
    const result = await iap.restore()
    this.overlay.hideBusy()
    if (result === 'restored') {
      this.overlay.toast(t('restore_success'), 'success')
      this.scene.restart({ from: this.from })
    }
    else if (result === 'nothing') {
      this.overlay.toast(t('restore_nothing'), 'info')
    }
    else {
      this.overlay.toast(t('purchase_failed'), 'error')
    }
  }

  onBack() {
    this.go(this.from)
    return true
  }

  onResize() {
    this.scene.restart({ from: this.from })
  }
}
