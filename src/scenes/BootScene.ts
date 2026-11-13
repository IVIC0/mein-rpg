import Phaser from 'phaser';
import { GAME_TITLE } from '../config';
import { SPRITES, type SpriteDef } from '../data/sprites';
import { FLAG_COLORS } from '../data/town';
import { ZONES } from '../data/zones';

/** Lädt alle Grafiken und Karten und startet danach die Spielwelt. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    const { width, height } = this.scale;
    const label = this.add
      .text(width / 2, height / 2, `${GAME_TITLE} lädt … 0 %`, { fontFamily: 'monospace', fontSize: '20px', color: '#e8d9a0' })
      .setOrigin(0.5);
    this.load.on('progress', (value: number) => label.setText(`${GAME_TITLE} lädt … ${Math.round(value * 100)} %`));
    this.load.on('loaderror', (file: Phaser.Loader.File) => label.setText(`Fehler beim Laden: ${file.key}`));

    // Die Tilesets haben 1 px Rand um jede Kachel (margin 1, spacing 2), siehe tools/build-tilesets.mjs.
    // Jede Zone aus src/data/zones.ts bringt ihre Karte und ihr Tileset mit.
    for (const [id, zone] of Object.entries(ZONES)) {
      this.load.tilemapTiledJSON(`map-${id}`, `assets/maps/${id}.json`);
      if (!this.textures.exists(`tiles-${zone.tileset}`)) this.load.image(`tiles-${zone.tileset}`, `assets/tilesets/${zone.tileset}.png`);
    }
    // Figuren: 'characters' ist ein Raster aus 16 × 16 Pixeln, 'creatures' ein Bild mit Liste
    // der Einzelbilder (verschieden große Figuren). Wer welches Bild hat: src/data/sprites.ts.
    this.load.atlas('creatures', 'assets/sprites/creatures.png', 'assets/sprites/creatures.json');
    this.load.spritesheet('characters', 'assets/sprites/characters.png', {
      frameWidth: 16,
      frameHeight: 16,
      margin: 1,
      spacing: 2,
    });
  }

  create(): void {
    // Prüfen, ob es jedes Einzelbild aus src/data/sprites.ts wirklich gibt – sonst stünde
    // im Spiel stillschweigend ein falsches Bild.
    for (const [name, def] of Object.entries(SPRITES) as [string, SpriteDef][]) {
      for (const frame of [...def.idle, ...(def.walk ?? [])]) {
        if (!this.textures.get(def.sheet).has(String(frame))) throw new Error(`Bild "${name}": Einzelbild "${frame}" fehlt in ${def.sheet}.png.`);
      }
    }
    // Kleine Hilfsgrafiken, die im Asset-Pack fehlen, direkt als Pixelmuster.
    pixelTexture(this, 'shadow', { '#': '#000000' }, ['..######..', '.########.', '.########.', '..######..']);
    pixelTexture(this, 'click-marker', { '#': '#fff2b0' }, [
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
    // Rotes X für Klicks auf nicht begehbare Stellen, mit dunklem Rand,
    // damit es auch auf roten Dächern und Herbstbäumen zu sehen ist.
    pixelTexture(this, 'blocked-marker', { '#': '#f0383c', o: '#3a1016' }, [
      'oooo.oooo',
      'o##ooo##o',
      'o###o###o',
      'oo#####oo',
      '.oo###oo.',
      'oo#####oo',
      'o###o###o',
      'o##ooo##o',
      'oooo.oooo',
    ]);
    // Roter Ring unter dem angewählten Gegner.
    pixelTexture(this, 'target-ring', { '#': '#ff5046', o: '#5a1418' }, [
      '....oooooooo....',
      '..oo########oo..',
      '.o###oooooo###o.',
      'o##oo......oo##o',
      'o##oo......oo##o',
      '.o###oooooo###o.',
      '..oo########oo..',
      '....oooooooo....',
    ]);
    // Fahnenmast für die Gebäude im Dorf: 'flag-0' ist der leere Mast (noch nicht ausgebaut),
    // 'flag-1' bis 'flag-5' tragen ein Tuch in der Farbe der Stufe (FLAG_COLORS in src/data/town.ts).
    const pole = { k: '#e8d9a0', p: '#7a5230', o: '#2a1c10' };
    const cloth = ['..kk..........', '..ppFFFFFFFF..', '..ppFFFFFFFFF.', '..ppFFFFFFFFFF', '..ppffFFFFFFF.', '..ppffffFFFF..', '..pp..ffff....'];
    const bare = ['..kk..........', ...new Array<string>(6).fill('..pp..........')];
    const mast = [...new Array<string>(15).fill('..pp..........'), '.pppp.........', 'oooooo........'];
    pixelTexture(this, 'flag-0', pole, [...bare, ...mast]);
    FLAG_COLORS.forEach(([light, shade], index) => {
      pixelTexture(this, `flag-${index + 1}`, { ...pole, F: light, f: shade }, [...cloth, ...mast]);
    });
    this.scene.start('World');
  }
}

/**
 * Erzeugt eine Textur aus Textzeilen. `colors` ordnet Zeichen eine Farbe zu,
 * jedes dieser Zeichen wird ein Pixel; alle anderen Zeichen bleiben durchsichtig.
 */
function pixelTexture(scene: Phaser.Scene, key: string, colors: Record<string, string>, rows: string[]): void {
  const texture = scene.textures.createCanvas(key, rows[0].length, rows.length);
  if (!texture) throw new Error(`Textur "${key}" konnte nicht angelegt werden.`);
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const color = colors[row[x]];
      if (!color) continue;
      texture.context.fillStyle = color;
      texture.context.fillRect(x, y, 1, 1);
    }
  });
  texture.refresh();
}
