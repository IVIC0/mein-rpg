// Große Karte (Taste M oder der Knopf in der Leiste): Größe, Zielmarker und Beschriftung.
// Die Farben der Punkte (Gegner, Händler, Truhen …) sind die der Minimap: src/data/minimap.ts.
// Das Gelände und die Ortsnamen kommen von selbst aus der Karte der Zone (`label` im Bauplan,
// tools/zones/<zone>.mjs) – eine neue Zone braucht hier nichts.
// Alle Zahlen sind Startwerte.

export const WORLD_MAP = {
  /**
   * So viel vom Bildschirm füllt die Karte bei Größe 100 % (0.8 = 80 % der Breite oder Höhe,
   * je nachdem, was zuerst anstößt). Der Regler "Größe" in den Einstellungen rechnet darauf;
   * über den Bildrand hinaus wächst sie nie.
   */
  fill: 0.8,
  /**
   * Kleiner Bildschirm (Handy im Querformat): Ist das Bild niedriger als so viele Pixel, nutzt die
   * Karte immer den ganzen Platz – der Regler "Größe" spielt dann keine Rolle.
   */
  smallScreenHeight: 500,
  /** Abstand zum Bildrand, der immer frei bleibt (Bildschirm-Pixel). */
  margin: 6,
  /** Die Punkte sind um diesen Faktor größer als auf der Minimap. */
  dotScale: 1.3,
  /** Zielmarker des Automatiklaufs: Farbe und Größe des Rings (Bildschirm-Pixel). */
  goalColor: '#ffd34d',
  goalRadius: 6,
  /** Auf der Minimap ist das Ziel ein Punkt dieser Größe. */
  minimapGoalRadius: 3,
  /** Ortsnamen: Farbe, kleinste und größte Schrift (Bildschirm-Pixel) und Versatz nach oben in Kacheln. */
  labelColor: '#f4ecd2',
  labelMinSize: 9,
  labelMaxSize: 14,
  labelRaise: 3,
  /** true = die Karte schließt sich nach dem Klick auf ein Ziel von selbst. */
  closeOnClick: false,
};
