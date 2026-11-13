// Passive Lebensregeneration der Figur – der langsame Heilweg. Der schnelle ist der
// Heiltrank (src/data/shop.ts). Alle Zahlen sind Startwerte fürs Balancing.
//
// Ablauf: Im Kampf und kurz danach kommt nichts zurück. Danach erholt sich die Figur
// langsam – im Stehen (Rasten) schneller als im Laufen.
// "Leben pro Sekunde" von der Ausrüstung zählt extra und wirkt immer, auch im Kampf.

export const REGEN = {
  /**
   * So lange nach dem letzten Treffer (ausgeteilt oder kassiert) gibt es keine Regeneration
   * (Millisekunden). Verfolgt ein Gegner die Figur, beginnt die Zeit erst, wenn er aufgibt.
   * Sollte nicht kleiner sein als COMBAT_TIMEOUT_MS in src/config.ts (5 Sekunden = "im Kampf").
   */
  delayMs: 8000,
  /** Laufen: so viele Sekunden dauert es von 0 auf volles Leben. Kleiner = schneller. */
  walkingFullSeconds: 180,
  /** Rasten (stehen bleiben): so viele Sekunden von 0 auf volles Leben. Das Gasthaus verkürzt das (src/data/town.ts). */
  restingFullSeconds: 120,
  /** Erst wenn die Figur so lange still steht, gilt sie als rastend (Millisekunden). */
  restAfterMs: 1500,
  /**
   * Nach dem Tod wacht die Figur mit diesem Anteil ihres Lebens im Dorf auf (0.5 = halbes Leben,
   * 1 = volles Leben). So ist Sterben kein billiger Heilweg.
   */
  reviveHpFraction: 0.5,
};

/**
 * Wie sich die Figur gerade erholt: gar nicht, langsam im Laufen, schneller beim Rasten –
 * oder im Dorf, sobald das Gasthaus steht (src/data/town.ts).
 */
export type RegenState = 'none' | 'walking' | 'resting' | 'town';
