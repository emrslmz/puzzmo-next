<script setup>
import AlertModal from "@/components/AlertModal.vue";
import ToastContainer from "@/components/ToastContainer.vue";
import { soundService } from "@/core/services/SoundService.js";
import { mobileService } from "@/core/services/MobileService.js";
import { useCoreStore } from "@/store/coreStore";
import { gsap } from "gsap";
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { RouterView } from "vue-router";
import { getActivePinia } from "pinia";

const core = useCoreStore();
const { t } = useI18n();

// --- Component State ---
const isReadyForAnimation = ref(false);
const isAnimationComplete = ref(false); // Animasyon bitince yükleme ekranını DOM'dan kaldırmak için
const isContentReady = ref(false); // Ana içerik hazır olduğunda true

// --- Template Refs ---
const pageContainerRef = ref(null);
const loadingScreenRef = ref(null);
const logoRef = ref(null);
const loadingTextRef = ref(null);
const contentContainerRef = ref(null);

let initialTimeout = null;

onMounted(() => {
  soundService.init();

  // Ana içeriği başlangıçta görünmez yap ama DOM'da hazır bekletsin
  gsap.set(contentContainerRef.value, { opacity: 0, scale: 0.95 });

  // Başlangıç animasyonu (logo ve metin)
  gsap.from(logoRef.value, {
    duration: 0.6,
    y: -50,
    opacity: 0,
    ease: "power2.out",
  });
  gsap.from(loadingTextRef.value, {
    duration: 0.6,
    y: 50,
    opacity: 0,
    ease: "power2.out",
    delay: 0.2,
  });

  initialTimeout = setTimeout(() => {
    isReadyForAnimation.value = true;
  }, 500);
});

onBeforeUnmount(() => {
  if (initialTimeout) clearTimeout(initialTimeout);
});

// isReadyForAnimation durumu değiştiğinde ana animasyonumuzu tetikliyoruz
watch(isReadyForAnimation, (ready) => {
  if (ready) {
    const tl = gsap.timeline({
      onComplete: async () => {
        isAnimationComplete.value = true; // Animasyon bitince yükleme ekranını DOM'dan kaldır
        isContentReady.value = true;

        // Loading bittikten sonra izin modallarını göster
        const pinia = getActivePinia();
        if (pinia) {
          // Kısa bir gecikme ile modalları göster
          setTimeout(async () => {
            await mobileService.showInitialPermissionModals(pinia);
          }, 800);
        }
      },
    });

    // 1. Yükleme ekranını yavaşça fade out yap
    // Logo ve metin de ekranla birlikte kaybolacak
    tl.to(loadingScreenRef.value, {
      duration: 1.2, // Yumuşak bir geçiş
      opacity: 0,
      ease: "power2.inOut",
    });

    // 2. Ana içeriği göster - daha yumuşak bir geçiş
    tl.to(
      contentContainerRef.value,
      {
        duration: 1.2,
        opacity: 1,
        scale: 1,
        ease: "power3.out",
      },
      "-=0.8"
    ); // Yükleme ekranı kaybolmaya başlarken bu da yavaşça belirsin

    // Müziği başlat
    soundService.playMusic("game_theme1");
  }
});
</script>

<template>
  <div ref="pageContainerRef" class="page-container">
    <!-- Yükleme Ekranı: Animasyon bitince kaldırılacak -->
    <div
      v-if="!isAnimationComplete"
      ref="loadingScreenRef"
      class="loading-screen"
    >
      <div ref="logoRef" class="logo-container h-24 w-48">
        <img
          src="/images/logo/puzzmo_logo_3.png"
          alt="Logo"
          class="logo w-full h-full"
        />
      </div>
      <div ref="loadingTextRef" class="loading-text titre">
        {{ t("loading") }}
      </div>
    </div>

    <!-- Ana İçerik: Her zaman DOM'da, GSAP ile görünürlüğü kontrol ediliyor -->
    <div ref="contentContainerRef" class="content-container">
      <RouterView v-slot="{ Component }">
        <transition name="page-transition" mode="out-in">
          <component :is="Component" />
        </transition>
      </RouterView>
    </div>

    <!-- Global Yükleme Overlay -->
    <div v-if="core.isLoading" class="loading-overlay">
      <p class="loading-text titre">
        {{ t("loading") }}
      </p>
    </div>

    <!-- Toast ve Modal -->
    <ToastContainer />
    <AlertModal />
  </div>
</template>

<style scoped>
.page-container {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background-color: #0a0a14; /* Ana arka plan rengi */
}

.loading-screen {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 30;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  background-image: url("/images/backgrounds/endless_game_side_spring.jpg");
  background-size: cover;
  background-position: center;
  will-change: opacity; /* Sadece opacity animasyonu için performans optimizasyonu */
}

.logo-container {
  position: relative;
  z-index: 2;
}

.loading-text {
  position: relative;
  z-index: 2;
  margin-top: 20px;
  font-size: 18px;
  font-weight: bold;
  color: #ffffff;
}

.content-container {
  position: relative;
  width: 100%;
  height: 100%;
  z-index: 20;
  will-change: opacity, transform; /* Performans optimizasyonu */
}

/* Sayfalar arası geçiş animasyonu - Hızlı ve güzel */
.page-transition-enter-active {
  transition: all 0.4s ease-out;
  will-change: opacity, transform;
}
.page-transition-leave-active {
  transition: all 0.3s ease-in;
  will-change: opacity, transform;
}
.page-transition-enter-from {
  opacity: 0;
  transform: scale(0.98) translateY(10px);
}
.page-transition-leave-to {
  opacity: 0;
  transform: scale(1.02) translateY(-5px);
}
.page-transition-enter-to,
.page-transition-leave-from {
  opacity: 1;
  transform: scale(1) translateY(0);
}

/* Mevcut Yükleme Overlay Stilleri */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(10, 10, 20, 0.85);
  backdrop-filter: blur(5px);
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  z-index: 9999;
}

.loading-text-global {
  margin-top: 20px;
  font-size: 1.2rem;
  font-weight: bold;
  color: #fff;
  letter-spacing: 4px;
}

.game-loader {
  display: flex;
  gap: 15px;
}
.game-loader div {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: #fff;
  animation: pulse 1.2s ease-in-out infinite;
}
.game-loader div:nth-child(2) {
  animation-delay: 0.2s;
}
.game-loader div:nth-child(3) {
  animation-delay: 0.4s;
}
@keyframes pulse {
  0%,
  100% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  50% {
    transform: scale(1.2);
    opacity: 1;
  }
}
</style>
