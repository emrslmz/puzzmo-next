import { usePlayerStore } from '@/store/playerStore'

class SoundService {
  constructor() {
    this.audioContext = null
    this.sounds = {}
    this.music = {}
    this.soundManifest = {}
    this.musicManifest = {}
    this.loadingAssets = new Map()

    this.currentMusicId = null
    this.lastPlayedMusicId = null
    this.musicSource = null
    this.musicGainNode = null
    this.isInitialized = false
  }

  async init() {
    if (this.audioContext) {
      if (this.audioContext.state === 'suspended') {
        try {
          await this.audioContext.resume()
        }
        catch (e) {
          console.warn('AudioContext resume failed:', e)
        }
      }
      this.isInitialized = true
      return
    }

    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)()
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = null
        navigator.mediaSession.playbackState = 'none'
      }
      this.isInitialized = true
    }
    catch (e) {
      console.error('Web Audio API başlatılamadı:', e)
    }
  }

  setMusicManifest(musicList = []) {
    this.musicManifest = musicList.reduce((acc, item) => {
      acc[item.id] = item
      return acc
    }, {})
  }

  setSoundManifest(soundList = []) {
    this.soundManifest = soundList.reduce((acc, item) => {
      acc[item.id] = item
      return acc
    }, {})
  }

  async loadBuffer(asset) {
    if (!this.audioContext)
      return null

    try {
      const response = await fetch(asset.path)
      const arrayBuffer = await response.arrayBuffer()
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer)
      return audioBuffer
    }
    catch (e) {
      console.error(`'${asset.path}' yüklenirken hata oluştu:`, e)
      return null
    }
  }

  async ensureLoaded(type, id) {
    if (!id)
      return null

    const cache = type === 'music' ? this.music : this.sounds
    const manifest = type === 'music' ? this.musicManifest : this.soundManifest
    if (cache[id])
      return cache[id]

    const asset = manifest[id]
    if (!asset)
      return null

    const loadKey = `${type}:${id}`
    if (this.loadingAssets.has(loadKey))
      return this.loadingAssets.get(loadKey)

    const loadPromise = this.loadBuffer(asset)
      .then((buffer) => {
        if (buffer)
          cache[id] = buffer
        this.loadingAssets.delete(loadKey)
        return buffer
      })
      .catch((error) => {
        this.loadingAssets.delete(loadKey)
        throw error
      })

    this.loadingAssets.set(loadKey, loadPromise)
    return loadPromise
  }

  async preload(soundList = [], musicList = []) {
    await this.init()
    if (!this.audioContext)
      return

    this.setSoundManifest(soundList)
    this.setMusicManifest(musicList)

    for (const sound of soundList) {
      const buffer = await this.loadBuffer(sound)
      if (buffer)
        this.sounds[sound.id] = buffer
    }
  }

  async preloadMusic(id) {
    await this.init()
    if (!this.audioContext)
      return null
    return this.ensureLoaded('music', id)
  }

  playEffect(id) {
    const playerStore = usePlayerStore()
    if (!playerStore.settings.soundEnabled || !this.audioContext)
      return

    const soundBuffer = this.sounds[id]
    if (!soundBuffer) {
      this.ensureLoaded('sound', id)
      return
    }

    try {
      const source = this.audioContext.createBufferSource()
      source.buffer = soundBuffer
      source.connect(this.audioContext.destination)
      source.start(0)
    }
    catch (e) {
      console.error(`'${id}' ses efekti oynatılırken hata:`, e)
    }
  }

  playMusic(id) {
    const playerStore = usePlayerStore()
    this.lastPlayedMusicId = id

    if (!playerStore.settings.soundEnabled || !playerStore.settings.musicEnabled || !this.audioContext)
      return

    if (this.currentMusicId === id && this.musicSource)
      return

    this.stopMusic()

    const musicBuffer = this.music[id]
    if (musicBuffer) {
      this.startMusicBuffer(id, musicBuffer)
      return
    }

    this.preloadMusic(id).then((buffer) => {
      if (!buffer)
        return
      const currentStore = usePlayerStore()
      if (!currentStore.settings.soundEnabled || !currentStore.settings.musicEnabled)
        return
      if (this.lastPlayedMusicId !== id)
        return
      this.startMusicBuffer(id, buffer)
    })
  }

  startMusicBuffer(id, musicBuffer) {
    try {
      this.stopMusic()

      this.musicSource = this.audioContext.createBufferSource()
      this.musicSource.buffer = musicBuffer
      this.musicSource.loop = true

      this.musicGainNode = this.audioContext.createGain()
      this.musicGainNode.gain.value = 0.7

      this.musicSource.connect(this.musicGainNode)
      this.musicGainNode.connect(this.audioContext.destination)

      this.musicSource.start(0)
      this.currentMusicId = id
    }
    catch (e) {
      console.error(`'${id}' müziği oynatılırken hata:`, e)
    }
  }

  stopMusic() {
    if (this.musicSource) {
      try {
        this.musicSource.stop(0)
        this.musicSource.disconnect()
      }
      catch {
        // kaynak zaten durmuş olabilir
      }
      this.musicSource = null
      this.musicGainNode = null
      this.currentMusicId = null
    }
  }

  toggleMasterSound(enabled) {
    const playerStore = usePlayerStore()
    if (enabled && playerStore.settings.musicEnabled) {
      if (this.lastPlayedMusicId) {
        this.playMusic(this.lastPlayedMusicId)
      }
    }
    else {
      this.stopMusic()
    }
  }

  toggleMusicSetting(enabled) {
    const playerStore = usePlayerStore()
    if (playerStore.settings.soundEnabled) {
      if (enabled) {
        if (this.lastPlayedMusicId) {
          this.playMusic(this.lastPlayedMusicId)
        }
      }
      else {
        this.stopMusic()
      }
    }
  }
}

export const soundService = new SoundService()
