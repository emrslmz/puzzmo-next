import { reactive } from 'vue'

class AlertService {
  alert = reactive({
    isVisible: false,
    title: null,
    message: null,
    icon: null, // İkon göstermek için yeni özellik
    image: null,
    confirmButtonText: null,
    cancelButtonText: null,
    onConfirm: () => {},
    onCancel: () => {},
    customContent: null,
    languages: null,
    selectedLanguage: null,
    onLanguageSelect: () => {},
    slotComponent: null,
    slotProps: {},
    templateContent: null,
    templateData: {},
  })

  show(options) {
    return new Promise((resolve) => {
      this.reset()
      Object.assign(this.alert, {
        ...options,
        isVisible: true,
        confirmButtonText: options.confirmButtonText,
        onConfirm: () => {
          this.hide()
          resolve(true)
        },
        onCancel: () => {
          this.hide()
          resolve(false)
        },
      })
    })
  }

  showWithTemplate(options) {
    return new Promise((resolve) => {
      this.reset()
      Object.assign(this.alert, {
        ...options,
        isVisible: true,
        customContent: 'template-content',
        confirmButtonText: options.confirmButtonText,
        onConfirm: () => {
          this.hide()
          resolve(this.alert.templateData.selectedValue || true)
        },
        onCancel: () => {
          this.hide()
          resolve(false)
        },
      })
    })
  }

  showWithSlot(options) {
    return new Promise((resolve) => {
      this.reset()
      Object.assign(this.alert, {
        ...options,
        isVisible: true,
        customContent: 'slot-content',
        confirmButtonText: options.confirmButtonText,
        onConfirm: () => {
          this.hide()
          resolve(this.alert.slotProps.selectedValue || true)
        },
        onCancel: () => {
          this.hide()
          resolve(false)
        },
      })
    })
  }

  showLanguageSelection(options) {
    return new Promise((resolve) => {
      this.reset()
      Object.assign(this.alert, {
        ...options,
        isVisible: true,
        customContent: 'language-selection',
        confirmButtonText: options.confirmButtonText || 'Seç',
        selectedLanguage: options.selectedLanguage,
        onConfirm: () => {
          this.hide()
          resolve(this.alert.selectedLanguage)
        },
        onCancel: () => {
          this.hide()
          resolve(null)
        },
        onLanguageSelect: (langCode) => {
          this.alert.selectedLanguage = langCode
        },
      })
    })
  }

  hide() {
    this.alert.isVisible = false
    // Animasyonların bitmesi için küçük bir gecikme
    setTimeout(() => this.reset(), 300)
  }

  reset() {
    Object.assign(this.alert, {
      title: null,
      message: null,
      icon: null,
      image: null,
      confirmButtonText: null,
      cancelButtonText: null,
      customContent: null,
      languages: null,
      selectedLanguage: null,
      slotComponent: null,
      slotProps: {},
      templateContent: null,
      templateData: {},
      onConfirm: () => {},
      onCancel: () => {},
      onLanguageSelect: () => {},
    })
  }
}

export const alertService = new AlertService()
