// Bilder-Verzeichnis: Name → wo das Bild liegt und welche Einzelbilder zu Stehen und Laufen gehören.
// Gegner, Händler, Truhen und die eigene Figur nennen ihr Bild nur noch beim Namen.
//
// Es gibt zwei Bild-Dateien (beide erzeugt `npm run assets`):
// - 'characters' = assets/sprites/characters.png: Kenney "Tiny Dungeon", ein Raster aus 16 × 16
//   Pixeln. Ein Einzelbild ist hier eine Nummer (0 = oben links, 12 pro Zeile).
// - 'creatures'  = assets/sprites/creatures.png: Figuren von 0x72 und Ninja Adventure.
//   Ein Einzelbild ist hier ein Name wie 'goblin-walk-0' (Liste: tools/lib/creatures.mjs).
//
// Hat ein Bild keine Lauf-Bilder (`walk`), hüpft die Figur beim Laufen leicht – wie bisher.

export interface SpriteDef {
  sheet: 'characters' | 'creatures';
  /** Einzelbilder im Stehen. Mehrere = die Figur bewegt sich leicht auf der Stelle. */
  idle: (number | string)[];
  /** Einzelbilder beim Laufen. Fehlt die Angabe, gibt es das Hüpfen. */
  walk?: (number | string)[];
}

/** So lange ist ein Einzelbild einer Animation zu sehen (Millisekunden). */
export const SPRITE_FRAME_MS = { idle: 180, walk: 110 };

const creature = (name: string, idleFrames: number, walkFrames: number): SpriteDef => ({
  sheet: 'creatures',
  idle: Array.from({ length: idleFrames }, (_, i) => `${name}-idle-${i}`),
  walk: Array.from({ length: walkFrames }, (_, i) => `${name}-walk-${i}`),
});

export const SPRITES = {
  // Kenney "Tiny Dungeon"
  ritter: { sheet: 'characters', idle: [96] },
  haendler: { sheet: 'characters', idle: [86] },
  ratte: { sheet: 'characters', idle: [123] },
  spinne: { sheet: 'characters', idle: [122] },
  fledermaus: { sheet: 'characters', idle: [120] },
  wegelagerer: { sheet: 'characters', idle: [112] },
  raeuberhauptmann: { sheet: 'characters', idle: [111] },
  'truhe-zu': { sheet: 'characters', idle: [89] },
  'truhe-offen': { sheet: 'characters', idle: [91] },
  // 0x72 "DungeonTileset II": vier Bilder Stehen, vier Bilder Laufen
  goblin: creature('goblin', 4, 4),
  'goblin-schleuderer': creature('goblin-schleuderer', 4, 4),
  // "Ninja Adventure": zwei Bilder Laufen, das erste dient auch als Stehen
  wildschwein: creature('wildschwein', 1, 2),
  wolf: creature('wolf', 1, 2),
  hyaene: creature('hyaene', 1, 2),
} satisfies Record<string, SpriteDef>;

export type SpriteName = keyof typeof SPRITES;

export function spriteDef(name: SpriteName): SpriteDef {
  return SPRITES[name];
}
