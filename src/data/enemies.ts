// Gegnertypen. Wo welche Gegner mit welcher Stufe stehen, legt der Bauplan der Zone fest
// (tools/zones/<zone>.mjs, Liste `enemyGroups`) – der Schlüssel hier ist der Name dort.
//
// Leben, Angriff und Rüstung gelten für Stufe 1 und wachsen mit der Stufe (ENEMY_SCALING).

import type { EnemyRank } from './loot';
import type { SpriteName } from './sprites';

export interface EnemyDef {
  name: string;
  /** Name des Bildes in src/data/sprites.ts. */
  sprite: SpriteName;
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
  /** Fester Rang, z. B. 'boss'. Ohne Angabe: normal, mit kleiner Chance Elite (src/data/elites.ts). */
  rank?: EnemyRank;
}

export const ENEMIES: Record<string, EnemyDef> = {
  ratte: {
    name: 'Riesenratte',
    sprite: 'ratte',
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
    sprite: 'spinne',
    maxHp: 45,
    attackPower: 7,
    armor: 3,
    attackIntervalMs: 1700,
    speed: 58,
    aggroRadius: 64,
    leashRadius: 176,
  },
  wegelagerer: {
    name: 'Wegelagerer',
    sprite: 'wegelagerer',
    maxHp: 64,
    attackPower: 9,
    armor: 11,
    attackIntervalMs: 2000,
    speed: 54,
    aggroRadius: 72,
    leashRadius: 192,
  },
  // ---- Neu seit Meilenstein 11 (alle Werte sind Startwerte fürs Balancing) ----
  // Wolf: schnell, beißt oft, sieht die Figur von Weitem. Das Bild ist der dunkle Hund aus
  // "Ninja Adventure" (einen Wolf hat kein Pack); mit sprite: 'hyaene' wäre es die Hyäne.
  wolf: {
    name: 'Wolf',
    sprite: 'wolf',
    maxHp: 38,
    attackPower: 6.5,
    armor: 1,
    attackIntervalMs: 1400,
    speed: 62,
    aggroRadius: 80,
    leashRadius: 208,
  },
  // Wildschwein: zäh und langsam, schlägt selten, aber hart.
  wildschwein: {
    name: 'Wildschwein',
    sprite: 'wildschwein',
    maxHp: 60,
    attackPower: 8.5,
    armor: 6,
    attackIntervalMs: 2200,
    speed: 56,
    aggroRadius: 56,
    leashRadius: 176,
  },
  // Fledermaus: nur in der Höhle. Wenig Leben, schlägt schnell, kommt in Gruppen.
  fledermaus: {
    name: 'Fledermaus',
    sprite: 'fledermaus',
    maxHp: 26,
    attackPower: 5.5,
    armor: 0,
    attackIntervalMs: 1200,
    speed: 62,
    aggroRadius: 72,
    leashRadius: 160,
  },
  goblin: {
    name: 'Goblin',
    sprite: 'goblin',
    maxHp: 50,
    attackPower: 8,
    armor: 6,
    attackIntervalMs: 1700,
    speed: 60,
    aggroRadius: 72,
    leashRadius: 192,
  },
  // Goblin-Schleuderer: wenig Leben, harter Treffer. Er wirft erst ab Meilenstein 13
  // (Fernkampf) – bis dahin kämpft er im Nahkampf wie alle anderen.
  schleuderer: {
    name: 'Goblin-Schleuderer',
    sprite: 'goblin-schleuderer',
    maxHp: 40,
    attackPower: 9.5,
    armor: 3,
    attackIntervalMs: 1900,
    speed: 56,
    aggroRadius: 88,
    leashRadius: 192,
  },
  // Boss der Ruine. Die Grundwerte entsprechen dem Wegelagerer; was ihn zum Boss macht
  // (6× Leben, mehr Angriff und Rüstung, Größe), steht in RANKS in src/data/elites.ts.
  raeuberhauptmann: {
    name: 'Räuberhauptmann',
    sprite: 'raeuberhauptmann',
    maxHp: 64,
    attackPower: 9,
    armor: 11,
    attackIntervalMs: 2000,
    speed: 54,
    aggroRadius: 80,
    leashRadius: 192,
    rank: 'boss',
  },
};

/**
 * Zuwachs pro Stufe über 1: Leben und Angriff als Anteil des Grundwerts
 * (0.2 = +20 % pro Stufe), Rüstung als fester Wert.
 * Beispiel Wegelagerer Stufe 9: 64 × (1 + 0.2 × 8) = 166 Leben.
 */
export const ENEMY_SCALING = { hpPerLevel: 0.2, attackPerLevel: 0.15, armorPerLevel: 2 };

/** Leben, Angriff und Rüstung eines Gegnertyps auf der Stufe `level`. */
export function enemyStats(def: EnemyDef, level: number): { maxHp: number; attackPower: number; armor: number } {
  const steps = level - 1;
  return {
    maxHp: Math.round(def.maxHp * (1 + ENEMY_SCALING.hpPerLevel * steps)),
    attackPower: def.attackPower * (1 + ENEMY_SCALING.attackPerLevel * steps),
    armor: def.armor + ENEMY_SCALING.armorPerLevel * steps,
  };
}
