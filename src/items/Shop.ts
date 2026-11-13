import { RARITIES, type RarityId } from '../data/items';
import { BUYBACK, SHOP_STOCK, buyPrice, potionPrice, sellPrice } from '../data/shop';
import { STOCK_MAX, type TownEffects } from '../data/town';
import type { Player } from '../entities/Player';
import type { Town } from '../town/Town';
import { generateItem, nextItemId, type Item } from './generator';
import type { Inventory } from './Inventory';

/** Der Zustand des Händlers, so wie er im Spielstand steht. */
export interface ShopData {
  /** Die Plätze im Regal; null = schon verkauft. */
  stock: (Item | null)[];
  /** Zeitpunkt (Date.now()), zu dem neue Ware kommt. 0 = sofort. */
  restockAt: number;
  /** Rückkauf: die zuletzt verkauften Items, das neueste zuerst (höchstens BUYBACK.size). */
  buyback: Item[];
}

/** Ergebnis eines Kaufversuchs: geklappt, zu wenig Gold oder Inventar voll. */
export type BuyResult = 'ok' | 'gold' | 'full';

/**
 * Der Händler: sein Sortiment, Kaufen und Verkaufen. Die Preise stehen in src/data/shop.ts.
 * Größe des Regals, Seltenheiten, Lieferzeit und Trankpreis hängen am Dorfausbau
 * (Kontor und Alchemistin, src/data/town.ts) – der Händler liest sie aus `town.effects`.
 * Nach jeder Änderung am Sortiment wird `onChange` aufgerufen (Fenster neu zeichnen, speichern).
 */
export class Shop {
  stock: (Item | null)[] = [];
  restockAt = 0;
  /** Die zuletzt verkauften Items, das neueste zuerst. */
  buyback: Item[] = [];
  onChange: () => void = () => {};

  constructor(
    private readonly inventory: Inventory,
    private readonly player: Player,
    private readonly town: Town,
  ) {}

  /** Übernimmt das Sortiment aus einem Spielstand. */
  load(data: ShopData): void {
    this.stock = data.stock.slice(0, STOCK_MAX).map((item) => (item ? { ...item, id: nextItemId() } : null));
    this.restockAt = data.restockAt;
    this.buyback = data.buyback.slice(0, BUYBACK.size).map((item) => ({ ...item, id: nextItemId() }));
  }

  toData(): ShopData {
    return { stock: [...this.stock], restockAt: this.restockAt, buyback: [...this.buyback] };
  }

  /** Millisekunden, bis neue Ware kommt. */
  get restockInMs(): number {
    return Math.max(0, this.restockAt - Date.now());
  }

  /** Ist die Zeit um (oder das Regal noch nie gefüllt), kommt neue Ware. */
  restockIfDue(): void {
    if (this.stock.length > 0 && Date.now() < this.restockAt) return;
    this.restock();
  }

  /** Neue Ware auf der Stufe der Figur – sofort, egal wie lange die letzte Lieferung her ist. */
  restock(): void {
    const effects = this.town.effects;
    this.stock = Array.from({ length: effects.stockSize }, () => generateItem(this.player.level, rollStockRarity(effects)));
    this.restockAt = Date.now() + effects.restockMs;
    this.onChange();
  }

  /** Gibt es den Knopf "Neue Ware sofort" schon? (Kontor ab Stufe 3) */
  get canRestockNow(): boolean {
    return this.town.effects.instantRestock;
  }

  /** So viel Gold kostet "Neue Ware sofort". */
  get instantRestockPrice(): number {
    return buyPrice(this.player.level, SHOP_STOCK.instantRestockPriceOf);
  }

  /** Bezahlt für neue Ware und füllt das Regal sofort. */
  buyRestock(): BuyResult {
    const price = this.instantRestockPrice;
    if (!this.canRestockNow) return 'ok';
    if (this.inventory.gold < price) return 'gold';
    this.inventory.spendGold(price);
    this.restock();
    return 'ok';
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
    // Für den Rückkauf merken: vorne anstellen, das älteste fällt hinten heraus.
    this.buyback.unshift(item);
    this.buyback.length = Math.min(this.buyback.length, BUYBACK.size);
    this.inventory.discard(index);
    this.inventory.addGold(gold);
    return gold;
  }

  /** Kauft das Item vom Rückkauf-Platz `index` zurück – zum selben Preis, den der Händler gezahlt hat. */
  buyBack(index: number): BuyResult {
    const item = this.buyback[index];
    if (!item) return 'ok';
    const price = sellPrice(item.level, item.rarity);
    if (this.inventory.gold < price) return 'gold';
    if (this.inventory.isFull) return 'full';
    this.buyback.splice(index, 1);
    this.inventory.spendGold(price);
    this.inventory.add(item);
    this.onChange();
    return 'ok';
  }

  /** Was ein Heiltrank gerade kostet (die Alchemistin gibt Nachlass). */
  get potionPrice(): number {
    return potionPrice(this.player.level, this.town.effects.potionDiscount);
  }

  /**
   * Kauft bis zu `count` Heiltränke – weniger, wenn das Gold nicht für alle reicht.
   * Gibt zurück, wie viele es geworden sind (0 = zu wenig Gold). Eine Obergrenze fürs Gepäck gibt es nicht.
   */
  buyPotions(count: number): number {
    const price = this.potionPrice;
    const bought = Math.min(count, Math.floor(this.inventory.gold / price));
    if (bought <= 0) return 0;
    this.player.potions += bought;
    this.inventory.spendGold(price * bought);
    return bought;
  }
}

/**
 * Die Anteile der Seltenheiten im Regal. Selten und Episch gibt das Kontor vor; was übrig bleibt,
 * teilen sich Gewöhnlich und Ungewöhnlich im Verhältnis aus SHOP_STOCK.rarityWeights (60 : 32).
 */
function stockWeights(effects: TownEffects): Partial<Record<RarityId, number>> {
  const common = SHOP_STOCK.rarityWeights.common ?? 0;
  const uncommon = SHOP_STOCK.rarityWeights.uncommon ?? 0;
  const rest = 100 - effects.stockRareShare - effects.stockEpicShare;
  return {
    common: (rest * common) / (common + uncommon),
    uncommon: (rest * uncommon) / (common + uncommon),
    rare: effects.stockRareShare,
    epic: effects.stockEpicShare,
  };
}

/** Würfelt die Seltenheit eines Items im Regal. */
function rollStockRarity(effects: TownEffects): RarityId {
  const weights = stockWeights(effects);
  const total = RARITIES.reduce((sum, rarity) => sum + (weights[rarity.id] ?? 0), 0);
  let roll = Math.random() * total;
  for (const rarity of RARITIES) {
    roll -= weights[rarity.id] ?? 0;
    if (roll < 0) return rarity.id;
  }
  return RARITIES[0].id;
}
