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

/**
 * Rüstung senkt erlittenen Schaden – mit abnehmender Wirkung:
 *   Schadensreduktion = maxReduction × Rüstung / (Rüstung + halfAt)
 * Mehr als `maxReduction` (0.75 = 75 %) geht nie. Bei `halfAt` Rüstung ist die Hälfte
 * davon erreicht (100 Rüstung = 37,5 %). Gilt für die Figur und für Gegner.
 */
export const ARMOR = { maxReduction: 0.75, halfAt: 100 };

/** Ein getöteter Gegner erscheint nach dieser Zeit wieder an seinem Platz. */
export const ENEMY_RESPAWN_MS = 30000;

/** Ein Boss braucht länger, bis er wieder da ist (5 Minuten). */
export const BOSS_RESPAWN_MS = 300000;

/** So lange bleibt die Figur nach dem Tod liegen, bevor sie im Dorf aufwacht. */
export const PLAYER_RESPAWN_MS = 3000;

/** Bemerkt ein Gegner die Figur, zögert er so lange vor dem ersten Schlag (Millisekunden). */
export const ENEMY_FIRST_STRIKE_MS = 600;

// ---------------------------------------------------------------- Treffer-Feedback

/** Ausfallschritt beim Zuschlagen: so weit (Welt-Pixel) ruckt die Figur Richtung Ziel und zurück. */
export const PLAYER_LUNGE = 6;
export const ENEMY_LUNGE = 4;
/** Dauer einer Richtung des Ausfallschritts (hin bzw. zurück) in Millisekunden. */
export const LUNGE_MS = 80;

/**
 * Waffenschwung der Spielfigur je Angriffsart: `arcDeg` = Bogen in Grad, den die
 * Waffe durchläuft, `ms` = Dauer, `lunge` = Ausfallschritt in Welt-Pixeln.
 */
export const SWING = {
  auto: { arcDeg: 140, ms: 180, lunge: PLAYER_LUNGE },
  strike: { arcDeg: 220, ms: 220, lunge: 9 },
  cleave: { arcDeg: 360, ms: 300, lunge: 0 },
};
/** So lange bleibt die Waffe am Ende des Schwungs noch sichtbar (Millisekunden). */
export const SWING_HOLD_MS = 60;
/** Schwung-Spur (heller Bogen): Abstand von der Figur und Strichbreite in Welt-Pixeln. */
export const SWING_RADIUS = 15;
export const SWING_TRAIL_WIDTH = 3;
/** Bild-Nummer der Waffe in characters.png. */
export const SWING_WEAPON_FRAME = 104;

/** So lange blitzt eine getroffene Figur weiß auf (Millisekunden). */
export const HIT_FLASH_MS = 120;
/** Rückstoß eines getroffenen Gegners: Weite (Welt-Pixel) und Dauer bis er wieder gerade steht. */
export const KNOCKBACK_DISTANCE = 4;
export const KNOCKBACK_MS = 160;
