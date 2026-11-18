import { EQUIP_SLOTS, RARITIES, type EquipSlot } from '../data/items';
import { SELL_CONFIRM_FROM, SELL_CONFIRM_MS, sellPrice } from '../data/shop';
import { ATTRIBUTE_EFFECTS, ATTRIBUTE_IDS, STATS, formatStatChange, formatStatValue } from '../data/stats';
import type { Player } from '../entities/Player';
import { rarityById, type Item } from '../items/generator';
import type { Inventory } from '../items/Inventory';
import type { Shop } from '../items/Shop';
import type { Stash } from '../items/Stash';
import { bindTip, closedJustNow, holdTouchTip } from './tip';
import { byId, iconPosition } from './dom';
import type { Hud } from './Hud';
import type { ItemTooltip, TipAction } from './ItemTooltip';
import { loadUi, saveUi } from './storage';
import { GameWindow, adoptOldInventoryLayout } from './GameWindow';
import { pressedByTouch } from './device';
import { damageReduction } from '../combat/damage';

/** Was sich das Fenster außer Platz und Größe merkt (die merkt sich GameWindow). */
interface InventoryPrefs {
  /** Angepinnt: das Fenster bleibt offen – Esc schließt es nicht, und es ist nach dem Neuladen wieder da. */
  pinned: boolean;
}

