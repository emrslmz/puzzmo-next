<script setup>
import { soundService } from "@/core/services/SoundService.js";
import { computed, defineEmits, defineProps, onMounted, ref } from "vue";

// --- PROPS ---
const props = defineProps({
  color: {
    type: String,
    default: "yellow", // 'yellow', 'green', 'red', 'blue'
    validator: (value) => ["yellow", "green", "red", "blue"].includes(value),
  },
  size: {
    type: String,
    default: "md", // 'sm', 'md', 'lg', '2xl'
    validator: (value) => ["sm", "md", "lg", "2xl"].includes(value),
  },
  fullWidth: {
    type: Boolean,
    default: false,
  },
});

// --- EMITS ---
const emit = defineEmits(["click"]);

// --- REFS ---
const animateClass = ref("");
const buttonWidth = ref("");
const buttonRef = ref(null);

// --- COMPUTED ---
const sizeClass = computed(() => `size-${props.size}`);

// Font sizes for each size variant
const fontSizes = {
  sm: "0.9em",
  md: "1.1em",
  lg: "1.4em",
  "2xl": "1.7em",
};

// Minimum widths for each size variant
const minWidths = {
  sm: 100,
  md: 160,
  lg: 180,
  "2xl": 200,
};

// Calculate text width using canvas
function measureTextWidth(text, fontSize) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  context.font = `${fontSize} "Bungee", sans-serif`;
  const metrics = context.measureText(text);
  return metrics.width;
}

// Set dynamic button width based on text content or fullWidth prop
onMounted(() => {
  // If fullWidth is true, set width to 100% and stop
  if (props.fullWidth) {
    buttonWidth.value = "100%";
    return;
  }

  // Otherwise, calculate width based on text content
  if (buttonRef.value) {
    const textElement = buttonRef.value.querySelector(".battle-text");
    if (!textElement) return;

    const text = textElement.textContent.trim();
    const fontSize = fontSizes[props.size];

    // Measure text width
    let textWidth = measureTextWidth(text, fontSize);

    // Increase padding to make the button wider
    const padding =
      props.size === "sm"
        ? 60
        : props.size === "md"
          ? 170
          : props.size === "lg"
            ? 100
            : 120;

    // Calculate total width
    textWidth += padding;

    // Ensure minimum width
    const minWidth = minWidths[props.size];
    buttonWidth.value = `${Math.max(textWidth, minWidth)}px`;
  }
});

// --- METHODS ---
function handleClick(event) {
  animateClass.value = "animate__animated animate__rubberBand";
  emit("click", event);
  soundService.playEffect("click_effect_2");
  setTimeout(() => {
    animateClass.value = "";
  }, 1000);
}
</script>

<template>
  <div
    ref="buttonRef"
    class="clash-button-wrapper"
    :class="[color, sizeClass, animateClass]"
    :style="{ '--btn-width': buttonWidth }"
    @click="handleClick"
  >
    <div class="couche1 flex justify-center items-center">
      <div class="couche2 flex justify-center items-center">
        <div class="couche23 flex justify-center items-center">
          <div class="couche3 flex justify-center items-center">
            <div class="couche4 flex justify-center items-center">
              <span class="battle-text flex justify-center items-center pb-2">
                <slot />
              </span>
              <div class="couche5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Bungee font import */
@import "https://fonts.googleapis.com/css?family=Bungee";

/* --- Size Variables --- */
.clash-button-wrapper.size-2xl {
  --btn-height: 80px;
  --font-size: 1.4em;
  --main-shadow-offset: 9px;
  --border-radius: 10px;
  --press-offset: 5px;
  --couche5-left-margin: calc(var(--btn-width) - 27px);
}

.clash-button-wrapper.size-lg {
  --btn-height: 64px;
  --font-size: 1.2em;
  --main-shadow-offset: 9px;
  --border-radius: 8px;
  --press-offset: 4px;
  --couche5-left-margin: calc(var(--btn-width) - 22px);
}

.clash-button-wrapper.size-md {
  --btn-height: 50px;
  --font-size: 0.95em;
  --main-shadow-offset: 9px;
  --border-radius: 6px;
  --press-offset: 3px;
  --couche5-left-margin: calc(var(--btn-width) - 18px);
}

.clash-button-wrapper.size-sm {
  --btn-height: 40px;
  --font-size: 0.8em;
  --main-shadow-offset: 8px;
  --border-radius: 5px;
  --press-offset: 2px;
  --couche5-left-margin: calc(var(--btn-width) - 14px);
}

/* --- Base Button Styles --- */
.clash-button-wrapper {
  font-family: "Bungee", sans-serif;
  cursor: pointer;
  /* When fullWidth is used, the wrapper itself should also be full width */
  width: var(--btn-width);
}

