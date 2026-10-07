<script>
import { IonContent, IonPage } from '@ionic/vue'
import { useI18n } from 'vue-i18n'

export default {
  name: 'PrivacyPolicy',
  components: { IonPage, IonContent },

  setup() {
    const { t } = useI18n()
    return { t }
  },
}
</script>

<template>
  <IonPage>
    <IonContent :scroll-y="false">
      <div
        class="flex flex-col justify-start items-start overflow-y-auto bg-white h-screen rounded-lg px-20 py-20"
      >
        <h1
          class="flex items-center font-extrabold leading-10 tracking-tight sm:leading-none text-2xl sm:text-5xl md:text-6xl lg:text-5xl"
        >
          <span class="inline md:block dark:text-white text-gray-900">{{ t('privacyPolicy') }}</span>
        </h1>

        <div class="mt-4 text-gray-900 font-bold text-sm">
          <div>
            <p><strong>{{ t('date') }}:</strong> 01.04.2025</p>

            <p>
              {{ t('privacyPolicyText1') }}
            </p>

            <h2>{{ t('privacyPolicyTitle1') }}</h2>
            <p>
              {{ t('privacyPolicyText2') }}
            </p>

            <h2>{{ t('privacyPolicyTitle2') }}</h2>
            <p>
              {{ t('privacyPolicyText3') }}
            </p>

            <h2>{{ t('privacyPolicyTitle3') }}</h2>
            <p>
              {{ t('privacyPolicyText4') }}
            </p>

            <h2>{{ t('privacyPolicyTitle4') }}</h2>
            <p>
              {{ t('privacyPolicyText5') }}
            </p>

            <h2>{{ t('privacyPolicyTitle5') }}</h2>

            <p>
              {{ t('privacyPolicyText6') }}
              <strong>{{ t('email') }}</strong> shorproduction@gmail.com
            </p>

            <p>
              {{ t('privacyPolicyText7') }}
            </p>
          </div>
        </div>
      </div>
    </IonContent>
  </IonPage>
</template>

<style scoped></style>
