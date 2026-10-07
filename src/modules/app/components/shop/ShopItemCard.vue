<script setup>
import ClashButton from '@/components/ClashButton.vue'
import { alertService } from '@/core/services/AlertService.js'
import { soundService } from '@/core/services/SoundService.js'
import { toastService } from '@/core/services/ToastService.js'
import { useShopStore } from '@/store/shopStore'
import { usePlayerStore } from '@/store/playerStore'
import { computed, defineProps, h, ref, markRaw } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  item: { type: Object, required: true },
  index: { type: Number, required: true },
})

const { t } = useI18n()

const shopStore = useShopStore()
const playerStore = usePlayerStore()

const itemType = computed(() => (props.item.description ? 'powerup' : 'skin'))

// Buton durumu basitleştirildi. Artık miktar veya toplam fiyatla ilgilenmiyor.
const buttonState = computed(() => ({
  variant: props.item.isOwned ? 'green' : props.item.canBuy ? 'yellow' : 'red',
  disabled: (props.item.isOwned && props.item.isSelected),
  text: props.item.isOwned
    ? props.item.isSelected
      ? t('selected')
      : t('select')
    : props.item.price.toString(),
  action: props.item.isOwned ? 'select' : 'purchase',
}))

// Kart başlığı basitleştirildi.
const cardHeaderStyle = computed(() => {
  if (props.item.isOwned) {
    return { background: 'linear-gradient(135deg, #28a745, #218838)' }
  }
  if (props.item.canBuy) {
    return itemType.value === 'skin'
      ? { background: 'linear-gradient(135deg, #4e54c8, #8f94fb)' }
      : { background: 'linear-gradient(135deg, #ff9a00, #ffc928)' }
  }
  return { background: 'linear-gradient(135deg, #6c757d, #495057)' }
})

// Resim stili (Değişiklik yok)
const imageStyle = computed(() => ({
  transform: itemType.value === 'skin' ? `scale(1.5)` : 'scale(1.2)',
  filter: props.item.canBuy || props.item.isOwned ? 'none' : 'grayscale(80%)',
}))

const showQuantity = computed(() => itemType.value === 'powerup')

// GÜNCELLENDİ: Satın Alma Onay Component'i, miktar seçici butonları coin göstergesinin yanında olacak şekilde güncellendi.
const PurchaseConfirmationComponent = markRaw({
  props: ['item', 'userCoins', 'onUpdateQuantity'],
  setup(props) {
    const { t } = useI18n()
    const quantity = ref(1)
    const totalPrice = computed(() => props.item.price * quantity.value)
    const canAffordNext = computed(() => props.userCoins >= props.item.price * (quantity.value + 1))

    function increaseQuantity() {
      try {
        if (canAffordNext.value) {
          quantity.value++
          props.onUpdateQuantity(quantity.value)
          soundService.playEffect('click')
        }
        else {
          toastService.show(t('not_enough_balance'), 'error')
        }
      } catch (error) {
        console.error('Error in increaseQuantity:', error)
        toastService.show('An error occurred', 'error')
      }
    }

    function decreaseQuantity() {
      try {
        if (quantity.value > 1) {
          quantity.value--
          props.onUpdateQuantity(quantity.value)
          soundService.playEffect('click')
        }
      } catch (error) {
        console.error('Error in decreaseQuantity:', error)
        toastService.show('An error occurred', 'error')
      }
    }

    // İlk miktar değerini parent'a bildir
    try {
      props.onUpdateQuantity(quantity.value)
    } catch (error) {
      console.error('Error in initial quantity update:', error)
    }

    // Vue'nun 'h' fonksiyonu ile component'in arayüzü oluşturuluyor
    return () => h('div', { class: 'flex flex-col items-center gap-3 text-gray-800 p-2 w-full' }, [
      h('img', { src: props.item.image, alt: props.item.name, class: 'w-16 h-16 scale-[1.5] object-contain drop-shadow-lg' }),
      h('p', { class: 'text-xl font-bold' }, props.item.name),
      props.item.description ? h('p', { class: 'text-xs text-gray-600 max-w-xs text-center px-4 ' }, props.item.description) : null,

      // Miktar Seçici ve Toplam Fiyat için Kapsayıcı
      h('div', { class: 'flex justify-center items-center w-full max-w-xs' }, [
        // Sol Buton (-)
        h('button', {
          onClick: decreaseQuantity,
          disabled: quantity.value <= 1,
          class: 'w-10 h-10 rounded-full bg-gray-200 text-gray-800 text-2xl font-bold flex items-center justify-center disabled:opacity-50 transition-opacity flex-shrink-0',
        }, '-'),

        // Orta Kısım (Toplam Fiyat ve Miktar)
        h('div', { class: 'flex flex-col items-center justify-center mx-4 flex-grow' }, [
          h('p', { class: 'text-sm font-semibold text-gray-700 -mb-1' }, `${t('quantity')}: ${quantity.value}`),
          h('div', { class: 'flex items-center gap-2 px-4 py-1 bg-amber-300 rounded-full shadow-inner mt-1' }, [
            h('img', { src: '/images/icons/coin.png', class: 'w-5 h-5' }),
            h('span', { class: 'text-xl font-bold text-amber-900' }, totalPrice.value),
          ]),
        ]),

        // Sağ Buton (+)
        h('button', {
          onClick: increaseQuantity,
          disabled: !canAffordNext.value,
          class: 'w-10 h-10 rounded-full bg-gray-200 text-gray-800 text-2xl font-bold flex items-center justify-center disabled:opacity-50 transition-opacity flex-shrink-0',
        }, '+'),
      ]),
    ].filter(Boolean)) // null olan elemanları render etme
  },
})