/** Bis Meilenstein 12 stand hier auch Platz und Größe – die übernimmt einmalig das Fenster-System. */
type OldInventoryLayout = InventoryPrefs & { left: number | null; top: number | null; width: number | null; height: number | null };

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
 * Ist die Lagertruhe offen (setStash), legt ein Rechtsklick es hinein.
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
  /** Die Lagertruhe, solange ihr Fenster offen ist – dann lagert ein Rechtsklick das Item ein. */
  private stash: Stash | null = null;
  /** Das Feld, das auf den zweiten Sicherheits-Klick zum Verkaufen wartet. */
  private confirming: Cell | null = null;
  private confirmTimer = 0;
  private readonly cells: Cell[] = [];
  /** Das Feld unter dem Mauszeiger – sein Tooltip wird nach jeder Änderung neu geschrieben. */
  private hovered: Cell | null = null;
  /** Am Handy angetippt: Der Tooltip zeigt Knöpfe statt Maus-Hinweisen. */
  private tapped = false;
  private statsHtml = '';
  private readonly prefs: InventoryPrefs;
  /** Das gemeinsame Fenster-Gerüst: verschieben, Größe ziehen, merken, nach vorn holen. */
  private readonly win = new GameWindow(this.root, 'inventory');
  private readonly bagButton = byId('bag-button');

  constructor(
    private readonly inventory: Inventory,
    private readonly player: Player,
    private readonly hud: Hud,
    private readonly tooltip: ItemTooltip,
  ) {
    const old = loadUi<OldInventoryLayout>('inventar', { pinned: false, left: null, top: null, width: null, height: null });
    adoptOldInventoryLayout(old);
    this.prefs = { pinned: old.pinned };

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
      this.prefs.pinned = !this.prefs.pinned;
      this.showHelp();
    this.root.classList.toggle('pinned', this.prefs.pinned);
      saveUi('inventar', this.prefs);
      (event.currentTarget as HTMLElement).blur();
    });
    // Beim Verschieben wandert ein offener Tooltip mit.
    this.win.onMove = () => this.showTooltip();

    this.root.classList.toggle('pinned', this.prefs.pinned);
    // Ein angepinntes Fenster ist nach dem Neuladen gleich wieder offen.
    if (this.prefs.pinned) this.open();
  }

  /** Angepinnt bleibt das Fenster offen: Esc schließt es dann nicht. */
  get pinned(): boolean {
    return this.prefs.pinned;
  }

  /** Pin lösen (Knopf "Fensterlayout zurücksetzen" – Platz und Größe setzt GameWindow.resetAll zurück). */
  unpin(): void {
    this.prefs.pinned = false;
    this.root.classList.remove('pinned');
    saveUi('inventar', this.prefs);
  }

  /** Händler offen (`shop`) oder wieder zu (null): schaltet das Verkaufen per Rechtsklick. */
  setShop(shop: Shop | null): void {
    this.shop = shop;
    this.clearConfirm();
    this.showHelp();
  }

  /** Lagertruhe offen (`stash`) oder wieder zu (null): schaltet das Einlagern per Rechtsklick. */
  setStash(stash: Stash | null): void {
    this.stash = stash;
    this.showHelp();
  }

  /** Die Hilfe-Zeilen unter dem Inventar: Was der Rechtsklick gerade tut, hängt am offenen Fenster. */
  private showHelp(): void {
    const rightClick = this.shop ? '<br /><b>Rechtsklick: verkaufen</b>' : this.stash ? '<br /><b>Rechtsklick: einlagern</b>' : '';
    const tap = this.shop ? ', <b>Verkaufen</b>' : this.stash ? ', <b>Einlagern</b>' : '';
    // Beide Hinweise stehen da – hud.css zeigt je nach Gerät (Maus oder Finger) nur einen.
    this.help.innerHTML =
      `<span class="hint-mouse">Linksklick: anlegen / ablegen<br />Umschalt + Linksklick: wegwerfen${rightClick}</span>` +
      `<span class="hint-touch">Item antippen: ansehen, dazu Knöpfe für Anlegen${tap}, Wegwerfen</span>`;
    this.showTooltip();
  }

  get isOpen(): boolean {
    return this.win.isOpen;
  }

  toggle(): void {
    if (this.isOpen) this.close();
    else this.open();
  }

  open(): void {
    this.win.show();
    this.bagButton.classList.add('active');
    this.render();
  }

  close(): void {
    this.win.hide();
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

  private addCell(parent: HTMLElement, ref: CellRef, label: string): void {
    const box = document.createElement('div');
    box.className = 'item-cell';
    box.innerHTML = `<span class="cell-label">${label}</span><span class="item-icon sprite-icon"></span>`;
    const cell: Cell = { ref, box, icon: box.querySelector('.item-icon') as HTMLElement };
    box.addEventListener('click', (event) => {
      // Mit dem Finger: erst Tooltip mit Knöpfen, nichts sofort anlegen.
      if (pressedByTouch()) this.onTap(cell);
      else this.onClick(cell, event.shiftKey);
    });
    box.addEventListener('contextmenu', (event) => {
      event.preventDefault(); // kein Browser-Menü
      // Langes Drücken mit dem Finger meldet sich manchmal als Rechtsklick – das soll nie verkaufen.
      if (!pressedByTouch()) this.onRightClick(cell);
    });
    // Tooltip mit der Maus beim Überfahren (src/ui/tip.ts); den Finger behandelt onTap.
    bindTip(
      box,
      () => {
        this.hovered = cell;
        this.showTooltip();
      },
      () => {
        this.clearConfirm();
        if (this.hovered === cell) this.hovered = null;
        this.tooltip.hide();
      },
      { touch: false },
    );
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

  /** Antippen mit dem Finger: Tooltip mit Knöpfen (Anlegen, Verkaufen, Einlagern, Wegwerfen …). Nochmal tippen schließt ihn. */
  private onTap(cell: Cell): void {
    if (closedJustNow(cell.box) || !this.itemIn(cell.ref)) return;
    this.clearConfirm();
    this.hovered = cell;
    this.tapped = true;
    this.showTooltip();
    holdTouchTip(
      cell.box,
      () => {
        this.tapped = false;
        if (this.hovered === cell) this.hovered = null;
        this.tooltip.hide();
      },
      this.tooltip.box,
    );
  }

  /** Die Knöpfe im Tooltip am Handy – dieselben Aktionen wie Links-, Rechts- und Umschalt+Klick mit der Maus. */
  private touchActions(cell: Cell, item: Item): TipAction[] {
    const ref = cell.ref;
    if (ref.kind === 'equip') {
      const unequip = (): void => {
        if (!this.inventory.unequip(ref.slot)) this.hud.flash('Inventar voll');
      };
      return [{ label: 'Ablegen', run: unequip }];
    }
    const actions: TipAction[] = [{ label: 'Anlegen', run: () => this.inventory.equip(ref.index) }];
    const shop = this.shop;
    if (shop) {
      const gold = sellPrice(item.level, item.rarity);
      actions.push({
        label: `Verkaufen (${gold} Gold)`,
        confirm: needsConfirm(item) ? `Wirklich verkaufen? (${gold} Gold)` : undefined,
        run: () => {
          const got = shop.sell(ref.index);
          if (got > 0) this.hud.flash(`Verkauft: +${got} Gold`);
        },
      });
    } else if (this.stash) {
      const stash = this.stash;
      const store = (): void => {
        if (!stash.store(ref.index)) this.hud.flash('Lagertruhe voll');
      };
      actions.push({ label: 'Einlagern', run: store });
    }
    actions.push({ label: 'Wegwerfen', confirm: 'Wirklich wegwerfen?', run: () => this.inventory.discard(ref.index) });
    return actions;
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
    if (this.tapped) {
      this.tooltip.show(item, cell.box, this.root, 'left', inBag, [], this.touchActions(cell, item));
      return;
    }
    const hints = inBag ? ['Linksklick: anlegen', 'Umschalt + Linksklick: wegwerfen'] : ['Linksklick: ablegen'];
    if (inBag && this.shop) {
      const gold = sellPrice(item.level, item.rarity);
      if (cell === this.confirming) hints.push(`<span class="tip-down">Wirklich verkaufen? Nochmal Rechtsklick (${gold} Gold)</span>`);
      else hints.push(`Rechtsklick: verkaufen für ${gold} Gold${needsConfirm(item) ? ' (mit Sicherheits-Klick)' : ''}`);
    } else if (this.shop) {
      hints.push('Zum Verkaufen erst ablegen');
    } else if (this.stash) {
      hints.push(inBag ? 'Rechtsklick: in die Lagertruhe legen' : 'Zum Einlagern erst ablegen');
    }
    // Der Vergleich mit dem angelegten Item gibt es nur für Items im Inventar.
    this.tooltip.show(item, cell.box, this.root, 'left', inBag, hints);
  }

  /**
   * Rechtsklick auf ein Item im Inventar, während der Händler offen ist: verkaufen.
   * Seltene Items (ab SELL_CONFIRM_FROM) brauchen einen zweiten Rechtsklick zur Sicherheit.
   * Ist stattdessen die Lagertruhe offen, wandert das Item dort hinein.
   */
  private onRightClick(cell: Cell): void {
    const ref = cell.ref;
    if (ref.kind !== 'bag') return;
    const item = this.inventory.bag[ref.index];
    if (!item) return;
    if (!this.shop) {
      if (this.stash && !this.stash.store(ref.index)) this.hud.flash('Lagertruhe voll');
      return;
    }
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
