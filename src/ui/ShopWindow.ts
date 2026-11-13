import { BUYBACK, POTION, buyPrice, sellPrice } from '../data/shop';
import { STOCK_MAX } from '../data/town';
import type { Player } from '../entities/Player';
import { rarityById, type Item } from '../items/generator';
import type { Inventory } from '../items/Inventory';
import type { BuyResult, Shop } from '../items/Shop';
import { byId, iconPosition } from './dom';
import type { Hud } from './Hud';
import type { InventoryWindow } from './InventoryWindow';
import type { ItemTooltip } from './ItemTooltip';

interface Slot {
  /** Das ganze Feld samt Preis – ausgeblendet, wenn das Regal (noch) nicht so viele Plätze hat. */
  root: HTMLElement;
  box: HTMLElement;
  icon: HTMLElement;
  price: HTMLElement;
}

/** Die zwei Reiter des Fensters: die Ware des Händlers und der Rückkauf. */
type Tab = 'stock' | 'buyback';

/**
 * Das Fenster des Händlers mit zwei Reitern:
 * - "Ware": sein Sortiment (Linksklick = kaufen) und der Heiltrank (Umschalt + Klick = gleich mehrere).
 *   Wie viele Plätze das Regal hat, hängt am Kontor (src/data/town.ts); ab Kontor 3 gibt es "Neue Ware sofort".
 * - "Rückkauf": die zuletzt verkauften Items (Linksklick = zum Verkaufspreis zurückkaufen).
 * Verkauft wird im Inventar-Fenster, das sich mit öffnet (Rechtsklick auf ein Item).
 * Das Grundgerüst steht in index.html, die Regeln und Preise in src/items/Shop.ts und src/data/shop.ts.
 */
export class ShopWindow {
  private readonly root = byId('shop');
  private readonly gold = byId('shop-gold');
  private readonly restock = byId('shop-restock');
  private readonly potionText = byId('shop-potion-text');
  private readonly potionCount = byId('shop-potion-count');
  private readonly potionButton = byId('shop-potion-buy') as HTMLButtonElement;
  private readonly restockButton = byId('shop-restock-now') as HTMLButtonElement;
  private readonly tabButtons: Record<Tab, HTMLElement> = { stock: byId('shop-tab-stock'), buyback: byId('shop-tab-buyback') };
  private readonly pages: Record<Tab, HTMLElement> = { stock: byId('shop-page-stock'), buyback: byId('shop-page-buyback') };
  private readonly slots: Record<Tab, Slot[]>;
  private tab: Tab = 'stock';
  /** Der Platz unter dem Mauszeiger im gerade offenen Reiter; -1 = keiner. */
  private hovered = -1;

  constructor(
    private readonly shop: Shop,
    private readonly inventory: Inventory,
    private readonly player: Player,
    private readonly hud: Hud,
    private readonly tooltip: ItemTooltip,
    private readonly inventoryWindow: InventoryWindow,
  ) {
    this.slots = {
      stock: this.buildSlots(byId('shop-stock'), STOCK_MAX, (index) => this.shop.buy(index)),
      buyback: this.buildSlots(byId('shop-buyback'), BUYBACK.size, (index) => this.shop.buyBack(index)),
    };
    for (const tab of ['stock', 'buyback'] as const) {
      this.tabButtons[tab].addEventListener('click', () => {
        this.showTab(tab);
        this.tabButtons[tab].blur();
      });
    }
    byId('shop-buyback-help').innerHTML =
      `Linksklick: zum Verkaufspreis zurückkaufen<br />Der Händler merkt sich die letzten ${BUYBACK.size} verkauften Items.`;
    (byId('shop-potion-icon') as HTMLElement).style.backgroundPosition = iconPosition(POTION.frame);
    byId('shop-potion-help').textContent = `Umschalt + Klick: ${POTION.bulkAmount} Stück auf einmal`;
    this.potionButton.addEventListener('click', (event) => {
      // Umschalt + Klick kauft einen ganzen Vorrat – oder so viele, wie das Gold hergibt.
      const bought = this.shop.buyPotions(event.shiftKey ? POTION.bulkAmount : 1);
      if (bought === 0) this.hud.flash('Zu wenig Gold');
      else if (bought > 1) this.hud.flash(`${bought} Heiltränke gekauft`);
      this.potionButton.blur();
      this.render();
    });
    this.restockButton.addEventListener('click', () => {
      this.report(this.shop.buyRestock());
      this.restockButton.blur();
    });
    byId('shop-close').addEventListener('click', () => this.close());
  }

  /** Baut `count` Plätze (Item-Feld mit Preis darunter) in `parent`. Ein Klick ruft `onClick` mit der Platz-Nummer. */
  private buildSlots(parent: HTMLElement, count: number, onClick: (index: number) => BuyResult): Slot[] {
    const slots: Slot[] = [];
    for (let index = 0; index < count; index++) {
      const slot = document.createElement('div');
      slot.className = 'shop-slot';
      slot.innerHTML = '<div class="item-cell"><span class="item-icon sprite-icon"></span></div><span class="shop-price"></span>';
      const box = slot.querySelector('.item-cell') as HTMLElement;
      box.addEventListener('click', () => this.report(onClick(index)));
      box.addEventListener('mouseenter', () => {
        this.hovered = index;
        this.showTooltip();
      });
      box.addEventListener('mouseleave', () => {
        if (this.hovered === index) this.hovered = -1;
        this.tooltip.hide();
      });
      parent.appendChild(slot);
      slots.push({ root: slot, box, icon: slot.querySelector('.item-icon') as HTMLElement, price: slot.querySelector('.shop-price') as HTMLElement });
    }
    return slots;
  }

