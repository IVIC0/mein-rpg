// Elite- und Boss-Gegner: Chance, Wertezuwachs je Rang und die Elite-Eigenschaften.
// Was sie fallen lassen, steht in src/data/loot.ts (DROP_TABLES), die EP in progression.ts.
// Alle Zahlen hier sind Startwerte fürs Balancing.

import type { EnemyRank } from './loot';

/** Chance, dass ein normaler Gegner beim Erscheinen (auch beim Respawn) zur Elite wird (0.05 = 5 %). */
export const ELITE_CHANCE = 0.05;

/**
 * So viele Eigenschaften hat eine Elite: Anteile in Prozent, zusammen 100.
 * Erster Eintrag = 1 Eigenschaft, zweiter = 2, dritter = 3.
 */
export const ELITE_TRAIT_COUNT_WEIGHTS = [60, 30, 10];

export interface RankDef {
  /** Steht im Zielrahmen und auf dem Namensschild vor dem Namen. Leer = nichts. */
  label: string;
  /** Faktor auf das Leben des Gegnertyps (3 = dreimal so viel). */
  hpFactor: number;
  /** Faktor auf den Angriff. */
  attackFactor: number;
  /** Feste Rüstung obendrauf. Wegelagerer Stufe 10: 29 → Elite 44 (23 % Reduktion) → Boss 59 (28 %). */
  armorBonus: number;
  /** Größe des Bildes (1 = normal). */
  scale: number;
  /** Farbe des Scheins unter der Figur; null = kein Schein. */
  auraColor: number | null;
}

export const RANKS: Record<EnemyRank, RankDef> = {
  normal: { label: '', hpFactor: 1, attackFactor: 1, armorBonus: 0, scale: 1, auraColor: null },
  elite: { label: 'Elite', hpFactor: 3, attackFactor: 1.25, armorBonus: 15, scale: 1.5, auraColor: 0xffc83d },
  boss: { label: 'Boss', hpFactor: 6, attackFactor: 1.6, armorBonus: 30, scale: 2, auraColor: 0xd23bff },
};

export type TraitId = 'schnell' | 'gepanzert' | 'vampirisch' | 'explosiv' | 'rasend' | 'regenerierend';

export interface TraitDef {
  id: TraitId;
  /** Steht unter dem Namen der Elite. */
  name: string;
}

/** Aus dieser Liste würfelt eine Elite ihre 1–3 Eigenschaften (jede höchstens einmal). */
export const TRAITS: TraitDef[] = [
  { id: 'schnell', name: 'Schnell' },
  { id: 'gepanzert', name: 'Gepanzert' },
  { id: 'vampirisch', name: 'Vampirisch' },
  { id: 'explosiv', name: 'Explosiv' },
  { id: 'rasend', name: 'Rasend' },
  { id: 'regenerierend', name: 'Regenerierend' },
];

/** Was die Eigenschaften bewirken. */
export const TRAIT_VALUES = {
  /** Schnell: läuft schneller (bleibt aber langsamer als die Figur) und schlägt öfter zu. */
  schnell: { speedFactor: 1.15, attackIntervalFactor: 0.8 },
  /** Gepanzert: zusätzliche Rüstung = base + perLevel × Stufe (Stufe 10: +50). */
  gepanzert: { base: 20, perLevel: 3 },
  /** Vampirisch: heilt sich um diesen Anteil des Schadens, den die Elite austeilt. */
  vampirisch: { lifeSteal: 0.5 },
  /**
   * Explosiv: `delayMs` nach dem Tod explodiert die Elite. Wer dann noch im Umkreis `radius`
   * (Welt-Pixel) steht, kassiert einen Treffer mit `attackFactor` × Angriff (Rüstung zählt).
   */
  explosiv: { delayMs: 1500, radius: 30, attackFactor: 2.5 },
  /** Rasend: unter `hpFraction` Leben steigt der Angriff um `attackBonus` (0.5 = +50 %). */
  rasend: { hpFraction: 0.3, attackBonus: 0.5, tint: 0xff7a6a },
  /** Regenerierend: heilt pro Sekunde diesen Anteil des maximalen Lebens (auch im Kampf). */
  regenerierend: { hpPerSecond: 0.01 },
};

/** Würfelt die Eigenschaften einer Elite: erst die Anzahl, dann zufällige aus der Liste. */
export function rollTraits(): TraitId[] {
  const total = ELITE_TRAIT_COUNT_WEIGHTS.reduce((sum, weight) => sum + weight, 0);
  let roll = Math.random() * total;
  let count = 1;
  for (let i = 0; i < ELITE_TRAIT_COUNT_WEIGHTS.length; i++) {
    roll -= ELITE_TRAIT_COUNT_WEIGHTS[i];
    if (roll < 0) {
      count = i + 1;
      break;
    }
  }
  // Liste mischen und die ersten `count` nehmen.
  const pool = TRAITS.map((trait) => trait.id);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

/** Name einer Eigenschaft für die Anzeige. */
export function traitName(id: TraitId): string {
  return TRAITS.find((trait) => trait.id === id)?.name ?? id;
}
