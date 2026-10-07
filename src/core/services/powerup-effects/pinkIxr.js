import { gsap } from 'gsap'

/**
 * GÜNCELLENDİ: 'Can İksiri' animasyonu hızlandırıldı ve ToastService olmadan bildirim ekler.
 * @param {object} context - Oyun bağlamı.
 * @param {Function} onComplete - Animasyon tamamlandığında çağrılacak fonksiyon.
 */
export function play(context, onComplete) {
  const effectContainer = document.getElementById('powerup-effect-container')
  if (!effectContainer) {
    if (onComplete)
      onComplete()
    return
  }

  const tl = gsap.timeline({
    onComplete: () => {
      effectContainer.innerHTML = ''
      if (onComplete)
        onComplete(1500)
    },
  })

  // 1. Ortada beliren ana ikon (daha hızlı)
  effectContainer.innerHTML = `<div class="flash-icon-container"><img src="/images/powerups/pink_ixr.png" class="flash-icon" /></div>`
  tl.fromTo('.flash-icon', { scale: 0, opacity: 0, filter: 'drop-shadow(0 0 20px #fecdd3)' }, {
    scale: 1,
    opacity: 1,
    duration: 0.3,
    ease: 'back.out(2)',
  })

  // 2. Can barının olduğu yerde "+1" yazısı gösterme
  const gameHeader = document.querySelector('.game-header-stats')
  if (gameHeader) {
    const heartIcon = gameHeader.querySelector('img[src*="heart"]')
    if (heartIcon) {
      const rect = heartIcon.getBoundingClientRect()

      const plusOneText = document.createElement('div')
      plusOneText.innerHTML = '+1 ❤️'

      // Stil
      plusOneText.style.cssText = `
                position: fixed;
                left: ${rect.left}px;
                top: ${rect.top}px;
                font-size: 1.5rem;
                font-weight: bold;
                color: #f87171;
                text-shadow: 0 0 5px white;
                pointer-events: none;
                z-index: 9999;
            `

      document.body.appendChild(plusOneText)

      // Animasyon
      gsap.to(plusOneText, {
        y: '-=60', // Yukarı hareket
        opacity: 0,
        scale: 1.5,
        duration: 2,
        ease: 'power2.out',
        onComplete: () => plusOneText.remove(),
      })
    }
  }

  // 3. Ana ikonun kaybolması (daha hızlı)
  tl.to('.flash-icon', {
    scale: 0,
    opacity: 0,
    duration: 0.3,
    ease: 'back.in(2)',
  }, '>0.4') // Görüntülenme süresi kısaltıldı
}
