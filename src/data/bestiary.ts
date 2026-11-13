// Jagdbuch: Ränge je Gegnertyp, ihre Boni und die Sammelseiten der Zonen.
// Die Regeln (zählen, Rang ausrechnen) stehen in src/bestiary/Bestiary.ts, das Fenster in
// src/ui/BestiaryWindow.ts. Im Spielstand stehen nur die Zähler – Ränge und Boni werden daraus
// berechnet. Alle Zahlen hier lassen sich also ändern, ohne Spielstände anzufassen.
// Alle Zahlen sind Startwerte fürs Balancing.

/** Eine besiegte Elite zählt so viel wie so viele normale Gegner ihres Typs. */
export const ELITE_KILL_WEIGHT = 5;

/** Was ein Rang gegen den Gegnertyp bringt. Alle Angaben sind Anteile (0.03 = 3 %). */
export interface TypeBonus {
  /** Mehr Schaden gegen diesen Typ. */
  damageDealt: number;
  /** Weniger Schaden von diesem Typ. */
  damageTaken: number;
  /** Mehr Gold von diesem Typ. */
  gold: number;
  /** Höhere Drop-Chance bei diesem Typ (0.1 macht aus 6 % Chance 6,6 %). */
  dropChance: number;
}

export interface BestiaryRankDef {
  /** So heißt der Rang im Jagdbuch. */
  name: string;
  /** So viele besiegte Gegner des Typs braucht der Rang (wenn die Seite nichts anderes sagt). */
  kills: number;
  /** Was der Rang bringt – als Text für das Fenster. */
  reward: string;
  /** Was der Rang bringt – als Zahlen. Die Boni aller erreichten Ränge zählen zusammen. */
  bonus: Partial<TypeBonus>;
}

/** Die fünf Ränge eines Gegnertyps, vom ersten zum letzten. */
export const BESTIARY_RANKS: BestiaryRankDef[] = [
  { name: 'Gesichtet', kills: 10, reward: 'Eintrag: Werte und Fundorte', bonus: {} },
  { name: 'Bekannt', kills: 50, reward: '+3 % Schaden gegen diesen Typ', bonus: { damageDealt: 0.03 } },
  { name: 'Erfahren', kills: 150, reward: '3 % weniger Schaden von diesem Typ', bonus: { damageTaken: 0.03 } },
  { name: 'Jäger', kills: 350, reward: '+10 % Gold von diesem Typ', bonus: { gold: 0.1 } },
  { name: 'Meisterjäger', kills: 750, reward: '+10 % Drop-Chance bei diesem Typ', bonus: { dropChance: 0.1 } },
];

/** Was eine Sammelseite dauerhaft bringt – gilt überall, nicht nur in ihrer Zone. Anteile (0.01 = 1 %). */
export interface PageBonus {
  maxHp: number;
  attackPower: number;
}

export interface PageTierDef {
  /** So heißt die Stufe der Seite. */
  name: string;
  /** Alle Gegnertypen der Seite müssen mindestens diesen Rang haben (1–5). */
  rank: number;
  reward: string;
  bonus: Partial<PageBonus>;
}

/** Die drei Stufen einer Sammelseite. Die Boni aller erreichten Stufen zählen zusammen. */
export const PAGE_TIERS: PageTierDef[] = [
  { name: 'Bronze', rank: 2, reward: '+1 % Leben', bonus: { maxHp: 0.01 } },
  { name: 'Silber', rank: 3, reward: '+1 % Angriffskraft', bonus: { attackPower: 0.01 } },
  { name: 'Gold', rank: 5, reward: '+1 % Leben und +1 % Angriffskraft', bonus: { maxHp: 0.01, attackPower: 0.01 } },
];

/** Die Bosse-Zeile einer Seite: so viele Siege braucht Eintrag / Werte und Eigenschaften / Stern. Ohne Bonus. */
export const BOSS_STEPS = { entry: 1, details: 5, star: 20 };

export interface BestiaryPageDef {
  /** Schlüssel der Seite. */
  id: string;
  /** So heißt die Seite (der Reiter im Fenster). */
  name: string;
  /** Die Gegnertypen der Seite (Schlüssel aus src/data/enemies.ts), in dieser Reihenfolge im Fenster. */
  types: string[];
  /**
   * Die Bosse-Zeile: Zonen-Bosse (Gegnertyp aus src/data/enemies.ts) und feste Elites
   * (Schlüssel aus NAMED_ELITES in src/data/elites.ts).
   */
  bosses: string[];
  /** Eigene Schwellen für die fünf Ränge dieser Seite. Ohne Angabe gelten die aus BESTIARY_RANKS. */
  kills?: number[];
}

/**
 * Eine Seite je Zone. Die Spinnenhöhle gehört zu Grünwald.
 * Jeder Gegnertyp, der in einer Karte steht, muss auf genau einer Seite stehen (Bosse in der
 * Bosse-Zeile) – das prüft das Spiel beim Start (src/bestiary/fieldGuide.ts).
 */
export const BESTIARY_PAGES: BestiaryPageDef[] = [
  {
    id: 'gruenwald',
    name: 'Grünwald',
    types: ['ratte', 'spinne', 'wolf', 'wildschwein', 'fledermaus', 'wegelagerer', 'goblin', 'schleuderer'],
    bosses: ['brutmutter', 'raeuberhauptmann'],
  },
];

/** Ein Bonus-Satz, in dem alles auf 0 steht. */
export function noTypeBonus(): TypeBonus {
  return { damageDealt: 0, damageTaken: 0, gold: 0, dropChance: 0 };
}

/** Die Schwellen der fünf Ränge auf dieser Seite. */
export function rankKills(page: BestiaryPageDef | undefined): number[] {
  return page?.kills ?? BESTIARY_RANKS.map((rank) => rank.kills);
}

/** Die Seite, auf der ein Gegnertyp steht – oder undefined, wenn er auf keiner steht. */
export function pageOfType(type: string): BestiaryPageDef | undefined {
  return BESTIARY_PAGES.find((page) => page.types.includes(type));
}
