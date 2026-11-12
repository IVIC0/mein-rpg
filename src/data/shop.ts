// Händler: Preise, Sortiment und der Heiltrank.
// Die Preise hängen an Itemlevel und Seltenheit (Seltenheiten: src/data/items.ts).

import type { RarityId } from './items';
import type { SpriteName } from './sprites';

/** Der Händler selbst: Name, Bild (src/data/sprites.ts) und wie nah man für den Handel stehen muss (Welt-Pixel). */
export const MERCHANT = {
  name: 'Händler',
  sprite: 'haendler' as SpriteName,
  /** So nah muss die Figur sein, damit sich das Händler-Fenster öffnet. */
  openRange: 30,
  /** Entfernt sie sich weiter als so, schließt es sich wieder. */
  closeRange: 56,
};

/**
 * Wert eines Items in Gold = (base + perLevel × Itemlevel) × Faktor der Seltenheit.
 * Beispiel Itemlevel 5, Selten: (10 + 6 × 5) × 6 = 240 Gold.
 * Kaufen kostet den vollen Wert, Verkaufen bringt den Anteil `sellFraction`.
 */
export const PRICE = {
  base: 10,
  perLevel: 6,
  rarityFactor: { common: 1, uncommon: 2.5, rare: 6, epic: 15, legendary: 40, mythic: 100 } as Record<RarityId, number>,
  /** 0.2 = der Händler zahlt 20 % des Werts. */
  sellFraction: 0.2,
};

/** Ab dieser Seltenheit braucht das Verkaufen einen zweiten Klick zur Sicherheit. */
export const SELL_CONFIRM_FROM: RarityId = 'epic';
/** So lange wartet der Händler auf den zweiten Klick (Millisekunden). */
export const SELL_CONFIRM_MS = 3000;

/**
 * Das Sortiment: `size` gewürfelte Items auf der Stufe der Figur. Alle `restockMs`
 * kommt neue Ware (die Uhr läuft weiter, auch wenn das Spiel zu ist).
 * `rarityWeights` = wie oft welche Seltenheit im Regal liegt (Anteile, hier in Prozent).
 * Der Händler führt nur einfache Ware – die besten Stücke gibt es weiter nur als Beute.
 */
export const SHOP_STOCK = {
  size: 8,
  restockMs: 600000,
  rarityWeights: { common: 60, uncommon: 32, rare: 8 } as Partial<Record<RarityId, number>>,
};

/**
 * Rückkauf: Der Händler merkt sich die zuletzt verkauften Items. Sind es mehr als `size`,
 * fällt das älteste heraus. Zurückkaufen kostet genau den Verkaufspreis.
 */
export const BUYBACK = { size: 10 };

/** Der Heiltrank (Taste Q). Der Händler hat immer welche. */
export const POTION = {
  name: 'Heiltrank',
  /** Bild-Nummer in characters.png (rote Flasche). */
  frame: 115,
  /** Heilt diesen Anteil des maximalen Lebens (0.4 = 40 %). */
  healFraction: 0.4,
  /** Abklingzeit nach dem Trinken in Millisekunden. */
  cooldownMs: 30000,
  /** So viele Tränke kann die Figur höchstens tragen. */
  maxCarried: 5,
  /** Preis = priceBase + pricePerLevel × Stufe der Figur (Stufe 5: 30 Gold). */
  priceBase: 10,
  pricePerLevel: 4,
};

/** Was ein Item wert ist – so viel kostet es beim Händler. */
export function buyPrice(level: number, rarity: RarityId): number {
  return Math.round((PRICE.base + PRICE.perLevel * level) * PRICE.rarityFactor[rarity]);
}

/** So viel Gold zahlt der Händler für ein Item (mindestens 1). */
export function sellPrice(level: number, rarity: RarityId): number {
  return Math.max(1, Math.round(buyPrice(level, rarity) * PRICE.sellFraction));
}

export function potionPrice(playerLevel: number): number {
  return POTION.priceBase + POTION.pricePerLevel * playerLevel;
}
