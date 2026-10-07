import { gsap } from 'gsap'

const PARTICLE_COUNT = 25
const PARTICLE_SPREAD = 160
const PARTICLE_DURATION_MIN = 0.9
const PARTICLE_DURATION_MAX = 1.6

function resolveCardWrapper(cardRefOrId) {
  if (!cardRefOrId)
    return null
  if (typeof cardRefOrId === 'string')
    return document.querySelector(`[data-card-id="${cardRefOrId}"]`)
  return cardRefOrId
}

export function createMatchParticles(card1El, card2El, type, container, options = {}) {
  if (!container)
    return
  const multiplier = Math.max(0, options.particleMultiplier ?? 1)
  const particleCount = Math.round(PARTICLE_COUNT * multiplier)
  if (particleCount <= 0)
    return
  const elements = [card1El, card2El].filter(Boolean)
  const containerRect = container.getBoundingClientRect()
  elements.forEach((el) => {
    const rect = el.getBoundingClientRect()
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div')
      particle.className = `match-particle ${type}`
      container.appendChild(particle)
      const startX = rect.left + rect.width / 2 - containerRect.left
      const startY = rect.top + rect.height / 2 - containerRect.top
      gsap.fromTo(particle, {
        x: startX,
        y: startY,
        scale: gsap.utils.random(0.6, 1.3),
        opacity: 1,
      }, {
        x: `+=${gsap.utils.random(-PARTICLE_SPREAD, PARTICLE_SPREAD)}`,
        y: `+=${gsap.utils.random(-PARTICLE_SPREAD, PARTICLE_SPREAD)}`,
        opacity: 0,
        duration: gsap.utils.random(PARTICLE_DURATION_MIN, PARTICLE_DURATION_MAX),
        ease: 'power3.out',
        onComplete: () => particle.remove(),
      })
    }
  })
}

export function getSpawnAnimation(cardWrapper, onComplete, options = {}) {
  if (!cardWrapper)
    return gsap.timeline()

  const mode = options.mode || 'full'

  if (mode === 'minimal') {
    const tl = gsap.timeline({ onComplete })
    gsap.set(cardWrapper, { scale: 0.96, opacity: 0 })
    tl.to(cardWrapper, {
      scale: 1,
      opacity: 1,
      duration: 0.18,
      ease: 'power1.out',
    })
    return tl
  }

  const cardFlip = cardWrapper.querySelector('.card-flip')
  gsap.set(cardWrapper, { scale: 0, opacity: 0 })
  gsap.set(cardFlip, { rotateY: 180 })
  const spawnDuration = mode === 'medium' ? 0.4 : 0.6
  const spawnEase = mode === 'medium' ? 'power2.out' : 'elastic.out(1, 0.5)'
  const flipDuration = mode === 'medium' ? 0.3 : 0.4
  const revealDelay = mode === 'medium' ? 0.2 : 0.3

  const tl = gsap.timeline({ onComplete })
  tl.to(cardWrapper, {
    scale: 1,
    opacity: 1,
    duration: spawnDuration,
    ease: spawnEase,
  }).to(cardFlip, {
    rotateY: 0,
    duration: flipDuration,
    ease: 'power3.inOut',
  }, `+=${revealDelay}`)
  return tl
}

/**
 * GÜNCELLENDİ: 'powerup' animasyonu merkezi olarak "vurgula ve yok et" şeklinde tanımlandı.
 * @param {Array<HTMLElement>} elements - Eşleşen iki kart elementinin dizisi.
 * @param {HTMLElement} container - Ana oyun konteyneri.
 * @param {'manual' | 'powerup'} matchType - Eşleşme türü.
 * @returns {gsap.core.Timeline}
 */
