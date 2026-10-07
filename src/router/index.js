import PublicChildren from '@/router/app/index'
import { useCoreStore } from '@/store/coreStore'
import { createRouter, createWebHistory } from '@ionic/vue-router'

const routes = [
  {
    path: '/',
    name: 'Public',
    component: () => import('@/modules/app/Index.vue'),
    children: PublicChildren,
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/modules/not_found/views/NotFoundPage.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(),
  linkExactActiveClass: 'active',
  routes,
})

// Global Navigation Guard
router.beforeEach((to, from) => {
  // Pinia store'unu bir component dışında kullanmak için bu şekilde çağırıyoruz.
  const coreStore = useCoreStore()

  // Sayfa yenileme kontrolü - eğer oyun sayfalarından birine doğrudan geliyorsa Home'a yönlendir
  const gamePages = ['Endless']
  const isGamePage = gamePages.includes(to.name)
  const isDirectAccess = !from.name // İlk yükleme veya sayfa yenileme

  if (isGamePage && isDirectAccess) {
    // localStorage ile sayfa yenileme kontrolü yap
    const wasGamePageActive = localStorage.getItem('puzzmo_game_page_active') === 'true'

    if (wasGamePageActive || isDirectAccess) {
      // Oyun sayfasında sayfa yenileme veya doğrudan erişim - Home'a yönlendir
      console.log(`Redirecting from ${to.name} to Home due to direct access/refresh`)
      // localStorage'ı temizle
      localStorage.removeItem('puzzmo_game_page_active')
      localStorage.removeItem('puzzmo_last_active')
      return { name: 'Home' }
    }
  }

  // 'from' bir başlangıç rotası değilse (yani ilk yükleme değilse), yolunu kaydet.
  if (from.name) {
    coreStore.setPreviousRoute(from.fullPath)
  }
  else {
    // Eğer ilk yükleme ise, geri dönülecek bir sayfa yoktur.
    coreStore.setPreviousRoute(null)
  }
})

export default router
