// Dorfausbau: Beim Baumeister im Dorf baut man mit Gold Gebäude aus. Jedes Gebäude hat
// Stufe 0–5 (0 = noch nicht ausgebaut) und bringt Komfort – nie Kampfwerte.
// Alle Zahlen hier sind Startwerte fürs Balancing (GAME.md, Abschnitt 16.2).
//
// Die Listen mit fünf Einträgen gelten für Stufe 1 bis 5 des Gebäudes. Für Stufe 0 gilt der
// Wert ohne Ausbau – er steht dort, wo er schon immer stand (shop.ts, regen.ts, progression.ts).
// Im Spielstand steht nur die Stufe je Gebäude; was sie bringt, wird hier ausgerechnet.
// Werte lassen sich also nachstellen, ohne Spielstände anzufassen.

import { DEATH_GOLD_LOSS } from './progression';
import { REGEN } from './regen';
import { POTION, SHOP_STOCK } from './shop';
import type { SpriteName } from './sprites';

/** Die Gebäude in der Reihenfolge, in der sie im Fenster "Dorfausbau" stehen. */
export const BUILDING_IDS = ['rathaus', 'alchemistin', 'gasthaus', 'kontor', 'lagerhaus'] as const;
export type BuildingId = (typeof BUILDING_IDS)[number];

/** Stufe je Gebäude – so steht es im Spielstand. */
export type TownLevels = Record<BuildingId, number>;

export const MAX_BUILDING_LEVEL = 5;

/** Preis der Stufen 1 bis 5 für jedes Gebäude außer dem Rathaus. */
const BUILDING_COSTS = [150, 800, 3500, 10000, 25000];

export interface BuildingDef {
  name: string;
  /** Bild-Nummer in characters.png (fürs Fenster "Dorfausbau"). */
  icon: number;
  /** Mit dieser Stufe beginnt ein neues Spiel. */
  startLevel: number;
  /** Preis der Stufen 1 bis 5 in Gold. */
  costs: number[];
  /** Ein Satz dazu, wofür das Gebäude gut ist. */
  summary: string;
}

export const BUILDINGS: Record<BuildingId, BuildingDef> = {
  // Das Rathaus steht von Anfang an auf Stufe 1 (das Dorf gibt es ja schon).
  rathaus: {
    name: 'Rathaus',
    icon: 100,
    startLevel: 1,
    costs: [0, 1500, 6000, 20000, 50000],
    summary: 'Gibt den Takt vor: Kein Gebäude kann höher sein als das Rathaus.',
  },
  alchemistin: {
    name: 'Alchemistin',
    icon: 99,
    startLevel: 0,
    costs: BUILDING_COSTS,
    summary: 'Bessere und billigere Heiltränke.',
  },
  gasthaus: {
    name: 'Gasthaus',
    icon: 85,
    startLevel: 0,
    costs: BUILDING_COSTS,
    summary: 'Schneller erholen, im Dorf fast sofort – und der Tod kostet weniger Gold.',
  },
  kontor: {
    name: 'Kontor',
    icon: 86,
    startLevel: 0,
    costs: BUILDING_COSTS,
    summary: 'Der Händler bekommt mehr, bessere und öfter neue Ware.',
  },
  lagerhaus: {
    name: 'Lagerhaus',
    icon: 90,
    startLevel: 0,
    costs: BUILDING_COSTS,
    summary: 'Eine Lagertruhe im Dorf für Items, die nicht ins Inventar passen.',
  },
};

/**
 * Das Rathaus wächst mit der Welt: Die Stufe (Schlüssel) lässt sich erst bauen, wenn dieser
 * Boss einmal besiegt ist. `enemy` = Gegnertyp aus src/data/enemies.ts. Die Bosse der Zonen 2–4
 * gibt es noch nicht – ihre Stufen bleiben gesperrt, bis die Zone ins Spiel kommt.
 */
export const TOWN_HALL_BOSSES: Record<number, { enemy: string; name: string; where: string }> = {
  2: { enemy: 'raeuberhauptmann', name: 'Räuberhauptmann', where: 'Ruine in Grünwald' },
  3: { enemy: 'grommak', name: 'Grommak', where: 'Orkhügel – die Zone gibt es noch nicht' },
  4: { enemy: 'lich-morvan', name: 'Lich Morvan', where: 'Nebelmoor – die Zone gibt es noch nicht' },
  5: { enemy: 'azgar', name: 'Azgar', where: 'Aschenfeste – die Zone gibt es noch nicht' },
};

/** Kontor: verbessert den Händler (Werte ohne Ausbau: SHOP_STOCK in src/data/shop.ts). */
export const KONTOR = {
  /** Plätze im Regal. */
  stockSize: [9, 10, 11, 12, 14],
  /** Anteil seltener (blauer) Ware in Prozent. */
  rareShare: [10, 12, 14, 17, 20],
  /** Anteil epischer (lila) Ware in Prozent. */
  epicShare: [0, 0, 0, 2, 4],
  /** Neue Ware alle so viele Minuten. */
  restockMinutes: [9, 8, 7, 6, 5],
  /** Ab dieser Stufe gibt es den Knopf "Neue Ware sofort" (Preis: SHOP_STOCK.instantRestockPriceOf). */
  instantRestockFrom: 3,
};

/** Alchemistin: verbessert den Heiltrank (Werte ohne Ausbau: POTION in src/data/shop.ts). */
export const ALCHEMIST = {
  /** Der Trank heilt diesen Anteil des maximalen Lebens. */
  healFraction: [0.42, 0.44, 0.46, 0.48, 0.5],
  /** Abklingzeit in Millisekunden. */
  cooldownMs: [30000, 30000, 25000, 25000, 20000],
  /** Nachlass auf den Trankpreis (0.05 = 5 % billiger). */
  priceDiscount: [0.05, 0.1, 0.15, 0.2, 0.25],
};

