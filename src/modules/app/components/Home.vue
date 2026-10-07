<script setup>
import { App } from '@capacitor/app'
import { computed, h, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Balance from '@/components/Balance.vue'
import PButton from '@/components/PButton.vue'
import { admobService } from '@/core/services/admobService'
import { alertService } from '@/core/services/AlertService.js'
import { languageService } from '@/core/services/LanguageService.js'
import { mobileService } from '@/core/services/MobileService'
import { soundService } from '@/core/services/SoundService.js'
import { useCoreStore } from '@/store/coreStore'
import { usePlayerStore } from '@/store/playerStore'

const coreStore = useCoreStore()
const playerStore = usePlayerStore()
const { t } = useI18n()

// --- Language Logic ---
const supportedLanguages = computed(() =>
  languageService.getSupportedLanguages(),
)
const language = computed({
  get: () => playerStore.settings.language,
  set: (value) => {
    playerStore.updateSettings({ language: value })
    languageService.changeLanguage(value)
  },
})
const currentLanguage = computed(() =>
  languageService.getLanguageInfo(language.value),
)
const LanguageSelectorComponent = {
  props: ['languages', 'initialSelection', 'onSelect'],
  setup(props) {
    const selected = ref(props.initialSelection)
    const selectLanguage = (langCode) => {
      selected.value = langCode
      props.onSelect(langCode)
      soundService.playEffect('click_effect_2')
    }
    return () =>
      h(
        'div',
        {
          class:
            'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3 h-[220px] overflow-y-auto px-1 py-1',
        },
        props.languages.map(lang =>
          h(
            'button',
            {
              class: `flex flex-col items-center gap-2 p-2.5 bg-gradient-to-b rounded-2xl cursor-pointer transition-all duration-150 border-b-4 relative touch-manipulation ${
                selected.value === lang.code
                  ? 'from-yellow-300 to-amber-400 border-2 border-amber-600 border-b-amber-800 scale-[1.03] shadow-[0_8px_0_0_#92400e] text-amber-950'
                  : 'from-white to-sky-100 border-2 border-sky-300 border-b-sky-500 shadow-[0_6px_0_0_#1d4ed8] hover:translate-y-[-1px]'
              }`,
              onClick: () => selectLanguage(lang.code),
            },
            [
              h(
                'div',
                {
                  class:
                    'w-12 h-9 rounded-lg overflow-hidden shadow-md flex-shrink-0 border border-white',
                },
                [
                  h('img', {
                    src: lang.flag,
                    alt: lang.label,
                    class: 'w-full h-full object-cover',
                  }),
                ],
              ),
              h('div', { class: 'text-center leading-tight' }, [
                h(
                  'span',
                  { class: 'block font-bold text-xs uppercase tracking-wide' },
                  lang.label,
                ),
                h(
                  'span',
                  { class: 'block text-[10px] opacity-70 uppercase' },
                  lang.code.toUpperCase(),
                ),
              ]),
              selected.value === lang.code
                ? h(
                    'div',
                    {
                      class:
                        'absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center animate-bounce',
                    },
                    [
                      h('img', {
                        src: '/images/icons/green_check.png',
                        alt: 'check',
                        class: 'w-full h-full scale-[2]',
                      }),
                    ],
                  )
                : null,
            ],
          ),
        ),
      )
  },
}
async function showLanguageModal() {
  soundService.playEffect('button_click')
  let temporarySelectedLang = language.value
  const confirmed = await alertService.showWithSlot({
    title: t('select_language'),
    customContent: 'slot-content',
    slotComponent: LanguageSelectorComponent,
    slotProps: {
      languages: supportedLanguages.value,
      initialSelection: language.value,
      onSelect: (langCode) => {
        temporarySelectedLang = langCode
      },
    },
    confirmButtonText: t('choose'),
    cancelButtonText: t('cancel'),
  })
  if (confirmed) {
    language.value = temporarySelectedLang
  }
}

// --- Ödüllü Reklam Mantığı ---
const showAdButton = ref(false)
const isRewardedAdLoading = ref(false)
let appStateListener = null

onMounted(() => {
  // Home sayfasına geldiğimizde oyun sayfası durumunu sıfırla
  coreStore.resetGamePageState()

  showAdButton.value = true

  // Capacitor app state change event'ini dinle
  if (mobileService.isNative) {
    App.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) {
        coreStore.updateLastActiveTime()
      }
    }).then((listener) => {
      appStateListener = listener
    })
  }
})

