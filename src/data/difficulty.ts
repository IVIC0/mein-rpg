// Schwierigkeit: zwei Regler (Gegnerleben, Gegnerschaden), vier Knöpfe als Abkürzung
// und die Belohnung für höhere Schwierigkeit. Die Wahl steht im Spielstand (pro Slot).

/** Die Schwierigkeit eines Spielstands in Prozent (100 = normal). */
export interface Difficulty {
  /** Leben aller Gegner. */
  enemyHp: number;
  /** Schaden aller Gegner. */
  enemyDamage: number;
}

/** Grenzen und Schrittweite beider Regler in Prozent. */
export const DIFFICULTY_RANGE = { min: 50, max: 300, step: 10 };

export const DEFAULT_DIFFICULTY: Difficulty = { enemyHp: 100, enemyDamage: 100 };

/** Die vier Knöpfe: Sie stellen beide Regler auf einmal. */
export const DIFFICULTY_PRESETS: { label: string; values: Difficulty }[] = [
  { label: 'Leicht', values: { enemyHp: 75, enemyDamage: 75 } },
  { label: 'Normal', values: { enemyHp: 100, enemyDamage: 100 } },
  { label: 'Schwer', values: { enemyHp: 150, enemyDamage: 130 } },
  { label: 'Brutal', values: { enemyHp: 220, enemyDamage: 170 } },
];

/**
 * Belohnung: Liegen BEIDE Regler über 100 %, gibt es mehr EP und Gold. Es zählt der
 * niedrigere Regler: je `perPoints` Prozentpunkte über 100 gibt es `bonus` dazu,
 * höchstens `maxBonus`. Beispiel Schwer (150 / 130): 30 Punkte → +6 %.
 * Unter 100 % gibt es keinen Abzug. Drop-Chancen bleiben immer gleich.
 */
export const DIFFICULTY_REWARD = { perPoints: 10, bonus: 0.02, maxBonus: 0.4 };

/** Zuschlag auf EP und Gold als Anteil (0.06 = +6 %). */
export function rewardBonus(difficulty: Difficulty): number {
  const lower = Math.min(difficulty.enemyHp, difficulty.enemyDamage);
  if (lower <= 100) return 0;
  const steps = Math.floor((lower - 100) / DIFFICULTY_REWARD.perPoints);
  return Math.min(DIFFICULTY_REWARD.maxBonus, steps * DIFFICULTY_REWARD.bonus);
}

/** Bringt einen Regler-Wert in die erlaubten Grenzen und auf die Schrittweite; Unbrauchbares wird 100. */
export function cleanDifficultyValue(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 100;
  const { min, max, step } = DIFFICULTY_RANGE;
  return Math.min(max, Math.max(min, Math.round(value / step) * step));
}
