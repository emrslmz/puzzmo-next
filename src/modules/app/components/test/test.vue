<script setup>
import { ref } from 'vue'

const calibrations = ref([])

// Kalibrasyon girişleri
const calibrationWeight = ref(0)
const calibrationDistance = ref(0.2)
const calibrationTime = ref(5)

// Ölçüm girişleri
const measureDistance = ref(0.2)
const measureTime = ref(5)

// Sonuç
const estimatedWeight = ref(null)

function handleCalibration() {
  if (calibrationWeight.value > 0 && calibrationDistance.value > 0 && calibrationTime.value > 0) {
    const power = (calibrationWeight.value * 9.81 * calibrationDistance.value) / calibrationTime.value
    calibrations.value.push({
      weight: calibrationWeight.value,
      distance: calibrationDistance.value,
      time: calibrationTime.value,
      power,
    })
    calibrationWeight.value = 0
  }
  else {
    alert('Lütfen tüm kalibrasyon alanlarını doldurun.')
  }
}

function handleMeasure() {
  if (calibrations.value.length < 1) {
    alert('Lütfen önce en az bir kalibrasyon ekleyin.')
    return
  }
  if (measureDistance.value <= 0 || measureTime.value <= 0) {
    alert('Mesafe ve süre değerlerini girin.')
    return
  }

  // Kalibrasyonlardan ortalama power/kg oranı:
  const ratio = calibrations.value.reduce((sum, c) => sum + (c.power / c.weight), 0) / calibrations.value.length

  // Tahmini kg = (power * t) / (g * d)
  // Burada power = ratio * kg => kg = (power * t)/(g*d) = (ratio * t)/(g*d)
  const kg = (ratio * measureTime.value) / (9.81 * measureDistance.value)

  estimatedWeight.value = kg
}
</script>

<template>
  <div class="h-screen bg-gray-100 flex flex-col items-center p-4 overflow-y-auto pb-[200px]">
    <h1 class="text-3xl font-bold mb-6">
      Ağırlık Tahmini Uygulaması
    </h1>

    <!-- Kalibrasyon Alanı -->
    <div class="w-full max-w-md bg-white rounded-xl shadow p-4 mb-6">
      <h2 class="text-xl font-semibold mb-4">
        1️⃣ Kalibrasyon Yap
      </h2>
      <form class="space-y-3" @submit.prevent="handleCalibration">
        <div>
          <label class="block text-sm font-medium mb-1">Bilinen Ağırlık (kg):</label>
          <input v-model.number="calibrationWeight" type="number" step="0.1" class="border p-2 rounded w-full">
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Mesafe (m):</label>
          <input v-model.number="calibrationDistance" type="number" step="0.01" class="border p-2 rounded w-full">
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Süre (s):</label>
          <input v-model.number="calibrationTime" type="number" step="0.1" class="border p-2 rounded w-full">
        </div>
        <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded w-full">
          Kalibrasyon Ekle
        </button>
      </form>

      <div v-if="calibrations.length" class="mt-4">
        <h3 class="font-semibold">
          Mevcut Kalibrasyonlar:
        </h3>
        <ul class="list-disc list-inside text-sm">
          <li v-for="(c, index) in calibrations" :key="index">
            {{ c.weight }} kg → {{ c.distance }} m / {{ c.time }} s
          </li>
        </ul>
      </div>
    </div>

    <!-- Ölçüm Alanı -->
    <div class="w-full max-w-md bg-white rounded-xl shadow p-4">
      <h2 class="text-xl font-semibold mb-4">
        2️⃣ Yeni Cisim Ölç
      </h2>
      <form class="space-y-3" @submit.prevent="handleMeasure">
        <div>
          <label class="block text-sm font-medium mb-1">Mesafe (m):</label>
          <input v-model.number="measureDistance" type="number" step="0.01" class="border p-2 rounded w-full">
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Süre (s):</label>
          <input v-model.number="measureTime" type="number" step="0.1" class="border p-2 rounded w-full">
        </div>
        <button type="submit" class="bg-green-600 text-white px-4 py-2 rounded w-full">
          Tahmini Ağırlığı Hesapla
        </button>
      </form>

      <div v-if="estimatedWeight !== null" class="mt-4 p-2 bg-gray-100 rounded">
        <p class="text-lg font-semibold">
          Tahmini Ağırlık: <span class="text-blue-700">{{ estimatedWeight.toFixed(2) }} kg</span>
        </p>
      </div>
    </div>
  </div>
</template>
