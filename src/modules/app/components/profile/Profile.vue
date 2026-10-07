<script setup>
import TheHeader from '@/components/TheHeader.vue'
import { tutorialService } from '@/core/services/TutorialService.js'
import { useCoreStore } from '@/store/coreStore'
import { useGameStore } from '@/store/gameStore'
import { usePlayerStore } from '@/store/playerStore'
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

const gameStore = useGameStore()
const playerStore = usePlayerStore()
const { t } = useI18n()

// Computed properties for stats
const endlessStats = computed(() => playerStore.endlessStats)
const adventureStats = computed(() => {
  const progress = playerStore.adventure.playerProgress
  const islands = gameStore.getAllIslandsWithNames

  let totalLevelsCompleted = 0
  let totalHighScore = 0
  const unlockedIslands = playerStore.adventure.unlockedIslands.length

  islands.forEach((island) => {
    if (progress[island.id]) {
      totalLevelsCompleted += progress[island.id].level - 1
      totalHighScore += progress[island.id].highScore
    }
  })

  return { totalLevelsCompleted, totalHighScore, unlockedIslands, totalIslands: islands.length }
})

const generalStats = computed(() => {
  const endless = endlessStats.value
  const adventure = adventureStats.value

  return {
    totalScore: endless.totalScore + adventure.totalHighScore,
    totalGames: endless.totalGamesPlayed,
    averageScore: endless.totalGamesPlayed > 0 ? Math.round(endless.totalScore / endless.totalGamesPlayed) : 0,
    accuracy: endless.totalMatches + endless.totalErrors > 0
      ? Math.round((endless.totalMatches / (endless.totalMatches + endless.totalErrors)) * 100)
      : 0,
  }
})

// Compact stat cards data
const statCards = computed(() => [
  // Genel
  {
    title: t('total_score'),
    value: generalStats.value.totalScore.toLocaleString(),
    icon: '/images/icons/cup.png',
    color: 'from-yellow-400 to-orange-500',
  },
  {
    title: t('total_game'),
    value: generalStats.value.totalGames.toLocaleString(),
    icon: '/images/icons/crystal.png',
    color: 'from-green-400 to-emerald-500',
  },
  {
    title: t('average'),
    value: generalStats.value.averageScore.toLocaleString(),
    icon: '/images/icons/arrangement.png',
    color: 'from-amber-400 to-yellow-500',
  },
  {
    title: t('accuracy'),
    value: `%${generalStats.value.accuracy}`,
    icon: '/images/icons/green_check.png',
    color: 'from-pink-400 to-red-500',
  },

  // Endless
  {
    title: t('highest'),
    value: endlessStats.value.highScore.toLocaleString(),
    icon: '/images/icons/cartridge.png',
    color: 'from-purple-400 to-indigo-500',
  },
  {
    title: t('matches'),
    value: endlessStats.value.totalMatches.toLocaleString(),
    icon: '/images/icons/cursor.png',
    color: 'from-rose-400 to-pink-500',
  },
  {
    title: t('best_series'),
    value: endlessStats.value.bestMatchStreak.toLocaleString(),
    icon: '/images/icons/prisma.png',
    color: 'from-indigo-400 to-purple-500',
  },

  // Adventure
  {
    title: t('opened_island'),
    value: `${adventureStats.value.unlockedIslands}/${adventureStats.value.totalIslands}`,
    icon: '/images/icons/compass.png',
    color: 'from-blue-400 to-cyan-500',
  },
  // {
  //   title: 'Toplam Level',
  //   value: adventureStats.value.totalLevelsCompleted.toLocaleString(),
  //   icon: '/images/card_item/rosette.svg',
  //   color: 'from-teal-400 to-emerald-500'
  // }
])

async function showProfileTutorial() {
  return tutorialService.show({
    tutorialId: 'profile_guide',
    finishButtonText: t('tutorial_profile_finish_button'),
    pages: [
      {
        title: t('tutorial_profile_page1_title'),
        text: t('tutorial_profile_page1_text'),
        image: '/images/mascots/showing_left.png',
      },
      {
        title: t('tutorial_profile_page2_title'),
        text: t('tutorial_profile_page2_text'),
        image: '/images/icons/compass.png',
      },
      {
        title: t('tutorial_profile_page3_title'),
        text: t('tutorial_profile_page3_text'),
        image: '/images/icons/arrangement.png',
      },
      {
        title: t('tutorial_profile_page4_title'),
        text: t('tutorial_profile_page4_text'),
        image: '/images/mascots/discover.png',
      },
      {
        title: t('tutorial_profile_page5_title'),
        text: t('tutorial_profile_page5_text'),
        image: '/images/mascots/happy.png',
      },
    ],
  })
}

onMounted(() => {
  // FIX: Sync island data with default state to get correct translations
  // DÜZELTME: Ada verilerini varsayılan durumla senkronize ederek doğru çevirileri almasını sağla
  gameStore.syncWithDefaultState()
  showProfileTutorial()
})
</script>

<template>
  <div class="relative h-screen w-full overflow-hidden bg-wooden-background">
    <!-- Header -->
    <TheHeader />

    <!-- Main Content -->
    <main class="flex flex-col h-full -mt-[40px] px-4">
      <!-- Title Section -->
      <div class="text-center pb-4">
        <h1 class="text-2xl font-bold text-amber-100 titre">
          {{ t('stats') }}
        </h1>
      </div>

      <div class="flex justify-center items-start w-full pl-20 pr-10">
        <div class="flex flex-col justify-start items-start gap-3 w-1/3 p-4 h-[400px] pb-32 overflow-y-auto">
          <div
            v-for="(stat, index) in statCards"
            :key="index"
            class="flex justify-start items-center gap-5 "
          >
            <img :src="stat.icon" class="h-8 w-8 scale-[2]" :alt="stat.title">
           <div class="flex flex-col items-start">
            <p class="titre text-xs">
              {{ stat.title }}: 
            </p>
            <p class="text-2xl pl-1 text-amber-100 titre">{{ stat.value }}</p>
           </div>
          </div>
        </div>

        <!-- Island Progress Summary -->
        <div v-if="adventureStats.totalIslands > 0" class="w-2/3 h-[400px] pb-32 overflow-y-auto">
          <div
            class="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-4 shadow-xl border-3 border-emerald-300"
          >
            <h2 class="text-lg font-bold text-white titre mb-3 text-center">
              {{ t('adventure_mode') }}
            </h2>
            <div class=" grid grid-cols-2 items-center justify-center gap-3 ">
              <div
                v-for="island in gameStore.getAllIslandsWithNames"
                :key="island.id"
                class="bg-white/20 rounded-xl p-2 flex items-center justify-center gap-4 w-full"
                :class="{ 'opacity-50': !playerStore.isIslandUnlocked(island.id) }"
              >
                <img :src="island.image" :alt="island.name" class="w-20 h-20 scale-[1.5]  mb-1 rounded-lg object-cover">
                <div>
                  <div class="text-white text-xs font-bold">
                    {{ island.name }}
                  </div>
                  <div class="text-emerald-100 text-xs text-left">
                    L{{ playerStore.getCurrentAdventureLevel(island.id) }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </main>
  </div>
</template>

<style scoped>
.border-3 {
  border-width: 3px;
}

/* Scrollbar */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background-color: rgba(245, 158, 11, 0.4);
  border-radius: 10px;
}
</style>
