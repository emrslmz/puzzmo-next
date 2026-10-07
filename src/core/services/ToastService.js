import { soundService } from '@/core/services/SoundService.js'
import { ref } from 'vue'

class ToastService {
  // Pinia state yerine, Vue'nun kendi ref'ini kullanıyoruz.
  // .value ile erişilecek olan reaktif bir state oluşturur.
  toast = ref({
    isVisible: false,
    message: null,
    type: 'info',
  })

  /**
   * Ekranda bir toast mesajı gösterir.
   */
  show(message, type = 'info', duration = 3000) {
    // console.log('ToastService.show called with:', { message, type, duration })
    // Doğrudan kendi reaktif state'imizi güncelliyoruz.
    this.toast.value = {
      isVisible: true,
      message,
      type,
    }

    if (type === 'warning') {
      soundService.playEffect('alert')
    }
    else if (type === 'error') {
      soundService.playEffect('lose')
    } if (type === 'success') {
      soundService.playEffect('success')
    }

    setTimeout(() => {
      this.hide()
    }, duration)
  }

  /**
   * Toast'ı gizler.
   */
  hide() {
    this.toast.value.isVisible = false
  }
}

export const toastService = new ToastService()
