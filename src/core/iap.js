import { Capacitor } from '@capacitor/core'
import { Device } from '@capacitor/device'
import { LOG_LEVEL, Purchases } from '@revenuecat/purchases-capacitor'
import { COIN_PACKAGES } from '@/data/catalog'
import { state } from './state'

const platform = Capacitor.getPlatform()
const isNative = Capacitor.isNativePlatform()

const API_KEYS = {
  ios: 'appl_IEVPoEQgVvuQuEhKTzdehdBwIfL',
  android: 'goog_jrSalfXPzOvGHCGxukMrKbancGY',
}

const PURCHASE_CANCELLED = '1'

function ownsRemoveAds(customerInfo) {
  if (!customerInfo)
    return false
  const ids = [
    ...(customerInfo.allPurchasedProductIdentifiers ?? []),
    ...(customerInfo.nonSubscriptionTransactions ?? []).map(tx => tx.productIdentifier),
    ...Object.values(customerInfo.entitlements?.active ?? {}).map(e => e.productIdentifier),
  ]
  return ids.some(id => String(id).includes('block_ads'))
}

/**
 * In-app purchases through RevenueCat.
 *
 * Coin packs are consumables (granted once per successful purchase); "remove
 * ads" is a non-consumable that is re-synced on every launch and through
 * "Restore purchases". On the web every product is simulated.
 */
class IapService {
  constructor() {
    this.configured = false
    this._configurePromise = null
    this.packages = new Map() // local id -> { rcPackage, price }
  }

  init() {
    if (!isNative)
      return Promise.resolve(false)
    this._configurePromise ??= this._configure()
    return this._configurePromise
  }

  async _configure() {
    try {
      await Purchases.setLogLevel({ level: import.meta.env.DEV ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN })
      // Device id keeps the same RevenueCat customer as previous app versions.
      const { identifier } = await Device.getId()
      await Purchases.configure({ apiKey: API_KEYS[platform], appUserID: identifier })
      this.configured = true
      Purchases.addCustomerInfoUpdateListener(info => this._syncEntitlements(info)).catch(() => {})
      const { customerInfo } = await Purchases.getCustomerInfo()
      this._syncEntitlements(customerInfo)
      return true
    }
    catch (error) {
      console.warn('[iap] configure failed', error)
      this._configurePromise = null
      return false
    }
  }

  _syncEntitlements(customerInfo) {
    if (ownsRemoveAds(customerInfo))
      state.setAdsBlocked(true)
  }

  /**
   * Loads store products. Returns a list of package descriptors with
   * localized prices, or throws if the store is unreachable.
   */
  async loadProducts() {
    if (!isNative) {
      return COIN_PACKAGES.map(p => ({ ...p, price: p.fallbackPrice, available: true }))
    }
    const ok = await this.init()
    if (!ok)
      throw new Error('store_unavailable')

    const offerings = await Purchases.getOfferings()
    const all = offerings?.all ?? {}
    const result = []
    for (const pkg of COIN_PACKAGES) {
      const offering = all[pkg.offeringId]
      const rcPackage = offering?.availablePackages?.[0]
      if (rcPackage) {
        this.packages.set(pkg.id, rcPackage)
        result.push({ ...pkg, price: rcPackage.product.priceString, available: true })
      }
    }
    if (!result.length)
      throw new Error('no_products')
    return result
  }

  /**
   * Purchases a package. Resolves to 'success' | 'cancelled' | 'failed'.
   * Rewards are granted here, exactly once.
   */
  async purchase(pkg) {
    if (!isNative) {
      await new Promise(resolve => setTimeout(resolve, 900))
      this._grant(pkg)
      return 'success'
    }
    try {
      const rcPackage = this.packages.get(pkg.id)
      if (!rcPackage)
        return 'failed'
      const { customerInfo } = await Purchases.purchasePackage({ aPackage: rcPackage })
      this._grant(pkg)
      this._syncEntitlements(customerInfo)
      return 'success'
    }
    catch (error) {
      if (error?.userCancelled || error?.code === PURCHASE_CANCELLED)
        return 'cancelled'
      console.warn('[iap] purchase failed', error)
      return 'failed'
    }
  }

  _grant(pkg) {
    if (pkg.removesAds)
      state.setAdsBlocked(true)
    state.addCoins(pkg.coins + pkg.bonus)
    state.data.purchases.history.push({ type: 'iap', itemId: pkg.id, price: 0, currency: 'real', timestamp: new Date().toISOString() })
    state.flush()
  }

  /** Restores non-consumables. Resolves to 'restored' | 'nothing' | 'failed'. */
  async restore() {
    if (!isNative)
      return state.adsBlocked ? 'restored' : 'nothing'
    try {
      await this.init()
      const { customerInfo } = await Purchases.restorePurchases()
      if (ownsRemoveAds(customerInfo)) {
        state.setAdsBlocked(true)
        return 'restored'
      }
      return 'nothing'
    }
    catch (error) {
      console.warn('[iap] restore failed', error)
      return 'failed'
    }
  }
}

export const iap = new IapService()
