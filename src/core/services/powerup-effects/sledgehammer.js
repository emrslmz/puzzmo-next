import { gsap } from 'gsap'

/**
 * YENİ YAPI: Bu dosya da artık kendi animasyon mantığını içeriyor.
 * @param {object} context - { elements: Array<HTMLElement>, container: HTMLElement }
 * @param {Function} onComplete
 */
export function play(context, onComplete) {
  const { elements, gameContainer } = context

  const masterTl = gsap.timeline({ onComplete })

  // 1. Ekran Sarsıntısı
  if (gameContainer && gameContainer.value) {
    masterTl.to(gameContainer.value, {
      x: 'random(-10, 10)',
      y: 'random(-10, 10)',
      duration: 0.08,
      repeat: 10,
      ease: 'power1.inOut',
    })
  }

  // 2. Kart Yok Olma Animasyonu
  if (!elements || elements.length === 0) {
    return
  }

  const destructionTl = gsap.timeline()

  elements.forEach((el) => {
    if (!el)
      return

    const cardFrontDiv = el.querySelector('.card-face-front > div')
    if (!cardFrontDiv)
      return

    const animation = gsap.timeline({
      onComplete: () => {
        gsap.set(el, { visibility: 'hidden' })
      },
    })

    animation.to(cardFrontDiv, {
      borderColor: 'white',
      borderWidth: '3px',
      duration: 0.1,
    })

    animation.to(el, {
      opacity: 0,
      duration: 0.8,
      ease: 'power2.out',
    }, '+=0.3')

    destructionTl.add(animation, 0)
  })

  masterTl.add(destructionTl, 0) // Sarsıntı ile aynı anda başlat
}
