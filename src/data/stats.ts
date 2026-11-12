// Die Werte, die Items verbessern können, und was ein Attributpunkt bringt.

/**
 * Attribute (Stärke, Ausdauer, Geschick) wirken nicht direkt, sondern werden
 * in die anderen Werte umgerechnet – siehe ATTRIBUTE_EFFECTS.
 */
export type AttributeId = 'strength' | 'stamina' | 'agility';

export type StatId =
  | 'attackPower'
  | 'maxHp'
  | 'armor'
  | 'critChance'
  | 'critDamage'
  | 'attackSpeed'
  | 'hpRegen'
  | 'lifeSteal'
  | AttributeId;

/** Ein Satz Werte, z. B. die Summe aller angelegten Items. */
export type Stats = Record<StatId, number>;

interface StatInfo {
  name: string;
  /** Wird an die Zahl gehängt, z. B. " %". */
  unit: string;
  /** Nachkommastellen: 0 = ganze Zahlen. */
  decimals: number;
}

/** Name und Schreibweise jedes Werts – in dieser Reihenfolge erscheinen sie auch in Tooltips. */
export const STATS: Record<StatId, StatInfo> = {
  attackPower: { name: 'Angriffskraft', unit: '', decimals: 0 },
  maxHp: { name: 'Leben', unit: '', decimals: 0 },
  armor: { name: 'Rüstung', unit: '', decimals: 0 },
  critChance: { name: 'Krit-Chance', unit: ' %', decimals: 1 },
  critDamage: { name: 'Krit-Schaden', unit: ' %', decimals: 0 },
  attackSpeed: { name: 'Angriffstempo', unit: ' %', decimals: 0 },
  hpRegen: { name: 'Leben pro Sekunde', unit: '', decimals: 1 },
  lifeSteal: { name: 'Lebensraub', unit: ' %', decimals: 0 },
  strength: { name: 'Stärke', unit: '', decimals: 0 },
  stamina: { name: 'Ausdauer', unit: '', decimals: 0 },
  agility: { name: 'Geschick', unit: '', decimals: 0 },
};

export const STAT_IDS = Object.keys(STATS) as StatId[];

/**
 * Was ein Attributpunkt bringt: 1 Stärke = 1 Angriffskraft, 1 Ausdauer = 6 Leben,
 * 1 Geschick = 0,5 Prozentpunkte Krit-Chance.
 * Intelligenz fehlt: der Krieger hat kein Mana. Sie kommt eventuell mit dem Magier.
 */
export const ATTRIBUTE_EFFECTS: Record<AttributeId, { stat: StatId; perPoint: number }> = {
  strength: { stat: 'attackPower', perPoint: 1 },
  stamina: { stat: 'maxHp', perPoint: 6 },
  agility: { stat: 'critChance', perPoint: 0.5 },
};

export const ATTRIBUTE_IDS = Object.keys(ATTRIBUTE_EFFECTS) as AttributeId[];

/** Ein Satz Werte, in dem alles auf 0 steht. */
export function emptyStats(): Stats {
  const stats = {} as Stats;
  for (const id of STAT_IDS) stats[id] = 0;
  return stats;
}

/**
 * Rechnet die Attribute in ihre Wirkung um. Im Ergebnis stehen die Attribute auf 0,
 * dafür sind Angriffskraft, Leben und Krit-Chance entsprechend höher.
 */
export function withAttributesApplied(stats: Stats): Stats {
  const result = { ...stats };
  for (const id of ATTRIBUTE_IDS) {
    const effect = ATTRIBUTE_EFFECTS[id];
    result[effect.stat] += stats[id] * effect.perPoint;
    result[id] = 0;
  }
  return result;
}

/** Rundet einen Wert auf die Nachkommastellen, die für ihn üblich sind. */
export function roundStat(id: StatId, value: number): number {
  const factor = 10 ** STATS[id].decimals;
  return Math.round(value * factor) / factor;
}

/** Schreibt einen Wert mit deutschem Komma und Einheit, z. B. "2,5 %". */
export function formatStatValue(id: StatId, value: number): string {
  const info = STATS[id];
  return roundStat(id, value).toLocaleString('de-DE', { maximumFractionDigits: info.decimals }) + info.unit;
}

/** Schreibt eine Spanne, z. B. "3–5 %". */
export function formatStatRange(id: StatId, min: number, max: number): string {
  return `${roundStat(id, min).toLocaleString('de-DE')}–${formatStatValue(id, max)}`;
}

/** Schreibt eine Veränderung mit Vorzeichen und Namen, z. B. "+7 Stärke" oder "−2,5 % Krit-Chance". */
export function formatStatChange(id: StatId, value: number): string {
  const sign = value < 0 ? '−' : '+';
  return `${sign}${formatStatValue(id, Math.abs(value))} ${STATS[id].name}`;
}
