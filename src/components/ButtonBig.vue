<script setup lang="ts">
import { soundService } from "@/core/services/SoundService";
import vibrationService from "@/core/services/VibrationService";
import { computed, ref } from "vue";

interface Props {
  variant?: "primary" | "success" | "danger" | "warning";
  size?: "sm" | "md" | "lg";
  text?: string;
}

const props = withDefaults(defineProps<Props>(), {
  variant: "success",
  size: "md",
  text: "PLAY",
});

const emits = defineEmits(["click"]);
const animateClass = ref("");

const variantClass = computed(() => `variant-${props.variant}`);
const sizeClass = computed(() => `size-${props.size}`);

function handleClick(event: MouseEvent) {
  animateClass.value = "animate__animated animate__rubberBand";
  soundService.playEffect("click_sound");
  vibrationService.vibrate("click");
  emits("click", event);

  setTimeout(() => {
    animateClass.value = "";
  }, 700);
}
</script>

<template>
  <button
    class="big-button font-puzzle select-none"
    :class="[variantClass, sizeClass, animateClass]"
    @click="handleClick"
  >
    <span class="button-content">
      <slot name="default">
        {{ text }}
      </slot>
    </span>
  </button>
</template>

<style scoped>
.big-button {
  --bg-color: #81c784;
  --border-color: #388e3c;
  --shadow-color: #2e7d32;
  --font-size: clamp(1rem, 2.8vw, 1.45rem);
  --height: clamp(58px, 8.8vh, 76px);
  --radius: 18px;
  width: 100%;
  min-width: 0;
  min-height: var(--height);
  padding: 0 clamp(0.8rem, 3vw, 1.25rem);
  border: 2px solid var(--border-color);
  border-bottom-width: 6px;
  border-radius: var(--radius);
  background-color: var(--bg-color);
  color: #fff;
  font-size: var(--font-size);
  letter-spacing: clamp(0.03em, 0.25vw, 0.07em);
  line-height: 1;
  text-transform: uppercase;
  box-shadow:
    0 6px 0 var(--shadow-color),
    0 10px 20px rgba(0, 0, 0, 0.28);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition:
    transform 0.14s ease,
    border-bottom-width 0.14s ease,
    filter 0.14s ease;
  touch-action: manipulation;
}

.big-button:hover {
  filter: brightness(1.04);
}

.big-button:active {
  transform: translateY(3px);
  border-bottom-width: 3px;
}

.button-content {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.65rem;
}

.size-sm {
  --height: clamp(52px, 7.2vh, 64px);
  --font-size: clamp(0.95rem, 2.35vw, 1.15rem);
  --radius: 16px;
}

.size-lg {
  --height: clamp(62px, 10vh, 84px);
  --font-size: clamp(1.1rem, 3vw, 1.6rem);
  --radius: 20px;
}

.variant-primary {
  --bg-color: #64b5f6;
  --border-color: #1976d2;
  --shadow-color: #1565c0;
}

.variant-success {
  --bg-color: #81c784;
  --border-color: #388e3c;
  --shadow-color: #2e7d32;
}

.variant-warning {
  --bg-color: #ffb74d;
  --border-color: #f57c00;
  --shadow-color: #d97a0d;
}

.variant-danger {
  --bg-color: #e57373;
  --border-color: #d32f2f;
  --shadow-color: #b71c1c;
}

@media (max-width: 420px) {
  .big-button {
    letter-spacing: 0.03em;
  }
}
</style>
