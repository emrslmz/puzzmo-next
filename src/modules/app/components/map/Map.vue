<script setup>
import Balance from '@/components/Balance.vue'
import PButton from '@/components/PButton.vue'
import { alertService } from '@/core/services/AlertService.js'
import { soundService } from '@/core/services/SoundService.js'
import { toastService } from '@/core/services/ToastService.js'
import { tutorialService } from '@/core/services/TutorialService.js'
import { useCoreStore } from '@/store/coreStore'
import { useGameStore } from '@/store/gameStore'
import { usePlayerStore } from '@/store/playerStore.js'
import { computed, h, markRaw, nextTick, onBeforeUnmount, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const core = useCoreStore()
const gameStore = useGameStore()
const playerStore = usePlayerStore()

// --- STATE & CONSTANTS ---
const MIN_SCALE = 0.3
const MAX_SCALE = 4.0
const CANVAS_WIDTH = 4000
const CANVAS_HEIGHT = 2000
// ISLAND_RADIUS artık kullanılmıyor, yeni algoritma kendi yarıçapını hesaplıyor.
const INITIAL_SCALE = 0.5
const MINIMAP_WIDTH = 200
const _MINIMAP_HEIGHT = 120
const MINIMAP_SCALE = MINIMAP_WIDTH / CANVAS_WIDTH

const islands = computed(() => gameStore.getAllIslandsWithNames)

/**
 * GÜNCELLENDİ: Adaları dairesel yerine daha organik bir spiral (Phyllotaxis)
 * deseniyle yerleştirir. Bu, daha doğal ve estetik bir görünüm sağlar.
 */
function arrangeIslands() {
  const centerX = CANVAS_WIDTH / 2
  const centerY = CANVAS_HEIGHT / 2
  const _numIslands = islands.value.length

  // Adaların ne kadar yayılacağını kontrol eden ölçekleme faktörü.
  // Daha fazla ada eklendikçe bu değeri ayarlayabilirsiniz.
  const scalingFactor = 280

  // Altın oran açısı (radyan cinsinden). Yaklaşık 137.5 derece.
  const goldenAngle = Math.PI * (3 - Math.sqrt(5))

  islands.value.forEach((island, index) => {
    // Her ada için spiral üzerindeki açıyı ve yarıçapı hesapla
    const theta = index * goldenAngle
    const radius = scalingFactor * Math.sqrt(index + 1) // +1, ilk adanın merkezde (yarıçap 0) olmasını engeller.

    // Yeni pozisyonu ata
    island.position = {
      x: centerX + radius * Math.cos(theta),
      y: centerY + radius * Math.sin(theta),
    }
  })
}

const viewport = ref(null)
const position = reactive({ x: 0, y: 0 })
const targetPosition = reactive({ x: 0, y: 0 })
const scale = ref(INITIAL_SCALE)
const panState = reactive({ isPanning: false, startX: 0, startY: 0 })
const homePosition = ref({ x: 0, y: 0, scale: INITIAL_SCALE })
const touchDistance = ref(null)

// --- COMPUTED ---
const scaledCanvasWidth = computed(() => CANVAS_WIDTH * scale.value)
const scaledCanvasHeight = computed(() => CANVAS_HEIGHT * scale.value)

const constraints = computed(() => {
  if (!viewport.value) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0 }
  }
  const viewportWidth = viewport.value.clientWidth
  const viewportHeight = viewport.value.clientHeight
  const minX = viewportWidth - scaledCanvasWidth.value
  const maxX = 0
  const minY = viewportHeight - scaledCanvasHeight.value
  const maxY = 0
  return { minX, maxX, minY, maxY }
})

const canvasStyle = computed(() => ({
  transform: `translate(${position.x}px, ${position.y}px) scale(${scale.value})`,
  width: `${CANVAS_WIDTH}px`,
  height: `${CANVAS_HEIGHT}px`,
}))

