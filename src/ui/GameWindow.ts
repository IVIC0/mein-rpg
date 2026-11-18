import { WINDOWS, WINDOW_KEEP_VISIBLE, WINDOW_MARGIN, type WindowDef, type WindowId } from '../data/windows';
import { device, onDeviceChange, type LayoutKind } from './device';
import { loadUi, saveUi } from './storage';

/** Was sich der Browser je Fenster merkt: Platz und Größe. null = Größe aus hud.css (passend zum Inhalt). */
interface WindowRect {
  left: number;
  top: number;
  width: number | null;
  height: number | null;
}

/** Getrennt für PC- und Handy-Layout – wer am selben Gerät wechselt, findet beide wieder vor. */
type WindowStore = Record<LayoutKind, Partial<Record<WindowId, WindowRect>>>;

/** Name des Eintrags im Browser-Speicher (mein-rpg.ui.fenster). Gehört zu den Einstellungen, nicht zum Spielstand. */
const STORE_KEY = 'fenster';

let store: WindowStore = loadUi<WindowStore>(STORE_KEY, { pc: {}, mobile: {} });

/** Alle Fenster, damit Drehen, Größe des Browsers und "Zurücksetzen" alle erreichen. */
const all: GameWindow[] = [];

/** Das zuletzt angeklickte Fenster bekommt die höchste Zahl und liegt damit vorn. */
let topZ = 10;

onDeviceChange(() => {
  for (const win of all) win.apply();
});

/**
 * Ein Fenster des Spiels – das gemeinsame Gerüst für ALLE Fenster (Inventar, Händler, Jagdbuch …).
 * Neue Fenster benutzen immer diese Klasse (Regel in GAME.md, Abschnitt 2e).
 *
 * Aufbau in index.html: ein Element mit `.window-title` (daran wird gezogen) und `.window-body`
 * (der Inhalt, scrollt bei Bedarf). Den Griff unten rechts zum Ziehen der Größe baut die Klasse selbst.
 *
 * Was sie kann:
 * - verschieben an der Titelleiste, Größe ziehen am Griff – mit Maus und Finger,
 * - nie aus dem Bild: die Titelleiste bleibt immer erreichbar, auch nach Drehen des Handys,
 * - das zuletzt angeklickte Fenster liegt vorn,
 * - Platz und Größe merken (getrennt für PC und Handy), Startplatz aus src/data/windows.ts.
 */
export class GameWindow {
  private readonly def: WindowDef;
  private readonly title: HTMLElement;

  /**
   * Wird nach dem Setzen der Größe aufgerufen, bevor der Platz geprüft wird – hier kann der
   * Inhalt sich anpassen (die große Karte rechnet z. B. ihre Zeichenfläche aus).
   */
  onLayout: () => void = () => {};

  /** Wird beim Verschieben und Größe-Ziehen aufgerufen (z. B. damit ein Tooltip mitwandert). */
  onMove: () => void = () => {};

  constructor(
    readonly root: HTMLElement,
    readonly id: WindowId,
  ) {
    this.def = WINDOWS[id];
    const title = root.querySelector<HTMLElement>(':scope > .window-title');
    if (!title) throw new Error(`Fenster #${root.id} braucht eine .window-title.`);
    this.title = title;
    root.classList.add('game-window');

    const grip = document.createElement('div');
    grip.className = 'window-resize';
    grip.title = 'Größe ändern';
    root.appendChild(grip);

    title.addEventListener('pointerdown', (event) => this.startDrag(event, 'move'));
    grip.addEventListener('pointerdown', (event) => this.startDrag(event, 'resize'));
    // Jeder Klick ins Fenster holt es nach vorn.
    root.addEventListener('pointerdown', () => this.front(), true);
    all.push(this);
  }

  get isOpen(): boolean {
    return !this.root.hidden;
  }

  /** Zeigt das Fenster vorn an seinem gemerkten (oder Start-)Platz. */
  show(): void {
    const wasOpen = this.isOpen;
    this.root.hidden = false;
    if (!wasOpen) this.front();
    this.apply();
    // Viele Fenster füllen ihren Inhalt erst nach dem Öffnen: im nächsten Bild noch einmal nachmessen.
    window.requestAnimationFrame(() => this.apply());
  }

  hide(): void {
    this.root.hidden = true;
  }

  /** Nach vorn holen. */
  front(): void {
    topZ++;
    this.root.style.zIndex = `${topZ}`;
  }

