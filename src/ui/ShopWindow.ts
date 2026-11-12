import { POTION, SHOP_STOCK, buyPrice, potionPrice } from '../data/shop';
import type { Player } from '../entities/Player';
import { rarityById } from '../items/generator';
import type { Inventory } from '../items/Inventory';
import type { BuyResult, Shop } from '../items/Shop';
import { byId, iconPosition } from './dom';
import type { Hud } from './Hud';
import type { InventoryWindow } from './InventoryWindow';
import type { ItemTooltip } from './ItemTooltip';

interface Slot {
  box: HTMLElement;
  icon: HTMLElement;
  price: HTMLElement;
}

/**
 * Das Fenster des Händlers: sein Sortiment (Linksklick = kaufen) und der Heiltrank.
 * Verkauft wird im Inventar-Fenster, das sich mit öffnet (Rechtsklick auf ein Item).
 * Das Grundgerüst steht in index.html, die Regeln und Preise in src/items/Shop.ts und src/data/shop.ts.
 */
export class ShopWindow {
  private readonly root = byId('shop');
  private readonly gold = byId('shop-gold');
  private readonly restock = byId('shop-restock');
  private readonly potionText = byId('shop-potion-text');
  private readonly potionButton = byId('shop-potion-buy') as HTMLButtonElement;
  private readonly slots: Slot[] = [];
  private hovered = -1;

  constructor(
    private readonly shop: Shop,
    private readonly inventory: Inventory,
    private readonly player: Player,
    private readonly hud: Hud,
    private readonly tooltip: ItemTooltip,
    private readonly inventoryWindow: InventoryWindow,
  ) {
    const stock = byId('shop-stock');
    for (let index = 0; index < SHOP_STOCK.size; index++) {
      const slot = document.createElement('div');
      slot.className = 'shop-slot';
      slot.innerHTML = '<div class="item-cell"><span class="item-icon sprite-icon"></span></div><span class="shop-price"></span>';
      const box = slot.querySelector('.item-cell') as HTMLElement;
      box.addEventListener('click', () => this.report(this.shop.buy(index)));
      box.addEventListener('mouseenter', () => {
        this.hovered = index;
        this.showTooltip();
      });
      box.addEventListener('mouseleave', () => {
        if (this.hovered === index) this.hovered = -1;
        this.tooltip.hide();
      });
      stock.appendChild(slot);
      this.slots.push({ box, icon: slot.querySelector('.item-icon') as HTMLElement, price: slot.querySelector('.shop-price') as HTMLElement });
    }
    (byId('shop-potion-icon') as HTMLElement).style.backgroundPosition = iconPosition(POTION.frame);
    this.potionButton.addEventListener('click', () => {
      this.report(this.shop.buyPotion());
      this.potionButton.blur();
      this.render();
    });
    byId('shop-close').addEventListener('click', () => this.close());
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
    this.render();
  }

  close(): void {
    if (!this.isOpen) return;
    this.root.hidden = true;
    this.hovered = -1;
    this.tooltip.hide();
    this.inventoryWindow.setShop(null);
  }

  /** Zeichnet Sortiment, Gold und Trank neu. Aufrufen, wenn sich Sortiment, Gold oder Tränke geändert haben. */
  render(): void {
    if (!this.isOpen) return;
    const gold = this.inventory.gold;
    this.slots.forEach((slot, index) => {
      const item = this.shop.stock[index] ?? null;
      slot.box.classList.toggle('filled', item !== null);
      slot.box.style.borderColor = item ? rarityById(item.rarity).color : '';
      if (item) slot.icon.style.backgroundPosition = iconPosition(item.icon);
      const price = item ? buyPrice(item.level, item.rarity) : 0;
      slot.price.textContent = item ? `${price}` : 'verkauft';
      // Rot = dafür reicht das Gold gerade nicht.
      slot.price.classList.toggle('too-expensive', item !== null && price > gold);
    });
    this.gold.textContent = `${gold} Gold`;

    const price = potionPrice(this.player.level);
    const full = this.player.potions >= POTION.maxCarried;
    this.potionText.textContent = `${POTION.name} (${this.player.potions} / ${POTION.maxCarried}) – heilt ${Math.round(POTION.healFraction * 100)} % Leben, Taste Q`;
    this.potionButton.textContent = full ? 'Gepäck voll' : `Kaufen: ${price} Gold`;
    this.potionButton.disabled = full || price > gold;
    this.showTooltip();
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
    else if (result === 'max') this.hud.flash('Mehr Tränke kannst du nicht tragen');
  }

  private showTooltip(): void {
    // Liegt die Maus nicht über dem Regal, gehört der Tooltip dem Inventar-Fenster.
    if (this.hovered < 0) return;
    const item = this.shop.stock[this.hovered] ?? null;
    if (!item) return this.tooltip.hide();
    const price = buyPrice(item.level, item.rarity);
    const hint = price > this.inventory.gold ? `Kostet ${price} Gold – dir fehlen ${price - this.inventory.gold}` : `Linksklick: kaufen für ${price} Gold`;
    this.tooltip.show(item, this.slots[this.hovered].box, this.root, 'right', true, [hint]);
  }
}
