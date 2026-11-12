import { RARITIES, type RarityId } from '../data/items';
import { POTION, SHOP_STOCK, buyPrice, potionPrice, sellPrice } from '../data/shop';
import type { Player } from '../entities/Player';
import { generateItem, nextItemId, type Item } from './generator';
import type { Inventory } from './Inventory';

/** Der Zustand des Händlers, so wie er im Spielstand steht. */
export interface ShopData {
  /** Die Plätze im Regal; null = schon verkauft. */
  stock: (Item | null)[];
  /** Zeitpunkt (Date.now()), zu dem neue Ware kommt. 0 = sofort. */
  restockAt: number;
}

/** Ergebnis eines Kaufversuchs: geklappt, zu wenig Gold, Inventar voll oder schon genug Tränke. */
export type BuyResult = 'ok' | 'gold' | 'full' | 'max';

/**
 * Der Händler: sein Sortiment, Kaufen und Verkaufen. Die Preise stehen in src/data/shop.ts.
 * Nach jeder Änderung am Sortiment wird `onChange` aufgerufen (Fenster neu zeichnen, speichern).
 */
export class Shop {
  stock: (Item | null)[] = [];
  restockAt = 0;
  onChange: () => void = () => {};

  constructor(
    private readonly inventory: Inventory,
    private readonly player: Player,
  ) {}

  /** Übernimmt das Sortiment aus einem Spielstand. */
  load(data: ShopData): void {
    this.stock = data.stock.map((item) => (item ? { ...item, id: nextItemId() } : null));
    this.restockAt = data.restockAt;
  }

  toData(): ShopData {
    return { stock: [...this.stock], restockAt: this.restockAt };
  }

  /** Millisekunden, bis neue Ware kommt. */
  get restockInMs(): number {
    return Math.max(0, this.restockAt - Date.now());
  }

  /** Ist die Zeit um (oder das Regal noch nie gefüllt), kommt neue Ware auf der Stufe der Figur. */
  restockIfDue(): void {
    if (this.stock.length > 0 && Date.now() < this.restockAt) return;
    this.stock = Array.from({ length: SHOP_STOCK.size }, () => generateItem(this.player.level, rollStockRarity()));
    this.restockAt = Date.now() + SHOP_STOCK.restockMs;
    this.onChange();
  }

  /** Kauft das Item vom Regalplatz `index`. */
  buy(index: number): BuyResult {
    const item = this.stock[index];
    if (!item) return 'ok';
    if (this.inventory.gold < buyPrice(item.level, item.rarity)) return 'gold';
    if (this.inventory.isFull) return 'full';
    this.stock[index] = null;
    this.inventory.spendGold(buyPrice(item.level, item.rarity));
    this.inventory.add(item);
    this.onChange();
    return 'ok';
  }

  /** Verkauft das Item vom Inventar-Platz `index`. Gibt das erhaltene Gold zurück (0 = dort lag nichts). */
  sell(index: number): number {
    const item = this.inventory.bag[index];
    if (!item) return 0;
    const gold = sellPrice(item.level, item.rarity);
    this.inventory.discard(index);
    this.inventory.addGold(gold);
    return gold;
  }

  /** Kauft einen Heiltrank. */
  buyPotion(): BuyResult {
    const price = potionPrice(this.player.level);
    if (this.player.potions >= POTION.maxCarried) return 'max';
    if (this.inventory.gold < price) return 'gold';
    this.player.potions++;
    this.inventory.spendGold(price);
    return 'ok';
  }
}

/** Würfelt die Seltenheit eines Items im Regal nach SHOP_STOCK.rarityWeights. */
function rollStockRarity(): RarityId {
  const weights = SHOP_STOCK.rarityWeights;
  const total = RARITIES.reduce((sum, rarity) => sum + (weights[rarity.id] ?? 0), 0);
  let roll = Math.random() * total;
  for (const rarity of RARITIES) {
    roll -= weights[rarity.id] ?? 0;
    if (roll < 0) return rarity.id;
  }
  return RARITIES[0].id;
}
