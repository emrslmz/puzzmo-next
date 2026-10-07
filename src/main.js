import { mobileService } from '@/core/services/MobileService'
import { soundService } from '@/core/services/SoundService'
import router from '@/router'
import { IonicVue } from '@ionic/vue'

import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { createApp } from 'vue'
import App from './App.vue'
import i18n from './i18n'

// Ionic CSS Imports
import '@ionic/vue/css/core.css'
import '@ionic/vue/css/normalize.css'
import '@ionic/vue/css/structure.css'
import '@ionic/vue/css/typography.css'
import '@ionic/vue/css/padding.css'
import '@ionic/vue/css/float-elements.css'
import '@ionic/vue/css/text-alignment.css'
import '@ionic/vue/css/text-transformation.css'
import '@ionic/vue/css/flex-utils.css'
import '@ionic/vue/css/display.css'
import 'animate.css'

// Custom CSS Imports
import './style.css'
import '@/index.css'
import '@/core/theme/variable.css'

// 1. Pinia'yı oluştur
const pinia = createPinia()

// 2. Kalıcılık (persistence) eklentisini Pinia'ya tanıt
pinia.use(piniaPluginPersistedstate)

// 3. Mobil servisleri Pinia örneği ile başlat (bu sayede servisler store'a erişebilir)
mobileService.boot(pinia)

// Sesleri önceden yükle
soundService.preload(
  [
    { id: 'click_effect_2', path: '/sounds/click_effect_2.mp3' },
    { id: 'click_effect', path: '/sounds/click_effect.mp3' },
    { id: 'coin', path: '/sounds/coin.mp3' },
    { id: 'pop', path: '/sounds/popSound.wav' },
    { id: 'swipe', path: '/sounds/swipe.mp3' },
    { id: 'time_is_up', path: '/sounds/time_is_up.mp3' },
  ],
  [{ id: 'game_theme1', path: '/sounds/game_theme1.mp3' }],
)

soundService.setSoundManifest([
  { id: 'alert', path: '/sounds/alert.wav' },
  { id: 'click_effect_2', path: '/sounds/click_effect_2.mp3' },
  { id: 'button_click', path: '/sounds/click_effect_2.mp3' },
  { id: 'click_effect', path: '/sounds/click_effect.mp3' },
  { id: 'click_sound', path: '/sounds/click_sound.wav' },
  { id: 'correct_effect_2', path: '/sounds/correct_effect_2.wav' },
  { id: 'correct_effect', path: '/sounds/correct_effect.wav' },
  { id: 'click', path: '/sounds/click.wav' },
  { id: 'coin', path: '/sounds/coin.mp3' },
  { id: 'lose', path: '/sounds/lose.mp3' },
  { id: 'powerup_use', path: '/sounds/powerup_use.mp3' },
  { id: 'earn_sound', path: '/sounds/earn_sound.mp3' },
  { id: 'select', path: '/sounds/select.mp3' },
  { id: 'pop', path: '/sounds/popSound.wav' },
  { id: 'plop', path: '/sounds/plop.wav' },
  { id: 'swipe', path: '/sounds/swipe.mp3' },
  { id: 'time_is_up', path: '/sounds/time_is_up.mp3' },
  { id: 'win_game', path: '/sounds/win_game.mp3' },
  { id: 'won_sound', path: '/sounds/won_sound.wav' },
  { id: 'success', path: '/sounds/success.wav' },
])

soundService.setMusicManifest([
  { id: 'game_theme1', path: '/sounds/game_theme1.mp3' },
  { id: 'game_theme2', path: '/sounds/game_theme2.wav' },
  { id: 'carton_game_song_2', path: '/sounds/carton_game_song_2.wav' },
])

// 4. Vue uygulamasını oluştur ve eklentileri tanıt
const app = createApp(App)
  .use(IonicVue, { mode: 'ios', swipeBackEnabled: false })
  .use(router)
  .use(pinia) // Pinia'yı Vue uygulamasına tanıt
  .use(i18n)

// 5. PlayerStore'u initialize et ve storage'dan yükle
import { usePlayerStore } from '@/store/playerStore.js'

// Router hazır olduğunda uygulamayı mount et
router.isReady().then(async () => {
  // PlayerStore'u initialize et
  const playerStore = usePlayerStore()
  await playerStore.loadFromStorage()
  
  app.mount('#app')
})