const backgroundStyle = computed(() => ({
  transform: `translate(${position.x}px, ${position.y}px) scale(${scale.value})`,
  width: `${CANVAS_WIDTH}px`,
  height: `${CANVAS_HEIGHT}px`,
  backgroundImage: `url('/images/backgrounds/map_full.png')`,
  backgroundSize: 'cover',
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'center',
}))

const minimapBackgroundStyle = computed(() => ({
  width: `${CANVAS_WIDTH * MINIMAP_SCALE}px`,
  height: `${CANVAS_HEIGHT * MINIMAP_SCALE}px`,
  backgroundImage: `url('/images/backgrounds/map_full.png')`,
  backgroundSize: 'cover',
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'center',
  transform: `translate(${position.x * MINIMAP_SCALE}px, ${position.y * MINIMAP_SCALE}px) scale(${MINIMAP_SCALE * scale.value})`,
  transformOrigin: '0 0',
}))

function minimapIslandStyle(island) {
  return {
    left: `${island.position.x * MINIMAP_SCALE}px`,
    top: `${island.position.y * MINIMAP_SCALE}px`,
  }
}

const minimapViewportStyle = computed(() => {
  if (!viewport.value)
    return {}
  const viewportWidth = viewport.value.clientWidth
  const viewportHeight = viewport.value.clientHeight
  const viewWidth = viewportWidth * MINIMAP_SCALE / scale.value
  const viewHeight = viewportHeight * MINIMAP_SCALE / scale.value
  const viewX = -position.x * MINIMAP_SCALE / scale.value
  const viewY = -position.y * MINIMAP_SCALE / scale.value
  return {
    width: `${viewWidth}px`,
    height: `${viewHeight}px`,
    transform: `translate(${viewX}px, ${viewY}px)`,
  }
})

const isZoomedIn = computed(() => scale.value !== homePosition.value.scale)
const isPanned = computed(() =>
  Math.abs(targetPosition.x - homePosition.value.x) > 0.5
  || Math.abs(targetPosition.y - homePosition.value.y) > 0.5,
)

// --- LIFECYCLE & ANIMATION ---
let animationFrameId = null
const easingFactor = 0.1

// --- METHODS ---
const clamp = (val, min, max) => Math.min(Math.max(val, min), max)

function centerOnInitialView() {
  if (!viewport.value)
    return

  const screenWidth = viewport.value.clientWidth
  const screenHeight = viewport.value.clientHeight

  scale.value = INITIAL_SCALE

  const canvasCenterX = CANVAS_WIDTH / 2
  const canvasCenterY = CANVAS_HEIGHT / 2

  let initialX = (screenWidth / 2) - (canvasCenterX * INITIAL_SCALE)
  let initialY = (screenHeight / 2) - (canvasCenterY * INITIAL_SCALE)

  initialX = clamp(initialX, constraints.value.minX, constraints.value.maxX)
  initialY = clamp(initialY, constraints.value.minY, constraints.value.maxY)

  position.x = initialX
  targetPosition.x = initialX
  position.y = initialY
  targetPosition.y = initialY

  homePosition.value = { x: initialX, y: initialY, scale: INITIAL_SCALE }
}

async function showMapTutorial() {
  return tutorialService.show({
    tutorialId: 'map_mode_intro',
    finishButtonText: t('tutorial_map_mode_intro_finish_button'),
    pages: [
      {
        title: t('tutorial_map_mode_intro_page1_title'),
        text: t('tutorial_map_mode_intro_page1_text'),
        image: '/images/mascots/discover.png',
      },
      {
        title: t('tutorial_map_mode_intro_page2_title'),
        text: t('tutorial_map_mode_intro_page2_text'),
        image: '/images/icons/compass.png', // Örnek görsel
      },
      {
        title: t('tutorial_map_mode_intro_page3_title'),
        text: t('tutorial_map_mode_intro_page3_text'),
        image: '/images/mascots/rich3.png',
      },
      {
        title: t('tutorial_map_mode_intro_page4_title'),
        text: t('tutorial_map_mode_intro_page4_text'),
        image: '/images/icons/lock2.png', // Seviye görseli
      },
      {
        title: t('tutorial_map_mode_intro_page5_title'),
        text: t('tutorial_map_mode_intro_page5_text'),
        image: '/images/mascots/happy.png',
      },
    ],
  })
}

