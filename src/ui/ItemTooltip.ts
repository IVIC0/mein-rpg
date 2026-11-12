import { ITEM_SLOT_NAMES } from '../data/items';
import { STAT_IDS, formatStatChange, formatStatRange, withAttributesApplied } from '../data/stats';
import { itemStats, rarityById, type Item, type RolledValue } from '../items/generator';
import type { Inventory } from '../items/Inventory';
import { byId } from './dom';

/**
 * Der Tooltip zu einem Item: Name in der Farbe der Seltenheit, Itemlevel, jeder Wert mit
 * seiner Spanne und – auf Wunsch – der Vergleich mit dem angelegten Item.
 * Inventar-Fenster und Händler-Fenster benutzen denselben.
 */
export class ItemTooltip {
  private readonly box = byId('item-tooltip');

  constructor(private readonly inventory: Inventory) {}

  /**
   * Zeigt den Tooltip neben dem Fenster `windowRoot` auf Höhe des Feldes `cell`.
   * `side` = auf welcher Seite des Fensters (passt er dort nicht hin, neben das Feld).
   * `compare` = mit dem angelegten Item vergleichen. `hints` = Zeilen ganz unten (z. B. "Linksklick: anlegen").
   */
  show(item: Item, cell: HTMLElement, windowRoot: HTMLElement, side: 'left' | 'right', compare: boolean, hints: string[]): void {
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
    this.box.hidden = false;

    // Neben dem Fenster, damit er nichts darin verdeckt. Nie über den unteren Bildrand hinaus.
    const rect = cell.getBoundingClientRect();
    const frame = windowRoot.getBoundingClientRect();
    const width = this.box.offsetWidth;
    const height = this.box.offsetHeight;
    let left: number;
    if (side === 'left') left = frame.left - width - 8 >= 4 ? frame.left - width - 8 : rect.right + 8;
    else left = frame.right + width + 8 <= window.innerWidth - 4 ? frame.right + 8 : rect.left - width - 8;
    const top = Math.max(4, Math.min(rect.top, window.innerHeight - height - 4));
    this.box.style.left = `${Math.round(left)}px`;
    this.box.style.top = `${Math.round(top)}px`;
  }

  hide(): void {
    this.box.hidden = true;
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
