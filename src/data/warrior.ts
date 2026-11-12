// Werte und Skills des Kriegers. Skills lösen automatisch aus (siehe SkillTrigger).
// Der Krieger hat kein Mana: Skills hängen nur an ihrer Bedingung und ihrer Abklingzeit.

export const WARRIOR = {
  name: 'Krieger',
  // Grundwerte auf Stufe 1.
  maxHp: 120,
  attackPower: 12,
  armor: 10,
  /** Zuwachs pro Stufe ab Stufe 2. Auf Stufe 10: 282 Leben, 39 Angriff, 46 Rüstung. */
  perLevel: { maxHp: 18, attackPower: 3, armor: 4 },
  /** 0.05 = 5 % Chance auf einen kritischen Treffer. */
  critChance: 0.05,
  /** Ein kritischer Treffer macht so viel mal Schaden. */
  critMultiplier: 1.5,
  /** Zeit zwischen zwei Auto-Angriffen in Millisekunden. */
  attackIntervalMs: 1800,
  /** Lebensregeneration außerhalb des Kampfes: Anteil des Maximums pro Sekunde. */
  hpRegenIdle: 0.05,
};

export type SkillId = 'wuchtschlag' | 'rundumschlag' | 'kriegsschrei' | 'schildwall';

/**
 * Wann ein Skill von selbst auslöst – Skills werden nie per Taste benutzt.
 * Zusätzlich muss der Skill freigeschaltet und abgeklungen sein.
 */
export type SkillTrigger =
  /** Jeder n-te Schlag der Figur wird zu diesem Skill (n: 5 = vier normale Schläge, dann der Skill). */
  | { type: 'everyNthHit'; n: number }
  /** Löst aus, wenn mindestens `count` angreifende Gegner im Umkreis `radius` (Welt-Pixel) stehen. */
  | { type: 'enemiesInRange'; count: number; radius: number }
  /** Löst aus, wenn das Leben im Kampf unter diesen Anteil fällt (0.3 = unter 30 %). */
  | { type: 'lowHealth'; hpFraction: number }
  /** Löst aus, sobald die Figur im Kampf ist: zu Kampfbeginn und danach immer, wenn der Skill wieder bereit ist. */
  | { type: 'inCombat' };

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
  /** Bild-Nummer des Symbols in assets/sprites/characters.png. */
  iconFrame: number;
  /** Abklingzeit in Millisekunden; 0 = keine, dann bestimmt allein die Bedingung den Takt. */
  cooldownMs: number;
  /** Ab dieser Stufe hat die Figur den Skill. */
  unlockLevel: number;
  trigger: SkillTrigger;
  effect: SkillEffect;
}

/** Reichweite des Rundumschlags in Welt-Pixeln – gilt für die Bedingung und für die Wirkung. */
const CLEAVE_RADIUS = 28;

/**
 * Die Skills des Kriegers in der Reihenfolge des Skill-Balkens. Treffen bei einem
 * Schlag mehrere Angriffs-Skills zu, gewinnt der, der weiter oben steht.
 *
 * Das sind Grundwerte: Loot und Talente sollen Bedingungen (z. B. jeder 4. statt
 * jeder 5. Schlag) und Wirkungen später verbessern können.
 */
export const SKILLS: SkillDef[] = [
  {
    id: 'wuchtschlag',
    name: 'Wuchtschlag',
    iconFrame: 117,
    cooldownMs: 0,
    unlockLevel: 1,
    trigger: { type: 'everyNthHit', n: 5 },
    effect: { type: 'strike', multiplier: 2.2 },
  },
  {
    id: 'rundumschlag',
    name: 'Rundumschlag',
    iconFrame: 118,
    cooldownMs: 10000,
    unlockLevel: 3,
    trigger: { type: 'enemiesInRange', count: 3, radius: CLEAVE_RADIUS },
    effect: { type: 'cleave', multiplier: 1.3, radius: CLEAVE_RADIUS },
  },
  {
    id: 'kriegsschrei',
    name: 'Kriegsschrei',
    iconFrame: 107,
    cooldownMs: 30000,
    unlockLevel: 5,
    trigger: { type: 'inCombat' },
    effect: { type: 'buff', durationMs: 10000, attackBonus: 0.3, damageTakenFactor: 1, tint: 0xffb09a },
  },
  {
    id: 'schildwall',
    name: 'Schildwall',
    iconFrame: 102,
    cooldownMs: 60000,
    unlockLevel: 8,
    trigger: { type: 'lowHealth', hpFraction: 0.3 },
    effect: { type: 'buff', durationMs: 8000, attackBonus: 0, damageTakenFactor: 0.4, tint: 0x9cc6ff },
  },
];

/** Ein Grundwert des Kriegers auf der Stufe `level`. */
export function warriorStat(stat: keyof typeof WARRIOR.perLevel, level: number): number {
  return WARRIOR[stat] + WARRIOR.perLevel[stat] * (level - 1);
}
