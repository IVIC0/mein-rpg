// Werte und Skills des Kriegers.

export const WARRIOR = {
  name: 'Krieger',
  // Grundwerte auf Stufe 1.
  maxHp: 120,
  maxMana: 50,
  attackPower: 12,
  armor: 10,
  /** Zuwachs pro Stufe ab Stufe 2. Auf Stufe 10: 282 Leben, 95 Mana, 39 Angriff, 46 Rüstung. */
  perLevel: { maxHp: 18, maxMana: 5, attackPower: 3, armor: 4 },
  /** 0.05 = 5 % Chance auf einen kritischen Treffer. */
  critChance: 0.05,
  /** Ein kritischer Treffer macht so viel mal Schaden. */
  critMultiplier: 1.5,
  /** Zeit zwischen zwei Auto-Angriffen in Millisekunden. */
  attackIntervalMs: 1800,
  /** Lebensregeneration außerhalb des Kampfes: Anteil des Maximums pro Sekunde. */
  hpRegenIdle: 0.05,
  /** Mana pro Sekunde im Kampf und außerhalb. */
  manaRegenCombat: 1,
  manaRegenIdle: 5,
};

export type SkillId = 'wuchtschlag' | 'rundumschlag' | 'kriegsschrei' | 'schildwall';

export type SkillEffect =
  /** Ein Schlag auf das gewählte Ziel. multiplier 2.2 = 220 % des normalen Schadens. */
  | { type: 'strike'; multiplier: number }
  /** Trifft alle Gegner im Umkreis `radius` (Welt-Pixel) um die Figur. */
  | { type: 'cleave'; multiplier: number; radius: number }
  /**
   * Zeitlich begrenzte Verstärkung. attackBonus 0.3 = +30 % Angriffskraft,
   * damageTakenFactor 0.4 = die Figur erleidet nur 40 % des Schadens.
   */
  | { type: 'buff'; durationMs: number; attackBonus: number; damageTakenFactor: number; tint: number };

export interface SkillDef {
  id: SkillId;
  name: string;
  /** Taste, wie sie im Skill-Balken steht. */
  key: string;
  /** Bild-Nummer des Symbols in assets/sprites/characters.png. */
  iconFrame: number;
  manaCost: number;
  cooldownMs: number;
  /** Ab dieser Stufe kann die Figur den Skill benutzen. */
  unlockLevel: number;
  description: string;
  effect: SkillEffect;
}

export const SKILLS: SkillDef[] = [
  {
    id: 'wuchtschlag',
    name: 'Wuchtschlag',
    key: '1',
    iconFrame: 117,
    manaCost: 10,
    cooldownMs: 6000,
    unlockLevel: 1,
    description: 'Schlägt das Ziel mit 220 % Schaden.',
    effect: { type: 'strike', multiplier: 2.2 },
  },
  {
    id: 'rundumschlag',
    name: 'Rundumschlag',
    key: '2',
    iconFrame: 118,
    manaCost: 15,
    cooldownMs: 10000,
    unlockLevel: 3,
    description: 'Trifft alle Gegner in Nahkampfreichweite mit 130 % Schaden.',
    effect: { type: 'cleave', multiplier: 1.3, radius: 28 },
  },
  {
    id: 'kriegsschrei',
    name: 'Kriegsschrei',
    key: '3',
    iconFrame: 107,
    manaCost: 15,
    cooldownMs: 30000,
    unlockLevel: 5,
    description: '10 Sekunden lang 30 % mehr Angriffskraft.',
    effect: { type: 'buff', durationMs: 10000, attackBonus: 0.3, damageTakenFactor: 1, tint: 0xffb09a },
  },
  {
    id: 'schildwall',
    name: 'Schildwall',
    key: '4',
    iconFrame: 102,
    manaCost: 20,
    cooldownMs: 60000,
    unlockLevel: 8,
    description: '8 Sekunden lang 60 % weniger erlittener Schaden.',
    effect: { type: 'buff', durationMs: 8000, attackBonus: 0, damageTakenFactor: 0.4, tint: 0x9cc6ff },
  },
];

/** Ein Grundwert des Kriegers auf der Stufe `level`. */
export function warriorStat(stat: keyof typeof WARRIOR.perLevel, level: number): number {
  return WARRIOR[stat] + WARRIOR.perLevel[stat] * (level - 1);
}
