import { ITEM_SLOT_NAMES } from '../data/items';
import { STAT_IDS, formatStatChange, formatStatRange, withAttributesApplied } from '../data/stats';
import { itemStats, rarityById, type Item, type RolledValue } from '../items/generator';
import type { Inventory } from '../items/Inventory';
import { byId } from './dom';
import { closeTip, closedJustNow, holdTouchTip } from './tip';

/**
 * Ein Knopf im Tooltip – so geht am Handy alles, wofür es am PC Rechtsklick oder Umschalt+Klick gibt.
 * `confirm` = Text für den Sicherheits-Klick: Der erste Druck zeigt ihn, erst der zweite führt aus.
 */
export interface TipAction {
  label: string;
  run: () => void;
  confirm?: string;
}

/**
 * Der Tooltip zu einem Item: Name in der Farbe der Seltenheit, Itemlevel, jeder Wert mit
 * seiner Spanne und – auf Wunsch – der Vergleich mit dem angelegten Item.
 * Inventar-Fenster und Händler-Fenster benutzen denselben.
 */
export class ItemTooltip {
  /** Das Element des Tooltips (am Handy schließt Tippen darauf ihn nicht, siehe tip.ts). */
  readonly box = byId('item-tooltip');

  constructor(private readonly inventory: Inventory) {}

  /**
   * Zeigt den Tooltip neben dem Fenster `windowRoot` auf Höhe des Feldes `cell`.
   * `side` = auf welcher Seite des Fensters (passt er dort nicht hin, neben das Feld).
   * `compare` = mit dem angelegten Item vergleichen. `hints` = Zeilen ganz unten (z. B. "Linksklick: anlegen").
   * `actions` = Knöpfe ganz unten (am Handy statt der Maus-Hinweise).
   */
  show(item: Item, cell: HTMLElement, windowRoot: HTMLElement, side: 'left' | 'right', compare: boolean, hints: string[], actions: TipAction[] = []): void {
    const rarity = rarityById(item.rarity);
    const lines = [
      `<b style="color: ${rarity.color}">${item.name}</b>`,
      `<i>${rarity.name} · ${ITEM_SLOT_NAMES[item.slot]} · Itemlevel ${item.level}</i>`,
      valueLine(item.base, 'tip-base'),
      ...item.affixes.map((affix) => valueLine(affix, 'tip-affix')),
    ];
    if (compare) lines.push('<hr>', ...this.compareLines(item));
    if (hints.length > 0) lines.push('<hr>', `<em>${hints.join('<br>')}</em>`);
    this.box.innerHTML = lines.join('');
    this.box.classList.toggle('with-actions', actions.length > 0);
    if (actions.length > 0) this.box.appendChild(actionButtons(actions));
    this.box.hidden = false;

    // Neben dem Fenster, damit er nichts darin verdeckt. Nie über den unteren Bildrand hinaus.
    const rect = cell.getBoundingClientRect();
    const frame = windowRoot.getBoundingClientRect();
    const width = this.box.offsetWidth;
    const height = this.box.offsetHeight;
    let left: number;
    if (side === 'left') left = frame.left - width - 8 >= 4 ? frame.left - width - 8 : rect.right + 8;
    else left = frame.right + width + 8 <= window.innerWidth - 4 ? frame.right + 8 : rect.left - width - 8;
    // Passt er auf keiner Seite (z. B. Fenster fast bildschirmgroß am Handy), bleibt er wenigstens ganz im Bild.
    left = Math.max(4, Math.min(left, window.innerWidth - width - 4));
    const top = Math.max(4, Math.min(rect.top, window.innerHeight - height - 4));
    this.box.style.left = `${Math.round(left)}px`;
    this.box.style.top = `${Math.round(top)}px`;
  }

  hide(): void {
    this.box.hidden = true;
  }

  /**
   * Antippen eines Item-Felds mit dem Finger: `show` zeigt den Tooltip (mit Knöpfen). Er bleibt
   * stehen, bis ein Knopf gedrückt oder woanders hingetippt wird – dann kommt `onClose`.
   * Nochmal auf dasselbe Feld tippen schließt ihn.
   */
  openByTap(cell: HTMLElement, show: () => void, onClose: () => void): void {
    if (closedJustNow(cell)) return;
    show();
    holdTouchTip(
      cell,
      () => {
        onClose();
        this.hide();
      },
      this.box,
    );
  }

  /**
   * Vergleich mit dem Item, das beim Anlegen ersetzt würde: was die Figur gewinnt (grün)
   * und verliert (rot). Attribute sind dabei schon in ihre Wirkung umgerechnet.
   */
  private compareLines(item: Item): string[] {
    const current = this.inventory.equipped[this.inventory.slotFor(item)];
    const gain = withAttributesApplied(itemStats(item));
    const loss = withAttributesApplied(itemStats(current));
    const changes = STAT_IDS.map((id) => ({ id, diff: gain[id] - loss[id] })).filter((change) => Math.abs(change.diff) > 0.001);

    const title = current ? `Beim Anlegen statt „${current.name}“:` : 'Beim Anlegen (Platz ist frei):';
    if (changes.length === 0) return [`<u>${title}</u>`, '<div>keine Veränderung</div>'];
    return [
      `<u>${title}</u>`,
      ...changes.map((change) => `<div class="${change.diff > 0 ? 'tip-up' : 'tip-down'}">${formatStatChange(change.id, change.diff)}</div>`),
    ];
  }
}

/** Eine Zeile wie "+7 Stärke (5–9)": der Wert und die Spanne, in der er liegen konnte. */
function valueLine(rolled: RolledValue, cssClass: string): string {
  const range = rolled.min === rolled.max ? '' : ` <small>(${formatStatRange(rolled.stat, rolled.min, rolled.max)})</small>`;
  return `<div class="${cssClass}">${formatStatChange(rolled.stat, rolled.value)}${range}</div>`;
}

/** Die Knöpfe unter dem Tooltip. Ein Druck schließt den Tooltip und führt aus (bzw. fragt erst nach). */
function actionButtons(actions: TipAction[]): HTMLElement {
  const row = document.createElement('div');
  row.className = 'tip-actions';
  for (const action of actions) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = action.label;
    let armed = false;
    button.addEventListener('click', () => {
      if (action.confirm && !armed) {
        armed = true;
        button.textContent = action.confirm;
        button.classList.add('armed');
        return;
      }
      closeTip();
      action.run();
    });
    row.appendChild(button);
  }
  return row;
}
