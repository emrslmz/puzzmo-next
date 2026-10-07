/**
 * Static game data: card items, islands, skins, power-ups and store packages.
 * Ids are kept identical to the previous app so saved progress keeps working.
 */

// Atlas frame keys for the card faces (see `scripts/build-assets.mjs`).
export const CARD_ITEMS = [
  // Animals
  'zebra',
  'unicorn',
  'turtle',
  'fish',
  'camel',
  'tiger',
  'whale',
  'cat_heart',
  'snail',
  'ram',
  'rabbit',
  'polar_bear',
  'angry_cat',
  'penguin',
  'peacock',
  'parrot',
  'fox',
  'baby_chick',
  'duck',
  'dog_face',
  'sad_cat',
  'cow_face',
  'cow',
  'bear',
  'birdyellow',
  'trex',
  // Food
  'watermelon',
  'apple',
  'banana',
  'strawberry',
  'tangerine',
  'pineapple',
  'pizza',
  'hot_dog',
  'grapes',
  'french_fries',
  'eggplant',
  'egg',
  'meat',
  'cheese',
  'cherries',
  'carrot',
  'burrito',
  'beverage',
  'candy',
  'popcorn',
  'shortcake',
  'tropical_drink',
  'tomato',
  'mango',
  // Objects
  'gift',
  'sun',
  'rainbow',
  'helicopter',
  'racing_car',
  'fire_engine',
  'ambulance',
  'automobile',
  'taxi',
  'package',
  'magnifying_glass',
  'mill',
  'eyes',
  'classical_build',
  'camping',
  'cameraflash',
  'bubbles',
  'birck',
  'basketball',
  'bouquet',
  'rosette',
  'rose',
  'red_heart',
  'pruple_heart',
  // Characters
  'doctor',
  'firefigyer_man',
  'chef_man',
  'man_dance',
  'construction_worker',
  'police',
  'child_1',
  'child_2',
  'circus',
  'cold_face',
  'simile',
  'biking',
  'teddy_bear',
  'poop',
  'shoup',
  'popcornt',
]

export const ISLANDS = [
  { id: 'village_island', nameKey: 'village_island_name', theme: 'village', frame: 'island_base', cost: 0 },
  { id: 'town_center_island', nameKey: 'town_center_island_name', theme: 'town_center', frame: 'island_town', cost: 0 },
  { id: 'hut_island', nameKey: 'hut_island_name', theme: 'hut', frame: 'island_hut', cost: 3000 },
  { id: 'dock_island', nameKey: 'dock_island_name', theme: 'dock', frame: 'island_dock', cost: 5000 },
  { id: 'shop_island', nameKey: 'shop_island_name', theme: 'shop', frame: 'island_shop', cost: 6000 },
  { id: 'pirate_island', nameKey: 'pirate_island_name', theme: 'pirate', frame: 'island_pirate', cost: 8000 },
]

export const SKINS = [
  { id: 'skin_default', nameKey: 'default_skin', frame: 'skin_blue', price: 0 },
  { id: 'skin_orange', nameKey: 'orange_dynamite', frame: 'skin_orange', price: 1900 },
  { id: 'skin_lightblue', nameKey: 'blue_ice', frame: 'skin_lightblue', price: 1950 },
  { id: 'skin_white', nameKey: 'pure_justice', frame: 'skin_white', price: 2000 },
  { id: 'skin_green', nameKey: 'turquoise_power', frame: 'skin_green', price: 2100 },
  { id: 'skin_black', nameKey: 'night_guardian', frame: 'skin_black', price: 2200 },
  { id: 'skin_red', nameKey: 'red_rage', frame: 'skin_red', price: 2400 },
  { id: 'skin_purple', nameKey: 'purple_sun', frame: 'skin_purple', price: 2500 },
  { id: 'skin_yellow', nameKey: 'gold_shot', frame: 'skin_yellow', price: 2600 },
]

export const POWER_UPS = [
  { id: 'freeze', nameKey: 'freeze', descKey: 'freeze_description', price: 300, frame: 'pu_freeze' },
  { id: 'bomb', nameKey: 'bomb', descKey: 'bomb_description', price: 450, frame: 'pu_bomb' },
  { id: 'pink_ixr', nameKey: 'pink_ixr', descKey: 'pink_ixr_description', price: 600, frame: 'pu_pink_ixr' },
  { id: 'flash', nameKey: 'flash', descKey: 'flash_description', price: 800, frame: 'pu_flash' },
  { id: 'red_ixr', nameKey: 'red_ixr', descKey: 'red_ixr_description', price: 1000, frame: 'pu_red_ixr' },
  { id: 'sledgehammer', nameKey: 'sledgehammer', descKey: 'sledgehammer_description', price: 1250, frame: 'pu_sledgehammer' },
  { id: 'yellow_ixr', nameKey: 'yellow_ixr', descKey: 'yellow_ixr_description', price: 1500, frame: 'pu_yellow_ixr' },
]

export const ENDLESS_POWER_UPS = ['bomb', 'sledgehammer', 'flash', 'freeze', 'pink_ixr', 'red_ixr', 'yellow_ixr']
export const ADVENTURE_POWER_UPS = ['freeze', 'bomb', 'flash', 'sledgehammer']

/**
 * In-app purchase packages. `offeringId` matches the RevenueCat offering
 * identifiers configured for the app; `productMatch` is used to recognise
 * the non-consumable "remove ads" purchase when restoring.
 */
export const COIN_PACKAGES = [
  { id: 'block_ads', offeringId: 'revenue.puzzmo.block_ads', nameKey: 'block_ads', badgeKey: 'special_offer', coins: 0, bonus: 1000, frame: 'icon_remove_ads', fallbackPrice: '$2.99', removesAds: true, productMatch: 'block_ads' },
  { id: '1k', offeringId: 'revenue.puzzmo.1k', nameKey: 'extra_coin', badgeKey: '', coins: 1000, bonus: 0, frame: 'coin2', fallbackPrice: '$2.99' },
  { id: '5k', offeringId: 'revenue.puzzmo.5k', nameKey: 'popular', badgeKey: 'most_popular', coins: 5000, bonus: 500, frame: 'coin3', fallbackPrice: '$9.99', popular: true },
  { id: '10k', offeringId: 'revenue.puzzmo.10k', nameKey: 'super', badgeKey: 'best_value', coins: 10000, bonus: 2000, frame: 'coin6', fallbackPrice: '$19.99' },
]

export const getIsland = id => ISLANDS.find(i => i.id === id)
export const getSkin = id => SKINS.find(s => s.id === id) ?? SKINS[0]
export const getPowerUp = id => POWER_UPS.find(p => p.id === id)
