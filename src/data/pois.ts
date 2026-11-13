// Besondere Orte (POIs): Truhen und Übergänge zwischen Zonen.
// Wo sie stehen, legt der Bauplan der Zone fest (tools/zones/<zone>.mjs, Liste `pois`).
// Feste Elite-Plätze stehen bei den Elites (NAMED_ELITES in src/data/elites.ts).
// Alle Zahlen hier sind Startwerte fürs Balancing.

import type { RarityId } from './items';
import type { SpriteName } from './sprites';

/**
 * Truhe: einmal öffnen, dann füllt sie sich nach `refillMs` neu (die Uhr läuft weiter,
 * auch wenn das Spiel zu ist). Das Itemlevel steht im Bauplan (`level` der Truhe).
 */
export const CHEST = {
  spriteClosed: 'truhe-zu' as SpriteName,
  spriteOpen: 'truhe-offen' as SpriteName,
  /** 30 Minuten. */
  refillMs: 1800000,
  /** So nah (Welt-Pixel) muss die Figur sein, um die Truhe zu öffnen. */
  openRange: 26,
  /** So viele Items liegen darin: eine Zahl zwischen min und max. */
  items: { min: 1, max: 2 },
  /** Gold = (base + perLevel × Stufe der Truhe) × Zufall zwischen 0.8 und 1.2. Stufe 6: 19–29 Gold. */
  gold: { base: 6, perLevel: 3, spread: 0.2 },
  /** Anteil jeder Seltenheit in Prozent – besser als ein normaler Gegner, knapp unter einer Elite. */
  rarity: { common: 0, uncommon: 64, rare: 28, epic: 7, legendary: 0.9, mythic: 0.1 } as Record<RarityId, number>,
};

/** Übergang in eine andere Zone: Betritt die Figur diesen Umkreis (Welt-Pixel), wechselt die Zone. */
export const PORTAL = { radius: 9 };
