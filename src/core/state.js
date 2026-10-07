import { getPowerUp, getSkin, ISLANDS, SKINS } from '@/data/catalog'
import { bus } from './bus'
import { storage } from './storage'

// Same key and schema as the previous (Vue) build so existing players keep progress.
const STORAGE_KEY = 'puzzmo-player'
const SAVE_DEBOUNCE_MS = 1200
const DAILY_AD_LIMIT = 5

const SUPPORTED_LANGUAGES = ['en', 'tr', 'de', 'es', 'it', 'pt', 'ru', 'zh', 'ja', 'ko', 'ar', 'hi', 'uk']

function detectLanguage() {
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language || 'en']
  for (const lang of langs) {
    const code = String(lang).slice(0, 2).toLowerCase()
    if (SUPPORTED_LANGUAGES.includes(code))
      return code
  }
  return 'en'
}

function defaultState() {
  return {
    profile: { username: 'Gamer', avatar: '', registeredAt: new Date().toISOString(), level: 1, experience: 0 },
    currencies: { coins: 1000, gems: 200 },
    // New players get a small starter kit so they discover power-ups early.
    inventory: { skins: ['skin_default'], powerUps: [{ id: 'freeze', amount: 2 }, { id: 'bomb', amount: 2 }, { id: 'flash', amount: 1 }] },
    selectedSkin: 'skin_default',
    purchases: { history: [], totalSpent: 0, isAdsBlocked: false },
    settings: {
      soundEnabled: true,
      musicEnabled: true,
      language: detectLanguage(),
      notifications: false,
      vibration: true,
      notificationPermissionAsked: false,
      performanceMode: 'auto',
    },
    lastLogin: null,
    adWatchStats: { count: 0, lastDate: '' },
    tutorials: { endless_mode_guide: false, shop_guide: false, map_guide: false, adventure_mode_guide: false, profile_guide: false },
    adventure: {
      currentIslandId: null,
      unlockedIslands: ISLANDS.filter(i => i.cost === 0).map(i => i.id),
      playerProgress: {},
    },
    endlessStats: { highScore: 0, totalGamesPlayed: 0, totalScore: 0, totalMatches: 0, totalErrors: 0, bestMatchStreak: 0 },
    adventureStats: { levelsCompleted: 0, levelsFailed: 0, totalMatches: 0 },
    interstitialClickCount: 0,
  }
}

const today = () => new Date().toISOString().slice(0, 10)

class PlayerState {
  constructor() {
    this.data = defaultState()
    this.loaded = false
    this.isNewPlayer = true
    this._saveTimer = null
    this._saveChain = Promise.resolve()
  }

  async load() {
    const raw = await storage.get(STORAGE_KEY)
    if (raw) {
      try {
        const saved = JSON.parse(raw)
        const base = defaultState()
        this.isNewPlayer = false
        // Old saves did not have a starter kit; never inject it into them.
        base.inventory = { skins: ['skin_default'], powerUps: [] }
        this.data = {
          ...base,
          ...saved,
          settings: { ...base.settings, ...saved.settings },
          purchases: { ...base.purchases, ...saved.purchases },
          inventory: { ...base.inventory, ...saved.inventory },
          adventure: { ...base.adventure, ...saved.adventure },
          tutorials: { ...base.tutorials, ...saved.tutorials },
          adWatchStats: { ...base.adWatchStats, ...saved.adWatchStats },
          endlessStats: { ...base.endlessStats, ...(saved.endlessStats ?? saved.endless?.stats) },
          adventureStats: { ...base.adventureStats, ...saved.adventureStats },
        }
        delete this.data.endless
        delete this.data.endlessRuntime
        if (!this.data.inventory.skins.includes('skin_default'))
          this.data.inventory.skins.unshift('skin_default')
      }
      catch (error) {
        console.error('[state] corrupted save, starting fresh', error)
      }
    }
    this.data.lastLogin = new Date().toISOString()
    this.loaded = true
    this.save()
  }

  /** Debounced persist. */
  save() {
    if (!this.loaded)
      return
    clearTimeout(this._saveTimer)
    this._saveTimer = setTimeout(() => this.flush(), SAVE_DEBOUNCE_MS)
  }

  /** Immediate persist (used when the app goes to background). */
  flush() {
    if (!this.loaded)
      return this._saveChain
    clearTimeout(this._saveTimer)
    this._saveTimer = null
    const payload = JSON.stringify(this.data)
    this._saveChain = this._saveChain.then(() => storage.set(STORAGE_KEY, payload))
    return this._saveChain
  }

  // --- Getters ------------------------------------------------------------
  get coins() { return this.data.currencies.coins }
  get settings() { return this.data.settings }
  get adsBlocked() { return !!this.data.purchases.isAdsBlocked }
  get selectedSkin() { return getSkin(this.data.selectedSkin) }
  get endlessStats() { return this.data.endlessStats }
  get adventureStats() { return this.data.adventureStats }

  powerUpAmount(id) {
    return this.data.inventory.powerUps.find(p => p.id === id)?.amount ?? 0
  }

  ownsSkin(id) {
    return this.data.inventory.skins.includes(id)
  }

  isIslandUnlocked(id) {
    return this.data.adventure.unlockedIslands.includes(id)
  }

  islandLevel(id) {
    return this.data.adventure.playerProgress[id]?.level ?? 1
  }

