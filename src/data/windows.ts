// Werte für Geräte-Erkennung und Fenster (Meilenstein 12b). Alles hier sind Startwerte von mir.
// Wie die Fenster funktionieren, steht in src/ui/GameWindow.ts, die Erkennung in src/ui/device.ts.

/** Ab wann das Spiel das Handy-Layout nimmt und wie es mit dem Finger umgeht. */
export const DEVICE = {
  /**
   * Ist die kürzere Bildschirmseite kleiner als das (CSS-Pixel), gilt das Handy-Layout.
   * Handys liegen bei 320–430, Tablets ab rund 600. Ein sehr kleines Browserfenster am PC
   * bekommt damit auch das Handy-Layout – das ist gewollt.
   */
  mobileShortSide: 500,
};

/** Wo ein Fenster am PC beim ersten Öffnen sitzt. */
export interface PcStart {
  /** Waagerecht: am linken Rand, in der Mitte oder am rechten Rand. */
  x: 'left' | 'center' | 'right';
  /** Senkrecht: Abstand von oben (Pixel) oder in der Mitte. */
  y: number | 'center';
}

/**
 * Wo ein Fenster am Handy beim ersten Öffnen sitzt – immer unter der Knopf-Leiste:
 * - 'full'  = fast der ganze Bildschirm,
 * - 'first' = linke Hälfte (quer) bzw. obere Hälfte (hochkant),
 * - 'second' = rechte bzw. untere Hälfte.
 * So liegen z. B. Händler und Inventar nebeneinander statt übereinander.
 */
export type MobileStart = 'full' | 'first' | 'second';

export interface WindowDef {
  pc: PcStart;
  mobile: MobileStart;
  /** Kleiner lässt sich das Fenster nicht ziehen (Pixel). Ist der Bildschirm kleiner, gewinnt der Bildschirm. */
  minWidth: number;
  minHeight: number;
  /** Größer lässt es sich nicht ziehen (Pixel) – und nie größer als der Bildschirm. */
  maxWidth: number;
  maxHeight: number;
}

/** Abstand der Fenster zum Bildrand (Pixel), am PC und am Handy. */
export const WINDOW_MARGIN = { pc: 10, mobile: 4 };

/** Von einem Fenster bleibt waagerecht immer so viel im Bild (Pixel), damit man es zurückziehen kann. */
export const WINDOW_KEEP_VISIBLE = 90;

/**
 * Alle Fenster des Spiels. Der Schlüssel ist zugleich der Name, unter dem sich der Browser
 * Platz und Größe merkt. Ein neues Fenster bekommt hier einen Eintrag (siehe GameWindow.ts).
 */
export const WINDOWS = {
  inventory: { pc: { x: 'right', y: 'center' }, mobile: 'second', minWidth: 290, minHeight: 180, maxWidth: 1100, maxHeight: 1000 },
  shop: { pc: { x: 'left', y: 110 }, mobile: 'first', minWidth: 210, minHeight: 160, maxWidth: 700, maxHeight: 1000 },
  stash: { pc: { x: 'left', y: 110 }, mobile: 'first', minWidth: 250, minHeight: 150, maxWidth: 800, maxHeight: 1000 },
  town: { pc: { x: 'left', y: 110 }, mobile: 'full', minWidth: 280, minHeight: 150, maxWidth: 900, maxHeight: 1000 },
  bestiary: { pc: { x: 'left', y: 110 }, mobile: 'full', minWidth: 280, minHeight: 160, maxWidth: 1100, maxHeight: 1100 },
  quests: { pc: { x: 'left', y: 110 }, mobile: 'full', minWidth: 260, minHeight: 150, maxWidth: 900, maxHeight: 1100 },
  worldmap: { pc: { x: 'center', y: 'center' }, mobile: 'full', minWidth: 200, minHeight: 150, maxWidth: 4000, maxHeight: 4000 },
  settings: { pc: { x: 'right', y: 50 }, mobile: 'full', minWidth: 210, minHeight: 150, maxWidth: 520, maxHeight: 1100 },
  saves: { pc: { x: 'right', y: 50 }, mobile: 'full', minWidth: 250, minHeight: 150, maxWidth: 640, maxHeight: 1100 },
} satisfies Record<string, WindowDef>;

export type WindowId = keyof typeof WINDOWS;
