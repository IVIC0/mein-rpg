// Vorlagen für Test-Spielstände (Menü "Spielstände" → "Test-Spielstand anlegen").
// Ein Test-Spielstand landet immer im eigenen Slot "Test" und berührt die normalen Slots nicht.
//
// Neue Vorlage: einfach einen weiteren Eintrag an die Liste hängen.

import type { EquipSlot, RarityId } from './items';
import type { TownLevels } from './town';

export interface TestSaveDef {
  /** So heißt die Vorlage im Menü. */
  label: string;
  /** Name der Figur. */
  name: string;
  level: number;
  gold: number;
  /** Heiltränke im Gepäck. */
  potions: number;
  /** Angelegte Ausrüstung: Platz → Seltenheit. Die Werte werden gewürfelt, Itemlevel = Stufe der Figur. */
  equipped: Partial<Record<EquipSlot, RarityId>>;
  /** Inventar: je Eintrag ein zufälliges Item dieser Seltenheit (Itemlevel = Stufe der Figur). */
  bag: RarityId[];
  /** Dorfausbau: Stufe einzelner Gebäude (src/data/town.ts). Ohne Angabe: wie bei einem neuen Spiel. */
  town?: Partial<TownLevels>;
  /** Diese Bosse gelten als schon besiegt (Gegnertyp aus src/data/enemies.ts) – das schaltet Rathaus-Stufen frei. */
  bossKills?: string[];
}

export const TEST_SAVES: TestSaveDef[] = [
  {
    label: 'Stufe 1 – neu',
    name: 'Test Stufe 1',
    level: 1,
    gold: 0,
    potions: 0,
    equipped: {},
    bag: [],
  },
  {
    label: 'Stufe 5 – etwas Loot',
    name: 'Test Stufe 5',
    level: 5,
    gold: 150,
    potions: 2,
    equipped: { weapon: 'uncommon', chest: 'common', helmet: 'common', boots: 'uncommon' },
    bag: ['common', 'common', 'common', 'uncommon', 'uncommon', 'rare'],
  },
  {
    label: 'Stufe 10 – voll ausgerüstet',
    name: 'Test Stufe 10',
    level: 10,
    gold: 1500,
    potions: 5,
    equipped: {
      weapon: 'epic',
      shield: 'rare',
      helmet: 'rare',
      chest: 'epic',
      gloves: 'rare',
      boots: 'rare',
      amulet: 'rare',
      ring1: 'rare',
      ring2: 'uncommon',
    },
    bag: ['common', 'uncommon', 'uncommon', 'rare', 'rare', 'epic', 'legendary', 'mythic'],
  },
  {
    // Zum Ausprobieren des Dorfausbaus: genug Gold für Rathaus 2 und alle Gebäude auf Stufe 2
    // (1 500 + 4 × 950 = 5 300 Gold), der Räuberhauptmann gilt als besiegt.
    label: 'Stufe 10 – Dorfausbau',
    name: 'Test Dorf',
    level: 10,
    gold: 6000,
    potions: 12,
    equipped: { weapon: 'rare', shield: 'uncommon', helmet: 'uncommon', chest: 'rare', gloves: 'uncommon', boots: 'uncommon' },
    bag: ['common', 'uncommon', 'uncommon', 'rare', 'epic'],
    bossKills: ['raeuberhauptmann'],
  },
];
