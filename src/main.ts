import Phaser from 'phaser';
import './ui/hud.css';
import { BootScene } from './scenes/BootScene';
import { WorldScene } from './scenes/WorldScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#1b2a1f',
  pixelArt: true, // keine Weichzeichnung beim Vergrößern
  scale: {
    // Die Spielfläche ist immer genau so groß wie das Browserfenster.
    // Größeres Fenster = man sieht mehr von der Welt, nichts wird verzerrt.
    mode: Phaser.Scale.RESIZE,
    width: '100%',
    height: '100%',
  },
  scene: [BootScene, WorldScene],
});

const versionLabel = document.getElementById('version');
if (versionLabel) versionLabel.textContent = `v${__APP_VERSION__}`;

// Nur beim lokalen Entwickeln: Spiel in der Browser-Konsole als __rpg erreichbar.
if (import.meta.env.DEV) {
  (window as unknown as { __rpg: Phaser.Game }).__rpg = game;
}
