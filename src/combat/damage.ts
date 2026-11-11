export interface Hit {
  amount: number;
  crit: boolean;
}

/**
 * Würfelt einen Treffer aus.
 *
 *   Schaden = Angriffskraft × Skill-Faktor × Streuung (85–115 %) × 100 / (100 + Rüstung)
 *
 * 100 Rüstung halbieren den Schaden also, 0 Rüstung lassen alles durch.
 * Ein kritischer Treffer multipliziert das Ergebnis mit `critMultiplier`.
 * Jeder Treffer macht mindestens 1 Schaden.
 */
export function rollHit(attackPower: number, armor: number, multiplier = 1, critChance = 0, critMultiplier = 1.5): Hit {
  const spread = 0.85 + Math.random() * 0.3;
  const crit = Math.random() < critChance;
  let amount = (attackPower * multiplier * spread * 100) / (100 + armor);
  if (crit) amount *= critMultiplier;
  return { amount: Math.max(1, Math.round(amount)), crit };
}
