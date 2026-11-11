// Zentrale Stellschrauben des Spiels.

/** Kantenlänge einer Kachel in Welt-Pixeln. */
export const TILE = 16;

/** Laufgeschwindigkeit der Spielfigur in Welt-Pixeln pro Sekunde (4,5 Kacheln/s). */
export const PLAYER_SPEED = 72;

/**
 * Halbe Breite der "Standfläche" der Figur in Welt-Pixeln. Muss kleiner als
 * eine halbe Kachel sein, damit die Figur durch 1 Kachel breite Lücken passt.
 */
export const BODY_RADIUS = 5;

/**
 * Ab dieser Dauer (Millisekunden) gilt ein Mausdruck nicht mehr als Klick,
 * sondern als "gedrückt halten": die Figur läuft dann direkt dem Mauszeiger nach.
 */
export const HOLD_DELAY_MS = 250;

/**
 * Kamera-Zoom passend zur Fenstergröße: immer ganzzahlig, damit Pixel scharf
 * bleiben. Ziel sind rund 40 × 22 sichtbare Kacheln.
 */
export function zoomForViewport(width: number, height: number): number {
  return Math.max(2, Math.round(Math.min(width / 640, height / 360)));
}

// ---------------------------------------------------------------- Kampf

/** Nahkampf-Reichweite in Welt-Pixeln (Mitte zu Mitte), gilt für Spieler und Gegner. */
export const MELEE_RANGE = 22;

/** So nah läuft ein Angreifer an sein Ziel heran, bevor er stehen bleibt. */
export const MELEE_APPROACH = 16;

/** So lange nach dem letzten Treffer gilt die Figur noch als "im Kampf" (Millisekunden). */
export const COMBAT_TIMEOUT_MS = 5000;

/** Ein getöteter Gegner erscheint nach dieser Zeit wieder an seinem Platz. */
export const ENEMY_RESPAWN_MS = 30000;

/** So lange bleibt die Figur nach dem Tod liegen, bevor sie im Dorf aufwacht. */
export const PLAYER_RESPAWN_MS = 3000;
