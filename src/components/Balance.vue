<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { soundService } from '@/core/services/SoundService.js'
import { useCoreStore } from '@/store/coreStore.js'
import { usePlayerStore } from '@/store/playerStore.js'

const coreStore = useCoreStore()
const player = usePlayerStore()
const router = useRouter()
const isOnBuyPage = computed(() => router.currentRoute.value.name === 'Buy')

function clickHandler() {
  // Eğer zaten Buy sayfasındaysa hiçbir şey yapma
  if (isOnBuyPage.value)
    return

  coreStore.goTo('Buy')
  soundService.playEffect('click_sound')
}
</script>

<template>
  <button
    type="button"
    class="balance-chip"
    :class="{ 'balance-chip--disabled': isOnBuyPage }"
    :disabled="isOnBuyPage"
    aria-label="Open coin shop"
    @click="clickHandler"
  >
    <span class="balance-icon-wrap">
      <img
        src="/images/icons/coin.png"
        alt="coin"
        class="balance-coin"
      >
      <img
        src="/images/icons/plus.png"
        alt="plus"
        class="balance-plus"
      >
    </span>
    <span class="balance-count titre">{{ player.currencies.coins }}</span>
  </button>
</template>

<style scoped>
.balance-chip {
  min-width: 158px;
  min-height: 48px;
  padding: 0.25rem 0.8rem 0.25rem 0.15rem;
  border-radius: 1rem;
  border: 3px solid #bb5900;
  border-bottom-width: 7px;
  background: linear-gradient(180deg, #ffd753 0%, #f59e0b 100%);
  box-shadow:
    0 10px 15px rgba(101, 42, 7, 0.35),
    inset 0 2px 0 rgba(255, 255, 255, 0.38);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  transition: transform 120ms ease, box-shadow 120ms ease;
  touch-action: manipulation;
  will-change: transform;
}

.balance-chip:active {
  transform: translateY(3px);
  border-bottom-width: 3px;
  box-shadow:
    0 4px 8px rgba(101, 42, 7, 0.3),
    inset 0 2px 0 rgba(255, 255, 255, 0.3);
}

.balance-chip--disabled {
  opacity: 0.88;
  cursor: default;
}

.balance-chip--disabled:active {
  transform: none;
  border-bottom-width: 7px;
  box-shadow:
    0 10px 15px rgba(101, 42, 7, 0.35),
    inset 0 2px 0 rgba(255, 255, 255, 0.38);
}

.balance-icon-wrap {
  position: relative;
  width: 52px;
  height: 40px;
}

.balance-coin {
  width: 46px;
  height: 46px;
  object-fit: contain;
  transform: scale(1.24);
}

.balance-plus {
  position: absolute;
  right: 1px;
  bottom: -2px;
  width: 24px;
  height: 24px;
  transform: scale(1.24);
  filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.45));
}

.balance-count {
  color: white;
  font-size: 0.9rem;
  line-height: 1;
  max-width: 90px;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: right;
}

@media (max-width: 420px) {
  .balance-chip {
    min-width: 150px;
    min-height: 45px;
    padding-right: 0.66rem;
  }

  .balance-count {
    font-size: 0.82rem;
  }
}

@media (max-height: 620px) {
  .balance-chip {
    min-width: 126px;
    min-height: 40px;
    padding: 0.12rem 0.56rem 0.12rem 0.08rem;
    border-width: 2px;
    border-bottom-width: 4px;
  }

  .balance-chip:active {
    border-bottom-width: 2px;
  }

  .balance-chip--disabled:active {
    border-bottom-width: 4px;
  }

  .balance-icon-wrap {
    width: 42px;
    height: 32px;
  }

  .balance-coin {
    width: 40px;
    height: 40px;
  }

  .balance-plus {
    width: 20px;
    height: 20px;
    right: -1px;
    bottom: -1px;
  }

  .balance-count {
    font-size: 0.75rem;
    max-width: 78px;
  }
}

@media (orientation: landscape) and (max-height: 560px) {
  .balance-chip {
    min-width: 114px;
    min-height: 36px;
    border-radius: 0.8rem;
    gap: 0.35rem;
    padding-right: 0.44rem;
  }
}
</style>
