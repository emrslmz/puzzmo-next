import TutorialOverlay from '@/components/TutorialOverlay.vue'
import i18n from '@/i18n/index.ts'
import { usePlayerStore } from '@/store/playerStore'
import { getActivePinia } from 'pinia'
import { createApp, h } from 'vue'

class TutorialService {
  /**
   * Çok adımlı bir eğitim gösterir.
   * @param {object} options - Eğitim seçenekleri.
   * @param {string} options.tutorialId - Benzersiz eğitim kimliği.
   * @param {Array<object>} options.pages - Her biri {title, text, image} içeren sayfa nesneleri dizisi.
   * @param {string} [options.nextButtonText] - Sonraki sayfa buton metni.
   * @param {string} [options.finishButtonText] - Eğitimi bitirme buton metni.
   * @returns {Promise<{shown: boolean, reason: string}>}
   */
  show(options) {
    const pinia = getActivePinia()
    if (!pinia) {
      console.error('TutorialService: Aktif bir Pinia instance bulunamadı.')
      return Promise.resolve({ shown: false, reason: 'PINIA_INACTIVE' })
    }

    const playerStore = usePlayerStore(pinia)
    const { tutorialId, pages } = options

    if (!tutorialId) {
      console.error('TutorialService.show() çağrısı için `tutorialId` gereklidir.')
      return Promise.resolve({ shown: false, reason: 'ID_MISSING' })
    }

    if (!pages || pages.length === 0) {
      console.error('TutorialService.show() çağrısı için `pages` dizisi gereklidir.')
      return Promise.resolve({ shown: false, reason: 'PAGES_MISSING' })
    }

    if (playerStore.tutorials && playerStore.tutorials[tutorialId]) {
      return Promise.resolve({ shown: false, reason: 'ALREADY_SEEN' })
    }

    return new Promise((resolve) => {
      const container = document.createElement('div')
      document.body.appendChild(container)

      const app = createApp({
        render: () =>
          h(TutorialOverlay, {
            // Gelen tüm opsiyonları component'e prop olarak geçiriyoruz
            ...options,
            onClose: () => {
              playerStore.markTutorialAsSeen(tutorialId)
              app.unmount()
              document.body.removeChild(container)
              resolve({ shown: true, reason: 'COMPLETED' })
            },
          }),
      })

      app.use(pinia)
      app.use(i18n)
      app.mount(container)
    })
  }
}

export const tutorialService = new TutorialService()
