import Phaser from 'phaser';

/** Lädt alle Grafiken und Karten und startet danach die Spielwelt. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    const { width, height } = this.scale;
    const label = this.add
      .text(width / 2, height / 2, 'Lade … 0 %', { fontFamily: 'monospace', fontSize: '20px', color: '#e8d9a0' })
      .setOrigin(0.5);
    this.load.on('progress', (value: number) => label.setText(`Lade … ${Math.round(value * 100)} %`));
    this.load.on('loaderror', (file: Phaser.Loader.File) => label.setText(`Fehler beim Laden: ${file.key}`));

    // Die Tilesets haben 1 px Rand um jede Kachel (margin 1, spacing 2), siehe tools/build-tilesets.mjs.
    this.load.image('tiles-gruenwald', 'assets/tilesets/gruenwald.png');
    this.load.tilemapTiledJSON('map-gruenwald', 'assets/maps/gruenwald.json');
    this.load.spritesheet('characters', 'assets/sprites/characters.png', {
      frameWidth: 16,
      frameHeight: 16,
      margin: 1,
      spacing: 2,
    });
  }

  create(): void {
    // Kleine Hilfsgrafiken, die im Asset-Pack fehlen, direkt als Pixelmuster.
    pixelTexture(this, 'shadow', '#000000', ['..######..', '.########.', '.########.', '..######..']);
    pixelTexture(this, 'click-marker', '#fff2b0', [
      '...###...',
      '.##...##.',
      '.#.....#.',
      '#.......#',
      '#.......#',
      '#.......#',
      '.#.....#.',
      '.##...##.',
      '...###...',
    ]);
    this.scene.start('World');
  }
}

/** Erzeugt eine Textur aus Textzeilen: jedes '#' wird ein Pixel in der Farbe `color`. */
function pixelTexture(scene: Phaser.Scene, key: string, color: string, rows: string[]): void {
  const texture = scene.textures.createCanvas(key, rows[0].length, rows.length);
  if (!texture) throw new Error(`Textur "${key}" konnte nicht angelegt werden.`);
  texture.context.fillStyle = color;
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] === '#') texture.context.fillRect(x, y, 1, 1);
    }
  });
  texture.refresh();
}
