import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'

const isNative = Capacitor.isNativePlatform()

/**
 * Tiny key/value store: Capacitor Preferences on device (survives WebView
 * cache clears), localStorage on the web.
 */
export const storage = {
  async get(key) {
    try {
      if (isNative)
        return (await Preferences.get({ key })).value
      return localStorage.getItem(key)
    }
    catch (error) {
      console.warn('[storage] get failed', key, error)
      return null
    }
  },

  async set(key, value) {
    try {
      if (isNative)
        await Preferences.set({ key, value })
      else
        localStorage.setItem(key, value)
    }
    catch (error) {
      console.warn('[storage] set failed', key, error)
    }
  },

  async remove(key) {
    try {
      if (isNative)
        await Preferences.remove({ key })
      else
        localStorage.removeItem(key)
    }
    catch (error) {
      console.warn('[storage] remove failed', key, error)
    }
  },
}
