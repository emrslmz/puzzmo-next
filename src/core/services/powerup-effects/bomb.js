import { gsap } from 'gsap'

/**
 * YENİ YAPI: Bu dosya artık kendi animasyon mantığını içeriyor.
 * @param {object} context - { elements: Array<HTMLElement> }
 * @param {Function} onComplete
 */
export function play(context, onComplete) {
  const { elements } = context

  if (!elements || elements.length === 0) {
    if (onComplete)
      onComplete()
    return
  }

  const tl = gsap.timeline({ onComplete })

  elements.forEach((el) => {
    if (!el)
      return

    const cardFrontDiv = el.querySelector('.card-face-front > div')
    if (!cardFrontDiv)
      return

    const animation = gsap.timeline({
      onComplete: () => {
        // Animasyon sonunda kartı DOM'dan kaldırmak yerine sadece gizliyoruz.
        // Asıl kaldırma işlemi bileşenin kendisinde yapılacak.
        gsap.set(el, { visibility: 'hidden' })
      },
    })

    // 1. Aşama: Vurgulama (Beyaz çerçeve)
    animation.to(cardFrontDiv, {
      borderColor: 'white',
      borderWidth: '3px',
      duration: 0.1,
    })

    // 2. Aşama: Yavaşça Yok Olma (Opacity)
    animation.to(el, {
      opacity: 0,
      duration: 0.8, // Yavaş ve pürüzsüz bir kaybolma
      ease: 'power2.out',
    }, '+=0.3') // Vurgulamadan sonra 0.3 saniye bekle

    tl.add(animation, 0) // Tüm animasyonları aynı anda başlat
  })
}
