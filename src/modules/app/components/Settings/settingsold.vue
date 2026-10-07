<script setup>
import TheHeader from '@/components/TheHeader.vue'
import { alertService } from '@/core/services/AlertService.js'
import { languageService } from '@/core/services/LanguageService'
import notificationService from '@/core/services/NotificationService'
import { soundService } from '@/core/services/SoundService.js'
import { useCoreStore } from '@/store/coreStore'
import { usePlayerStore } from '@/store/playerStore'
import { computed, h, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

const { t } = useI18n()
const playerStore = usePlayerStore()

onMounted(async () => {
  await languageService.initializeWithPlayerStore(playerStore)
})

const notifications = computed({
  get: () => playerStore.settings.notifications,
  set: value => playerStore.updateSettings({ notifications: value }),
})

const soundEnabled = computed({
  get: () => playerStore.settings.soundEnabled,
  set: value => playerStore.updateSettings({ soundEnabled: value }),
})

// musicVolume kaldırıldı, musicEnabled eklendi
const musicEnabled = computed({
  get: () => playerStore.settings.musicEnabled,
  set: value => playerStore.updateSettings({ musicEnabled: value }),
})

const vibration = computed({
  get: () => playerStore.settings.vibration,
  set: value => playerStore.updateSettings({ vibration: value }),
})

const language = computed({
  get: () => playerStore.settings.language,
  set: (value) => {
    playerStore.updateSettings({ language: value })
    languageService.changeLanguage(value)
  },
})

// --- AYAR İZLEYİCİLERİ ---
watch(soundEnabled, (isEnabled) => {
  soundService.toggleMasterSound(isEnabled)
})

// musicEnabled için izleyici eklendi
watch(musicEnabled, (isEnabled) => {
  soundService.toggleMusicSetting(isEnabled)
})

// --- BİLDİRİM FONKSİYONU ---
async function toggleNotifications() {
  soundService.playEffect('click_effect_2')
  const currentState = notifications.value

  if (!currentState) {
    const permissionGranted = await notificationService.requestPermission()
    if (!permissionGranted) {
      console.log('İzin verilmedi, buton kapalı kalacak.')
    }
  }
  else {
    playerStore.updateSettings({ notifications: false })
  }
}

// --- DİĞER AYAR FONKSİYONLARI ---
function toggleSound() {
  soundService.playEffect('click_effect_2')
  soundEnabled.value = !soundEnabled.value
}

// Müzik için yeni toggle fonksiyonu
function toggleMusic() {
  soundService.playEffect('click_effect_2')
  musicEnabled.value = !musicEnabled.value
}

function toggleVibration() {
  soundService.playEffect('click_effect_2')
  vibration.value = !vibration.value
}

const PrivacyPolicyComponent = {
  setup() {
    return () => h('div', {
      class: 'bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg h-[200px] overflow-y-auto p-4',
    }, [
      h('div', { class: 'prose prose-sm max-w-none text-gray-800' }, [
        h('h3', { class: 'text-lg font-bold mb-4 text-blue-800' }, t('privacy_policy')),
        h('p', { class: 'text-sm mb-4' }, [h('strong', t('last_update')), ' 19.07.2025']),
        h('div', { class: 'space-y-4' }, [
          h('div', [
            h('h4', { class: 'font-semibold text-blue-700 mb-2' }, t('privacyPolicyTitle1')),
            h('p', { class: 'text-sm' }, t('privacyPolicyText1')),
          ]),
          h('div', [
            h('h4', { class: 'font-semibold text-blue-700 mb-2' }, t('privacyPolicyTitle2')),
            h('p', { class: 'text-sm' }, t('privacyPolicyText2')),
          ]),
          h('div', [
            h('h4', { class: 'font-semibold text-blue-700 mb-2' }, t('privacyPolicyTitle3')),
            h('p', { class: 'text-sm' }, t('privacyPolicyText3')),
          ]),
          h('div', [
            h('h4', { class: 'font-semibold text-blue-700 mb-2' }, t('privacyPolicyTitle4')),
            h('p', { class: 'text-sm' }, t('privacyPolicyText4')),
          ]),
          h('div', [
            h('h4', { class: 'font-semibold text-blue-700 mb-2' }, t('privacyPolicyTitle5')),
            h('p', { class: 'text-sm' }, t('privacyPolicyText5')),
          ]),
          h('div', { class: 'bg-blue-100 p-3 rounded-lg' }, [
            h('h4', { class: 'font-semibold text-blue-800 mb-2' }, t('privacyPolicyTitle5')),
            h('p', { class: 'text-sm' }, t('privacyPolicyText6')),
            h('p', { class: 'text-sm mt-2' }, ['• ', h('strong', t('email')), ': shorproduction@gmail.com']),
          ]),
        ]),
      ]),
    ])
  },
}

async function openPrivacyPolicy() {
  soundService.playEffect('click_effect_2')
  await alertService.showWithSlot({
    title: t('privacy_policy'),
    customContent: 'slot-content',
    slotComponent: PrivacyPolicyComponent,
    confirmButtonText: t('ok'),
    cancelButtonText: null,
  })
}

function sendEmail() {
  soundService.playEffect('click_effect_2')
  window.location.href = 'mailto:shorproduction@gmail.com'
}
</script>

<template>
  <div class="relative h-screen w-full overflow-hidden bg-wooden-background">
    <!-- Header -->
    <TheHeader />

    <!-- Main Content -->
    <main class="flex flex-col h-fusll px-4 pb-4 -mt-[75px]">
      <div class="flex-1 flex items-center justify-center">
        <div class="w-full max-w-3xl h-full">
          <div class="grid grid-cols-2 gap-6 h-screen pb-[50px]">
            <!-- Game Settings -->
            <div class="bg-gradient-to-br from-amber-50 to-orange-100 rounded-3xl shadow-2xl border-4 border-amber-200 cartoon-panel overflow-y-auto h-[380px] pb-[100px] pt-[25px] px-5">
              <h2 class="text-xl font-bold text-amber-800  text-center flex items-center justify-center py-2">
                {{ t('game_settings') }}
              </h2>
              <div class="space-y-4">
                <!-- Sound & Music Row -->
                <div class="grid grid-cols-1  gap-4">
                  <!-- Sound Toggle -->
                  <div class="p-4 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform  cartoon-card" @click="toggleSound">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-3">
                        <div class="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                          <img src="/images/badge/sound_badge.png" alt="sound" class="w-5 h-5 scale-[2]">
                        </div>
                        <div>
                          <h3 class="font-bold text-amber-800 text-sm">
                            {{ t('sound_effects') }}
                          </h3>
                          <p class="text-xs text-amber-600">
                            {{ soundEnabled ? t('on') : t('off') }}
                          </p>
                        </div>
                      </div>
                      <button
                        class="w-12 h-6 rounded-full transition-all duration-300 cartoon-toggle"
                        :class="soundEnabled ? 'bg-green-500 shadow-lg shadow-green-300' : 'bg-gray-300 shadow-lg shadow-gray-200'"
                      >
                        <div
                          class="w-5 h-5 rounded-full bg-white shadow-lg transform transition-all duration-300 cartoon-toggle-thumb"
                          :class="soundEnabled ? 'translate-x-6 scale-110' : 'translate-x-0.5 scale-100'"
                        />
                      </button>
                    </div>
                  </div>

                  <!-- Music Toggle (Değiştirildi) -->
                  <div class="p-4 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform cartoon-card" @click="toggleMusic">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-3">
                        <div class="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center">
                          <img src="/images/badge/music_badge.png" alt="music" class="w-5 h-5 scale-[2]">
                        </div>
                        <div>
                          <h3 class="font-bold text-amber-800 text-sm">
                            {{ t('music') }}
                          </h3>
                          <p class="text-xs text-amber-600">
                            {{ musicEnabled ? t('on') : t('off') }}
                          </p>
                        </div>
                      </div>
                      <button
                        class="w-12 h-6 rounded-full transition-all duration-300 cartoon-toggle"
                        :class="musicEnabled ? 'bg-green-500 shadow-lg shadow-green-300' : 'bg-gray-300 shadow-lg shadow-gray-200'"
                      >
                        <div
                          class="w-5 h-5 rounded-full bg-white shadow-lg transform transition-all duration-300 cartoon-toggle-thumb"
                          :class="musicEnabled ? 'translate-x-6 scale-110' : 'translate-x-0.5 scale-100'"
                        />
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Notifications -->
                <div class="p-4 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform  cartoon-card" @click="toggleNotifications">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 bg-gradient-to-br from-red-400 to-pink-500 rounded-full flex items-center justify-center">
                        <img src="/images/badge/announcement_badge.png" alt="notifications" class="w-5 h-5 scale-[2]">
                      </div>
                      <div>
                        <h3 class="font-bold text-amber-800 text-sm">
                          {{ t('notifications') }}
                        </h3>
                        <p class="text-xs text-amber-600">
                          {{ notifications ? t('on') : t('off') }}
                        </p>
                      </div>
                    </div>
                    <button
                      class="w-12 h-6 rounded-full transition-all duration-300 cartoon-toggle"
                      :class="notifications ? 'bg-green-500 shadow-lg shadow-green-300' : 'bg-gray-300 shadow-lg shadow-gray-200'"
                    >
                      <div
                        class="w-5 h-5 rounded-full bg-white shadow-lg transform transition-all duration-300 cartoon-toggle-thumb"
                        :class="notifications ? 'translate-x-6 scale-110' : 'translate-x-0.5 scale-100'"
                      />
                    </button>
                  </div>
                </div>

                <!-- Vibration -->
                <div class="p-4 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform  cartoon-card" @click="toggleVibration">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-full flex items-center justify-center">
                        <img src="/images/badge/vibration_badge.png" alt="vibration" class="w-5 h-5 scale-[2]">
                      </div>
                      <div>
                        <h3 class="font-bold text-amber-800 text-sm">
                          {{ t('vibration') }}
                        </h3>
                        <p class="text-xs text-amber-600">
                          {{ vibration ? t('on') : t('off') }}
                        </p>
                      </div>
                    </div>
                    <button
                      class="w-12 h-6 rounded-full transition-all duration-300 cartoon-toggle"
                      :class="vibration ? 'bg-green-500 shadow-lg shadow-green-300' : 'bg-gray-300 shadow-lg shadow-gray-200'"
                    >
                      <div
                        class="w-5 h-5 rounded-full bg-white shadow-lg transform transition-all duration-300 cartoon-toggle-thumb"
                        :class="vibration ? 'translate-x-6 scale-110' : 'translate-x-0.5 scale-100'"
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Legal & Support -->
            <div class="bg-gradient-to-br from-blue-50 to-purple-100 rounded-3xl shadow-2xl border-4 border-blue-200 overflow-y-auto h-[380px] flex flex-col justify-center px-5 cartoon-panel">
              <h2 class="text-xl font-bold text-blue-800 text-center flex items-center justify-center py-2">
                {{ t('support_and_information') }}
              </h2>
              <div class="space-y-4">
                <!-- Contact -->
                <div class="p-4 bg-white rounded-2xl shadow-lg cursor-pointer hover:shadow-xl transition-all duration-300 transform  cartoon-card" @click="sendEmail">
                  <div class="flex items-center gap-4">
                    <div class="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                      <img src="/images/badge/mail_badge.png" alt="email" class="w-6 h-6 scale-[2]">
                    </div>
                    <div>
                      <h3 class="font-bold text-blue-800 text-sm">
                        {{ t('contact_us') }}
                      </h3>
                      <p class="text-xs text-blue-600">
                        shorproduction@gmail.com
                      </p>
                    </div>
                  </div>
                </div>

                <!-- Privacy Policy -->
                <div class="p-4 bg-white rounded-2xl shadow-lg cursor-pointer hover:shadow-xl transition-all duration-300 transform  cartoon-card" @click="openPrivacyPolicy">
                  <div class="flex items-center gap-4">
                    <div class="w-12 h-12 bg-gradient-to-br from-purple-400 to-violet-500 rounded-full flex items-center justify-center">
                      <img src="/images/badge/info_badge.png" alt="privacy" class="w-6 h-6 scale-[2]">
                    </div>
                    <div>
                      <h3 class="font-bold text-blue-800 text-sm">
                        {{ t('privacy_policy') }}
                      </h3>
                      <p class="text-xs text-blue-600">
                        {{ t('data_security') }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
/* Stiller olduğu gibi kalabilir */
@keyframes gradient-shift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
.cartoon-panel {
  border-radius: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  background: linear-gradient(145deg, #ffffff, #f0f0f0);
}
.cartoon-card {
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  background: linear-gradient(145deg, #ffffff, #f8f8f8);
}
.cartoon-slider {
  -webkit-appearance: none;
  appearance: none;
  height: 8px;
  border-radius: 4px;
  background: linear-gradient(to right, #fbbf24, #f59e0b);
  outline: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
.cartoon-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: linear-gradient(145deg, #ffffff, #f0f0f0);
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  border: 2px solid #fbbf24;
}
.cartoon-slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: linear-gradient(145deg, #ffffff, #f0f0f0);
  cursor: pointer;
  border: 2px solid #fbbf24;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}
</style>