export function getCorrectMatchAnimation(elements, container, matchType = 'manual', options = {}) {
  const tl = gsap.timeline()
  if (!elements || elements.length === 0 || !container)
    return tl
  const speed = options.speed ?? 1

  // --- Power-up (Bomba/Balyoz) Animasyonu: Vurgula ve yavaşça yok et ---
  if (matchType === 'powerup') {
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
        duration: 0.2 * speed,
        repeat: 3,
        yoyo: true,
        ease: 'power1.inOut',
      }).to(el, {
        opacity: 0,
        duration: 0.6 * speed,
        ease: 'power2.out',
      }, '>-0.2')

      tl.add(animation, '<0.1')
    })

    // --- Manuel Eşleşme Animasyonu ---
  }
  else {
    if (elements.length < 2 || !elements[0] || !elements[1])
      return tl
    const [el1, el2] = elements
    const containerRect = container.getBoundingClientRect()
    const el1Rect = el1.getBoundingClientRect()
    const el2Rect = el2.getBoundingClientRect()
    const tempEl1 = el1.cloneNode(true)
    const tempEl2 = el2.cloneNode(true);
    [tempEl1, tempEl2].forEach((clone, index) => {
      const originalEl = elements[index]
      const rect = originalEl.getBoundingClientRect()
      clone.style.position = 'absolute'
      clone.style.left = '0'
      clone.style.top = '0'
      clone.style.width = `${rect.width}px`
      clone.style.height = `${rect.height}px`
      clone.style.transform = `translate(${rect.left - containerRect.left}px, ${rect.top - containerRect.top}px)`
      clone.style.zIndex = index === 0 ? 101 : 100
      container.appendChild(clone)
    })
    el1.style.visibility = 'hidden'
    el2.style.visibility = 'hidden'
    tl.to(tempEl1, {
      x: el2Rect.left - containerRect.left,
      y: el2Rect.top - containerRect.top,
      duration: 0.4 * speed,
      ease: 'power2.easeInOut',
    }).to([tempEl1, tempEl2], {
      scale: 0,
      opacity: 0,
      duration: 0.3 * speed,
      ease: 'back.in(1.7)',
      stagger: 0.05,
      onComplete: () => {
        tempEl1.remove()
        tempEl2.remove()
      },
    }, '-=0.1')
  }
  return tl
}

export function getWrongMatchAnimation(elements, options = {}) {
  const tl = gsap.timeline()
  if (!elements || elements.length === 0)
    return tl
  const speed = options.speed ?? 1
  tl.to(elements, {
    duration: 0.08 * speed,
    x: () => gsap.utils.random(-10, 10),
    rotation: () => gsap.utils.random(-6, 6),
    repeat: 4,
    yoyo: true,
    ease: 'power2.inOut',
  })
  return tl
}

export function getFlashPowerUpAnimation(elements, onComplete, options = {}) {
  const tl = gsap.timeline({ onComplete })
  if (!elements || elements.length === 0)
    return tl
  const speed = options.speed ?? 1
  const cardFlips = elements.map(el => el.querySelector('.card-flip'))
  tl.to(cardFlips, {
    rotateY: 180,
    duration: 0.3 * speed,
    stagger: 0.04,
    ease: 'power2.out',
  }).to(cardFlips, {
    rotateY: 0,
    duration: 0.3 * speed,
    stagger: { each: 0.04, from: 'end' },
    ease: 'power2.in',
  }, `+=${1.2 * speed}`)
  return tl
}

export function triggerBackgroundFlash(container, type = 'success', options = {}) {
  if (!container || options.disabled)
    return
  const flashDiv = document.createElement('div')
  flashDiv.className = `background-flash ${type === 'success' ? 'bg-success' : 'bg-fail'}`
  container.appendChild(flashDiv)
  gsap.fromTo(flashDiv, { opacity: 1 }, {
    opacity: 0,
    duration: 0.8,
    ease: 'power2.out',
    onComplete: () => flashDiv.remove(),
  })
}

export function animateCardFlip(cardRefOrId, show, duration = 0.3) {
  const cardWrapper = resolveCardWrapper(cardRefOrId)
  const cardEl = cardWrapper?.querySelector('.card-flip')
  if (cardEl) {
    gsap.to(cardEl, {
      rotateY: show ? 180 : 0,
      duration,
      ease: 'power3.out',
    })
  }
}

export function animateCardSelection(cardRefOrId, selected, options = {}) {
  const cardElement = resolveCardWrapper(cardRefOrId)
  const selectedScale = options.selectedScale ?? 1.12
  if (cardElement) {
    gsap.to(cardElement, {
      scale: selected ? selectedScale : 1,
      zIndex: selected ? 50 : 1,
      duration: 0.25,
      ease: 'back.out(2)',
    })
  }
}