onBeforeUnmount(() => {
  appStateListener?.remove()
  appStateListener = null
})

const adsLeftText = computed(() => {
  const left = playerStore.adsLeftToday
  if (left > 0) {
    return `(${left} ${t('left')})`
  }
  return `(${t('full_limit')})`
})

async function watchAdForCoin() {
  soundService.playEffect('click_effect_2')

  if (!playerStore.canWatchAd) {
    await alertService.show({
      title: t('full_limit'),
      message: t('ads_limit_message'),
      confirmButtonText: t('ok'),
    })
    return
  }

  // --- GÜNCELLENEN ONAY PENCERESİ ---
  const confirmed = await alertService.show({
    title: t('watch_ad_title'),
    message: t('watch_ad_message'),
    confirmButtonText: t('watch'),
    cancelButtonText: t('cancel'),
    customContent: 'slot-content',
    slotComponent: {
      setup() {
        return () =>
          h(
            'div',
            { class: 'flex flex-col items-center justify-center gap-2 my-4' },
            [
              h('img', {
                src: '/images/coin-packages/coin1.png',
                class: 'w-20 h-20 scale-[1.5] drop-shadow-lg',
              }),
              h(
                'p',
                { class: 'text-xl font-bold text-amber-800' },
                `${t('today_ads_left')} ${playerStore.adsLeftToday} ${t('ads_left_today')}`,
              ),
            ],
          )
      },
    },
  })

  if (!confirmed) {
    return // Kullanıcı vazgeçerse işlemi sonlandır
  }
  // --- DEĞİŞİKLİK SONU ---

  console.log(
    '🎬 Reklam izleme başlıyor... Platform:',
    mobileService.isNative ? 'Native' : 'Web',
  )
  console.log(
    '📊 Başlangıç durumu - Coin:',
    playerStore.coins,
    'CanWatch:',
    playerStore.canWatchAd,
  )

  // Loading başlat
  isRewardedAdLoading.value = true

  try {
    // Her durumda ödül ver - reklam servisi sorunlu olabilir
    if (mobileService.isNative) {
      console.log('📱 Native platformda reklam gösterilmeye çalışılıyor...')
      try {
        // Reklam göstermeyi dene ama sonuca bakmaksızın ödül ver
        await admobService.showRewardedAd((loading) => {
          console.log('📱 AdMob Loading state:', loading)
          isRewardedAdLoading.value = loading
        })
        console.log(
          '🎥 Native reklam tamamlandı (sonuç ne olursa olsun ödül verilecek)',
        )
      }
      catch (adError) {
        console.log('📱 Reklam hatası (yine de ödül verilecek):', adError)
      }
    }
    else {
      console.log('🌐 Web platformda simülasyon...')
      await new Promise(resolve => setTimeout(resolve, 2000))
      console.log('🌐 Web simülasyon tamamlandı')
    }

    // Loading'i kapat
    isRewardedAdLoading.value = false

    // Her durumda ödül ver
    console.log('✅ Ödül veriliyor (reklam durumuna bakılmaksızın)...')

    // Reklam izleme kaydını yap
    const recorded = playerStore.recordAdWatch()
    console.log('📊 Reklam kaydı:', recorded)

    if (recorded) {
      // Coin ver
      const coinsWon = Math.floor(Math.random() * 301) + 1000
      console.log('🪙 Coin veriliyor:', coinsWon)

      playerStore.addCoins(coinsWon)
      console.log('💰 Coin eklendi. Yeni bakiye:', playerStore.coins)

      soundService.playEffect('coin')

      // Ödül alert'ini göster
      await alertService.show({
        title: t('congratulations'),
        message: t('ads_watch_success'),
        confirmButtonText: t('awesome'),
        customContent: 'slot-content',
        slotComponent: {
          setup() {
            return () =>
              h(
                'div',
                {
                  class: 'flex flex-col items-center justify-center gap-2 my-4',
                },
                [
                  h('img', {
                    src: '/images/coin-packages/coin1.png',
                    class: 'w-20 h-20 scale-[1.5] drop-shadow-lg',
                  }),
                  h(
                    'p',
                    { class: 'text-3xl font-bold text-amber-800' },
                    `+${coinsWon}`,
                  ),
                ],
              )
          },
        },
      })

      console.log('🎉 Ödül alerti gösterildi!')
    }
    else {
      showAdButton.value = false
      console.log('❌ Reklam kaydedilemedi - limit dolmuş')
      await alertService.show({
        title: t('full_limit'),
        message: t('ads_limit_message'),
        confirmButtonText: t('ok'),
      })
    }
  }
  catch (error) {
    console.error('❗ watchAdForCoin genel hatası:', error)
    isRewardedAdLoading.value = false
    await alertService.show({
      title: t('error'),
      message: t('ads_watch_error'),
      confirmButtonText: t('ok'),
      variant: 'error',
    })
  }
}

