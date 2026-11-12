// Kleine Dialoge in der Bildmitte: Namenseingabe, Sicherheitsabfrage und Meldung.
// Sie liegen über allem (auch über dem Spiel) und geben ihr Ergebnis als Promise zurück:
//   const name = await askName('Wie heißt deine Figur?', '', false);

import { NAME_MAX_LENGTH } from '../data/save';
import { byId } from './dom';

/** Fragt nach einem Namen. `cancelable` = false: ohne Namen geht es nicht weiter. Abbrechen ergibt null. */
export function askName(title: string, initial: string, cancelable: boolean): Promise<string | null> {
  const input = document.createElement('input');
  input.type = 'text';
  input.maxLength = NAME_MAX_LENGTH;
  input.value = initial;
  input.placeholder = 'Name der Figur';
  input.spellcheck = false;
  return show<string | null>({
    title,
    body: input,
    okLabel: 'OK',
    cancelLabel: cancelable ? 'Abbrechen' : null,
    focus: input,
    // Ein leerer Name wird nicht angenommen.
    result: () => input.value.trim() || undefined,
    canceled: null,
  });
}

/** Sicherheitsabfrage, z. B. vor dem Löschen. `okLabel` beschriftet den Knopf, der die Aktion ausführt. */
export function confirmDialog(title: string, text: string, okLabel: string): Promise<boolean> {
  return show<boolean>({ title, body: paragraph(text), okLabel, cancelLabel: 'Abbrechen', danger: true, result: () => true, canceled: false });
}

/** Eine Meldung, die mit "OK" bestätigt wird (z. B. warum ein Import nicht ging). */
export function showMessage(title: string, text: string): Promise<void> {
  return show<boolean>({ title, body: paragraph(text), okLabel: 'OK', cancelLabel: null, result: () => true, canceled: true }).then(() => undefined);
}

function paragraph(text: string): HTMLElement {
  const element = document.createElement('p');
  element.textContent = text;
  return element;
}

interface DialogOptions<T> {
  title: string;
  body: HTMLElement;
  okLabel: string;
  /** null = kein Abbrechen-Knopf, Esc tut dann nichts. */
  cancelLabel: string | null;
  /** Der OK-Knopf wird rot (für Löschen). */
  danger?: boolean;
  /** Dieses Element bekommt den Fokus; ohne Angabe der Abbrechen- bzw. OK-Knopf. */
  focus?: HTMLElement;
  /** Ergebnis bei OK. `undefined` = Eingabe noch nicht gültig, der Dialog bleibt offen. */
  result: () => T | undefined;
  /** Ergebnis bei Abbrechen. */
  canceled: T;
}

function show<T>(options: DialogOptions<T>): Promise<T> {
  const overlay = byId('dialog');
  const box = document.createElement('div');
  box.className = 'dialog-box';

  const title = document.createElement('div');
  title.className = 'window-title';
  title.textContent = options.title;
  const buttons = document.createElement('div');
  buttons.className = 'dialog-buttons';
  const ok = button(options.okLabel);
  if (options.danger) ok.classList.add('danger');
  const cancel = options.cancelLabel === null ? null : button(options.cancelLabel);
  if (cancel) buttons.append(cancel);
  buttons.append(ok);
  box.append(title, options.body, buttons);

  return new Promise<T>((resolve) => {
    const close = (value: T): void => {
      overlay.removeEventListener('keydown', onKey);
      overlay.removeEventListener('keyup', stop);
      box.remove();
      overlay.hidden = overlay.childElementCount === 0;
      resolve(value);
    };
    const confirm = (): void => {
      const value = options.result();
      if (value !== undefined) close(value);
    };
    // Tasten bleiben im Dialog: sonst würde z. B. ein getipptes "I" das Inventar öffnen.
    const stop = (event: Event): void => event.stopPropagation();
    const onKey = (event: KeyboardEvent): void => {
      event.stopPropagation();
      if (event.key === 'Enter' && event.target !== cancel) {
        event.preventDefault();
        confirm();
      } else if (event.key === 'Escape' && cancel) {
        close(options.canceled);
      }
    };
    overlay.addEventListener('keydown', onKey);
    overlay.addEventListener('keyup', stop);
    ok.addEventListener('click', confirm);
    cancel?.addEventListener('click', () => close(options.canceled));

    overlay.appendChild(box);
    overlay.hidden = false;
    const focus = options.focus ?? cancel ?? ok;
    focus.focus();
    if (focus instanceof HTMLInputElement) focus.select();
  });
}

function button(label: string): HTMLButtonElement {
  const element = document.createElement('button');
  element.type = 'button';
  element.textContent = label;
  return element;
}
