import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'
import { defineStore } from 'pinia'

const SAVE_DEBOUNCE_MS = 1500
let pendingSaveTimer = null
let saveChain = Promise.resolve()

// Tarih formatındaki metinleri tekrar Date objesine çeviren yardımcı fonksiyon
function dateReviver(key, value) {
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
  if (typeof value === 'string' && isoDateRegex.test(value)) {
    return new Date(value)
  }
  return value
}

function getDefaultEndlessRuntime() {
  return {
    lives: 5,
    maxLives: 5,
    score: 0,
    grid: {
      cells: [], // { id, type, image, position, isFlipped, isMatched }
    },
  }
}

function getDefaultEndlessStats() {
  return {
    highScore: 0,
    totalGamesPlayed: 0,
    totalScore: 0,
    totalMatches: 0,
    totalErrors: 0,
    bestMatchStreak: 0,
  }
}

function normalizeEndlessStats(stats = {}) {
  const defaults = getDefaultEndlessStats()
  return {
    ...defaults,
    ...stats,
  }
}

// Manuel storage sistemi - Capacitor async sorununu çözer
class PlayerStorage {
  constructor() {
    this.isNative = Capacitor.isNativePlatform()
    this.storageKey = 'puzzmo-player'
    this.isInitialized = false
    this.initPromise = null
  }

  async init() {
    if (this.isInitialized)
      return
    if (this.initPromise)
      return this.initPromise

    this.initPromise = this._doInit()
    await this.initPromise
    this.isInitialized = true
  }

  async _doInit() {
    if (this.isNative) {
      console.log('[PlayerStorage] Using Capacitor Preferences')
    }
    else {
      console.log('[PlayerStorage] Using localStorage')
    }
  }

  async save(state) {
    try {
      await this.init()
      const data = JSON.stringify(state)

      if (this.isNative) {
        await Preferences.set({ key: this.storageKey, value: data })
      }
      else {
        localStorage.setItem(this.storageKey, data)
      }
    }
    catch (error) {
      console.error('[PlayerStorage] Failed to save:', error)
    }
  }

  async load() {
    try {
      await this.init()
      let data

      if (this.isNative) {
        const result = await Preferences.get({ key: this.storageKey })
        data = result.value
      }
      else {
        data = localStorage.getItem(this.storageKey)
      }

      if (!data)
        return null

      return JSON.parse(data, dateReviver)
    }
    catch (error) {
      console.error('[PlayerStorage] Failed to load:', error)
      return null
    }
  }

  async clear() {
    try {
      await this.init()

      if (this.isNative) {
        await Preferences.remove({ key: this.storageKey })
      }
      else {
        localStorage.removeItem(this.storageKey)
      }
    }
    catch (error) {
      console.error('[PlayerStorage] Failed to clear:', error)
    }
  }
}

const playerStorage = new PlayerStorage()

