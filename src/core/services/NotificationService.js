import i18n from '@/i18n'
import { usePlayerStore } from '@/store/playerStore'
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { ref, watch } from 'vue'

class NotificationService {
  constructor() {
    this.playerStore = null
    this.pinia = null // Pinia örneğini tutmak için
    this.storeWatcherSetup = false
    this.permissionDenied = ref(false)

    this.notificationIds = {
      COMEBACK: 1,
      TEST_NOTIFICATION: 999, // Test bildirimi için ID
      INACTIVITY_3H: 101,
      INACTIVITY_24H: 102,
      INACTIVITY_3D: 103,
      INACTIVITY_1W: 104,
    }

    this.inactivityReminders = [
      { id: this.notificationIds.INACTIVITY_3H, hours: 3, body: 'Notifications.inactivity3h' },
      { id: this.notificationIds.INACTIVITY_24H, hours: 24, body: 'Notifications.inactivity24h' },
      { id: this.notificationIds.INACTIVITY_3D, hours: 72, body: 'Notifications.inactivity3d' },
      { id: this.notificationIds.INACTIVITY_1W, hours: 168, body: 'Notifications.inactivity1w' },
    ]
  }

  // Pinia örneğini servise enjekte etmek için metod
  setPinia(pinia) {
    this.pinia = pinia
  }

  // Pinia örneğini kullanarak store'a erişim
  getPlayerStore() {
    if (!this.playerStore) {
      if (!this.pinia) {
        console.error('NotificationService: Pinia has not been set. Call setPinia(pinia) first.')
        return null
      }
      this.playerStore = usePlayerStore(this.pinia)
      if (!this.storeWatcherSetup) {
        this.setupSettingsWatcher()
      }
    }
    return this.playerStore
  }

  setupSettingsWatcher() {
    // getPlayerStore() null dönebileceği için ?. operatörü ekleniyor
    watch(
      () => this.getPlayerStore()?.settings.notifications,
      (isEnabled) => {
        if (Capacitor.isNativePlatform()) {
          if (isEnabled) {
            this.rescheduleAllRecurring()
          }
          else {
            this.cancelAllNotifications()
          }
        }
      },
    )
    this.storeWatcherSetup = true
  }

  async requestPermission() {
    if (!Capacitor.isNativePlatform())
      return true

    try {
      const result = await LocalNotifications.requestPermissions()
      const granted = result.display === 'granted'
      this.getPlayerStore()?.updateSettings({ notifications: granted })
      this.permissionDenied.value = result.display === 'denied'
      return granted
    }
    catch (error) {
      console.error('Bildirim izni istenirken hata:', error)
      this.getPlayerStore()?.updateSettings({ notifications: false })
      return false
    }
  }

  async rescheduleAllRecurring() {
    if (!Capacitor.isNativePlatform() || !this.getPlayerStore()?.settings.notifications) {
      return
    }
    await this.cancelAllNotifications()
    await this.scheduleInactivityReminders()
    // Test bildirimini isterseniz burada da tetikleyebilirsiniz.
    // await this.scheduleTestNotification(); 
  }

  async scheduleInactivityReminders() {
    if (!this.getPlayerStore()?.settings.notifications)
      return

    try {
      const notificationsToSchedule = this.inactivityReminders.map((reminder) => {
        const fireTime = new Date(Date.now() + reminder.hours * 60 * 60 * 1000)
        return {
          id: reminder.id,
          title: 'Puzzmo',
          body: i18n.global.t(reminder.body),
          schedule: { at: fireTime },
          smallIcon: 'res://ic_stat_icon_sample',
          largeIcon: 'res://icon',
        }
      })
      await LocalNotifications.schedule({ notifications: notificationsToSchedule })
      console.log('Hareketsizlik bildirimleri zamanlandı.');
    }
    catch (error) {
      console.error('Aktivite dışı kalma bildirimleri kurulurken hata:', error)
    }
  }

