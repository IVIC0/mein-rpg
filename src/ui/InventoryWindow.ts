import { EQUIP_SLOTS, RARITIES, type EquipSlot } from '../data/items';
import { SELL_CONFIRM_FROM, SELL_CONFIRM_MS, sellPrice } from '../data/shop';
import { ATTRIBUTE_EFFECTS, ATTRIBUTE_IDS, STATS, formatStatChange, formatStatValue } from '../data/stats';
import type { Player } from '../entities/Player';
import { rarityById, type Item } from '../items/generator';
import type { Inventory } from '../items/Inventory';
import type { Shop } from '../items/Shop';
import { byId, iconPosition } from './dom';
import type { Hud } from './Hud';
import type { ItemTooltip } from './ItemTooltip';
import { loadUi, saveUi } from './storage';
import { damageReduction } from '../combat/damage';

/**
 * Was sich das Fenster merkt. null = Standard: Position rechts in der Bildmitte,
 * Breite aus hud.css, Höhe passend zum Inhalt.
 */
interface WindowLayout {
  left: number | null;
  top: number | null;
  width: number | null;
  height: number | null;
  /** Angepinnt: das Fenster bleibt offen – Esc schließt es nicht, und es ist nach dem Neuladen wieder da. */
  pinned: boolean;
}

const DEFAULT_LAYOUT: WindowLayout = { left: null, top: null, width: null, height: null, pinned: false };

/** Abstand des Fensters zum Bildrand in der Standard-Position (Pixel); oben bleibt Platz für die Knopf-Leiste. */
const EDGE_GAP = 10;
const TOP_GAP = 50;

/** Von der Titelzeile bleibt beim Verschieben mindestens so viel im Bild (Pixel). */
const KEEP_VISIBLE = 40;

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
 * Ist der Händler offen (setShop), verkauft ein Rechtsklick das Item.
 *
 * Das Fenster lässt sich an der Titelzeile verschieben, an der Ecke unten rechts in der
 * Größe ziehen und mit der Pinnnadel anpinnen. Position, Größe und Pin werden gemerkt.
 */
export class InventoryWindow {
  private readonly root = byId('inventory');
  private readonly statsBox = byId('character-stats');
  private readonly bagCount = byId('bag-count');
  private readonly gold = byId('gold');
  private readonly help = byId('inventory-help');
  /** Der Händler, solange sein Fenster offen ist – dann lässt sich per Rechtsklick verkaufen. */
  private shop: Shop | null = null;
  /** Das Feld, das auf den zweiten Sicherheits-Klick zum Verkaufen wartet. */
  private confirming: Cell | null = null;
  private confirmTimer = 0;
  private readonly cells: Cell[] = [];
  /** Das Feld unter dem Mauszeiger – sein Tooltip wird nach jeder Änderung neu geschrieben. */
  private hovered: Cell | null = null;
  private statsHtml = '';
  private layout: WindowLayout = loadUi('inventar', DEFAULT_LAYOUT);
  private readonly bagButton = byId('bag-button');

  constructor(
    private readonly inventory: Inventory,
    private readonly player: Player,
    private readonly hud: Hud,
    private readonly tooltip: ItemTooltip,
  ) {
    const equipment = byId('equipment');
    for (const slot of EQUIP_SLOTS) this.addCell(equipment, { kind: 'equip', slot: slot.id }, slot.label);
    const bag = byId('bag');
    inventory.bag.forEach((_, index) => this.addCell(bag, { kind: 'bag', index }, ''));

    this.bagButton.addEventListener('click', () => {
      this.toggle();
      // Fokus abgeben: sonst würde die Leertaste den Knopf noch einmal drücken.
      this.bagButton.blur();
    });
    byId('inventory-close').addEventListener('click', () => this.close());
    byId('inventory-pin').addEventListener('click', (event) => {
      this.layout.pinned = !this.layout.pinned;
      this.root.classList.toggle('pinned', this.layout.pinned);
      saveUi('inventar', this.layout);
      (event.currentTarget as HTMLElement).blur();
    });
    byId('inventory-title').addEventListener('pointerdown', (event) => this.startDrag(event, 'move'));
    byId('inventory-resize').addEventListener('pointerdown', (event) => this.startDrag(event, 'resize'));
    // Wird das Browserfenster kleiner, rutscht das Fenster zurück ins Bild.
    window.addEventListener('resize', () => this.applyLayout());

    this.root.classList.toggle('pinned', this.layout.pinned);
    // Ein angepinntes Fenster ist nach dem Neuladen gleich wieder offen.
    if (this.layout.pinned) this.open();
  }

