<script setup>
// Bu bileşen, oyun ekranlarının üst kısmındaki bilgi çubuğunu temsil eder.
// 'stats' prop'u ile farklı oyun modlarına göre (Macera, Sonsuz) dinamik olarak istatistikleri gösterir.
// 'pause-click' eventi ile de duraklatma butonuna tıklandığında ana bileşeni bilgilendirir.

// DÜZELTME: defineProps'tan dönen değerler 'props' sabitine atandı.
import { soundService } from '@/core/services/SoundService.js'

const props = defineProps({
  // Gösterilecek istatistiklerin bir dizisi.
  // Her obje { icon, value, label, styles } formatında olmalıdır.
  stats: {
    type: Array,
    default: () => [],
  },
  // Bir power-up aktifken duraklatma butonunu devre dışı bırakmak için kullanılır.
  isPowerUpActive: {
    type: Boolean,
    default: false,
  },
})

// Duraklatma butonuna tıklandığında yayılacak olan event.
const emit = defineEmits(['pause-click'])

function onPauseClick() {
  soundService.playEffect('click')
  // DÜZELTME: 'props' sabiti artık tanımlı olduğu için doğru çalışacak.
  if (props.isPowerUpActive)
    return
  emit('pause-click')
}
</script>

<template>
  <!-- Üst Bar: İstatistikler ve Duraklatma Butonu -->
  <div class="w-full h-20 flex-shrink-0 flex justify-between items-center px-4 sm:px-6 z-20">
    <!-- İstatistikler Bölümü -->
    <div class="flex items-center gap-2 sm:gap-4 text-white titre">
      <!-- Dışarıdan gelen 'stats' dizisindeki her bir eleman için bir istatistik kutusu oluşturulur -->
      <div
        v-for="(stat, index) in stats"
        :key="index"
        class="min-w-[150px] h-12 backdrop-blur-sm border-2 rounded-2xl shadow-lg text-white font-bold text-shadow-md flex justify-between items-center pr-4"
        :class="stat.styles"
      >
        <div class="font-bold text-xl lg:text-2xl drop-shadow-lg flex items-center titre gap-2">
          <!-- İstatistik ikonu -->
          <img :src="stat.icon" alt="" class="w-12 h-12">
          <!-- İstatistik değeri -->
          <p>{{ stat.value }}</p>
        </div>
        <!-- İstatistik etiketi (örn: "Can", "Seviye") -->
        <div class="text-white titre text-xs opacity-90 font-medium">
          {{ stat.label }}
        </div>
      </div>
    </div>

    <!-- Duraklatma Butonu -->
    <div
      class="w-12 h-12 bg-gray-400/80 backdrop-blur-sm border-2 border-gray-500 rounded-2xl shadow-lg text-white font-bold text-shadow-md flex justify-center items-center"
      :class="{
        'opacity-50 cursor-not-allowed': isPowerUpActive,
        'cursor-pointer hover:scale-105 transition-all': !isPowerUpActive,
      }"
      @click="onPauseClick"
    >
      <img src="/images/icons/pause.png" class="w-10 h-10 scale-[1.5]" alt="Pause">
    </div>
  </div>
</template>

<style scoped>
/* Metinlere gölge efekti ekler */
.text-shadow-md {
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}
</style>
