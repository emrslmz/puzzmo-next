import { AdMob, AdmobConsentStatus, InterstitialAdPluginEvents, RewardAdPluginEvents } from '@capacitor-community/admob'
import { Capacitor } from '@capacitor/core'
import { audio } from './audio'
import { state } from './state'

const platform = Capacitor.getPlatform()
const isNative = Capacitor.isNativePlatform()

const AD_UNITS = {
  android: {
    interstitial: 'ca-app-pub-3304037628561493/9053561269',
    rewarded: 'ca-app-pub-3304037628561493/6459962563',
  },
  ios: {
    interstitial: 'ca-app-pub-3304037628561493/2459345679',
    rewarded: 'ca-app-pub-3304037628561493/1146264004',
  },
}

// Set to true while developing on a device to receive Google test ads.
const USE_TEST_ADS = false
const INTERSTITIAL_MIN_GAP_MS = 75_000
const LOAD_TIMEOUT_MS = 9_000

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    wait(ms).then(() => {
      throw new Error('timeout')
    }),
  ])
}

/**
 * AdMob wrapper: consent (UMP) + App Tracking Transparency, preloaded
 * interstitial and rewarded ads, frequency capping and a web simulation so
 * the whole flow can be exercised in the browser.
 */
class AdService {
  constructor() {
    this.ready = false
    this.canRequestAds = false
    this.interstitialLoaded = false
    this.rewardedLoaded = false
    this.lastInterstitialAt = 0
    this._initPromise = null
    this._loadingInterstitial = null
    this._loadingRewarded = null
    this.webSimulator = null // set by the overlay scene (shows a fake ad on web)
  }

  get units() {
    return AD_UNITS[platform] ?? {}
  }

  init() {
    if (!isNative)
      return Promise.resolve(false)
    this._initPromise ??= this._init()
    return this._initPromise
  }

  async _init() {
    try {
      // 1. GDPR / privacy consent via Google's UMP SDK.
      let consent = await AdMob.requestConsentInfo().catch(() => null)
      if (consent?.isConsentFormAvailable && consent.status === AdmobConsentStatus.REQUIRED)
        consent = await AdMob.showConsentForm().catch(() => consent)
      this.canRequestAds = consent ? consent.canRequestAds !== false : true

      // 2. iOS App Tracking Transparency prompt.
      if (platform === 'ios') {
        const tracking = await AdMob.trackingAuthorizationStatus().catch(() => null)
        if (tracking?.status === 'notDetermined')
          await AdMob.requestTrackingAuthorization().catch(() => {})
      }

      // 3. SDK init.
      await AdMob.initialize({ initializeForTesting: USE_TEST_ADS })
      this.ready = true

      AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
        this.interstitialLoaded = false
        this.preloadInterstitial()
      })
      AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
        this.rewardedLoaded = false
        this.preloadRewarded()
      })

      if (this.canRequestAds) {
        this.preloadRewarded()
        if (!state.adsBlocked)
          this.preloadInterstitial()
      }
      return true
    }
    catch (error) {
      console.warn('[ads] init failed', error)
      return false
    }
  }

  /** Re-opens the consent form (privacy settings button). */
  async showPrivacyOptions() {
    if (!isNative)
      return
    await AdMob.showPrivacyOptionsForm().catch(error => console.warn('[ads] privacy form', error))
  }

  preloadInterstitial() {
    if (!this.ready || !this.canRequestAds || state.adsBlocked || this.interstitialLoaded || !this.units.interstitial)
      return this._loadingInterstitial
    this._loadingInterstitial ??= AdMob.prepareInterstitial({ adId: this.units.interstitial, isTesting: USE_TEST_ADS, immersiveMode: true })
      .then(() => { this.interstitialLoaded = true })
      .catch(error => console.warn('[ads] interstitial load failed', error))
      .finally(() => { this._loadingInterstitial = null })
    return this._loadingInterstitial
  }

  preloadRewarded() {
    if (!this.ready || !this.canRequestAds || this.rewardedLoaded || !this.units.rewarded)
      return this._loadingRewarded
    this._loadingRewarded ??= AdMob.prepareRewardVideoAd({ adId: this.units.rewarded, isTesting: USE_TEST_ADS, immersiveMode: true })
      .then(() => { this.rewardedLoaded = true })
      .catch(error => console.warn('[ads] rewarded load failed', error))
      .finally(() => { this._loadingRewarded = null })
    return this._loadingRewarded
  }

  /**
   * Shows an interstitial if the frequency cap allows it and the player
   * hasn't bought "remove ads". Always resolves (never blocks gameplay).
   */
  async maybeShowInterstitial() {
    if (state.adsBlocked || Date.now() - this.lastInterstitialAt < INTERSTITIAL_MIN_GAP_MS)
      return false
    if (!isNative)
      return false
    if (!this.ready || !this.interstitialLoaded) {
      this.preloadInterstitial()
      return false
    }

    return new Promise((resolve) => {
      let settled = false
      const handles = []
      const finish = (shown) => {
        if (settled)
          return
        settled = true
        handles.forEach(h => h.then(x => x.remove()).catch(() => {}))
        audio.resume()
        if (shown)
          this.lastInterstitialAt = Date.now()
        resolve(shown)
      }
      handles.push(AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => finish(true)))
      handles.push(AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, () => finish(false)))
      audio.suspend()
      this.interstitialLoaded = false
      AdMob.showInterstitial().catch(() => finish(false))
      // Safety net in case the native side never reports back.
      setTimeout(finish, 90_000, true)
    })
  }

  /** True if a rewarded ad can (probably) be shown right now. */
  get rewardedAvailable() {
    return !isNative || (this.ready && this.canRequestAds)
  }

  /**
   * Shows a rewarded ad. Resolves `true` only if the user earned the reward.
   */
  async showRewarded() {
    if (!isNative)
      return this.webSimulator ? this.webSimulator() : true

    await this.init()
    if (!this.ready || !this.canRequestAds)
      return false

    if (!this.rewardedLoaded) {
      try {
        await withTimeout(this.preloadRewarded() ?? Promise.resolve(), LOAD_TIMEOUT_MS)
      }
      catch {}
      if (!this.rewardedLoaded)
        return false
    }

    return new Promise((resolve) => {
      let rewarded = false
      let settled = false
      const handles = []
      const finish = () => {
        if (settled)
          return
        settled = true
        handles.forEach(h => h.then(x => x.remove()).catch(() => {}))
        audio.resume()
        resolve(rewarded)
      }
      handles.push(AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
        rewarded = true
      }))
      handles.push(AdMob.addListener(RewardAdPluginEvents.Dismissed, () => setTimeout(finish, 50)))
      handles.push(AdMob.addListener(RewardAdPluginEvents.FailedToShow, finish))
      audio.suspend()
      this.rewardedLoaded = false
      AdMob.showRewardVideoAd()
        .then(() => { rewarded = true })
        .catch(finish)
      setTimeout(finish, 120_000)
    })
  }
}

export const ads = new AdService()
