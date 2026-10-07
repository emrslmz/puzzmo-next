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
  getSpawnAnimation,
  getWrongMatchAnimation,
  triggerBackgroundFlash,
} from '@/core/services/game-animations.js'
import { performanceService } from '@/core/services/PerformanceService.js'
import { mobileService } from '@/core/services/MobileService'
import { powerUpFXHandler } from '@/core/services/powerup-effects/PowerUpFXHandler.js'
import { powerUpService } from '@/core/services/PowerUpService.js'
import { soundService } from '@/core/services/SoundService.js'
import { toastService } from '@/core/services/ToastService.js'
import { tutorialService } from '@/core/services/TutorialService.js'
import vibrationService from '@/core/services/VibrationService'
import { useCoreStore } from '@/store/coreStore.js'
import { useGameStore } from '@/store/gameStore.js'
import { usePlayerStore } from '@/store/playerStore.js'
import { useShopStore } from '@/store/shopStore.js'
import { App } from '@capacitor/app'
import { gsap } from 'gsap'
import { computed, h, markRaw, nextTick, onBeforeUnmount, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const gameStore = useGameStore()
const playerStore = usePlayerStore()
const shopStore = useShopStore()
const coreStore = useCoreStore()
const { t } = useI18n()

const gameContainer = ref(null)
const spawnTimer = ref(null)
const flipTimer = ref(null)
const selectedCards = ref([])
const singleCardSelectionTimer = ref(null)
const isProcessingMatch = ref(false)
const isGameInitialized = ref(false)
const correctMatchesInGame = ref(0)
const showPauseMenu = ref(false)
const gridFullStartTime = ref(null)
const gridFullCountdown = ref(10)
const gridFullInterval = ref(null)
const isGameOver = ref(false)
const gameStartTime = ref(null)

const isSpawnFrozen = ref(false)
const scoreMultiplier = ref(1)
const isPowerUpActive = ref(false)
const interactionLock = ref(false)

const cardElements = new Map()
let cleanupNavigationProtection = null
let backButtonListener = null

const performanceConfig = computed(() => performanceService.getConfig(playerStore.settings.performanceMode))

const gameProgress = computed(() => Math.min((playerStore.endlessRuntime.grid.cells.length / 18) * 100, 100))
const progressColor = computed(() => {
  if (isSpawnFrozen.value)
    return '#3498db'
  const progress = gameProgress.value
  if (progress < 30)
    return '#10b981'
  if (progress < 60)
    return '#f59e0b'
  if (progress < 80)
    return '#f97316'
  return '#ef4444'
})

const showProgressShine = computed(() => performanceConfig.value.showProgressShine)
const showGridFullWarning = computed(() => {
  return performanceConfig.value.showSirenEffects && gridFullStartTime.value !== null && gameStore.isGameActive
})

const currentSkin = computed(() => shopStore.getSkinById(playerStore.selectedSkin))
const spawnSpeed = computed(() => {
  if (!gameStartTime.value)
    return 2500

  const baseSpeed = 2500
  const minSpeed = 350
  const maxSpeedReduction = baseSpeed - minSpeed

  const scoreProgress = Math.min(playerStore.endlessRuntime.score / 40000, 1)
  const timeElapsed = (Date.now() - gameStartTime.value) / 1000
  const timeProgress = Math.min(timeElapsed / 240, 1)

  const combinedProgress = Math.min(scoreProgress * 0.8 + timeProgress * 0.2, 1)
  const easedProgress = combinedProgress ** 1.7
  const targetSpeed = baseSpeed - (maxSpeedReduction * easedProgress)

  const cardCount = playerStore.endlessRuntime.grid.cells.length
  const occupancy = cardCount / 18

  let occupancyModifier = 1.0
  if (occupancy < 0.6) {
    occupancyModifier = 0.3 + (occupancy / 0.6) * 0.7
  }

  const finalSpeed = targetSpeed * occupancyModifier
  return Math.max(finalSpeed, minSpeed)
})

const cardBackgroundStyle = computed(() => {
  const skin = currentSkin.value
  return skin?.image
    ? { backgroundImage: `url(${skin.image})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }
    : { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }
})

const endlessPowerUps = ['bomb', 'sledgehammer', 'flash', 'pink_ixr', 'red_ixr', 'yellow_ixr', 'freeze']
const allPowerUpsForDisplay = computed(() => {
  return shopStore.allPowerUps
    .filter(p => endlessPowerUps.includes(p.id))
    .map(powerUpDetails => ({
      ...powerUpDetails,
      amount: playerStore.getPowerUpAmount(powerUpDetails.id),
    }))
})

const headerStats = computed(() => [
  { icon: '/images/icons/heart.png', value: `${playerStore.endlessRuntime.lives}/${playerStore.endlessRuntime.maxLives}`, label: t('lives_header'), styles: 'bg-pink-400/80 border-rose-500' },
  { icon: '/images/icons/cards.png', value: correctMatchesInGame.value, label: t('correct'), styles: 'bg-green-400/80 border-lime-500' },
  { icon: '/images/icons/star.png', value: playerStore.endlessRuntime.score.toLocaleString(), label: t('score'), styles: 'bg-amber-400/80 border-amber-500' },
])

const GameIntroAlertComponent = {
  setup() {
    const rules = [
      { icon: '/images/icons/heart.png', text: `${t('lives')} ${playerStore.endlessRuntime.maxLives}` },
      { icon: '/images/icons/cards.png', text: t('match_cards') },
      { icon: '/images/icons/star.png', text: t('score_to_coin') },
      { icon: '/images/icons/cancel.png', text: t('lose_life_on_wrong_match') },
    ]
    return () => h('div', { class: 'space-y-4' }, [
      h('h3', { class: 'text-lg font-bold text-center text-amber-900' }, `${t('highest_score')}: ${playerStore.endlessStats.highScore.toLocaleString()}`),
      h('p', { class: 'text-amber-800 text-center' }, t('endless_mode_intro_text')),
      h('div', { class: 'flex justify-center items-center flex-wrap min-w-[100px] gap-2' }, rules.map(rule =>
        h('div', { class: 'h-10 bg-amber-800/80 backdrop-blur-sm border-2 border-amber-500 rounded-2xl shadow-lg text-white text-shadow-md flex justify-between items-center px-2 gap-3 text-sm' }, [
          h('img', { src: rule.icon, class: 'w-7 h-7 scale-[2]' }),
          h('p', null, rule.text),
        ]),
      )),
    ])
  },
}

const GameEndAlertComponent = {
  props: ['reason', 'stats'],
  setup(props) {
    return () => h('div', { class: 'space-y-4' }, [
      h('p', { class: 'text-amber-800 text-center' }, props.reason),
      h('div', { class: 'flex justify-center items-center flex-wrap min-w-[150px] gap-2' }, props.stats.map(stat => h('div', {
        class: `min-w-[160px] h-10 backdrop-blur-sm border-2 rounded-2xl shadow-lg text-white flex justify-between items-center px-2 gap-3 text-sm ${stat.bgColor} ${stat.borderColor}`,
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

watch(() => playerStore.endlessRuntime.lives, (newLives) => {
  if (newLives <= 0 && isGameInitialized.value && !isGameOver.value) {
    endGame(t('lives_are_over'), 'heart_broken')
  }
})

function setCardElement(cardId, element) {
  if (!cardId)
    return
  if (element) {
    cardElements.set(cardId, element)
  }
  else {
    cardElements.delete(cardId)
  }
}

function getCardElement(cardId) {
  return cardElements.get(cardId) || null
}

async function showGameIntro() {
  if (alertService.alert.isVisible)
    return

  const result = await alertService.showWithSlot({
    title: t('endless_mode_title'),
    customContent: 'slot-content',
    slotComponent: markRaw(GameIntroAlertComponent),
    confirmButtonText: t('start_game'),
    cancelButtonText: t('back_to_home'),
  })

  if (result)
    initGame()
  else
    coreStore.goToHome()
}

function initGame() {
  clearAllTimers()
  gameStore.startGame('endless')
  playerStore.resetEndlessGame()
  isGameOver.value = false
  selectedCards.value = []
  isProcessingMatch.value = false
  isGameInitialized.value = true
  correctMatchesInGame.value = 0
  showPauseMenu.value = false
  gridFullStartTime.value = null
  isSpawnFrozen.value = false
  scoreMultiplier.value = 1
  isPowerUpActive.value = false
  interactionLock.value = false
  gameStartTime.value = Date.now()

  setTimeout(() => {
    startCardSpawning()
    startRandomFlips()
  }, 500)
}

function startCardSpawning() {
  const spawnCard = () => {
    if (isGameOver.value || !gameStore.isGameActive || gameStore.isPaused || !isGameInitialized.value) {
      if (!isGameOver.value)
        spawnTimer.value = setTimeout(spawnCard, spawnSpeed.value)
      return
    }

    if (selectedCards.value.length > 0 || isProcessingMatch.value || isSpawnFrozen.value) {
      spawnTimer.value = setTimeout(spawnCard, spawnSpeed.value)
      return
    }

    if (getAvailableGridPositions().length > 0) {
      if (gridFullStartTime.value) {
        gridFullStartTime.value = null
        clearInterval(gridFullInterval.value)
        gridFullInterval.value = null
      }
      spawnSingleCard()
    }
    else {
      if (!gridFullStartTime.value) {
        vibrationService.impact('heavy')
        gridFullStartTime.value = Date.now()
        gridFullCountdown.value = 10
        gridFullInterval.value = setInterval(() => {
          gridFullCountdown.value--
        }, 1000)
      }
      else if (Date.now() - gridFullStartTime.value >= 10000) {
        endGame(t('screen_filled'), 'full_grid')
        return
      }
    }

    spawnTimer.value = setTimeout(spawnCard, spawnSpeed.value)
  }

  spawnTimer.value = setTimeout(spawnCard, spawnSpeed.value)
}

function usePowerUp(powerUp) {
  if (isPowerUpActive.value || interactionLock.value || playerStore.getPowerUpAmount(powerUp.id) <= 0)
    return

  const context = {
    isAdventure: false,
    cardsRef: computed(() => playerStore.endlessRuntime.grid.cells),
    isProcessingRef: isProcessingMatch,
    interactionLockRef: interactionLock,
    isSpawnFrozenRef: isSpawnFrozen,
    scoreMultiplierRef: scoreMultiplier,
    handleCorrectMatch,
    flashBoardAnimation: flashBoard,
    playerStore,
    t,
  }

  const wasUsed = powerUpService.activate(powerUp.id, context)

  if (wasUsed) {
    vibrationService.impact('medium')
    playerStore.usePowerUp(powerUp.id)
    isPowerUpActive.value = true

    powerUpFXHandler.play(
      powerUp.id,
      { gameContainer, t },
      (animationDuration = 500) => {
        setTimeout(() => {
          isPowerUpActive.value = false
        }, animationDuration)
      },
    )
  }
}

async function selectCard(card) {
  if (isProcessingMatch.value || interactionLock.value || !card || card.isMatched || showPauseMenu.value || !gameStore.isGameActive)
    return

  const selectedIndex = selectedCards.value.findIndex(c => c.id === card.id)
  const cardEl = getCardElement(card.id)

  if (selectedIndex !== -1) {
    soundService.playEffect('click_effect')
    vibrationService.impact('light')
    card.isFlipped = false
    selectedCards.value.splice(selectedIndex, 1)
    await nextTick()
    animateCardFlip(cardEl, false, performanceConfig.value.flipDuration)
    animateCardSelection(cardEl, false, { selectedScale: performanceConfig.value.selectionScale })
    return
  }

  if (selectedCards.value.length < 2) {
    soundService.playEffect('click_effect_2')
    vibrationService.impact('light')
    clearTimeout(singleCardSelectionTimer.value)

    if (!card.isFlipped) {
      card.isFlipped = true
      animateCardFlip(cardEl, true, performanceConfig.value.flipDuration)
    }

    selectedCards.value.push(card)
    await nextTick()
    animateCardSelection(cardEl, true, { selectedScale: performanceConfig.value.selectionScale })

    if (selectedCards.value.length === 1) {
      singleCardSelectionTimer.value = setTimeout(() => {
        if (selectedCards.value.length === 1 && selectedCards.value[0].id === card.id) {
          card.isFlipped = false
          animateCardFlip(cardEl, false, performanceConfig.value.flipDuration)
          animateCardSelection(cardEl, false, { selectedScale: performanceConfig.value.selectionScale })
          selectedCards.value = []
        }
      }, 5000)
    }

    if (selectedCards.value.length === 2) {
      isProcessingMatch.value = true
      const [card1, card2] = selectedCards.value

      setTimeout(() => {
        if (card1.type === card2.type) {
          soundService.playEffect('pop')
          vibrationService.vibrate('success')
          vibrationService.impact('light')
          handleCorrectMatch(card1, card2)
        }
        else {
          soundService.playEffect('swipe')
          vibrationService.impact('medium')
          handleWrongMatch(card1, card2)
        }
      }, 600)
    }
  }
}

function handleDataUpdateForMatch(card1, card2) {
  card1.isMatched = true
  card2.isMatched = true
  correctMatchesInGame.value++
  playerStore.handleSuccessfulMatch()
  const baseScore = 50
  const finalScore = baseScore * scoreMultiplier.value
  playerStore.addScore(finalScore)
}

function handleCorrectMatch(card1, card2, matchType = 'manual') {
  handleDataUpdateForMatch(card1, card2)
  triggerBackgroundFlash(gameContainer.value, 'success', { disabled: !performanceConfig.value.showBackgroundFlash })

  const card1Element = getCardElement(card1.id)
  const card2Element = getCardElement(card2.id)
  const elements = [card1Element, card2Element].filter(Boolean)

  const onComplete = () => {
    removeCardFromGrid(card1.id)
    removeCardFromGrid(card2.id)
    isProcessingMatch.value = false
    selectedCards.value = []
  }

  if (elements.length > 0) {
    createMatchParticles(card1Element, card2Element, 'success', gameContainer.value, {
      particleMultiplier: performanceConfig.value.particleMultiplier,
    })
    const matchTimeline = getCorrectMatchAnimation(elements, gameContainer.value, matchType, {
      speed: performanceConfig.value.matchAnimationSpeed,
    })
    matchTimeline.eventCallback('onComplete', onComplete)
  }
  else {
    onComplete()
  }
}

function handleWrongMatch(card1, card2) {
  playerStore.loseLife()
  if (playerStore.endlessRuntime.lives <= 0) {
    gameStore.endGame()
  }

  triggerBackgroundFlash(gameContainer.value, 'fail', { disabled: !performanceConfig.value.showBackgroundFlash })

  const card1Element = getCardElement(card1.id)
  const card2Element = getCardElement(card2.id)
  const elements = [card1Element, card2Element].filter(Boolean)

  const onComplete = () => {
    card1.isFlipped = false
    card2.isFlipped = false
    animateCardFlip(card1Element, false, performanceConfig.value.flipDuration)
    animateCardSelection(card1Element, false, { selectedScale: performanceConfig.value.selectionScale })
    animateCardFlip(card2Element, false, performanceConfig.value.flipDuration)
    animateCardSelection(card2Element, false, { selectedScale: performanceConfig.value.selectionScale })
    selectedCards.value = []
    isProcessingMatch.value = false
  }

  if (elements.length > 0) {
    createMatchParticles(card1Element, card2Element, 'fail', gameContainer.value, {
      particleMultiplier: performanceConfig.value.particleMultiplier,
    })
    const wrongMatchTimeline = getWrongMatchAnimation(elements, {
      speed: performanceConfig.value.matchAnimationSpeed,
    })
    wrongMatchTimeline.eventCallback('onComplete', onComplete)
  }
  else {
    onComplete()
  }
}

function flashBoard(onComplete) {
  const unmatched = playerStore.endlessRuntime.grid.cells.filter(c => !c.isMatched && !c.isFlipped)
  const elements = unmatched
    .map(c => getCardElement(c.id))
    .filter(Boolean)

  if (elements.length === 0) {
    toastService.show(t('no_cards_to_show'), 'info')
    if (onComplete)
      onComplete()
    return
  }

  unmatched.forEach(c => c.isFlipped = true)

  getFlashPowerUpAnimation(elements, () => {
    unmatched.forEach((c) => {
      if (!selectedCards.value.some(sc => sc.id === c.id)) {
        c.isFlipped = false
      }
    })
    if (onComplete)
      onComplete()
  }, {
    speed: performanceConfig.value.matchAnimationSpeed,
  })
}

function spawnSingleCard() {
  const availablePositions = getAvailableGridPositions()
  if (availablePositions.length === 0)
    return

  const existingTypes = playerStore.endlessRuntime.grid.cells.map(c => c.type)
  const typeCount = existingTypes.reduce((acc, type) => {
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {})
  const singleCards = Object.keys(typeCount).filter(type => typeCount[type] % 2 !== 0)

  let cardToSpawn
  if (singleCards.length > 0 && Math.random() < 0.7) {
    const cardType = singleCards[Math.floor(Math.random() * singleCards.length)]
    cardToSpawn = { ...gameStore.cards.availableCards.find(c => c.type === cardType) }
  }
  else {
    cardToSpawn = { ...gameStore.getRandomCard() }
  }

  const position = availablePositions[Math.floor(Math.random() * availablePositions.length)]
  const newCard = {
    ...cardToSpawn,
    id: `${cardToSpawn.id}_${Date.now()}`,
    position,
    isFlipped: true,
    isMatched: false,
  }
  playerStore.endlessRuntime.grid.cells.push(newCard)

  nextTick(() => {
    const cardWrapper = getCardElement(newCard.id)
    if (!cardWrapper)
      return

    getSpawnAnimation(cardWrapper, () => {
      const cardInGrid = playerStore.endlessRuntime.grid.cells.find(c => c.id === newCard.id)
      if (cardInGrid && !selectedCards.value.some(sc => sc.id === newCard.id)) {
        cardInGrid.isFlipped = false
      }
    }, {
      mode: performanceConfig.value.spawnAnimationMode,
    })
  })
}

function removeCardFromGrid(cardId) {
  const index = playerStore.endlessRuntime.grid.cells.findIndex(c => c.id === cardId)
  if (index !== -1)
    playerStore.endlessRuntime.grid.cells.splice(index, 1)
  cardElements.delete(cardId)
}

async function endGame(reason, type) {
  if (isGameOver.value)
    return

  isGameOver.value = true
  isGameInitialized.value = false
  soundService.playEffect('time_is_up')
  vibrationService.impact('heavy')

  playerStore.finalizeEndlessStats()
  gameStore.endGame()
  clearAllTimers()

  const effectContainer = document.getElementById('powerup-effect-container')
  if (effectContainer)
    effectContainer.innerHTML = ''

  isPowerUpActive.value = false
  interactionLock.value = false
  scoreMultiplier.value = 1
  isSpawnFrozen.value = false
  gsap.killTweensOf(['.bonus-banner', '.bonus-vignette', '.corner-light', '.icicle', '.frost-overlay'])

  const earnedCoins = Math.floor(playerStore.endlessRuntime.score * 0.1)
  const bonusCoins = correctMatchesInGame.value * 5
  const totalCoins = earnedCoins + bonusCoins

  if (totalCoins > 0)
    playerStore.addCoins(totalCoins)

  await playerStore.flushSaveNow()

  const statsData = [
    { icon: '/images/icons/star.png', label: t('score'), value: playerStore.endlessRuntime.score.toLocaleString(), bgColor: 'bg-amber-400', borderColor: 'border-amber-500' },
    { icon: '/images/icons/cards.png', label: t('match'), value: correctMatchesInGame.value, bgColor: 'bg-green-400', borderColor: 'border-green-500' },
    { icon: '/images/icons/coin.png', label: t('coin'), value: `+${totalCoins.toLocaleString()}`, bgColor: 'bg-yellow-400', borderColor: 'border-yellow-500' },
  ]

  const isLeftGame = type === 'left_game'
  const confirmText = isLeftGame ? undefined : t('play_again')
  const cancelText = isLeftGame ? t('ok') : t('back_to_home')

  const result = await alertService.showWithSlot({
    title: t('game_over'),
    customContent: 'slot-content',
    slotComponent: markRaw(GameEndAlertComponent),
    slotProps: { reason, stats: statsData },
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
  })

  if (result) {
    initGame()
  }
  else {
    coreStore.goToHome()
  }
}

function togglePause() {
  if (showPauseMenu.value)
    resumeGame()
  else
    pauseGame()
}

function pauseGame() {
  if (isPowerUpActive.value)
    return

  gameStore.pauseGame()
  showPauseMenu.value = true
  clearAllTimers()
}

function resumeGame() {
  gameStore.resumeGame()
  showPauseMenu.value = false
  if (gameStore.isGameActive && isGameInitialized.value) {
    startCardSpawning()
    startRandomFlips()
  }
}

function getCardsForPosition(index) {
  const row = Math.floor(index / 6)
  const col = index % 6
  return playerStore.endlessRuntime.grid.cells.filter(card => card.position.row === row && card.position.col === col)
}

function getAvailableGridPositions() {
  const occupied = new Set(playerStore.endlessRuntime.grid.cells.map(cell => `${cell.position.row}-${cell.position.col}`))
  const available = []
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 6; col++) {
      if (!occupied.has(`${row}-${col}`))
        available.push({ row, col })
    }
  }
  return available
}

function startRandomFlips() {
  if (!performanceConfig.value.randomFlipEnabled)
    return

  const randomFlip = () => {
    if (isGameOver.value)
      return

    if (gameStore.isGameActive && !gameStore.isPaused && isGameInitialized.value && !isPowerUpActive.value) {
      const unselectedCards = playerStore.endlessRuntime.grid.cells.filter(card => !card.isMatched && !card.isFlipped && !selectedCards.value.includes(card))
      if (unselectedCards.length > 0) {
        const randomCard = unselectedCards[Math.floor(Math.random() * unselectedCards.length)]
        const randomCardElement = getCardElement(randomCard.id)
        randomCard.isFlipped = true
        animateCardFlip(randomCardElement, true, performanceConfig.value.flipDuration)

        setTimeout(() => {
          if (randomCard && !randomCard.isMatched && !selectedCards.value.includes(randomCard)) {
            randomCard.isFlipped = false
            animateCardFlip(randomCardElement, false, performanceConfig.value.flipDuration)
          }
        }, 1200 * performanceConfig.value.matchAnimationSpeed)
      }
    }

    if (gameStore.isGameActive && isGameInitialized.value && !isGameOver.value) {
      flipTimer.value = setTimeout(
        randomFlip,
        Math.random() * performanceConfig.value.randomFlipMax + performanceConfig.value.randomFlipMin,
      )
    }
  }

  flipTimer.value = setTimeout(
    randomFlip,
    Math.random() * performanceConfig.value.randomFlipInitialMax + performanceConfig.value.randomFlipInitialMin,
  )
}

function clearAllTimers() {
  clearTimeout(spawnTimer.value)
  clearTimeout(flipTimer.value)
  clearTimeout(singleCardSelectionTimer.value)
  clearInterval(gridFullInterval.value)
}

async function showEndlessTutorial() {
  return tutorialService.show({
    tutorialId: 'endless_mode_guide',
    finishButtonText: t('endless_mode_guide_finish_button'),
    pages: [
      {
        title: t('endless_mode_guide_page1_title'),
        text: t('endless_mode_guide_page1_text'),
        image: '/images/mascots/discover.png',
      },
      {
        title: t('endless_mode_guide_page2_title'),
        text: t('endless_mode_guide_page2_text'),
        image: '/images/icons/powerup_icon.png',
      },
      {
        title: t('endless_mode_guide_page3_title'),
        text: t('endless_mode_guide_page3_text'),
        image: '/images/mascots/angry.png',
      },
      {
        title: t('endless_mode_guide_page4_title'),
        text: t('endless_mode_guide_page4_text'),
        image: '/images/mascots/happy.png',
      },
    ],
  })
}

function setupNavigationProtection() {
  const handleBeforeUnload = (event) => {
    if (!isGameOver.value && isGameInitialized.value) {
      event.preventDefault()
      event.returnValue = ''
    }
  }

  const handleAppStateChange = ({ isActive }) => {
    if (!isActive) {
      coreStore.updateLastActiveTime()
      if (!showPauseMenu.value && gameStore.isGameActive)
        pauseGame()
      playerStore.flushSaveNow()
    }
    else {
      coreStore.updateLastActiveTime()
    }
  }

  const handleVisibilityChange = () => {
    if (document.hidden) {
      coreStore.updateLastActiveTime()
    }
    else {
      coreStore.updateLastActiveTime()
    }
  }

  window.addEventListener('beforeunload', handleBeforeUnload)
  document.addEventListener('visibilitychange', handleVisibilityChange)

  let appStateListener = null
  if (mobileService.isNative) {
    App.addListener('appStateChange', handleAppStateChange).then((listener) => {
      appStateListener = listener
    })
  }

  return () => {
    window.removeEventListener('beforeunload', handleBeforeUnload)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    appStateListener?.remove()
  }
}

async function setupAndroidBackButtonHandler() {
  if (!mobileService.isAndroid)
    return

  backButtonListener = await App.addListener('backButton', async () => {
    if (!isGameInitialized.value || isGameOver.value) {
      coreStore.goToHome()
      return
    }

    if (!showPauseMenu.value) {
      pauseGame()
      return
    }

    const confirmed = await alertService.show({
      title: t('back_to_home'),
      message: t('game_left'),
      confirmButtonText: t('ok'),
      cancelButtonText: t('cancel'),
    })

    if (confirmed) {
      gameStore.endGame()
      playerStore.flushSaveNow()
      coreStore.goToHome()
    }
  })
}

onMounted(async () => {
  coreStore.setGamePageActive(true)
  cleanupNavigationProtection = setupNavigationProtection()
  await setupAndroidBackButtonHandler()

  setTimeout(showGameIntro, 500)
  showEndlessTutorial()
})

onBeforeUnmount(() => {
  cleanupNavigationProtection?.()
  cleanupNavigationProtection = null
  backButtonListener?.remove()
  backButtonListener = null
})

onUnmounted(() => {
  coreStore.setGamePageActive(false)
  cardElements.clear()
  clearAllTimers()

  if (gameStore.isGameActive) {
    gameStore.endGame()
    playerStore.flushSaveNow()
  }

  isGameInitialized.value = false
  isGameOver.value = true
})
</script>

<template>
  <div ref="gameContainer" class="h-screen w-full flex flex-col justify-center items-center relative bg-cardboard-background overflow-hidden">
    <div id="powerup-effect-container" />
    <div v-if="showGridFullWarning" class="siren-container">
      <div class="siren-light top-left" />
      <div class="siren-light top-right" />
      <div class="siren-light bottom-left" />
      <div class="siren-light bottom-right" />
    </div>
    <div class="absolute top-0 left-0 w-full h-2 bg-gray-700 z-20">
      <div
        class="h-full transition-all duration-500 relative overflow-hidden"
        :style="{ width: `${gameProgress}%`, backgroundColor: progressColor, boxShadow: `0 0 20px ${progressColor}80` }"
      >
        <div v-if="showProgressShine" class="absolute inset-0 sparkle-container">
          <div class="shine-effect" />
        </div>
      </div>
    </div>
    <GameHeader :stats="headerStats" :is-power-up-active="isPowerUpActive" @pause-click="togglePause" />

    <div class="flex-grow w-screen flex justify-center items-center perspective-1000 overflow-hidden px-4 gap-x-5">
      <div class="grid grid-cols-6 grid-rows-3 pl-20 w-3/4 gap-2.5">
        <div
          v-for="n in 18" :key="n"
          class="relative rounded-lg bg-black/20 w-[80px] h-[90px] md:w-[90px] md:h-[100px] lg:w-[100px] lg:h-[110px]"
        >
          <div
            v-for="card in getCardsForPosition(n - 1)" :key="card.id"
            :ref="el => setCardElement(card.id, el)"
            class="absolute inset-0 cursor-pointer transform-gpu card-wrapper" :data-card-id="card.id" @click="selectCard(card)"
          >
            <div class="relative w-full h-full preserve-3d card-flip">
              <div class="card-face card-face-back absolute inset-0 backface-hidden rounded-lg" :style="cardBackgroundStyle" />
              <div class="card-face card-face-front absolute inset-0 backface-hidden rotate-y-180 flex items-center justify-center h-full w-full">
                <div class="rounded-lg border-2 border-blue-300 bg-white/90 h-full w-full flex items-center justify-center">
                  <img :src="card.image" :alt="card.type" class="w-3/4 h-3/4 object-contain">
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="w-1/4 flex flex-col items-center z-10">
        <p class="titre text-xs">
          {{ t('powerups') }}
        </p>
        <div class="h-[300px] md:h-[340px] lg:h-full overflow-y-auto scrollbar-hide">
          <PowerUpsBar :power-ups="allPowerUpsForDisplay" :is-power-up-active="isPowerUpActive" @use-powerup="usePowerUp" />
        </div>
      </div>
    </div>

    <div class="absolute bottom-0 left-0 w-full flex justify-center items-center z-10 pointer-events-none">
      <transition name="hurry-up">
        <div v-if="showGridFullWarning" class="hurry-up-text rounded-t-full text-xs titre">
          {{ t('hurry_up') }} ({{ gridFullCountdown }}s)
        </div>
      </transition>
    </div>
    <PauseMenu :is-visible="showPauseMenu" @resume="resumeGame" @close="resumeGame" />
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
.transform-gpu {
  transform: translateZ(0);
}
.text-shadow-md {
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}
.card-flip {
  transition: transform 0.6s;
  transform-style: preserve-3d;
}
.card-face {
  transition: box-shadow 0.3s ease-in-out;
  border-radius: 0.5rem;
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
  z-index: 1000;
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
.floating-score {
  position: fixed;
  font-size: 2rem;
  font-weight: bold;
  color: #34d399;
  pointer-events: none;
  z-index: 1000;
  font-family: 'LuckiestGuy-Regular', cursive;
  text-shadow: 0 0 10px white, 2px 2px 4px rgba(0, 0, 0, 0.8);
}
.progress-bar-sparkle {
  position: relative;
}
.sparkle-container {
  position: absolute;
  inset: 0;
  overflow: hidden;
}
.shine-effect {
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.8) 50%, transparent 100%);
  animation: shine 3s infinite;
}
@keyframes shine {
  0% {
    left: -100%;
  }
  100% {
    left: 100%;
  }
}
.siren-container {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 5;
}
.siren-light {
  position: absolute;
  width: 200px;
  height: 200px;
  background: radial-gradient(circle, rgba(239, 68, 68, 0.4) 0%, rgba(239, 68, 68, 0) 70%);
  border-radius: 50%;
  animation: siren-pulse 1.2s infinite ease-out;
}
.siren-light.top-left {
  top: -50px;
  left: -50px;
}
.siren-light.top-right {
  top: -50px;
  right: -50px;
}
.siren-light.bottom-left {
  bottom: -50px;
  left: -50px;
}
.siren-light.bottom-right {
  bottom: -50px;
  right: -50px;
}
@keyframes siren-pulse {
  0% {
    transform: scale(0.8);
    opacity: 0;
  }
  50% {
    transform: scale(1);
    opacity: 1;
  }
  100% {
    transform: scale(1.2);
    opacity: 0;
  }
}
.hurry-up-text {
  padding: 0.2rem 1rem;
  color: white;
  background-color: rgba(239, 68, 68, 0.85);
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
  box-shadow: 0 0 20px rgba(239, 68, 68, 0.8);
  border: 2px solid rgba(255, 255, 255, 0.5);
}
.hurry-up-enter-active,
.hurry-up-leave-active {
  transition: all 0.5s ease;
}
</style>
