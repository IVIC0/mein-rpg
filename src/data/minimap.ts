// Minimap: Größe, Ausschnitt und Farben der Punkte.
// Die Farben des Geländes kommen von selbst aus den Kacheln der Karte (src/ui/Minimap.ts).

import type { EnemyRank } from './loot';

export const MINIMAP = {
  /** Kantenlänge der Minimap in Bildschirm-Pixeln (bei Größe 100 %). */
  size: 140,
  /** So viele Kacheln zeigt sie in der Breite und Höhe. Die Figur steht in der Mitte. */
  tilesVisible: 35,
  /** Farbe außerhalb der Karte. */
  background: '#10160f',
  /** Die eigene Figur. */
  playerColor: '#ffffff',
  playerRadius: 3,
  /** Der Händler. */
  merchantColor: '#4fc3ff',
  merchantRadius: 3,
  /** Gegner je Rang: Farbe und Größe des Punkts. */
  enemies: {
    normal: { color: '#ff4a3d', radius: 2 },
    elite: { color: '#ffc83d', radius: 3 },
    boss: { color: '#d23bff', radius: 4 },
  } as Record<EnemyRank, { color: string; radius: number }>,
};
