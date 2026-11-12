// Alle Einstellungen des Spielers in EINEM Objekt (`Settings`).
// Es besteht nur aus einfachen Werten (an/aus, Zahlen). Die Einstellungen gelten für
// alle Spielstände gemeinsam: Der Browser merkt sie sich, sie stehen nicht im Spielstand.

import { loadUi, saveUi } from './storage';

/** Die HUD-Elemente, die sich verschieben lassen. */
export const HUD_ITEMS = [
  { id: 'player', elementId: 'player-frame', label: 'Spielerrahmen' },
  { id: 'target', elementId: 'target-frame', label: 'Zielrahmen' },
  { id: 'skillbar', elementId: 'skillbar', label: 'Skill-Leiste' },
  { id: 'loot', elementId: 'loot-log', label: 'Beute-Liste' },
  { id: 'minimap', elementId: 'minimap', label: 'Minimap' },
] as const;

export type HudItemId = (typeof HUD_ITEMS)[number]['id'];

/** Ein verschiebbares HUD-Element. */
export interface HudItemSettings {
  visible: boolean;
  /** Größe: 1 = 100 %. */
  scale: number;
  /** Deckkraft: 1 = voll sichtbar. */
  opacity: number;
  /** Verschiebung gegenüber dem Standard-Platz in Bildschirm-Pixeln. */
  dx: number;
  dy: number;
}

/** Ein Schild über einer Figur: Name, Stufe und Lebensbalken einzeln schaltbar. */
export interface PlateSettings {
  name: boolean;
  level: boolean;
  bar: boolean;
  scale: number;
  opacity: number;
}

export interface Settings {
  hud: Record<HudItemId, HudItemSettings>;
  /** Das Schild über der eigenen Figur. */
  playerPlate: PlateSettings;
  /** Die Schilder über Gegnern. `showAll` = false: nur Ziel, Angreifer und Verletzte. */
  enemyPlates: PlateSettings & { showAll: boolean };
  /** Schwebende Zahlen und Texte (Schaden, Heilung, EP, Skill-Namen). */
  floaters: { visible: boolean; scale: number; opacity: number };
}

/** Grenzen der Schieberegler. Die Deckkraft geht nie auf 0 – dafür gibt es "ausblenden". */
export const SCALE_RANGE = { min: 0.6, max: 2, step: 0.05 };
export const OPACITY_RANGE = { min: 0.2, max: 1, step: 0.05 };

const HUD_ITEM_DEFAULT: HudItemSettings = { visible: true, scale: 1, opacity: 1, dx: 0, dy: 0 };
const PLATE_DEFAULT: PlateSettings = { name: true, level: true, bar: true, scale: 1, opacity: 1 };

/** Die Standardwerte – "Alles auf Standard" stellt genau das wieder her. */
export const DEFAULT_SETTINGS: Settings = {
  hud: {
    player: { ...HUD_ITEM_DEFAULT },
    target: { ...HUD_ITEM_DEFAULT },
    skillbar: { ...HUD_ITEM_DEFAULT },
    loot: { ...HUD_ITEM_DEFAULT },
    minimap: { ...HUD_ITEM_DEFAULT },
  },
  playerPlate: { ...PLATE_DEFAULT },
  enemyPlates: { ...PLATE_DEFAULT, showAll: true },
  floaters: { visible: true, scale: 1, opacity: 1 },
};

const STORAGE_KEY = 'einstellungen';

type Plain = Record<string, unknown>;

/**
 * Baut ein Objekt wie `defaults` und übernimmt daraus alle Werte aus `stored`, die
 * vom Typ her passen. Fehlende oder kaputte Werte (z. B. nach einem Update) kommen
 * so aus dem Standard, Unbekanntes fällt weg.
 */
function mergeDeep(defaults: Plain, stored: unknown): Plain {
  const source = (typeof stored === 'object' && stored !== null ? stored : {}) as Plain;
  const result: Plain = {};
  for (const [key, value] of Object.entries(defaults)) {
    if (typeof value === 'object' && value !== null) result[key] = mergeDeep(value as Plain, source[key]);
    else result[key] = typeof source[key] === typeof value ? source[key] : value;
  }
  return result;
}

/**
 * Macht aus gespeicherten Daten vollständige Einstellungen (als eigene Kopie):
 * Fehlendes kommt aus dem Standard. Ohne Angabe gibt es die Standardwerte.
 */
export function normalizeSettings(stored?: unknown): Settings {
  return mergeDeep(DEFAULT_SETTINGS as unknown as Plain, stored) as unknown as Settings;
}

/** Liest die Einstellungen aus dem Browser; gibt es keine, kommt der Standard. */
export function loadSettings(): Settings {
  const stored = loadUi<Plain>(STORAGE_KEY, {});
  const settings = normalizeSettings(stored);
  // Alte Einstellung aus Schritt 5b übernehmen.
  if (typeof stored.showAllNameplates === 'boolean') settings.enemyPlates.showAll = stored.showAllNameplates;
  return settings;
}

export function saveSettings(settings: Settings): void {
  saveUi(STORAGE_KEY, settings);
}

/**
 * Einmaliger Umzug: In Meilenstein 7 lagen die Einstellungen im Spielstand (Format 1, pro Slot).
 * Seit Meilenstein 8 sind sie global. Damit nichts verloren geht, werden beim ersten Start
 * die Einstellungen des zuletzt gespielten alten Spielstands übernommen.
 * `saveText` = dessen gespeicherter Text (null = es gibt keinen).
 */
export function adoptSettingsFromOldSave(saveText: string | null): void {
  const marker = loadUi('einstellungen-umzug', { done: false });
  if (marker.done) return;
  saveUi('einstellungen-umzug', { done: true });
  if (saveText === null) return;
  try {
    const old = JSON.parse(saveText) as Plain;
    if (old.version === 1 && typeof old.settings === 'object' && old.settings !== null) saveSettings(normalizeSettings(old.settings));
  } catch {
    // Kaputter Spielstand: dann bleiben die Einstellungen des Browsers.
  }
}

/** Setzt `settings` auf die Standardwerte zurück. Das Objekt selbst bleibt dasselbe. */
export function resetSettings(settings: Settings): void {
  Object.assign(settings, normalizeSettings());
}