// --- Navigation Protection ---
function setupNavigationProtection() {
  // Sayfa yenileme kontrolü
  const handleBeforeUnload = (event) => {
    // Map sayfasında çok kritik değil ama yine de uyarı verelim
    event.preventDefault()
    event.returnValue = ''
  }

  // Capacitor app state change kontrolü
  const handleAppStateChange = () => {
    core.updateLastActiveTime()
  }

  // Visibility change kontrolü (sayfa arka plana gidince)
  const handleVisibilityChange = () => {
    if (document.hidden) {
      // Sayfa arka plana gitti
      core.updateLastActiveTime()
    }
    else {
      // Sayfa tekrar aktif oldu - kontrol et ve gerekirse yönlendir
      if (core.checkAndRedirectToHome()) {
        return
      }
      core.updateLastActiveTime()
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
  core.setGamePageActive(true)

  // Navigation protection kurulumu
  cleanupNavigationProtection = setupNavigationProtection()

  showMapTutorial()
  nextTick(() => {
    arrangeIslands()
    centerOnInitialView()
  })
  updateLoop()
  window.addEventListener('resize', centerOnInitialView)
})

onBeforeUnmount(() => {
  // Navigation protection temizliği
  if (cleanupNavigationProtection) {
    cleanupNavigationProtection()
  }
})

onUnmounted(() => {
  core.setGamePageActive(false)
  cancelAnimationFrame(animationFrameId)
  window.removeEventListener('resize', centerOnInitialView)
})

// --- ALERT COMPONENTS ---

/**
 * Yetersiz bakiye durumunda gösterilecek olan alert'in içeriği.
 * Adanın görselini, adını, gereken maliyeti ve oyuncunun mevcut bakiyesini gösterir.
 */
const InsufficientBalanceComponent = {
  props: ['island'],
  setup(props) {
    const _playerStore = usePlayerStore()
    return () => h('div', { class: 'flex flex-col items-center gap-3 text-gray-800 p-2' }, [
      // Ada Görseli
      h('img', {
        src: props.island.image,
        alt: props.island.name,
        class: 'w-16 h-16 scale-[1.5] object-contain drop-shadow-lg',
      }),
      // Ada Adı
      h('h3', { class: 'text-xl font-bold' }, props.island.name),
      // Gerekli Maliyet
      h('div', { class: 'text-center' }, [
        h('p', { class: 'text-sm text-gray-500' }, t('required_amount')),
        h('div', { class: 'mt-1 flex items-center gap-2 px-4 py-2 bg-red-100 border border-red-300 rounded-full shadow-inner' }, [
          h('img', { src: '/images/icons/coin.png', class: 'w-6 h-6' }),
          h('span', { class: 'text-2xl font-bold text-red-800' }, props.island.purchaseCost.toLocaleString()),
        ]),
      ]),
    ])
  },
}

/**
 * Ada satın alma onayı için gösterilecek olan alert'in içeriği.
 */
const IslandPurchaseConfirmationComponent = {
  props: ['island'],
  setup(props) {
    return () => h('div', { class: 'flex flex-col items-center gap-3 text-gray-800 p-2' }, [
      h('img', {
        src: props.island.image,
        alt: props.island.name,
        class: 'w-16 h-16 scale-[1.5] object-contain drop-shadow-lg',
      }),
      h('p', { class: 'text-xl font-bold' }, props.island.name),
      h('div', { class: 'flex items-center gap-2 px-4 py-2 bg-amber-300 rounded-full shadow-inner' }, [
        h('img', { src: '/images/icons/coin.png', class: 'w-6 h-6' }),
        h('span', { class: 'text-2xl font-bold text-amber-900' }, props.island.purchaseCost.toLocaleString()),
      ]),
    ])
  },
}

async function handleIslandClick(island) {
  soundService.playEffect('select')

  if (!playerStore.isIslandUnlocked(island.id)) {
    const playerCoins = playerStore.coins

    // Yetersiz Bakiye Kontrolü
    if (playerCoins < island.purchaseCost) {
      soundService.playEffect('error') // Hata sesi efekti
      await alertService.showWithSlot({
        title: t('not_enough_balance_title'),
        slotComponent: markRaw(InsufficientBalanceComponent),
        slotProps: {
          island,
        },
        confirmButtonText: t('okay'),
      })
      return
    }

    // Satın Alma Onayı
    soundService.playEffect('click_effect')
    const confirmed = await alertService.showWithSlot({
      title: t('purchase_confirmation_title'),
      slotComponent: markRaw(IslandPurchaseConfirmationComponent),
      slotProps: {
        island,
      },
      confirmButtonText: t('purchase'),
      cancelButtonText: t('cancel'),
    })

    if (confirmed) {
      const success = playerStore.purchaseIsland(island.id, island.purchaseCost)
      const toastConfig = {
        title: success ? t('island_purchase_success', { name: island.name }) : t('not_enough_balance_title'),
        variant: success ? 'success' : 'error',
      }

      if (success) {
        soundService.playEffect('click_effect')
      }
      toastService.show(toastConfig.title, toastConfig.variant)
    }
    return
  }

  playerStore.selectAdventureIsland(island.id)
  core.goTo('Adventure')
}

function handleWheel(event) {
  if (!viewport.value)
    return
  event.preventDefault()
  const { clientX, clientY, deltaY } = event
  const oldScale = scale.value
  const newScale = clamp(oldScale - deltaY * 0.005, MIN_SCALE, MAX_SCALE)

  if (Math.abs(newScale - oldScale) < 0.001)
    return

  const rect = viewport.value.getBoundingClientRect()
  const mouseX = clientX - rect.left
  const mouseY = clientY - rect.top

  const newTargetX = mouseX - (mouseX - targetPosition.x) * (newScale / oldScale)
  const newTargetY = mouseY - (mouseY - targetPosition.y) * (newScale / oldScale)

  scale.value = newScale
  targetPosition.x = clamp(newTargetX, constraints.value.minX, constraints.value.maxX)
  targetPosition.y = clamp(newTargetY, constraints.value.minY, constraints.value.maxY)
}

function handleDoubleClick(event) {
  if (!viewport.value)
    return
  const oldScale = scale.value
  const newScale = clamp(oldScale * 2, MIN_SCALE, MAX_SCALE) // Zoom in on double click

  const rect = viewport.value.getBoundingClientRect()
  const mouseX = event.clientX - rect.left
  const mouseY = event.clientY - rect.top

  const newTargetX = mouseX - (mouseX - targetPosition.x) * (newScale / oldScale)
  const newTargetY = mouseY - (mouseY - targetPosition.y) * (newScale / oldScale)

  scale.value = newScale
  targetPosition.x = clamp(newTargetX, constraints.value.minX, constraints.value.maxX)
  targetPosition.y = clamp(newTargetY, constraints.value.minY, constraints.value.maxY)
}

function panStart(event) {
  panState.isPanning = true
  document.body.style.userSelect = 'none'
  if (event.touches && event.touches.length === 2) {
    const touch1 = event.touches[0]
    const touch2 = event.touches[1]
    touchDistance.value = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY)
  }
  else {
    const point = event.touches?.[0] || event
    panState.startX = point.clientX - targetPosition.x
    panState.startY = point.clientY - targetPosition.y
  }
}

