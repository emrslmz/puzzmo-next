<script setup>
import { languageService } from '@/core/services/LanguageService'
// import notificationService from '@/core/services/NotificationService'
import { usePlayerStore } from '@/store/playerStore.js'
import { onMounted } from 'vue' 

const playerStore = usePlayerStore()

onMounted(async () => {
  await languageService.initializeWithPlayerStore(playerStore)
  // await notificationService.scheduleTestNotification()
})

</script>

<template>
    <router-view />
</template>

