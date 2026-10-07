import { gsap } from 'gsap'

/**
 * GÜNCELLENDİ: 'Sarı İksir' (5x Skor) efekti artık i18n desteği içeriyor.
 * @param {object} context - { t: Function }
 * @param {Function} onComplete - Animasyon tamamlandığında çağrılacak fonksiyon.
 */
export function play(context, onComplete) {
  // 't' fonksiyonunu context'ten alıyoruz.
  const { t } = context
  const durationSeconds = 8
  const durationMs = durationSeconds * 1000

  // 't' fonksiyonunun context ile gelip gelmediğini kontrol edelim.
  if (typeof t !== 'function') {
    console.error('YellowIxr efekti için \'t\' çeviri fonksiyonu sağlanmadı.')
    if (onComplete)
      onComplete(durationMs)
    return
  }

  const effectContainer = document.getElementById('powerup-effect-container')

  if (!effectContainer) {
    if (onComplete)
      onComplete(durationMs)
    return
  }

  const color = '#f59e0b' // Yellow/Amber
  // GÜNCELLENDİ: Metin artık context'ten gelen 't' fonksiyonu ile alınıyor.
  const message = t('score_x', { count: 5 }) // Örnek: "5X SKOR!"

  effectContainer.innerHTML = `
        <div class="bonus-vignette" style="box-shadow: inset 0 0 150px 50px ${color}66;"></div>
        <div class="bonus-banner" style="background-color: ${color}; box-shadow: 0 0 20px 5px ${color};">
            <span class="bonus-text titre">${message}</span>
            <span class="bonus-timer titre">${durationSeconds}s</span>
        </div>
        <div class="corner-light top-left" style="background: radial-gradient(circle, ${color}ff 0%, ${color}00 70%);"></div>
        <div class="corner-light top-right" style="background: radial-gradient(circle, ${color}ff 0%, ${color}00 70%);"></div>
        <div class="corner-light bottom-left" style="background: radial-gradient(circle, ${color}ff 0%, ${color}00 70%);"></div>
        <div class="corner-light bottom-right" style="background: radial-gradient(circle, ${color}ff 0%, ${color}00 70%);"></div>
    `

  // Geri sayım sayacı
  const timerEl = effectContainer.querySelector('.bonus-timer')
  let timeLeft = durationSeconds
  const timerInterval = setInterval(() => {
    timeLeft--
    if (timerEl) {
      timerEl.textContent = `${timeLeft}s`
    }
    if (timeLeft <= 0) {
      clearInterval(timerInterval)
    }
  }, 1000)

  // Animasyonlar
  gsap.from('.bonus-banner', { y: -100, duration: 0.8, ease: 'elastic.out(1, 0.6)' })
  gsap.from('.bonus-text, .bonus-timer', { scale: 0, opacity: 0, duration: 0.5, ease: 'back.out(1.7)', delay: 0.5, stagger: 0.1 })
  gsap.from('.bonus-vignette', { opacity: 0, duration: 1 })
  gsap.fromTo('.corner-light', { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 1, stagger: 0.1, ease: 'expo.out' })

  // Efektleri temizleme
  setTimeout(() => {
    clearInterval(timerInterval)
    gsap.to('.bonus-banner', { y: -100, duration: 0.5, ease: 'power2.in' })
    gsap.to('.bonus-vignette, .corner-light', {
      opacity: 0,
      duration: 0.5,
      onComplete: () => {
        effectContainer.innerHTML = ''
        if (onComplete)
          onComplete()
      },
    })
  }, durationMs)
}