.couche1 {
  position: relative;
  width: 100%; /* Changed from var(--btn-width) to fill the wrapper */
  height: var(--btn-height);
  border-radius: var(--border-radius);
  background: black;
  box-shadow: 0px var(--main-shadow-offset) 2px #301c09;
  transition: all 0.1s ease-in-out;
}

.couche2 {
  position: absolute;
  border-radius: calc(var(--border-radius) - 1px);
  width: calc(100% - 6px); /* Use percentage for responsiveness */
  height: calc(var(--btn-height) - 6px);
  margin-top: 3px;
  margin-left: 3px;
}

.couche23 {
  position: absolute;
  border-radius: calc(var(--border-radius) - 1px);
  width: calc(100% - 8px); /* Use percentage for responsiveness */
  height: calc(var(--btn-height) - 20px);
  margin-top: 5px;
  margin-left: 1px;
}

.couche3 {
  position: absolute;
  border-radius: calc(var(--border-radius) - 1px);
  width: calc(100% - 19px); /* Use percentage for responsiveness */
  height: calc(var(--btn-height) - 18px);
  margin-top: 0px;
  margin-left: 5px;
}

.couche4 {
  position: absolute;
  border-radius: calc(var(--border-radius) - 1px);
  width: calc(100% - 25px); /* Use percentage for responsiveness */
  height: calc(var(--btn-height) - 62px);
  margin-top: 5px;
  margin-left: 3px;
}

.couche5 {
  position: absolute;
  border-radius: 45%;
  margin-top: 0px;
  /* This needs to be adjusted for full-width buttons */
  right: 10px; /* A fixed position from the right might work better */
}

.battle-text {
  position: absolute;
  font-style: normal;
  font-weight: 400;
  font-size: var(--font-size);
  white-space: nowrap;
  width: 100%;
}

/* --- Color Variants --- */
.yellow .couche2 {
  background: #fda80d;
  box-shadow: 0px 9px 0px #af6b06;
}
.yellow .couche23 {
  box-shadow: 0px -4px 5px 0px #ffdc33;
}
.yellow .couche3 {
  background: rgba(255, 187, 42, 1);
  box-shadow: 0px 4px 3px 0px #fe8906;
}
.yellow .couche5 {
  background: #fff1b6;
}
.yellow .battle-text {
  color: #ffffcc;
  text-shadow:
    -1px 0 1px #582e00,
    1px 0 1px #582e00,
    0 -1px 1px #582e00,
    0 4px 1px #582e00,
    -2px 4px 1px #582e00,
    2px 3px 2px #582e00;
}

.red .couche2 {
  background: #fc3632;
  box-shadow: 0px 9px 0px #9c1814;
}
.red .couche23 {
  box-shadow: 0px -4px 5px 0px #fe5970;
}
.red .couche3 {
  background: #fc4262;
  box-shadow: 0px 4px 3px 0px #e42625;
}
.red .couche5 {
  background: #ffc8c8;
}
.red .battle-text {
  color: #ffffcc;
  text-shadow:
    -1px 0 1px #990000,
    1px 0 1px #990000,
    0 -1px 1px #990000,
    0 4px 1px #990000,
    -2px 4px 1px #990000,
    2px 3px 2px #990000;
}

.green .couche2 {
  background: #09cc48;
  box-shadow: 0px 9px 0px #0d8f23;
}
.green .couche23 {
  box-shadow: 0px -4px 5px 0px #60da61;
}
.green .couche3 {
  background: #30ed45;
  box-shadow: 0px 4px 3px 0px #25d039;
}
.green .couche5 {
  background: #d9ffff;
}
.green .battle-text {
  color: #fefefe;
  text-shadow:
    -1px 0 1px #005f00,
    1px 0 1px #005f00,
    0 -1px 1px #005f00,
    0 4px 1px #005f00,
    -2px 4px 1px #005f00,
    2px 3px 2px #005f00;
}

.blue .couche2 {
  background: #2199ff;
  box-shadow: 0px 9px 0px #004fa5;
}
.blue .couche23 {
  box-shadow: 0px -4px 5px 0px #3ebaff;
}
.blue .couche3 {
  background: #4cadff;
  box-shadow: 0px 4px 3px 0px #2181fc;
}
.blue .couche5 {
  background: #d9ffff;
}
.blue .battle-text {
  color: #fefefe;
  text-shadow:
    -1px 0 1px #002f83,
    1px 0 1px #002f83,
    0 -1px 1px #002f83,
    0 4px 1px #002f83,
    -2px 4px 1px #002f83,
    2px 3px 2px #002f83;
}
</style>
