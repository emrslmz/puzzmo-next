<script setup>
import TheHeader from '@/components/TheHeader.vue'
import { soundService } from '@/core/services/SoundService.js'
import { tutorialService } from '@/core/services/TutorialService.js'
import { useCoreStore } from '@/store/coreStore'
import { useShopStore } from '@/store/shopStore'
import { usePlayerStore } from '@/store/playerStore'
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import ShopItemCard from './ShopItemCard.vue'

const { t } = useI18n()
const store = useShopStore()
const core = useCoreStore()
const playerStore = usePlayerStore()

async function showShopTutorial() {
  return tutorialService.show({
    tutorialId: 'shop_guide',
    finishButtonText: t('tutorial_shop_page1_finish_button'),
    pages: [
      {
        title: t('tutorial_shop_page1_title'),
        text: t('tutorial_shop_page1_text'),
        image: '/images/mascots/showing_right.png',
      },
      {
        title: t('tutorial_shop_page2_title'),
        text: t('tutorial_shop_page2_text'),
        image: '/images/icons/powerup_icon.png',
      },
      {
        title: t('tutorial_shop_page3_title'),
        text: t('tutorial_shop_page3_text'),
        image: '/images/mascots/rich1.png', // veya kart tasarımı görselin varsa onu koy
      },
      {
        title: t('tutorial_shop_page4_title'),
        text: t('tutorial_shop_page4_text'),
        image: '/images/mascots/showing_left.png',
      },
    ],
  })
}

async function changeTab(tab) {
  store.setActiveTab(tab)
  soundService.playEffect('plop')
}

onMounted(async () => {
  // Ensure playerStore is loaded before showing shop
  await playerStore.loadFromStorage()
  showShopTutorial()
})
</script>

<template>
  <div class="relative h-screen w-full bg-shop-background bg-center bg-cover overflow-hidden flex flex-col">
    <!-- Header (Değiştirilmedi) -->
    <TheHeader />

    <!-- Main Content -->
    <main class="flex flex-col flex-grow h-full w-full  -mt-5">
      <!-- Tabs (Değiştirilmedi, sadece küçük bir animasyon eklendi) -->
      <div class="flex justify-center items-center gap-2 px-10  flex-shrink-0">
        <button
          class="border-4 border-amber-600 rounded-2xl shadow-[0_4px_0_#b45309] w-1/3 h-12 transition-transform duration-200"
          :class="store.activeTab === 'skins' ? 'bg-amber-200  ' : 'bg-amber-500'"
          @click="changeTab('skins')"
        >
          <p class="text-lg font-bold text-white uppercase tracking-wide titre">
            {{ t('card_skins') }}
          </p>
        </button>
        <button
          class=" border-4 border-amber-600 rounded-2xl shadow-[0_4px_0_#b45309] w-1/3 h-12 transition-transform duration-200"
          :class="store.activeTab === 'power-ups' ? 'bg-amber-200  ' : 'bg-amber-500'"
          @click="changeTab('power-ups')"
        >
          <p class="text-lg font-bold text-white uppercase tracking-wide titre">
            {{ t('power_ups') }}
          </p>
        </button>
      </div>

      <!-- YENİ: Grid Tabanlı Ürün Listesi -->
      <div class="flex-grow overflow-y-auto pb-[100px] pt-5 px-20">
        <div class="grid grid-cols-3 gap-4">
          <ShopItemCard
            v-for="(item, index) in store.visibleItems"
            :key="item.id"
            :item="item"
            :index="index"
          />
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
/* Grid için özel kaydırma çubuğu stilleri */
.overflow-y-auto::-webkit-scrollbar {
  width: 8px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background-color: rgba(245, 158, 11, 0.6); /* amber-500 */
  border-radius: 10px;
  border: 2px solid transparent;
}
</style>
