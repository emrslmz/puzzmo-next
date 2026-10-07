import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { t } from './i18n'
import { state } from './state'

const isNative = Capacitor.isNativePlatform()

// Re-engagement reminders, scheduled when the app goes to background and
// cancelled as soon as the player comes back.
const REMINDERS = [
  { id: 101, hours: 3, body: 'Notifications.inactivity3h' },
  { id: 102, hours: 24, body: 'Notifications.inactivity24h' },
  { id: 103, hours: 72, body: 'Notifications.inactivity3d' },
  { id: 104, hours: 168, body: 'Notifications.inactivity1w' },
]

export const notifications = {
  async requestPermission() {
    if (!isNative) {
      state.updateSettings({ notifications: true, notificationPermissionAsked: true })
      return true
    }
    try {
      const result = await LocalNotifications.requestPermissions()
      const granted = result.display === 'granted'
      state.updateSettings({ notifications: granted, notificationPermissionAsked: true })
      return granted
    }
    catch (error) {
      console.warn('[notifications] permission failed', error)
      state.updateSettings({ notifications: false, notificationPermissionAsked: true })
      return false
    }
  },

  async scheduleReminders() {
    if (!isNative || !state.settings.notifications)
      return
    try {
      await this.cancelReminders()
      const now = Date.now()
      await LocalNotifications.schedule({
        notifications: REMINDERS.map(r => ({
          id: r.id,
          title: 'Puzzmo',
          body: t(r.body),
          schedule: { at: new Date(now + r.hours * 3600_000), allowWhileIdle: true },
          smallIcon: 'ic_stat_puzzmo',
          iconColor: '#FFB020',
        })),
      })
    }
    catch (error) {
      console.warn('[notifications] schedule failed', error)
    }
  },

  async cancelReminders() {
    if (!isNative)
      return
    try {
      await LocalNotifications.cancel({ notifications: REMINDERS.map(r => ({ id: r.id })) })
    }
    catch {}
  },

  async disable() {
    state.updateSettings({ notifications: false })
    await this.cancelReminders()
  },
}
