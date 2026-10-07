import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePlayerStore } from './playerStore'

export const useShopStore = defineStore('shop', () => {
  // === STATE ===
  // Aktif olan sekme
  const activeTab = ref('skins') // 'skins' | 'power-ups'

  // Static skin data with translation keys (like gameStore islands)
  const skinData = ref([
    { id: 'skin_default', nameKey: 'default_skin', image: '/images/cards/blue_card.png', price: 0 },
    { id: 'skin_black', nameKey: 'night_guardian', image: '/images/cards/black_card.png', price: 2200 },
    { id: 'skin_yellow', nameKey: 'gold_shot', image: '/images/cards/yellow_card.png', price: 2600 },
    { id: 'skin_white', nameKey: 'pure_justice', image: '/images/cards/white_card.png', price: 2000 },
    { id: 'skin_red', nameKey: 'red_rage', image: '/images/cards/red_card.png', price: 2400 },
    { id: 'skin_purple', nameKey: 'purple_sun', image: '/images/cards/purple_card.png', price: 2500 },
    { id: 'skin_orange', nameKey: 'orange_dynamite', image: '/images/cards/orange_card.png', price: 1900 },
    { id: 'skin_lightblue', nameKey: 'blue_ice', image: '/images/cards/lightblue_card.png', price: 1950 },
    { id: 'skin_green', nameKey: 'turquoise_power', image: '/images/cards/green_card.png', price: 2100 },
  ])

  const powerUpData = ref([
    { id: 'freeze', nameKey: 'freeze', descriptionKey: 'freeze_description', price: 300, image: '/images/powerups/freeze.png' },
    { id: 'bomb', nameKey: 'bomb', descriptionKey: 'bomb_description', price: 450, image: '/images/powerups/bomb.png' },
    { id: 'pink_ixr', nameKey: 'pink_ixr', descriptionKey: 'pink_ixr_description', price: 600, image: '/images/powerups/pink_ixr.png' },
    { id: 'flash', nameKey: 'flash', descriptionKey: 'flash_description', price: 800, image: '/images/powerups/flash.png' },
    { id: 'red_ixr', nameKey: 'red_ixr', descriptionKey: 'red_ixr_description', price: 1000, image: '/images/powerups/red_ixr.png' },
    { id: 'sledgehammer', nameKey: 'sledgehammer', descriptionKey: 'sledgehammer_description', price: 1250, image: '/images/powerups/sledgehammer.png' },
    { id: 'yellow_ixr', nameKey: 'yellow_ixr', descriptionKey: 'yellow_ixr_description', price: 1500, image: '/images/powerups/yellow_ixr.png' },
  ])

  // === REACTIVE COMPUTED PROPERTIES ===
  // Reactive skins with translations (like gameStore islands)
  const allSkins = computed(() => {
    const { t } = useI18n()
    return skinData.value.map(skin => ({
      ...skin,
      name: t(skin.nameKey),
    }))
  })

  // Reactive powerups with translations
  const allPowerUps = computed(() => {
    const { t } = useI18n()
    return powerUpData.value.map(powerUp => ({
      ...powerUp,
      name: t(powerUp.nameKey),
      description: t(powerUp.descriptionKey),
    }))
  })

  // === GETTERS ===
  // Satın alınabilir skin'ler (player inventory ile birleştiriliyor)
  const availableSkins = computed(() => {
    const playerStore = usePlayerStore()

    return allSkins.value.map(skin => ({
      ...skin,
      isOwned: playerStore.inventory.skins.includes(skin.id),
      isSelected: playerStore.selectedSkin === skin.id,
      canBuy: !playerStore.inventory.skins.includes(skin.id) && playerStore.currencies.coins >= skin.price,
    }))
  })

  // Satın alınabilir powerup'lar (player inventory ile birleştiriliyor)
  const availablePowerUps = computed(() => {
    const playerStore = usePlayerStore()

    return allPowerUps.value.map((powerUp) => {
      const playerPowerUp = playerStore.inventory.powerUps.find(p => p.id === powerUp.id)
      return {
        ...powerUp,
        quantity: playerPowerUp ? playerPowerUp.amount : 0,
        canBuy: playerStore.currencies.coins >= powerUp.price,
      }
    })
  })

  // Aktif sekmeye göre filtrelenmiş ürünleri döndüren computed property
  const visibleItems = computed(() => {
    if (activeTab.value === 'skins') {
      return availableSkins.value
    }
    else {
      return availablePowerUps.value
    }
  })

  // Currency getters (PlayerStore'dan)
  const userCoins = computed(() => {
    const playerStore = usePlayerStore()
    return playerStore.currencies.coins
  })

  const userGems = computed(() => {
    const playerStore = usePlayerStore()
    return playerStore.currencies.gems
  })

  // === ACTIONS ===
  /**
   * Aktif sekmeyi değiştirir.
   * @param {'skins' | 'power-ups'} tabName - Yeni sekmenin adı
   */
  function setActiveTab(tabName) {
    activeTab.value = tabName
  }

  /**
   * Skin satın alma işlemi.
   * @param {string} skinId - Satın alınacak skin'in ID'si
   */
  function purchaseSkin(skinId) {
    const playerStore = usePlayerStore()
    const skin = allSkins.value.find(s => s.id === skinId)

    if (!skin) {
      console.warn('Skin bulunamadı!')
      return { success: false, messageKey: 'skin_not_found' }
    }

    if (playerStore.inventory.skins.includes(skinId)) {
      console.warn('Bu skin zaten sahiplenilmiş!')
      return { success: false, messageKey: 'skin_already_owned' }
    }

    if (playerStore.currencies.coins < skin.price) {
      console.warn('Yetersiz coin!')
      return { success: false, messageKey: 'not_enough_balance' }
    }

    const success = playerStore.purchaseSkin(skinId, skin.price)

    if (success) {
      // Başarılı satın alma için UI feedback
      console.log(`Skin başarıyla satın alındı: ${skin.name}`)
      return { success: true, messageKey: 'skin_purchase_success', data: { name: skin.name } }
    }
    return { success: false, messageKey: 'skin_purchase_failed' }
  }

  /**
   * PowerUp satın alma işlemi.
   * @param {string} powerUpId - Satın alınacak powerup'ın ID'si
   * @param {number} quantity - Satın alınacak miktar
   */
  function purchasePowerUp(powerUpId, quantity = 1) {
    const playerStore = usePlayerStore()
    const powerUp = allPowerUps.value.find(p => p.id === powerUpId)

    if (!powerUp) {
      console.warn('PowerUp bulunamadı!')
      return { success: false, messageKey: 'powerup_not_found' }
    }

    const totalCost = powerUp.price * quantity
    if (playerStore.currencies.coins < totalCost) {
      console.warn('Yetersiz coin!')
      return { success: false, messageKey: 'not_enough_balance' }
    }

    const success = playerStore.purchasePowerUp(powerUpId, quantity, powerUp.price)

    if (success) {
      console.log(`PowerUp başarıyla satın alındı: ${powerUp.name} x${quantity}`)
      return { success: true, messageKey: 'powerup_purchase_success', data: { name: powerUp.name, quantity } }
    }
    return { success: false, messageKey: 'powerup_purchase_failed' }
  }

  /**
   * Skin seçme işlemi.
   * @param {string} skinId - Seçilecek skin'in ID'si
   */
  function selectSkin(skinId) {
    const playerStore = usePlayerStore()

    if (!playerStore.inventory.skins.includes(skinId)) {
      console.warn('Bu skin sahiplenilmemiş!')
      return { success: false, messageKey: 'skin_not_owned' }
    }

    const success = playerStore.selectSkin(skinId)
    if (success) {
      const skin = allSkins.value.find(s => s.id === skinId)
      console.log(`Skin seçildi: ${skin.name}`)
      return { success: true, messageKey: 'skin_selected', data: { name: skin.name } }
    }
    return { success: false, messageKey: 'skin_selection_failed' }
  }

  /**
   * PowerUp kullanma işlemi.
   * @param {string} powerUpId - Kullanılacak powerup'ın ID'si
   */
  function usePowerUp(powerUpId) {
    const playerStore = usePlayerStore()
    const success = playerStore.usePowerUp(powerUpId)
    if (success) {
      const powerUp = allPowerUps.value.find(p => p.id === powerUpId)
      console.log(`PowerUp kullanıldı: ${powerUp.name}`)
      return { success: true, message: `${powerUp.name} kullanıldı!` }
    }
    return { success: false, message: 'PowerUp kullanılamadı!' }
  }

  // === MOBILE SPECIFIC ACTIONS ===
  /**
   * Mağaza item'ını satın almak için dokunmatik feedback
   * @param {string} itemType - 'skin' | 'powerup'
   * @param {string} itemId - Item ID'si
   * @param {number} quantity - Miktar (powerup için)
   */
  function purchaseWithFeedback(itemType, itemId, quantity = 1) {
    const playerStore = usePlayerStore()
    let result = { success: false, message: '' }

    if (itemType === 'skin') {
      result = purchaseSkin(itemId)
    }
    else if (itemType === 'powerup') {
      result = purchasePowerUp(itemId, quantity)
    }

    if (result.success) {
      // Mobile feedback (vibration, sound, vb.)
      if (playerStore.settings.vibration && navigator.vibrate) {
        navigator.vibrate(100) // 100ms vibration
      }
    }
    else {
      // Error feedback
      if (playerStore.settings.vibration && navigator.vibrate) {
        navigator.vibrate([50, 50, 50]) // Error vibration pattern
      }
    }

    return result
  }

  /**
   * Mağaza kategorisi değişimi için animasyon tetikleyici
   * @param {string} tabName - Yeni sekme adı
   */
  function switchTabWithAnimation(tabName) {
    // Tab switching animation için
    const oldTab = activeTab.value
    setActiveTab(tabName)

    return {
      oldTab,
      newTab: tabName,
      animationDuration: 300,
    }
  }

  // === UTILITY FUNCTIONS ===
  /**
   * Skin ID'sine göre skin detaylarını getir
   * @param {string} skinId - Skin ID'si
   */
  function getSkinById(skinId) {
    return allSkins.value.find(skin => skin.id === skinId)
  }

  /**
   * PowerUp ID'sine göre powerup detaylarını getir
   * @param {string} powerUpId - PowerUp ID'si
   */
  function getPowerUpById(powerUpId) {
    return allPowerUps.value.find(powerUp => powerUp.id === powerUpId)
  }

  /**
   * Yeni skin ekle (admin için)
   * @param {object} skinData - Skin verisi
   */
  function addSkin(skinData) {
    skinData.value.push(skinData)
  }

  /**
   * Yeni powerup ekle (admin için)
   * @param {object} powerUpData - PowerUp verisi
   */
  function addPowerUp(powerUpData) {
    powerUpData.value.push(powerUpData)
  }

  /**
   * Skin güncelle (admin için)
   * @param {string} skinId - Skin ID'si
   * @param {object} updateData - Güncellenecek veriler
   */
  function updateSkin(skinId, updateData) {
    const index = skinData.value.findIndex(skin => skin.id === skinId)
    if (index !== -1) {
      skinData.value[index] = { ...skinData.value[index], ...updateData }
    }
  }

  /**
   * PowerUp güncelle (admin için)
   * @param {string} powerUpId - PowerUp ID'si
   * @param {object} updateData - Güncellenecek veriler
   */
  function updatePowerUp(powerUpId, updateData) {
    const index = powerUpData.value.findIndex(powerUp => powerUp.id === powerUpId)
    if (index !== -1) {
      powerUpData.value[index] = { ...powerUpData.value[index], ...updateData }
    }
  }

  return {
    // State
    activeTab,
    skinData,
    powerUpData,

    // Reactive computed getters
    allSkins,
    allPowerUps,
    visibleItems,
    availableSkins,
    availablePowerUps,
    userCoins,
    userGems,

    // Actions
    setActiveTab,
    purchaseSkin,
    purchasePowerUp,
    selectSkin,
    usePowerUp,
    purchaseWithFeedback,
    switchTabWithAnimation,

    // Utility
    getSkinById,
    getPowerUpById,
    addSkin,
    addPowerUp,
    updateSkin,
    updatePowerUp,
  }
})
