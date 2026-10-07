import Phaser from 'phaser'
import { ads } from '@/core/ads'
import { audio } from '@/core/audio'
import { formatNumber, languageInfo, t } from '@/core/i18n'
import { state } from '@/core/state'
import { ISLANDS } from '@/data/catalog'
import { addText, Button, CoinCounter, coverCrop, disc, iconButton, makePressable, rect } from '@/ui/components'
import { openLanguagePicker } from '@/ui/dialogs'
import { ambientSparkles, flyCoins } from '@/ui/fx'
import { frameTexture, gradientTexture, pillTexture } from '@/ui/textures'
import { BaseScene } from './BaseScene'

export class HomeScene extends BaseScene {
  constructor() {
    super({ key: 'Home' })
  }

  create() {
    this.setupLayout()
    const { W, H } = this

    // --- Background ---------------------------------------------------------
    const bg = this.addCover('bg_spring')
    this.tweens.add({ targets: bg, scale: bg.scale * 1.035, duration: 9000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
    this.add.image(W / 2, H, gradientTexture(this, W, H * 0.6, 'rgba(10,26,70,0)', 'rgba(10,26,70,0.55)')).setOrigin(0.5, 1).setDisplaySize(W, H * 0.6)
    ambientSparkles(this, { depth: 1 })

    // --- Top bar ------------------------------------------------------------
    const topY = this.top + 44
    let x = this.left + 44
    iconButton(this, x, topY, 'cog_badge', 88, () => this.navigate('Settings')).setDepth(10)
    x += 100
    iconButton(this, x, topY, 'achievement_badge', 88, () => this.navigate('Stats')).setDepth(10)
    x += 100
    this.addLanguageButton(x, topY)

    this.coins = new CoinCounter(this, this.right - 112, topY, { onPlus: () => this.navigate('Store', undefined, false) }).setDepth(10)
    this.addRewardButton(this.right - 224 - 30 - 140, topY)

    // --- Left column: logo + mascot + secondary actions --------------------------
    const leftW = Math.min(W * 0.36, 520)
    const leftCx = this.left + leftW / 2 + 10
    const logo = this.add.image(leftCx, H * 0.36, 'logo').setDepth(5)
    logo.setScale(Math.min(leftW / logo.width, (H * 0.34) / logo.height))
    const logoScale = logo.scale
    logo.setScale(logoScale * 0.4).setAlpha(0)
    this.tweens.add({ targets: logo, scale: logoScale, alpha: 1, duration: 650, ease: 'Back.easeOut' })
    this.tweens.add({ targets: logo, y: logo.y - 10, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 650 })

    const mascot = this.add.image(leftCx - leftW * 0.36, H * 0.58, 'art', 'mascot_happy').setDepth(6)
    mascot.setScale(150 / mascot.width).setFlipX(true)
    this.tweens.add({ targets: mascot, y: mascot.y - 14, angle: { from: -4, to: 4 }, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })

    const btnW = Math.min(300, leftW * 0.62)
    const shopY = H * 0.6
    new Button(this, leftCx + leftW * 0.14, shopY, { w: btnW, h: 86, color: 'green', icon: 'icon_shop', label: t('shop'), onClick: () => this.navigate('Shop') }).setDepth(6)
    const storeLabel = state.adsBlocked ? t('extra_coin') : t('block_ads')
    const storeIcon = state.adsBlocked ? 'icon_coin' : 'icon_remove_ads'
    new Button(this, leftCx + leftW * 0.14, shopY + 104, { w: btnW, h: 86, color: 'orange', icon: storeIcon, label: storeLabel, onClick: () => this.navigate('Store', undefined, false) }).setDepth(6)

    // --- Mode cards -------------------------------------------------------------
    const areaL = this.left + leftW + 30
    const areaR = this.right
    const cardH = Math.min(H - (this.top + 110) - (H - this.bottom) - 20, Math.max(520, Math.min(H * 0.64, 620)))
    const cardW = Math.min(cardH * 0.72, (areaR - areaL - 40) / 2)
    const cardsCy = (this.top + 100 + this.bottom) / 2 + 6
    const gap = Math.min(48, (areaR - areaL - cardW * 2) * 0.5)
    const c1x = (areaL + areaR) / 2 - cardW / 2 - gap / 2
    const c2x = (areaL + areaR) / 2 + cardW / 2 + gap / 2

    const unlocked = state.data.adventure.unlockedIslands.length
    this.modeCard(c1x, cardsCy, cardW, cardH, {
      art: 'isle_village',
      fx: 0.35,
      fy: 0.12,
      title: t('adventure_mode'),
      info: `${t('opened_island')}: ${unlocked}/${ISLANDS.length}`,
      infoIcon: 'icon_compass',
      color: 'blue',
      decor: 'mascot_water_happy',
      onPlay: () => this.navigate('Map'),
      delay: 120,
    })
    this.modeCard(c2x, cardsCy, cardW, cardH, {
      art: 'endless_mode_card',
      fx: 0.5,
      fy: 0.08,
      title: t('endless_mode'),
      info: `${t('highest_score')}: ${formatNumber(state.endlessStats.highScore)}`,
      infoIcon: 'icon_star',
      color: 'yellow',
      decor: 'mascot_rich2',
      onPlay: () => this.navigate('Endless'),
      delay: 220,
    })

    this.fadeIn()
  }

  modeCard(x, y, w, h, { art, fx, fy, title, info, infoIcon, color, decor, onPlay, delay }) {
    const c = this.add.container(x, y).setDepth(5)
    const border = 10
    const artH = h * 0.7
    const shadow = this.add.image(0, 14, pillTexture(this, w, h, 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0)')).setDisplaySize(w * 1.02, h * 0.98)
    const body = rect(this, 0, 0, w - border * 2, h - border * 2, 0x13306E)
    const img = this.add.image(0, 0, art)
    coverCrop(img, 0, -h / 2 + border + artH / 2, w - border * 2, artH, fx, fy)
    const plate = this.add.image(0, h / 2 - border, gradientTexture(this, w, h * 0.5, 'rgba(19,48,110,0)', 'rgba(19,48,110,1)')).setOrigin(0.5, 1).setDisplaySize(w - border * 2, h * 0.5)
    const frame = this.add.image(0, 0, frameTexture(this, w, h, { radius: 34, border, color: '#ffffff', inner: color === 'blue' ? '#5fb8ff' : '#ffc93d' })).setDisplaySize(w, h)
    const titleText = addText(this, 0, h * 0.17, title, { size: 40, maxWidth: w - 50 })
    const infoText = addText(this, 16, h * 0.28, info, { size: 24, color: '#ffe9a8', maxWidth: w - 90 })
    const ic = this.add.image(infoText.x - infoText.width / 2 - 24, infoText.y, 'ui', infoIcon)
    ic.setScale(40 / ic.width)
    c.add([shadow, body, img, plate, frame, titleText, infoText, ic])

    if (decor) {
      const d = this.add.image(w * 0.3, -h * 0.02, 'art', decor)
      d.setScale((w * 0.36) / d.width)
      c.add(d)
      this.tweens.add({ targets: d, y: d.y - 10, duration: 1100 + Math.random() * 300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
    }

    const play = new Button(this, 0, h / 2 - 10, { w: w * 0.7, h: 84, color: color === 'blue' ? 'green' : 'orange', label: t('start_game'), onClick: onPlay })
    c.add(play)

    // Whole card is tappable too.
    c.setSize(w, h)
    makePressable(c, onPlay, { hitArea: new Phaser.Geom.Rectangle(0, 0, w, h - 60) })

    c.setScale(0.6).setAlpha(0)
    this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 520, delay, ease: 'Back.easeOut' })
    this.tweens.add({ targets: c, y: y - 8, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: delay + 520 })
    return c
  }

  addLanguageButton(x, y) {
    const info = languageInfo(state.settings.language)
    const c = this.add.container(x, y).setDepth(10)
    const bg = disc(this, 0, 0, 44, 0xC76D00)
    const bgInner = disc(this, 0, 0, 38, 0xFFFFFF)
    const flag = this.add.image(0, 0, 'ui', info.flag)
    flag.setScale(58 / flag.width)
    c.add([bg, bgInner, flag])
    c.setSize(88, 88)
    makePressable(c, () => this.openLanguagePicker())
  }

  addRewardButton(x, y) {
    const left = state.adsLeftToday
    const btn = new Button(this, x, y, {
      w: 280,
      h: 78,
      color: 'purple',
      icon: 'icon_ad_icon',
      label: t('watch_earn'),
      sub: left > 0 ? `(${left} ${t('left')})` : `(${t('full_limit')})`,
      onClick: () => this.watchAdForCoins(),
    }).setDepth(10)
    if (left > 0)
      btn.pulse()
    this.rewardBtn = btn
  }

  async watchAdForCoins() {
    const overlay = this.overlay
    if (state.adsLeftToday <= 0) {
      await overlay.alert({ title: t('full_limit'), message: t('ads_limit_full'), icon: { atlas: 'art', frame: 'mascot_criying' } })
      return
    }
    const ok = await overlay.confirm({
      title: t('watch_earn'),
      message: `${t('watch_ad_title')}\n${t('today_ads_left')} ${state.adsLeftToday}`,
      icon: { atlas: 'art', frame: 'coin1', size: 140 },
      confirmText: t('watch'),
    })
    if (!ok)
      return
    overlay.showBusy(t('loading_ad'))
    const rewarded = await ads.showRewarded()
    overlay.hideBusy()
    if (!rewarded) {
      overlay.toast(t('ad_not_available'), 'warning')
      return
    }
    if (!state.recordAdWatch())
      return
    const amount = Phaser.Math.Between(1000, 1300)
    const target = this.coins.getCoinPosition()
    flyCoins(this, { x: this.W / 2, y: this.H / 2 }, target, 14)
    this.time.delayedCall(900, () => state.addCoins(amount))
    audio.play('earn_sound')
    overlay.toast(`+${formatNumber(amount)} ${t('coin')}`, 'success')
    this.time.delayedCall(1500, () => this.scene.isActive() && this.scene.restart())
  }

  async openLanguagePicker() {
    if (await openLanguagePicker(this))
      this.scene.restart()
  }

  /**
   * Navigation from the home menu shows an interstitial every 5th tap
   * (never for players who removed ads).
   */
  async navigate(key, data, allowAd = true) {
    if (this._leaving)
      return
    if (allowAd && !state.adsBlocked) {
      const count = state.incrementInterstitialCounter()
      if (count % 5 === 0)
        await ads.maybeShowInterstitial()
    }
    this.go(key, data)
  }

  onBack() {
    // Let the overlay ask "exit game?".
    return false
  }
}
