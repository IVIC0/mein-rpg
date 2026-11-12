import { DIFFICULTY_PRESETS, DIFFICULTY_RANGE, rewardBonus, type Difficulty } from '../data/difficulty';
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
  /** Die Schwierigkeit des laufenden Spielstands. Die Regler ändern dieses Objekt direkt. */
  difficulty: Difficulty;
  /** Die Schwierigkeit hat sich geändert (zum Speichern). */
  onDifficultyChange: () => void;
}

/**
 * Das kleine Einstellungs-Menü hinter dem Zahnrad oben rechts. Die Bereiche sind
 * zugeklappt, damit es wenig Platz braucht. Alle Werte stehen in `values`
 * (ein Objekt, siehe settings.ts). Sie gelten für alle Spielstände und werden im Browser gemerkt.
 * Ausnahme: Der Bereich "Schwierigkeit" gehört zum laufenden Spielstand (src/data/difficulty.ts).
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
    this.build(); // jetzt mit dem Bereich "Schwierigkeit"
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

  /** Alles auf Standard: Einstellungen, Plätze der HUD-Elemente und die Fenster. Die Schwierigkeit bleibt, wie sie ist. */
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

    if (this.callbacks) this.buildDifficulty(this.callbacks.difficulty, this.callbacks.onDifficultyChange);

    this.body.querySelectorAll('details').forEach((details, index) => (details.open = open[index] ?? false));
  }

  /** Bereich "Schwierigkeit": vier Knöpfe, zwei Regler und die Anzeige der Belohnung. */
  private buildDifficulty(difficulty: Difficulty, onChange: () => void): void {
    const section = this.section('Schwierigkeit (dieser Spielstand)');
    const reward = document.createElement('div');
    const buttons: { button: HTMLButtonElement; values: Difficulty }[] = [];
    // Zeigt die Belohnung und markiert den Knopf, der zu den Reglern passt.
    const show = (): void => {
      const bonus = Math.round(rewardBonus(difficulty) * 100);
      reward.textContent = bonus > 0 ? `Belohnung: +${bonus} % EP und Gold` : 'Belohnung: keine (beide Regler über 100 % nötig)';
      for (const entry of buttons) {
        const active = entry.values.enemyHp === difficulty.enemyHp && entry.values.enemyDamage === difficulty.enemyDamage;
        entry.button.classList.toggle('active', active);
      }
    };
    const changed = (): void => {
      show();
      onChange();
    };

    const presets = this.row(section);
    presets.classList.add('settings-presets');
    // Je Regler eine eigene Zeile – die Beschriftungen sind zu lang für zwei nebeneinander.
    const hpRow = this.row(section);
    const damageRow = this.row(section);
    hpRow.classList.add('settings-sliders');
    damageRow.classList.add('settings-sliders');
    const hp = this.slider(hpRow, 'Gegnerleben', difficulty, 'enemyHp', DIFFICULTY_RANGE, 1, changed);
    const damage = this.slider(damageRow, 'Gegnerschaden', difficulty, 'enemyDamage', DIFFICULTY_RANGE, 1, changed);

    for (const preset of DIFFICULTY_PRESETS) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = preset.label;
      button.title = `Gegnerleben ${preset.values.enemyHp} %, Gegnerschaden ${preset.values.enemyDamage} %`;
      button.addEventListener('click', () => {
        Object.assign(difficulty, preset.values);
        hp();
        damage();
        changed();
        button.blur();
      });
      presets.appendChild(button);
      buttons.push({ button, values: preset.values });
    }

    reward.className = 'settings-note settings-reward';
    const note = document.createElement('div');
    note.className = 'settings-note';
    note.textContent = 'Gilt nur für diesen Spielstand und erst für Gegner, die neu erscheinen.';
    section.append(reward, note);
    show();
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
    /** Mit dieser Zahl malgenommen ergibt der Wert Prozent (100 für Anteile wie 0.6, 1 für Prozentwerte). */
    toPercent = 100,
    /** Was nach einer Änderung passiert; Standard: Einstellungen merken und anwenden. */
    onInput: () => void = () => this.changed(),
  ): () => void {
    const box = document.createElement('label');
    const input = document.createElement('input');
    const text = document.createElement('span');
    const show = (): void => {
      text.textContent = `${label} ${Math.round(target[key] * toPercent)} %`;
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
      onInput();
    });
    input.addEventListener('change', () => input.blur());
    show();
    box.append(text, input);
    parent.appendChild(box);
    // Zum Auffrischen von außen (wenn ein Knopf den Wert gesetzt hat).
    return () => {
      input.value = `${target[key]}`;
      show();
    };
  }
}
