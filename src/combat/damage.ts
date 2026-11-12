import { ARMOR } from '../config';

export interface Hit {
  amount: number;
  crit: boolean;
}

/**
 * Anteil des Schadens, den `armor` Rüstung abfängt (0.3 = 30 % weniger Schaden).
 * Jeder weitere Punkt bringt etwas weniger, mehr als ARMOR.maxReduction geht nie.
 * Beispiele: 46 Rüstung = 24 %, 100 = 37,5 %, 200 = 50 %.
 */
export function damageReduction(armor: number): number {
  if (armor <= 0) return 0;
  return (ARMOR.maxReduction * armor) / (armor + ARMOR.halfAt);
}

/**
 * Würfelt einen Treffer aus.
 *
 *   Schaden = Angriffskraft × Skill-Faktor × Streuung (85–115 %) × (1 − Schadensreduktion)
 *
 * Die Schadensreduktion kommt aus der Rüstung des Getroffenen (siehe damageReduction).
 * Ein kritischer Treffer multipliziert das Ergebnis mit `critMultiplier`.
 * Jeder Treffer macht mindestens 1 Schaden.
 */
export function rollHit(attackPower: number, armor: number, multiplier = 1, critChance = 0, critMultiplier = 1.5): Hit {
  const spread = 0.85 + Math.random() * 0.3;
  const crit = Math.random() < critChance;
  let amount = attackPower * multiplier * spread * (1 - damageReduction(armor));
  if (crit) amount *= critMultiplier;
  return { amount: Math.max(1, Math.round(amount)), crit };
}
