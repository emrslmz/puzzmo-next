# Puzzmo

Yatay (landscape) oynanan, Phaser 4 ile yazılmış hafıza/eşleştirme oyunu.
Capacitor 7 ile iOS ve Android'e paketlenir; aynı kod tarayıcıda da çalışır.

## Hızlı başlangıç

```bash
npm install
npm run dev          # http://localhost:5757
npm run build        # dist/ (Capacitor webDir)
npm run lint
```

Node 20.19+ gerekir (`.nvmrc` → 22).

## Cihaza gönderme

```bash
npm run deploy:android   # build + cap sync android + Android Studio
npm run deploy:ios       # build + cap sync ios + Xcode
```

Cihazda canlı yenileme için: `CAP_SERVER_URL=http://<bilgisayar-ip>:5757 npx cap run android`

## Asset hattı

Kaynak görseller/sesler `assets-src/` altında durur ve uygulamaya **girmez**.
`npm run assets` (sharp + ffmpeg) bunlardan `public/assets/` içine
optimize edilmiş dosyaları üretir:

- küçük görseller → WebP doku atlasları (`ui`, `art`, `islands`, `items`),
  kart SVG'leri derleme anında rasterleştirilir,
- arka planlar → WebP, sesler → MP3 (müzik 128 kbps, efektler mono).

Yeni bir görsel eklemek için dosyayı `assets-src/images/...` altına koyup
`npm run assets` çalıştırın; atlas anahtarları dosya adından gelir
(ör. `icons/coin.png` → `ui` atlasında `icon_coin`).

## Mimari

```
src/
  main.js              boot: kayıt yükleme, fontlar, DPR'a duyarlı canvas
  core/                platformdan bağımsız servisler
    state.js           oyuncu kaydı ('puzzmo-player', eski sürümle uyumlu)
    viewport.js        tasarım alanı, render ölçeği, güvenli alanlar
    audio.js           efektler (WebAudio) + akışlı müzik + prosedürel su sesleri
    ads.js             AdMob: UMP onayı, ATT, geçiş + ödüllü reklam
    iap.js             RevenueCat: paketler, satın alma, geri yükleme
    haptics.js, notifications.js, platform.js, i18n.js, storage.js
  data/catalog.js      kartlar, adalar, kaplamalar, güçlendirmeler, IAP paketleri
  game/
    Water.js           yükselen su: shader + yay simülasyonu + kabarcık/damla
    shaders.js         su ve okyanus GLSL kodları
    Card.js            kart nesnesi (çevirme, seçim, eşleşme animasyonları)
    MemoryGameScene.js iki modun ortak oyun mantığı ve güçlendirmeler
  scenes/              Preload, Home, Map, Adventure, Endless, Shop, Store,
                       Settings, Stats, Overlay (modal/toast katmanı)
  ui/                  buton/panel/doku üreticileri, efektler, diyaloglar
```

### Ekran uyumu

Her sahne 1280×720 "tasarım birimi" üzerinde kurulur; kısa kenar her zaman
sığar, geniş (20:9, 21:9) ya da uzun (4:3, 16:10) ekranlarda fazladan alan
gösterilir (letterbox yok). Canvas, cihaz piksel oranında ama bir piksel
bütçesiyle sınırlı çözünürlükte çizilir; HUD `env(safe-area-inset-*)`
değerlerine göre çentiklerden uzak tutulur. Telefonda dikey tutulursa
"cihazı çevirin" ekranı gösterilir; native tarafta yön yatay kilitlidir.

### Su efekti

Macera modunda sol panel, ada arka planını ve yükselen suyu tek bir fragment
shader'da çizer: kırılma (normal map), derinliğe göre renk emilimi, kostik
ışıklar, ışık huzmeleri, köpük çizgisi ve donma (buz) modu. Yüzey 32 yaylı
bir zincirle simüle edilir; eşleşme ve hatalar suya dalga/sıçrama verir,
ördek yüzeyde yüzer, balıklar su altında kalır. Sonsuz modda su, tahtanın
doluluğuyla birlikte çayırın üzerinde yükselir.

### Monetizasyon

- **Ödüllü reklam**: Ana menüde "İzle Kazan" (günde 5), oyun bitince bir kez
  "Devam Et". Ödül yalnızca reklam gerçekten izlenince verilir.
- **Geçiş reklamı**: ana menü gezintisinde her 5. tıklamada ve her 2. oyun
  sonunda; en az 75 sn aralıkla. "Reklamları Engelle" satın alındıysa hiç.
- **IAP**: RevenueCat teklifleri `revenue.puzzmo.{block_ads,1k,5k,10k}`.
  "Reklamları engelle" her açılışta ve "Satın alımları geri yükle" ile
  yeniden doğrulanır.

Web'de reklam ve satın almalar simüle edilir. Test reklamları için
`src/core/ads.js` içinde `USE_TEST_ADS = true` yapın.
