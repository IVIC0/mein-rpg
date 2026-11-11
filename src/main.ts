import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';

// Interne Auflösung des Spiels. Phaser skaliert das Bild passend ins Browserfenster.
export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#1b2a1f',
  pixelArt: true, // keine Weichzeichnung beim Hochskalieren
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene],
});