  /** Hat der Spieler die Größe selbst gezogen? (Sonst gilt die Größe aus hud.css bzw. der Startwert.) */
  get hasOwnSize(): boolean {
    const rect = this.saved;
    return rect !== undefined && rect.width !== null;
  }

  /** Vergisst nur die Größe (der Platz bleibt). Die große Karte nutzt das, wenn ihr Größen-Regler bewegt wird. */
  forgetSize(): void {
    const rect = this.saved;
    if (!rect) return;
    rect.width = null;
    rect.height = null;
    persist();
    this.apply();
  }

  /** Was für dieses Fenster im aktuellen Layout gemerkt ist. */
  private get saved(): WindowRect | undefined {
    return store[device.layout][this.id];
  }

  /** Alle Fenster zurück an den Startplatz, PC und Handy (Knopf "Fensterlayout zurücksetzen"). */
  static resetAll(): void {
    store = { pc: {}, mobile: {} };
    persist();
    for (const win of all) win.apply();
  }

  /** Die Fläche, in der Fenster liegen dürfen: der Bildschirm ohne Notch-Ränder. */
  private static area(): { left: number; top: number; right: number; bottom: number } {
    const safe = device.safe;
    return { left: safe.left, top: safe.top, right: window.innerWidth - safe.right, bottom: window.innerHeight - safe.bottom };
  }

  /**
   * Setzt Größe und Platz: gemerkt oder Startwert, dann zurück ins Bild geschoben.
   * Nur bei offenem Fenster – ein verstecktes Element hat keine Größe.
   */
  apply(): void {
    if (!this.isOpen) return;
    const area = GameWindow.area();
    const areaWidth = area.right - area.left;
    const areaHeight = area.bottom - area.top;
    const def = this.def;
    const saved = this.saved;
    const start = saved ? null : this.startRect();
    const style = this.root.style;

    // Grenzen der Größe: aus windows.ts, aber nie größer als der Bildschirm.
    const maxWidth = Math.min(def.maxWidth, areaWidth);
    const maxHeight = Math.min(def.maxHeight, areaHeight);
    style.minWidth = `${Math.min(def.minWidth, maxWidth)}px`;
    style.minHeight = `${Math.min(def.minHeight, maxHeight)}px`;
    style.maxWidth = `${maxWidth}px`;
    style.maxHeight = `${maxHeight}px`;
    const width = saved ? saved.width : (start?.width ?? null);
    const height = saved ? saved.height : (start?.height ?? null);
    // Leerer Text = der Wert aus hud.css gilt (Breite des Fensters, Höhe nach Inhalt).
    style.width = width === null ? '' : `${Math.round(width)}px`;
    style.height = height === null ? '' : `${Math.round(height)}px`;
    this.onLayout();

    const boxWidth = this.root.offsetWidth;
    const boxHeight = this.root.offsetHeight;
    let left: number;
    let top: number;
    if (saved) {
      left = saved.left;
      top = saved.top;
    } else if (start && start.left !== null && start.top !== null) {
      left = start.left;
      top = start.top;
    } else {
      // Am PC: Platz aus windows.ts, berechnet mit der echten Größe des Fensters.
      const margin = WINDOW_MARGIN.pc;
      const pc = def.pc;
      left = pc.x === 'left' ? area.left + margin : pc.x === 'right' ? area.right - boxWidth - margin : area.left + (areaWidth - boxWidth) / 2;
      top = pc.y === 'center' ? area.top + Math.max(margin, (areaHeight - boxHeight) / 2) : area.top + pc.y;
      // Ragt es unten hinaus, rückt es nach oben – soweit Platz ist.
      top = Math.min(top, area.bottom - boxHeight - margin);
    }
    // Ins Bild schieben: oben nie über den Rand, unten bleibt die Titelleiste ganz sichtbar,
    // seitlich bleibt ein Stück des Fensters (WINDOW_KEEP_VISIBLE) zum Greifen im Bild.
    const titleHeight = this.title.offsetHeight + 8;
    const keep = Math.min(WINDOW_KEEP_VISIBLE, boxWidth);
    left = clamp(left, area.left + keep - boxWidth, area.right - keep);
    top = clamp(top, area.top, area.bottom - titleHeight);
    style.left = `${Math.round(left)}px`;
    style.top = `${Math.round(top)}px`;
    // Höhe nach Inhalt: Das Fenster endet am unteren Bildrand, der Rest wird gescrollt.
    if (!style.height) {
      const room = area.bottom - top - (device.layout === 'pc' ? WINDOW_MARGIN.pc : WINDOW_MARGIN.mobile);
      style.maxHeight = `${Math.max(Math.min(def.minHeight, maxHeight), Math.min(maxHeight, room))}px`;
    }
  }

