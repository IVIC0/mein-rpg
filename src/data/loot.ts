// Drops, Gold und Inventar. Seltenheiten und Affixe stehen in src/data/items.ts.

/** So viele Plätze hat das Inventar. */
export const INVENTORY_SIZE = 40;

/** Chance, dass ein normaler Gegner ein Item fallen lässt (0.3 = 30 %). Itemlevel = Stufe des Gegners. */
export const ITEM_DROP_CHANCE = 0.3;

/**
 * Gold pro besiegtem Gegner: eine Zahl zwischen min und max, dazu perLevel × Stufe des Gegners.
 * Stufe 1 = 2–5 Gold, Stufe 10 = 11–14 Gold.
 */
export const GOLD_DROP = { min: 1, max: 4, perLevel: 1 };

/** So nah (Welt-Pixel) muss die Figur an ein Item am Boden heran, um es aufzuheben. */
export const LOOT_PICKUP_RADIUS = 12;

/** Ein frisch gefallenes Item lässt sich erst nach dieser Zeit aufheben (Millisekunden). */
export const LOOT_PICKUP_DELAY_MS = 400;

/** Nach dieser Zeit verschwindet ein Item, das am Boden liegen bleibt (Millisekunden). */
export const LOOT_DESPAWN_MS = 180000;

/** So weit (Welt-Pixel) landet ein Item höchstens neben dem besiegten Gegner. */
export const LOOT_SCATTER = 6;
