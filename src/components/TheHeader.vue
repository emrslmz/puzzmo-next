<script setup>
import { useCoreStore } from "@/store/coreStore";
import Balance from "./Balance.vue";
import PButton from "./PButton.vue";

const coreStore = useCoreStore();
</script>

<template>
  <header class="flex justify-between items-center p-2 sm:p-4 relative z-10">
    <PButton variant="secondary" size="sm" @click="coreStore.goToHome()">
      <img
        src="/images/badge/left_badge.png"
        alt="Go back"
        class="w-6 h-6 scale-[2]"
      />
    </PButton>
    <Balance />
  </header>
</template>