function panMove(event) {
  if (!panState.isPanning)
    return
  if (event.touches && event.touches.length === 2) {
    const touch1 = event.touches[0]
    const touch2 = event.touches[1]
    const newDistance = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY)
    if (touchDistance.value) {
      const oldScale = scale.value
      const newScale = clamp(oldScale * (newDistance / touchDistance.value), MIN_SCALE, MAX_SCALE)

      const rect = viewport.value.getBoundingClientRect()
      const centerX = (touch1.clientX + touch2.clientX) / 2 - rect.left
      const centerY = (touch1.clientY + touch2.clientY) / 2 - rect.top

      const newTargetX = centerX - (centerX - targetPosition.x) * (newScale / oldScale)
      const newTargetY = centerY - (centerY - targetPosition.y) * (newScale / oldScale)

      scale.value = newScale
      targetPosition.x = clamp(newTargetX, constraints.value.minX, constraints.value.maxX)
      targetPosition.y = clamp(newTargetY, constraints.value.minY, constraints.value.maxY)
      touchDistance.value = newDistance
    }
  }
  else {
    const point = event.touches?.[0] || event
    const newTargetX = point.clientX - panState.startX
    const newTargetY = point.clientY - panState.startY
    targetPosition.x = clamp(newTargetX, constraints.value.minX, constraints.value.maxX)
    targetPosition.y = clamp(newTargetY, constraints.value.minY, constraints.value.maxY)
  }
}

