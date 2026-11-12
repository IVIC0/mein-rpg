import { EQUIP_SLOTS, ITEM_SLOT_NAMES, type EquipSlot } from '../data/items';
import { ATTRIBUTE_EFFECTS, ATTRIBUTE_IDS, STATS, STAT_IDS, formatStatChange, formatStatRange, formatStatValue, withAttributesApplied } from '../data/stats';
import type { Player } from '../entities/Player';
import { itemStats, rarityById, type Item, type RolledValue } from '../items/generator';
import type { Inventory } from '../items/Inventory';
import { byId, iconPosition } from './dom';
import type { Hud } from './Hud';

/** Ein Feld im Fenster: entweder ein Inventar-Platz oder ein Ausrüstungsplatz. */
type CellRef = { kind: 'bag'; index: number } | { kind: 'equip'; slot: EquipSlot };

interface Cell {
  ref: CellRef;
  box: HTMLElement;
  icon: HTMLElement;
}

/**
 * Das Fenster "Charakter & Inventar" (Taste I oder C): links Ausrüstung und Werte,
 * rechts das Inventar. Das Grundgerüst steht in index.html, das Aussehen in hud.css.
 *
 * Linksklick auf ein Item im Inventar legt es an, Linksklick auf angelegte Ausrüstung
 * legt sie ab. Umschalt + Linksklick wirft ein Item aus dem Inventar weg.
 */
export class InventoryWindow {
  private readonly root = byId('inventory');
  private readonly statsBox = byId('character-stats');
  private readonly bagCount = byId('bag-count');
  private readonly gold = byId('gold');
  private readonly tooltip = byId('item-tooltip');
  private readonly cells: Cell[] = [];
  /** Das Feld unter dem Mauszeiger – sein Tooltip wird nach jeder Änderung neu geschrieben. */
  private hovered: Cell | null = null;
  private statsHtml = '';

  constructor(
    private readonly inventory: Inventory,
    private readonly player: Player,
    private readonly hud: Hud,
  ) {
    const equipment = byId('equipment');
    for (const slot of EQUIP_SLOTS) this.addCell(equipment, { kind: 'equip', slot: slot.id }, slot.label);
    const bag = byId('bag');
    inventory.bag.forEach((_, index) => this.addCell(bag, { kind: 'bag', index }, ''));

    byId('bag-button').addEventListener('click', (event) => {
      this.toggle();
      // Fokus abgeben: sonst würde die Leertaste den Knopf noch einmal drücken.
      (event.currentTarget as HTMLElement).blur();
    });
    byId('inventory-close').addEventListener('click', () => this.close());
    this.render();
  }

  get isOpen(): boolean {
    return !this.root.hidden;
  }

  toggle(): void {
    if (this.isOpen) this.close();
    else this.open();
  }

  open(): void {
    this.root.hidden = false;
    this.render();
  }

  close(): void {
    this.root.hidden = true;
    this.hovered = null;
    this.tooltip.hidden = true;
  }

  /** Zeichnet alle Felder neu. Aufrufen, wenn sich Inventar oder Ausrüstung geändert haben. */
  render(): void {
    if (!this.isOpen) return;
    let used = 0;
    for (const cell of this.cells) {
      const item = this.itemIn(cell.ref);
      cell.box.classList.toggle('filled', item !== null);
      cell.box.style.borderColor = item ? rarityById(item.rarity).color : '';
      if (item) cell.icon.style.backgroundPosition = iconPosition(item.icon);
      if (item && cell.ref.kind === 'bag') used++;
    }
    this.bagCount.textContent = `${used} / ${this.inventory.bag.length} Plätze`;
    this.gold.textContent = `${this.inventory.gold} Gold`;
    this.showTooltip();
  }

