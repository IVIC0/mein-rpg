// Der Spielstand: was gespeichert wird, wie ein neuer aussieht und wie gespeicherte
// Daten geprüft und – bei altem Format – ins aktuelle Format gebracht werden.
// Wo die Spielstände liegen (Slots im Browser), steht in src/save/slots.ts.

import { GAME_TITLE } from '../config';
import { AFFIXES, EQUIP_SLOTS, ITEM_BASES, RARITIES, type EquipSlot } from '../data/items';
import { DEFAULT_DIFFICULTY, cleanDifficultyValue, type Difficulty } from '../data/difficulty';
import { INVENTORY_SIZE } from '../data/loot';
import { MAX_LEVEL } from '../data/progression';
import { NAME_MAX_LENGTH, SAVE_VERSION } from '../data/save';
import { BUYBACK } from '../data/shop';
import { BUILDING_IDS, MAX_BUILDING_LEVEL, STASH_MAX, STOCK_MAX, startLevels, type TownLevels } from '../data/town';
import { START_ZONE, ZONES } from '../data/zones';
import { STATS, type StatId } from '../data/stats';
import type { TestSaveDef } from '../data/testSaves';
import { WARRIOR } from '../data/warrior';
import { generateItem, type Item, type RolledAffix, type RolledValue } from '../items/generator';
import type { GroundItem } from '../items/GroundLoot';
import type { ShopData } from '../items/Shop';

/**
 * Daran erkennt das Spiel beim Import, dass eine Datei wirklich ein Spielstand von ihm ist.
 * Das ist ein technisches Kennzeichen, nicht der Spielname – nicht ändern, sonst laden alte Spielstände nicht mehr.
 */
const APP_ID = 'mein-rpg';

/**
 * Ein Spielstand. Er besteht nur aus einfachen Daten (Zahlen, Texte, Listen) und wird
 * als JSON-Text gespeichert. Die Werte der Figur (Leben, Angriffskraft, Rüstung …) stehen
 * nicht darin: Sie ergeben sich aus Stufe und Ausrüstung und werden beim Laden neu berechnet.
 * Auch die HUD-Einstellungen stehen nicht darin – sie gelten für alle Spielstände (src/ui/settings.ts).
 */
export interface SaveGame {
  app: typeof APP_ID;
  /** Format-Nummer, siehe SAVE_VERSION in src/data/save.ts. */
  version: number;
  /** Name der Figur. */
  name: string;
  /** Zeitpunkte in Millisekunden seit 1970 (Date.now()). */
  createdAt: number;
  savedAt: number;
  /** Gespielte Zeit in Millisekunden. */
  playedMs: number;
  /** `hp` = aktuelles Leben; null = volles Leben. */
  character: { level: number; xp: number; hp: number | null };
  /** In welcher Zone die Figur ist (Schlüssel aus src/data/zones.ts). */
  zone: string;
  /** Wo die Figur in dieser Zone steht (Welt-Pixel); null = am Startpunkt der Zone. */
  position: { x: number; y: number } | null;
  gold: number;
  bag: (Item | null)[];
  equipped: Record<EquipSlot, Item | null>;
  /** Heiltränke im Gepäck (ohne Obergrenze). */
  potions: number;
  /** Items, die noch am Boden liegen – in allen Zonen (jedes merkt sich seine Zone). */
  groundItems: GroundItem[];
  /** Das Sortiment des Händlers, wann neue Ware kommt und die Rückkauf-Liste. */
  shop: ShopData;
  /** Dorfausbau: Stufe je Gebäude (src/data/town.ts). Was die Stufen bringen, wird beim Laden berechnet. */
  town: TownLevels;
  /** Inhalt der Lagertruhe im Dorf; null = leerer Platz. */
  stash: (Item | null)[];
  /** Besiegte Bosse: Gegnertyp → Anzahl der Siege. Daran hängen die Rathaus-Stufen. */
  bossKills: Record<string, number>;
  /** Schwierigkeit dieses Spielstands (Regler in den Einstellungen, Werte in src/data/difficulty.ts). */
  difficulty: Difficulty;
  /**
   * Besiegte Bosse und benannte Elites: Schlüssel = "Zone:Typ@Platz", Wert = Zeitpunkt (Date.now()),
   * zu dem der Gegner wieder erscheint. Die Uhr läuft also weiter, auch wenn das Spiel zu ist.
   */
  respawnAt: Record<string, number>;
  /** Geöffnete Truhen: Schlüssel = "Zone:Name der Truhe", Wert = Zeitpunkt, ab dem sie wieder gefüllt ist. */
  chests: Record<string, number>;
}

