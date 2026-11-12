import { byId } from './dom';
import { loadUi, saveUi } from './storage';

/** Die Einstellungen des Spielers. Neue kommen hier mit ihrem Standardwert dazu. */
export interface Settings {
  /** true = Name, Stufe und Lebensbalken über jedem Gegner; false = nur über Ziel, Angreifern und Verletzten. */
  showAllNameplates: boolean;
}

const DEFAULTS: Settings = { showAllNameplates: true };

/**
 * Das kleine Einstellungs-Menü hinter dem Zahnrad oben rechts.
 * Die Werte stehen in `values` und werden im Browser gemerkt.
 */
export class SettingsMenu {
  readonly values: Settings = loadUi('einstellungen', DEFAULTS);
  private readonly root = byId('settings');
  private readonly button = byId('settings-button');

  /** `resetWindows` wird aufgerufen, wenn der Spieler "Fenster zurücksetzen" drückt. */
  constructor(resetWindows: () => void) {
    const plates = byId('setting-plates') as HTMLInputElement;
    plates.checked = this.values.showAllNameplates;
    plates.addEventListener('change', () => {
      this.values.showAllNameplates = plates.checked;
      saveUi('einstellungen', this.values);
      plates.blur();
    });

    this.button.addEventListener('click', () => {
      this.setOpen(!this.isOpen);
      // Fokus abgeben: sonst würde die Leertaste den Knopf noch einmal drücken.
      this.button.blur();
    });
    byId('setting-reset-windows').addEventListener('click', (event) => {
      resetWindows();
      (event.currentTarget as HTMLElement).blur();
    });
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
}
