// Quests: die festen Quests der NPCs und das Kopfgeld-Brett.
// Alle Zahlen und Texte hier sind Startwerte fürs Balancing (GAME.md, Abschnitt 9c).
//
// Eine neue Quest ist nur ein Eintrag in QUESTS. Code braucht es erst für eine neue Quest-ART.
// Wer die Quest vergibt, steht in `giver` (Schlüssel aus src/data/npcs.ts); wo der NPC steht,
// legt der Bauplan der Zone fest (tools/zones/<zone>.mjs, POI-Art `npc`).
// Beim Start prüft das Spiel, ob es jedes Ziel wirklich gibt (src/quests/questIndex.ts).

import type { RarityId } from './items';

/**
 * Die fünf Quest-Arten:
 * - kill:    `count` Gegner des Typs `enemy` besiegen
 * - collect: `count` Dinge sammeln. Mit `enemy`: Der Gegnertyp lässt sie mit der Chance `chance`
 *            fallen (0.6 = 60 %; Elites immer). Ohne `enemy`: Es sind Kisten in der Welt
 *            (POI-Art `questkiste` im Bauplan, mit `quest` = Schlüssel der Quest).
 * - elite:   eine feste Elite besiegen (`elite` = Schlüssel in NAMED_ELITES, src/data/elites.ts)
 * - boss:    einen Boss besiegen (`enemy` = sein Gegnertyp)
 * - explore: einen Ort erreichen: den Marker `marker` der Zone `zone`, auf `radius` Kacheln genau.
 *            `place` = wie der Ort im Questlog heißt.
 */
export type QuestGoal =
  | { type: 'kill'; enemy: string; count: number }
  | { type: 'collect'; item: string; count: number; enemy?: string; chance?: number }
  | { type: 'elite'; elite: string }
  | { type: 'boss'; enemy: string }
  | { type: 'explore'; zone: string; marker: string; radius: number; place: string };

export interface QuestReward {
  xp: number;
  gold: number;
  /** Ein Item genau dieser Seltenheit (Itemlevel = `level` der Quest). Nur bei Elite- und Boss-Quests. */
  item?: RarityId;
}

export interface QuestDef {
  name: string;
  /** Wer die Quest vergibt und die Belohnung auszahlt: Schlüssel aus NPCS (src/data/npcs.ts). */
  giver: string;
  /** Für welche Stufe die Quest gedacht ist (steht im Questlog; Itemlevel der Belohnung). */
  level: number;
  /** Ab dieser Stufe der Figur gibt es die Quest. */
  minLevel: number;
  /** Diese Quest muss vorher abgeschlossen sein (Schlüssel aus QUESTS). */
  requires?: string;
  /** Zwei Sätze, mehr nicht. */
  text: string;
  goal: QuestGoal;
  reward: QuestReward;
}

/**
 * Die Quests in Grünwald. Zusammen geben sie rund 5 350 EP – etwa ein Viertel dessen,
 * was man bis Stufe 10 braucht (21 645 EP) – und 515 Gold.
 */
export const QUESTS: Record<string, QuestDef> = {
  rattenplage: {
    name: 'Rattenplage',
    giver: 'aeltester',
    level: 1,
    minLevel: 1,
    text: 'Die Riesenratten fressen uns die Vorräte weg. Erschlag zehn von ihnen – auf der Westlichtung wimmelt es nur so.',
    goal: { type: 'kill', enemy: 'ratte', count: 10 },
    reward: { xp: 150, gold: 15 },
  },
  spinnenseide: {
    name: 'Spinnenseide',
    giver: 'jaeger',
    level: 3,
    minLevel: 2,
    text: 'Aus Spinnenseide drehe ich die besten Bogensehnen. Bring mir acht Stränge – die Waldspinnen tragen sie am Leib.',
    goal: { type: 'collect', item: 'Spinnenseide', count: 8, enemy: 'spinne', chance: 0.6 },
    reward: { xp: 350, gold: 30 },
  },
  'in-die-hoehle': {
    name: 'In die Höhle',
    giver: 'jaeger',
    level: 4,
    minLevel: 3,
    text: 'Im Pilzhain führt eine Leiter in eine Höhle voller Spinnen. Steig hinab und sieh nach, was ganz hinten haust.',
    goal: { type: 'explore', zone: 'spinnenhoehle', marker: 'brutkammer', radius: 9, place: 'Brutkammer der Spinnenhöhle' },
    reward: { xp: 450, gold: 40 },
  },
  brutmutter: {
    name: 'Die Brutmutter',
    giver: 'jaeger',
    level: 6,
    minLevel: 4,
    requires: 'in-die-hoehle',
    text: 'Du hast das Nest gesehen – solange die Brutmutter lebt, kommen immer neue Spinnen. Mach ihr ein Ende.',
    goal: { type: 'elite', elite: 'brutmutter' },
    reward: { xp: 900, gold: 80, item: 'rare' },
  },
  'goblin-diebesgut': {
    name: 'Goblin-Diebesgut',
    giver: 'wachmann',
    level: 6,
    minLevel: 5,
    text: 'Die Goblins haben unsere Vorratskisten in ihr Lager geschleppt. Hol fünf Kisten zurück – sie stehen hinter dem Zaun.',
    goal: { type: 'collect', item: 'Kiste Diebesgut', count: 5 },
    reward: { xp: 1100, gold: 100 },
  },
  raeuberhauptmann: {
    name: 'Der Räuberhauptmann',
    giver: 'aeltester',
    level: 10,
    minLevel: 8,
    text: 'In der Ruine im Nordosten sitzt der Hauptmann der Wegelagerer. Besiege ihn, dann hat das Dorf endlich Ruhe.',
    goal: { type: 'boss', enemy: 'raeuberhauptmann' },
    reward: { xp: 2400, gold: 250, item: 'epic' },
  },
};

