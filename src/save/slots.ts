// Die Spielstand-Slots im Browser (localStorage) und der gerade laufende Spielstand.
//
// Jeder Slot hat seinen eigenen Schlüssel. Gespeichert wird immer nur in den Slot, der
// beim Laden der Seite gewählt wurde (`session.slotId`) – so überschreibt nie ein Slot
// einen anderen. Ein Slot-Wechsel lädt deshalb die Seite neu.

import { SLOT_COUNT } from '../data/save';
import { parseSave, type ParseResult, type SaveGame } from './saveGame';

const PREFIX = 'mein-rpg.save.';
/** Unter diesem Schlüssel steht, welcher Slot zuletzt gespielt wurde. */
const LAST_KEY = PREFIX + 'zuletzt';

/** Die normalen Slots: "slot1", "slot2" … */
export const MAIN_SLOTS: string[] = Array.from({ length: SLOT_COUNT }, (_, index) => `slot${index + 1}`);
/** Der eigene Slot für Test-Spielstände (Vorlagen in src/data/testSaves.ts). */
export const TEST_SLOT = 'test';
export const ALL_SLOTS: string[] = [...MAIN_SLOTS, TEST_SLOT];

export function slotLabel(id: string): string {
  return id === TEST_SLOT ? 'Test' : `Slot ${MAIN_SLOTS.indexOf(id) + 1}`;
}

/** Was in einem Slot liegt: nichts, ein lesbarer Spielstand oder Daten, die sich nicht laden lassen. */
export type SlotContent = { state: 'empty' } | { state: 'ok'; save: SaveGame } | { state: 'broken'; reason: string };

export function readSlot(id: string): SlotContent {
  const text = rawSlot(id);
  if (text === null) return { state: 'empty' };
  const result: ParseResult = parseSave(text);
  return result.ok ? { state: 'ok', save: result.save } : { state: 'broken', reason: result.reason };
}

/** Der gespeicherte Text eines Slots, so wie er im Browser liegt; null = leer. */
export function rawSlot(id: string): string | null {
  try {
    return window.localStorage.getItem(PREFIX + id);
  } catch {
    return null;
  }
}

/** Schreibt einen Spielstand in einen Slot. Gibt false zurück, wenn der Browser das nicht zulässt (z. B. Speicher voll). */
export function writeSlot(id: string, save: SaveGame): boolean {
  try {
    window.localStorage.setItem(PREFIX + id, JSON.stringify(save));
    return true;
  } catch {
    return false;
  }
}

export function deleteSlot(id: string): void {
  try {
    window.localStorage.removeItem(PREFIX + id);
  } catch {
    // Ohne Speicher gibt es auch nichts zu löschen.
  }
}

/** Der zuletzt gespielte Slot – er lädt beim Start von selbst. null = keiner. */
export function lastSlot(): string | null {
  try {
    const id = window.localStorage.getItem(LAST_KEY);
    return id !== null && ALL_SLOTS.includes(id) ? id : null;
  } catch {
    return null;
  }
}

export function setLastSlot(id: string | null): void {
  try {
    if (id === null) window.localStorage.removeItem(LAST_KEY);
    else window.localStorage.setItem(LAST_KEY, id);
  } catch {
    // Absichtlich leer: dann fragt das Spiel beim nächsten Start nach dem Slot.
  }
}

// ---------------------------------------------------------------- Test-Parameter in der Adresse

/**
 * Die Test-Parameter aus der Adresse: ?stufe=5, ?beute=12, ?elite=1.
 * Ist einer davon gesetzt, läuft ein "Testlauf": eine frische Figur, die in keinem
 * Slot liegt und nie gespeichert wird. Echte Spielstände bleiben so unberührt.
 */
export interface TestParams {
  active: boolean;
  level: number;
  loot: number;
  elite: boolean;
}

const TEST_PARAM_NAMES = ['stufe', 'beute', 'elite'];

export function readTestParams(): TestParams {
  const params = new URLSearchParams(window.location.search);
  return {
    active: TEST_PARAM_NAMES.some((name) => params.has(name)),
    level: Number(params.get('stufe')) || 0,
    loot: Number(params.get('beute')) || 0,
    elite: params.get('elite') === '1',
  };
}

// ---------------------------------------------------------------- Der laufende Spielstand

/**
 * Was gerade gespielt wird. `slotId` = null heißt: Testlauf, es wird nicht gespeichert.
 * `frozen` wird gesetzt, kurz bevor die Seite für einen Slot-Wechsel neu lädt – ab dann
 * schreibt das Spiel nichts mehr (sonst käme z. B. ein gelöschter Slot gleich wieder).
 */
export const session: { slotId: string | null; save: SaveGame | null; frozen: boolean } = {
  slotId: null,
  save: null,
  frozen: false,
};

/**
 * Startet das Spiel neu mit dem Slot `id` (null = Auswahl bzw. Namenseingabe zeigen).
 * Test-Parameter in der Adresse fallen dabei weg. Vorher selbst speichern, falls gewünscht.
 */
export function restartWith(id: string | null): void {
  session.frozen = true;
  setLastSlot(id);
  const url = new URL(window.location.href);
  if (TEST_PARAM_NAMES.some((name) => url.searchParams.has(name))) {
    for (const name of TEST_PARAM_NAMES) url.searchParams.delete(name);
    window.location.href = url.toString();
  } else {
    window.location.reload();
  }
}

// ---------------------------------------------------------------- Export als Datei

/** Lädt den Inhalt eines Slots als Datei herunter (JSON-Text, so wie er gespeichert ist). */
export function exportSlot(id: string): void {
  const text = rawSlot(id);
  if (text === null) return;
  const content = readSlot(id);
  const name = content.state === 'ok' ? content.save.name.replace(/[^a-zA-Z0-9äöüÄÖÜß]+/g, '-') : slotLabel(id);
  const date = new Date().toISOString().slice(0, 10);

  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  link.download = `mein-rpg-${name}-${date}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}
