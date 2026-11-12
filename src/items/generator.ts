import { AFFIXES, BASE_SPREAD, ITEM_BASES, PREFIX_ENDINGS, RARITIES, type AffixDef, type ItemBaseDef, type ItemSlot, type RarityDef, type RarityId } from '../data/items';
import { DROP_TABLES, type EnemyRank } from '../data/loot';
import { STATS, emptyStats, roundStat, type StatId, type Stats } from '../data/stats';

/** Ein gewürfelter Wert samt der Spanne, in der er liegen konnte – der Tooltip zeigt beides. */
export interface RolledValue {
  stat: StatId;
  value: number;
  min: number;
  max: number;
}

export interface RolledAffix extends RolledValue {
  affixId: string;
}

/**
 * Ein fertiges Item. Es besteht nur aus einfachen Daten (Zahlen und Texte),
 * damit es sich später ohne Umwege speichern lässt.
 */
export interface Item {
  /** Fortlaufende Nummer, eindeutig innerhalb einer Sitzung (wird beim Laden neu vergeben). */
  id: number;
  name: string;
  baseId: string;
  slot: ItemSlot;
  /** Bild-Nummer in assets/sprites/characters.png. */
  icon: number;
  rarity: RarityId;
  /** Itemlevel = Stufe des Gegners, der es fallen ließ. */
  level: number;
  /** Der feste Wert des Basis-Items, z. B. die Angriffskraft eines Schwerts. */
  base: RolledValue;
  affixes: RolledAffix[];
}

let nextId = 1;

/** Die nächste freie Item-Nummer – auch für Items, die aus einem Spielstand geladen werden. */
export function nextItemId(): number {
  return nextId++;
}

/**
 * Würfelt ein Item mit dem Itemlevel `level` und der Seltenheit `rarityId`: erst das
 * Basis-Item, dann so viele Affixe, wie die Seltenheit vorgibt.
 * Die Seltenheit eines Drops würfelt vorher `rollRarity`.
 * `wantedSlot` legt die Art fest (z. B. 'weapon') – ohne Angabe wird sie gewürfelt.
 */
export function generateItem(level: number, rarityId: RarityId, wantedSlot?: ItemSlot): Item {
  const rarity = rarityById(rarityId);
  // Erst die Art würfeln, dann das Basis-Item: sonst gäbe es mehr Waffen als Helme, nur weil es drei Waffen gibt.
  const slots = [...new Set(ITEM_BASES.map((candidate) => candidate.slot))];
  const slot = wantedSlot ?? pick(slots);
  const base = pick(ITEM_BASES.filter((candidate) => candidate.slot === slot));

  const center = base.base.atLevel1 + base.base.perLevel * (level - 1);
  const baseValue = rollValue(base.base.stat, center * (1 - BASE_SPREAD), center * (1 + BASE_SPREAD));

  const possible = shuffle(AFFIXES.filter((affix) => !affix.slots || affix.slots.includes(slot)));
  const affixes = possible.slice(0, rarity.affixes).map((affix) => rollAffix(affix, level));

  return {
    id: nextItemId(),
    name: buildName(base, affixes),
    baseId: base.id,
    slot,
    icon: base.icon,
    rarity: rarity.id,
    level,
    base: baseValue,
    affixes,
  };
}

export function rarityById(id: RarityId): RarityDef {
  const rarity = RARITIES.find((candidate) => candidate.id === id);
  if (!rarity) throw new Error(`Unbekannte Seltenheit "${id}".`);
  return rarity;
}

/** Alle Werte eines Items zusammengezählt (fester Wert + Affixe). */
export function itemStats(item: Item | null): Stats {
  const stats = emptyStats();
  if (!item) return stats;
  stats[item.base.stat] += item.base.value;
  for (const affix of item.affixes) stats[affix.stat] += affix.value;
  return stats;
}

/** Würfelt die Seltenheit eines Drops nach der Tabelle des Gegnerrangs (DROP_TABLES in src/data/loot.ts). */
export function rollRarity(rank: EnemyRank): RarityId {
  const weights = DROP_TABLES[rank].rarity;
  const total = RARITIES.reduce((sum, rarity) => sum + weights[rarity.id], 0);
  let roll = Math.random() * total;
  for (const rarity of RARITIES) {
    roll -= weights[rarity.id];
    if (roll < 0) return rarity.id;
  }
  return RARITIES[0].id;
}

function rollAffix(affix: AffixDef, level: number): RolledAffix {
  const growth = 1 + affix.scale * (level - 1);
  return { affixId: affix.id, ...rollValue(affix.stat, affix.min * growth, affix.max * growth) };
}

/** Würfelt einen Wert zwischen min und max (beide gerundet, wie es für den Wert üblich ist). */
function rollValue(stat: StatId, min: number, max: number): RolledValue {
  const step = 10 ** -STATS[stat].decimals; // kleinster Schritt: 1 oder 0,1
  const low = Math.max(step, roundStat(stat, min));
  const high = Math.max(low, roundStat(stat, max));
  const steps = Math.round((high - low) / step);
  const value = roundStat(stat, low + Math.floor(Math.random() * (steps + 1)) * step);
  return { stat, value, min: low, max: high };
}

/**
 * Setzt den Namen zusammen: [Präfix] Basis [Suffix]. Hat ein Item mehrere Präfixe oder
 * Suffixe, steht nur der erste im Namen. Das Präfix bekommt die Endung, die zum
 * Geschlecht des Basis-Items passt ("Scharfes Schwert", "Scharfe Axt", "Scharfer Dolch").
 */
function buildName(base: ItemBaseDef, affixes: RolledAffix[]): string {
  const defs = affixes.map((rolled) => AFFIXES.find((affix) => affix.id === rolled.affixId));
  const prefix = defs.find((affix) => affix?.kind === 'prefix');
  const suffix = defs.find((affix) => affix?.kind === 'suffix');
  const parts: string[] = [];
  if (prefix) parts.push(prefix.name + PREFIX_ENDINGS[base.gender]);
  parts.push(base.name);
  if (suffix) parts.push(suffix.name);
  return parts.join(' ');
}

function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

/** Mischt eine Liste (Fisher-Yates) und gibt eine neue zurück. */
function shuffle<T>(list: T[]): T[] {
  const result = [...list];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
