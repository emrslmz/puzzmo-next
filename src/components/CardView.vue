<script setup>
import { gsap } from 'gsap'
import { computed, onMounted, ref, watch } from 'vue'

const props = defineProps({
  card: {
    type: Object,
    required: true,
  },
  isFlipped: {
    type: Boolean,
    default: false,
  },
  isMatched: {
    type: Boolean,
    default: false,
  },
  isProcessing: {
    type: Boolean,
    default: false,
  },
  skin: {
    type: Object,
    required: true,
  },
  // Endless modu için spawn animasyonunu kontrol etme prop'u
  animateSpawn: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['select'])

const cardContainer = ref(null)
const cardFlip = ref(null)

const cardBackgroundStyle = computed(() => {
  return props.skin?.image
    ? {
        backgroundImage: `url(${props.skin.image})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }
    : { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }
})

function handleClick() {
  if (props.isProcessing || props.isFlipped || props.isMatched)
    return
  emit('select', props.card)
}

// Kart çevirme animasyonu
watch(() => props.isFlipped, (newValue, oldValue) => {
  // Sadece durum değiştiğinde animasyonu çalıştır
  if (newValue !== oldValue && cardFlip.value) {
    gsap.to(cardFlip.value, {
      rotateY: newValue ? 180 : 0,
      duration: 0.4,
      ease: 'power2.inOut',
    })
  }
})

// Kartın spawn olması animasyonu
onMounted(() => {
  if (props.animateSpawn && cardContainer.value) {
    gsap.fromTo(cardContainer.value, { scale: 0, opacity: 0, rotateZ: 'random(-30, 30)' }, { scale: 1, opacity: 1, rotateZ: 0, duration: 0.5, ease: 'back.out(1.7)' },
    )
  }
})

// Eşleşme veya yanlış animasyonlarını dışarıdan tetiklemek için fonksiyonlar
function animate(type) {
  if (!cardContainer.value)
    return Promise.resolve()

  return new Promise((resolve) => {
    if (type === 'correct') {
      createParticles('#4ade80')
      gsap.to(cardContainer.value, {
        duration: 0.5,
        scale: 0,
        opacity: 0,
        rotation: 'random(-45, 45)',
        ease: 'back.in(1.7)',
        onComplete: resolve,
      })
    }
    else if (type === 'wrong') {
      createParticles('#f87171')
      const tl = gsap.timeline({ onComplete: resolve })
      tl.to(cardContainer.value, {
        duration: 0.08,
        x: 'random(-6, 6)',
        ease: 'power1.inOut',
        repeat: 5,
        yoyo: true,
      })
      gsap.to(cardContainer.value.querySelector('.card-face-front-content'), {
        boxShadow: '0 0 20px #ef4444',
        duration: 0.1,
        repeat: 5,
        yoyo: true,
      })
    }
    else {
      resolve()
    }
  })
}

function createParticles(color) {
  // Parçacıkların oyun alanı içinde kalmasını sağla
  const gameArea = cardContainer.value.closest('.game-area')
  if (!gameArea)
    return
  const rect = cardContainer.value.getBoundingClientRect()
  const gameRect = gameArea.getBoundingClientRect()

  for (let i = 0; i < 15; i++) {
    const p = document.createElement('div')
    p.className = 'match-particle'
    p.style.backgroundColor = color
    gameArea.appendChild(p)
    gsap.fromTo(p, {
      x: rect.left - gameRect.left + rect.width / 2,
      y: rect.top - gameRect.top + rect.height / 2,
      scale: 'random(0.5, 1.2)',
    }, {
      x: `+=${gsap.utils.random(-100, 100)}`,
      y: `+=${gsap.utils.random(-100, 100)}`,
      opacity: 0,
      duration: gsap.utils.random(0.7, 1.2),
      ease: 'power3.out',
      onComplete: () => p.remove(),
    })
  }
}

defineExpose({ animate })
</script>

<template>
  <div
    ref="cardContainer"
    class="card-container w-[75px] h-[100px] md:w-[90px] md:h-[120px] lg:w-[100px] lg:h-[135px] perspective-1000"
    :class="{ 'pointer-events-none': isMatched }"
    @click="handleClick"
  >
    <div v-if="!isMatched" ref="cardFlip" class="relative w-full h-full preserve-3d cursor-pointer">
      <div
        class="card-face card-face-back absolute inset-0 backface-hidden rounded-lg shadow-lg"
        :style="cardBackgroundStyle"
      />
      <div
        class="card-face absolute inset-0 backface-hidden rotate-y-180 flex items-center justify-center h-full w-full"
      >
        <div
          class="card-face-front-content rounded-lg border-2 border-blue-300 bg-white/90 h-full w-full flex items-center justify-center"
        >
          <img :src="card.image" :alt="card.type" class="w-3/4 h-3/4 object-contain">
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.perspective-1000 { perspective: 1000px; }
.preserve-3d { transform-style: preserve-3d; }
.backface-hidden { backface-visibility: hidden; }
.rotate-y-180 { transform: rotateY(180deg); }
.card-flip { transition: transform 0.6s; transform-style: preserve-d; }
.card-container {
  transition: opacity 0.3s, transform 0.3s;
  position: relative;
}
:global(.match-particle) {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  width: 8px;
  height: 8px;
  z-index: 200;
}
</style>
