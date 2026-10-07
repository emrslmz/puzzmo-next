import Phaser from 'phaser'

/**
 * Global event bus shared by services and scenes.
 *
 * Events:
 *  - 'state:coins'     (coins)       coin balance changed
 *  - 'state:settings'  (settings)    a setting changed
 *  - 'state:inventory' ()            power-ups / skins changed
 *  - 'app:pause' / 'app:resume'      app sent to background / foreground
 *  - 'app:back'                      Android hardware back button
 *  - 'viewport:resize'               logical viewport changed
 */
export const bus = new Phaser.Events.EventEmitter()
