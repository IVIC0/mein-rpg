// Die EINE Stelle, die entscheidet, wie das Spiel aussieht: PC- oder Handy-Layout, Maus oder Finger.
// Alles andere fragt hier nach (`device`) oder benutzt die Klassen, die hier an <html> gesetzt werden:
//   ui-pc / ui-mobile   = Layout (Handy-Layout: kurze Bildschirmseite unter DEVICE.mobileShortSide)
//   ui-touch            = Hauptzeiger ist ein Finger (größere Knöpfe zum Tippen)
//   ui-portrait         = Hochformat
// Sonderfälle für kleine Bildschirme gehören in hud.css unter diese Klassen – nicht in eigene Abfragen.

import { DEVICE } from '../data/windows';

export type LayoutKind = 'pc' | 'mobile';

/** Ränder, die Notch, Kamera-Loch oder Home-Leiste verdecken (Pixel). Am PC alles 0. */
export interface SafeArea {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

interface DeviceState {
  layout: LayoutKind;
  touch: boolean;
  portrait: boolean;
  safe: SafeArea;
  /** Womit zuletzt gedrückt wurde: 'mouse', 'touch' oder 'pen'. */
  lastPointer: string;
}

export const device: DeviceState = {
  layout: 'pc',
  touch: false,
  portrait: false,
  safe: { top: 0, right: 0, bottom: 0, left: 0 },
  lastPointer: 'mouse',
};

/** War der letzte Druck ein Finger (oder Stift)? Dann gibt es z. B. statt Rechtsklick Knöpfe im Tooltip. */
export function pressedByTouch(): boolean {
  return device.lastPointer !== 'mouse';
}

const listeners: (() => void)[] = [];

/** `listener` wird nach jeder Änderung von Bildschirmgröße oder Drehung aufgerufen. */
export function onDeviceChange(listener: () => void): void {
  listeners.push(listener);
}

/** Unsichtbares Element, an dem sich die Safe-Area-Ränder ablesen lassen (CSS kennt sie, JavaScript nicht direkt). */
let probe: HTMLElement | null = null;

function readSafeArea(): SafeArea {
  if (!probe) {
    probe = document.createElement('div');
    probe.id = 'safe-area-probe';
    document.body.appendChild(probe);
  }
  const style = getComputedStyle(probe);
  return {
    top: parseFloat(style.paddingTop) || 0,
    right: parseFloat(style.paddingRight) || 0,
    bottom: parseFloat(style.paddingBottom) || 0,
    left: parseFloat(style.paddingLeft) || 0,
  };
}

/** Misst alles neu und setzt die Klassen an <html>. */
function update(): void {
  const width = window.innerWidth;
  const height = window.innerHeight;
  device.layout = Math.min(width, height) < DEVICE.mobileShortSide ? 'mobile' : 'pc';
  device.touch = window.matchMedia('(pointer: coarse)').matches;
  device.portrait = height > width;
  device.safe = readSafeArea();
  const classes = document.documentElement.classList;
  classes.toggle('ui-mobile', device.layout === 'mobile');
  classes.toggle('ui-pc', device.layout === 'pc');
  classes.toggle('ui-touch', device.touch);
  classes.toggle('ui-portrait', device.portrait);
}

let pending = 0;
function changed(): void {
  update();
  for (const listener of listeners) listener();
  // Nach dem Drehen melden manche Handys die neue Größe erst etwas später: einmal nachmessen.
  window.clearTimeout(pending);
  pending = window.setTimeout(() => {
    update();
    for (const listener of listeners) listener();
  }, 250);
}

/** Einmal beim Start aufrufen (main.ts), bevor irgendein Fenster gebaut wird. */
export function initDevice(): void {
  update();
  window.addEventListener('resize', changed);
  window.addEventListener('orientationchange', changed);
  // Merken, womit gedrückt wird. `true` = vor allen anderen Lauschern, damit Klick-Handler es schon wissen.
  document.addEventListener('pointerdown', (event) => (device.lastPointer = event.pointerType || 'mouse'), true);

  // Die Seite selbst soll nie zoomen – Spielbild und Fenster regeln ihre Größe selbst.
  // iPhones ignorieren dafür den Viewport-Tag; dort hilft nur, die Zoom-Geste abzufangen.
  const stop = (event: Event): void => event.preventDefault();
  document.addEventListener('gesturestart', stop);
  document.addEventListener('gesturechange', stop);
  // Langes Drücken öffnet am Handy sonst das Browser-Menü (Bild speichern …) – im Spiel nie gewollt.
  document.addEventListener('contextmenu', (event) => {
    if (pressedByTouch()) event.preventDefault();
  });
}