/** Ergebnis beim Lesen eines Spielstands: entweder der Spielstand oder ein Grund, warum es nicht ging. */
export type ParseResult = { ok: true; save: SaveGame } | { ok: false; reason: string };

type Plain = Record<string, unknown>;

/**
 * Umbauten für alte Spielstände. Der Eintrag `n` macht aus einem Spielstand im Format n
 * einen im Format n + 1. Beim Laden werden sie der Reihe nach angewendet, bis SAVE_VERSION
 * erreicht ist. Beispiel für später (Feld "gold" heißt ab Format 2 "coins"):
 *
 *   2: (old) => ({ ...old, version: 3, coins: old.gold }),
 */
const MIGRATIONS: Record<number, (old: Plain) => Plain> = {
  // Format 1 → 2 (Meilenstein 8): Die HUD-Einstellungen sind nicht mehr Teil des Spielstands.
  // Neu dazugekommen sind Tränke, Items am Boden und das Händler-Sortiment – was fehlt,
  // füllt normalize() unten mit Standardwerten (keine Tränke, nichts am Boden, frische Ware).
  1: (old) => {
    const { settings: _settings, ...rest } = old;
    return { ...rest, version: 2 };
  },
  // Format 2 → 3 (Meilenstein 10): Neu sind die Schwierigkeit (Start: Normal, 100 / 100) und
  // die Rückkauf-Liste des Händlers (Start: leer). Beides füllt normalize() unten.
  2: (old) => ({ ...old, version: 3 }),
  // Format 3 → 4 (Meilenstein 11): Es gibt mehrere Zonen. Alles Bisherige spielte in Grünwald:
  // Die Figur steht dort, Items am Boden und der Boss-Timer bekommen die Zone dazu
  // ("bossRespawnAt" heißt jetzt "respawnAt" und gilt auch für benannte Elites).
  // Neu sind die Zeiten der Truhen (Start: alle gefüllt) – das füllt normalize() unten.
  3: (old) => {
    const { bossRespawnAt, ...rest } = old;
    const respawnAt: Plain = {};
    if (isPlain(bossRespawnAt)) for (const [key, value] of Object.entries(bossRespawnAt)) respawnAt[`gruenwald:${key}`] = value;
    const groundItems = Array.isArray(old.groundItems) ? (old.groundItems as unknown[]).map((entry) => (isPlain(entry) ? { ...entry, zone: 'gruenwald' } : entry)) : [];
    return { ...rest, version: 4, zone: 'gruenwald', groundItems, respawnAt };
  },
  // Format 4 → 5 (Schritt 11b): Neu sind der Dorfausbau (Start: Rathaus 1, alles andere 0), die
  // Lagertruhe (Start: leer) und die Liste besiegter Bosse (Start: leer – bisher wurde nicht
  // mitgezählt). Alles füllt normalize() unten. Tränke haben keine Obergrenze mehr.
  4: (old) => ({ ...old, version: 5 }),
};