// ---------------------------------------------------------------- Kopfgeld-Brett

/**
 * Das Kopfgeld-Brett am Rathaus: wiederholbare Quests, die alle `rotateMs` wechseln.
 * Wie viele Kopfgelder gleichzeitig aushängen, hängt an der Rathaus-Stufe
 * (TOWN_HALL_BOUNTIES in src/data/town.ts).
 *
 * Belohnung: Jedes Kopfgeld ist so viel "wert" wie eine Anzahl Gegner (`worth`; bei
 * Töte-Kopfgeldern die verlangte Anzahl).
 *   EP   = wert × EP eines Gegners dieser Stufe × xpShare
 *   Gold = wert × Stufe × goldPerLevel
 * Beispiel: 12 Wölfe (Stufe 3) = 12 × 25 × 0.5 = 150 EP und 12 × 3 × 0.8 = 29 Gold.
 */
export const BOUNTY = {
  /** 30 Minuten (echte Zeit – die Uhr läuft weiter, auch wenn das Spiel zu ist). */
  rotateMs: 1800000,
  xpShare: 0.5,
  goldPerLevel: 0.8,
};

export interface BountyTemplate {
  /** Töten: Gegnertyp und Anzahl von–bis. Elite / Boss: wie bei den Quests. */
  goal: { type: 'kill'; enemy: string; count: [number, number] } | { type: 'elite'; elite: string } | { type: 'boss'; enemy: string };
  /** Stufe des Ziels – daran hängt die Belohnung. */
  level: number;
  /** Das Kopfgeld hängt nur aus, solange die Stufe der Figur in diesem Bereich liegt. */
  minLevel: number;
  maxLevel: number;
  /** Elite / Boss: so viele gewöhnliche Gegner ist das Kopfgeld wert. */
  worth?: number;
}

/** Woraus das Brett würfelt. Eine neue Zone hängt hier einfach ihre Ziele an. */
export const BOUNTY_POOL: BountyTemplate[] = [
  { goal: { type: 'kill', enemy: 'ratte', count: [10, 14] }, level: 2, minLevel: 1, maxLevel: 4 },
  { goal: { type: 'kill', enemy: 'wolf', count: [8, 12] }, level: 3, minLevel: 2, maxLevel: 6 },
  { goal: { type: 'kill', enemy: 'spinne', count: [10, 14] }, level: 4, minLevel: 2, maxLevel: 8 },
  { goal: { type: 'kill', enemy: 'fledermaus', count: [8, 10] }, level: 4, minLevel: 3, maxLevel: 7 },
  { goal: { type: 'kill', enemy: 'wildschwein', count: [8, 10] }, level: 5, minLevel: 4, maxLevel: 12 },
  { goal: { type: 'kill', enemy: 'goblin', count: [8, 12] }, level: 7, minLevel: 5, maxLevel: 12 },
  { goal: { type: 'kill', enemy: 'schleuderer', count: [5, 8] }, level: 8, minLevel: 6, maxLevel: 12 },
  { goal: { type: 'kill', enemy: 'wegelagerer', count: [8, 12] }, level: 8, minLevel: 7, maxLevel: 12 },
  { goal: { type: 'elite', elite: 'brutmutter' }, level: 6, minLevel: 5, maxLevel: 12, worth: 12 },
  { goal: { type: 'boss', enemy: 'raeuberhauptmann' }, level: 10, minLevel: 9, maxLevel: 12, worth: 30 },
];

// ---------------------------------------------------------------- Anzeige

/** Quest-Zähler im HUD (unter der Minimap), Markierungen auf den Karten und die Kisten. */
export const QUEST_UI = {
  /** So viele Zeilen zeigt der Zähler höchstens – und auf kleinen Bildschirmen (Handy quer). Die Zeile "+ n weitere" zählt mit. */
  trackerLines: 6,
  trackerLinesSmall: 3,
  /** Bild niedriger als so viele Pixel = kleiner Bildschirm. */
  smallScreenHeight: 500,
  /** Farbe von allem, was zu einer Quest gehört: Ring auf Minimap und großer Karte, Zeichen über NPCs. */
  markColor: '#9dff3d',
  /** Größe des Rings (wie die Punkte der Minimap, src/data/minimap.ts). */
  markRadius: 4.5,
  /** So nah (Welt-Pixel) muss die Figur an eine Quest-Kiste heran, um sie mitzunehmen. */
  crateRange: 22,
};
