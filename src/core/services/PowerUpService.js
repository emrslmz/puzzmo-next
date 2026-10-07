import { toastService } from './ToastService.js'

class PowerUpService {
  activate(powerUpId, context) {
    if (!context) {
      console.error('PowerUpService: Context sağlanmadı.')
      return false
    }

    // 't' fonksiyonunu context'ten alıyoruz. Her metodun kendi içinde ihtiyacı olanı alması daha güvenli.
    if (typeof context.t !== 'function') {
      console.error('PowerUpService: \'t\' çeviri fonksiyonu context içinde sağlanmadı.')
      return false
    }

    switch (powerUpId) {
      case 'bomb':
        return this._detonate(context, 3)

      case 'sledgehammer': {
        const limit = context.isAdventure ? 99 : 99
        return this._detonate(context, limit)
      }

      case 'flash':
        return this._flashBoard(context)

      case 'freeze':
        context.duration = context.isAdventure ? 8000 : 10000
        return context.isAdventure ? this._freezeDanger(context) : this._freezeSpawn(context)

      case 'pink_ixr':
        // playerStore'un da context ile gelip gelmediğini kontrol edelim.
        if (!context.playerStore) {
          console.error('PowerUpService: \'playerStore\' context içinde sağlanmadı.')
          return false
        }
        return context.isAdventure ? false : this._addLife(context)

      case 'red_ixr':
        return context.isAdventure ? false : this._activateScoreBonus(context, 2, 10000)

      case 'yellow_ixr':
        return context.isAdventure ? false : this._activateScoreBonus(context, 5, 8000)

      default:
        console.warn('Bu güçlendirme henüz tanımlanmadı:', powerUpId)
        return false
    }
  }

  _detonate(context, limit) {
    // Gerekli olan her şeyi context'ten alıyoruz.
    const { cardsRef, handleCorrectMatch, isProcessingRef, t } = context
    if (isProcessingRef.value)
      return false

    const pairs = this._findPairs(cardsRef.value, limit)
    if (pairs.length === 0) {
      toastService.show(t('no_cards_to_destroy'), 'warning')
      return false
    }

    const cardCount = pairs.length * 2
    toastService.show(`${cardCount} ${t('cards_destroyed')}`, 'info', 2000, 'bomb')

    isProcessingRef.value = true
    let delay = 0
    pairs.forEach((pair) => {
      setTimeout(() => {
        handleCorrectMatch(pair[0], pair[1], 'powerup')
      }, delay)
      delay += 50
    })

    setTimeout(() => {
      if (context.checkBoardAndRespawnIfNeeded) {
        context.checkBoardAndRespawnIfNeeded()
      }
      isProcessingRef.value = false
    }, delay + 1500)
    return true
  }

  _flashBoard(context) {
    const { interactionLockRef, flashBoardAnimation } = context
    if (interactionLockRef.value || !flashBoardAnimation)
      return false
    interactionLockRef.value = true
    flashBoardAnimation(() => {
      interactionLockRef.value = false
    })
    return true
  }

  _freezeDanger(context) {
    const { isDangerFrozenRef, duration } = context
    if (!isDangerFrozenRef || isDangerFrozenRef.value)
      return false
    isDangerFrozenRef.value = true
    setTimeout(() => {
      isDangerFrozenRef.value = false
    }, duration)
    return true
  }

  _freezeSpawn(context) {
    const { isSpawnFrozenRef, duration } = context
    if (!isSpawnFrozenRef || isSpawnFrozenRef.value)
      return false
    isSpawnFrozenRef.value = true
    setTimeout(() => {
      isSpawnFrozenRef.value = false
    }, duration)
    return true
  }

  _addLife(context) {
    // playerStore ve t'yi context'ten alıyoruz.
    const { playerStore, t } = context
    if (playerStore.endlessRuntime.lives >= playerStore.endlessRuntime.maxLives) {
      toastService.show(t('lives_full'), 'warning', 2500)
      return false
    }
    playerStore.endlessRuntime.lives++
    toastService.show(t('life_added'), 'success', 2500, 'heart')
    return true
  }

  _activateScoreBonus(context, multiplier, duration) {
    const { scoreMultiplierRef } = context
    if (scoreMultiplierRef.value > 1) {
      return false
    }
    scoreMultiplierRef.value = multiplier
    setTimeout(() => {
      scoreMultiplierRef.value = 1
    }, duration)
    return true
  }

  _findPairs(allCards, limit) {
    const unmatched = allCards.filter(c => !c.isMatched)
    const typeGroups = unmatched.reduce((acc, card) => {
      acc[card.type] = acc[card.type] || []
      acc[card.type].push(card)
      return acc
    }, {})
    const pairs = []
    const availableTypes = Object.keys(typeGroups).filter(type => typeGroups[type].length >= 2)
    availableTypes.sort(() => 0.5 - Math.random())
    for (const type of availableTypes) {
      if (pairs.length >= limit)
        break
      const group = typeGroups[type]
      for (let i = 0; i < Math.floor(group.length / 2); i++) {
        if (pairs.length >= limit)
          break
        pairs.push([group[i * 2], group[i * 2 + 1]])
      }
    }
    return pairs
  }
}

export const powerUpService = new PowerUpService()
