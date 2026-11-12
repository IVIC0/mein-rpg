import type Phaser from 'phaser';
import { TILE } from '../config';
import { MINIMAP } from '../data/minimap';
import type { Enemy } from '../entities/Enemy';
import type { Point } from '../world/Grid';
import { byId } from './dom';

/** Die Minimap wird doppelt so fein gezeichnet, wie sie groß ist – so bleibt sie auch vergrößert scharf. */
const RESOLUTION = 2;

/**
 * Die Minimap oben rechts: Gelände, eigene Figur (Mitte), Gegner im Ausschnitt und der Händler.
 * Sie ist ein HUD-Element wie die anderen (ausblenden, Größe, Deckkraft, verschieben).
 * Größe, Ausschnitt und Farben stehen in src/data/minimap.ts.
 *
 * Das Gelände wird einmal beim Start als kleines Bild gebaut (1 Pixel pro Kachel).
 * Jeden Frame wird daraus der Ausschnitt um die Figur gezeichnet, darüber die Punkte.
 */
export class Minimap {
  private readonly canvas = byId('minimap-canvas') as HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private readonly terrain: HTMLCanvasElement;

  constructor(map: Phaser.Tilemaps.Tilemap, tileset: Phaser.Tilemaps.Tileset) {
    this.canvas.width = MINIMAP.size * RESOLUTION;
    this.canvas.height = MINIMAP.size * RESOLUTION;
    this.canvas.style.width = `${MINIMAP.size}px`;
    this.canvas.style.height = `${MINIMAP.size}px`;
    const context = this.canvas.getContext('2d');
    if (!context) throw new Error('Die Minimap lässt sich nicht zeichnen.');
    this.context = context;
    this.terrain = buildTerrain(map, tileset);
  }

  /** Zeichnet die Minimap neu. `player` und `merchant` sind Plätze in Welt-Pixeln. */
  render(player: Point, enemies: readonly Enemy[], merchant: Point): void {
    const context = this.context;
    const view = MINIMAP.tilesVisible;
    const pixelsPerTile = this.canvas.width / view;
    // Linke obere Ecke des Ausschnitts in Kacheln. Am Kartenrand bleibt er stehen (wie die Kamera).
    const left = clampView(player.x / TILE - view / 2, this.terrain.width - view);
    const top = clampView(player.y / TILE - view / 2, this.terrain.height - view);

    context.fillStyle = MINIMAP.background;
    context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    context.imageSmoothingEnabled = false; // harte Kanten, passend zur Pixel-Grafik
    context.drawImage(this.terrain, -left * pixelsPerTile, -top * pixelsPerTile, this.terrain.width * pixelsPerTile, this.terrain.height * pixelsPerTile);

    // Ein Punkt an einem Platz der Welt; liegt er außerhalb des Ausschnitts, wird nichts gezeichnet.
    const dot = (at: Point, color: string, radius: number): void => {
      const x = (at.x / TILE - left) * pixelsPerTile;
      const y = (at.y / TILE - top) * pixelsPerTile;
      if (x < 0 || y < 0 || x > this.canvas.width || y > this.canvas.height) return;
      context.beginPath();
      context.arc(x, y, radius * RESOLUTION, 0, Math.PI * 2);
      context.fillStyle = color;
      context.fill();
      context.lineWidth = RESOLUTION;
      context.strokeStyle = '#000000';
      context.stroke();
    };

    dot(merchant, MINIMAP.merchantColor, MINIMAP.merchantRadius);
    for (const enemy of enemies) {
      if (enemy.state === 'dead') continue;
      const look = MINIMAP.enemies[enemy.rank];
      dot(enemy.pos, look.color, look.radius);
    }
    dot(player, MINIMAP.playerColor, MINIMAP.playerRadius);
  }
}

/** Hält den Ausschnitt in der Karte. Ist die Karte kleiner als der Ausschnitt, steht sie mittig. */
function clampView(start: number, max: number): number {
  if (max <= 0) return max / 2;
  return Math.min(max, Math.max(0, start));
}

/**
 * Baut das Gelände als kleines Bild: 1 Pixel pro Kachel. Die Farbe einer Kachel ist der
 * Durchschnitt ihrer Bildpunkte. Die Ebenen der Karte (Boden, Deko, Objekte) liegen
 * übereinander; halb durchsichtige Kacheln (z. B. Blumen) färben den Boden nur leicht.
 */
function buildTerrain(map: Phaser.Tilemaps.Tilemap, tileset: Phaser.Tilemaps.Tileset): HTMLCanvasElement {
  // Das Tileset-Bild einmal auslesen.
  const image = tileset.image?.getSourceImage() as HTMLImageElement | undefined;
  if (!image) throw new Error('Das Tileset-Bild für die Minimap fehlt.');
  const sheet = document.createElement('canvas');
  sheet.width = image.width;
  sheet.height = image.height;
  const sheetContext = sheet.getContext('2d', { willReadFrequently: true });
  if (!sheetContext) throw new Error('Die Minimap lässt sich nicht zeichnen.');
  sheetContext.drawImage(image, 0, 0);

  // Durchschnittsfarbe je Kachel-Nummer; `cover` = Anteil der Bildpunkte, die nicht durchsichtig sind.
  const colors = new Map<number, { r: number; g: number; b: number; cover: number }>();
  const colorOf = (index: number) => {
    let color = colors.get(index);
    if (color) return color;
    color = { r: 0, g: 0, b: 0, cover: 0 };
    const at = tileset.getTileTextureCoordinates(index) as { x: number; y: number } | null;
    if (at) {
      const pixels = sheetContext.getImageData(at.x, at.y, TILE, TILE).data;
      let weight = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        const alpha = pixels[i + 3] / 255;
        color.r += pixels[i] * alpha;
        color.g += pixels[i + 1] * alpha;
        color.b += pixels[i + 2] * alpha;
        weight += alpha;
      }
      if (weight > 0) {
        color.r /= weight;
        color.g /= weight;
        color.b /= weight;
        color.cover = weight / (TILE * TILE);
      }
    }
    colors.set(index, color);
    return color;
  };

  const terrain = document.createElement('canvas');
  terrain.width = map.width;
  terrain.height = map.height;
  const context = terrain.getContext('2d');
  if (!context) throw new Error('Die Minimap lässt sich nicht zeichnen.');
  const picture = context.createImageData(map.width, map.height);
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      let r = 16;
      let g = 22;
      let b = 15;
      for (const layer of map.layers) {
        const index = layer.data[y]?.[x]?.index ?? -1;
        if (index < 0) continue;
        const color = colorOf(index);
        r += (color.r - r) * color.cover;
        g += (color.g - g) * color.cover;
        b += (color.b - b) * color.cover;
      }
      const offset = (y * map.width + x) * 4;
      picture.data[offset] = r;
      picture.data[offset + 1] = g;
      picture.data[offset + 2] = b;
      picture.data[offset + 3] = 255;
    }
  }
  context.putImageData(picture, 0, 0);
  return terrain;
}