// --- Geçiş Reklamı Mantığı ---
const isInterstitialLoading = ref(false)

async function handleClickWithAd(pageName) {
  soundService.playEffect('button_click')

  // Her tıklamada sayacı artır
  playerStore.incrementInterstitialClickCount()

  // 1. Reklamlar satın alınarak engellenmiş mi kontrol et
  if (playerStore.purchases.isAdsBlocked) {
    coreStore.goTo(pageName)
    return
  }

  // 2. Reklam gösterme koşulunu kontrol et (her 5 tıklamada bir)
  const shouldShowAd = playerStore.interstitialClickCount % 5 === 0

  if (mobileService.isNative && shouldShowAd) {
    // Reklam gösterilecekse
    isInterstitialLoading.value = true
    await admobService.showInterstitialAd()
    isInterstitialLoading.value = false
    // Reklam kapandıktan sonra sayfaya git
    coreStore.goTo(pageName)
  }
  else {
    // Reklam gösterilmeyecekse doğrudan sayfaya git
    coreStore.goTo(pageName)
  }
}

function cancelAdAndGoToShop() {
  // Kullanıcı reklamı kaldırmak istedi, dükkana yönlendir
  isInterstitialLoading.value = false
  coreStore.goTo('Shop')
}
</script>

<template>
  <div class="home-screen w-full relative overflow-x-hidden overflow-y-auto">
    <div class="home-overlay" />
    <div class="home-atmosphere" />

    <!-- Geçiş Reklamı Yükleme Ekranı -->
    <div
      v-if="isInterstitialLoading"
      class="interstitial-overlay"
      @click="cancelAdAndGoToShop"
    >
      <div class="interstitial-spinner" />
      <h2 class="text-2xl font-bold mb-2 titre">
        {{ t("loading_ad") }}
      </h2>
      <p class="text-lg opacity-85 titre">
        {{ t("please_wait_ad") }}
      </p>
      <p class="interstitial-tip">
        {{ t("go_to_buy_coin_page_to_remove_ads") }}
      </p>
    </div>

    <div
      class="home-shell relative z-10 min-h-[100dvh] w-full grid grid-rows-[auto_1fr] gap-3"
    >
      <div class="hud-row">
        <div class="hud-brand">
          <img
            class="hud-brand-logo"
            src="/images/logo/puzzmo_logo_3.png"
            alt="Puzzmo Logo"
          >
          <div class="hud-brand-copy">
            <span class="hud-brand-title titre">PUZZMO</span>
            <span class="hud-brand-subtitle titre">{{ t("endless") }}</span>
          </div>
        </div>

        <div class="hud-right">
          <Balance />
          <div v-if="showAdButton" class="reward-wrap">
            <PButton
              size="md"
              variant="success"
              img="/images/icons/ad_icon.png"
              class="reward-btn"
              aria-label="Watch ad and earn coins"
              @click="watchAdForCoin"
            />
            <div class="titre reward-text">
              <span class="reward-title">{{ t("watch_earn") }}</span>
              <span class="reward-subtitle">{{ adsLeftText }}</span>
            </div>
            <div v-if="isRewardedAdLoading" class="ad-loader-overlay">
              <div class="ad-loader-spinner" />
            </div>
          </div>
        </div>
      </div>

      <div class="hero-stage">
        <div class="home-main-grid">
          <section class="hero-card menu-panel">
            <div class="hero-header">
              <div class="hero-logo-wrap">
                <div class="hero-logo-glow" />
                <div class="hero-logo">
                  <img
                    class="hero-logo-image"
                    src="/images/logo/puzzmo_logo_3.png"
                    alt="Puzzmo Logo"
                  >
                </div>
              </div>

              <div class="hero-copy">
                <p class="hero-title titre">
                  {{ t("endless_mode_title") }}
                </p>
                <p class="hero-subtitle titre">
                  {{ t("endless_mode_intro_text") }}
                </p>
              </div>
            </div>

            <div class="hero-stats">
              <div class="hero-stat-chip">
                <img src="/images/icons/star.png" alt="High score">
                <div class="hero-stat-copy">
                  <span class="hero-stat-label titre">{{ t("highest_score") }}</span>
                  <strong class="hero-stat-value titre">{{
                    playerStore.endlessStats.highScore.toLocaleString()
                  }}</strong>
                </div>
              </div>

              <div class="hero-stat-chip hero-stat-chip--alt">
                <img src="/images/icons/cards.png" alt="Total matches">
                <div class="hero-stat-copy">
                  <span class="hero-stat-label titre">{{ t("matches") }}</span>
                  <strong class="hero-stat-value titre">{{
                    playerStore.endlessStats.totalMatches.toLocaleString()
                  }}</strong>
                </div>
              </div>
            </div>

            <PButton
              size="xl"
              variant="warning"
              layout="inline"
              img="/images/icons/cup.png"
              :label="t('start_game')"
              class="play-cta"
              aria-label="Play endless mode"
              @click="handleClickWithAd('Endless')"
            />

            <p class="hero-note titre">
              {{ t("match_cards") }}
            </p>
          </section>

          <section class="menu-panel shortcuts-card">
            <div class="menu-actions">
              <PButton
                size="lg"
                variant="secondary"
                layout="inline"
                img="/images/badge/achievement_badge.png"
                :label="t('stats')"
                class="menu-entry"
                aria-label="Profile stats"
                @click="handleClickWithAd('Profile')"
              />

              <PButton
                size="lg"
                variant="secondary"
                layout="inline"
                img="/images/badge/cog_badge.png"
                :label="t('settings')"
                class="menu-entry"
                aria-label="Settings"
                @click="handleClickWithAd('Settings')"
              />

              <PButton
                size="lg"
                variant="primary"
                layout="inline"
                :img="currentLanguage.flag"
                :label="t('language')"
                class="menu-entry menu-entry--flag"
                aria-label="Select language"
                @click="showLanguageModal"
              />

              <PButton
                size="lg"
                variant="success"
                layout="inline"
                img="/images/icons/cards.png"
                :label="t('shop')"
                class="menu-entry"
                aria-label="Shop"
                @click="handleClickWithAd('Shop')"
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-screen {
  min-height: 100vh;
  min-height: 100dvh;
  height: 100dvh;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  --game-yellow: #ffe27a;
  --game-orange: #ff9f1f;
  --game-blue: #2c86ff;
  --game-blue-deep: #1f4ab5;
  --game-green: #20c06b;
  --game-ink: #1b2655;
  --game-shadow: 0 10px 0 rgba(18, 38, 92, 0.45);
  background:
    linear-gradient(180deg, rgba(7, 24, 65, 0.3) 0%, rgba(7, 18, 46, 0.72) 100%),
    url('/images/backgrounds/spring_bg.jpg') center / cover no-repeat;
}

