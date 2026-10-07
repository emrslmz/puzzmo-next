import { defineStore } from 'pinia'
import { useI18n } from 'vue-i18n'

// Varsayılan state'i dışarıda tanımlayarak referans olarak kullanmayı kolaylaştırıyoruz.
function getDefaultState() {
  return {
    currentMode: null, // 'adventure' | 'endless' | null
    isGameActive: false,
    isPaused: false,

    // === ENDLESS MODE STATE ===
    // Endless mode verileri playerStore'a taşındı

    // === ADVENTURE MODE STATIC DATA ===
    // Ada bilgileri static olarak gameStore'da kalacak, unlock durumu ve progress playerStore'da
    adventure: {
      // Ada tanımları - static data (isimler computed'da çevrilecek)
      islands: [
        {
          id: 'village_island',
          nameKey: 'village_island_name',
          theme: 'village',
          image: '/images/island/base_island.png',
          position: { x: 0, y: 0 },
          purchaseCost: 0,
        },
        {
          id: 'town_center_island',
          nameKey: 'town_center_island_name',
          theme: 'town_center',
          image: '/images/island/town_island.png',
          position: { x: 1, y: 0 },
          purchaseCost: 0,
        },
        {
          id: 'hut_island',
          nameKey: 'hut_island_name',
          theme: 'hut',
          image: '/images/island/hut_island.png',
          position: { x: 0, y: 1 },
          purchaseCost: 3000,
        },
        {
          id: 'dock_island',
          nameKey: 'dock_island_name',
          theme: 'dock',
          image: '/images/island/dock_island.png',
          position: { x: 1, y: 1 },
          purchaseCost: 5000,
        },
        {
          id: 'shop_island',
          nameKey: 'shop_island_name',
          theme: 'shop',
          image: '/images/island/shop_island.png',
          position: { x: 0, y: 2 },
          purchaseCost: 6000,
        },
        {
          id: 'pirate_island',
          nameKey: 'pirate_island_name',
          theme: 'pirate',
          image: '/images/island/pirate_island.png',
          position: { x: 0, y: 2 },
          purchaseCost: 8000,
        },
      ],
    },

    // === KART SİSTEMİ ===
    cards: {
      availableCards: [
        // Hayvanlar
        { id: 'zebra', image: '/images/card_item/zebra.svg', category: 'animals', type: 'zebra' },
        { id: 'unicorn', image: '/images/card_item/unicorn.svg', category: 'animals', type: 'unicorn' },
        { id: 'turtle', image: '/images/card_item/turtle.svg', category: 'animals', type: 'turtle' },
        { id: 'fish', image: '/images/card_item/fish.svg', category: 'animals', type: 'fish' },
        { id: 'camel', image: '/images/card_item/camel.svg', category: 'animals', type: 'camel' },
        { id: 'tiger', image: '/images/card_item/tiger.svg', category: 'animals', type: 'tiger' },
        { id: 'whale', image: '/images/card_item/whale.svg', category: 'animals', type: 'whale' },
        { id: 'cat_heart', image: '/images/card_item/cat_heart.svg', category: 'animals', type: 'cat_heart' },
        { id: 'snail', image: '/images/card_item/snail.svg', category: 'animals', type: 'snail' },
        { id: 'ram', image: '/images/card_item/ram.svg', category: 'animals', type: 'ram' },
        { id: 'rabbit', image: '/images/card_item/rabbit.svg', category: 'animals', type: 'rabbit' },
        { id: 'polar_bear', image: '/images/card_item/polar_bear.svg', category: 'animals', type: 'polar_bear' },
        { id: 'angry_cat', image: '/images/card_item/angry_cat.svg', category: 'animals', type: 'angry_cat' },
        { id: 'penguin', image: '/images/card_item/Penguin.svg', category: 'animals', type: 'penguin' },
        { id: 'peacock', image: '/images/card_item/Peacock.svg', category: 'animals', type: 'peacock' },
        { id: 'parrot', image: '/images/card_item/parrot.svg', category: 'animals', type: 'parrot' },
        { id: 'fox', image: '/images/card_item/fox.svg', category: 'animals', type: 'fox' },
        { id: 'baby_chick', image: '/images/card_item/baby_chick.svg', category: 'animals', type: 'baby_chick' },
        { id: 'duck', image: '/images/card_item/duck.svg', category: 'animals', type: 'duck' },
        { id: 'dog_face', image: '/images/card_item/dog_Face.svg', category: 'animals', type: 'dog_face' },
        { id: 'sad_cat', image: '/images/card_item/sad_Cat.svg', category: 'animals', type: 'sad_cat' },
        { id: 'cow_face', image: '/images/card_item/cow_face.svg', category: 'animals', type: 'cow_face' },
        { id: 'cow', image: '/images/card_item/cow.svg', category: 'animals', type: 'cow' },
        { id: 'bear', image: '/images/card_item/bear.svg', category: 'animals', type: 'bear' },
        { id: 'bird_yellow', image: '/images/card_item/birdyellow.svg', category: 'animals', type: 'bird_yellow' },
        { id: 'trex', image: '/images/card_item/trex.svg', category: 'animals', type: 'trex' },
        // Yiyecekler
        { id: 'watermelon', image: '/images/card_item/watermelon.svg', category: 'food', type: 'watermelon' },
        { id: 'apple', image: '/images/card_item/apple.svg', category: 'food', type: 'apple' },
        { id: 'banana', image: '/images/card_item/banana.svg', category: 'food', type: 'banana' },
        { id: 'strawberry', image: '/images/card_item/Strawberry.svg', category: 'food', type: 'strawberry' },
        { id: 'tangerine', image: '/images/card_item/Tangerine.svg', category: 'food', type: 'tangerine' },
        { id: 'pineapple', image: '/images/card_item/Pineapple.svg', category: 'food', type: 'pineapple' },
        { id: 'pizza', image: '/images/card_item/pizza.svg', category: 'food', type: 'pizza' },
        { id: 'hot_dog', image: '/images/card_item/hot_dog.svg', category: 'food', type: 'hot_dog' },
        { id: 'grapes', image: '/images/card_item/grapes.svg', category: 'food', type: 'grapes' },
        {
          id: 'french_fries',
          image: '/images/card_item/French_fries.svg',
          category: 'food',
          type: 'french_fries',
        },
        { id: 'eggplant', image: '/images/card_item/Eggplant.svg', category: 'food', type: 'eggplant' },
        { id: 'egg', image: '/images/card_item/egg.svg', category: 'food', type: 'egg' },
        { id: 'meat', image: '/images/card_item/meat.svg', category: 'food', type: 'meat' },
        { id: 'cheese', image: '/images/card_item/Cheese.svg', category: 'food', type: 'cheese' },
        { id: 'cherries', image: '/images/card_item/Cherries.svg', category: 'food', type: 'cherries' },
        { id: 'carrot', image: '/images/card_item/carrot.svg', category: 'food', type: 'carrot' },
        { id: 'burrito', image: '/images/card_item/Burrito.svg', category: 'food', type: 'burrito' },
        { id: 'beverage', image: '/images/card_item/Beverage.svg', category: 'food', type: 'beverage' },
        { id: 'candy', image: '/images/card_item/candy.svg', category: 'food', type: 'candy' },
        { id: 'popcorn', image: '/images/card_item/popcorn.svg', category: 'food', type: 'popcorn' },
        { id: 'shortcake', image: '/images/card_item/shortcake.svg', category: 'food', type: 'shortcake' },
        {
          id: 'tropical_drink',
          image: '/images/card_item/tropical_drink.svg',
          category: 'food',
          type: 'tropical_drink',
        },
        { id: 'tomato', image: '/images/card_item/tomato.svg', category: 'food', type: 'tomato' },
        { id: 'mango', image: '/images/card_item/mango.svg', category: 'food', type: 'mango' },

        // Nesneler
        { id: 'gift', image: '/images/card_item/gift.svg', category: 'objects', type: 'gift' },
        { id: 'sun', image: '/images/card_item/sun.svg', category: 'objects', type: 'sun' },
        { id: 'rainbow', image: '/images/card_item/rainbow.svg', category: 'objects', type: 'rainbow' },
        { id: 'helicopter', image: '/images/card_item/helicopter.svg', category: 'objects', type: 'helicopter' },
        { id: 'racing_car', image: '/images/card_item/racing_Car.svg', category: 'objects', type: 'racing_car' },
        {
          id: 'fire_engine',
          image: '/images/card_item/fire_engine.svg',
          category: 'objects',
          type: 'fire_engine',
        },
        { id: 'ambulance', image: '/images/card_item/ambulance.svg', category: 'objects', type: 'ambulance' },
        { id: 'automobile', image: '/images/card_item/automobile.svg', category: 'objects', type: 'automobile' },
        { id: 'taxi', image: '/images/card_item/taxi.svg', category: 'objects', type: 'taxi' },
        { id: 'package', image: '/images/card_item/package.svg', category: 'objects', type: 'package' },
        {
          id: 'magnifying_glass',
          image: '/images/card_item/Magnifying_glass.svg',
          category: 'objects',
          type: 'magnifying_glass',
        },
        { id: 'mill', image: '/images/card_item/mill.svg', category: 'objects', type: 'mill' },
        { id: 'eyes', image: '/images/card_item/eyes.svg', category: 'objects', type: 'eyes' },
        {
          id: 'classical_build',
          image: '/images/card_item/Classical_build.svg',
          category: 'objects',
          type: 'classical_build',
        },
        { id: 'camping', image: '/images/card_item/Camping.svg', category: 'objects', type: 'camping' },
        {
          id: 'camera_flash',
          image: '/images/card_item/cameraflash.svg',
          category: 'objects',
          type: 'camera_flash',
        },
        { id: 'bubbles', image: '/images/card_item/Bubbles.svg', category: 'objects', type: 'bubbles' },
        { id: 'brick', image: '/images/card_item/birck.svg', category: 'objects', type: 'brick' },
        { id: 'basketball', image: '/images/card_item/basketball.svg', category: 'objects', type: 'basketball' },
        { id: 'bouquet', image: '/images/card_item/Bouquet.svg', category: 'objects', type: 'bouquet' },
        { id: 'rosette', image: '/images/card_item/rosette.svg', category: 'objects', type: 'rosette' },
        { id: 'rose', image: '/images/card_item/rose.svg', category: 'objects', type: 'rose' },
        { id: 'red_heart', image: '/images/card_item/red_heart.svg', category: 'objects', type: 'red_heart' },
        {
          id: 'purple_heart',
          image: '/images/card_item/pruple_heart.svg',
          category: 'objects',
          type: 'purple_heart',
        },

        // Karakterler
        { id: 'doctor', image: '/images/card_item/doctor.svg', category: 'characters', type: 'doctor' },
        {
          id: 'firefighter_man',
          image: '/images/card_item/firefigyer_man.svg',
          category: 'characters',
          type: 'firefighter_man',
        },
        { id: 'chef_man', image: '/images/card_item/chef_man.svg', category: 'characters', type: 'chef_man' },
        { id: 'man_dance', image: '/images/card_item/man_dance.svg', category: 'characters', type: 'man_dance' },
        {
          id: 'construction_worker',
          image: '/images/card_item/Construction_worker.svg',
          category: 'characters',
          type: 'construction_worker',
        },
        { id: 'police', image: '/images/card_item/police.svg', category: 'characters', type: 'police' },
        { id: 'child_1', image: '/images/card_item/child_1.svg', category: 'characters', type: 'child_1' },
        { id: 'child_2', image: '/images/card_item/child_2.svg', category: 'characters', type: 'child_2' },
        { id: 'circus', image: '/images/card_item/circus.svg', category: 'characters', type: 'circus' },
        { id: 'cold_face', image: '/images/card_item/cold_face.svg', category: 'characters', type: 'cold_face' },
        { id: 'simile', image: '/images/card_item/simile.svg', category: 'characters', type: 'simile' },
        { id: 'biking', image: '/images/card_item/biking.svg', category: 'characters', type: 'biking' },
        {
          id: 'teddy_bear',
          image: '/images/card_item/teddy_bear.svg',
          category: 'characters',
          type: 'teddy_bear',
        },
        { id: 'poop', image: '/images/card_item/poop.svg', category: 'characters', type: 'poop' },
        { id: 'shoup', image: '/images/card_item/shoup.svg', category: 'characters', type: 'shoup' },
        { id: 'popcornt', image: '/images/card_item/popcornt.svg', category: 'characters', type: 'popcornt' },
      ],
    },
  }
}

