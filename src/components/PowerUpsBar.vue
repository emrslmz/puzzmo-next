<script setup>
// Bu bileşen, oyun ekranının sağ alt köşesindeki dikey güçlendirme (power-up) çubuğunu yönetir.
// Kullanılabilir güçlendirmeleri bir liste olarak alır ve kullanıcı etkileşimlerini ana bileşene iletir.

const props = defineProps({
  // Gösterilecek güçlendirmelerin listesi.
  // Her obje, güçlendirmenin detaylarını (id, image, amount vb.) içermelidir.
  powerUps: {
    type: Array,
    default: () => [],
  },
  // Başka bir güçlendirme animasyonu çalışırken tüm butonları interaktif olmayan hale getirmek için kullanılır.
  isPowerUpActive: {
    type: Boolean,
    default: false,
  },
})

// Bir güçlendirmeye tıklandığında 'use-powerup' event'ini yayar.
const emit = defineEmits(['use-powerup'])

function onPowerUpClick(powerUp) {
  if (props.isPowerUpActive || powerUp.amount <= 0)
    return
  emit('usePowerup', powerUp)
}
</script>

<template>
  <!-- Alt Bar: Power-ups -->
  <div>
    <div class="relative w-full">
      <!-- Dikey olarak sıralanmış güçlendirme butonları -->
      <div class=" space-y-3 p-3 ">
        <div
          v-for="powerUp in powerUps"
          :key="powerUp.id"
          :data-powerup-id="powerUp.id"
          class="relative w-16 h-16 rounded-full bg-gray-900/50 border-4 border-gray-600 shadow-lg transition-all duration-300"
          :class="{
            'cursor-pointer hover:scale-110 active:scale-95': powerUp.amount > 0 && !isPowerUpActive,
            'opacity-40 filter grayscale cursor-not-allowed': powerUp.amount === 0,
            'pointer-events-none opacity-60': isPowerUpActive,
          }"
          @click="onPowerUpClick(powerUp)"
        >
          <!-- Güçlendirme resmi -->
          <img
            :src="powerUp.image"
            :alt="powerUp.name"
            class="w-full h-full scale-[1.5] object-contain p-1"
          >
          <!-- Kalan güçlendirme sayısı -->
          <div
            v-if="powerUp.amount > 0"
            class="absolute -top-2 -right-2 w-7 h-7 bg-red-500 rounded-full flex items-center justify-center text-white font-bold text-sm border-2 border-white"
          >
            {{ powerUp.amount }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Kaydırma çubuğunu gizlemek için stiller */
.scrollbar-hide::-webkit-scrollbar {
  display: none; /* Chrome, Safari */
}
.scrollbar-hide {
  -ms-overflow-style: none;  /* IE ve Edge */
  scrollbar-width: none;     /* Firefox */
}
</style>
