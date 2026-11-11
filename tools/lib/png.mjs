// Kleine Bild-Helfer für die Build-Werkzeuge (nur Node, nicht Teil des Spiels).
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

export const TILE = 16;

export function loadPng(file) {
  return PNG.sync.read(fs.readFileSync(file));
}

export function savePng(file, png) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, PNG.sync.write(png));
}

export function newImage(width, height) {
  return new PNG({ width, height, fill: true });
}

/** Schneidet eine 16×16-Kachel aus einem lückenlos gepackten Tileset. */
export function getTile(img, index) {
  const cols = img.width / TILE;
  const sx = (index % cols) * TILE;
  const sy = Math.floor(index / cols) * TILE;
  const data = new Uint8Array(TILE * TILE * 4);
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const s = ((sy + y) * img.width + sx + x) * 4;
      const d = (y * TILE + x) * 4;
      for (let k = 0; k < 4; k++) data[d + k] = img.data[s + k];
    }
  }
  return data;
}

export function emptyTile() {
  return new Uint8Array(TILE * TILE * 4);
}

/** Legt `top` über `base` (normales Alpha-Blending) und gibt eine neue Kachel zurück. */
export function over(base, top) {
  const out = new Uint8Array(base);
  for (let i = 0; i < out.length; i += 4) {
    const a = top[i + 3] / 255;
    if (a === 0) continue;
    const b = out[i + 3] / 255;
    const outA = a + b * (1 - a);
    for (let k = 0; k < 3; k++) {
      out[i + k] = Math.round((top[i + k] * a + out[i + k] * b * (1 - a)) / outA);
    }
    out[i + 3] = Math.round(outA * 255);
  }
  return out;
}

export function countDifferentPixels(a, b) {
  let n = 0;
  for (let i = 0; i < a.length; i += 4) {
    const bothClear = a[i + 3] === 0 && b[i + 3] === 0;
    if (bothClear) continue;
    if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2] || a[i + 3] !== b[i + 3]) n++;
  }
  return n;
}

/**
 * Baut aus Kacheln ein Tileset mit 1 px Rand um jede Kachel ("extrudiert":
 * die Randpixel werden nach außen wiederholt). Das verhindert feine Linien
 * zwischen den Kacheln, wenn die Kamera zoomt oder scrollt.
 * In Phaser/Tiled entspricht das margin = 1, spacing = 2.
 */
export function buildExtrudedSheet(tiles, columns) {
  const rows = Math.ceil(tiles.length / columns);
  const step = TILE + 2;
  const sheet = newImage(columns * step, rows * step);
  tiles.forEach((tile, i) => {
    const ox = (i % columns) * step;
    const oy = Math.floor(i / columns) * step;
    for (let y = -1; y <= TILE; y++) {
      for (let x = -1; x <= TILE; x++) {
        const sx = Math.min(TILE - 1, Math.max(0, x));
        const sy = Math.min(TILE - 1, Math.max(0, y));
        const s = (sy * TILE + sx) * 4;
        const d = ((oy + 1 + y) * sheet.width + ox + 1 + x) * 4;
        for (let k = 0; k < 4; k++) sheet.data[d + k] = tile[s + k];
      }
    }
  });
  return sheet;
}

/** Zeichnet eine Kachel in ein Bild (für die Kartenvorschau). */
export function drawTile(img, tile, dx, dy) {
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const s = (y * TILE + x) * 4;
      if (tile[s + 3] === 0) continue;
      const d = ((dy + y) * img.width + dx + x) * 4;
      for (let k = 0; k < 4; k++) img.data[d + k] = tile[s + k];
    }
  }
}
