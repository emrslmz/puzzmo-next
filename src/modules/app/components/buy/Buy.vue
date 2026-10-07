<script setup>
import TheHeader from '@/components/TheHeader.vue'
import ToastContainer from '@/components/ToastContainer.vue'
import { alertService } from '@/core/services/AlertService.js'
import { mobileService } from '@/core/services/MobileService'
import { usePlayerStore } from '@/store/playerStore'
import { Capacitor } from '@capacitor/core'
import { Device } from '@capacitor/device'
import { LOG_LEVEL, Purchases } from '@revenuecat/purchases-capacitor'
import confetti from 'canvas-confetti' // [GÜNCELLENDİ] NPM paketinden import edildi.
import { gsap } from 'gsap'
import { computed, h, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const playerStore = usePlayerStore()
const { t } = useI18n()

// Reactive state
const selectedPackage = ref(null)
const isLoading = ref(true)
const showSuccessToast = ref(false)
const showErrorToast = ref(false)
const errorToastMessage = ref('')
const isPurchaseInProgress = ref(false)
const isOnline = ref(true)
const isOfferAvailable = ref(false)
const fetchError = ref(null)

const areAdsBlocked = computed(() => playerStore.adsBlocked)

// [GÜNCELLENDİ] Paket verileri artık çeviri anahtarlarıyla (key) tanımlanıyor.
// Bu, 't()' fonksiyonunun erken çağrılmasından kaynaklanan hatayı önler.
const allPackages = ref([
  {
    id: 'block_ads',
    nameKey: 'block_ads',
    subtitleKey: 'in_app_purchase_ad',
    badgeKey: 'special_offer',
    coins: 0,
    bonus: 1000,
    totalCoins: 1000,
    gradient: 'from-teal-400 via-teal-500 to-teal-600',
    glowColor: 'teal-400',
    coinImage: '/images/icons/remove_ads.png',
    revenueCatId: 'revenue.puzzmo.block_ads',
    revenueCatPackage: null,
    isAvailable: false,
    price: '$2.99',
    savings: 'KALICI',
    popular: false,
  },
  {
    id: '1k',
    nameKey: 'extra_coin',
    subtitleKey: 'in_app_purchase',
    badgeKey: '',
    coins: 1000,
    bonus: 0,
    totalCoins: 1000,
    gradient: 'from-emerald-400 via-emerald-500 to-emerald-600',
    glowColor: 'emerald-400',
    coinImage: '/images/coin-packages/coin2.png',
    revenueCatId: 'revenue.puzzmo.1k',
    revenueCatPackage: null,
    isAvailable: false,
    price: '$2.99',
    savings: '',
    popular: false,
  },
  {
    id: '5k',
    nameKey: 'popular',
    subtitleKey: 'in_app_purchase',
    badgeKey: 'most_popular',
    coins: 5000,
    bonus: 500,
    totalCoins: 5500,
    gradient: 'from-blue-400 via-blue-500 to-blue-600',
    glowColor: 'blue-400',
    coinImage: '/images/coin-packages/coin3.png',
    revenueCatId: 'revenue.puzzmo.5k',
    revenueCatPackage: null,
    isAvailable: false,
    price: '$9.99',
    savings: '%25 BONUS',
    popular: true,
  },
  {
    id: '10k',
    nameKey: 'super',
    subtitleKey: 'in_app_purchase',
    badgeKey: '',
    coins: 10000,
    bonus: 2000,
    totalCoins: 12000,
    gradient: 'from-purple-400 via-purple-500 to-purple-600',
    glowColor: 'purple-400',
    coinImage: '/images/coin-packages/coin6.png',
    revenueCatId: 'revenue.puzzmo.10k',
    revenueCatPackage: null,
    isAvailable: false,
    price: '$19.99',
    savings: '%50 BONUS',
    popular: false,
  },
])

// [YENİ] Paket anahtarlarını gerçek çevirilere dönüştüren computed property.
const allPackagesWithTranslations = computed(() => {
  return allPackages.value.map(p => ({
    ...p,
    name: t(p.nameKey),
    subtitle: t(p.subtitleKey),
    badge: p.badgeKey ? t(p.badgeKey) : '',
  }))
})

// Ekranda gösterilecek paketleri hesaplayan computed property.
const packages = computed(() => {
  return allPackagesWithTranslations.value.filter(p =>
    p.isAvailable && (!areAdsBlocked.value || p.id !== 'block_ads'),
  )
})

// `selectedPackage` ID'sine göre tüm paketler arasından detayları bulur.
const selectedPackageDetails = computed(() => {
  return allPackagesWithTranslations.value.find(p => p.id === selectedPackage.value) || null
})

const currentCoins = computed(() => playerStore.coins || 0)

// Onay penceresi için özel bir component oluşturuldu.
const PackagePurchaseConfirmationComponent = {
  props: ['pkg'],
  setup(props) {
    return () => h('div', { class: 'flex flex-col items-center text-gray-800' }, [
      h('img', {
        src: props.pkg.coinImage,
        alt: props.pkg.name,
        class: 'w-24 h-24 object-contain drop-shadow-lg scale-[1.2]',
      }),
      h('p', { class: 'text-md font-bold' }, props.pkg.name),
      h('p', { class: 'text-xl text-gray-600' }, props.pkg.subtitle),
      h('div', { class: 'flex items-center justify-center' }, [
        h('div', { class: 'bg-gradient-to-r from-amber-400 to-orange-500 text-white text-2xl font-bold py-3 px-6 rounded-2xl shadow-lg border-2 border-amber-300' }, props.pkg.price),
      ]),
    ])
  },
}

function autoSelectFirstAvailable() {
  const current = allPackages.value.find(pkg => pkg.id === selectedPackage.value)
  if (!current || !current.isAvailable) {
    const firstAvailable = packages.value[0]
    selectedPackage.value = firstAvailable ? firstAvailable.id : null
  }
}

function networkListener(online) {
  isOnline.value = online
  if (online && Capacitor.getPlatform() !== 'web' && !isOfferAvailable.value)
    initializeRevenueCat()
}

function showErrorToastMessage(message) {
  errorToastMessage.value = message
  showErrorToast.value = true
}

function showSuccessMessage() {
  showSuccessToast.value = true
}

// Tıklanan pakete göre satın alma onayı başlatan fonksiyon.
async function confirmPurchase(pkg) {
  if (isPurchaseInProgress.value)
    return

  if (!isOnline.value) {
    showErrorToastMessage(t('internet_connection_required'))
    return
  }
  if (!pkg || !pkg.isAvailable) {
    showErrorToastMessage(t('please_select_a_package'))
    return
  }
  selectedPackage.value = pkg.id

  const confirmed = await alertService.showWithSlot({
    title: t('purchase_confirmation_title'),
    slotComponent: PackagePurchaseConfirmationComponent,
    slotProps: {
      pkg,
    },
    confirmButtonText: t('purchase'),
    cancelButtonText: t('cancel'),
  })

  if (confirmed)
    processPurchase()
}

// Satın alma başarılı olduğunda konfeti efekti başlatan fonksiyon.
function triggerConfetti() {
  const duration = 2 * 1000
  const animationEnd = Date.now() + duration
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 }

  function randomInRange(min, max) {
    return Math.random() * (max - min) + min
  }

  const interval = setInterval(() => {
    const timeLeft = animationEnd - Date.now()

    if (timeLeft <= 0)
      return clearInterval(interval)

    const particleCount = 50 * (timeLeft / duration)
    confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } })
    confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } })
  }, 250)
}

