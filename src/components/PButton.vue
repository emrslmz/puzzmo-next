<script setup lang="ts">
import { computed, useSlots } from 'vue'
import { soundService } from '@/core/services/SoundService'
import vibrationService from '@/core/services/VibrationService'

const props = defineProps({
  variant: {
    type: String,
    default: 'primary',
    validator: (v: string) => ['primary', 'secondary', 'success', 'warning', 'danger', 'neutral'].includes(v),
  },
  size: {
    type: String,
    default: 'lg',
    validator: (v: string) => ['sm', 'md', 'lg', 'xl'].includes(v),
  },
  img: {
    type: String,
    default: '',
  },
  label: {
    type: String,
    default: '',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  layout: {
    type: String,
    default: 'stack',
    validator: (v: string) => ['stack', 'inline'].includes(v),
  },
})

const emit = defineEmits(['click'])
const slots = useSlots()

const rootSize = {
  sm: 'size-sm',
  md: 'size-md',
  lg: 'size-lg',
  xl: 'size-xl',
}

const sizeLabel = {
  sm: 'label-sm',
  md: 'label-md',
  lg: 'label-lg',
  xl: 'label-xl',
}

const sizeIcon = {
  sm: 'icon-sm',
  md: 'icon-md',
  lg: 'icon-lg',
  xl: 'icon-xl',
}

const hasIconContent = computed(() => Boolean(props.img || slots.icon || slots.default))
const hasLabelContent = computed(() => Boolean(props.label || slots.label))

const rootClass = computed(() => [
  rootSize[props.size],
  sizeLabel[props.size],
  sizeIcon[props.size],
  `variant-${props.variant}`,
  `layout-${props.layout}`,
  !hasIconContent.value && hasLabelContent.value ? 'label-only' : '',
])

function handleClick(e: Event) {
  if (props.disabled)
    return
  soundService.playEffect('click_effect')
  vibrationService.vibrate('click')
  emit('click', e)
}
</script>

<template>
  <button
    type="button"
    class="pbtn-root"
    :class="[rootClass, props.disabled && 'is-disabled']"
    :disabled="props.disabled"
    @click="handleClick"
  >
    <span class="pbtn-frame">
      <span class="pbtn-sheen" />
      <img
        v-if="props.img"
        :src="props.img"
        alt="icon"
        class="pbtn-img"
      >
      <span v-else-if="hasIconContent" class="pbtn-icon" aria-hidden="true">
        <slot name="icon">
          <slot />
        </slot>
      </span>

      <span v-if="props.layout === 'inline' && hasLabelContent" class="pbtn-label pbtn-label-inline">
        <slot name="label">{{ props.label }}</slot>
      </span>
    </span>

    <span v-if="props.layout === 'stack' && hasLabelContent" class="pbtn-label pbtn-label-stack">
      <slot name="label">{{ props.label }}</slot>
    </span>
  </button>
</template>

<style scoped>
.pbtn-root {
  --btn-top: #89dcff;
  --btn-bottom: #3c8fff;
  --btn-border: #1e4ca8;
  --btn-shadow: #102d6f;
  --btn-text: #f8fcff;
  --btn-label-shadow: #112b6a;
  --btn-glow: rgba(115, 208, 255, 0.45);
  border: 0;
  background: transparent;
  padding: 0;
  font-family: "Bungee", sans-serif;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 0.34rem;
  cursor: pointer;
  user-select: none;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.pbtn-frame {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, var(--btn-top) 0%, var(--btn-bottom) 100%);
  border: 3px solid var(--btn-border);
  box-shadow:
    0 8px 0 var(--btn-shadow),
    0 12px 18px rgba(7, 26, 73, 0.33),
    inset 0 2px 0 rgba(255, 255, 255, 0.42);
  overflow: hidden;
  transition: transform 120ms ease, box-shadow 120ms ease;
}

.pbtn-root.layout-stack .pbtn-frame {
  border-radius: 999px;
}

.pbtn-root.layout-inline .pbtn-frame {
  border-radius: 1.15rem;
  padding-inline: 0.66rem 0.9rem;
  gap: 0.54rem;
}

.pbtn-root.size-sm.layout-stack .pbtn-frame {
  width: 3rem;
  height: 3rem;
}

.pbtn-root.size-md.layout-stack .pbtn-frame {
  width: 3.6rem;
  height: 3.6rem;
}

.pbtn-root.size-lg.layout-stack .pbtn-frame {
  width: 4rem;
  height: 4rem;
}

.pbtn-root.size-xl.layout-stack .pbtn-frame {
  width: 4.8rem;
  height: 4.8rem;
}

.pbtn-root.size-sm.layout-inline .pbtn-frame {
  min-height: 3rem;
}

.pbtn-root.size-md.layout-inline .pbtn-frame {
  min-height: 3.6rem;
}

.pbtn-root.size-lg.layout-inline .pbtn-frame {
  min-height: 4rem;
}

.pbtn-root.size-xl.layout-inline .pbtn-frame {
  min-height: 4.8rem;
  padding-inline: 0.86rem 1.1rem;
  border-radius: 1.25rem;
}

.pbtn-root:active .pbtn-frame {
  transform: translateY(4px);
  box-shadow:
    0 4px 0 var(--btn-shadow),
    0 8px 12px rgba(7, 26, 73, 0.3),
    inset 0 2px 0 rgba(255, 255, 255, 0.42);
}

.pbtn-root:focus-visible .pbtn-frame {
  outline: 3px solid rgba(255, 255, 255, 0.76);
  outline-offset: 2px;
}

.pbtn-sheen {
  position: absolute;
  top: 4px;
  left: 8px;
  right: 8px;
  height: 45%;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.42) 0%, rgba(255, 255, 255, 0) 100%);
  pointer-events: none;
}

