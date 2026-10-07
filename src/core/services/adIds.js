import { Capacitor } from '@capacitor/core'

export function getAdIds() {
  const isAndroid = Capacitor.getPlatform() === 'android'
  const isIos = Capacitor.getPlatform() === 'ios'

  // Tüm reklam ID'leri
  const adIds = {
    puzzmoBanner: isAndroid
      ? 'ca-app-pub-3304037628561493/9907607818' // Android
      : isIos
        ? 'ca-app-pub-3304037628561493/5249160541' // iOS
        : '',
    puzzmoBannerSmart: isAndroid
      ? 'ca-app-pub-3304037628561493/3508422593' // Android
      : isIos
        ? 'ca-app-pub-3304037628561493/4810853831' // iOS
        : '',
    puzzmoInterstitial: isAndroid
      ? 'ca-app-pub-3304037628561493/9053561269' // Android
      : isIos
        ? 'ca-app-pub-3304037628561493/2459345679' // iOS
        : '',
    puzzmoRewarded: isAndroid
      ? 'ca-app-pub-3304037628561493/6459962563' // Androidsdadsadsdasdsa
      : isIos
        ? 'ca-app-pub-3304037628561493/1146264004' // iOS
        : '',
  }

  return adIds
}