  /**
   * Startplatz und -größe, solange nichts gemerkt ist. Am PC nur die Größe aus hud.css
   * (Platz rechnet `apply`), am Handy eine feste Fläche unter der Knopf-Leiste.
   */
  private startRect(): { left: number | null; top: number | null; width: number | null; height: number | null } {
    if (device.layout === 'pc') return { left: null, top: null, width: null, height: null };
    const area = GameWindow.area();
    const margin = WINDOW_MARGIN.mobile;
    // Unter der Knopf-Leiste, damit sie auch bei offenem Fenster erreichbar bleibt.
    const topbar = document.getElementById('topbar')?.getBoundingClientRect();
    const top = Math.max(area.top + margin, (topbar?.bottom ?? 0) + margin);
    const left = area.left + margin;
    const width = area.right - margin - left;
    const height = area.bottom - margin - top;
    const kind = this.def.mobile;
    if (kind === 'full') return { left, top, width, height };
    // Halbe Fläche: nebeneinander im Querformat, untereinander im Hochformat.
    const first = kind === 'first';
    if (device.portrait) {
      const half = (height - margin) / 2;
      return { left, top: first ? top : top + half + margin, width, height: half };
    }
    const half = (width - margin) / 2;
    return { left: first ? left : left + half + margin, top, width: half, height };
  }

  /**
   * Druck auf die Titelleiste ('move') oder den Griff ('resize'): Bis zum Loslassen folgt das
   * Fenster dem Zeiger (Maus oder Finger). Danach wird die neue Lage gemerkt.
   */
  private startDrag(event: PointerEvent, mode: 'move' | 'resize'): void {
    // Nur linke Maustaste bzw. ein Finger, und nicht, wenn ein Knopf in der Titelleiste gemeint war.
    if (event.button !== 0 || (event.target as HTMLElement).closest('button')) return;
    event.preventDefault();
    const handle = event.currentTarget as HTMLElement;
    // Alle weiteren Bewegungen dieses Zeigers gehen an den Griff – auch wenn der Finger daneben rutscht.
    handle.setPointerCapture(event.pointerId);
    const rect = this.root.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    // Beim Verschieben bleibt die Größe, wie sie ist: fest gesetzt (gezogen oder Startwert am Handy) oder aus hud.css.
    const current: WindowRect = {
      left: rect.left,
      top: rect.top,
      width: this.root.style.width ? rect.width : null,
      height: this.root.style.height ? rect.height : null,
    };

    const onMove = (move: PointerEvent): void => {
      if (move.pointerId !== event.pointerId) return;
      const dx = move.clientX - startX;
      const dy = move.clientY - startY;
      if (mode === 'move') {
        current.left = rect.left + dx;
        current.top = rect.top + dy;
      } else {
        current.width = rect.width + dx;
        current.height = rect.height + dy;
      }
      store[device.layout][this.id] = current;
      this.apply();
      this.onMove();
    };
    const onUp = (up: PointerEvent): void => {
      if (up.pointerId !== event.pointerId) return;
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onUp);
      handle.removeEventListener('pointercancel', onUp);
      // Merken, was wirklich gilt: Grenzen und Bildrand haben vielleicht nachgeregelt.
      const now = this.root.getBoundingClientRect();
      current.left = now.left;
      current.top = now.top;
      if (current.width !== null) current.width = now.width;
      if (current.height !== null) current.height = now.height;
      store[device.layout][this.id] = current;
      persist();
      this.onMove();
    };
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
    handle.addEventListener('pointercancel', onUp);
  }
}

function persist(): void {
  saveUi(STORE_KEY, store);
}

/**
 * Einmaliger Umzug: Bis Meilenstein 12 merkte sich nur das Inventar seinen Platz (Eintrag "inventar").
 * Den übernimmt das PC-Layout, falls dort noch nichts steht.
 */
export function adoptOldInventoryLayout(old: { left: number | null; top: number | null; width: number | null; height: number | null }): void {
  if (store.pc.inventory || old.left === null || old.top === null) return;
  store.pc.inventory = { left: old.left, top: old.top, width: old.width, height: old.height };
  persist();
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
