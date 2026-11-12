// Erzeugt die Spiel-Grafiken aus den Originalpaketen in assets-src/:
//   public/assets/tilesets/gruenwald.png   Tiny Town + zusammengesetzte Waldkacheln
//   public/assets/tilesets/hoehle.png      Tiny Dungeon (Böden, Mauern) + Ausgang aus Tiny Town
//   public/assets/sprites/characters.png   Tiny Dungeon (Figuren, Gegner, Items) + eigene Item-Symbole
//   public/assets/sprites/creatures.png    Figuren von 0x72 und Ninja Adventure (Liste: lib/creatures.mjs)
//   public/assets/sprites/creatures.json   wo in creatures.png welches Einzelbild liegt
// Aufruf: npm run assets
import fs from 'node:fs';
import { CREATURES } from './lib/creatures.mjs';
import { buildItemIcons } from './lib/item-icons.mjs';
import { buildExtrudedSheet, countDifferentPixels, crop, emptyTile, getTile, loadPng, newImage, over, paste, savePng, shiftHue } from './lib/png.mjs';
import { CAVE, CAVE_TOTAL_TILE_COUNT, DUNGEON_TILE_COUNT, FOREST, PIECE, PROPS, SHEET_COLUMNS, TOTAL_TILE_COUNT, TOWN_TILE_COUNT } from './lib/tiles.mjs';

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

/** Alle Kacheln des Tilesets "hoehle": Tiny Dungeon, dahinter der Ausgang (Leiter im Steinrahmen aus Tiny Town). */
export function buildCaveTiles() {
  const tiles = [];
  for (let i = 0; i < DUNGEON_TILE_COUNT; i++) tiles.push(getTile(dungeon, i));
  while (tiles.length < CAVE_TOTAL_TILE_COUNT) tiles.push(emptyTile());
  tiles[CAVE.exit] = getTile(town, PROPS.caveEntrance);
  return tiles;
}

/**
 * Die Tilesets, die es gibt: Name → Spaltenzahl und die Funktion, die alle Kacheln liefert.
 * Der Karten-Bauer (build-map.mjs) liest daraus Größe und Bilder für die Vorschau.
 */
export const TILESETS = {
  gruenwald: { columns: SHEET_COLUMNS, build: buildTownTiles },
  hoehle: { columns: SHEET_COLUMNS, build: buildCaveTiles },
};

export function buildCharacterTiles() {
  const tiles = [];
  for (let i = 0; i < 132; i++) tiles.push(getTile(dungeon, i));
  // Ab Bild 132: selbst gezeichnete Item-Symbole (Helm, Rüstung, Handschuhe, Stiefel, Amulett, Ring).
  tiles.push(...buildItemIcons());
  return tiles;
}

/**
 * Setzt die Figuren aus lib/creatures.mjs zu einem Bild zusammen. Die Figuren sind
 * verschieden groß (16 × 16 bis 18 × 17), deshalb gibt es kein festes Raster: Jedes
 * Einzelbild steht mit 1 px Abstand neben dem nächsten, und `frames` merkt sich die Stelle
 * (Format "JSON Hash", das Phaser als Atlas lädt).
 */
export function buildCreatureAtlas() {
  const sources = new Map(); // jede Datei nur einmal lesen
  const load = (file) => {
    if (!fs.existsSync(file)) throw new Error(`Figuren: Datei fehlt: ${file}`);
    if (!sources.has(file)) sources.set(file, loadPng(file));
    return sources.get(file);
  };

  const parts = []; // { name, image }
  for (const creature of CREATURES) {
    for (const kind of ['idle', 'walk']) {
      creature[kind].forEach((frame, i) => {
        const source = load(frame.file);
        // Streifen: `strip` Bilder nebeneinander, gebraucht wird Bild Nummer `index`.
        const width = frame.strip ? source.width / frame.strip : source.width;
        if (!Number.isInteger(width)) throw new Error(`Figur "${creature.name}": ${frame.file} lässt sich nicht in ${frame.strip} gleiche Bilder teilen.`);
        let image = crop(source, (frame.index ?? 0) * width, 0, width, source.height);
        if (creature.hueShift) image = shiftHue(image, creature.hueShift);
        parts.push({ name: `${creature.name}-${kind}-${i}`, image });
      });
    }
  }

  const height = Math.max(...parts.map((part) => part.image.height)) + 2;
  const width = parts.reduce((sum, part) => sum + part.image.width + 1, 1);
  const sheet = newImage(width, height);
  sheet.data.fill(0); // durchsichtig
  const frames = {};
  let x = 1;
  for (const { name, image } of parts) {
    paste(sheet, image, x, 1);
    const size = { w: image.width, h: image.height };
    frames[name] = { frame: { x, y: 1, ...size }, rotated: false, trimmed: false, spriteSourceSize: { x: 0, y: 0, ...size }, sourceSize: size };
    x += image.width + 1;
  }
  return { sheet, json: { frames, meta: { image: 'creatures.png', size: { w: width, h: height }, scale: '1' } } };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const [name, tileset] of Object.entries(TILESETS)) {
    savePng(`public/assets/tilesets/${name}.png`, buildExtrudedSheet(tileset.build(), tileset.columns));
  }
  savePng('public/assets/sprites/characters.png', buildExtrudedSheet(buildCharacterTiles(), SHEET_COLUMNS));
  const atlas = buildCreatureAtlas();
  savePng('public/assets/sprites/creatures.png', atlas.sheet);
  fs.writeFileSync('public/assets/sprites/creatures.json', JSON.stringify(atlas.json, null, 1) + '\n');
  console.log(`Tilesets geschrieben, dazu ${Object.keys(atlas.json.frames).length} Einzelbilder für Figuren.`);
}