/** Ein frischer Spielstand: Stufe 1, leeres Inventar, am Startpunkt. */
export function newSave(name: string): SaveGame {
  const now = Date.now();
  return {
    app: APP_ID,
    version: SAVE_VERSION,
    name: cleanName(name),
    createdAt: now,
    savedAt: now,
    playedMs: 0,
    character: { level: 1, xp: 0, hp: null },
    zone: START_ZONE,
    position: null,
    gold: 0,
    bag: new Array<Item | null>(INVENTORY_SIZE).fill(null),
    equipped: emptyEquipment(),
    potions: 0,
    groundItems: [],
    shop: { stock: [], restockAt: 0, buyback: [] },
    town: startLevels(),
    stash: [],
    bossKills: {},
    difficulty: { ...DEFAULT_DIFFICULTY },
    respawnAt: {},
    chests: {},
  };
}

/** Baut einen Test-Spielstand aus einer Vorlage (src/data/testSaves.ts). Die Items werden dabei gewürfelt. */
export function testSave(def: TestSaveDef): SaveGame {
  const save = newSave(def.name);
  save.character.level = clampInt(def.level, 1, MAX_LEVEL, 1);
  save.gold = def.gold;
  save.potions = clampInt(def.potions, 0, Number.MAX_SAFE_INTEGER, 0);
  // Dorfausbau der Vorlage: Stufen einzelner Gebäude und schon besiegte Bosse.
  Object.assign(save.town, def.town ?? {});
  for (const boss of def.bossKills ?? []) save.bossKills[boss] = 1;
  for (const slot of EQUIP_SLOTS) {
    const rarity = def.equipped[slot.id];
    if (rarity) save.equipped[slot.id] = generateItem(save.character.level, rarity, slot.accepts);
  }
  def.bag.slice(0, INVENTORY_SIZE).forEach((rarity, index) => {
    save.bag[index] = generateItem(save.character.level, rarity);
  });
  return save;
}

/** Kürzt einen Namen auf die erlaubte Länge; ist er leer, heißt die Figur wie ihre Klasse. */
export function cleanName(name: string): string {
  return name.replace(/\s+/g, ' ').trim().slice(0, NAME_MAX_LENGTH) || WARRIOR.name;
}

/**
 * Liest einen Spielstand aus JSON-Text (aus dem Browser-Speicher oder einer Datei).
 * Alte Formate werden umgebaut, kaputte oder fehlende Werte durch Standardwerte ersetzt.
 * Geht es gar nicht, kommt ein Grund zurück, den man dem Spieler zeigen kann.
 */
export function parseSave(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'Die Daten sind beschädigt und lassen sich nicht lesen.' };
  }
  if (!isPlain(raw) || raw.app !== APP_ID || typeof raw.version !== 'number') {
    return { ok: false, reason: `Das ist kein Spielstand von ${GAME_TITLE}.` };
  }
  if (raw.version > SAVE_VERSION) {
    return {
      ok: false,
      reason: `Der Spielstand stammt aus einer neueren Spielversion (Format ${raw.version}, dieses Spiel kennt nur Format ${SAVE_VERSION}). Bitte das Spiel aktualisieren (Seite neu laden).`,
    };
  }

  let data: Plain = raw;
  for (let version = raw.version; version < SAVE_VERSION; version++) {
    const migrate = MIGRATIONS[version];
    if (!migrate) {
      return { ok: false, reason: `Der Spielstand ist zu alt (Format ${raw.version}) und lässt sich nicht mehr umwandeln.` };
    }
    data = migrate(data);
  }
  return { ok: true, save: normalize(data) };
}

