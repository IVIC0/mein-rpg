// Selbst gezeichnete Item-Symbole. "Tiny Dungeon" hat Waffen und Schilde, aber keine
// Helme, Rüstungen, Handschuhe, Stiefel, Amulette und Ringe. Die Symbole benutzen
// die Farben des Packs und werden hinten an characters.png angehängt (ab Bild 132).
import { TILE } from './png.mjs';

/** Zeichen im Muster → Farbe. Ein Punkt bleibt durchsichtig. */
const COLORS = {
  a: '3f2631', // dunkler Umriss
  b: 'c0cbdc', // Stahl hell
  c: '8b9bb4', // Stahl mittel
  d: '52607c', // Stahl dunkel
  e: 'bd6c4a', // Leder dunkel
  f: 'eaa56c', // Leder hell
  g: 'f2c84b', // Gold
  r: 'e84537', // roter Edelstein
};

/** Reihenfolge = Bild-Nummer: das erste Muster ist Bild 132, das zweite 133 usw. */
const PATTERNS = {
  helm: [
    '................',
    '................',
    '......aaaa......',
    '....aaaaaaaa....',
    '...aaabbbbaaa...',
    '..aaacbbbbcaaa..',
    '..aadcbbbbcdaa..',
    '..aaccccccccaa..',
    '..aaccacacacaa..',
    '..aaccacacacaa..',
    '..aaccccccccaa..',
    '..aaadccccdaaa..',
    '...aaaaaaaaaa...',
    '....aaaaaaaa....',
    '................',
    '................',
  ],
  ruestung: [
    '................',
    '................',
    '..aaaa....aaaa..',
    '.aaaaaa..aaaaaa.',
    '.aabbaaaaaabbaa.',
    '.aabbcbbbbcbbaa.',
    '.aaaaccbbccaaaa.',
    '..aaaccbbccaaa..',
    '...aaccbbccaa...',
    '...aaccccccaa...',
    '...aadccccdaa...',
    '...aaeeeeeeaa...',
    '...aaddccddaa...',
    '...aaaaaaaaaa...',
    '....aaaaaaaa....',
    '................',
  ],
  handschuhe: [
    '................',
    '.....aaaaaaa....',
    '....aaaaaaaaa...',
    '....aafafafaa...',
    '....aafafafaa...',
    '..aaaafafafaa...',
    '.aaaaaffffeaa...',
    '.aafaaffffeaa...',
    '.aaffffffeeaa...',
    '.aaafffffeeaa...',
    '..aaaeeeeeaa....',
    '...aaaaaaaaa....',
    '...aabccccaa....',
    '...aabccccaa....',
    '...aaaaaaaaa....',
    '....aaaaaaa.....',
  ],
  stiefel: [
    '................',
    '................',
    '...aaaaaaa......',
    '..aaaaaaaaa.....',
    '..aabccccaa.....',
    '..aaaaaaaaa.....',
    '..aaffffeaa.....',
    '..aaffffeaa.....',
    '..aaffffeaaaa...',
    '..aaffffeeaaaa..',
    '..aafffffffeaa..',
    '..aaffffffeeaa..',
    '..aaddddddddaa..',
    '..aaaaaaaaaaaa..',
    '...aaaaaaaaaa...',
    '................',
  ],
  amulett: [
    '................',
    '................',
    '...aaaa..aaaa...',
    '..aaaaaaaaaaaa..',
    '..aagaaaaaagaa..',
    '..aagaa..aagaa..',
    '..aaagaaaagaaa..',
    '...aaagaagaaa...',
    '....aaaggaaa....',
    '....aaggggaa....',
    '....aagrrgaa....',
    '....aagrrgaa....',
    '....aaggggaa....',
    '....aaaaaaaa....',
    '.....aaaaaa.....',
    '................',
  ],
  ring: [
    '................',
    '................',
    '......aaaa......',
    '.....aaaaaa.....',
    '....aaarraaa....',
    '....aarrrraa....',
    '...aaaarraaaa...',
    '...aaggggggaa...',
    '...aaggaaggaa...',
    '...aagaaaagaa...',
    '...aagaaaagaa...',
    '...aaggaaggaa...',
    '...aaaggggaaa...',
    '....aaaaaaaa....',
    '.....aaaaaa.....',
    '................',
  ],
};

/** Wandelt die Muster in Kacheln um (gleiche Form wie getTile in png.mjs). */
export function buildItemIcons() {
  return Object.entries(PATTERNS).map(([name, rows]) => {
    if (rows.length !== TILE || rows.some((row) => row.length !== TILE)) throw new Error(`Symbol "${name}" ist nicht ${TILE} × ${TILE} Pixel groß.`);
    const tile = new Uint8Array(TILE * TILE * 4);
    rows.forEach((row, y) => {
      for (let x = 0; x < TILE; x++) {
        const hex = COLORS[row[x]];
        if (!hex) continue;
        const d = (y * TILE + x) * 4;
        tile[d] = parseInt(hex.slice(0, 2), 16);
        tile[d + 1] = parseInt(hex.slice(2, 4), 16);
        tile[d + 2] = parseInt(hex.slice(4, 6), 16);
        tile[d + 3] = 255;
      }
    });
    return tile;
  });
}
