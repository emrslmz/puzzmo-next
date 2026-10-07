import router from '@/router'
import { defineStore } from 'pinia'

export const useCoreStore = defineStore('core', {
  // state içinden alert ve toast kaldırıldı.
  state: () => ({
    isLoading: false,
    theme: 'light',
    previousRoute: null,
    isGamePageActive: false,
    lastActiveTime: null,
    navigationSource: 'normal', // 'normal', 'refresh', 'direct'
  }),

  getters: {
    isDarkTheme: state => state.theme === 'dark',
    hasPreviousRoute: state => !!state.previousRoute,
    shouldRedirectToHome: state => {
      // Oyun sayfasında iken sayfa yenilendiyse veya uzun süre inaktifse Home'a yönlendir
      return state.isGamePageActive && (!state.lastActiveTime || Date.now() - state.lastActiveTime > 30000)
    },
  },

  // actions içinden alert ve toast ile ilgili tüm action'lar kaldırıldı.
  actions: {
    setLoading(status) {
      this.isLoading = status
    },
    toggleTheme() {
      this.theme = this.theme === 'light' ? 'dark' : 'light'
    },
    setPreviousRoute(routePath) {
      this.previousRoute = routePath
    },
    setGamePageActive(isActive) {
      this.isGamePageActive = isActive
      if (isActive) {
        this.updateLastActiveTime()
        // Oyun sayfasına gidildiğini localStorage'a kaydet
        localStorage.setItem('puzzmo_game_page_active', 'true')
        localStorage.setItem('puzzmo_last_active', Date.now().toString())
      } else {
        // Oyun sayfasından çıkıldığında temizle
        localStorage.removeItem('puzzmo_game_page_active')
        localStorage.removeItem('puzzmo_last_active')
      }
    },
    updateLastActiveTime() {
      this.lastActiveTime = Date.now()
      localStorage.setItem('puzzmo_last_active', Date.now().toString())
    },
    checkGamePageRefresh() {
      // Sayfa yenileme kontrolü
      const wasGamePageActive = localStorage.getItem('puzzmo_game_page_active') === 'true'
      const lastActive = localStorage.getItem('puzzmo_last_active')
      
      if (wasGamePageActive) {
        const timeDiff = lastActive ? Date.now() - parseInt(lastActive) : Infinity
        // 5 dakikadan fazla geçmişse veya zaman bilgisi yoksa refresh kabul et
        if (timeDiff > 300000 || !lastActive) {
          this.navigationSource = 'refresh'
          return true
        }
      }
      return false
    },
    checkAndRedirectToHome() {
      if (this.shouldRedirectToHome) {
        this.resetGamePageState()
        this.goToHome()
        return true
      }
      return false
    },
    resetGamePageState() {
      this.isGamePageActive = false
      this.lastActiveTime = null
    },
    goBack() {
      if (this.hasPreviousRoute) {
        router.push(this.previousRoute)
      }
      else {
        router.go(-1)
      }
    },
    goTo(route) {
      router.push({ name: route })
    },
    goToParams(route) {
      router.push({ ...route, params: { ...route.params } })
    },
    goToHome() {
      this.resetGamePageState()
      router.push({ name: 'Home' })
    },
  },

  persist: {
    paths: ['theme'],
  },
})
