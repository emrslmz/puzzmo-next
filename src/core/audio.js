import { state } from './state'

const MUSIC = {
  menu: 'assets/audio/game_theme1.mp3',
  endless: 'assets/audio/game_theme2.mp3',
  adventure: 'assets/audio/carton_game_song_2.mp3',
}
const MUSIC_VOLUME = 0.45
const SFX_VOLUME = 0.9

/**
 * Sound effects go through Phaser's WebAudio sound manager (decoded once,
 * zero-latency). Music is streamed with an <audio> element routed through a
 * GainNode, so long tracks never get fully decoded into memory and volume
 * fades work on iOS too.
 */
class AudioService {
  constructor() {
    this.game = null
    this.ctx = null
    this.music = null
    this.musicGain = null
    this.musicKey = null
    this.wantedMusic = null
    this.ducked = false
    this.suspended = false
    this._unlockBound = () => this._unlock()
    this._noiseBuffer = null
  }

  init(game) {
    this.game = game
    this.ctx = game.sound.context ?? null
    document.addEventListener('pointerdown', this._unlockBound, { capture: true })
    document.addEventListener('touchend', this._unlockBound, { capture: true })
  }

  get soundOn() { return state.settings.soundEnabled }
  get musicOn() { return state.settings.soundEnabled && state.settings.musicEnabled }

  _unlock() {
    if (this.ctx?.state === 'suspended' && !this.suspended)
      this.ctx.resume().catch(() => {})
    if (this.wantedMusic && this.music?.paused && this.musicOn && !this.suspended)
      this.music.play().catch(() => {})
  }

  // --- Effects ----------------------------------------------------------------
  play(key, { volume = 1, rate = 1, detune = 0 } = {}) {
    if (!this.soundOn || !this.game || this.suspended)
      return
    try {
      if (this.game.cache.audio.exists(key))
        this.game.sound.play(key, { volume: volume * SFX_VOLUME, rate, detune })
    }
    catch (error) {
      console.warn('[audio] play failed', key, error)
    }
  }

  click() {
    this.play('click_effect_2', { volume: 0.8 })
  }

  /** Procedural water splash: band-passed noise burst. */
  splash(intensity = 1) {
    if (!this.soundOn || !this.ctx || this.ctx.state !== 'running')
      return
    const ctx = this.ctx
    const now = ctx.currentTime
    const src = ctx.createBufferSource()
    src.buffer = this._getNoise()
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.setValueAtTime(900 + Math.random() * 500, now)
    filter.frequency.exponentialRampToValueAtTime(260, now + 0.45)
    filter.Q.value = 0.8
    const gain = ctx.createGain()
    const peak = 0.32 * Math.min(1.4, intensity)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(peak, now + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55)
    src.connect(filter).connect(gain).connect(ctx.destination)
    src.start(now, Math.random() * 0.5)
    src.stop(now + 0.6)
    // A couple of droplets after the main splash.
    for (let i = 0; i < 2; i++)
      this.bubble(0.15 + Math.random() * 0.25, 0.12 + i * 0.09)
  }

  /** Procedural bubble "bloop": a short rising sine. */
  bubble(volume = 0.25, delay = 0) {
    if (!this.soundOn || !this.ctx || this.ctx.state !== 'running')
      return
    const ctx = this.ctx
    const t0 = ctx.currentTime + delay
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const base = 380 + Math.random() * 500
    osc.type = 'sine'
    osc.frequency.setValueAtTime(base, t0)
    osc.frequency.exponentialRampToValueAtTime(base * 2.6, t0 + 0.09)
    gain.gain.setValueAtTime(0.0001, t0)
    gain.gain.exponentialRampToValueAtTime(volume * 0.5, t0 + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.12)
    osc.connect(gain).connect(ctx.destination)
    osc.start(t0)
    osc.stop(t0 + 0.14)
  }

  _getNoise() {
    if (!this._noiseBuffer) {
      const length = this.ctx.sampleRate
      const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate)
      const data = buffer.getChannelData(0)
      let last = 0
      for (let i = 0; i < length; i++) {
        // Slightly brown noise sounds more like water than white noise.
        last = (last + 0.06 * (Math.random() * 2 - 1)) / 1.06
        data[i] = last * 3.2
      }
      this._noiseBuffer = buffer
    }
    return this._noiseBuffer
  }

  // --- Music --------------------------------------------------------------------
  playMusic(key) {
    this.wantedMusic = key
    if (!this.musicOn || this.suspended)
      return this._stopMusicElement()
    if (this.musicKey === key && this.music && !this.music.paused)
      return
    this._startMusic(key)
  }

  _startMusic(key) {
    this._stopMusicElement()
    const el = new Audio(MUSIC[key])
    el.loop = true
    el.preload = 'auto'
    el.setAttribute('playsinline', '')
    this.music = el
    this.musicKey = key

    if (this.ctx) {
      try {
        const source = this.ctx.createMediaElementSource(el)
        this.musicGain = this.ctx.createGain()
        this.musicGain.gain.value = 0
        source.connect(this.musicGain).connect(this.ctx.destination)
      }
      catch {
        this.musicGain = null
      }
    }
    this._setMusicVolume(0, 0)
    el.play().then(() => this._setMusicVolume(this._targetVolume(), 1.2)).catch(() => {
      // Autoplay blocked: retried on the first user gesture (see _unlock).
      this._setMusicVolume(this._targetVolume(), 0.6)
    })
  }

  _targetVolume() {
    return this.ducked ? MUSIC_VOLUME * 0.3 : MUSIC_VOLUME
  }

  _setMusicVolume(volume, seconds) {
    if (this.musicGain && this.ctx) {
      const g = this.musicGain.gain
      const now = this.ctx.currentTime
      g.cancelScheduledValues(now)
      g.setValueAtTime(g.value, now)
      g.linearRampToValueAtTime(volume, now + Math.max(0.01, seconds))
    }
    else if (this.music) {
      this.music.volume = volume
    }
  }

  _stopMusicElement() {
    if (!this.music)
      return
    const el = this.music
    const gain = this.musicGain
    this.music = null
    this.musicGain = null
    this.musicKey = null
    if (gain && this.ctx) {
      const now = this.ctx.currentTime
      gain.gain.cancelScheduledValues(now)
      gain.gain.setValueAtTime(gain.gain.value, now)
      gain.gain.linearRampToValueAtTime(0, now + 0.35)
      setTimeout(() => {
        el.pause()
        el.removeAttribute('src')
        el.load()
        gain.disconnect()
      }, 400)
    }
    else {
      el.pause()
      el.removeAttribute('src')
      el.load()
    }
  }

  /** Lower the music while something else (ad, modal) has focus. */
  duck(on) {
    this.ducked = on
    if (this.music)
      this._setMusicVolume(this._targetVolume(), 0.4)
  }

  /** Called when settings change. */
  refresh() {
    if (this.musicOn && this.wantedMusic)
      this.playMusic(this.wantedMusic)
    else
      this._stopMusicElement()
  }

  /** App went to background (or an ad is fullscreen). */
  suspend() {
    this.suspended = true
    this.music?.pause()
    this.ctx?.suspend?.().catch(() => {})
  }

  resume() {
    this.suspended = false
    this.ctx?.resume?.().catch(() => {})
    if (this.musicOn && this.wantedMusic) {
      if (this.music)
        this.music.play().catch(() => {})
      else
        this.playMusic(this.wantedMusic)
    }
  }
}

export const audio = new AudioService()
