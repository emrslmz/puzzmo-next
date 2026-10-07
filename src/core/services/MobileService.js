import i18n from "@/i18n";
import { useCoreStore } from "@/store/coreStore";
import { useGameStore } from "@/store/gameStore";
import { usePlayerStore } from "@/store/playerStore";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { Network } from "@capacitor/network";
import { ScreenOrientation } from "@capacitor/screen-orientation";
import { StatusBar } from "@capacitor/status-bar";
import { alertService } from "./AlertService";
// NotificationService'in doğru import edildiğinden emin olun
import notificationService from "./NotificationService";

class MobileService {
  constructor() {
    this.isOnline = true;
    this.networkListeners = [];
    this.initialPermissionsShown = false;
  }

  /**
   * Cihazın native bir platformda (iOS veya Android) çalışıp çalışmadığını döndürür.
   * @returns {boolean}
   */
  get isNative() {
    return Capacitor.isNativePlatform();
  }

  /**
   * Cihazın web platformunda çalışıp çalışmadığını döndürür.
   * @returns {boolean}
   */
  get isWeb() {
    return !Capacitor.isNativePlatform();
  }

  /**
   * Cihazın iOS olup olmadığını kontrol eder.
   * @returns {boolean}
   */
  get isIOS() {
    return this.isNative && Capacitor.getPlatform() === "ios";
  }

  /**
   * Cihazın Android olup olmadığını kontrol eder.
   * @returns {boolean}
   */
  get isAndroid() {
    return this.isNative && Capacitor.getPlatform() === "android";
  }

  /**
   * Uygulama açıldığında tüm mobil ayarları ve servisleri başlatır.
   * @param {object} pinia - Aktif Pinia örneği.
   */
  async boot(pinia) {
    if (!this.isNative) {
      this.initNetworkListeners();
      return;
    }

    try {
      await StatusBar.hide();
      await ScreenOrientation.lock({ orientation: "landscape" });

      this.initNetworkListeners();

      // NotificationService'i başlat
      notificationService.setPinia(pinia);

      // Ayarları kontrol etmeden önce izin isteyebilir veya durumu kontrol edebilirsiniz.
      // Örneğin: await notificationService.requestPermission();

      const playerStore = usePlayerStore(pinia); // playerStore'u burada alalım
      if (playerStore.settings.notifications) {
        // Uygulama açıldığında eski bildirimleri temizleyip yeniden kurar.
        await notificationService.rescheduleAllRecurring();
      }

      // Uygulama durumunu dinlemeye başla (arka plana geçme/ön plana gelme)
      notificationService.listenToAppState();
      // YENİ: Uygulama arka plana alındığında ana sayfaya yönlendirme için dinleyici eklendi.
      this.initAppListeners(pinia);
    } catch (error) {
      console.error("MobileService boot error:", error);
    }
  }

  /**
   * YENİ: Uygulama durumu değişikliklerini (arka plana alma vb.) dinler ve
   * oyun sırasında arka plana alındığında güvenli pause + flush uygular.
   * @param {object} pinia - Aktif Pinia örneği.
   */
  initAppListeners(pinia) {
    const coreStore = useCoreStore(pinia);
    const gameStore = useGameStore(pinia);
    const playerStore = usePlayerStore(pinia);

    App.addListener("appStateChange", (state) => {
      if (!state.isActive) {
        coreStore.updateLastActiveTime();
        if (gameStore.isGameActive && !gameStore.isPaused) {
          gameStore.pauseGame();
        }
        playerStore.flushSaveNow();
      } else {
        coreStore.updateLastActiveTime();
      }
    });
  }

  /**
   * Loading ekranı bittikten sonra izin isteme modallarını gösterir
   * @param {object} pinia - Aktif Pinia örneği.
   */
  async showInitialPermissionModals(pinia) {
    if (this.initialPermissionsShown) return;
    this.initialPermissionsShown = true;

    const playerStore = usePlayerStore(pinia);

    // Eğer daha önce bildirim izni verilmemişse modal göster
    if (
      !playerStore.settings.notifications &&
      !playerStore.settings.notificationPermissionAsked
    ) {
      await this.showNotificationPermissionModal(playerStore);
    }

    // NSTransparency bildirimi göster (iOS için)
    if (this.isIOS) {
      await this.showNSTransparencyModal();
    }
  }

  /**
   * Bildirim izni isteme modalını gösterir
   */
  async showNotificationPermissionModal(playerStore) {
    const { t } = i18n.global;

    const confirmed = await alertService.show({
      title: t("notifications"),
      message: t("notification_permission_request"),
      icon: "/images/badge/announcement_badge.png",
      confirmButtonText: t("yes_allow"),
      cancelButtonText: t("no_thanks"),
    });

    // İzin sorulduğunu işaretle
    playerStore.updateSettings({ notificationPermissionAsked: true });

    if (confirmed) {
      const permissionGranted = await notificationService.requestPermission();
      if (permissionGranted) {
        await notificationService.rescheduleAllRecurring();
      }
    }
  }

  /**
   * NSTransparency bildirimi gösterir (iOS için)
   */
  async showNSTransparencyModal() {
    const { t } = i18n.global;

    await alertService.show({
      title: t("transparency_notice"),
      message: t("transparency_notice_text"),
      icon: "/images/badge/info_badge.png",
      confirmButtonText: t("understood"),
    });
  }

  /**
   * Cihazın internet bağlantısı durumunu dinler.
   */
  async initNetworkListeners() {
    try {
      if (this.isNative) {
        const status = await Network.getStatus();
        this.isOnline = status.connected;
        Network.addListener("networkStatusChange", (status) => {
          this.isOnline = status.connected;
          this.notifyNetworkChange(status.connected);
        });
      } else {
        this.isOnline = navigator.onLine;
        window.addEventListener("online", () => this.notifyNetworkChange(true));
        window.addEventListener("offline", () =>
          this.notifyNetworkChange(false)
        );
      }
    } catch (error) {
      console.error("Network listener setup failed:", error);
      this.isOnline = true; // Hata durumunda varsayılan olarak online kabul et
    }
  }

  notifyNetworkChange(isOnline) {
    this.isOnline = isOnline;
    this.networkListeners.forEach((listener) => {
      try {
        listener(isOnline);
      } catch (error) {
        console.error("Error in network listener callback:", error);
      }
    });
  }

  addNetworkListener(listener) {
    this.networkListeners.push(listener);
  }

  removeNetworkListener(listener) {
    const index = this.networkListeners.indexOf(listener);
    if (index > -1) {
      this.networkListeners.splice(index, 1);
    }
  }
}

export const mobileService = new MobileService();
