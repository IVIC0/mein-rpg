// Zonen: Name, Stufenbereich, Grafik und wo die Figur nach dem Tod aufwacht.
// Wie eine Zone aussieht und was in ihr steht (Wege, Gegner, Truhen, Übergänge), legt ihr
// Bauplan fest: tools/zones/<zone>.mjs. Der Schlüssel hier ist der Dateiname dort.
//
// Neue Zone: Bauplan schreiben, hier eintragen, `npm run assets`. Die Karte liegt dann unter
// public/assets/maps/<zone>.json, das Tileset unter public/assets/tilesets/<tileset>.png.

export interface ZoneDef {
  /** So heißt die Zone im Spiel. */
  name: string;
  /** Stufenbereich der Gegner, nur für die Anzeige beim Betreten. */
  levels: [number, number];
  /** Name des Tilesets (Liste TILESETS in tools/build-tilesets.mjs). */
  tileset: string;
  /** Farbe hinter der Karte – in Höhlen ist das der Fels. */
  background: string;
  /** Nach dem Tod wacht die Figur in dieser Zone an diesem Marker auf. */
  respawn: { zone: string; marker: string };
}

export const ZONES: Record<string, ZoneDef> = {
  gruenwald: {
    name: 'Grünwald',
    levels: [1, 10],
    tileset: 'gruenwald',
    background: '#1b2a1f',
    respawn: { zone: 'gruenwald', marker: 'spawn' },
  },
  spinnenhoehle: {
    name: 'Spinnenhöhle',
    levels: [3, 6],
    tileset: 'hoehle',
    background: '#1b1a2b',
    respawn: { zone: 'gruenwald', marker: 'spawn' },
  },
};

/** In dieser Zone beginnt ein neues Spiel. */
export const START_ZONE = 'gruenwald';

/** So lange dauert das Aufblenden nach einem Zonenwechsel (Millisekunden). */
export const ZONE_FADE_MS = 350;