/** Baut aus geprüften Rohdaten einen vollständigen Spielstand; alles Unbrauchbare wird ersetzt. */
function normalize(data: Plain): SaveGame {
  const character = isPlain(data.character) ? data.character : {};
  const level = clampInt(character.level, 1, MAX_LEVEL, 1);
  // Gibt es die Zone nicht (mehr), steht die Figur am Startpunkt der Startzone.
  const zone = typeof data.zone === 'string' && data.zone in ZONES ? data.zone : START_ZONE;
  const storedPosition = zone === data.zone && isPlain(data.position) ? data.position : {};
  const position = isNumber(storedPosition.x) && isNumber(storedPosition.y) ? { x: storedPosition.x, y: storedPosition.y } : null;

  const bag = new Array<Item | null>(INVENTORY_SIZE).fill(null);
  if (Array.isArray(data.bag)) {
    // Die Plätze bleiben erhalten. Ist das Inventar inzwischen kleiner, rücken die Items zusammen.
    const items = (data.bag as unknown[]).map(cleanItem);
    if (items.length <= INVENTORY_SIZE) items.forEach((item, index) => (bag[index] = item));
    else items.filter((item) => item !== null).slice(0, INVENTORY_SIZE).forEach((item, index) => (bag[index] = item));
  }

  const equipped = emptyEquipment();
  const storedEquipment = isPlain(data.equipped) ? data.equipped : {};
  for (const slot of EQUIP_SLOTS) {
    const item = cleanItem(storedEquipment[slot.id]);
    if (item && item.slot === slot.accepts) equipped[slot.id] = item;
  }

  const groundItems: GroundItem[] = [];
  if (Array.isArray(data.groundItems)) {
    for (const entry of data.groundItems as unknown[]) {
      const item = isPlain(entry) ? cleanItem(entry.item) : null;
      if (!item || !isPlain(entry) || !isNumber(entry.x) || !isNumber(entry.y)) continue;
      // Items in einer Zone, die es nicht mehr gibt, fallen weg.
      if (typeof entry.zone !== 'string' || !(entry.zone in ZONES)) continue;
      groundItems.push({ zone: entry.zone, item, x: entry.x, y: entry.y, ageMs: isNumber(entry.ageMs) ? Math.max(0, entry.ageMs) : 0 });
    }
  }

  // Händler: Fehlt das Sortiment (alter Spielstand), bleibt es leer – dann kommt beim ersten Besuch frische Ware.
  const storedShop = isPlain(data.shop) ? data.shop : {};
  const stock = Array.isArray(storedShop.stock) ? (storedShop.stock as unknown[]).slice(0, STOCK_MAX).map(cleanItem) : [];
  const buyback: Item[] = [];
  if (Array.isArray(storedShop.buyback)) {
    for (const entry of (storedShop.buyback as unknown[]).slice(0, BUYBACK.size)) {
      const item = cleanItem(entry);
      if (item) buyback.push(item);
    }
  }
  const shop: ShopData = { stock, restockAt: stock.length > 0 && isNumber(storedShop.restockAt) ? storedShop.restockAt : 0, buyback };

  // Schwierigkeit: Fehlt sie (alter Spielstand) oder ist ein Wert unbrauchbar, gilt Normal (100 %).
  const storedDifficulty = isPlain(data.difficulty) ? data.difficulty : {};
  const difficulty: Difficulty = {
    enemyHp: cleanDifficultyValue(storedDifficulty.enemyHp),
    enemyDamage: cleanDifficultyValue(storedDifficulty.enemyDamage),
  };

  // Dorfausbau: Fehlt eine Stufe (alter Spielstand), gilt die Startstufe des Gebäudes.
  const storedTown = isPlain(data.town) ? data.town : {};
  const town = startLevels();
  for (const id of BUILDING_IDS) town[id] = clampInt(storedTown[id], town[id], MAX_BUILDING_LEVEL, town[id]);
  const stash = Array.isArray(data.stash) ? (data.stash as unknown[]).slice(0, STASH_MAX).map(cleanItem) : [];
  const bossKills: Record<string, number> = {};
  for (const [type, count] of Object.entries(cleanTimes(data.bossKills))) bossKills[type] = Math.max(0, Math.floor(count));

  const respawnAt = cleanTimes(data.respawnAt);
  const chests = cleanTimes(data.chests);

  return {
    app: APP_ID,
    version: SAVE_VERSION,
    name: cleanName(typeof data.name === 'string' ? data.name : ''),
    createdAt: isNumber(data.createdAt) ? data.createdAt : Date.now(),
    savedAt: isNumber(data.savedAt) ? data.savedAt : Date.now(),
    playedMs: isNumber(data.playedMs) ? Math.max(0, data.playedMs) : 0,
    character: {
      level,
      xp: level >= MAX_LEVEL ? 0 : clampInt(character.xp, 0, Number.MAX_SAFE_INTEGER, 0),
      hp: isNumber(character.hp) && character.hp > 0 ? character.hp : null,
    },
    zone,
    position,
    gold: clampInt(data.gold, 0, Number.MAX_SAFE_INTEGER, 0),
    bag,
    equipped,
    // Tränke: keine Obergrenze mehr (bis Schritt 11b höchstens 5).
    potions: clampInt(data.potions, 0, Number.MAX_SAFE_INTEGER, 0),
    groundItems,
    shop,
    town,
    stash,
    bossKills,
    difficulty,
    respawnAt,
    chests,
  };
}