.home-shell {
  min-height: 100dvh;
  position: relative;
  z-index: 2;
  padding: calc(0.8rem + env(safe-area-inset-top)) 0.85rem
    calc(0.75rem + env(safe-area-inset-bottom));
  gap: 0.6rem;
}

.home-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(
    180deg,
    rgba(14, 30, 74, 0.35) 0%,
    rgba(8, 18, 48, 0.68) 100%
  );
}

.home-atmosphere {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
  background:
    linear-gradient(180deg, rgba(13, 36, 95, 0.08) 0%, rgba(8, 18, 48, 0.44) 100%),
    url('/images/backgrounds/endless_game_side_spring.jpg') center / cover no-repeat;
  opacity: 0.48;
}

.home-atmosphere::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 18% 18%, rgba(255, 255, 255, 0.18) 0%, transparent 18%),
    radial-gradient(circle at 82% 22%, rgba(255, 226, 122, 0.18) 0%, transparent 20%),
    radial-gradient(circle at 50% 84%, rgba(92, 162, 255, 0.15) 0%, transparent 24%);
  mix-blend-mode: screen;
  opacity: 0.7;
}

.interstitial-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
  color: white;
  background: rgba(3, 7, 24, 0.84);
  backdrop-filter: blur(2px);
}

.interstitial-spinner {
  width: 52px;
  height: 52px;
  border-radius: 999px;
  border: 4px solid rgba(255, 255, 255, 0.95);
  border-top-color: transparent;
  margin-bottom: 1.25rem;
  animation: spin 0.9s linear infinite;
}

