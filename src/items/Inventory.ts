import { EQUIP_SLOTS, type EquipSlot } from '../data/items';
import { INVENTORY_SIZE } from '../data/loot';
import { STAT_IDS, emptyStats, type Stats } from '../data/stats';
import { itemStats, nextItemId, type Item } from './generator';

/**
 * Was die Figur besitzt: das Inventar (feste Zahl von Plätzen), die angelegte
 * Ausrüstung und das Gold. Nach jeder Änderung wird `onChange` aufgerufen –
 * daran hängen die Werte der Figur und das Inventar-Fenster.
 */
export class Inventory {
  /** Die Plätze des Inventars; null = leer. */
  readonly bag: (Item | null)[] = new Array<Item | null>(INVENTORY_SIZE).fill(null);
  readonly equipped: Record<EquipSlot, Item | null> = {
    weapon: null,
    shield: null,
    helmet: null,
    chest: null,
    gloves: null,
    boots: null,
    amulet: null,
    ring1: null,
    ring2: null,
  };
  gold = 0;
  onChange: () => void = () => {};

  /** Übernimmt Inventar, Ausrüstung und Gold aus einem Spielstand. */
  load(bag: (Item | null)[], equipped: Record<EquipSlot, Item | null>, gold: number): void {
    // Kopien mit frischer Nummer: so bleibt der geladene Spielstand selbst unverändert.
    const copy = (item: Item | null | undefined): Item | null => (item ? { ...item, id: nextItemId() } : null);
    this.bag.forEach((_, index) => (this.bag[index] = copy(bag[index])));
    for (const slot of EQUIP_SLOTS) this.equipped[slot.id] = copy(equipped[slot.id]);
    this.gold = gold;
    this.onChange();
  }

  get isFull(): boolean {
    return !this.bag.includes(null);
  }

  /** Legt ein Item auf den ersten freien Platz. Gibt false zurück, wenn das Inventar voll ist. */
  add(item: Item): boolean {
    const free = this.bag.indexOf(null);
    if (free < 0) return false;
    this.bag[free] = item;
    this.onChange();
    return true;
  }

  addGold(amount: number): void {
    this.gold += amount;
    this.onChange();
  }

  /** Zieht `fraction` des Goldes ab (0.05 = 5 %) und gibt den Verlust zurück. */
  loseGold(fraction: number): number {
    const loss = Math.round(this.gold * fraction);
    this.gold -= loss;
    if (loss > 0) this.onChange();
    return loss;
  }

  /**
   * Der Ausrüstungsplatz, in den das Item käme. Ein Ring geht in den freien
   * Ring-Platz; sind beide belegt, ersetzt er Ring 1.
   */
  slotFor(item: Item): EquipSlot {
    if (item.slot !== 'ring') return item.slot;
    return this.equipped.ring1 && !this.equipped.ring2 ? 'ring2' : 'ring1';
  }

  /** Legt das Item vom Inventar-Platz `index` an. Was vorher dort angelegt war, kommt an seine Stelle. */
  equip(index: number): void {
    const item = this.bag[index];
    if (!item) return;
    const slot = this.slotFor(item);
    this.bag[index] = this.equipped[slot];
    this.equipped[slot] = item;
    this.onChange();
  }

  /** Legt ein Item zurück ins Inventar. Gibt false zurück, wenn dort kein Platz ist. */
  unequip(slot: EquipSlot): boolean {
    const item = this.equipped[slot];
    if (!item) return true;
    const free = this.bag.indexOf(null);
    if (free < 0) return false;
    this.bag[free] = item;
    this.equipped[slot] = null;
    this.onChange();
    return true;
  }

  /** Wirft das Item auf dem Inventar-Platz `index` weg. Es ist danach verloren. */
  discard(index: number): void {
    if (!this.bag[index]) return;
    this.bag[index] = null;
    this.onChange();
  }

  /** Die Werte aller angelegten Items zusammengezählt. */
  equippedStats(): Stats {
    const total = emptyStats();
    for (const slot of EQUIP_SLOTS) {
      const stats = itemStats(this.equipped[slot.id]);
      for (const id of STAT_IDS) total[id] += stats[id];
    }
    return total;
  }
}
