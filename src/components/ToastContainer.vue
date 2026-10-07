<script setup>
import { toastService } from '@/core/services/ToastService.js'

// Toast tipine göre renk belirleme
function getToastColor(type) {
  switch (type) {
    case 'success':
      return '#22c55e' // Yeşil
    case 'error':
      return '#ef4444' // Kırmızı
    case 'warning':
      return '#f59e0b' // Turuncu
    case 'info':
    default:
      return '#ffffff' // Beyaz
  }
}

// Toast pozisyonunu hesapla - ekranın tam ortasında
function getToastPosition() {
  return {
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
  }
}
</script>

<template>
  <transition name="toast">
    <div
      v-if="toastService.toast.value.isVisible"
      class="toast-item"
      :style="getToastPosition()"
    >
      <div class="toast-content">
        <div
          class="toast-message shimmer"
          :style="{ color: getToastColor(toastService.toast.value.type) }"
        >
          {{ toastService.toast.value.message }}
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.toast-item {
  position: fixed;
  pointer-events: none;
  width: auto;
  max-width: 80%;
  padding: 0;
  border-radius: 0.75rem;
  font-size: 1rem;
  line-height: 1.3;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;

  /* Blur arkaplan efekti */
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow:
      0 8px 32px rgba(0, 0, 0, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

.toast-content {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  text-align: center;
}

.toast-message {
  flex: none;
  padding: 0.75em 1.25em;
  font-weight: bold;
  position: relative;
  overflow: hidden;
  font-size: 20px;

  /* Metin sarma ayarları - önemli kısım */
  word-wrap: break-word;
  word-break: break-word;
  white-space: pre-wrap;
  overflow-wrap: break-word;
  hyphens: auto;
  max-width: 100%;

  /* Cartoon style text border and shadow */
  text-shadow:
    /* Outline */
      -2px -2px 0 black,
      2px -2px 0 black,
      -2px  2px 0 black,
      2px  2px 0 black,
      -3px  0   0 black,
      3px  0   0 black,
      0   -3px 0 black,
      0    3px 0 black,
        /* Main shadow */
      4px 4px 8px rgba(0,0,0,0.6);
  pointer-events: none;
}

/* Shine efekti */
.toast-message::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(
      45deg,
      transparent 30%,
      rgba(255, 255, 255, 0.3) 50%,
      transparent 70%
  );
  transform: translateX(-100%);
  animation: shine 2s infinite;
  pointer-events: none;
}

@keyframes shine {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

/* Responsive için mobil ayarları */
@media (max-width: 768px) {
  .toast-item {
    max-width: 90%;
    font-size: 0.9rem;
    backdrop-filter: blur(15px);
    -webkit-backdrop-filter: blur(15px);
  }

  .toast-message {
    padding: 0.6em 1em;
  }
}

@media (max-width: 480px) {
  .toast-item {
    max-width: 95%;
    font-size: 0.8rem;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }

  .toast-message {
    padding: 0.5em 0.8em;
  }
}

/* Animations */
.toast-enter-active {
  animation: toast-in 0.3s ease-out;
}

.toast-leave-active {
  animation: toast-out 0.3s ease-in;
}

@keyframes toast-in {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.7) rotateY(10deg);
    backdrop-filter: blur(0px);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1) rotateY(0deg);
    backdrop-filter: blur(20px);
  }
}

@keyframes toast-out {
  from {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1) rotateY(0deg);
    backdrop-filter: blur(20px);
  }
  to {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.7) rotateY(-10deg);
    backdrop-filter: blur(0px);
  }
}

.toast-move {
  transition: transform 0.4s ease;
}
</style>