.interstitial-tip {
  margin-top: 1.5rem;
  max-width: 32rem;
  font-size: 0.8rem;
  line-height: 1.25;
  opacity: 0.72;
}

.hud-row {
  display: flex;
  width: 100%;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.68rem;
}

.hud-brand {
  display: inline-flex;
  align-items: center;
  gap: 0.58rem;
  padding: 0.34rem 0.66rem;
  border: 2px solid rgba(133, 182, 255, 0.9);
  border-bottom-width: 5px;
  border-radius: 1rem;
  background: linear-gradient(
    180deg,
    rgba(33, 91, 198, 0.92) 0%,
    rgba(20, 57, 138, 0.96) 100%
  );
  box-shadow:
    0 8px 0 rgba(14, 43, 106, 0.48),
    0 12px 18px rgba(7, 25, 73, 0.26);
}

.hud-brand-logo {
  width: 48px;
  height: auto;
  filter: drop-shadow(0 6px 8px rgba(11, 27, 74, 0.42));
}

.hud-brand-copy {
  display: flex;
  flex-direction: column;
  gap: 0.06rem;
  line-height: 1;
}

.hud-brand-title,
.hud-brand-subtitle {
  color: #f7fbff;
  text-transform: uppercase;
  text-shadow: 0 2px 0 rgba(14, 43, 109, 0.7);
}

.hud-brand-title {
  font-size: clamp(0.86rem, 2vw, 1rem);
  letter-spacing: 0.08em;
}

.hud-brand-subtitle {
  font-size: clamp(0.58rem, 1.6vw, 0.68rem);
  letter-spacing: 0.06em;
  opacity: 0.88;
}

.hud-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.56rem;
}

.reward-wrap {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.48rem;
  padding: 0.34rem 0.5rem;
  border-radius: 1rem;
  border: 2px solid rgba(132, 232, 174, 0.6);
  background: linear-gradient(
    180deg,
    rgba(16, 64, 36, 0.72) 0%,
    rgba(8, 41, 24, 0.8) 100%
  );
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.2),
    0 8px 14px rgba(8, 26, 17, 0.33);
}

.reward-btn :deep(.pbtn-frame) {
  width: 76px;
  height: 76px;
}

.reward-text {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  line-height: 1;
  color: #ebffef;
  text-shadow: 0 2px 0 rgba(6, 52, 21, 0.6);
}

.reward-subtitle {
  font-size: 0.58rem;
  opacity: 0.8;
  line-height: 1;
}

.reward-title {
  font-size: 0.72rem;
  line-height: 1;
}

.hero-stage {
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.home-main-grid {
  width: min(100%, 880px);
  margin-inline: auto;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 0.7rem;
  align-items: stretch;
}

.menu-panel {
  position: relative;
  overflow: hidden;
  border: 3px solid #86baff;
  border-bottom-width: 8px;
  border-radius: 1.55rem;
  background: linear-gradient(
    180deg,
    rgba(26, 73, 177, 0.92) 0%,
    rgba(19, 56, 138, 0.95) 55%,
    rgba(15, 42, 103, 0.97) 100%
  );
  box-shadow:
    0 12px 0 rgba(16, 43, 111, 0.55),
    0 20px 24px rgba(8, 22, 62, 0.34);
}

.menu-panel::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.18;
}