export const usePlayerStore = defineStore('player', {
  state: () => ({
    profile: { username: 'Gamer123', avatar: '', registeredAt: new Date('2024-10-26T10:00:00Z'), level: 1, experience: 0 },
    currencies: { coins: 1000, gems: 200 },
    inventory: { skins: ['skin_default'], powerUps: [] },
    selectedSkin: 'skin_default',
    purchases: { history: [], totalSpent: 0, isAdsBlocked: false },
    settings: {
      soundEnabled: true,
      musicEnabled: true,
      language: 'en',
      notifications: false,
      vibration: true,
      notificationPermissionAsked: false,
      performanceMode: 'auto',
    },
    lastLogin: null,
    adWatchStats: { count: 0, lastDate: '' },
    tutorials: { endless_mode_guide: false, shop_guide: false, map_guide: false, adventure_mode_guide: false, profile_guide: false },
    // Ada ilerlemesi ve unlock durumları
    adventure: {
      currentIslandId: null,
      unlockedIslands: ['village_island', 'town_center_island'],
      playerProgress: {}, // { islandId: { level: 1, highScore: 0 } }
    },
    // Endless runtime verisi (persist edilmez)
    endlessRuntime: getDefaultEndlessRuntime(),
    // Endless kalıcı istatistik verisi
    endlessStats: getDefaultEndlessStats(),
    interstitialClickCount: 0,
    _isLoaded: false,
  }),

  getters: {
    coins: state => state.currencies.coins,
    gems: state => state.currencies.gems,
    ownedSkins: state => state.inventory.skins,
    currentSkin: state => state.selectedSkin,
    // Geriye uyumluluk için runtime alanını eski isimle de expose et
    endless: state => state.endlessRuntime,
    playerLevel: state => Math.floor(state.profile.experience / 1000) + 1,
    experienceToNextLevel: (state) => {
      const currentLevel = Math.floor(state.profile.experience / 1000)
      const nextLevelExp = (currentLevel + 1) * 1000
      return nextLevelExp - state.profile.experience
    },
    hasSkin: state => skinId => state.inventory.skins.includes(skinId),
    getPowerUpAmount: state => (powerUpId) => {
      const powerUp = state.inventory.powerUps.find(p => p.id === powerUpId)
      return powerUp ? powerUp.amount : 0
    },
    adsBlocked: state => state.purchases.isAdsBlocked,
    adsWatchedToday(state) {
      const today = new Date().toISOString().slice(0, 10)
      return state.adWatchStats.lastDate === today ? state.adWatchStats.count : 0
    },
    adsLeftToday() {
      return 5 - this.adsWatchedToday
    },
    canWatchAd() {
      return this.adsLeftToday > 0
    },
    isIslandUnlocked: state => islandId => state.adventure.unlockedIslands.includes(islandId),
    getCurrentAdventureLevel: state => (islandId) => {
      return state.adventure.playerProgress[islandId]?.level || 1
    },
    getAdventureHighScore: state => (islandId) => {
      return state.adventure.playerProgress[islandId]?.highScore || 0
    },
  },

  actions: {
    getPersistableState() {
      return {
        profile: this.profile,
        currencies: this.currencies,
        inventory: this.inventory,
        selectedSkin: this.selectedSkin,
        purchases: this.purchases,
        settings: this.settings,
        lastLogin: this.lastLogin,
        adWatchStats: this.adWatchStats,
        tutorials: this.tutorials,
        adventure: this.adventure,
        endlessStats: this.endlessStats,
        interstitialClickCount: this.interstitialClickCount,
      }
    },

    queueSave() {
      if (!this._isLoaded)
        return

      if (pendingSaveTimer)
        clearTimeout(pendingSaveTimer)

      pendingSaveTimer = setTimeout(() => {
        pendingSaveTimer = null
        this.flushSaveNow()
      }, SAVE_DEBOUNCE_MS)
    },

    async flushSaveNow() {
      if (!this._isLoaded)
        return

      if (pendingSaveTimer) {
        clearTimeout(pendingSaveTimer)
        pendingSaveTimer = null
      }

      const payload = this.getPersistableState()
      saveChain = saveChain.then(() => playerStorage.save(payload))
      await saveChain
    },

    // Manuel storage actions
    async loadFromStorage() {
      if (this._isLoaded)
        return

      const savedData = await playerStorage.load()

      if (savedData) {
        const migrated = { ...savedData }

        // Legacy migrate: old `endless` -> new `endlessStats`
        if (migrated.endless && !migrated.endlessStats) {
          migrated.endlessStats = normalizeEndlessStats(migrated.endless.stats)
        }

        // New schema defaults
        migrated.endlessStats = normalizeEndlessStats(migrated.endlessStats)
        migrated.settings = {
          ...this.settings,
          ...(migrated.settings || {}),
          performanceMode: migrated.settings?.performanceMode || 'auto',
        }

        const fieldsToRestore = [
          'profile',
          'currencies',
          'inventory',
          'selectedSkin',
          'purchases',
          'settings',
          'lastLogin',
          'adWatchStats',
          'tutorials',
          'adventure',
          'endlessStats',
          'interstitialClickCount',
        ]

        fieldsToRestore.forEach((field) => {
          if (migrated[field] !== undefined) {
            this[field] = migrated[field]
          }
        })
      }

      // Runtime alanları her açılışta temiz başlangıç alır.
      this.endlessRuntime = getDefaultEndlessRuntime()
      this._isLoaded = true
      // Migration sonrası yeni formatı bir kez yaz.
      this.queueSave()
    },

    saveToStorage() {
      this.queueSave()
    },

    async clearStorage() {
      if (pendingSaveTimer) {
        clearTimeout(pendingSaveTimer)
        pendingSaveTimer = null
      }
      await playerStorage.clear()
      this._isLoaded = false
    },

    incrementInterstitialClickCount() {
      this.interstitialClickCount = (this.interstitialClickCount || 0) + 1
      this.queueSave()
    },

    addCoins(amount) {
      if (amount > 0) {
        this.currencies.coins += amount
        this.queueSave()
      }
    },
    spendCoins(amount) {
      if (this.currencies.coins >= amount) {
        this.currencies.coins -= amount
        this.queueSave()
        return true
      }
      return false
    },
    addGems(amount) {
      if (amount > 0) {
        this.currencies.gems += amount
        this.queueSave()
      }
    },
    spendGems(amount) {
      if (this.currencies.gems >= amount) {
        this.currencies.gems -= amount
        this.queueSave()
        return true
      }
      return false
    },
    purchaseSkin(skinId, price) {
      if (this.inventory.skins.includes(skinId))
        return false
      if (this.spendCoins(price)) {
        this.inventory.skins.push(skinId)
        this.purchases.history.push({
          type: 'skin',
          itemId: skinId,
          price,
          currency: 'coins',
          timestamp: new Date().toISOString(),
        })
        this.purchases.totalSpent += price
        this.queueSave()
        return true
      }
      return false
    },
    purchasePowerUp(powerUpId, quantity, price) {
      const totalCost = price * quantity
      if (this.spendCoins(totalCost)) {
        const existingPowerUp = this.inventory.powerUps.find(p => p.id === powerUpId)
        if (existingPowerUp) {
          existingPowerUp.amount += quantity
        }
        else {
          this.inventory.powerUps.push({ id: powerUpId, amount: quantity })
        }
        this.purchases.history.push({
          type: 'powerup',
          itemId: powerUpId,
          price: totalCost,
          quantity,
          currency: 'coins',
          timestamp: new Date().toISOString(),
        })
        this.purchases.totalSpent += totalCost
        this.queueSave()
        return true
      }
      return false
    },
    blockAds() {
      this.purchases.isAdsBlocked = true
      this.queueSave()
    },
    selectSkin(skinId) {
      if (this.inventory.skins.includes(skinId)) {
        this.selectedSkin = skinId
        this.queueSave()
        return true
      }
      return false
    },
    usePowerUp(powerUpId) {
      const powerUpIndex = this.inventory.powerUps.findIndex(p => p.id === powerUpId)
      if (powerUpIndex !== -1 && this.inventory.powerUps[powerUpIndex].amount > 0) {
        this.inventory.powerUps[powerUpIndex].amount--
        if (this.inventory.powerUps[powerUpIndex].amount === 0) {
          this.inventory.powerUps.splice(powerUpIndex, 1)
        }
        this.queueSave()
        return true
      }
      return false
    },
    addExperience(amount) {
      this.profile.experience += amount
      this.profile.level = this.playerLevel
      this.queueSave()
    },
    updateSettings(newSettings) {
      this.settings = { ...this.settings, ...newSettings }
      this.queueSave()
    },
    recordAdWatch() {
      const today = new Date().toISOString().slice(0, 10)
      if (this.adWatchStats.lastDate !== today) {
        this.adWatchStats.count = 0
        this.adWatchStats.lastDate = today
      }
      if (this.adWatchStats.count < 5) {
        this.adWatchStats.count++
        this.queueSave()
        return true
      }
      return false
    },
    markTutorialAsSeen(tutorialId) {
      if (tutorialId) {
        this.tutorials[tutorialId] = true
        this.queueSave()
      }
    },
    // Adventure mode actions
    selectAdventureIsland(islandId) {
      this.adventure.currentIslandId = islandId
      this.queueSave()
    },
    unlockIsland(islandId) {
      if (!this.adventure.unlockedIslands.includes(islandId)) {
        this.adventure.unlockedIslands.push(islandId)
        this.queueSave()
      }
    },
    purchaseIsland(islandId, cost) {
      if (this.spendCoins(cost)) {
        this.unlockIsland(islandId)
        this.purchases.history.push({
          type: 'island',
          itemId: islandId,
          price: cost,
          currency: 'coins',
          timestamp: new Date().toISOString(),
        })
        this.purchases.totalSpent += cost
        this.queueSave()
        return true
      }
      return false
    },
    completeAdventureLevel(islandId) {
      if (!this.adventure.playerProgress[islandId]) {
        this.adventure.playerProgress[islandId] = {
          level: 1,
          highScore: 0,
        }
      }
      this.adventure.playerProgress[islandId].level++
      this.queueSave()
    },
    updateAdventureHighScore(islandId, newScore) {
      if (!this.adventure.playerProgress[islandId]) {
        this.adventure.playerProgress[islandId] = {
          level: 1,
          highScore: 0,
        }
      }
      if (newScore > this.adventure.playerProgress[islandId].highScore) {
        this.adventure.playerProgress[islandId].highScore = newScore
        this.queueSave()
      }
    },
    // Endless mode actions
    resetEndlessGame() {
      this.endlessRuntime.lives = this.endlessRuntime.maxLives
      this.endlessRuntime.score = 0
      this.endlessRuntime.grid.cells = []
    },
    loseLife() {
      this.endlessRuntime.lives--
      this.endlessStats.totalErrors++
      this.queueSave()
    },
    addScore(points) {
      this.endlessRuntime.score += points
    },
    handleSuccessfulMatch() {
      this.endlessStats.totalMatches++
      this.queueSave()
    },
    finalizeEndlessStats() {
      this.endlessStats.totalGamesPlayed++
      this.endlessStats.totalScore += this.endlessRuntime.score
      if (this.endlessRuntime.score > this.endlessStats.highScore) {
        this.endlessStats.highScore = this.endlessRuntime.score
      }
      this.queueSave()
    },
  },
})
