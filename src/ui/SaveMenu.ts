import { AUTOSAVE_INTERVAL_MS } from '../data/save';
import { TEST_SAVES } from '../data/testSaves';
import { cleanName, newSave, parseSave, testSave, type SaveGame } from '../save/saveGame';
import { ALL_SLOTS, MAIN_SLOTS, TEST_SLOT, deleteSlot, exportSlot, lastSlot, rawSlot, readSlot, restartWith, session, slotLabel, writeSlot } from '../save/slots';
import { askName, confirmDialog, showMessage } from './dialog';
import { byId } from './dom';
import { loadLegacySettings, type Settings } from './settings';

/** Was das Menü vom laufenden Spiel braucht. */
export interface GameHooks {
  /** Speichert den laufenden Spielstand sofort (im Testlauf passiert nichts). */
  saveNow: () => void;
  /** Gibt der laufenden Figur einen neuen Namen. */
  rename: (name: string) => void;
  /** Die aktuellen Einstellungen – ein neuer Spielstand übernimmt eine Kopie davon. */
  settings: () => Settings;
}

/**
 * Das Menü "Spielstände" (Disketten-Knopf oben rechts): Slots laden, neu anlegen,
 * umbenennen, löschen, als Datei exportieren und importieren, Test-Spielstände anlegen.
 *
 * Es gibt es zweimal: im Spiel als kleines Fenster (`game` gesetzt) und vor dem Spiel
 * als Auswahl in der Bildmitte (`game` = null), wenn kein Slot von selbst geladen werden kann.
 * Laden, Anlegen und Löschen des laufenden Slots starten das Spiel neu (restartWith).
 */
export class SaveMenu {
  private readonly root = byId('saves');
  private readonly body = byId('saves-body');
  private readonly button = byId('saves-button');

  /** `notice` = Hinweis, der oben im Menü steht (z. B. warum ein Slot nicht geladen wurde). */
  constructor(
    private readonly game: GameHooks | null,
    private notice = '',
  ) {
    if (game) {
      this.button.addEventListener('click', () => {
        if (this.isOpen) this.close();
        else this.open();
        // Fokus abgeben: sonst würde die Leertaste den Knopf noch einmal drücken.
        this.button.blur();
      });
    } else {
      byId('saves-title').textContent = 'Spielstand wählen';
      this.open();
    }
  }

  get isOpen(): boolean {
    return !this.root.hidden;
  }

  open(): void {
    this.root.hidden = false;
    this.button.classList.add('active');
    this.render();
  }

  close(): void {
    this.root.hidden = true;
    this.button.classList.remove('active');
    this.notice = '';
  }

  /** Baut die Liste der Slots und die Knöpfe darunter neu auf. */
  private render(): void {
    this.body.textContent = '';
    if (this.notice) this.body.append(text('p', 'saves-notice', this.notice));

    if (this.game && session.slotId === null) {
      const box = text('p', 'saves-notice', 'Testlauf über die Adresse (?stufe, ?beute, ?elite): Diese Figur wird nicht gespeichert.');
      box.append(document.createElement('br'), this.action('Testlauf beenden', () => restartWith(lastSlot())));
      this.body.append(box);
    }

    for (const id of ALL_SLOTS) this.body.append(this.row(id));

    const actions = element('div', 'save-buttons');
    if (this.game && session.slotId !== null) {
      actions.append(
        this.action('Jetzt speichern', () => {
          this.game?.saveNow();
          this.notice = 'Gespeichert.';
          this.render();
        }),
      );
    }
    actions.append(this.action('Importieren …', () => this.importFile()));
    this.body.append(actions);

    // Test-Spielstand: Vorlage wählen und anlegen.
    const testRow = element('div', 'save-buttons');
    const select = document.createElement('select');
    TEST_SAVES.forEach((def, index) => select.add(new Option(def.label, `${index}`)));
    testRow.append(select, this.action('Test-Spielstand anlegen', () => this.createTest(Number(select.value))));
    this.body.append(testRow);

    this.body.append(
      text(
        'p',
        'saves-hint',
        `Gespeichert wird von selbst: alle ${AUTOSAVE_INTERVAL_MS / 1000} Sekunden und nach Beute, Stufenaufstieg und Tod. ` +
          'Ein Test-Spielstand ersetzt nur den Slot „Test“.',
      ),
    );
  }