function panEnd() {
  panState.isPanning = false
  document.body.style.userSelect = 'auto'
  touchDistance.value = null
}

function resetView() {
  scale.value = homePosition.value.scale
  targetPosition.x = homePosition.value.x
  targetPosition.y = homePosition.value.y
}

function updateLoop() {
  const dx = targetPosition.x - position.x
  const dy = targetPosition.y - position.y
  if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
    position.x += dx * easingFactor
    position.y += dy * easingFactor
  }
  else {
    position.x = targetPosition.x
    position.y = targetPosition.y
  }
  animationFrameId = requestAnimationFrame(updateLoop)
}
</script>

<template>
  <div
    ref="viewport"
    class="map-viewport relative h-screen w-screen cursor-grab overflow-hidden active:cursor-grabbing"
    @wheel="handleWheel"
    @mousedown="panStart"
    @mousemove="panMove"
    @mouseup="panEnd"
    @mouseleave="panEnd"
    @touchstart.passive="panStart"
    @touchmove.passive="panMove"
    @touchend="panEnd"
    @touchcancel="panEnd"
    @dblclick="handleDoubleClick"
  >
    <div
      class="map-background absolute"
      :style="backgroundStyle"
    />
    <div
      class="map-canvas absolute"
      :style="canvasStyle"
    >
      <div
        v-for="island in islands"
        :key="island.id"
        class="island absolute transition-transform duration-200 ease-in-out hover:scale-110 cursor-pointer"
        :style="{ left: `${island.position?.x || 0}px`, top: `${island.position?.y || 0}px`, transform: 'translate(-50%, -50%)' }"
        @click.stop="handleIslandClick(island)"
      >
        <div class="relative flex flex-col items-center">
          <img
            :src="island.image" :alt="island.name" :class="{ 'grayscale brightness-50': !playerStore.isIslandUnlocked(island.id) }"
            class="drop-shadow-2xl w-48 lg:w-56"
          >
          <div
            v-if="!playerStore.isIslandUnlocked(island.id)"
            class="locked-overlay absolute inset-0 flex items-center justify-center rounded-full"
          >
            <img src="/images/icons/lock.png" class="w-12 h-12" alt="Kilitli">
          </div>
          <span class="mt-2 rounded-full bg-blue-900 bg-opacity-70 px-4 py-1 text-sm font-bold text-white shadow-lg">{{
            island.name
          }}</span>
          <span v-if="playerStore.isIslandUnlocked(island.id)" class="text-xs text-yellow-300">Seviye: {{ playerStore.getCurrentAdventureLevel(island.id) }}</span>
        </div>
      </div>
    </div>

    <div class="ui-overlay pointer-events-none absolute inset-0 text-white">
      <svg width="0" height="0" class="absolute">
        <defs>
          <radialGradient id="cloudGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <stop offset="0%" style="stop-color:rgb(255,255,255);stop-opacity:0.9" />
            <stop offset="100%" style="stop-color:rgb(255,255,255);stop-opacity:0" />
          </radialGradient>
          <filter id="cloudBlur">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
          </filter>
        </defs>
      </svg>
      <div class="gentle-bob absolute -top-5 -left-10 w-64" style="animation-duration: 8s;">
        <svg viewBox="0 0 200 100">
          <circle cx="60" cy="60" r="40" fill="url(#cloudGradient)" filter="url(#cloudBlur)" />
          <circle cx="100" cy="50" r="50" fill="url(#cloudGradient)" filter="url(#cloudBlur)" />
          <circle cx="140" cy="70" r="35" fill="url(#cloudGradient)" filter="url(#cloudBlur)" />
        </svg>
      </div>
      <div class="gentle-bob absolute -top-8 -right-12 w-72 -scale-x-100" style="animation-duration: 7s;">
        <svg viewBox="0 0 200 100">
          <circle cx="50" cy="70" r="30" fill="url(#cloudGradient)" filter="url(#cloudBlur)" />
          <circle cx="90" cy="50" r="50" fill="url(#cloudGradient)" filter="url(#cloudBlur)" />
          <circle cx="150" cy="60" r="40" fill="url(#cloudGradient)" filter="url(#cloudBlur)" />
        </svg>
      </div>

      <!-- Minimap -->
      <transition name="fade">
        <div
          v-if="scale > MIN_SCALE * 1.1"
          class="minimap pointer-events-none absolute top-5 left-5 z-20 w-48 h-32 bg-black bg-opacity-50 rounded-lg overflow-hidden border border-gray-500"
        >
          <div
            class="minimap-background absolute"
            :style="minimapBackgroundStyle"
          />
          <div
            v-for="island in islands"
            :key="`minimap-${island.id}`"
            class="absolute w-3 h-3 rounded-full"
            :style="minimapIslandStyle(island)"
            :class="!playerStore.isIslandUnlocked(island.id) ? 'bg-gray-500' : 'bg-yellow-400'"
          />
          <div
            class="minimap-viewport absolute border-2 border-white"
            :style="minimapViewportStyle"
          />
        </div>
      </transition>

      <div class="pointer-events-auto absolute top-5 right-5 z-10 flex space-x-2">
        <Balance />
      </div>

      <!-- Bottom Buttons -->
      <div>
        <div class="pointer-events-auto absolute bottom-5 left-5 z-10 flex space-x-2">
          <PButton variant="secondary" @click="core.goToHome">
            <img src="/images/badge/left_badge.png" alt="Geri" class="w-12 h-12 scale-[2]">
          </PButton>
        </div>
        <transition name="fade">
          <div v-if="isZoomedIn || isPanned" class="pointer-events-auto absolute bottom-5 right-5 z-10 flex space-x-2">
            <PButton variant="warning" @click="resetView">
              <img src="/images/icons/binoculars.png" alt="Sıfırla" class="w-12 h-12 scale-[1.2]">
            </PButton>
          </div>
        </transition>
      </div>
    </div>
  </div>
</template>

<style scoped>
.map-viewport {
  background: linear-gradient(to bottom, #87CEEB, #6495ED);
  touch-action: none; /* Pan ve pinch-zoom için önemli */
}
.map-background, .map-canvas {
  transform-origin: 0 0;
  will-change: transform;
}
.island {
  /* Adanın pozisyonunu merkezlemek için eklendi */
  transform: translate(-50%, -50%);
}
.minimap {
  border: 1px solid rgba(255, 255, 255, 0.5);
}
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: scale(0.9);
}
@keyframes gentle-bob {
  0% { transform: translateY(0) rotate(-1deg); }
  50% { transform: translateY(-10px) rotate(1deg); }
  100% { transform: translateY(0) rotate(-1deg); }
}
.gentle-bob {
  animation: gentle-bob 12s ease-in-out infinite alternate;
}
</style>