.pbtn-img,
.pbtn-icon {
  width: 80%;
  height: 80%;
  display: grid;
  place-items: center;
  object-fit: contain;
  position: relative;
  z-index: 2;
}

.pbtn-root.layout-inline .pbtn-img,
.pbtn-root.layout-inline .pbtn-icon {
  width: auto;
  height: auto;
}

.pbtn-icon :deep(img),
.pbtn-icon :deep(svg) {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.pbtn-label {
  color: var(--btn-text);
  text-transform: uppercase;
  letter-spacing: 0.09em;
  line-height: 1;
  text-shadow:
    0 2px 0 var(--btn-label-shadow),
    0 0 10px var(--btn-glow);
}

.pbtn-label-stack {
  padding-inline: 0.08rem;
}

.pbtn-label-inline {
  white-space: nowrap;
}

.pbtn-root.label-sm .pbtn-label {
  font-size: 0.66rem;
}

.pbtn-root.label-md .pbtn-label {
  font-size: 0.74rem;
}

.pbtn-root.label-lg .pbtn-label {
  font-size: 0.84rem;
}

.pbtn-root.label-xl .pbtn-label {
  font-size: 0.96rem;
}

.pbtn-root.icon-sm .pbtn-icon,
.pbtn-root.icon-sm .pbtn-img {
  width: 76%;
  height: 76%;
}

.pbtn-root.icon-md .pbtn-icon,
.pbtn-root.icon-md .pbtn-img {
  width: 80%;
  height: 80%;
}

.pbtn-root.icon-lg .pbtn-icon,
.pbtn-root.icon-lg .pbtn-img {
  width: 84%;
  height: 84%;
}

.pbtn-root.icon-xl .pbtn-icon,
.pbtn-root.icon-xl .pbtn-img {
  width: 88%;
  height: 88%;
}

.pbtn-root.layout-inline .pbtn-icon,
.pbtn-root.layout-inline .pbtn-img {
  width: 2.75rem;
  height: 2.75rem;
}

.pbtn-root.variant-primary {
  --btn-top: #95e8ff;
  --btn-bottom: #3290ff;
  --btn-border: #1b54ba;
  --btn-shadow: #0f347f;
  --btn-label-shadow: #112b6a;
  --btn-glow: rgba(126, 203, 255, 0.55);
}

.pbtn-root.variant-secondary {
  --btn-top: #b5c8ff;
  --btn-bottom: #6d82ff;
  --btn-border: #3d4fcf;
  --btn-shadow: #232f86;
  --btn-label-shadow: #212a78;
  --btn-glow: rgba(169, 183, 255, 0.55);
}

.pbtn-root.variant-success {
  --btn-top: #8ef7b5;
  --btn-bottom: #29c56c;
  --btn-border: #13853f;
  --btn-shadow: #0d5e31;
  --btn-label-shadow: #0f632f;
  --btn-glow: rgba(130, 248, 182, 0.56);
}

.pbtn-root.variant-warning {
  --btn-top: #ffe284;
  --btn-bottom: #ffae2e;
  --btn-border: #c47300;
  --btn-shadow: #8a4900;
  --btn-label-shadow: #894900;
  --btn-glow: rgba(255, 205, 104, 0.57);
}

.pbtn-root.variant-danger {
  --btn-top: #ffb1bf;
  --btn-bottom: #ff5c7f;
  --btn-border: #c52956;
  --btn-shadow: #85173a;
  --btn-label-shadow: #7c1736;
  --btn-glow: rgba(255, 160, 183, 0.48);
}

.pbtn-root.variant-neutral {
  --btn-top: #dde7ff;
  --btn-bottom: #a7b4d6;
  --btn-border: #5f6f99;
  --btn-shadow: #47516f;
  --btn-label-shadow: #3d4562;
  --btn-glow: rgba(193, 211, 255, 0.45);
}

.pbtn-root.is-disabled {
  pointer-events: none;
  opacity: 0.62;
  filter: saturate(0.78);
}

.pbtn-root.label-only .pbtn-frame {
  padding-inline: 1rem;
}
</style>