  /** Eine Zeile der Liste: was im Slot liegt und was man damit tun kann. */
  private row(id: string): HTMLElement {
    const content = readSlot(id);
    const active = id === session.slotId;
    const row = element('div', active ? 'save-row active' : 'save-row');
    row.append(text('b', '', slotLabel(id) + (active ? ' · aktiv' : '')));
    const buttons = element('div', 'save-buttons');

    if (content.state === 'empty') {
      row.append(text('div', 'save-info', id === TEST_SLOT ? 'leer – unten eine Vorlage anlegen' : 'leer'));
      if (id !== TEST_SLOT) buttons.append(this.action('Neue Figur …', () => this.create(id)));
    } else if (content.state === 'ok') {
      const save = content.save;
      row.append(
        text('div', 'save-info', `${save.name} · Stufe ${save.character.level} · ${save.gold} Gold`),
        text('div', 'save-date', `gespeichert ${formatDate(save.savedAt)} · Spielzeit ${formatDuration(save.playedMs)}`),
      );
      if (!active) buttons.append(this.action('Laden', () => this.load(id)));
      buttons.append(
        this.action('Umbenennen', () => this.rename(id, save)),
        this.action('Export', () => this.export(id)),
        this.action('Löschen', () => this.remove(id, `„${save.name}“ (Stufe ${save.character.level})`)),
      );
    } else {
      // Nicht ladbar (z. B. aus einer neueren Spielversion): nichts wird überschrieben.
      row.append(text('div', 'save-info save-error', `Nicht ladbar: ${content.reason}`));
      buttons.append(
        this.action('Export', () => exportSlot(id)),
        this.action('Löschen', () => this.remove(id, 'den nicht ladbaren Spielstand')),
      );
    }
    row.append(buttons);
    return row;
  }

  /** Ein Knopf, der `run` ausführt. */
  private action(label: string, run: () => void | Promise<void>): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.addEventListener('click', () => {
      button.blur();
      void run();
    });
    return button;
  }

  /** Einstellungen für einen neuen Spielstand: die aktuellen, vor dem Spiel die des Browsers. */
  private settingsForNew(): Settings {
    return this.game ? this.game.settings() : loadLegacySettings();
  }

  private load(id: string): void {
    this.game?.saveNow();
    restartWith(id);
  }

  private async create(id: string): Promise<void> {
    const name = await askName('Neue Figur – wie soll sie heißen?', '', true);
    // Nur in einen wirklich leeren Slot schreiben: nie etwas überschreiben.
    if (name === null || rawSlot(id) !== null) return;
    if (!writeSlot(id, newSave(name, this.settingsForNew()))) return this.storageFailed();
    this.load(id);
  }

  private async rename(id: string, save: SaveGame): Promise<void> {
    const name = await askName('Figur umbenennen', save.name, true);
    if (name === null) return;
    if (id === session.slotId && this.game) {
      this.game.rename(name);
    } else {
      save.name = cleanName(name);
      if (!writeSlot(id, save)) return this.storageFailed();
    }
    this.render();
  }

  private export(id: string): void {
    // Der laufende Slot wird vorher gespeichert, damit die Datei den aktuellen Stand enthält.
    if (id === session.slotId) this.game?.saveNow();
    exportSlot(id);
  }

  private async remove(id: string, what: string): Promise<void> {
    const sure = await confirmDialog(
      `${slotLabel(id)} löschen?`,
      `Willst du ${what} wirklich löschen? Das lässt sich nicht rückgängig machen. Tipp: vorher mit „Export“ als Datei sichern.`,
      'Löschen',
    );
    if (!sure) return;
    if (id === session.slotId) {
      // Erst einfrieren, dann löschen: sonst würde das laufende Spiel den Slot gleich wieder anlegen.
      session.frozen = true;
      deleteSlot(id);
      restartWith(null);
      return;
    }
    deleteSlot(id);
    this.render();
  }

  /** Liest eine exportierte Datei und legt sie in den ersten freien Slot. Belegte Slots bleiben, wie sie sind. */
  private importFile(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;
      const result = parseSave(await file.text());
      if (!result.ok) return showMessage('Import nicht möglich', result.reason);
      const free = MAIN_SLOTS.find((id) => rawSlot(id) === null);
      if (!free) return showMessage('Kein freier Slot', 'Alle Slots sind belegt. Lösche zuerst einen Spielstand – beim Import wird nie einer überschrieben.');
      if (!writeSlot(free, result.save)) return this.storageFailed();
      this.notice = `„${result.save.name}“ wurde in ${slotLabel(free)} importiert.`;
      this.render();
    });
    input.click();
  }

  /** Legt einen Test-Spielstand aus der Vorlage Nummer `index` an und lädt ihn. Er ersetzt den bisherigen im Slot "Test". */
  private createTest(index: number): void {
    const def = TEST_SAVES[index];
    if (!def) return;
    this.game?.saveNow();
    // Einfrieren, damit ein gerade laufender Test-Spielstand den neuen nicht überschreibt.
    session.frozen = true;
    if (!writeSlot(TEST_SLOT, testSave(def, this.settingsForNew()))) {
      session.frozen = false;
      return this.storageFailed();
    }
    restartWith(TEST_SLOT);
  }

  private storageFailed(): void {
    void showMessage('Speichern nicht möglich', 'Der Browser lässt das Speichern nicht zu (z. B. privater Modus oder Speicher voll).');
  }
}

function element(tag: string, className: string): HTMLElement {
  const result = document.createElement(tag);
  if (className) result.className = className;
  return result;
}

function text(tag: string, className: string, content: string): HTMLElement {
  const result = element(tag, className);
  result.textContent = content;
  return result;
}

function formatDate(time: number): string {
  return new Date(time).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** Spielzeit als "1:05 h". */
function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')} h`;
}
