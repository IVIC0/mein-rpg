import Phaser from 'phaser';

// Platzhalter-Szene für Meilenstein 1: zeigt nur, dass Build und Deploy laufen.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, height / 2 - 20, 'Mein RPG', {
        fontFamily: 'monospace',
        fontSize: '48px',
        color: '#e8d9a0',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 + 30, `Setup läuft – v${__APP_VERSION__}`, {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#8fa38f',
      })
      .setOrigin(0.5);
  }
}