/** Gasthaus: Erholung und Tod (Werte ohne Ausbau: REGEN in regen.ts, DEATH_GOLD_LOSS in progression.ts). */
export const INN = {
  /** Rasten: so viele Sekunden von 0 auf volles Leben. */
  restingFullSeconds: [110, 100, 90, 80, 70],
  /** Anteil des Goldes, den der Tod kostet (0.09 = 9 %). */
  deathGoldLoss: [0.09, 0.08, 0.07, 0.06, 0.05],
  /** Im Dorf selbst erholt sich die Figur ab Stufe 1 so schnell (Sekunden von 0 auf voll) – auch im Laufen. */
  townFullSeconds: 15,
};

/** Lagerhaus: so viele Plätze hat die Lagertruhe. Ohne Lagerhaus gibt es keine. */
export const WAREHOUSE = {
  stashSize: [20, 40, 60, 80, 100],
};

/** So viele Plätze hat die Lagertruhe höchstens (letzte Stufe des Lagerhauses). */
export const STASH_MAX = Math.max(...WAREHOUSE.stashSize);
/** So viele Plätze hat das Regal des Händlers höchstens (letzte Stufe des Kontors). */
export const STOCK_MAX = Math.max(SHOP_STOCK.size, ...KONTOR.stockSize);

/**
 * Das Dorf in der Welt: In welcher Zone es liegt und wie weit es um den Marker `center`
 * reicht (Welt-Pixel; 240 = 15 Kacheln). In diesem Umkreis gilt die Dorf-Erholung des Gasthauses.
 */
export const TOWN = { zone: 'gruenwald', center: 'dorfmitte', radius: 240 };

/** Der Baumeister: Name, Bild (src/data/sprites.ts) und wie nah man zum Bauen stehen muss (Welt-Pixel). */
export const BUILDER = { name: 'Baumeister', sprite: 'baumeister' as SpriteName, openRange: 30, closeRange: 56 };

/** Die Lagertruhe am Lagerhaus. */
export const STASH_CHEST = { name: 'Lagertruhe', sprite: 'lagertruhe' as SpriteName, openRange: 30, closeRange: 56 };

/**
 * Die Fahne am Haus zeigt die Stufe des Gebäudes: Tuchfarbe je Stufe 1 bis 5 (hell und Schatten).
 * Auf Stufe 0 steht nur der leere Mast.
 */
export const FLAG_COLORS: [string, string][] = [
  ['#e6e6e6', '#a9a9a9'],
  ['#4fd35a', '#2f8f3a'],
  ['#4d9bff', '#2c63b8'],
  ['#b668ff', '#7a3fb8'],
  ['#ffd34d', '#c8962a'],
];

/** Was das Dorf gerade bringt – ausgerechnet aus den Stufen der Gebäude. */
export interface TownEffects {
  // Kontor
  stockSize: number;
  /** Anteil seltener bzw. epischer Ware beim Händler in Prozent. */
  stockRareShare: number;
  stockEpicShare: number;
  restockMs: number;
  instantRestock: boolean;
  // Alchemistin
  potionHealFraction: number;
  potionCooldownMs: number;
  potionDiscount: number;
  // Gasthaus
  restingFullSeconds: number;
  deathGoldLoss: number;
  /** Sekunden von 0 auf voll, solange die Figur im Dorf ist; null = kein Gasthaus. */
  townFullSeconds: number | null;
  // Lagerhaus
  /** Plätze der Lagertruhe; 0 = es gibt noch keine. */
  stashSize: number;
}

/** Die Stufen, mit denen ein neues Spiel beginnt. */
export function startLevels(): TownLevels {
  const levels = {} as TownLevels;
  for (const id of BUILDING_IDS) levels[id] = BUILDINGS[id].startLevel;
  return levels;
}

/** Wert einer Stufen-Liste: Stufe 1 = erster Eintrag. Auf Stufe 0 gilt `base` (der Wert ohne Ausbau). */
function atLevel<T>(list: T[], level: number, base: T): T {
  return level <= 0 ? base : list[Math.min(level, list.length) - 1];
}

/** Rechnet aus den Stufen der Gebäude aus, was das Dorf bringt. */
export function townEffects(levels: TownLevels): TownEffects {
  const { kontor, alchemistin, gasthaus, lagerhaus } = levels;
  return {
    stockSize: atLevel(KONTOR.stockSize, kontor, SHOP_STOCK.size),
    stockRareShare: atLevel(KONTOR.rareShare, kontor, SHOP_STOCK.rarityWeights.rare ?? 0),
    stockEpicShare: atLevel(KONTOR.epicShare, kontor, 0),
    restockMs: atLevel(KONTOR.restockMinutes, kontor, SHOP_STOCK.restockMs / 60000) * 60000,
    instantRestock: kontor >= KONTOR.instantRestockFrom,
    potionHealFraction: atLevel(ALCHEMIST.healFraction, alchemistin, POTION.healFraction),
    potionCooldownMs: atLevel(ALCHEMIST.cooldownMs, alchemistin, POTION.cooldownMs),
    potionDiscount: atLevel(ALCHEMIST.priceDiscount, alchemistin, 0),
    restingFullSeconds: atLevel(INN.restingFullSeconds, gasthaus, REGEN.restingFullSeconds),
    deathGoldLoss: atLevel(INN.deathGoldLoss, gasthaus, DEATH_GOLD_LOSS),
    townFullSeconds: gasthaus >= 1 ? INN.townFullSeconds : null,
    stashSize: atLevel(WAREHOUSE.stashSize, lagerhaus, 0),
  };
}
