import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { ScreenOrientation } from '@capacitor/screen-orientation'
import { SplashScreen } from '@capacitor/splash-screen'
import { StatusBar } from '@capacitor/status-bar'
import { audio } from './audio'
import { bus } from './bus'
import { notifications } from './notifications'
import { state } from './state'

export const isNative = Capacitor.isNativePlatform()
export const platformName = Capacitor.getPlatform()

let backgrounded = false

function onBackground() {
  if (backgrounded)
    return
  backgrounded = true
  state.flush()
  audio.suspend()
  notifications.scheduleReminders()
  bus.emit('app:pause')
}

function onForeground() {
  if (!backgrounded)
    return
  backgrounded = false
  audio.resume()
  notifications.cancelReminders()
  bus.emit('app:resume')
}

/** Native shell setup + lifecycle wiring. */
export async function initPlatform() {
  document.addEventListener('visibilitychange', () => (document.hidden ? onBackground() : onForeground()))
  window.addEventListener('pagehide', onBackground)

  if (!isNative)
    return

  try {
    await StatusBar.hide()
  }
  catch {}
  try {
    await ScreenOrientation.lock({ orientation: 'landscape' })
  }
  catch {}

  App.addListener('appStateChange', ({ isActive }) => (isActive ? onForeground() : onBackground()))
  App.addListener('backButton', () => bus.emit('app:back'))
  notifications.cancelReminders()
}

export function hideSplash() {
  if (isNative)
    SplashScreen.hide({ fadeOutDuration: 250 }).catch(() => {})
}

export function exitApp() {
  state.flush().finally(() => {
    if (isNative)
      App.exitApp()
  })
}
