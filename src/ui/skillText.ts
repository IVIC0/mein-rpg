import type { SkillEffect, SkillTrigger } from '../data/warrior';

// Beschreibungen für den Tooltip im Skill-Balken. Sie werden aus den Werten in
// src/data/warrior.ts gebaut – ändert sich dort eine Zahl, stimmt der Text von selbst.

/** Wann der Skill auslöst, z. B. "Jeder 5. Schlag". */
export function describeTrigger(trigger: SkillTrigger): string {
  switch (trigger.type) {
    case 'everyNthHit':
      return `Jeder ${trigger.n}. Schlag`;
    case 'enemiesInRange':
      return `Ab ${trigger.count} Gegnern in Reichweite`;
    case 'lowHealth':
      return `Unter ${percent(trigger.hpFraction)} % Leben`;
    case 'inCombat':
      return 'Zu Kampfbeginn';
  }
}

/** Was der Skill bewirkt, z. B. "Schlägt das Ziel mit 220 % Schaden." */
export function describeEffect(effect: SkillEffect): string {
  switch (effect.type) {
    case 'strike':
      return `Schlägt das Ziel mit ${percent(effect.multiplier)} % Schaden.`;
    case 'cleave':
      return `Trifft alle Gegner in Reichweite mit ${percent(effect.multiplier)} % Schaden.`;
    case 'buff': {
      const parts: string[] = [];
      if (effect.attackBonus > 0) parts.push(`${percent(effect.attackBonus)} % mehr Angriffskraft`);
      if (effect.damageTakenFactor < 1) parts.push(`${percent(1 - effect.damageTakenFactor)} % weniger erlittener Schaden`);
      return `${effect.durationMs / 1000} Sekunden lang ${parts.join(' und ')}.`;
    }
  }
}

function percent(fraction: number): number {
  return Math.round(fraction * 100);
}