.menu-panel::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.2) 0%,
    rgba(255, 255, 255, 0.02) 28%,
    rgba(4, 18, 52, 0.18) 100%
  );
}

.hero-card {
  padding: 0.96rem;
  display: flex;
  flex-direction: column;
  gap: 0.82rem;
}

.hero-card::before {
  background:
    linear-gradient(180deg, rgba(9, 28, 73, 0.16) 0%, rgba(9, 28, 73, 0.58) 100%),
    url('/images/level-cards/endless_mode_card.jpg') center / cover no-repeat;
}

.hero-card > * {
  position: relative;
  z-index: 1;
}

.hero-header {
  display: flex;
  align-items: center;
  gap: 0.9rem;
}

.hero-logo-wrap {
  position: relative;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
}

.hero-logo-glow {
  position: absolute;
  width: 128%;
  height: 128%;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.32) 0%, rgba(255, 255, 255, 0) 70%);
  filter: blur(2px);
  animation: glowPulse 2.6s ease-in-out infinite;
}

.hero-logo {
  width: clamp(110px, 22vw, 170px);
  position: relative;
  display: grid;
  place-items: center;
}

.hero-logo-image {
  width: 100%;
  height: 100%;
  position: relative;
  filter: drop-shadow(0 10px 10px rgba(15, 33, 84, 0.48));
  animation: logoBounce 3s ease-in-out infinite;
}

.hero-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.32rem;
}

.hero-title {
  font-size: clamp(1.04rem, 3.2vw, 1.52rem);
  line-height: 1.05;
  color: #ffffff;
  text-shadow: 0 3px 0 rgba(13, 39, 102, 0.75);
}

.hero-subtitle {
  font-size: clamp(0.62rem, 1.9vw, 0.8rem);
  line-height: 1.35;
  letter-spacing: 0.04em;
  color: rgba(226, 241, 255, 0.92);
}

.hero-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
}

.hero-stat-chip {
  display: flex;
  align-items: center;
  gap: 0.56rem;
  padding: 0.5rem 0.62rem;
  border-radius: 1rem;
  border: 2px solid rgba(255, 221, 116, 0.7);
  background: linear-gradient(
    180deg,
    rgba(255, 206, 82, 0.28) 0%,
    rgba(169, 115, 18, 0.18) 100%
  );
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.18),
    0 8px 14px rgba(10, 28, 76, 0.18);
}

.hero-stat-chip--alt {
  border-color: rgba(140, 229, 176, 0.72);
  background: linear-gradient(
    180deg,
    rgba(57, 201, 109, 0.24) 0%,
    rgba(15, 115, 52, 0.18) 100%
  );
}

.hero-stat-chip img {
  width: 38px;
  height: 38px;
  flex: 0 0 auto;
  object-fit: contain;
  transform: scale(1.24);
  filter: drop-shadow(0 4px 5px rgba(11, 30, 75, 0.35));
}

.hero-stat-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
}

.hero-stat-label {
  font-size: 0.6rem;
  line-height: 1;
  letter-spacing: 0.06em;
  color: rgba(227, 242, 255, 0.78);
  text-transform: uppercase;
}

.hero-stat-value {
  font-size: clamp(0.9rem, 2.6vw, 1.16rem);
  line-height: 1;
  color: #ffffff;
  text-shadow: 0 2px 0 rgba(13, 39, 102, 0.75);
}

.play-cta {
  width: 100%;
  margin-top: 0.08rem;
}

.play-cta :deep(.pbtn-frame) {
  width: 100%;
  justify-content: flex-start;
  min-height: 80px;
  padding-inline: 0.95rem 1.2rem;
  border-radius: 1.3rem;
  border-width: 3px;
  border-bottom-width: 8px;
}

.play-cta :deep(.pbtn-img) {
  width: clamp(54px, 12vw, 66px);
  height: clamp(54px, 12vw, 66px);
  filter: drop-shadow(0 4px 5px rgba(122, 62, 7, 0.42));
}

.play-cta :deep(.pbtn-label-inline) {
  font-size: clamp(1.08rem, 3.7vw, 1.44rem);
  letter-spacing: 0.08em;
}

