import type { Point } from './Grid';

/**
 * Etwas in der Welt, das man anklicken kann: Händler, Truhe, Höhleneingang.
 * Ein Klick darauf lässt die Figur zu `standAt` laufen; ist sie näher als `range`
 * am Mittelpunkt `pos`, ruft die Spielwelt `use()` auf (WorldScene.visit).
 */
export interface Interactable {
  /** Mittelpunkt in Welt-Pixeln. */
  readonly pos: Point;
  /** Dorthin läuft die Figur nach einem Klick. */
  readonly standAt: Point;
  /** So nah (Welt-Pixel) muss die Figur an `pos` sein, damit `use` ausgelöst wird. */
  readonly range: number;
  /** Liegt der Punkt `at` (Welt-Koordinaten) auf dem Bild? */
  contains(at: Point): boolean;
  use(): void;
  /** Räumt die Bilder weg, wenn die Zone verlassen wird. */
  destroy(): void;
}