  /** Einmal pro Frame: hält die Werte der Figur aktuell (sie ändern sich auch durch Stufen und Buffs). */
  update(): void {
    if (!this.isOpen) return;
    const player = this.player;
    const rows: [string, string][] = [
      ['Angriffskraft', formatStatValue('attackPower', player.attackPower)],
      ['Rüstung', formatStatValue('armor', player.armor)],
      ['Leben', formatStatValue('maxHp', player.maxHp)],
      ['Krit-Chance', formatStatValue('critChance', player.critChance * 100)],
      ['Krit-Schaden', formatStatValue('critDamage', player.critMultiplier * 100)],
      ['Angriff alle', `${(player.attackIntervalMs / 1000).toLocaleString('de-DE', { maximumFractionDigits: 2 })} s`],
      ['Leben pro Sekunde', formatStatValue('hpRegen', player.hpRegen)],
      ['Lebensraub', formatStatValue('lifeSteal', player.lifeSteal * 100)],
    ];
    // Attribute: Punkte aus der Ausrüstung und was sie bringen, z. B. "Stärke 5 (+5 Angriffskraft)".
    for (const id of ATTRIBUTE_IDS) {
      const points = player.gearStats[id];
      const effect = ATTRIBUTE_EFFECTS[id];
      rows.push([STATS[id].name, `${points} <small>(${formatStatChange(effect.stat, points * effect.perPoint)})</small>`]);
    }
    const html = rows.map(([label, value]) => `<div><span>${label}</span><b>${value}</b></div>`).join('');
    if (html === this.statsHtml) return;
    this.statsHtml = html;
    this.statsBox.innerHTML = html;
  }

  private addCell(parent: HTMLElement, ref: CellRef, label: string): void {
    const box = document.createElement('div');
    box.className = 'item-cell';
    box.innerHTML = `<span class="cell-label">${label}</span><span class="item-icon sprite-icon"></span>`;
    const cell: Cell = { ref, box, icon: box.querySelector('.item-icon') as HTMLElement };
    box.addEventListener('click', (event) => this.onClick(cell, event.shiftKey));
    box.addEventListener('mouseenter', () => {
      this.hovered = cell;
      this.showTooltip();
    });
    box.addEventListener('mouseleave', () => {
      if (this.hovered === cell) this.hovered = null;
      this.showTooltip();
    });
    parent.appendChild(box);
    this.cells.push(cell);
  }

  private itemIn(ref: CellRef): Item | null {
    return ref.kind === 'bag' ? this.inventory.bag[ref.index] : this.inventory.equipped[ref.slot];
  }

  // Die Methoden des Inventars rufen onChange auf – darüber wird das Fenster neu gezeichnet.
  private onClick(cell: Cell, shift: boolean): void {
    const ref = cell.ref;
    if (ref.kind === 'bag') {
      if (shift) this.inventory.discard(ref.index);
      else this.inventory.equip(ref.index);
    } else if (!this.inventory.unequip(ref.slot)) {
      this.hud.flash('Inventar voll');
    }
  }

  /** Zeigt den Tooltip zum Feld unter dem Mauszeiger – oder blendet ihn aus, wenn dort nichts liegt. */
  private showTooltip(): void {
    const cell = this.hovered;
    const item = cell ? this.itemIn(cell.ref) : null;
    if (!cell || !item) {
      this.tooltip.hidden = true;
      return;
    }
    this.tooltip.innerHTML = this.tooltipHtml(item, cell.ref.kind === 'bag');
    this.tooltip.hidden = false;

    // Links neben dem Fenster auf Höhe des Feldes, damit er nichts im Fenster verdeckt.
    // Passt er dort nicht hin, rechts neben das Feld. Nie über den unteren Bildrand hinaus.
    const rect = cell.box.getBoundingClientRect();
    const windowLeft = this.root.getBoundingClientRect().left;
    const width = this.tooltip.offsetWidth;
    const height = this.tooltip.offsetHeight;
    const left = windowLeft - width - 8 >= 4 ? windowLeft - width - 8 : rect.right + 8;
    const top = Math.max(4, Math.min(rect.top, window.innerHeight - height - 4));
    this.tooltip.style.left = `${Math.round(left)}px`;
    this.tooltip.style.top = `${Math.round(top)}px`;
  }

  /** `inBag` = das Item liegt im Inventar: dann kommt der Vergleich mit dem angelegten Item dazu. */
  private tooltipHtml(item: Item, inBag: boolean): string {
    const rarity = rarityById(item.rarity);
    const lines = [
      `<b style="color: ${rarity.color}">${item.name}</b>`,
      `<i>${rarity.name} · ${ITEM_SLOT_NAMES[item.slot]} · Itemlevel ${item.level}</i>`,
      valueLine(item.base, 'tip-base'),
      ...item.affixes.map((affix) => valueLine(affix, 'tip-affix')),
    ];
    if (inBag) {
      lines.push('<hr>', ...this.compareLines(item), '<hr>', '<em>Linksklick: anlegen<br>Umschalt + Linksklick: wegwerfen</em>');
    } else {
      lines.push('<hr>', '<em>Linksklick: ablegen</em>');
    }
    return lines.join('');
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
