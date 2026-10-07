<script setup>
import ClashButton from '@/components/ClashButton.vue'
import { soundService } from '@/core/services/SoundService.js'
import { useCoreStore } from '@/store/coreStore.js'
import { usePlayerStore } from '@/store/playerStore.js'
import { computed, watch } from 'vue' // watch import edildi
import { useI18n } from 'vue-i18n'

// Props
const props = defineProps({
  isVisible: {
    type: Boolean,
    default: false,
  },
  leavePath: {
    type: String,
    default: 'Home',
  },
  leavePathName: {
    type: String,
    default: '',
  },
})

// Emits
const emit = defineEmits(['close', 'resume'])

const { t } = useI18n()

const levelPathNameText = computed(() => {
  return props.leavePathName || t('home')
})
const coreStore = useCoreStore()
const playerStore = usePlayerStore()

// Computed properties for settings
const soundEnabled = computed({
  get: () => playerStore.settings.soundEnabled,
  set: value => playerStore.updateSettings({ soundEnabled: value }),
})

// musicVolume kaldırıldı, musicEnabled eklendi
const musicEnabled = computed({
  get: () => playerStore.settings.musicEnabled,
  set: value => playerStore.updateSettings({ musicEnabled: value }),
})

const vibrationEnabled = computed({
  get: () => playerStore.settings.vibration,
  set: value => playerStore.updateSettings({ vibration: value }),
})

// --- AYAR İZLEYİCİLERİ ---
watch(() => playerStore.settings.soundEnabled, (isEnabled) => {
  soundService.toggleMasterSound(isEnabled)
})

// musicEnabled için izleyici eklendi
watch(() => playerStore.settings.musicEnabled, (isEnabled) => {
  soundService.toggleMusicSetting(isEnabled)
})

// Methods
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
  vibrationEnabled.value = !vibrationEnabled.value
}

function resumeGame() {
  emit('resume')
}

function goToPath() {
  coreStore.goTo(props.leavePath)
  closeMenu()
}

function closeMenu() {
  soundService.playEffect('click_effect')
  emit('close')
}
</script>

<template>
  <div
    v-if="isVisible"
    class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    @click.self="closeMenu"
  >
    <div
      class="bg-gradient-to-br from-amber-50 to-orange-100 rounded-3xl shadow-2xl border-4 border-amber-200 w-full max-w-md max-h-[95vh] flex flex-col"
    >
      <!-- Header -->
      <div class="flex justify-between items-center px-6 py-4 border-b-2 border-amber-200">
        <div class="text-2xl font-bold flex items-center gap-2  titre">
          <img src="/images/icons/pause.png" class="w-12 h-12 " alt="">
          <p> {{ t('pause_menu') }}</p>
        </div>
        <button
          class="w-8 h-8 flex-shrink-0"
          @click="closeMenu"
        >
          <img src="/images/icons/cancel.png" class="w-full h-full scale-[2]" alt="">
        </button>
      </div>

      <!-- Content (Scrollable) -->
      <div class="px-6 py-4 space-y-4 overflow-y-auto w-full">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <!-- Sound Toggle -->
          <div  @click="toggleSound" class="p-4 bg-white rounded-2xl shadow-lg">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div
                  class="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center flex-shrink-0"
                >
                  <div class="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                    <img src="/images/badge/sound_badge.png" alt="sound" class="w-5 h-5 scale-[2]">
                  </div>
                </div>
                <div>
                  <h3 class="font-bold text-amber-800 text-sm">
                    {{ t('sound') }}
                  </h3>
                  <p class="text-xs text-amber-600">
                    {{ soundEnabled ? t('on') : t('off') }}
                  </p>
                </div>
              </div>
              <button
                class="w-12 h-6 rounded-full transition-all duration-300 flex-shrink-0"
                :class="soundEnabled ? 'bg-green-500 shadow-lg shadow-green-300' : 'bg-gray-300 shadow-lg shadow-gray-200'"
               
              >
                <div
                  class="w-5 h-5 rounded-full bg-white shadow-lg transform transition-all duration-300"
                  :class="soundEnabled ? 'translate-x-6 scale-110' : 'translate-x-0.5 scale-100'"
                />
              </button>
            </div>
          </div>
          <!-- Music Toggle (Değiştirildi) -->
          <div   @click="toggleMusic" class="p-4 bg-white rounded-2xl shadow-lg">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div
                  class="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0"
                >
                  <div class="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center">
                    <img src="/images/badge/music_badge.png" alt="music" class="w-5 h-5 scale-[2]">
                  </div>
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
                class="w-12 h-6 rounded-full transition-all duration-300 flex-shrink-0"
                :class="musicEnabled ? 'bg-green-500 shadow-lg shadow-green-300' : 'bg-gray-300 shadow-lg shadow-gray-200'"
              
              >
                <div
                  class="w-5 h-5 rounded-full bg-white shadow-lg transform transition-all duration-300"
                  :class="musicEnabled ? 'translate-x-6 scale-110' : 'translate-x-0.5 scale-100'"
                />
              </button>
            </div>
          </div>
        </div>

        <!-- Vibration Toggle -->
        <div @click="toggleVibration" class="p-4 bg-white rounded-2xl shadow-lg">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center flex-shrink-0"
              >
                <div class="w-10 h-10 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-full flex items-center justify-center">
                  <img src="/images/badge/vibration_badge.png" alt="vibration" class="w-5 h-5 scale-[2]">
                </div>
              </div>
              <div>
                <h3 class="font-bold text-amber-800 text-sm">
                  {{ t('vibration') }}
                </h3>
                <p class="text-xs text-amber-600">
                  {{ vibrationEnabled ? t('on') : t('off') }}
                </p>
              </div>
            </div>
            <button
              class="w-12 h-6 rounded-full transition-all duration-300 flex-shrink-0"
              :class="vibrationEnabled ? 'bg-green-500 shadow-lg shadow-green-300' : 'bg-gray-300 shadow-lg shadow-gray-200'"
              
            >
              <div
                class="w-5 h-5 rounded-full bg-white shadow-lg transform transition-all duration-300"
                :class="vibrationEnabled ? 'translate-x-6 scale-110' : 'translate-x-0.5 scale-100'"
              />
            </button>
          </div>
        </div>
      </div>

      <div class="px-6 py-4 mt-auto border-t-2 border-amber-200">
        <div class="flex gap-x-3 justify-center items-center">
          <ClashButton
            color="red"
            @click="goToPath"
          >
            {{ levelPathNameText }}
          </ClashButton>
          <ClashButton
            color="green"
            @click="resumeGame"
          >
            {{ t('resume') }}
          </ClashButton>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Stiller olduğu gibi kalabilir */
input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  height: 8px;
  border-radius: 4px;
  background: linear-gradient(to right, #fbbf24, #f59e0b);
  outline: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

input[type="range"]::-webkit-slider-thumb {
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

input[type="range"]::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: linear-gradient(145deg, #ffffff, #f0f0f0);
  cursor: pointer;
  border: 2px solid #fbbf24;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}
</style>
