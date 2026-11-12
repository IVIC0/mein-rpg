// Loot: Seltenheiten, Basis-Items und Affixe. Aus diesen Listen würfelt der
// Item-Generator (src/items/generator.ts) jedes Item zusammen.
// Drop-Chancen, Seltenheits-Anteile je Gegnerrang und Inventargröße stehen in src/data/loot.ts.

import type { StatId } from './stats';

// ---------------------------------------------------------------- Seltenheiten

export type RarityId = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';

export interface RarityDef {
  id: RarityId;
  name: string;
  /** Farbe für Namen und Rahmen (CSS). */
  color: string;
  /** So viele Affixe hat ein Item dieser Seltenheit. */
  affixes: number;
}

/** Von häufig nach selten sortiert. */
export const RARITIES: RarityDef[] = [
  { id: 'common', name: 'Gewöhnlich', color: '#f2f2f2', affixes: 0 },
  { id: 'uncommon', name: 'Ungewöhnlich', color: '#4fd35a', affixes: 1 },
  { id: 'rare', name: 'Selten', color: '#4d9bff', affixes: 2 },
  { id: 'epic', name: 'Episch', color: '#b668ff', affixes: 3 },
  { id: 'legendary', name: 'Legendär', color: '#ff9a2e', affixes: 4 },
  { id: 'mythic', name: 'Mythisch', color: '#ff4038', affixes: 5 },
];

// ---------------------------------------------------------------- Plätze

/** Art eines Items. Ein Ring passt in beide Ring-Plätze. */
export type ItemSlot = 'weapon' | 'shield' | 'helmet' | 'chest' | 'gloves' | 'boots' | 'amulet' | 'ring';

/** Die Ausrüstungsplätze der Figur. */
export type EquipSlot = Exclude<ItemSlot, 'ring'> | 'ring1' | 'ring2';

export const ITEM_SLOT_NAMES: Record<ItemSlot, string> = {
  weapon: 'Waffe',
  shield: 'Schild',
  helmet: 'Helm',
  chest: 'Brust',
  gloves: 'Handschuhe',
  boots: 'Stiefel',
  amulet: 'Amulett',
  ring: 'Ring',
};

/** Die Ausrüstungsplätze in der Reihenfolge, in der das Charakterfenster sie zeigt. */
export const EQUIP_SLOTS: { id: EquipSlot; accepts: ItemSlot; label: string }[] = [
  { id: 'weapon', accepts: 'weapon', label: 'Waffe' },
  { id: 'shield', accepts: 'shield', label: 'Schild' },
  { id: 'helmet', accepts: 'helmet', label: 'Helm' },
  { id: 'chest', accepts: 'chest', label: 'Brust' },
  { id: 'gloves', accepts: 'gloves', label: 'Hände' },
  { id: 'boots', accepts: 'boots', label: 'Füße' },
  { id: 'amulet', accepts: 'amulet', label: 'Amulett' },
  { id: 'ring1', accepts: 'ring', label: 'Ring 1' },
  { id: 'ring2', accepts: 'ring', label: 'Ring 2' },
];

// ---------------------------------------------------------------- Basis-Items

/**
 * Grammatisches Geschlecht des Namens: m = der Dolch, f = die Axt, n = das Schwert,
 * pl = Mehrzahl (die Stiefel). Danach richtet sich die Endung des Präfixes:
 * "Scharfer Dolch", "Scharfe Axt", "Scharfes Schwert", "Gehärtete Stiefel".
 */
export type Gender = 'm' | 'f' | 'n' | 'pl';

export interface ItemBaseDef {
  id: string;
  name: string;
  gender: Gender;
  slot: ItemSlot;
  /** Bild-Nummer in assets/sprites/characters.png. */
  icon: number;
  /**
   * Der feste Wert des Items: `atLevel1` auf Itemlevel 1, pro Itemlevel darüber
   * kommt `perLevel` dazu. Beispiel Schwert Itemlevel 5: 3 + 1.2 × 4 = 7,8 Angriffskraft.
   */
  base: { stat: StatId; atLevel1: number; perLevel: number };
}

