import type {CapacitorConfig} from "@capacitor/cli";

const server = {
    url: "http://192.168.1.144:5758/",
    cleartext: true,
};

const config: CapacitorConfig = {
    appId: "com.puzzmo.gamees",
    appName: "Puzzmo",
    webDir: "dist",
    ios: {
        scrollEnabled: false,
    },
    // Eklentilerin genel yapılandırmaları
    plugins: {
        SplashScreen: {
            launchShowDuration: 0,
        },
        Orientation: {
            lock: 'landscape',
        },
        // 1. Ekranı yatayda kilitleme
        ScreenOrientation: {
            orientation: 'landscape',
        },
        // iOS'a özel yapılandırmalar
        ios: {
            // Uygulamanın sadece yatay modları desteklemesini sağlar
            contentInset: 'never',
            // === ÇOK ÖNEMLİ (NSAllowsArbitraryLoads) ===
            // Bu ayar, geliştirme sırasında HTTPS olmayan kaynaklardan (örn: localhost)
            // ses dosyaları gibi medya içeriklerini yüklemenize izin verir.
            // DİKKAT: App Store'a gönderirken bunu 'false' yapmanız veya belirli domainlere
            // izin vermeniz gerekebilir, aksi takdirde uygulamanız reddedilebilir.
            NSAppTransportSecurity: {
                NSAllowsArbitraryLoads: true,
                NSAllowsArbitraryLoadsForMedia: true,
                NSAllowsArbitraryLoadsInWebContent: true
            }
        },

        // Android'e özel yapılandırmalar
        android: {
            // Android'de tam ekran deneyimi için en önemli adımdır.
            // Bu ayar, uygulamanın temasını Action Bar (üst başlık çubuğu) olmayan
            // bir tema olarak ayarlar. Bunu `android/app/src/main/res/values/styles.xml`
            // dosyasından da kontrol etmelisin. Tema `Theme.AppCompat.Light.NoActionBar` olmalı.
            buildOptions: {
                keystorePath: undefined, // Yayınlama için doldurulacak
                keystoreAlias: undefined,
            }
        },
        // 3. Durum çubuğunu (Status Bar) web içeriğinin üzerine bindir
        // Bu, onu daha sonra kod ile gizlememizi sağlar
        StatusBar: {
            style: 'dark', // 'light' veya 'dark' olabilir
            // visible: false, // Başlangıçta gizli - not supported in config
            overlaysWebView: true,  // En önemli ayar!
        },
        // 4. Navigasyon çubuğunu (Android'deki sanal tuşlar) gizle
        // NavigationBar: {
        //     visible: false,
        // },
        LocalNotifications: {
            // Android'de bildirim çubuğunda görünecek küçük ikon.
            // Bu dosyayı android/app/src/main/res/drawable klasörüne koymalısın.
            // Genellikle beyaz ve transparan bir PNG olur.
            smallIcon: "ic_stat_icon_name",
            // İkonun arkaplan rengi
            iconColor: "#488AFF",
        }
    },
    // server,
};

export default config;
