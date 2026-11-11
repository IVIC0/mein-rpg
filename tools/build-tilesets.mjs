// Erzeugt die Spiel-Grafiken aus den Originalpaketen in assets-src/:
//   public/assets/tilesets/gruenwald.png   Tiny Town + zusammengesetzte Waldkacheln
//   public/assets/sprites/characters.png   Tiny Dungeon (Figuren, Gegner, Items)
// Aufruf: npm run assets
import { buildExtrudedSheet, countDifferentPixels, emptyTile, getTile, loadPng, over, savePng } from './lib/png.mjs';
import { FOREST, PIECE, SHEET_COLUMNS, TOTAL_TILE_COUNT, TOWN_TILE_COUNT } from './lib/tiles.mjs';

const town = loadPng('assets-src/kenney/tiny-town/tilemap_packed.png');
const dungeon = loadPng('assets-src/kenney/tiny-dungeon/tilemap_packed.png');

/** Alle Kacheln des Spiel-Tilesets, erst die Originale, dann die Waldkacheln. */
export function buildTownTiles() {
  const tiles = [];
  for (let i = 0; i < TOWN_TILE_COUNT; i++) tiles.push(getTile(town, i));
  while (tiles.length < TOTAL_TILE_COUNT) tiles.push(emptyTile());

  for (const [name, variant] of Object.entries(FOREST)) {
    const part = Object.fromEntries(Object.entries(variant.parts).map(([k, index]) => [k, getTile(town, index)]));
    for (let mask = 1; mask <= 15; mask++) {
      // Reihenfolge von hinten nach vorn: der Baum oben steht weiter hinten,
      // die Baumspitze unten gehört zum Baum davor.
      let tile = emptyTile();
      if (mask & PIECE.T) tile = over(tile, part.T);
      if (mask & PIECE.L) tile = over(tile, part.L);
      if (mask & PIECE.R) tile = over(tile, part.R);
      if (mask & PIECE.B) tile = over(tile, part.B);
      tiles[variant.first + mask] = tile;
    }
    // Für den vollen Wald gibt es Kenneys fertige Kachel. Die ist an den
    // Überlappungen von Hand nachgezeichnet und weicht deshalb um ein paar
    // Pixel von der zusammengesetzten Version ab.
    const original = getTile(town, variant.full);
    const diff = countDifferentPixels(tiles[variant.first + 15], original);
    if (diff > 60) throw new Error(`Wald "${name}": Einzelteile passen nicht zur Originalkachel (${diff} Pixel Abweichung).`);
    tiles[variant.first + 15] = original;
  }
  return tiles;
}

export function buildCharacterTiles() {
  const tiles = [];
  for (let i = 0; i < 132; i++) tiles.push(getTile(dungeon, i));
  return tiles;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  savePng('public/assets/tilesets/gruenwald.png', buildExtrudedSheet(buildTownTiles(), SHEET_COLUMNS));
  savePng('public/assets/sprites/characters.png', buildExtrudedSheet(buildCharacterTiles(), SHEET_COLUMNS));
  console.log('Tilesets geschrieben.');
}
