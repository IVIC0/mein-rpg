// Gegnertypen. Wo welche Gegner stehen, legt die Karte fest (tools/build-map.mjs,
// Liste ENEMY_GROUPS) – der Schlüssel hier ist der Name dort.

export interface EnemyDef {
  name: string;
  level: number;
  /** Bild-Nummer in assets/sprites/characters.png. */
  frame: number;
  maxHp: number;
  attackPower: number;
  armor: number;
  /** Zeit zwischen zwei Angriffen in Millisekunden. */
  attackIntervalMs: number;
  /** Laufgeschwindigkeit in Welt-Pixeln pro Sekunde (Spielfigur: 72). */
  speed: number;
  /** Sieht der Gegner die Figur in diesem Umkreis (Welt-Pixel), greift er an. */
  aggroRadius: number;
  /** Weiter als so weit (Welt-Pixel) entfernt er sich nicht von seinem Platz. */
  leashRadius: number;
}

export const ENEMIES: Record<string, EnemyDef> = {
  ratte: {
    name: 'Riesenratte',
    level: 1,
    frame: 123,
    maxHp: 30,
    attackPower: 5,
    armor: 0,
    attackIntervalMs: 1600,
    speed: 62,
    aggroRadius: 48,
    leashRadius: 176,
  },
  spinne: {
    name: 'Waldspinne',
    level: 2,
    frame: 122,
    maxHp: 55,
    attackPower: 8,
    armor: 5,
    attackIntervalMs: 1700,
    speed: 58,
    aggroRadius: 64,
    leashRadius: 176,
  },
  wegelagerer: {
    name: 'Wegelagerer',
    level: 3,
    frame: 112,
    maxHp: 90,
    attackPower: 12,
    armor: 15,
    attackIntervalMs: 2000,
    speed: 54,
    aggroRadius: 72,
    leashRadius: 192,
  },
};