.play-cta :deep(.pbtn-sheen) {
  animation: buttonShine 2.1s linear infinite;
}

.hero-note {
  font-size: clamp(0.6rem, 1.8vw, 0.72rem);
  opacity: 0.9;
  line-height: 1;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(226, 241, 255, 0.94);
  text-align: center;
}

.shortcuts-card {
  padding: 0.8rem;
  display: grid;
  place-items: center;
}

.shortcuts-card::before {
  background:
    linear-gradient(180deg, rgba(13, 49, 117, 0.48) 0%, rgba(9, 28, 73, 0.72) 100%),
    url('/images/backgrounds/wooden_background.jpg') center / cover no-repeat;
  opacity: 0.2;
}

.menu-actions {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.58rem;
}

.menu-actions,
.shortcuts-card > * {
  position: relative;
  z-index: 1;
}

.menu-entry {
  width: 100%;
}

.menu-entry :deep(.pbtn-frame) {
  width: 100%;
  min-height: 72px;
  justify-content: flex-start;
  padding-inline: 0.78rem 0.96rem;
  border-radius: 1.12rem;
}

.menu-entry :deep(.pbtn-img) {
  width: 46px;
  height: 46px;
}

.menu-entry :deep(.pbtn-label-inline) {
  font-size: clamp(0.86rem, 2.3vw, 1rem);
  letter-spacing: 0.05em;
}

.menu-entry--flag :deep(.pbtn-img) {
  border-radius: 0.8rem;
  border: 2px solid rgba(255, 255, 255, 0.82);
}

.ad-loader-overlay {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  border-radius: 1rem;
  background: rgba(0, 0, 0, 0.42);
  z-index: 10;
}

.ad-loader-spinner {
  width: 30px;
  height: 30px;
  border-radius: 999px;
  border: 4px solid rgba(255, 255, 255, 0.95);
  border-top-color: transparent;
  animation: spin 0.8s linear infinite;
}

@keyframes logoBounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-4px);
  }
}

@keyframes glowPulse {
  0%,
  100% {
    transform: scale(0.95);
    opacity: 0.4;
  }
  50% {
    transform: scale(1.06);
    opacity: 0.82;
  }
}