// RevenueCat
async function initializeRevenueCat() {
  isLoading.value = true
  fetchError.value = null
  try {
    const apiKey = Capacitor.getPlatform() === 'ios'
      ? 'appl_IEVPoEQgVvuQuEhKTzdehdBwIfL'
      : 'goog_jrSalfXPzOvGHCGxukMrKbancGY'

    await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG })

    const deviceInfo = await Device.getId()
    await Purchases.configure({
      apiKey,
      appUserID: deviceInfo.identifier,
    })

    await fetchAvailablePackages()
  }
  catch (error) {
    console.error('RevenueCat initialization failed:', error)
    let detailedMessage = t('purchase_failed_to_load_products_check_config')
    if (error && error.message)
      detailedMessage += ` (Hata: ${error.message})`

    fetchError.value = detailedMessage
  }
  finally {
    isLoading.value = false
  }
}

async function fetchAvailablePackages() {
  fetchError.value = null
  try {
    const offerings = await Purchases.getOfferings()
    console.log('REVENUECAT: Gelen Tüm Teklifler (Offerings):', JSON.stringify(offerings, null, 2))

    if (!offerings.all || Object.keys(offerings.all).length === 0)
      throw new Error('RevenueCat\'ten hiçbir teklif (offering) alınamadı.')

    let anyPackageAvailable = false
    allPackages.value.forEach((localPkg) => {
      const matchingOffering = offerings.all[localPkg.revenueCatId]

      if (matchingOffering && matchingOffering.availablePackages.length > 0) {
        const rcPackage = matchingOffering.availablePackages[0]
        localPkg.isAvailable = true
        localPkg.revenueCatPackage = rcPackage
        localPkg.price = rcPackage.product.priceString
        anyPackageAvailable = true
        console.log(`✅ Eşleşti: Yerel paket "${localPkg.id}" -> RevenueCat Teklifi "${matchingOffering.identifier}"`)
      }
      else {
        localPkg.isAvailable = false
        localPkg.revenueCatPackage = null
        console.warn(`❌ Eşleşmedi: Yerel paket "${localPkg.id}" (ID: ${localPkg.revenueCatId}) bulunamadı veya içinde paket yok.`)
      }
    })

    isOfferAvailable.value = anyPackageAvailable
    if (!anyPackageAvailable)
      throw new Error('Uygulamadaki hiçbir paket, RevenueCat\'ten gelen tekliflerle eşleşmedi. Lütfen Offering ID\'lerini kontrol edin.')

    autoSelectFirstAvailable()
  }
  catch (error) {
    console.error('Failed to fetch packages:', error)
    let detailedMessage = t('purchase_failed_to_load_products_check_config')
    if (error && error.message)
      detailedMessage += ` (Hata: ${error.message})`

    fetchError.value = detailedMessage
    isOfferAvailable.value = false
  }
}

