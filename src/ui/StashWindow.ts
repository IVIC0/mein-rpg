import { STASH_MAX } from '../data/town';
import { rarityById } from '../items/generator';
import type { Stash } from '../items/Stash';
import { byId, iconPosition } from './dom';
import type { Hud } from './Hud';
import type { InventoryWindow } from './InventoryWindow';
import type { ItemTooltip } from './ItemTooltip';

interface Cell {
  box: HTMLElement;
  icon: HTMLElement;
}

/**
 * Das Fenster der Lagertruhe (Klick auf die Truhe am Lagerhaus). Linksklick auf ein Item nimmt
 * es ins Inventar; eingelagert wird im Inventar-Fenster, das sich mit öffnet (Rechtsklick).
 * Wie viele Plätze die Truhe hat, hängt am Lagerhaus (src/data/town.ts).
 */
export class StashWindow {
  private readonly root = byId('stash');
  private readonly count = byId('stash-count');
  private readonly cells: Cell[] = [];
  /** Der Platz unter dem Mauszeiger; -1 = keiner. */
  private hovered = -1;

  constructor(
    private readonly stash: Stash,
    private readonly hud: Hud,
    private readonly tooltip: ItemTooltip,
    private readonly inventoryWindow: InventoryWindow,
  ) {
    const parent = byId('stash-slots');
    for (let index = 0; index < STASH_MAX; index++) {
      const box = document.createElement('div');
      box.className = 'item-cell';
      box.innerHTML = '<span class="item-icon sprite-icon"></span>';
      box.addEventListener('click', () => {
        if (!this.stash.take(index)) this.hud.flash('Inventar voll');
      });
      box.addEventListener('mouseenter', () => {
        this.hovered = index;
        this.showTooltip();
      });
      box.addEventListener('mouseleave', () => {
        if (this.hovered === index) this.hovered = -1;
        this.tooltip.hide();
      });
      parent.appendChild(box);
      this.cells.push({ box, icon: box.querySelector('.item-icon') as HTMLElement });
    }
    byId('stash-close').addEventListener('click', () => this.close());
  }

  get isOpen(): boolean {
    return !this.root.hidden;
  }

  /** Öffnet die Truhe: Das Inventar geht mit auf, dort lässt sich jetzt einlagern. */
  open(): void {
    this.root.hidden = false;
    this.inventoryWindow.open();
    this.inventoryWindow.setStash(this.stash);
    this.render();
  }

  close(): void {
    if (!this.isOpen) return;
    this.root.hidden = true;
    this.hovered = -1;
    this.tooltip.hide();
    this.inventoryWindow.setStash(null);
  }

  /** Zeichnet alle Plätze neu. Aufrufen, wenn sich der Inhalt oder die Größe der Truhe geändert hat. */
  render(): void {
    if (!this.isOpen) return;
    const size = this.stash.size;
    this.cells.forEach((cell, index) => {
      // Plätze, die das Lagerhaus noch nicht freigeschaltet hat, bleiben unsichtbar.
      cell.box.hidden = index >= size;
      const item = this.stash.slots[index];
      cell.box.classList.toggle('filled', item !== null);
      cell.box.style.borderColor = item ? rarityById(item.rarity).color : '';
      if (item) cell.icon.style.backgroundPosition = iconPosition(item.icon);
    });
    this.count.textContent = `${this.stash.used} / ${size} Plätze`;
    this.showTooltip();
  }

  private showTooltip(): void {
    // Liegt die Maus nicht über einem Platz dieses Fensters, gehört der Tooltip dem Inventar-Fenster.
    if (this.hovered < 0) return;
    const item = this.stash.slots[this.hovered];
    if (!item) return this.tooltip.hide();
    this.tooltip.show(item, this.cells[this.hovered].box, this.root, 'right', true, ['Linksklick: ins Inventar nehmen']);
  }
}
