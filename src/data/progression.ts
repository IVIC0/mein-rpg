import type { EnemyRank } from './loot';

// Leveln: Levelkurve, EP pro Gegner und EP-/Gold-Verlust beim Tod.
// Der Wertezuwachs pro Stufe steht bei der Klasse (warrior.ts) bzw. den Gegnern (enemies.ts).

/** Höchste Stufe in Version 1. Langfristig geplant: 60. */
export const MAX_LEVEL = 10;

/**
 * So viele EP braucht man für den Aufstieg zur nächsten Stufe.
 * Erster Eintrag = von Stufe 1 auf 2, letzter = von Stufe 9 auf 10.
 * Ausgelegt auf rund 500 Gegner bzw. 2–3 Stunden bis Stufe 10.
 */
export const XP_TO_NEXT = [120, 300, 625, 1050, 1750, 2600, 3600, 5000, 6600];

/** EP für einen besiegten Gegner: base + perLevel × Stufe des Gegners (Stufe 1 = 15 EP). */
export const ENEMY_XP = { base: 10, perLevel: 5 };

/**
 * Schwache Gegner bringen weniger EP. Schlüssel = um wie viele Stufen die Figur
 * über dem Gegner liegt, Wert = Anteil der EP. Bis 2 Stufen Unterschied gibt es alles.
 */
export const XP_FACTOR_BY_LEVEL_LEAD: Record<number, number> = { 3: 0.75, 4: 0.5, 5: 0.25 };
/** Anteil der EP bei noch größerem Vorsprung. */
export const XP_FACTOR_TRIVIAL = 0.1;

/** Elite und Boss geben ein Vielfaches an EP. */
export const XP_RANK_FACTOR: Record<EnemyRank, number> = { normal: 1, elite: 3, boss: 10 };

/** Beim Tod verliert die Figur diesen Anteil der EP, die ihre aktuelle Stufe braucht. Nie Stufenverlust. */
export const DEATH_XP_LOSS = 0.05;

/** Beim Tod verliert die Figur außerdem diesen Anteil ihres Goldes. Items gehen nie verloren. */
export const DEATH_GOLD_LOSS = 0.05;

/** EP bis zur nächsten Stufe; auf der Maximalstufe 0. */
export function xpToNext(level: number): number {
  return level >= MAX_LEVEL ? 0 : XP_TO_NEXT[level - 1];
}

/** EP, die eine Figur der Stufe `playerLevel` für einen Gegner der Stufe `enemyLevel` bekommt. */
export function xpForKill(enemyLevel: number, playerLevel: number, rank: EnemyRank = 'normal'): number {
  const full = (ENEMY_XP.base + ENEMY_XP.perLevel * enemyLevel) * XP_RANK_FACTOR[rank];
  const lead = playerLevel - enemyLevel;
  const factor = lead <= 2 ? 1 : (XP_FACTOR_BY_LEVEL_LEAD[lead] ?? XP_FACTOR_TRIVIAL);
  return Math.max(1, Math.round(full * factor));
}

/** Bringt ein Gegner dieser Stufe der Figur nur noch verringerte EP? */
export function isTrivial(enemyLevel: number, playerLevel: number): boolean {
  return playerLevel - enemyLevel > 2;
}
