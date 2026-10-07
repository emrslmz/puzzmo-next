import { AdMob } from '@capacitor-community/admob'
import { Capacitor } from '@capacitor/core'
import { getAdIds } from './adIds'
import { mobileService } from './MobileService'

const isIos = Capacitor.getPlatform() === 'ios'
const isAndroid = Capacitor.getPlatform() === 'android'

let initialized = false

/**
 * Initializes AdMob on native platforms.
 * @returns {Promise<boolean>}
 */
export async function initializeAdMob() {
  if (!mobileService.isNative) {
    console.warn('AdMob can only be initialized on a native platform.')
    return false
  }
  if (initialized)
    return true

  try {
    await AdMob.initialize({
      requestTrackingAuthorization: true,
      initializeForTesting: false, // Production modu için 'false' olmalı
    })
    initialized = true
    console.log('AdMob successfully initialized.')
    return true
  }
  catch (error) {
    console.error('Error initializing AdMob:', error)
    return false
  }
}

/**
 * Prepares and shows an interstitial ad.
 * @returns {Promise<void>} A promise that resolves when the ad is closed or fails.
 */
export function showInterstitialAd() {
  return new Promise((resolve) => {
    const logic = async () => {
      // Web ortamında simülasyon
      if (mobileService.isWeb) {
        console.log('INTERSTITIAL AD (WEB SIMULATION)');
        // Simülasyon için kısa bir bekleme
        await new Promise(r => setTimeout(r, 800));
        resolve();
        return;
      }

      // Mobil platformda gerçek reklam mantığı
      const isInitialized = await initializeAdMob();
      if (!isInitialized) {
        console.error('❌ AdMob could not be initialized for interstitial ad.');
        resolve();
        return;
      }

      try {
        const adId = getAdIds().puzzmoInterstitial;
        if (!adId) {
          console.error('❌ Interstitial Ad ID not found.');
          resolve();
          return;
        }

        const adOptions = { adId, isTesting: false }; // Production modu

        // Reklam kapatıldığında event dinleyicisi ekle
        const listener = await AdMob.addListener('interstitialAdDismissed', () => {
          listener.remove(); // Dinleyiciyi kaldır
          resolve();
        });

        await AdMob.prepareInterstitial(adOptions);
        await AdMob.showInterstitial();
      } catch (error) {
        console.error('❗ Error preparing/showing interstitial ad:', error);
        resolve(); // Hata durumunda bile devam et
      }
    };

    logic().catch((error) => {
      console.error('❗ showInterstitialAd logic error:', error);
      resolve();
    });
  });
}


/**
 * Prepares and shows a rewarded video ad.
 * @param {function(boolean): void} [loadingCallback] - Optional callback to track loading state.
 * @returns {Promise<boolean>} A promise that resolves to true if the user earned the reward, false otherwise.
 */
export function showRewardedAd(loadingCallback = null) {
  return new Promise((resolve) => {
    const setLoading = (isLoading) => {
      if (loadingCallback && typeof loadingCallback === 'function') {
        loadingCallback(isLoading)
      }
    }

    let resolved = false
    const safeResolve = (value) => {
      if (resolved) return
      resolved = true
      setLoading(false)
      resolve(value)
    }

    const logic = async () => {
      setLoading(true)

      // Web ortamında simülasyon
      if (mobileService.isWeb) {
        console.log('🎥 REWARDED AD (WEB SIMULATION)')
        setTimeout(() => {
          safeResolve(true)
        }, 2000)
        return
      }

      // Mobil platform için timeout ekle (30 saniye)
      const timeoutId = setTimeout(() => {
        console.error('❌ Reklam timeout - 30 saniye geçti')
        safeResolve(false)
      }, 30000)

      const isInitialized = await initializeAdMob()
      if (!isInitialized) {
        console.error('❌ AdMob başlatılamadı')
        clearTimeout(timeoutId)
        safeResolve(false)
        return
      }

      let rewardGiven = false
      let rewardListener = null
      let dismissListener = null

      const cleanup = () => {
        clearTimeout(timeoutId)
        if (rewardListener) {
          rewardListener.remove()
          rewardListener = null
        }
        if (dismissListener) {
          dismissListener.remove()
          dismissListener = null
        }
      }

      const giveReward = () => {
        if (rewardGiven) return false
        rewardGiven = true
        console.log('🎁 Ödül veriliyor...')
        return true
      }

      try {
        const adId = getAdIds().puzzmoRewarded
        if (!adId) {
          console.error('❌ Reklam ID bulunamadı')
          clearTimeout(timeoutId)
          safeResolve(false)
          return
        }

        const adOptions = { adId, isTesting: false }

        // Event listener'ları kurulum
        rewardListener = await AdMob.addListener('rewardedVideoAdRewarded', (reward) => {
          console.log('🎁 Reklam ödülü alındı:', reward)
          giveReward()
        })

        dismissListener = await AdMob.addListener('rewardedVideoAdDismissed', () => {
          console.log('🎥 Reklam kapatıldı. Ödül durumu:', rewardGiven)
          cleanup()
          safeResolve(rewardGiven)
        })

        // Reklam hazırlama ve gösterme
        await AdMob.prepareRewardVideoAd(adOptions)
        console.log('🎬 Reklam hazırlandı, gösteriliyor...')
        await AdMob.showRewardVideoAd()
        
      } catch (error) {
        console.error('❗ Reklam hazırlama/gösterme hatası:', error)
        cleanup()
        safeResolve(false)
      }
    }

    logic().catch((error) => {
      console.error('❗ showRewardedAd logic hatası:', error)
      safeResolve(false)
    })
  })
}

// Servisi tek bir nesne olarak dışa aktar
export const admobService = {
  initializeAdMob,
  showRewardedAd,
  showInterstitialAd, // Yeni fonksiyonu ekle
}
