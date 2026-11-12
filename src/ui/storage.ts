// Merkt sich Kleinigkeiten der Oberfläche (Fenster-Position, Einstellungen) im Browser.
// Das ist nicht der Spielstand – der kommt mit Meilenstein 7.

const PREFIX = 'mein-rpg.ui.';

/** Liest einen gemerkten Wert. Fehlt er oder ist er kaputt, kommt `fallback` zurück. */
export function loadUi<T extends object>(key: string, fallback: T): T {
  try {
    const text = window.localStorage.getItem(PREFIX + key);
    // Fehlende Felder (z. B. nach einem Update) kommen aus dem Standardwert.
    return text ? { ...fallback, ...(JSON.parse(text) as Partial<T>) } : { ...fallback };
  } catch {
    return { ...fallback };
  }
}

/** Merkt sich einen Wert. Klappt das nicht (z. B. privater Modus), läuft das Spiel einfach weiter. */
export function saveUi(key: string, value: object): void {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Absichtlich leer: ohne Speicher gilt die Einstellung nur bis zum Neuladen.
  }
}
