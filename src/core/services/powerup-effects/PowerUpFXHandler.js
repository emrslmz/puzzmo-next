import { soundService } from '@/core/services/SoundService.js'
// GÜNCELLENDİ: Tüm efektler artık kendi dosyalarından import ediliyor.
import { play as playBomb } from './bomb.js'
import { play as playFlash } from './flash.js'
import { play as playFreeze } from './freeze.js'
import { play as playPinkIxr } from './pinkIxr.js'
import { play as playRedIxr } from './redIxr.js'
import { play as playSledgehammer } from './sledgehammer.js'
import { play as playYellowIxr } from './yellowIxr.js'

const effects = {
  bomb: playBomb,
  flash: playFlash,
  freeze: playFreeze,
  pink_ixr: playPinkIxr,
  red_ixr: playRedIxr,
  sledgehammer: playSledgehammer,
  yellow_ixr: playYellowIxr,
}

class PowerUpFXHandler {
  /**
   * İlgili güçlendirmenin görsel efektini oynatır.
   * @param {string} powerUpId - Oynatılacak efektin ID'si.
   * @param {object} context - Oyun bileşeninden gelen context (örn: gameContainer).
   * @param {Function} onComplete - Animasyon tamamlandığında çağrılacak fonksiyon.
   */
  play(powerUpId, context, onComplete) {
    const effectPlayer = effects[powerUpId]
    if (effectPlayer) {
      // Doğru kullanım: `this.playSoundEffect(...)`
      this.playSoundEffect(powerUpId)
      effectPlayer(context, onComplete)
    }
    else {
      console.warn(`Görsel efekt bulunamadı: ${powerUpId}`)
      if (onComplete)
        onComplete() // Efekt yoksa bile tamamla.
    }
  }

  playSoundEffect(powerUpId) {
    switch (powerUpId) {
      case 'bomb':
        soundService.playEffect('powerup_use')
        break
      case 'flash':
        soundService.playEffect('powerup_use')
        break
      case 'freeze':
        soundService.playEffect('powerup_use')
        break
      case 'pink_ixr':
        soundService.playEffect('powerup_use')
        break
      case 'red_ixr':
        soundService.playEffect('powerup_use')
        break
      case 'sledgehammer':
        soundService.playEffect('powerup_use')
        break
      case 'yellow_ixr':
        soundService.playEffect('powerup_use')
        break
      default:
        console.warn(`Ses efekti tanımlı değil: ${powerUpId}`)
        break
    }
  }
}

export const powerUpFXHandler = new PowerUpFXHandler()
