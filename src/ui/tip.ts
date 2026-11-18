// Tooltips für Maus UND Finger. Alle Tooltips im Spiel hängen über `bindTip` an ihrem Element:
// - Maus: zeigen beim Überfahren, ausblenden beim Verlassen (wie bisher).
// - Finger (Touch): Es gibt kein "Verlassen". Deshalb zeigt Antippen den Tooltip, und er
//   verschwindet von selbst nach TOUCH_TIP_MS – oder sofort, wenn man irgendwo anders hintippt.
//   Nochmal auf dasselbe Element tippen schließt ihn (seit Meilenstein 12b).
// Item-Felder zeigen am Handy einen Tooltip mit Knöpfen (`holdTouchTip`): Der bleibt stehen,
// bis man einen Knopf drückt oder woanders hintippt.

/** So lange bleibt ein Tooltip nach dem Antippen mit dem Finger stehen (Millisekunden). Startwert. */
const TOUCH_TIP_MS = 3000;

/** Der Tooltip, der gerade per Finger offen ist: seine Funktion zum Ausblenden. */
let closeOpenTip: (() => void) | null = null;
/** Das Element, zu dem er gehört (nochmal antippen = schließen). */
let openAnchor: HTMLElement | null = null;
/** Ein Bereich, in dem Tippen den Tooltip NICHT schließt (seine eigenen Knöpfe). */
let openInside: HTMLElement | null = null;
/** Wurde der Tooltip gerade durch Antippen seines eigenen Elements geschlossen? Dann nicht gleich wieder öffnen. */
let closedByAnchor: HTMLElement | null = null;
let timer = 0;

function closeTouchTip(): void {
  window.clearTimeout(timer);
  const close = closeOpenTip;
  closeOpenTip = null;
  openAnchor = null;
  openInside = null;
  if (close) close();
}

// Jedes neue Antippen – egal wo, auch im Spielbild – räumt den offenen Tooltip weg.
// `true` = der Lauscher kommt als Erster dran, bevor das angetippte Element seinen eigenen zeigt.
document.addEventListener(
  'pointerdown',
  (event) => {
    const target = event.target as Node;
    if (openInside?.contains(target)) return;
    closedByAnchor = openAnchor?.contains(target) ? openAnchor : null;
    closeTouchTip();
  },
  true,
);

/**
 * Hat das letzte Antippen den Tooltip von `element` geschlossen? Dann soll derselbe Druck ihn
 * nicht gleich wieder öffnen. Fragt nur einmal (danach wieder false).
 */
export function closedJustNow(element: HTMLElement): boolean {
  const result = closedByAnchor === element;
  closedByAnchor = null;
  return result;
}

/** Merkt sich einen per Finger geöffneten Tooltip. `autoHide` = nach TOUCH_TIP_MS von selbst schließen. */
function remember(anchor: HTMLElement, hide: () => void, inside: HTMLElement | null, autoHide: boolean): void {
  closeTouchTip();
  closeOpenTip = hide;
  openAnchor = anchor;
  openInside = inside;
  if (autoHide) timer = window.setTimeout(closeTouchTip, TOUCH_TIP_MS);
}

/**
 * Für Tooltips mit Knöpfen (Items am Handy): bleibt offen, bis man woanders hintippt.
 * Tippen innerhalb von `inside` (dem Tooltip selbst) schließt ihn nicht.
 */
export function holdTouchTip(anchor: HTMLElement, hide: () => void, inside: HTMLElement): void {
  remember(anchor, hide, inside, false);
}

/** Schließt einen per Finger geöffneten Tooltip sofort (z. B. nachdem einer seiner Knöpfe gedrückt wurde). */
export function closeTip(): void {
  closeTouchTip();
}

/**
 * Hängt einen Tooltip an `element`. `show` zeigt ihn, `hide` blendet ihn aus – was das genau
 * heißt (Klasse setzen, Item-Tooltip füllen …), bestimmt der Aufrufer.
 * `touch: false` = nur für die Maus; den Finger behandelt dann der Aufrufer selbst (Item-Felder).
 */
export function bindTip(element: HTMLElement, show: () => void, hide: () => void, options: { touch?: boolean } = {}): void {
  element.addEventListener('pointerenter', (event) => {
    if (event.pointerType === 'mouse') show();
  });
  element.addEventListener('pointerleave', (event) => {
    if (event.pointerType === 'mouse') hide();
  });
  if (options.touch === false) return;
  // Finger oder Stift: nach dem Antippen zeigen, dann von selbst wieder ausblenden.
  element.addEventListener('pointerup', (event) => {
    if (event.pointerType === 'mouse') return;
    if (closedJustNow(element)) return; // war schon offen: dieses Antippen hat ihn geschlossen
    show();
    remember(element, hide, null, true);
  });
}