export const useGameStore = defineStore('game', {
  state: () => getDefaultState(),

  getters: {
    getIslandData: state => (islandId) => {
      return state.adventure.islands.find(i => i.id === islandId)
    },
    getAllIslands: state => state.adventure.islands,
    // Dinamik ada isimleri için getter (dil değişikliğinde güncellenir)
    getAllIslandsWithNames: () => {
      const { t } = useI18n()
      const gameStore = useGameStore()
      return gameStore.adventure.islands.map(island => ({
        ...island,
        name: t(island.nameKey),
      }))
    },
    getIslandWithName: () => (islandId) => {
      const { t } = useI18n()
      const gameStore = useGameStore()
      const island = gameStore.adventure.islands.find(i => i.id === islandId)
      if (!island)
        return null
      return {
        ...island,
        name: t(island.nameKey),
      }
    },
    getRandomCard: state => () => {
      const randomIndex = Math.floor(Math.random() * state.cards.availableCards.length)
      return state.cards.availableCards[randomIndex]
    },
  },

  actions: {
    syncWithDefaultState() {
      // Bu metod artık gerekli değil çünkü ada bilgileri static
      // Eğer yeni adalar eklenirse buraya kod eklenebilir
    },
    startGame(mode) {
      this.currentMode = mode
      this.isGameActive = true
      this.isPaused = false
    },
    endGame() {
      this.isGameActive = false
    },
    pauseGame() {
      this.isPaused = true
    },
    resumeGame() {
      this.isPaused = false
    },
    // Endless mode action'ları playerStore'a taşındı
    // Adventure mode action'ları playerStore'a taşındı
  },
})