function initializeMockDataForWeb() {
  isLoading.value = true
  allPackages.value.forEach((pkg) => {
    pkg.isAvailable = true
    pkg.revenueCatPackage = { product: { priceString: pkg.price } }
  })
  isOfferAvailable.value = true
  autoSelectFirstAvailable()
  isLoading.value = false
}

function processPurchaseSuccess(pkg) {
  if (pkg.id === 'block_ads') {
    playerStore.blockAds()
    console.log('processPurchaseSuccess', pkg)
  }

  playerStore.addCoins(pkg.totalCoins)
  showSuccessMessage()
  animateCoinsChange(pkg.totalCoins)
  triggerConfetti()
}

async function processPurchase() {
  isPurchaseInProgress.value = true
  // Detaylar artık çevrilmiş paketten alınmalı.
  const pkgToPurchaseDetails = selectedPackageDetails.value

  try {
    if (!pkgToPurchaseDetails)
      throw new Error('Satın alınacak paket seçilmedi.')

    if (Capacitor.getPlatform() === 'web') {
      setTimeout(() => {
        processPurchaseSuccess(pkgToPurchaseDetails)
        isPurchaseInProgress.value = false
      }, 1500)
      return
    }

    console.log('Satın alma işlemi başlatılıyor. Paket:', pkgToPurchaseDetails.id)
    console.log('RevenueCat ID:', pkgToPurchaseDetails.revenueCatId)

    console.log('En güncel teklifler alınıyor...')
    const offerings = await Purchases.getOfferings()
    const offering = offerings.all[pkgToPurchaseDetails.revenueCatId]

    if (!offering || offering.availablePackages.length === 0)
      throw new Error(`"${pkgToPurchaseDetails.name}" paketi için güncel teklif bulunamadı. Lütfen internet bağlantınızı kontrol edin veya daha sonra tekrar deneyin.`)

    const packageToPurchase = offering.availablePackages[0]
    console.log('Satın alınacak güncel RevenueCat paketi:', packageToPurchase)

    const { customerInfo } = await Purchases.purchasePackage({ aPackage: packageToPurchase })
    console.log('Satın alma başarılı:', customerInfo)
    if (customerInfo)
      processPurchaseSuccess(pkgToPurchaseDetails)
  }
  catch (error) {
    console.error('Satın alma işlemi başarısız oldu:', error)
    if (error.userCancelled) {
      showErrorToastMessage(t('purchase_cancelled'))
      console.log('Kullanıcı satın almayı iptal etti.')
    }
    else {
      showErrorToastMessage(t('purchase_failed'))
    }
  }
  finally {
    isPurchaseInProgress.value = false
  }
}

function animateCoinsChange(coinsAdded) {
  const coinsElement = document.querySelector('.coins-value')
  if (coinsElement) {
    gsap.from(coinsElement, {
      textContent: currentCoins.value - coinsAdded,
      duration: 1,
      ease: 'power2.out',
      snap: { textContent: 1 },
      onUpdate() {
        if (this.targets()[0])
          this.targets()[0].textContent = Math.round(Number(this.targets()[0].textContent)).toString()
      },
    })
  }
}

onMounted(() => {
  isOnline.value = mobileService.isOnline
  mobileService.addNetworkListener(networkListener)

  if (Capacitor.getPlatform() === 'web')
    initializeMockDataForWeb()

  else
    initializeRevenueCat()
})

