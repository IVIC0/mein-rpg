// Kachel-Nummern der Tilesets (0-basiert).
//
// Tileset "gruenwald":
// 0–131 sind die Originalkacheln aus Kenney "Tiny Town" (12 Spalten × 11 Zeilen).
// Ab 132 kommen die Waldkacheln, die build-tilesets.mjs daraus zusammensetzt.
//
// Tileset "hoehle" (ganz unten in dieser Datei): Kenney "Tiny Dungeon" plus ein Ausgang.

export const TOWN_TILE_COUNT = 132;
export const SHEET_COLUMNS = 12;

export const GRASS = { plain: 0, tufts: 1, flowers: 2, stones: 43 };

// Erdweg: 3×3-Block mit Grasrand plus vier Innenecken.
export const DIRT = {
  nw: 12, n: 13, ne: 14,
  w: 24, center: 25, e: 26,
  sw: 36, s: 37, se: 38,
  innerNW: 39, innerNE: 40, innerSE: 41, innerSW: 42,
};

// Die Bäume im dichten Wald stehen um eine halbe Kachel versetzt. Jede Kachel
// enthält deshalb bis zu vier Baum-Teilstücke:
//   L = halber Baum am linken Rand     R = halber Baum am rechten Rand
//   T = Baum-Unterteil oben in der Mitte   B = Baumspitze unten in der Mitte
// Kenney liefert nur einige Kombinationen mit; die übrigen werden aus den
// Einzelteilen zusammengesetzt, damit beliebige Waldformen möglich sind.
export const PIECE = { L: 1, R: 2, T: 4, B: 8 };

export const FOREST = {
  green: {
    first: 132, // Kachel für Maske m liegt bei first + m (m = 1..15)
    parts: { L: 20, R: 18, T: 31, B: 7 },
    full: 19,
    single: [28, 28, 28, 4, 16], // einzeln stehende Bäume
  },
  autumn: {
    first: 148,
    parts: { L: 23, R: 21, T: 34, B: 10 },
    full: 22,
    single: [27, 27, 27, 3, 15],
  },
};

// 14 Zeilen × 12 Spalten; die letzten Plätze bleiben leer.
export const TOTAL_TILE_COUNT = 168;

export const PROPS = {
  bush: 5, sprout: 17, mushrooms: 29,
  sign: 83, wellTop: 92, well: 104,
  hay: 93, beehive: 94, target: 95, log: 106, pot: 107, cart: 57,
  // Steinrahmen mit Leiter: der Eingang zu einer Höhle.
  caveEntrance: 103,
};

export const FENCE = {
  nw: 44, n: 45, ne: 46,
  w: 56, e: 58,
  sw: 68, gate: 69, se: 70,
};

export const HOUSE = {
  red: { roofTop: [52, 53, 54], roofBottom: [64, 65, 66], chimney: 55 },
  gray: { roofTop: [48, 49, 50], roofBottom: [60, 61, 62], chimney: 51 },
  wood: { left: 72, mid: 73, right: 75, window: 84, door: 85 },
  stone: { left: 76, mid: 77, right: 79, window: 88, door: 89 },
};

export const RUIN = {
  topLeft: 99, top: 100, topRight: 101,
  wall: 126, slit: 125, archLeft: 113, archRight: 114,
};

// ---------------------------------------------------------------- Tileset "hoehle"

// 0–131 sind die Originalkacheln aus Kenney "Tiny Dungeon" (12 Spalten × 11 Zeilen).
// Ab 132 kommen Zusätze aus anderen Packs (build-tilesets.mjs, buildCaveTiles).
export const DUNGEON_TILE_COUNT = 132;
export const CAVE_TOTAL_TILE_COUNT = 144;

export const CAVE = {
  floor: 0, // brauner Höhlenboden
  holes: 12, // Boden mit Löchern
  rubble: 24, // Boden mit Geröll
  wall: 40, // Mauer – steht überall, wo unterhalb einer Felskachel Boden liegt
  exit: 132, // Steinrahmen mit Leiter aus "Tiny Town": der Weg nach draußen
};
