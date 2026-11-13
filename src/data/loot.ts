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
 * Drop-Tabelle je Gegnerrang. Beispiel normaler Gegner: 6 % Chance auf ein Item,
 * davon sind 8,5 % selten – also im Schnitt ein seltenes Item auf 196 Gegner.
 * Startwerte seit Schritt 10b (vorher: 10 % und höhere Anteile der guten Seltenheiten).
 */
export const DROP_TABLES: Record<EnemyRank, DropTable> = {
  normal: { itemChance: 0.06, rarity: { common: 60, uncommon: 29, rare: 8.5, epic: 2.1, legendary: 0.36, mythic: 0.04 } },
  elite: { itemChance: 1, rarity: { common: 0, uncommon: 58, rare: 31, epic: 9, legendary: 1.8, mythic: 0.2 } },
  boss: { itemChance: 1, rarity: { common: 0, uncommon: 0, rare: 65, epic: 28, legendary: 6.4, mythic: 0.6 } },
};

/**
 * Gold pro besiegtem Gegner: eine Zahl zwischen min und max (mit Komma gewürfelt), dazu
 * perLevel × Stufe des Gegners, am Ende gerundet.
 * Stufe 1 = 2–3 Gold, Stufe 5 = 4–5 Gold, Stufe 10 = 6–8 Gold.
 */
export const GOLD_DROP = { min: 1, max: 3, perLevel: 0.5 };

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