onUnmounted(() => {
  mobileService.removeNetworkListener(networkListener)
})
</script>

<template>
  <div class="relative h-screen w-full overflow-hidden bg-wooden-background">
    <!-- Header -->
    <TheHeader />

    <!-- Reklam Engelleme Başarı Mesajı -->
    <!-- <div v-if="areAdsBlocked" class="absolute top-20 left-1/2 transform -translate-x-1/2 z-20 w-full max-w-md px-4">
      <div class="bg-gradient-to-r from-green-400 to-blue-500 text-white font-bold rounded-2xl shadow-lg p-3 text-center border-2 border-white/50">
        ✨ {{ t('super') }}! {{ t('block_ads_success') }} ✨
      </div>
    </div> -->

    <!-- Offline Warning -->
    <div v-if="!isOnline" class="absolute top-20 left-1/2 transform -translate-x-1/2 z-50">
      <div class="bg-red-500 border-4 border-red-600 rounded-2xl text-white px-4 py-2 shadow-lg animate-pulse">
        <div class="flex items-center gap-2">
          <span class="font-bold titre">{{ t('internet_connection_required') }}</span>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <main class="flex flex-col h-full -mt-[100px]">
      <div class="flex-1 flex items-center justify-center overflow-hidden">
        <!-- YÜKLENİYOR DURUMU -->
        <div v-if="isLoading" class="flex flex-col items-center justify-center text-center">
          <div class="w-16 h-16 border-4 border-amber-100 border-t-transparent rounded-full animate-spin" />
          <h2 class="text-2xl font-bold text-amber-100 mt-4 titre">
            {{ t('loading') }}
          </h2>
          <p class="text-amber-200 text-lg">
            {{ t('please_wait') }}
          </p>
        </div>

        <!-- HATA DURUMU -->
        <div v-else-if="fetchError" class="flex flex-col items-center justify-center text-center px-6">
          <img src="/images/mascots/angry.png" alt="Error" class="w-24 h-24 mx-auto mb-4 scale-[1.4] opacity-80">
          <h2 class="text-2xl font-bold text-red-400 mb-2 titre">
            {{ t('error_occurred') }}
          </h2>
          <p class="text-amber-200 text-lg max-w-md">
            {{ fetchError }}
          </p>
          <p class="text-amber-300 text-sm mt-4 max-w-md opacity-80">
            {{ t('revenuecat_config_error_suggestion') }}
          </p>
        </div>

        <!-- BAŞARILI DURUM (Paketler gösteriliyor) -->
        <div v-else-if="isOfferAvailable && isOnline" class="w-full h-full flex items-center">
          <div class="flex w-screen items-center gap-6 justify-center overflow-x-auto overflow-y-hidden py-40 pl-[400px] pr-[200px]">
            <!-- Reklamları Kaldırdın Kartı -->
            <div
              v-if="areAdsBlocked"
              class="relative transform transition-all duration-300 cursor-pointer w-[200px] flex-shrink-0"
            >
              <!-- Popular Badge -->
              <div class="absolute -top-4 -right-2 z-20">
                <div class="bg-gradient-to-r from-green-400 to-green-500 text-white font-bold rounded-full shadow-lg border-3 text-[10px] border-green-300 flex items-center justify-center">
                  <img src="/images/icons/green_check.png" alt="Remove Ads" class="w-12 h-12 z-20">
                </div>
              </div>

              <!-- Card Container -->
              <div
                class="relative rounded-3xl shadow-2xl border-4 transition-all duration-300 package-card-height flex flex-col bg-gradient-to-br from-amber-50 to-orange-100 border-green-400 shadow-green-400"
              >
                <div class="relative p-3 flex flex-col h-full">
                  <div class="text-center">
                    <div class="flex justify-center h-28">
                      <img src="/images/icons/remove_ads.png" alt="Remove Ads" class="w-28 h-28 z-20 scale-[1.2] grayscale">
                    </div>
                  </div>

                  <div class="flex-1 flex flex-col justify-center items-center mb-4">
                    <div class="text-center w-full">
                      <div class="text-xl font-bold text-amber-700">
                        {{ t('block_ads_success') }}
                      </div>
                    </div>
                  </div>

                  <!-- Bottom Section - Price -->
                  <div class="text-center">
                    <div
                      class="bg-gradient-to-r from-green-400 to-blue-300 text-white text-md font-bold py-3 px-6 rounded-2xl shadow-lg border-2 border-green-300"
                    >
                      {{ t('congratulations') }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Paket Kartları -->
            <div
              v-for="pkg in packages"
              :key="pkg.id"
              class="relative transform transition-all duration-300 cursor-pointer w-[220px] flex-shrink-0"
              :class="{
                'opacity-50 pointer-events-none': isPurchaseInProgress,
              }"
              @click="confirmPurchase(pkg)"
            >
              <!-- Popular Badge -->
              <div v-if="pkg.badge" class="absolute -top-4 -right-2 z-20">
                <div class="bg-gradient-to-r from-orange-400 to-red-500 text-white font-bold px-4 py-2 rounded-full shadow-lg border-3 text-[10px] border-orange-300">
                  {{ pkg.badge }}
                </div>
              </div>

              <!-- Card Container -->
              <div
                class="relative rounded-3xl shadow-2xl border-4 transition-all duration-300 package-card-height flex flex-col bg-gradient-to-br from-amber-50 to-orange-100"
                :class="{
                  'border-yellow-400 shadow-yellow-400': selectedPackage === pkg.id,
                  'border-amber-200 hover:border-amber-300': selectedPackage !== pkg.id,
                }"
              >
                <div class="relative py-3 px-2 flex flex-col h-full">
                  <div class="text-center">
                    <div class="flex justify-center h-28">
                      <img :src="pkg.coinImage" :alt="pkg.name" class="w-28 h-28 z-20 scale-[1.2]">
                    </div>
                    <h3 class="text-xs font-bold text-amber-800 pt-5">
                      {{ pkg.name }}
                    </h3>
                    <p class="text-sm text-amber-600">
                      •{{ pkg.subtitle }}
                    </p>
                  </div>

                  <div class="flex-1 flex flex-col justify-center items-center mb-4">
                    <div class="text-center w-full">
                      <div v-if="pkg.coins > 0" class="text-xl font-bold text-amber-700">
                        {{ pkg.coins.toLocaleString() }} <span class="text-amber-600 text-sm font-medium">coin</span>
                      </div>
                    </div>

                    <div v-if="pkg.bonus > 0" class="text-center bg-green-100 border-2 border-green-300 rounded-2xl px-4 shadow-lg w-full absolute -bottom-12">
                      <div class="text-green-700 font-bold text-xs">
                        + {{ pkg.bonus.toLocaleString() }} {{ t('bonus') }}!
                      </div>
                      <div class="text-sm font-bold text-green-800">
                        {{ pkg.totalCoins.toLocaleString() }} {{ t('total') }}
                      </div>
                    </div>
                  </div>

                  <!-- Bottom Section - Price -->
                  <div class="text-center">
                    <div
                      class="bg-gradient-to-r from-amber-400 to-orange-500 text-white text-2xl font-bold py-3 px-6 rounded-2xl shadow-lg border-2 border-amber-300"
                    >
                      {{ pkg.price }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- İNTERNET YOK veya BAŞKA BİR DURUM -->
        <div v-else class="flex flex-col items-center justify-center text-center">
          <div class="mb-6">
            <img
              src="/images/mascots/showing_right.png"
              alt="No connection"
              class="w-24 h-24 mx-auto scale-[1.4] grayscale opacity-50"
            >
          </div>
          <h2 class="text-2xl font-bold text-amber-100 mb-2 titre">
            {{ t('internet_connection_required') }}
          </h2>
          <p class="text-amber-200 text-lg">
            {{ t('please_check_your_internet_connection') }}
          </p>
        </div>
      </div>
    </main>

    <!-- Toast Notifications -->
    <ToastContainer
      v-if="showSuccessToast"
      :show="showSuccessToast"
      type="success"
      :title="t('success')"
      :message="t('purchase_success')"
      @close="showSuccessToast = false"
    />

    <ToastContainer
      v-if="showErrorToast"
      :show="showErrorToast"
      type="error"
      :title="t('error')"
      :message="errorToastMessage"
      @close="showErrorToast = false"
    />

    <!-- Loading Overlay -->
    <div v-if="isPurchaseInProgress" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
      <div class="flex flex-col items-center justify-center">
        <div class="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin" />
        <p class="text-white mt-4 text-xl font-bold">
          {{ t('processing') }}...
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.border-3 {
  border-width: 3px;
}

.package-card-height {
  height: 280px;
}

/* Tarayıcı scrollbar'ını gizlemek için (isteğe bağlı ama daha şık durur) */
.overflow-x-auto::-webkit-scrollbar {
  display: none; /* Chrome, Safari ve Opera */
}
.overflow-x-auto {
  -ms-overflow-style: none;  /* IE ve Edge */
  scrollbar-width: none;  /* Firefox */
}
</style>
