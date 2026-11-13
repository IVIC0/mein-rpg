import { STASH_MAX } from '../data/town';
import type { Town } from '../town/Town';
import { nextItemId, type Item } from './generator';
import type { Inventory } from './Inventory';

/**
 * Die Lagertruhe im Dorf: zusätzliche Plätze für Items, die gerade nicht ins Inventar sollen.
 * Wie viele Plätze sie hat, bestimmt das Lagerhaus (src/data/town.ts) – ohne Lagerhaus keine.
 * Nach jeder Änderung wird `onChange` aufgerufen (Fenster neu zeichnen, speichern).
 */
export class Stash {
  /** Alle Plätze bis zur höchsten Ausbaustufe; benutzbar sind nur die ersten `size`. null = leer. */
  readonly slots: (Item | null)[] = new Array<Item | null>(STASH_MAX).fill(null);
  onChange: () => void = () => {};

  constructor(
    private readonly inventory: Inventory,
    private readonly town: Town,
  ) {}

  /** So viele Plätze sind gerade freigeschaltet. */
  get size(): number {
    return this.town.effects.stashSize;
  }

  /** So viele Plätze sind belegt. */
  get used(): number {
    return this.slots.filter((item) => item !== null).length;
  }

  /** Übernimmt den Inhalt aus einem Spielstand. */
  load(items: (Item | null)[]): void {
    this.slots.forEach((_, index) => {
      const item = items[index];
      this.slots[index] = item ? { ...item, id: nextItemId() } : null;
    });
  }

  toData(): (Item | null)[] {
    return [...this.slots];
  }

  /** Legt das Item vom Inventar-Platz `bagIndex` in die Truhe. Gibt false zurück, wenn sie voll ist. */
  store(bagIndex: number): boolean {
    const item = this.inventory.bag[bagIndex];
    if (!item) return true;
    const free = this.slots.findIndex((slot, index) => slot === null && index < this.size);
    if (free < 0) return false;
    this.slots[free] = item;
    this.inventory.discard(bagIndex);
    this.onChange();
    return true;
  }

  /** Holt das Item vom Truhen-Platz `index` ins Inventar. Gibt false zurück, wenn dort kein Platz ist. */
  take(index: number): boolean {
    const item = this.slots[index];
    if (!item) return true;
    if (this.inventory.isFull) return false;
    this.slots[index] = null;
    this.inventory.add(item);
    this.onChange();
    return true;
  }
}
