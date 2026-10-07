<script setup>
import GameHeader from '@/components/GameHeader.vue'
import PauseMenu from '@/components/PauseMenu.vue'
import PowerUpsBar from '@/components/PowerUpsBar.vue'
import { alertService } from '@/core/services/AlertService.js'
import {
  animateCardFlip,
  animateCardSelection,
  createMatchParticles,
  getCorrectMatchAnimation,
  getFlashPowerUpAnimation,
  getWrongMatchAnimation,
  triggerBackgroundFlash,
} from '@/core/services/game-animations.js'
import { powerUpFXHandler } from '@/core/services/powerup-effects/PowerUpFXHandler.js'
import { powerUpService } from '@/core/services/PowerUpService.js'
import { soundService } from '@/core/services/SoundService.js'
import { tutorialService } from '@/core/services/TutorialService.js'
import vibrationService from '@/core/services/VibrationService' // YENİ: Titreşim servisi eklendi.
import { useCoreStore } from '@/store/coreStore.js'
import { useGameStore } from '@/store/gameStore.js'
import { usePlayerStore } from '@/store/playerStore.js'
import { useShopStore } from '@/store/shopStore.js'
import { gsap } from 'gsap'
import { computed, h, markRaw, nextTick, onBeforeUnmount, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import IslandEffect from './IslandEffect.vue'

const { t } = useI18n()

// --- Mağazalar ---
const gameStore = useGameStore()
const playerStore = usePlayerStore()
const coreStore = useCoreStore()
const shopStore = useShopStore()

// --- Oyun Durumu Referansları ---
const gameState = ref('loading')
const cards = ref([])
const selectedCards = ref([])
const matchedPairCount = ref(0)
const isProcessing = ref(false)
const countdownValue = ref(3)
const dangerLevel = ref(0)
const gameLoopId = ref(null)
const showPauseMenu = ref(false)
const wrongMatchCount = ref(0)

// --- Power-up Referansları ---
const isPowerUpActive = ref(false)
const interactionLock = ref(false)
const isDangerFrozen = ref(false)
const gameContainer = ref(null)
const countdownOverlayEl = ref(null)

// --- Oyun Parametreleri ---
const GRID_ROWS = 3
const GRID_COLS = 4
const CARD_COUNT = GRID_ROWS * GRID_COLS
const PAIR_COUNT = CARD_COUNT / 2

// --- Dinamik Hesaplamalar (Computed) ---
const currentIsland = computed(() => {
  if (!playerStore.adventure.currentIslandId)
    return null
  return gameStore.getIslandWithName(playerStore.adventure.currentIslandId)
})
const currentLevelNumber = computed(() => {
  if (!currentIsland.value)
    return 1
  return playerStore.getCurrentAdventureLevel(currentIsland.value.id)
})

const requiredMatches = computed(() => 8 + (currentLevelNumber.value * 2))
const levelRewardCoins = computed(() => 50 + (currentLevelNumber.value * 15))

const dangerIncreaseRate = computed(() => {
  const level = currentLevelNumber.value
  const baseRate = 2.2
  const increasePerLevel = 0.25
  const capLevel = 15
  const effectiveLevel = Math.min(level, capLevel)
  return baseRate + ((effectiveLevel - 1) * increasePerLevel)
})
const dangerDecreaseOnMatch = computed(() => Math.max(2, 10 - (currentLevelNumber.value * 0.5)))

const currentSkin = computed(() => shopStore.getSkinById(playerStore.selectedSkin))
const cardBackgroundStyle = computed(() => {
  const skin = currentSkin.value
  return skin?.image
    ? {
        backgroundImage: `url(${skin.image})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }
    : { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }
})

const adventurePowerUps = ['freeze', 'bomb', 'flash', 'sledgehammer']
const allPowerUpsForDisplay = computed(() => {
  return shopStore.allPowerUps
    .filter(p => adventurePowerUps.includes(p.id))
    .map(powerUpDetails => ({
      ...powerUpDetails,
      amount: playerStore.getPowerUpAmount(powerUpDetails.id),
    }))
})

const headerStats = computed(() => [
  {
    icon: '/images/icons/star.png',
    value: currentLevelNumber.value,
    label: t('level'),
    styles: 'bg-yellow-400/80 border-yellow-500',
  },
  {
    icon: '/images/icons/cards.png',
    value: `${matchedPairCount.value}/${requiredMatches.value}`,
    label: t('match'),
    styles: 'bg-indigo-400/80 border-purple-500',
  },
  {
    icon: '/images/icons/cancel.png',
    value: wrongMatchCount.value,
    label: t('wrong'),
    styles: 'bg-rose-400/80 border-red-500',
  },
])

// --- Alert Şablonları ---
const GameIntroAlertComponent = {
  setup() {
    const rules = [
      { icon: '/images/icons/cards.png', text: `${t('required_matches', { count: requiredMatches.value })}` },
      { icon: '/images/icons/star.png', text: `${t('level_fight', { level: currentLevelNumber.value })}` },
      { icon: '/images/icons/coin.png', text: `${t('level_reward_coins', { count: levelRewardCoins.value })}` },
    ]
    return () => h('div', { class: 'space-y-4' }, [
      h('p', { class: 'text-amber-800 text-center' }, `${t('welcome_to_island', { name: currentIsland.value.name })}`),
      h('div', { class: 'flex justify-center items-center flex-wrap min-w-[100px] gap-2' }, rules.map(rule =>
        h('div', { class: 'h-10 bg-amber-800/80 backdrop-blur-sm border-2 border-amber-500 rounded-2xl shadow-lg text-white text-shadow-md flex justify-between items-center px-2 gap-3 text-sm' }, [
          h('img', { src: rule.icon, class: 'w-7 h-7 scale-[2]' }),
          h('p', { class: '' }, rule.text),
        ]),
      )),
    ])
  },
}
const GameEndAlertComponent = {
  props: ['isWin', 'message', 'stats'],
  setup(props) {
    return () => h('div', { class: 'space-y-4' }, [
      h('p', { class: 'text-amber-800 text-center font-semibold' }, props.message),
      h('div', { class: 'flex justify-center items-center flex-wrap min-w-[150px] gap-2' }, props.stats.map(stat => h('div', {
        class: `min-w-[160px] h-10 backdrop-blur-sm border-2 rounded-2xl shadow-lg text-white flex justify-between items-center px-2 gap-3 text-sm ${stat.styles}`,
      }, [
        h('div', { class: 'flex items-center gap-2' }, [
          h('img', { src: stat.icon, alt: '', class: 'w-9 h-9' }),
          h('p', { class: 'font-bold text-2xl drop-shadow-lg text-white' }, stat.value),
        ]),
        h('div', { class: 'text-white text-xs opacity-90 font-medium' }, stat.label),
      ]))),
    ])
  },
}

// --- Oyun Mantığı ---
function generateCards() {
  const availableCards = [...gameStore.cards.availableCards]
  const shuffled = availableCards.sort(() => 0.5 - Math.random())
  const selected = shuffled.slice(0, PAIR_COUNT)
  cards.value = [...selected, ...selected]
    .sort(() => 0.5 - Math.random())
    .map((card, index) => ({
      ...card,
      uniqueId: `${card.id}-${index}-${Date.now()}`,
      isFlipped: false,
      isMatched: false,
    }))
}

async function initializeGame() {
  if (!currentIsland.value) {
    coreStore.goTo('Map')
    return
  }
  gameState.value = 'loading'
  dangerLevel.value = 0
  matchedPairCount.value = 0
  wrongMatchCount.value = 0
  selectedCards.value = []
  isProcessing.value = false

  generateCards()
  await nextTick()

  showGameIntro()
}

async function restartLevel() {
  if (!currentIsland.value) {
    coreStore.goTo('Map')
    return
  }
  gameState.value = 'loading'
  dangerLevel.value = 0
  matchedPairCount.value = 0
  wrongMatchCount.value = 0
  selectedCards.value = []
  isProcessing.value = false

  generateCards()
  await nextTick()

  gameState.value = 'countdown'
  startCountdown()
}

async function showGameIntro() {
  if (alertService.alert.isVisible)
    return
  const result = await alertService.showWithSlot({
    title: t('adventure_mode_title', { name: currentIsland.value.name }),
    customContent: 'slot-content',
    slotComponent: markRaw(GameIntroAlertComponent),
    confirmButtonText: t('start_game'),
    cancelButtonText: t('back_to_map'),
  })

  if (result) {
    gameState.value = 'countdown'
    startCountdown()
  }
  else {
    coreStore.goTo('Map')
  }
}

async function startCountdown() {
  cards.value.forEach(card => card.isFlipped = true)
  await nextTick()
  gsap.set('.card-flip', { rotateY: 180 })

  countdownValue.value = 3
  await nextTick()

  if (!countdownOverlayEl.value) {
    gameState.value = 'playing'
    startGameLoop()
    flipAllCards(false)
    return
  }

  const countdownNumberEl = countdownOverlayEl.value.querySelector('span')
  gsap.set(countdownOverlayEl.value, { opacity: 1 })

  const tl = gsap.timeline({
    onComplete: () => {
      gsap.to(countdownOverlayEl.value, {
        opacity: 0,
        duration: 0.3,
        onComplete: () => {
          gameState.value = 'playing'
          startGameLoop()
        },
      })
      flipAllCards(false)
    },
  })

  for (let i = 3; i > 0; i--) {
    tl.call(() => vibrationService.impact('light')) // YENİ: Geri sayımda titreşim
      .set(countdownNumberEl, { textContent: i, scale: 2, opacity: 0 })
      .to(countdownNumberEl, { scale: 1, opacity: 1, duration: 0.4, ease: 'power2.out' })
      .to(countdownNumberEl, { opacity: 0, scale: 0.5, duration: 0.3, ease: 'power2.in' }, '+=0.6')
  }
}

function flipAllCards(show, duration = 0.5) {
  cards.value.forEach(card => card.isFlipped = show)
  gsap.to('.card-flip', { rotateY: show ? 180 : 0, duration, stagger: 0.03, ease: 'power2.inOut' })
}

function startGameLoop() {
  let lastTime = performance.now()

  function loop(currentTime) {
    if (gameState.value !== 'playing')
      return
    const deltaTime = currentTime - lastTime
    lastTime = currentTime
    if (!isDangerFrozen.value) {
      dangerLevel.value = Math.min(100, dangerLevel.value + (deltaTime / 1000) * dangerIncreaseRate.value)
    }
    if (dangerLevel.value >= 100) {
      endGame(false, t('danger_level_reached'))
      return
    }
    gameLoopId.value = requestAnimationFrame(loop)
  }

  gameLoopId.value = requestAnimationFrame(loop)
}

async function checkBoardAndRespawnIfNeeded() {
  const levelCompleted = checkLevelCompletion()
  if (!levelCompleted) {
    const allOnBoardMatched = cards.value.every(c => c.isMatched)
    if (allOnBoardMatched) {
      await new Promise(resolve => setTimeout(resolve, 500))
      await respawnBoard()
    }
  }
}

async function selectCard(card) {
  if (isProcessing.value || interactionLock.value || card.isMatched || gameState.value !== 'playing') {
    return
  }

  const selectedIndex = selectedCards.value.findIndex(c => c.uniqueId === card.uniqueId)

  if (selectedIndex !== -1) {
    soundService.playEffect('click_effect_2')
    vibrationService.impact('light') // YENİ: Kart seçimini geri almada titreşim.
    card.isFlipped = false
    selectedCards.value.splice(selectedIndex, 1)
    await nextTick()
    animateCardFlip(card.uniqueId, false)
    animateCardSelection(card.uniqueId, false)
    return
  }

  if (selectedCards.value.length < 2) {
    soundService.playEffect('click_effect_2')
    vibrationService.impact('light') // YENİ: Kart seçiminde titreşim.
    card.isFlipped = true
    selectedCards.value.push(card)
    await nextTick()
    animateCardFlip(card.uniqueId, true)
    animateCardSelection(card.uniqueId, true)

    if (selectedCards.value.length === 2) {
      isProcessing.value = true
      const [card1, card2] = selectedCards.value

      // DEĞİŞİKLİK 2: Kart seçimleri arasındaki bekleme süresi azaltılarak oyun daha seri hale getirildi.
      setTimeout(() => {
        if (card1.type === card2.type) {
          soundService.playEffect('pop')
          vibrationService.vibrate('success') // YENİ: Doğru eşleşme.
          handleCorrectMatch(card1, card2)
        }
        else {
          soundService.playEffect('swipe')
          vibrationService.impact('medium') // YENİ: Yanlış eşleşme.
          handleWrongMatch(card1, card2)
        }
      }, 250) // Süre 600ms'den 250ms'ye düşürüldü.
    }
  }
}

function handleDataUpdateForMatch(card1, card2) {
  card1.isMatched = true
  card2.isMatched = true
  matchedPairCount.value++
  dangerLevel.value = Math.max(0, dangerLevel.value - dangerDecreaseOnMatch.value)
}

function handleCorrectMatch(card1, card2, matchType = 'manual') {
  handleDataUpdateForMatch(card1, card2)
  triggerBackgroundFlash(gameContainer.value, 'success')

  const el1 = document.querySelector(`[data-card-id="${card1.uniqueId}"]`)
  const el2 = document.querySelector(`[data-card-id="${card2.uniqueId}"]`)
  const elements = [el1, el2].filter(Boolean)

  const onComplete = () => {
    selectedCards.value = []
    isProcessing.value = false
    checkLevelCompletion() || checkBoardAndRespawnIfNeeded()
  }

  if (elements.length > 0) {
    createMatchParticles(el1, el2, 'success', gameContainer.value)
    const matchTimeline = getCorrectMatchAnimation(elements, gameContainer.value, matchType)
    matchTimeline.eventCallback('onComplete', onComplete)
  }
  else {
    onComplete()
  }
}

function handleWrongMatch(card1, card2) {
  wrongMatchCount.value++
  dangerLevel.value = Math.min(100, dangerLevel.value + 5)
  triggerBackgroundFlash(gameContainer.value, 'fail')

  const el1 = document.querySelector(`[data-card-id="${card1.uniqueId}"]`)
  const el2 = document.querySelector(`[data-card-id="${card2.uniqueId}"]`)
  const elements = [el1, el2].filter(Boolean)

  const onComplete = () => {
    card1.isFlipped = false
    card2.isFlipped = false
    animateCardFlip(card1.uniqueId, false)
    animateCardSelection(card1.uniqueId, false)
    animateCardFlip(card2.uniqueId, false)
    animateCardSelection(card2.uniqueId, false)

    selectedCards.value = []
    isProcessing.value = false
  }

  if (elements.length > 0) {
    createMatchParticles(el1, el2, 'fail', gameContainer.value)
    const wrongMatchTimeline = getWrongMatchAnimation(elements)
    wrongMatchTimeline.eventCallback('onComplete', onComplete)
  }
  else {
    onComplete()
  }
}

async function respawnBoard() {
  isProcessing.value = true
  // YENİ: Kartlar yenilenirken güçlü titreşim.
  vibrationService.impact('heavy')
  await gsap.to('.card-container.invisible', { scale: 0, opacity: 0, duration: 0.3, stagger: 0.03, ease: 'power2.in' })

  generateCards()
  await nextTick()

  gsap.set('.card-flip', { rotateY: 180 })
  gsap.set('.card-container', { scale: 0, opacity: 0, visibility: 'visible' })
  await gsap.to('.card-container', {
    scale: 1,
    opacity: 1,
    duration: 0.4,
    stagger: 0.04,
    ease: 'back.out(1.7)',
  })

  await new Promise(resolve => setTimeout(resolve, 1200))
  flipAllCards(false, 0.5)

  setTimeout(() => {
    isProcessing.value = false
  }, 500)
}

function checkLevelCompletion() {
  if (gameState.value === 'playing' && matchedPairCount.value >= requiredMatches.value) {
    endGame(true, t('level_completed'))
    return true
  }
  return false
}

async function endGame(isWin, message) {
  if (gameState.value === 'levelComplete' || gameState.value === 'gameOver')
    return
  cancelAnimationFrame(gameLoopId.value)

  gameState.value = isWin ? 'levelComplete' : 'gameOver'

  const earnedCoins = isWin ? levelRewardCoins.value : Math.floor(matchedPairCount.value * 2)
  if (earnedCoins > 0)
    playerStore.addCoins(earnedCoins)

  if (isWin) {
    soundService.playEffect('win_game')
    vibrationService.vibrate('success') // YENİ: Seviye kazanıldığında.
    playerStore.completeAdventureLevel(currentIsland.value.id)
    const score = matchedPairCount.value * 100 - wrongMatchCount.value * 10
    playerStore.updateAdventureHighScore(currentIsland.value.id, score)
  }
  else {
    soundService.playEffect('time_is_up')
    vibrationService.impact('heavy') // YENİ: Seviye kaybedildiğinde.
  }

  const statsData = [
    {
      icon: '/images/icons/coin.png',
      value: `+${Math.max(0, earnedCoins)}`,
      label: t('coin'),
      styles: 'bg-yellow-400/80 border-yellow-500',
    },
    {
      icon: '/images/icons/cards.png',
      value: matchedPairCount.value,
      label: t('match'),
      styles: 'bg-indigo-400/80 border-purple-500',
    },
    {
      icon: '/images/icons/cancel.png',
      value: wrongMatchCount.value,
      label: t('wrong'),
      styles: 'bg-rose-400/80 border-red-500',
    },
  ]

  const result = await alertService.showWithSlot({
    title: isWin ? t('level_completed') : t('game_over'),
    customContent: 'slot-content',
    slotComponent: markRaw(GameEndAlertComponent),
    slotProps: { isWin, message, stats: statsData },
    confirmButtonText: isWin ? t('back_to_map') : t('restart_level'),
    cancelButtonText: t('back_to_map'),
  })

  if (result && !isWin) {
    setTimeout(() => restartLevel(), 150)
  }
  else {
    coreStore.goTo('Map')
  }
}

function usePowerUp(powerUp) {
  if (isPowerUpActive.value || interactionLock.value || playerStore.getPowerUpAmount(powerUp.id) <= 0 || gameState.value !== 'playing')
    return

  const context = {
    isAdventure: true,
    cardsRef: cards,
    isProcessingRef: isProcessing,
    interactionLockRef: interactionLock,
    isDangerFrozenRef: isDangerFrozen,
    handleCorrectMatch,
    flashBoardAnimation: flashBoard,
    checkBoardAndRespawnIfNeeded,
    gameContainer,
    playerStore,
    t,
  }

  const wasUsed = powerUpService.activate(powerUp.id, context)

  if (wasUsed) {
    vibrationService.impact('medium') // YENİ: Güçlendirme kullanıldığında.
    playerStore.usePowerUp(powerUp.id)
    isPowerUpActive.value = true

    const context = {
    // Belki burada zaten başka özellikleriniz vardır
      isAdventure: true, // örnek
      duration: powerUp.duration, // örnek
      t, // <<< YAPMANIZ GEREKEN EKLEME BU SATIR
    }

    // 4. Şimdi zenginleştirilmiş context ile fonksiyonu çağırın
    //    (Bu kısım zaten sizde doğru)
    powerUpFXHandler.play(powerUp.id, context, (animationDuration = 500) => {
      setTimeout(() => {
        isPowerUpActive.value = false
      }, animationDuration)
    })
  }
}

function flashBoard(onComplete) {
  const unmatchedCardElements = cards.value
    .filter(c => !c.isMatched && !c.isFlipped)
    .map(c => document.querySelector(`[data-card-id="${c.uniqueId}"]`))
    .filter(Boolean)

  if (unmatchedCardElements.length === 0) {
    if (onComplete)
      onComplete()
    return
  }

  cards.value.forEach((c) => {
    if (!c.isMatched)
      c.isFlipped = true
  })

  getFlashPowerUpAnimation(unmatchedCardElements, () => {
    cards.value.forEach((c) => {
      if (!c.isMatched)
        c.isFlipped = false
    })
    if (onComplete)
      onComplete()
  })
}

function togglePause() {
  if (isPowerUpActive.value)
    return
  if (gameState.value === 'playing' || gameState.value === 'paused') {
    showPauseMenu.value = !showPauseMenu.value
    if (showPauseMenu.value) {
      gameState.value = 'paused'
      cancelAnimationFrame(gameLoopId.value)
    }
    else {
      gameState.value = 'playing'
      startGameLoop()
    }
  }
}

async function showAdventureTutorial() {
  return tutorialService.show({
    tutorialId: 'adventure_mode_guide',
    finishButtonText: t('adventure_mode_guide_finish_button'),
    pages: [
      {
        title: t('adventure_mode_guide_page1_title'),
        text: t('adventure_mode_guide_page1_text'),
        image: '/images/mascots/showing_right.png',
      },
      {
        title: t('adventure_mode_guide_page2_title'),
        text: t('adventure_mode_guide_page2_text'),
        image: '/images/mascots/water_save.png',
      },
      {
        title: t('adventure_mode_guide_page3_title'),
        text: t('adventure_mode_guide_page3_text'),
        image: '/images/mascots/discover.png',
      },
      {
        title: t('adventure_mode_guide_page4_title'),
        text: t('adventure_mode_guide_page4_text'),
        image: '/images/icons/powerup_icon.png',
      },
      {
        title: '',
        text: t('adventure_mode_guide_page5_text'),
        image: '/images/mascots/rich2.png',
      },
      {
        title: t('adventure_mode_guide_page5_title'),
        text: t('adventure_mode_guide_page5_text'),
        image: '/images/mascots/happy.png',
      },
    ],
  })
}

// --- Navigation Protection ---
function setupNavigationProtection() {
  // Sayfa yenileme kontrolü
  const handleBeforeUnload = (event) => {
    if (gameState.value === 'playing') {
      event.preventDefault()
      event.returnValue = ''
    }
  }

  // Capacitor app state change kontrolü
  const handleAppStateChange = () => {
    coreStore.updateLastActiveTime()
  }

  // Visibility change kontrolü (sayfa arka plana gidince)
  const handleVisibilityChange = () => {
    if (document.hidden) {
      // Sayfa arka plana gitti
      coreStore.updateLastActiveTime()
    }
    else {
      // Sayfa tekrar aktif oldu - kontrol et ve gerekirse yönlendir
      if (coreStore.checkAndRedirectToHome()) {
        return
      }
      coreStore.updateLastActiveTime()
    }
  }

  // Event listener'ları ekle
  window.addEventListener('beforeunload', handleBeforeUnload)
  document.addEventListener('visibilitychange', handleVisibilityChange)

  // Capacitor event'leri varsa ekle
  if (window.Capacitor) {
    window.Capacitor.Plugins.App?.addListener('appStateChange', handleAppStateChange)
  }

  // Cleanup fonksiyonu döndür
  return () => {
    window.removeEventListener('beforeunload', handleBeforeUnload)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    if (window.Capacitor) {
      window.Capacitor.Plugins.App?.removeAllListeners()
    }
  }
}

let cleanupNavigationProtection = null

onMounted(() => {
  // Oyun sayfası aktif olduğunu işaretle
  coreStore.setGamePageActive(true)
  gameStore.isGameActive = true

  // Navigation protection kurulumu
  cleanupNavigationProtection = setupNavigationProtection()

  showAdventureTutorial()
  if (!playerStore.adventure.currentIslandId) {
    playerStore.selectAdventureIsland('village_island')
  }
  initializeGame()
})

onBeforeUnmount(() => {
  // Navigation protection temizliği
  if (cleanupNavigationProtection) {
    cleanupNavigationProtection()
  }
})

onUnmounted(() => {
  gameStore.isGameActive = false
  coreStore.setGamePageActive(false)
  cancelAnimationFrame(gameLoopId.value)
})
</script>

<template>
  <div v-if="currentIsland" class="w-full h-screen flex bg-cardboard-background overflow-hidden">
    <!-- Sol Taraf -->
    <div
      class="w-1/3 h-full flex flex-col items-center justify-between relative bg-gray-800/50"
    >
      <div
        class="z-10 text-center text-white p-4 bg-black/50 rounded-lg backdrop-blur-sm w-full absolute top-4 left-1/2 -translate-x-1/2 max-w-[90%]"
      >
        <h2 class="text-xl lg:text-2xl font-bold titre">
          {{ currentIsland.name }}
        </h2>
      </div>

      <IslandEffect
        :island-theme="currentIsland.theme"
        :danger-level="dangerLevel"
        :background-image="`/images/island_backgrounds/${currentIsland.theme}.jpg`"
      />
    </div>

    <!-- Sağ Taraf -->
    <div ref="gameContainer" class="w-2/3 h-full flex flex-col relative">
      <div id="powerup-effect-container" />
      <GameHeader :stats="headerStats" :is-power-up-active="isPowerUpActive" @pause-click="togglePause" />
      <!-- DEĞİŞİKLİK 1: Kartların mobil yatay ve tablet görünümlerinde ortalanması sağlandı. -->
      <div class="flex-grow flex items-center justify-center px-10">
        <div class="w-3/4 lg:w-full">
          <div class="grid gap-5 " style="display: grid; grid-template-columns: repeat(4, 1fr); grid-template-rows: repeat(3, 1fr); gap: 10px;">
            <div
              v-for="card in cards" :key="card.uniqueId"
              :data-card-id="card.uniqueId"
              class="card-container w-[90px] h-[100px] lg:w-[120px] lg:h-[130px] perspective-1000"
              :class="{ invisible: card.isMatched }"
              @click="selectCard(card)"
            >
              <div class="relative w-full h-full preserve-3d card-flip cursor-pointer">
                <div
                  class="card-face card-face-back absolute inset-0 backface-hidden rounded-lg"
                  :style="cardBackgroundStyle"
                />
                <div
                  class="card-face card-face-front absolute inset-0 backface-hidden rotate-y-180 flex items-center justify-center h-full w-full"
                >
                  <div
                    class="rounded-lg border-2 border-blue-300 bg-white/90 h-full w-full flex items-center justify-center"
                  >
                    <img :src="card.image" :alt="card.type" class="w-3/4 h-3/4 object-contain">
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="w-1/4 lg:w-24  flex flex-col items-center z-10">
          <p class="titre text-[10px]">
            {{ t('powerups') }}
          </p>
          <div class="h-full overflow-y-auto">
            <PowerUpsBar
              :power-ups="allPowerUpsForDisplay" :is-power-up-active="isPowerUpActive"
              @use-powerup="usePowerUp"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Overlay'ler -->
    <div
      v-if="gameState === 'countdown'" ref="countdownOverlayEl"
      class="countdown-overlay absolute inset-0 bg-black/70 flex items-center justify-center z-50 text-white text-9xl font-bold titre pointer-events-none"
    >
      <span>{{ countdownValue }}</span>
    </div>
    <PauseMenu :is-visible="showPauseMenu" leave-path="Map" :leave-path-name="t('back_to_map')" @resume="togglePause" @close="togglePause" />
  </div>
  <div
    v-else
    class="w-full h-screen flex items-center justify-center bg-cardboard-background text-white titre text-2xl"
  >
    {{ t('loading_map_info') }}
  </div>
</template>

<style scoped>
.perspective-1000 {
  perspective: 1000px;
}

.preserve-3d {
  transform-style: preserve-3d;
}

.backface-hidden {
  backface-visibility: hidden;
}

.rotate-y-180 {
  transform: rotateY(180deg);
}

.card-flip {
  transition: transform 0.6s;
  transform-style: preserve-3d;
}

.card-container {
  transition: opacity 0.3s, transform 0.3s;
}

.card-face-front {
  transition: box-shadow 0.3s ease-in-out;
}

#powerup-effect-container {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 150;
  overflow: hidden;
}

.background-flash {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.background-flash.bg-success {
  background: radial-gradient(circle, rgba(52, 211, 153, 0.6) 0%, rgba(52, 211, 153, 0) 70%);
}

.background-flash.bg-fail {
  background: radial-gradient(circle, rgba(239, 68, 68, 0.6) 0%, rgba(239, 68, 68, 0) 70%);
}

.match-particle {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  z-index: 200;
}

.match-particle.success {
  width: 12px;
  height: 12px;
  background: radial-gradient(circle, #fde047, #34d399);
}

.match-particle.fail {
  width: 10px;
  height: 10px;
  background: radial-gradient(circle, #fca5a5, #ef4444);
  border-radius: 20%;
}
</style>