  get isOpen(): boolean {
    return !this.root.hidden;
  }

  /** Öffnet den Handel: Das Inventar geht mit auf, dort lässt sich jetzt verkaufen. */
  open(): void {
    this.root.hidden = false;
    this.shop.restockIfDue();
    this.inventoryWindow.open();
    this.inventoryWindow.setShop(this.shop);
    this.showTab('stock');
  }

  close(): void {
    if (!this.isOpen) return;
    this.root.hidden = true;
    this.hovered = -1;
    this.tooltip.hide();
    this.inventoryWindow.setShop(null);
  }

  /** Wechselt den Reiter. */
  private showTab(tab: Tab): void {
    this.tab = tab;
    this.hovered = -1;
    this.tooltip.hide();
    for (const id of ['stock', 'buyback'] as const) {
      this.pages[id].hidden = id !== tab;
      this.tabButtons[id].classList.toggle('active', id === tab);
    }
    this.render();
  }

  /** Zeichnet beide Reiter neu. Aufrufen, wenn sich Sortiment, Rückkauf, Gold oder Tränke geändert haben. */
  render(): void {
    if (!this.isOpen) return;
    const gold = this.inventory.gold;
    this.renderSlots(this.slots.stock, this.shop.stock, buyPrice, 'verkauft');
    this.renderSlots(this.slots.buyback, this.shop.buyback, sellPrice, '');
    this.gold.textContent = `${gold} Gold`;
    byId('shop-buyback-gold').textContent = `${gold} Gold`;
    byId('shop-buyback-count').textContent = `${this.shop.buyback.length} / ${BUYBACK.size} Items`;
    this.tabButtons.buyback.textContent = this.shop.buyback.length > 0 ? `Rückkauf (${this.shop.buyback.length})` : 'Rückkauf';

    // Heiltrank: Heilung und Preis hängen an der Alchemistin. Tragen kann die Figur beliebig viele.
    const price = this.shop.potionPrice;
    this.potionText.textContent = `${POTION.name} – heilt ${Math.round(this.player.potionHealFraction * 100)} % Leben, Taste Q`;
    this.potionCount.textContent = `Im Gepäck: ${this.player.potions}`;
    this.potionButton.textContent = `Kaufen: ${price} Gold`;
    this.potionButton.disabled = price > gold;

    // "Neue Ware sofort" gibt es erst mit Kontor Stufe 3.
    const restockPrice = this.shop.instantRestockPrice;
    this.restockButton.hidden = !this.shop.canRestockNow;
    this.restockButton.textContent = `Neue Ware sofort: ${restockPrice} Gold`;
    this.restockButton.disabled = restockPrice > gold;
    this.showTooltip();
  }

  /** Füllt eine Reihe von Plätzen mit `items`. `priceOf` rechnet den Preis aus, `emptyText` steht unter leeren Plätzen. */
  private renderSlots(slots: Slot[], items: (Item | null)[], priceOf: (level: number, rarity: Item['rarity']) => number, emptyText: string): void {
    const gold = this.inventory.gold;
    slots.forEach((slot, index) => {
      // Das Regal wächst mit dem Kontor: Plätze, die es noch nicht gibt, bleiben unsichtbar.
      slot.root.hidden = slots === this.slots.stock && index >= items.length;
      const item = items[index] ?? null;
      slot.box.classList.toggle('filled', item !== null);
      slot.box.style.borderColor = item ? rarityById(item.rarity).color : '';
      if (item) slot.icon.style.backgroundPosition = iconPosition(item.icon);
      const price = item ? priceOf(item.level, item.rarity) : 0;
      slot.price.textContent = item ? `${price}` : emptyText;
      // Rot = dafür reicht das Gold gerade nicht.
      slot.price.classList.toggle('too-expensive', item !== null && price > gold);
    });
  }

  /** Einmal pro Frame: Uhr bis zur neuen Ware. Ist die Zeit um, wird das Regal aufgefüllt. */
  update(): void {
    if (!this.isOpen) return;
    this.shop.restockIfDue();
    const seconds = Math.ceil(this.shop.restockInMs / 1000);
    const text = `Neue Ware in ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
    if (this.restock.textContent !== text) this.restock.textContent = text;
  }

  /** Sagt dem Spieler, warum ein Kauf nicht geklappt hat. */
  private report(result: BuyResult): void {
    if (result === 'gold') this.hud.flash('Zu wenig Gold');
    else if (result === 'full') this.hud.flash('Inventar voll');
  }

  private showTooltip(): void {
    // Liegt die Maus nicht über einem Platz dieses Fensters, gehört der Tooltip dem Inventar-Fenster.
    if (this.hovered < 0) return;
    const buyback = this.tab === 'buyback';
    const item = (buyback ? this.shop.buyback : this.shop.stock)[this.hovered] ?? null;
    if (!item) return this.tooltip.hide();
    const price = buyback ? sellPrice(item.level, item.rarity) : buyPrice(item.level, item.rarity);
    const action = buyback ? 'zurückkaufen' : 'kaufen';
    const hint = price > this.inventory.gold ? `Kostet ${price} Gold – dir fehlen ${price - this.inventory.gold}` : `Linksklick: ${action} für ${price} Gold`;
    this.tooltip.show(item, this.slots[this.tab][this.hovered].box, this.root, 'right', true, [hint]);
  }
}
