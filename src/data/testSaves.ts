// Vorlagen für Test-Spielstände (Menü "Spielstände" → "Test-Spielstand anlegen").
// Ein Test-Spielstand landet immer im eigenen Slot "Test" und berührt die normalen Slots nicht.
//
// Neue Vorlage: einfach einen weiteren Eintrag an die Liste hängen.

import type { EquipSlot, RarityId } from './items';

export interface TestSaveDef {
  /** So heißt die Vorlage im Menü. */
  label: string;
  /** Name der Figur. */
  name: string;
  level: number;
  gold: number;
  /** Angelegte Ausrüstung: Platz → Seltenheit. Die Werte werden gewürfelt, Itemlevel = Stufe der Figur. */
  equipped: Partial<Record<EquipSlot, RarityId>>;
  /** Inventar: je Eintrag ein zufälliges Item dieser Seltenheit (Itemlevel = Stufe der Figur). */
  bag: RarityId[];
}

export const TEST_SAVES: TestSaveDef[] = [
  {
    label: 'Stufe 1 – neu',
    name: 'Test Stufe 1',
    level: 1,
    gold: 0,
    equipped: {},
    bag: [],
  },
  {
    label: 'Stufe 5 – etwas Loot',
    name: 'Test Stufe 5',
    level: 5,
    gold: 150,
    equipped: { weapon: 'uncommon', chest: 'common', helmet: 'common', boots: 'uncommon' },
    bag: ['common', 'common', 'common', 'uncommon', 'uncommon', 'rare'],
  },
  {
    label: 'Stufe 10 – voll ausgerüstet',
    name: 'Test Stufe 10',
    level: 10,
    gold: 1500,
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
];
