// Kleine Helfer für die HTML-Anzeigen.

/** Die Symbole kommen aus characters.png: 12 Bilder pro Zeile, 18 Pixel Raster, 1 Pixel Rand. */
const ICON_COLUMNS = 12;
const ICON_STEP = 18;

/** Holt ein Element aus index.html; fehlt es, gibt es eine klare Fehlermeldung. */
export function byId(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Element #${id} fehlt in index.html.`);
  return element;
}

/**
 * CSS-Angabe, die das Bild Nummer `frame` aus characters.png als Hintergrund zeigt.
 * Das Element muss 16 × 16 Pixel groß sein (Klasse "sprite-icon" in hud.css).
 */
export function iconPosition(frame: number): string {
  const x = 1 + (frame % ICON_COLUMNS) * ICON_STEP;
  const y = 1 + Math.floor(frame / ICON_COLUMNS) * ICON_STEP;
  return `-${x}px -${y}px`;
}
