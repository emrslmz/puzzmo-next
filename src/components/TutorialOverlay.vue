<script setup>
import ClashButton from '@/components/ClashButton.vue'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

// Props tanımı
const props = defineProps({
  tutorialId: { type: String, required: true },
  pages: { type: Array, required: true, default: () => [] },
  nextButtonText: { type: String, default: '' },
  finishButtonText: { type: String, default: '' },
})

// Emit tanımı
const emit = defineEmits(['close'])

const { t } = useI18n()

// Props boşsa i18n fallback kullan
const nextText = computed(() => props.nextButtonText || `${t('next')}`)
const finishText = computed(() => props.finishButtonText || `${t('finish')}`)

// Mevcut sayfanın index'ini tutan state
const currentPageIndex = ref(0)
const isCompact = ref(false)
const touchStartX = ref(0)
const touchStartY = ref(0)
const initialBodyOverflow = ref('')

// Geçerli sayfanın verisini hesaplayan computed property
const currentPage = computed(() => props.pages[currentPageIndex.value] || {})

// Son sayfada olup olmadığımızı kontrol eder
const isLastPage = computed(() => currentPageIndex.value === props.pages.length - 1)
// İlk sayfada olup olmadığımızı kontrol eder
const isFirstPage = computed(() => currentPageIndex.value === 0)

// Bir sonraki sayfaya geçer
function nextPage() {
  if (!isLastPage.value) {
    currentPageIndex.value++
  }
}

// Bir önceki sayfaya geçer
function prevPage() {
  if (!isFirstPage.value) {
    currentPageIndex.value--
  }
}

// Ana butonun (İlerle/Bitir) ne yapacağını belirler
function handlePrimaryAction() {
  if (isLastPage.value) {
    emit('close')
  }
  else {
    nextPage()
  }
}

function closeTutorial() {
  emit('close')
}

function updateViewportFlags() {
  if (typeof window === 'undefined') {
    isCompact.value = false
    return
  }

  isCompact.value = window.innerWidth < 520 || window.innerHeight < 640
}

const actionButtonSize = computed(() => (isCompact.value ? 'sm' : 'md'))

function onTouchStart(event) {
  const touch = event.changedTouches?.[0]
  if (!touch) return

  touchStartX.value = touch.clientX
  touchStartY.value = touch.clientY
}

function onTouchEnd(event) {
  const touch = event.changedTouches?.[0]
  if (!touch) return

  const deltaX = touch.clientX - touchStartX.value
  const deltaY = touch.clientY - touchStartY.value

  if (Math.abs(deltaX) < 55 || Math.abs(deltaY) > 80) return

  if (deltaX < 0) {
    nextPage()
  }
  else {
    prevPage()
  }
}

// Component ekrana geldiğinde ve kaldırıldığında body scroll'u engelle/izin ver
onMounted(() => {
  initialBodyOverflow.value = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  updateViewportFlags()
  window.addEventListener('resize', updateViewportFlags, { passive: true })
})

onUnmounted(() => {
  document.body.style.overflow = initialBodyOverflow.value
  window.removeEventListener('resize', updateViewportFlags)
})
</script>

<template>
  <div class="tutorial-overlay fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-4">
    <transition
      appear
      enter-active-class="transform ease-out duration-300 transition"
      enter-from-class="translate-y-2 opacity-0 sm:translate-y-0 sm:scale-95"
      enter-to-class="translate-y-0 opacity-100 sm:scale-100"
      leave-active-class="transform ease-in duration-200 transition"
      leave-from-class="translate-y-0 opacity-100 sm:scale-100"
      leave-to-class="translate-y-2 opacity-0 sm:translate-y-0 sm:scale-95"
    >
      <section class="tutorial-card">
        <header class="tutorial-header">
          <div class="tutorial-step-pill">
            <span>{{ currentPageIndex + 1 }} / {{ pages.length }}</span>
          </div>
          <button type="button" class="tutorial-close" @click="closeTutorial">
            x
          </button>
        </header>

        <div class="tutorial-body" @touchstart.passive="onTouchStart" @touchend.passive="onTouchEnd">
          <transition name="slide-fade" mode="out-in">
            <article :key="currentPageIndex" class="tutorial-page">
              <div v-if="currentPage.image" class="tutorial-image-wrap">
                <img
                  :src="currentPage.image"
                  :alt="currentPage.title"
                  class="tutorial-image"
                >
              </div>

              <p class="tutorial-title">
                {{ currentPage.title }}
              </p>

              <p v-if="currentPage.text" class="tutorial-text">
                {{ currentPage.text }}
              </p>
            </article>
          </transition>
        </div>

        <footer class="tutorial-footer">
          <div v-if="pages.length > 1" class="tutorial-dots">
            <div
              v-for="(page, index) in pages"
              :key="index"
              class="tutorial-dot"
              :class="{ 'tutorial-dot-active': currentPageIndex === index }"
            />
          </div>

          <div class="tutorial-actions" :class="{ 'tutorial-actions-single': isFirstPage }">
            <ClashButton
              v-if="!isFirstPage"
              color="blue"
              :size="actionButtonSize"
              class="tutorial-action"
              @click="prevPage"
            >
              {{ t('back') }}
            </ClashButton>

            <ClashButton
              :color="isLastPage ? 'green' : 'yellow'"
              :size="actionButtonSize"
              :full-width="isFirstPage"
              class="tutorial-action"
              @click="handlePrimaryAction"
            >
              {{ isLastPage ? finishText : nextText }}
            </ClashButton>
          </div>
        </footer>
      </section>
    </transition>
  </div>
