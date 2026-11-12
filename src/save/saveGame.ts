// Der Spielstand: was gespeichert wird, wie ein neuer aussieht und wie gespeicherte
// Daten geprüft und – bei altem Format – ins aktuelle Format gebracht werden.
// Wo die Spielstände liegen (Slots im Browser), steht in src/save/slots.ts.

import { AFFIXES, EQUIP_SLOTS, ITEM_BASES, RARITIES, type EquipSlot } from '../data/items';
import { INVENTORY_SIZE } from '../data/loot';
import { MAX_LEVEL } from '../data/progression';
import { NAME_MAX_LENGTH, SAVE_VERSION } from '../data/save';
import { STATS, type StatId } from '../data/stats';
import type { TestSaveDef } from '../data/testSaves';
import { WARRIOR } from '../data/warrior';
import { generateItem, type Item, type RolledAffix, type RolledValue } from '../items/generator';
import { normalizeSettings, type Settings } from '../ui/settings';

/** Daran erkennt das Spiel beim Import, dass eine Datei wirklich ein Spielstand von ihm ist. */
const APP_ID = 'mein-rpg';

/**
 * Ein Spielstand. Er besteht nur aus einfachen Daten (Zahlen, Texte, Listen) und wird
 * als JSON-Text gespeichert. Die Werte der Figur (Leben, Angriffskraft, Rüstung …) stehen
 * nicht darin: Sie ergeben sich aus Stufe und Ausrüstung und werden beim Laden neu berechnet.
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
  /** Wo die Figur steht (Welt-Pixel); null = am Startpunkt im Dorf. */
  position: { x: number; y: number } | null;
  gold: number;
  bag: (Item | null)[];
  equipped: Record<EquipSlot, Item | null>;
  /** Die HUD-Einstellungen aus src/ui/settings.ts. */
  settings: Settings;
  /**
   * Besiegte Bosse: Schlüssel = Boss (Typ und Platz), Wert = Zeitpunkt (Date.now()),
   * zu dem er wieder erscheint. Die Uhr läuft also weiter, auch wenn das Spiel zu ist.
   */
  bossRespawnAt: Record<string, number>;
}

/** Ergebnis beim Lesen eines Spielstands: entweder der Spielstand oder ein Grund, warum es nicht ging. */
export type ParseResult = { ok: true; save: SaveGame } | { ok: false; reason: string };

type Plain = Record<string, unknown>;

/**
 * Umbauten für alte Spielstände. Der Eintrag `n` macht aus einem Spielstand im Format n
 * einen im Format n + 1. Beim Laden werden sie der Reihe nach angewendet, bis SAVE_VERSION
 * erreicht ist. Beispiel für später (Feld "gold" heißt ab Format 2 "coins"):
 *
 *   1: (old) => ({ ...old, version: 2, coins: old.gold }),
 */
const MIGRATIONS: Record<number, (old: Plain) => Plain> = {};

/** Ein frischer Spielstand: Stufe 1, leeres Inventar, am Startpunkt. */
export function newSave(name: string, settings: Settings): SaveGame {
  const now = Date.now();
  return {
    app: APP_ID,
    version: SAVE_VERSION,
    name: cleanName(name),
    createdAt: now,
    savedAt: now,
    playedMs: 0,
    character: { level: 1, xp: 0, hp: null },
    position: null,
    gold: 0,
    bag: new Array<Item | null>(INVENTORY_SIZE).fill(null),
    equipped: emptyEquipment(),
    settings: normalizeSettings(settings),
    bossRespawnAt: {},
  };
}

/** Baut einen Test-Spielstand aus einer Vorlage (src/data/testSaves.ts). Die Items werden dabei gewürfelt. */
export function testSave(def: TestSaveDef, settings: Settings): SaveGame {
  const save = newSave(def.name, settings);
  save.character.level = clampInt(def.level, 1, MAX_LEVEL, 1);
  save.gold = def.gold;
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
    return { ok: false, reason: 'Das ist kein Spielstand von diesem Spiel.' };
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
  const position = isPlain(data.position) && isNumber(data.position.x) && isNumber(data.position.y) ? { x: data.position.x, y: data.position.y } : null;

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

  const bossRespawnAt: Record<string, number> = {};
  if (isPlain(data.bossRespawnAt)) {
    for (const [key, value] of Object.entries(data.bossRespawnAt)) if (isNumber(value)) bossRespawnAt[key] = value;
  }

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
    position,
    gold: clampInt(data.gold, 0, Number.MAX_SAFE_INTEGER, 0),
    bag,
    equipped,
    settings: normalizeSettings(data.settings),
    bossRespawnAt,
  };
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