export const ITEM_BASES: ItemBaseDef[] = [
  { id: 'schwert', name: 'Schwert', gender: 'n', slot: 'weapon', icon: 104, base: { stat: 'attackPower', atLevel1: 3, perLevel: 1.2 } },
  { id: 'axt', name: 'Axt', gender: 'f', slot: 'weapon', icon: 119, base: { stat: 'attackPower', atLevel1: 3, perLevel: 1.2 } },
  { id: 'dolch', name: 'Dolch', gender: 'm', slot: 'weapon', icon: 103, base: { stat: 'attackPower', atLevel1: 3, perLevel: 1.2 } },
  { id: 'holzschild', name: 'Holzschild', gender: 'm', slot: 'shield', icon: 101, base: { stat: 'armor', atLevel1: 4, perLevel: 1.5 } },
  { id: 'rundschild', name: 'Rundschild', gender: 'm', slot: 'shield', icon: 102, base: { stat: 'armor', atLevel1: 4, perLevel: 1.5 } },
  { id: 'helm', name: 'Helm', gender: 'm', slot: 'helmet', icon: 132, base: { stat: 'armor', atLevel1: 3, perLevel: 0.8 } },
  { id: 'ruestung', name: 'Rüstung', gender: 'f', slot: 'chest', icon: 133, base: { stat: 'armor', atLevel1: 5, perLevel: 1.5 } },
  { id: 'handschuhe', name: 'Handschuhe', gender: 'pl', slot: 'gloves', icon: 134, base: { stat: 'armor', atLevel1: 2, perLevel: 0.6 } },
  { id: 'stiefel', name: 'Stiefel', gender: 'pl', slot: 'boots', icon: 135, base: { stat: 'armor', atLevel1: 2, perLevel: 0.6 } },
  { id: 'amulett', name: 'Amulett', gender: 'n', slot: 'amulet', icon: 136, base: { stat: 'maxHp', atLevel1: 8, perLevel: 3 } },
  { id: 'ring', name: 'Ring', gender: 'm', slot: 'ring', icon: 137, base: { stat: 'attackPower', atLevel1: 1, perLevel: 0.3 } },
];

/** Der feste Wert eines Items streut um diesen Anteil nach oben und unten (0.15 = ±15 %). */
export const BASE_SPREAD = 0.15;

// ---------------------------------------------------------------- Affixe

export interface AffixDef {
  id: string;
  /**
   * prefix = Eigenschaftswort vor dem Namen. `name` ist dann der Wortstamm, die Endung
   * hängt der Generator an ("Scharf" → "Scharfes Schwert").
   * suffix = Zusatz hinter dem Namen ("der Stärke" → "Schwert der Stärke").
   */
  kind: 'prefix' | 'suffix';
  name: string;
  stat: StatId;
  /** Auf diesen Item-Arten kann der Affix vorkommen; fehlt die Angabe, auf allen. */
  slots?: ItemSlot[];
  /** Spanne des Werts auf Itemlevel 1. Der Wurf landet irgendwo dazwischen. */
  min: number;
  max: number;
  /** Pro Itemlevel über 1 wächst die Spanne um diesen Anteil (0.25 = +25 % pro Stufe). */
  scale: number;
}

/** Alle Item-Arten außer der Waffe. */
const NOT_WEAPON: ItemSlot[] = ['shield', 'helmet', 'chest', 'gloves', 'boots', 'amulet', 'ring'];

/**
 * Jeder Wert kommt nur in einem Affix vor – ein Item hat also nie zweimal denselben Affix-Wert.
 * Für jede Item-Art müssen mindestens 5 Affixe möglich sein (Mythisch hat 5).
 * Beispiel "der Stärke": Itemlevel 1 = 1–2, Itemlevel 10 = 3–7 Stärke.
 */
export const AFFIXES: AffixDef[] = [
  { id: 'scharf', kind: 'prefix', name: 'Scharf', stat: 'attackPower', slots: ['weapon'], min: 1, max: 3, scale: 0.25 },
  { id: 'gehaertet', kind: 'prefix', name: 'Gehärtet', stat: 'armor', slots: NOT_WEAPON, min: 2, max: 4, scale: 0.25 },
  { id: 'leicht', kind: 'prefix', name: 'Leicht', stat: 'attackSpeed', slots: ['weapon', 'gloves'], min: 3, max: 5, scale: 0.1 },
  { id: 'toedlich', kind: 'prefix', name: 'Tödlich', stat: 'critDamage', slots: ['weapon', 'gloves', 'amulet', 'ring'], min: 5, max: 10, scale: 0.15 },
  { id: 'blutig', kind: 'prefix', name: 'Blutig', stat: 'lifeSteal', slots: ['weapon', 'amulet', 'ring'], min: 1, max: 2, scale: 0.1 },
  { id: 'staerke', kind: 'suffix', name: 'der Stärke', stat: 'strength', min: 1, max: 2, scale: 0.25 },
  { id: 'ausdauer', kind: 'suffix', name: 'der Ausdauer', stat: 'stamina', min: 1, max: 2, scale: 0.25 },
  { id: 'geschick', kind: 'suffix', name: 'des Geschicks', stat: 'agility', min: 1, max: 2, scale: 0.25 },
  { id: 'erholung', kind: 'suffix', name: 'der Erholung', stat: 'hpRegen', min: 0.3, max: 0.6, scale: 0.25 },
];

/** Endung eines Präfixes je Geschlecht des Basis-Items. */
export const PREFIX_ENDINGS: Record<Gender, string> = { m: 'er', f: 'e', n: 'es', pl: 'e' };
