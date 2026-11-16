// Tooltips für Maus UND Finger. Alle Tooltips im Spiel hängen über `bindTip` an ihrem Element:
// - Maus: zeigen beim Überfahren, ausblenden beim Verlassen (wie bisher).
// - Finger (Touch): Es gibt kein "Verlassen". Deshalb zeigt Antippen den Tooltip, und er
//   verschwindet von selbst nach TOUCH_TIP_MS – oder sofort, wenn man irgendwo anders hintippt.

/** So lange bleibt ein Tooltip nach dem Antippen mit dem Finger stehen (Millisekunden). Startwert. */
const TOUCH_TIP_MS = 3000;

/** Der Tooltip, der gerade per Finger offen ist: seine Funktion zum Ausblenden. */
let closeOpenTip: (() => void) | null = null;
let timer = 0;

function closeTouchTip(): void {
  window.clearTimeout(timer);
  const close = closeOpenTip;
  closeOpenTip = null;
  if (close) close();
}

// Jedes neue Antippen – egal wo, auch im Spielbild – räumt den offenen Tooltip weg.
// `true` = der Lauscher kommt als Erster dran, bevor das angetippte Element seinen eigenen zeigt.
document.addEventListener('pointerdown', closeTouchTip, true);

/**
 * Hängt einen Tooltip an `element`. `show` zeigt ihn, `hide` blendet ihn aus – was das genau
 * heißt (Klasse setzen, Item-Tooltip füllen …), bestimmt der Aufrufer.
 */
export function bindTip(element: HTMLElement, show: () => void, hide: () => void): void {
  element.addEventListener('pointerenter', (event) => {
    if (event.pointerType === 'mouse') show();
  });
  element.addEventListener('pointerleave', (event) => {
    if (event.pointerType === 'mouse') hide();
  });
  // Finger oder Stift: nach dem Antippen zeigen, dann von selbst wieder ausblenden.
  element.addEventListener('pointerup', (event) => {
    if (event.pointerType === 'mouse') return;
    closeTouchTip();
    show();
    closeOpenTip = hide;
    timer = window.setTimeout(closeTouchTip, TOUCH_TIP_MS);
  });
}
