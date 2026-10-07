import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'
import { state } from './state'

const isNative = Capacitor.isNativePlatform()
const WEB_DURATIONS = { light: 8, medium: 16, heavy: 30, success: [10, 40, 10], warning: [20, 40, 20], error: [30, 50, 30] }

function webVibrate(pattern) {
  try {
    navigator.vibrate?.(pattern)
  }
  catch {}
}

/** Haptic feedback that respects the player's vibration setting. */
export const haptics = {
  get enabled() {
    return state.settings.vibration
  },

  impact(style = 'light') {
    if (!this.enabled)
      return
    if (!isNative)
      return webVibrate(WEB_DURATIONS[style])
    const map = { light: ImpactStyle.Light, medium: ImpactStyle.Medium, heavy: ImpactStyle.Heavy }
    Haptics.impact({ style: map[style] ?? ImpactStyle.Light }).catch(() => {})
  },

  notify(type = 'success') {
    if (!this.enabled)
      return
    if (!isNative)
      return webVibrate(WEB_DURATIONS[type])
    const map = { success: NotificationType.Success, warning: NotificationType.Warning, error: NotificationType.Error }
    Haptics.notification({ type: map[type] ?? NotificationType.Success }).catch(() => {})
  },

  selection() {
    if (!this.enabled || !isNative)
      return
    Haptics.selectionChanged().catch(() => {})
  },
}
