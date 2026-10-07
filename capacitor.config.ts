import type { CapacitorConfig } from '@capacitor/cli'

// Live reload on a device: CAP_SERVER_URL=http://<lan-ip>:5757 npx cap run android
const devServer = process.env.CAP_SERVER_URL

const config: CapacitorConfig = {
  appId: 'com.puzzmo.gamees',
  appName: 'Puzzmo',
  webDir: 'dist',
  backgroundColor: '#0b1a3a',
  ...(devServer ? { server: { url: devServer, cleartext: true } } : {}),
  android: {
    // The game draws edge-to-edge and keeps its HUD inside the safe area itself.
    adjustMarginsForEdgeToEdge: 'disable',
  },
  ios: {
    scrollEnabled: false,
    contentInset: 'never',
  },
  plugins: {
    SplashScreen: {
      // Hidden from JS as soon as the loading screen is drawn.
      launchAutoHide: false,
      launchShowDuration: 0,
      backgroundColor: '#0b1a3a',
      showSpinner: false,
    },
    StatusBar: {
      overlaysWebView: true,
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_puzzmo',
      iconColor: '#FFB020',
    },
  },
}

export default config
