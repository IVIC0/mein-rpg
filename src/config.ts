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

/** So weit (in Kacheln) wird bei einem Klick auf ein Hindernis nach einem erreichbaren Feld gesucht. */
export const CLICK_SEARCH_RADIUS = 16;

/**
 * Kamera-Zoom passend zur Fenstergröße: immer ganzzahlig, damit Pixel scharf
 * bleiben. Ziel sind rund 40 × 22 sichtbare Kacheln.
 */
export function zoomForViewport(width: number, height: number): number {
  return Math.max(2, Math.round(Math.min(width / 640, height / 360)));
}