// Buton tıklama mantığı (Değişiklik yok)
async function handleAction() {
  try {
    const action = buttonState.value.action

    if (action === 'select' && itemType.value === 'skin') {
      const result = shopStore.selectSkin(props.item.id)
      if (result.success) {
        const message = result.data ? t(result.messageKey, result.data) : t(result.messageKey)
        toastService.show(message, 'success')
      } else {
        const message = result.data ? t(result.messageKey, result.data) : t(result.messageKey)
        toastService.show(message, 'error')
      }
      return
    }

    if (action === 'purchase') {
      if (!props.item.canBuy) {
        await alertService.show({
          title: t('not_enough_balance_title'),
          message: t('not_enough_balance_message'),
          confirmButtonText: t('okay'),
          cancelButtonText: null,
        })
        return
      }

      // Power-up ise modalda miktar seçtir
      if (itemType.value === 'powerup') {
        let purchaseQuantity = 1

        const confirmed = await alertService.showWithSlot({
          title: t('purchase_confirmation_title'),
          slotComponent: PurchaseConfirmationComponent,
          slotProps: {
            item: props.item,
            userCoins: playerStore.currencies.coins,
            onUpdateQuantity: (newQuantity) => {
              purchaseQuantity = newQuantity
            },
          },
          confirmButtonText: t('purchase'),
          cancelButtonText: t('cancel'),
        })

        if (confirmed) {
          // Modal kapandıktan sonra son bir bakiye kontrolü
          const finalPrice = props.item.price * purchaseQuantity
          if (playerStore.currencies.coins < finalPrice) {
            toastService.show(t('purchase_cancelled'), 'error')
            return
          }

          const result = shopStore.purchaseWithFeedback(itemType.value, props.item.id, purchaseQuantity)
          
          if (result.success) {
            const message = result.data ? t(result.messageKey, result.data) : t(result.messageKey)
            toastService.show(message, 'success')
          } else {
            const message = result.data ? t(result.messageKey, result.data) : t(result.messageKey)
            toastService.show(message, 'error')
          }
        }
      }
      else { // Skin ise direkt satın al (basit onay)
        const confirmed = await alertService.show({
          title: t('purchase_confirmation_title'),
          message: t('purchase_confirmation_message', { name: props.item.name, price: props.item.price }),
          confirmButtonText: t('purchase'),
          cancelButtonText: t('cancel'),
        })

        if (confirmed) {
          const result = shopStore.purchaseWithFeedback(itemType.value, props.item.id, 1)
          
          if (result.success) {
            const message = result.data ? t(result.messageKey, result.data) : t(result.messageKey)
            toastService.show(message, 'success')
          } else {
            const message = result.data ? t(result.messageKey, result.data) : t(result.messageKey)
            toastService.show(message, 'error')
          }
        }
      }
    }
  } catch (error) {
    console.error('Error in handleAction:', error)
    toastService.show('An error occurred during purchase', 'error')
  }
}
</script>

<template>
  <!-- Kartın ana yapısı -->
  <div
    class="w-full h-36 bg-white shadow-lg rounded-2xl flex flex-row items-stretch border-4 overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.02]"
    :class="{
      'border-green-600': item.isOwned,
      'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.5)]': item.isSelected,
      'border-gray-300': !item.isOwned && !item.canBuy,
      'opacity-80 grayscale-[50%]': !item.canBuy && !item.isOwned,
    }"
  >
    <!-- Sol Taraf: Ürün Görseli (Değişiklik yok) -->
    <div
      class="w-1/3 flex items-center justify-center p-2 relative text-white"
      :style="cardHeaderStyle"
    >
      <div class="relative flex items-center justify-center">
        <img
          :src="item.image"
          :alt="`${item.name} Image`"
          class="w-20 h-20 transition-all duration-300 object-contain drop-shadow-lg"
          :style="imageStyle"
        >
        <div
          v-if="item.isSelected"
          class="absolute -top-1 -right-1 w-7 h-7"
        >
          <img src="/images/icons/green_check.png" alt="check" class="w-full h-full scale-[1.7]">
        </div>
        <div
          v-if="showQuantity"
          class="absolute -top-2 -right-2 w-9 h-9 rounded-full bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center text-base font-bold text-white shadow-md border-2 border-white"
        >
          {{ item.quantity }}
        </div>
      </div>
    </div>

    <!-- Sağ Taraf: Bilgi ve Satın Alma Butonu -->
    <div class="w-2/3 flex flex-col justify-between p-3 bg-gray-50">
      <!-- Üst Kısım: İsim ve Açıklama (Değişiklik yok) -->
      <div class="flex-grow">
        <h3 class="text-sm font-bold text-gray-800 truncate-2-lines">
          {{ item.name }}
        </h3>
        <p v-if="item.description" class="text-[10px] text-gray-600 leading-tight mt-1 truncate-2-lines">
          {{ item.description }}
        </p>
      </div>

      <!-- Alt Kısım: Buton Alanı -->
      <div class="flex justify-center items-center w-full">
        <!-- Buton basitleştirildi. Miktar seçici kaldırıldı. -->
        <ClashButton
          size="sm"
          :color="buttonState.variant"
          :disabled="buttonState.disabled"
          :full-width="true"
          @click="handleAction"
        >
          <div class="flex items-center justify-center gap-2 w-full">
            <img
              v-if="buttonState.action === 'purchase'"
              src="/images/icons/coin.png"
              class="w-5 h-5 scale-[1.5]"
              alt="Coin"
            >
            <span class="font-bold text-lg">{{ buttonState.text }}</span>
          </div>
        </ClashButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Metni iki satırla sınırlandırıp sonuna ... ekler */
.truncate-2-lines {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
