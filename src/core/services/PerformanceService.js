class PerformanceService {
  constructor() {
    this.cachedProfile = null
  }

  getDeviceMemory() {
    return Number(navigator?.deviceMemory || 0)
  }

  getHardwareConcurrency() {
    return Number(navigator?.hardwareConcurrency || 0)
  }

  detectProfile() {
    const memory = this.getDeviceMemory()
    const cores = this.getHardwareConcurrency()

    if (memory >= 6 && cores >= 6)
      return 'high'
    if (memory >= 4 && cores >= 4)
      return 'medium'
    return 'low'
  }

  getProfile(mode = 'auto') {
    if (mode && mode !== 'auto')
      return mode

    if (!this.cachedProfile)
      this.cachedProfile = this.detectProfile()

    return this.cachedProfile
  }

  refreshProfile() {
    this.cachedProfile = this.detectProfile()
    return this.cachedProfile
  }

  isLowEnd(mode = 'auto') {
    return this.getProfile(mode) === 'low'
  }

  getConfig(mode = 'auto') {
    const profile = this.getProfile(mode)

    if (profile === 'high') {
      return {
        profile,
        particleMultiplier: 1,
        matchAnimationSpeed: 1,
        flipDuration: 0.3,
        selectionScale: 1.12,
        randomFlipEnabled: true,
        randomFlipInitialMin: 3000,
        randomFlipInitialMax: 5000,
        randomFlipMin: 5000,
        randomFlipMax: 8000,
        showBackgroundFlash: true,
        showSirenEffects: true,
        showProgressShine: true,
        spawnAnimationMode: 'full',
      }
    }

    if (profile === 'medium') {
      return {
        profile,
        particleMultiplier: 0.5,
        matchAnimationSpeed: 0.85,
        flipDuration: 0.24,
        selectionScale: 1.08,
        randomFlipEnabled: true,
        randomFlipInitialMin: 5000,
        randomFlipInitialMax: 8000,
        randomFlipMin: 9000,
        randomFlipMax: 13000,
        showBackgroundFlash: true,
        showSirenEffects: true,
        showProgressShine: false,
        spawnAnimationMode: 'medium',
      }
    }

    return {
      profile,
      particleMultiplier: 0,
      matchAnimationSpeed: 0.7,
      flipDuration: 0.18,
      selectionScale: 1.04,
      randomFlipEnabled: false,
      randomFlipInitialMin: 0,
      randomFlipInitialMax: 0,
      randomFlipMin: 0,
      randomFlipMax: 0,
      showBackgroundFlash: false,
      showSirenEffects: false,
      showProgressShine: false,
      spawnAnimationMode: 'minimal',
    }
  }
}

export const performanceService = new PerformanceService()