  /** Angepinnt bleibt das Fenster offen: Esc schließt es dann nicht. */
  get pinned(): boolean {
    return this.layout.pinned;
  }

  /** Zurück zu Standard-Position und -Größe, Pin gelöst (Knopf in den Einstellungen). */
  resetLayout(): void {
    this.layout = { ...DEFAULT_LAYOUT };
    this.root.classList.remove('pinned');
    saveUi('inventar', this.layout);
    this.applyLayout();
  }

  /** Händler offen (`shop`) oder wieder zu (null): schaltet das Verkaufen per Rechtsklick. */
  setShop(shop: Shop | null): void {
    this.shop = shop;
    this.clearConfirm();
    this.help.innerHTML = 'Linksklick: anlegen / ablegen<br />Umschalt + Linksklick: wegwerfen' + (shop ? '<br /><b>Rechtsklick: verkaufen</b>' : '');
    this.showTooltip();
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
    this.bagButton.classList.add('active');
    this.render();
    this.applyLayout();
  }

  close(): void {
    this.root.hidden = true;
    this.bagButton.classList.remove('active');
    this.hovered = null;
    this.clearConfirm();
    this.tooltip.hide();
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
      // Dahinter steht, wie viel Schaden die Rüstung abfängt, z. B. "(−39 % Schaden)".
      ['Rüstung', `${formatStatValue('armor', player.armor)} <small>(−${Math.round(damageReduction(player.armor) * 100)} % Schaden)</small>`],
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

  /**
   * Trägt Position und Größe aus `layout` ins Fenster ein und hält es dabei im Bild.
   * Nur bei offenem Fenster – ein verstecktes Element hat keine Größe.
   */
  private applyLayout(): void {
    if (!this.isOpen) return;
    const style = this.root.style;
    // Leerer Text = der Wert aus hud.css gilt (Standard-Breite, Höhe nach Inhalt).
    style.width = this.layout.width === null ? '' : `${this.layout.width}px`;
    style.height = this.layout.height === null ? '' : `${this.layout.height}px`;

    const width = this.root.offsetWidth;
    const height = this.root.offsetHeight;
    // Standard: rechts am Rand, in der Höhe mittig – aber nicht unter der Knopf-Leiste.
    const left = this.layout.left ?? window.innerWidth - width - EDGE_GAP;
    const top = this.layout.top ?? Math.max(TOP_GAP, (window.innerHeight - height) / 2);
    // Die Titelzeile muss erreichbar bleiben, sonst bekäme man das Fenster nicht mehr zu fassen.
    style.left = `${Math.round(clamp(left, KEEP_VISIBLE - width, window.innerWidth - KEEP_VISIBLE))}px`;
    style.top = `${Math.round(clamp(top, 0, window.innerHeight - KEEP_VISIBLE))}px`;
  }

  /**
   * Maustaste auf Titelzeile ('move') oder Größen-Ecke ('resize') gedrückt: bis zum
   * Loslassen folgt das Fenster der Maus. Danach wird die neue Lage gemerkt.
   */
  private startDrag(event: PointerEvent, mode: 'move' | 'resize'): void {
    // Nur die linke Maustaste, und nicht, wenn ein Knopf in der Titelzeile gemeint war.
    if (event.button !== 0 || (event.target as HTMLElement).closest('button')) return;
    event.preventDefault();
    const rect = this.root.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;

    const onMove = (move: PointerEvent): void => {
      const dx = move.clientX - startX;
      const dy = move.clientY - startY;
      if (mode === 'move') {
        this.layout.left = rect.left + dx;
        this.layout.top = rect.top + dy;
      } else {
        // Die Position festhalten, sonst würde ein Fenster in Standard-Lage beim Ziehen mitwandern.
        this.layout.left = rect.left;
        this.layout.top = rect.top;
        this.layout.width = rect.width + dx;
        this.layout.height = rect.height + dy;
      }
      this.applyLayout();
      this.showTooltip();
    };
    const onUp = (): void => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      // Merken, was wirklich gilt: hud.css begrenzt die Größe nach unten und oben.
      const now = this.root.getBoundingClientRect();
      this.layout.left = now.left;
      this.layout.top = now.top;
      if (mode === 'resize') {
        this.layout.width = now.width;
        this.layout.height = now.height;
      }
      saveUi('inventar', this.layout);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  private addCell(parent: HTMLElement, ref: CellRef, label: string): void {
    const box = document.createElement('div');
    box.className = 'item-cell';
    box.innerHTML = `<span class="cell-label">${label}</span><span class="item-icon sprite-icon"></span>`;
    const cell: Cell = { ref, box, icon: box.querySelector('.item-icon') as HTMLElement };
    box.addEventListener('click', (event) => this.onClick(cell, event.shiftKey));
    box.addEventListener('contextmenu', (event) => {
      event.preventDefault(); // kein Browser-Menü
      this.onRightClick(cell);
    });
    box.addEventListener('mouseenter', () => {
      this.hovered = cell;
      this.showTooltip();
    });
    box.addEventListener('mouseleave', () => {
      this.clearConfirm();
      if (this.hovered === cell) this.hovered = null;
      this.tooltip.hide();
    });
    parent.appendChild(box);
    this.cells.push(cell);
  }

  private itemIn(ref: CellRef): Item | null {
    return ref.kind === 'bag' ? this.inventory.bag[ref.index] : this.inventory.equipped[ref.slot];
  }

  // Die Methoden des Inventars rufen onChange auf – darüber wird das Fenster neu gezeichnet.
  private onClick(cell: Cell, shift: boolean): void {
    this.clearConfirm();
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
      // Nur ausblenden, wenn die Maus über diesem Fenster war – sonst gehört der Tooltip dem Händler-Fenster.
      if (cell) this.tooltip.hide();
      return;
    }
    const inBag = cell.ref.kind === 'bag';
    const hints = inBag ? ['Linksklick: anlegen', 'Umschalt + Linksklick: wegwerfen'] : ['Linksklick: ablegen'];
    if (inBag && this.shop) {
      const gold = sellPrice(item.level, item.rarity);
      if (cell === this.confirming) hints.push(`<span class="tip-down">Wirklich verkaufen? Nochmal Rechtsklick (${gold} Gold)</span>`);
      else hints.push(`Rechtsklick: verkaufen für ${gold} Gold${needsConfirm(item) ? ' (mit Sicherheits-Klick)' : ''}`);
    } else if (this.shop) {
      hints.push('Zum Verkaufen erst ablegen');
    }
    // Der Vergleich mit dem angelegten Item gibt es nur für Items im Inventar.
    this.tooltip.show(item, cell.box, this.root, 'left', inBag, hints);
  }

  /**
   * Rechtsklick auf ein Item im Inventar, während der Händler offen ist: verkaufen.
   * Seltene Items (ab SELL_CONFIRM_FROM) brauchen einen zweiten Rechtsklick zur Sicherheit.
   */
  private onRightClick(cell: Cell): void {
    const ref = cell.ref;
    if (!this.shop || ref.kind !== 'bag') return;
    const item = this.inventory.bag[ref.index];
    if (!item) return;
    if (needsConfirm(item) && this.confirming !== cell) {
      this.clearConfirm();
      this.confirming = cell;
      cell.box.classList.add('confirm-sell');
      this.confirmTimer = window.setTimeout(() => this.clearConfirm(), SELL_CONFIRM_MS);
      this.showTooltip();
      return;
    }
    this.clearConfirm();
    const gold = this.shop.sell(ref.index);
    if (gold > 0) this.hud.flash(`Verkauft: +${gold} Gold`);
  }

  /** Nimmt den ersten Sicherheits-Klick zurück (Zeit um, Maus weg oder verkauft). */
  private clearConfirm(): void {
    window.clearTimeout(this.confirmTimer);
    if (!this.confirming) return;
    this.confirming.box.classList.remove('confirm-sell');
    this.confirming = null;
    this.showTooltip();
  }
}

/** Braucht das Verkaufen dieses Items einen zweiten Klick? (Episch und höher) */
function needsConfirm(item: Item): boolean {
  const order = RARITIES.map((rarity) => rarity.id);
  return order.indexOf(item.rarity) >= order.indexOf(SELL_CONFIRM_FROM);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
