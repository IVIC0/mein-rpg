// Gegnertypen. Wo welche Gegner mit welcher Stufe stehen, legt die Karte fest
// (tools/build-map.mjs, Liste ENEMY_GROUPS) – der Schlüssel hier ist der Name dort.
//
// Leben, Angriff und Rüstung gelten für Stufe 1 und wachsen mit der Stufe (ENEMY_SCALING).

import type { EnemyRank } from './loot';

export interface EnemyDef {
  name: string;
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
  /** Fester Rang, z. B. 'boss'. Ohne Angabe: normal, mit kleiner Chance Elite (src/data/elites.ts). */
  rank?: EnemyRank;
}

export const ENEMIES: Record<string, EnemyDef> = {
  ratte: {
    name: 'Riesenratte',
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
    frame: 122,
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
    frame: 112,
    maxHp: 64,
    attackPower: 9,
    armor: 11,
    attackIntervalMs: 2000,
    speed: 54,
    aggroRadius: 72,
    leashRadius: 192,
  },
  // Boss der Ruine. Die Grundwerte entsprechen dem Wegelagerer; was ihn zum Boss macht
  // (6× Leben, mehr Angriff und Rüstung, Größe), steht in RANKS in src/data/elites.ts.
  raeuberhauptmann: {
    name: 'Räuberhauptmann',
    frame: 111,
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