@keyframes buttonShine {
  0% {
    transform: translateX(-130%) skewX(-18deg);
  }
  100% {
    transform: translateX(230%) skewX(-18deg);
  }
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

@media (max-width: 420px) {
  .home-shell {
    padding-inline: 0.6rem;
  }

  .hud-brand {
    padding-inline: 0.52rem;
  }

  .hud-brand-logo {
    width: 42px;
  }

  .hero-card {
    padding: 0.72rem 0.66rem 0.8rem;
  }

  .hero-header {
    flex-direction: column;
    text-align: center;
    gap: 0.5rem;
  }

  .hero-copy {
    align-items: center;
  }

  .hero-stats {
    grid-template-columns: 1fr;
  }

  .play-cta :deep(.pbtn-frame) {
    border-bottom-width: 7px;
    padding-inline: 0.72rem 0.86rem;
  }

  .play-cta :deep(.pbtn-label-inline) {
    font-size: 1.03rem;
  }

  .menu-actions {
    grid-template-columns: 1fr;
    gap: 0.42rem;
  }

  .menu-entry :deep(.pbtn-frame) {
    min-height: 68px;
  }

  .reward-wrap {
    padding: 0.26rem 0.36rem;
    gap: 0.34rem;
  }

  .reward-btn :deep(.pbtn-frame) {
    width: 66px;
    height: 66px;
  }
}

@media (max-height: 620px) {
  .home-shell {
    gap: 0.45rem;
    padding-top: calc(0.4rem + env(safe-area-inset-top));
    padding-bottom: calc(0.4rem + env(safe-area-inset-bottom));
  }

  .hero-card {
    padding: 0.56rem 0.62rem 0.62rem;
    gap: 0.42rem;
  }

  .hero-logo {
    width: clamp(90px, 19vh, 132px);
  }

  .hero-header {
    gap: 0.56rem;
  }

  .play-cta :deep(.pbtn-frame) {
    min-height: 56px;
    border-width: 2px;
    border-bottom-width: 5px;
    padding-inline: 0.66rem 0.86rem;
  }

  .play-cta :deep(.pbtn-label-inline) {
    font-size: clamp(0.95rem, 2.8vw, 1.2rem);
  }

  .play-cta :deep(.pbtn-img) {
    width: 46px;
    height: 46px;
  }

  .hero-subtitle {
    font-size: 0.6rem;
  }

  .hero-stats {
    gap: 0.36rem;
  }

  .hero-stat-chip {
    padding: 0.38rem 0.5rem;
  }

  .hero-stat-chip img {
    width: 32px;
    height: 32px;
  }

  .hero-stat-label,
  .hero-note,
  .hud-brand-subtitle {
    font-size: 9px;
  }

  .reward-wrap {
    padding: 0.2rem 0.38rem;
    gap: 0.24rem;
  }

  .reward-btn :deep(.pbtn-frame) {
    width: 58px;
    height: 58px;
    border-width: 2px;
    border-bottom-width: 4px;
  }

  .reward-title {
    font-size: 0.55rem;
  }

  .reward-subtitle {
    font-size: 0.5rem;
  }

  .shortcuts-card {
    padding: 0.52rem;
  }

  .menu-actions {
    gap: 0.42rem;
  }

  .menu-entry :deep(.pbtn-frame) {
    min-height: 56px;
    border-width: 2px;
    border-bottom-width: 4px;
    border-radius: 0.92rem;
    padding-inline: 0.62rem 0.78rem;
  }

  .menu-entry :deep(.pbtn-img) {
    width: 38px;
    height: 38px;
  }

  .menu-entry :deep(.pbtn-label-inline) {
    font-size: 0.78rem;
  }

  .interstitial-spinner {
    width: 40px;
    height: 40px;
  }

  .interstitial-tip {
    margin-top: 1rem;
    font-size: 0.72rem;
  }
}

@media (orientation: landscape) and (max-height: 560px) {
  .home-shell {
    row-gap: 0.34rem;
    padding-inline: 0.45rem;
  }

  .hud-brand {
    padding: 0.25rem 0.46rem;
    border-bottom-width: 4px;
  }

  .hud-brand-logo {
    width: 34px;
  }

  .hud-brand-title {
    font-size: 0.72rem;
  }

  .hud-brand-subtitle {
    font-size: 0.48rem;
  }

  .hud-right {
    flex-direction: row;
    align-items: center;
    gap: 0.36rem;
  }

  .home-main-grid {
    grid-template-columns: minmax(0, 1.18fr) minmax(190px, 0.88fr);
    gap: 0.44rem;
  }

  .hero-card {
    height: 100%;
    padding: 0.56rem 0.58rem;
    gap: 0.46rem;
  }

  .shortcuts-card {
    height: 100%;
    padding: 0.56rem;
  }

  .hero-logo {
    width: min(104px, 24vh);
  }

  .hero-subtitle {
    font-size: 0.58rem;
    line-height: 1.25;
  }

  .hero-stats {
    gap: 0.34rem;
  }

  .hero-stat-chip {
    padding: 0.34rem 0.46rem;
    gap: 0.44rem;
  }

  .hero-stat-chip img {
    width: 29px;
    height: 29px;
  }

  .hero-stat-label {
    font-size: 0.5rem;
  }

  .hero-stat-value {
    font-size: 0.82rem;
  }

  .play-cta :deep(.pbtn-frame) {
    min-height: 58px;
    border-bottom-width: 5px;
  }

  .play-cta :deep(.pbtn-img) {
    width: 48px;
    height: 48px;
  }

  .play-cta :deep(.pbtn-label-inline) {
    font-size: 0.92rem;
  }

  .hero-note {
    font-size: 0.5rem;
  }

  .menu-actions {
    grid-template-columns: 1fr;
    gap: 0.38rem;
  }

  .menu-entry :deep(.pbtn-frame) {
    min-height: 56px;
    padding-inline: 0.64rem 0.82rem;
    border-width: 2px;
    border-bottom-width: 4px;
  }

  .menu-entry :deep(.pbtn-img) {
    width: 40px;
    height: 40px;
  }

  .menu-entry :deep(.pbtn-label-inline) {
    font-size: 0.76rem;
  }
}
</style>