  async scheduleComebackNotification() {
    if (!this.getPlayerStore()?.settings.notifications)
      return
    try {
      const fireTime = new Date(Date.now() + 1 * 60 * 60 * 1000) // 1 saat sonra
      await LocalNotifications.schedule({
        notifications: [
          {
            id: this.notificationIds.COMEBACK,
            title: 'Seni Özledik!',
            body: i18n.global.t('Notifications.comeback'),
            schedule: { at: fireTime },
            smallIcon: 'res://ic_stat_icon_sample',
            largeIcon: 'res://icon',
          },
        ],
      })
      console.log('Geri dön bildirimi zamanlandı.');
    }
    catch (error) {
      console.error('Geri dön bildirimi kurulurken hata:', error)
    }
  }
  
  // Sadece geri dön bildirimini iptal eder
  async cancelComebackNotification() {
    try {
       await this.cancelNotificationById(this.notificationIds.COMEBACK);
    }
    catch (error) {
      console.error('Geri dön bildirimi iptal edilirken hata:', error)
    }
  }

  async cancelAllNotifications() {
    try {
      const pending = await LocalNotifications.getPending()
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({ notifications: pending.notifications })
        console.log('Tüm bekleyen bildirimler iptal edildi.');
      }
    }
    catch (error) {
      console.error('Bildirimler iptal edilirken hata:', error)
    }
  }

  listenToAppState() {
    if (!Capacitor.isNativePlatform())
      return
    App.addListener('appStateChange', async ({ isActive }) => {
      if (isActive) {
        // Kullanıcı uygulamaya geri döndüğünde ilgili bildirimleri iptal et
        await this.cancelComebackNotification();
        await this.cancelInactivityReminders();
      } else {
        // Kullanıcı uygulamadan ayrıldığında bildirimleri kur
        await this.scheduleComebackNotification();
        await this.scheduleInactivityReminders();
      }
    })
  }
  
  async cancelInactivityReminders() {
    const inactivityIds = this.inactivityReminders.map(r => ({ id: r.id }));
    try {
        await LocalNotifications.cancel({ notifications: inactivityIds });
        console.log('Hareketsizlik bildirimleri iptal edildi.');
    } catch(e) {
        console.error('Hareketsizlik bildirimleri iptal edilirken hata:', e);
    }
  }
  
  async cancelNotificationById(notificationId) {
     try {
        const pending = await LocalNotifications.getPending();
        const notification = pending.notifications.find(n => n.id === notificationId);
        if (notification) {
            await LocalNotifications.cancel({ notifications: [{ id: notificationId }] });
            console.log(`${notificationId} ID'li bildirim iptal edildi.`);
        }
     } catch(e) {
        console.error(`${notificationId} ID'li bildirim iptal edilirken hata:`, e);
     }
  }

  // --- TEST FONKSİYONLARI ---

  async scheduleTestNotification() {
    // DÜZELTME: `getUserStore()` yerine `getPlayerStore()` kullanıldı.
    if (!this.getPlayerStore()?.settings.notifications) {
      console.log('Test bildirimi zamanlanamıyor: Bildirimler devre dışı.')
      return;
    }

    try {
      // Önceki test bildirimini iptal et
      await this.cancelTestNotification()

      const fireTime = new Date(Date.now() + 10000) // 10 saniye sonra

      await LocalNotifications.schedule({
        notifications: [
          {
            id: this.notificationIds.TEST_NOTIFICATION,
            title: 'Puzzmo - Test',
            // DÜZELTME: `this.t()` yerine doğrudan `i18n.global.t()` kullanıldı.
            body: i18n.global.t('Notifications.testNotification'),
            schedule: { at: fireTime },
            smallIcon: 'res://ic_stat_icon_sample',
            largeIcon: 'res://icon',
          },
        ],
      })
      console.log('Test bildirimi 10 saniye sonrasına zamanlandı.')
    }
    catch (error) {
      console.error('Test bildirimi zamanlanırken hata:', error)
    }
  }

  async cancelTestNotification() {
    try {
        await this.cancelNotificationById(this.notificationIds.TEST_NOTIFICATION);
    } catch(e) {
        console.error('Test bildirimi iptal edilirken hata:', e);
    }
  }
}

const notificationService = new NotificationService()
export default notificationService
