import { byId } from './dom';
import { HUD_ITEMS, OPACITY_RANGE, SCALE_RANGE, loadSettings, resetSettings, saveSettings, type Settings } from './settings';

/** Was das Menü nach außen meldet. */
interface Callbacks {
  /** Eine Einstellung hat sich geändert – die Anzeigen müssen sie übernehmen. */
  onChange: () => void;
  /** "HUD verschieben" wurde gedrückt. */
  onEditHud: () => void;
  /** "Fenster zurücksetzen" bzw. "Alles auf Standard" wurde gedrückt. */
  onResetWindows: () => void;
}

/**
 * Das kleine Einstellungs-Menü hinter dem Zahnrad oben rechts. Die Bereiche sind
 * zugeklappt, damit es wenig Platz braucht. Alle Werte stehen in `values`
 * (ein Objekt, siehe settings.ts). Sie gelten für alle Spielstände und werden im Browser gemerkt.
 */
export class SettingsMenu {
  readonly values: Settings = loadSettings();
  private readonly root = byId('settings');
  private readonly body = byId('settings-body');
  private readonly button = byId('settings-button');
  private callbacks: Callbacks | null = null;

  constructor() {
    this.button.addEventListener('click', () => {
      this.setOpen(!this.isOpen);
      // Fokus abgeben: sonst würde die Leertaste den Knopf noch einmal drücken.
      this.button.blur();
    });
    this.build();
  }

  /** Verbindet das Menü mit dem Rest des Spiels. */
  connect(callbacks: Callbacks): void {
    this.callbacks = callbacks;
    byId('setting-edit-hud').addEventListener('click', () => {
      this.close();
      callbacks.onEditHud();
    });
    byId('setting-reset-windows').addEventListener('click', (event) => {
      callbacks.onResetWindows();
      (event.currentTarget as HTMLElement).blur();
    });
    byId('setting-reset-all').addEventListener('click', (event) => {
      this.resetAll();
      (event.currentTarget as HTMLElement).blur();
    });
  }

  /** Alles auf Standard: Einstellungen, Plätze der HUD-Elemente und die Fenster. */
  resetAll(): void {
    resetSettings(this.values);
    this.build(); // Häkchen und Regler neu aufbauen, damit sie die Standardwerte zeigen
    this.changed();
    this.callbacks?.onResetWindows();
  }

  /** Merkt sich die Einstellungen (z. B. nach dem Verschieben eines HUD-Elements). */
  save(): void {
    saveSettings(this.values);
  }

  get isOpen(): boolean {
    return !this.root.hidden;
  }

  close(): void {
    this.setOpen(false);
  }

  private setOpen(open: boolean): void {
    this.root.hidden = !open;
    this.button.classList.toggle('active', open);
  }

  private changed(): void {
    this.save();
    this.callbacks?.onChange();
  }

  /** Baut die Bereiche mit Häkchen und Reglern aus den aktuellen Werten. */
  private build(): void {
    // Merken, welche Bereiche aufgeklappt waren.
    const open = Array.from(this.body.querySelectorAll('details')).map((details) => details.open);
    this.body.textContent = '';
    const values = this.values;

    const own = this.section('Über meiner Figur');
    const ownParts = this.row(own);
    this.check(ownParts, 'Name', values.playerPlate, 'name');
    this.check(ownParts, 'Stufe', values.playerPlate, 'level');
    this.check(ownParts, 'Leben', values.playerPlate, 'bar');
    this.sliders(own, values.playerPlate);

    const enemy = this.section('Über Gegnern');
    const enemyParts = this.row(enemy);
    this.check(enemyParts, 'Name', values.enemyPlates, 'name');
    this.check(enemyParts, 'Stufe', values.enemyPlates, 'level');
    this.check(enemyParts, 'Leben', values.enemyPlates, 'bar');
    const all = this.check(this.row(enemy), 'bei allen Gegnern', values.enemyPlates, 'showAll');
    all.title = 'Aus: nur beim Ziel, bei Angreifern und Verletzten';
    this.sliders(enemy, values.enemyPlates);

    // Je Element eine Zeile: an/aus und darunter Größe und Deckkraft.
    const hud = this.section('HUD-Elemente');
    for (const item of HUD_ITEMS) {
      this.check(this.row(hud), item.label, values.hud[item.id], 'visible');
      this.sliders(hud, values.hud[item.id]);
    }
    this.check(this.row(hud), 'Schwebende Zahlen', values.floaters, 'visible');
    this.sliders(hud, values.floaters);

    this.body.querySelectorAll('details').forEach((details, index) => (details.open = open[index] ?? false));
  }

  /** Ein aufklappbarer Bereich mit Überschrift. */
  private section(title: string): HTMLElement {
    const details = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = title;
    details.appendChild(summary);
    this.body.appendChild(details);
    return details;
  }

  private row(parent: HTMLElement): HTMLElement {
    const row = document.createElement('div');
    row.className = 'settings-row';
    parent.appendChild(row);
    return row;
  }

  /** Ein Häkchen, das den Wert `target[key]` an- und ausschaltet. */
  private check<K extends string>(parent: HTMLElement, label: string, target: Record<K, boolean>, key: K): HTMLElement {
    const box = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = target[key];
    input.addEventListener('change', () => {
      target[key] = input.checked;
      this.changed();
      input.blur();
    });
    box.append(input, ` ${label}`);
    parent.appendChild(box);
    return box;
  }

  /** Zwei Regler nebeneinander: Größe und Deckkraft. */
  private sliders(parent: HTMLElement, target: { scale: number; opacity: number }): void {
    const row = this.row(parent);
    row.classList.add('settings-sliders');
    this.slider(row, 'Größe', target, 'scale', SCALE_RANGE);
    this.slider(row, 'Deckkraft', target, 'opacity', OPACITY_RANGE);
  }

  private slider<K extends string>(
    parent: HTMLElement,
    label: string,
    target: Record<K, number>,
    key: K,
    range: { min: number; max: number; step: number },
  ): void {
    const box = document.createElement('label');
    const input = document.createElement('input');
    const text = document.createElement('span');
    const show = (): void => {
      text.textContent = `${label} ${Math.round(target[key] * 100)} %`;
    };
    input.type = 'range';
    input.min = `${range.min}`;
    input.max = `${range.max}`;
    input.step = `${range.step}`;
    input.value = `${target[key]}`;
    // "input" feuert schon beim Ziehen: die Änderung ist sofort im Spiel zu sehen.
    input.addEventListener('input', () => {
      target[key] = Number(input.value);
      show();
      this.changed();
    });
    input.addEventListener('change', () => input.blur());
    show();
    box.append(text, input);
    parent.appendChild(box);
  }
}
