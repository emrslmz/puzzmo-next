// =================================================================
// DOSYA: src/core/services/powerup-effects/flash.js
// (Değişiklik yok, referans olarak burada)
// =================================================================
import { gsap } from 'gsap'

export function play(context, onComplete) {
  const effectContainer = document.getElementById('powerup-effect-container')
  if (!effectContainer) {
    onComplete()
    return
  }

  effectContainer.innerHTML = `<div class="flash-icon-container"><img src="/images/powerups/flash.png" class="flash-icon" /></div>`
  gsap.fromTo('.flash-icon', { scale: 0, opacity: 0 }, {
    scale: 1,
    opacity: 0.7,
    duration: 0.3,
    ease: 'back.out(1.7)',
    onComplete: () => {
      setTimeout(() => {
        gsap.to('.flash-icon', {
          scale: 3,
          opacity: 0,
          duration: 0.5,
          ease: 'power2.in',
          onComplete: () => {
            effectContainer.innerHTML = ''
            onComplete()
          },
        })
      }, 1000)
    },
  })
}
