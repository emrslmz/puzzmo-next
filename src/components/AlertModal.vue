<script setup>
import ClashButton from "@/components/ClashButton.vue";
import { alertService } from "@/core/services/AlertService.js";
</script>

<template>
  <transition name="modal-overlay" appear>
    <div
      v-if="alertService.alert.isVisible"
      class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/70 backdrop-blur-sm p-4"
    >
      <transition name="modal-content" appear>
        <div
          class="relative w-full max-w-md bg-gradient-to-br from-blue-800 to-blue-600 border-4 border-amber-300 rounded-2xl shadow-2xl overflow-hidden scale-[0.85]"
        >
          <div class="flex flex-col">
            <!-- İçerik Paneli -->
            <div class="flex flex-col flex-grow px-4 py-3 text-center">
              <!-- Başlık -->
              <h2
                v-if="alertService.alert.title"
                class="font-bold text-xl text-center text-white drop-shadow-md titre"
              >
                {{ alertService.alert.title }}
              </h2>

              <!-- YENİ: Dinamik İçerik Alanı -->
              <div class="flex-grow py-3">
                <!-- Eğer bir mesaj veya özel içerik varsa, bu konteyner gösterilir -->
                <div
                  v-if="
                    alertService.alert.message ||
                    alertService.alert.customContent
                  "
                  class="text-amber-900 bg-amber-200 rounded-lg p-2 text-sm max-h-[250px] overflow-y-auto leading-relaxed"
                >
                  <!-- Sadece standart mesaj gösterimi -->
                  <p
                    v-if="
                      alertService.alert.message &&
                      !alertService.alert.customContent
                    "
                    class="whitespace-pre-line"
                  >
                    {{ alertService.alert.message }}
                  </p>
                  <!-- Özel bileşen (template) gösterimi -->
                  <div
                    v-else-if="
                      alertService.alert.customContent === 'slot-content'
                    "
                  >
                    <component
                      :is="alertService.alert.slotComponent"
                      v-bind="alertService.alert.slotProps"
                    />
                  </div>
                </div>
                <!-- Eğer içerik yoksa, bu alan boş kalır ve butonlar başlığa yaklaşır. -->
              </div>

              <!-- Butonlar -->
              <div
                v-if="
                  alertService.alert.confirmButtonText ||
                  alertService.alert.cancelButtonText
                "
                class="flex gap-x-3 justify-center"
              >
                <ClashButton
                  v-if="alertService.alert.cancelButtonText"
                  color="red"
                  @click="alertService.alert.onCancel"
                >
                  {{ alertService.alert.cancelButtonText }}
                </ClashButton>
                <ClashButton
                  v-if="alertService.alert.confirmButtonText"
                  color="green"
                  @click="alertService.alert.onConfirm"
                >
                  {{ alertService.alert.confirmButtonText }}
                </ClashButton>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </div>
  </transition>
</template>

<style scoped>
/* Transition Animations */
.modal-overlay-enter-active,
.modal-overlay-leave-active {
  transition: opacity 0.3s ease-out;
}
.modal-overlay-enter-from,
.modal-overlay-leave-to {
  opacity: 0;
}
.modal-content-enter-active {
  transition: all 0.4s cubic-bezier(0.25, 1, 0.5, 1);
}
.modal-content-leave-active {
  transition: all 0.3s ease-in;
}
.modal-content-enter-from,
.modal-content-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

/* Custom Scrollbar */
.max-h-\[300px\] {
  scrollbar-width: thin;
  scrollbar-color: #f59e0b #a16207; /* amber-500 amber-800 */
}
.max-h-\[300px\]::-webkit-scrollbar {
  width: 8px;
}
.max-h-\[300px\]::-webkit-scrollbar-track {
  background: rgba(161, 98, 7, 0.3); /* amber-800/30 */
  border-radius: 10px;
}
.max-h-\[300px\]::-webkit-scrollbar-thumb {
  background-color: #f59e0b; /* amber-500 */
  border-radius: 10px;
  border: 2px solid #fef3c7; /* amber-100 */
}
</style>
