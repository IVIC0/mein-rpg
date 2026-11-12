// Drops, Gold und Inventar. Seltenheiten und Affixe stehen in src/data/items.ts.

import type { RarityId } from './items';

/** So viele Plätze hat das Inventar. */
export const INVENTORY_SIZE = 40;

/** Rang eines Gegners. Wie stark Elite und Boss sind, steht in src/data/elites.ts. */
export type EnemyRank = 'normal' | 'elite' | 'boss';

export interface DropTable {
  /** Chance, dass der Gegner ein Item fallen lässt (0.1 = 10 %). Itemlevel = Stufe des Gegners. */
  itemChance: number;
  /** Anteil jeder Seltenheit an den Drops in Prozent – alle zusammen ergeben 100. */
  rarity: Record<RarityId, number>;
}

/**
 * Drop-Tabelle je Gegnerrang. Beispiel normaler Gegner: 10 % Chance auf ein Item,
 * davon sind 13 % selten – also im Schnitt ein seltenes Item auf 77 Gegner.
 */
export const DROP_TABLES: Record<EnemyRank, DropTable> = {
  normal: { itemChance: 0.1, rarity: { common: 50, uncommon: 32, rare: 13, epic: 4, legendary: 0.9, mythic: 0.1 } },
  elite: { itemChance: 1, rarity: { common: 0, uncommon: 45, rare: 37, epic: 14, legendary: 3.6, mythic: 0.4 } },
  boss: { itemChance: 1, rarity: { common: 0, uncommon: 0, rare: 55, epic: 34, legendary: 10, mythic: 1 } },
};

/**
 * Gold pro besiegtem Gegner: eine Zahl zwischen min und max, dazu perLevel × Stufe des Gegners.
 * Stufe 1 = 2–5 Gold, Stufe 10 = 11–14 Gold.
 */
export const GOLD_DROP = { min: 1, max: 4, perLevel: 1 };

/** Elite und Boss geben ein Vielfaches an Gold. */
export const GOLD_RANK_FACTOR: Record<EnemyRank, number> = { normal: 1, elite: 3, boss: 10 };

/** So nah (Welt-Pixel) muss die Figur an ein Item am Boden heran, um es aufzuheben. */
export const LOOT_PICKUP_RADIUS = 12;

/** Ein frisch gefallenes Item lässt sich erst nach dieser Zeit aufheben (Millisekunden). */
export const LOOT_PICKUP_DELAY_MS = 400;

/** Nach dieser Zeit verschwindet ein Item, das am Boden liegen bleibt (Millisekunden). */
export const LOOT_DESPAWN_MS = 180000;

/** So weit (Welt-Pixel) landet ein Item höchstens neben dem besiegten Gegner. */
export const LOOT_SCATTER = 6;