</template>

<style scoped>
.tutorial-overlay {
  background:
    radial-gradient(circle at top, rgba(56, 189, 248, 0.22), transparent 56%),
    rgba(0, 0, 0, 0.78);
  backdrop-filter: blur(7px);
  padding-top: calc(0.75rem + env(safe-area-inset-top));
  padding-bottom: calc(0.75rem + env(safe-area-inset-bottom));
}

.tutorial-card {
  width: min(92vw, 700px);
  max-height: min(90vh, 660px);
  border-radius: 1.4rem;
  border: 2px solid rgba(148, 163, 184, 0.46);
  background: linear-gradient(160deg, #f8fafc 0%, #e2e8f0 100%);
  box-shadow: 0 28px 45px rgba(0, 0, 0, 0.35);
  padding: clamp(0.85rem, 2.2vw, 1.4rem);
  display: flex;
  flex-direction: column;
  min-height: 340px;
}

.tutorial-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.55rem;
}

.tutorial-step-pill {
  border-radius: 999px;
  background: rgba(30, 41, 59, 0.15);
  padding: 0.25rem 0.7rem;
  color: #1e293b;
  font-weight: 700;
  font-size: 0.8rem;
}

.tutorial-close {
  width: 1.8rem;
  height: 1.8rem;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.1);
  border: 1px solid rgba(30, 41, 59, 0.2);
  color: #1e293b;
  font-weight: 800;
  line-height: 1;
}

.tutorial-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.tutorial-page {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 0.2rem;
}

.tutorial-image-wrap {
  width: 100%;
  height: clamp(86px, 18vh, 152px);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.75rem;
}

.tutorial-image {
  max-width: min(100%, 230px);
  max-height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 7px 14px rgba(0, 0, 0, 0.28));
}

.tutorial-title {
  font-size: clamp(1.1rem, 3.2vw, 1.85rem);
  font-weight: 800;
  color: #1f2937;
  line-height: 1.2;
}

.tutorial-text {
  margin-top: 0.55rem;
  color: #475569;
  font-size: clamp(0.86rem, 1.9vw, 1rem);
  line-height: 1.45;
  max-width: 58ch;
  overflow-y: auto;
  padding: 0 0.25rem;
}

.tutorial-footer {
  margin-top: 0.7rem;
}

.tutorial-dots {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.45rem;
  margin-bottom: 0.7rem;
}

.tutorial-dot {
  width: 0.62rem;
  height: 0.62rem;
  border-radius: 999px;
  background: #94a3b8;
  transition: transform 0.22s ease, background-color 0.22s ease;
}

.tutorial-dot-active {
  transform: scale(1.2);
  background: #3b82f6;
}

.tutorial-actions {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  align-items: center;
  gap: 0.5rem;
}

.tutorial-actions-single {
  grid-template-columns: minmax(0, 1fr);
}

.tutorial-action {
  width: 100%;
}

.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.slide-fade-enter-from {
  opacity: 0;
  transform: translateX(10px);
}

.slide-fade-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}

@media (max-width: 520px), (max-height: 640px) {
  .tutorial-card {
    width: min(95vw, 700px);
    max-height: min(92vh, 640px);
    min-height: 300px;
    border-radius: 1.2rem;
    padding: 0.75rem;
  }

  .tutorial-image-wrap {
    height: clamp(70px, 14vh, 110px);
    margin-bottom: 0.5rem;
  }

  .tutorial-dots {
    margin-bottom: 0.55rem;
  }
}
</style>
