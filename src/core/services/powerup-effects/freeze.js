import { gsap } from 'gsap'

/**
 * GÜNCELLENDİ: 'Freeze' efekti artık hem üst bilgilendirme çubuğunu hem de buz sarkıtlarını gösteriyor.
 * @param {object} context - { duration: number, isAdventure: boolean, t: Function }
 * @param {Function} onComplete
 */
export function play(context, onComplete) {
  // 't' fonksiyonunu ve diğer değişkenleri context'ten alıyoruz.
  const { duration = 8000, isAdventure = false, t } = context

  // 't' fonksiyonunun context ile gelip gelmediğini kontrol edelim.
  // Eğer gelmediyse, hatayı önlemek için işlemi sonlandırabilir veya varsayılan bir metin gösterebiliriz.
  if (typeof t !== 'function') {
    console.error('Freeze efekti için \'t\' çeviri fonksiyonu sağlanmadı.')
    if (onComplete)
      onComplete(duration)
    return
  }

  const effectContainer = document.getElementById('powerup-effect-container')

  if (!effectContainer) {
    if (onComplete)
      onComplete(duration)
    return
  }

  const durationSeconds = duration / 1000
  const color = '#3498db' // Mavi
  // GÜNCELLENDİ: Metin artık context'ten gelen 't' fonksiyonu ile alınıyor.
  const message = isAdventure ? t('danger_frozen') : t('time_frozen')

  // 1. Bilgilendirme Çubuğu ve Geri Sayım
  const bannerHTML = `
       <div class="bonus-banner flex justify-center items-center" style="background-color: ${color}; box-shadow: 0 0 20px 5px ${color};">
            <span class="bonus-text titre">${message}</span>
            <span class="bonus-timer titre">${durationSeconds}s</span>
        </div>
    `

  // 2. Buz Efektleri (Sarkıtlar ve Overlay)
  let topIciclesHTML = ''
  let bottomIciclesHTML = ''
  for (let i = 0; i < 25; i++) {
    const width = Math.random() * 15 + 5
    const height = Math.random() * 60 + 20
    const style = `width:${width}px; height:${height}px;`
    topIciclesHTML += `<div class="icicle" style="${style}"></div>`
    bottomIciclesHTML += `<div class="icicle" style="${style}"></div>`
  }

  const frostHTML = `
        <div class="frost-overlay"></div>
        <div class="icicles top">${topIciclesHTML}</div>
        <div class="icicles bottom">${bottomIciclesHTML}</div>
    `

  effectContainer.innerHTML = bannerHTML + frostHTML

  // Geri sayım sayacını başlat
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

  // Animasyonları başlat
  gsap.from('.bonus-banner', { y: -100, duration: 0.8, ease: 'elastic.out(1, 0.6)' })
  gsap.fromTo('.frost-overlay', { opacity: 0 }, { opacity: 1, duration: 0.7, ease: 'power2.out' })
  gsap.from('.icicle', {
    y: (i, target) => target.parentElement.classList.contains('top') ? -80 : 80,
    scaleY: 0,
    duration: 1,
    ease: 'elastic.out(1, 0.5)',
    stagger: { amount: 0.5, from: 'random' },
  })

  // 3. Efektleri Temizleme
  setTimeout(() => {
    clearInterval(timerInterval)
    gsap.to('.bonus-banner', { y: -100, duration: 0.5, ease: 'power2.in' })
    gsap.to('.icicle', { scaleY: 0, opacity: 0, duration: 0.5, ease: 'power2.in', stagger: { amount: 0.3, from: 'random' } })
    gsap.to('.frost-overlay', {
      opacity: 0,
      duration: 0.5,
      onComplete: () => {
        effectContainer.innerHTML = ''
        if (onComplete)
          onComplete()
      },
    }, '-=0.3')
  }, duration)
}
