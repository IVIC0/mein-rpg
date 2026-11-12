// Stellschrauben fürs Speichern. Der Aufbau eines Spielstands steht in src/save/saveGame.ts.

/**
 * Format-Nummer des Spielstands. Erhöhen, sobald sich der Aufbau ändert (z. B. ein Feld
 * umbenannt wird) – und in src/save/saveGame.ts unter MIGRATIONS eintragen, wie ein
 * alter Spielstand ins neue Format kommt.
 */
export const SAVE_VERSION = 1;

/** So viele normale Spielstand-Slots gibt es. Dazu kommt immer ein eigener Slot für Test-Spielstände. */
export const SLOT_COUNT = 3;

/** Alle so viele Millisekunden wird von selbst gespeichert (Position, Leben, Spielzeit). */
export const AUTOSAVE_INTERVAL_MS = 30000;

/**
 * Nach einem wichtigen Ereignis (Beute, Gold, Ausrüstung, Stufenaufstieg, Tod, Einstellung)
 * wird so viele Millisekunden später gespeichert. Die kurze Pause fasst mehrere Ereignisse
 * zusammen, z. B. EP + Gold + Item bei einem besiegten Gegner.
 */
export const SAVE_DELAY_MS = 1000;

/** So viele Zeichen darf der Name einer Figur höchstens haben. */
export const NAME_MAX_LENGTH = 16;