/** Liest eine Liste "Schlüssel → Zahl" (Zeitpunkte, Zähler); alles, was keine Zahl ist, fällt weg. */
function cleanTimes(raw: unknown): Record<string, number> {
  const times: Record<string, number> = {};
  if (isPlain(raw)) {
    for (const [key, value] of Object.entries(raw)) if (isNumber(value)) times[key] = value;
  }
  return times;
}

/** Prüft ein gespeichertes Item. Passt es nicht mehr zum Spiel (z. B. unbekannter Wert), fällt es weg. */
function cleanItem(raw: unknown): Item | null {
  if (!isPlain(raw)) return null;
  const base = ITEM_BASES.find((candidate) => candidate.id === raw.baseId);
  const rarity = RARITIES.find((candidate) => candidate.id === raw.rarity);
  const baseValue = cleanValue(raw.base);
  if (!base || !rarity || !baseValue || typeof raw.name !== 'string' || !Array.isArray(raw.affixes)) return null;

  const affixes: RolledAffix[] = [];
  for (const entry of raw.affixes as unknown[]) {
    const value = cleanValue(entry);
    const affixId = isPlain(entry) ? entry.affixId : null;
    if (!value || typeof affixId !== 'string' || !AFFIXES.some((affix) => affix.id === affixId)) return null;
    affixes.push({ affixId, ...value });
  }
  return {
    // Die Nummer wird beim Laden neu vergeben (Inventory.load), damit sie eindeutig bleibt.
    id: 0,
    name: raw.name,
    baseId: base.id,
    // Platz und Bild kommen aus dem Basis-Item: so stimmen sie auch, wenn sich die Grafik ändert.
    slot: base.slot,
    icon: base.icon,
    rarity: rarity.id,
    level: clampInt(raw.level, 1, 999, 1),
    base: baseValue,
    affixes,
  };
}

function cleanValue(raw: unknown): RolledValue | null {
  if (!isPlain(raw) || typeof raw.stat !== 'string' || !(raw.stat in STATS)) return null;
  if (!isNumber(raw.value) || !isNumber(raw.min) || !isNumber(raw.max)) return null;
  return { stat: raw.stat as StatId, value: raw.value, min: raw.min, max: raw.max };
}

function emptyEquipment(): Record<EquipSlot, Item | null> {
  return { weapon: null, shield: null, helmet: null, chest: null, gloves: null, boots: null, amulet: null, ring1: null, ring2: null };
}

function isPlain(value: unknown): value is Plain {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** Ganze Zahl zwischen min und max; ist `value` keine Zahl, kommt `fallback` zurück. */
function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  return isNumber(value) ? Math.min(max, Math.max(min, Math.floor(value))) : fallback;
}