  islandHighScore(id) {
    return this.data.adventure.playerProgress[id]?.highScore ?? 0
  }

  get adsWatchedToday() {
    return this.data.adWatchStats.lastDate === today() ? this.data.adWatchStats.count : 0
  }

  get adsLeftToday() {
    return Math.max(0, DAILY_AD_LIMIT - this.adsWatchedToday)
  }

  // --- Currency -----------------------------------------------------------
  addCoins(amount) {
    if (amount <= 0)
      return
    this.data.currencies.coins += Math.floor(amount)
    bus.emit('state:coins', this.coins)
    this.save()
  }

  spendCoins(amount) {
    if (this.coins < amount)
      return false
    this.data.currencies.coins -= amount
    bus.emit('state:coins', this.coins)
    this.save()
    return true
  }

  _recordPurchase(type, itemId, price, extra = {}) {
    this.data.purchases.history.push({ type, itemId, price, currency: 'coins', timestamp: new Date().toISOString(), ...extra })
    if (this.data.purchases.history.length > 200)
      this.data.purchases.history.splice(0, this.data.purchases.history.length - 200)
    this.data.purchases.totalSpent += price
  }

  // --- Shop ----------------------------------------------------------------
  buySkin(id) {
    const skin = SKINS.find(s => s.id === id)
    if (!skin || this.ownsSkin(id) || !this.spendCoins(skin.price))
      return false
    this.data.inventory.skins.push(id)
    this._recordPurchase('skin', id, skin.price)
    bus.emit('state:inventory')
    this.save()
    return true
  }

  selectSkin(id) {
    if (!this.ownsSkin(id))
      return false
    this.data.selectedSkin = id
    bus.emit('state:inventory')
    this.save()
    return true
  }

  buyPowerUp(id, quantity = 1) {
    const pu = getPowerUp(id)
    if (!pu || !this.spendCoins(pu.price * quantity))
      return false
    this.addPowerUp(id, quantity)
    this._recordPurchase('powerup', id, pu.price * quantity, { quantity })
    this.save()
    return true
  }

  addPowerUp(id, quantity = 1) {
    const entry = this.data.inventory.powerUps.find(p => p.id === id)
    if (entry)
      entry.amount += quantity
    else
      this.data.inventory.powerUps.push({ id, amount: quantity })
    bus.emit('state:inventory')
    this.save()
  }

  consumePowerUp(id) {
    const index = this.data.inventory.powerUps.findIndex(p => p.id === id)
    if (index === -1 || this.data.inventory.powerUps[index].amount <= 0)
      return false
    this.data.inventory.powerUps[index].amount--
    if (this.data.inventory.powerUps[index].amount === 0)
      this.data.inventory.powerUps.splice(index, 1)
    bus.emit('state:inventory')
    this.save()
    return true
  }

  setAdsBlocked(value = true) {
    if (this.data.purchases.isAdsBlocked === value)
      return
    this.data.purchases.isAdsBlocked = value
    bus.emit('state:ads', value)
    this.flush()
  }

  // --- Settings ------------------------------------------------------------
  updateSettings(patch) {
    Object.assign(this.data.settings, patch)
    bus.emit('state:settings', this.data.settings)
    this.save()
  }

  markTutorialSeen(id) {
    this.data.tutorials[id] = true
    this.save()
  }

  // --- Ads ------------------------------------------------------------------
  recordAdWatch() {
    const stats = this.data.adWatchStats
    if (stats.lastDate !== today()) {
      stats.count = 0
      stats.lastDate = today()
    }
    if (stats.count >= DAILY_AD_LIMIT)
      return false
    stats.count++
    this.save()
    return true
  }

  incrementInterstitialCounter() {
    this.data.interstitialClickCount = (this.data.interstitialClickCount || 0) + 1
    this.save()
    return this.data.interstitialClickCount
  }

  // --- Adventure -------------------------------------------------------------
  selectIsland(id) {
    this.data.adventure.currentIslandId = id
    this.save()
  }

  unlockIsland(id) {
    const island = ISLANDS.find(i => i.id === id)
    if (!island || this.isIslandUnlocked(id) || !this.spendCoins(island.cost))
      return false
    this.data.adventure.unlockedIslands.push(id)
    this._recordPurchase('island', id, island.cost)
    this.save()
    return true
  }

  completeIslandLevel(id, score, matches) {
    const progress = this.data.adventure.playerProgress[id] ??= { level: 1, highScore: 0 }
    progress.level++
    progress.highScore = Math.max(progress.highScore, score)
    this.data.adventureStats.levelsCompleted++
    this.data.adventureStats.totalMatches += matches
    this.save()
  }

  failIslandLevel(matches) {
    this.data.adventureStats.levelsFailed++
    this.data.adventureStats.totalMatches += matches
    this.save()
  }

  // --- Endless ----------------------------------------------------------------
  finishEndlessGame({ score, matches, errors, bestStreak }) {
    const stats = this.data.endlessStats
    stats.totalGamesPlayed++
    stats.totalScore += score
    stats.totalMatches += matches
    stats.totalErrors += errors
    stats.bestMatchStreak = Math.max(stats.bestMatchStreak, bestStreak)
    const isRecord = score > stats.highScore
    if (isRecord)
      stats.highScore = score
    this.save()
    return isRecord
  }
}

export const state = new PlayerState()
export { DAILY_AD_LIMIT, SUPPORTED_LANGUAGES }
