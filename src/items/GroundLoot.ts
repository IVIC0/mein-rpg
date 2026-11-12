import Phaser from 'phaser';
import { RARITIES } from '../data/items';
import { DROP_TABLES, GOLD_DROP, GOLD_RANK_FACTOR, LOOT_DESPAWN_MS, LOOT_PICKUP_DELAY_MS, LOOT_PICKUP_RADIUS, LOOT_SCATTER } from '../data/loot';
import type { Enemy } from '../entities/Enemy';
import type { Player } from '../entities/Player';
import type { FloatingText } from '../ui/FloatingText';
import type { Hud } from '../ui/Hud';
import { generateItem, nextItemId, rarityById, rollRarity, type Item } from './generator';
import type { Inventory } from './Inventory';

/** Items am Boden liegen über der Karte, aber unter allen Figuren. */
const DEPTH = 7;

/** Ab dieser Seltenheit steht über dem Item zusätzlich ein Lichtstrahl. */
const BEAM_FROM = RARITIES.findIndex((rarity) => rarity.id === 'rare');

/** Ein Item am Boden, so wie es im Spielstand steht: wo es liegt und wie lange schon. */
export interface GroundItem {
  item: Item;
  x: number;
  y: number;
  ageMs: number;
}

/** Ein Item, das am Boden liegt. */
interface Drop {
  item: Item;
  x: number;
  y: number;
  sprite: Phaser.GameObjects.Image;
  /** Farbiger Schein in der Farbe der Seltenheit – und bei seltenen Items ein Lichtstrahl. */
  glow: Phaser.GameObjects.Ellipse;
  beam: Phaser.GameObjects.Rectangle | null;
  ageMs: number;
  /** Die Figur steht darauf, aber das Inventar ist voll – der Hinweis kam schon. */
  blocked: boolean;
}

/**
 * Die Beute: würfelt aus, was ein besiegter Gegner fallen lässt, zeigt Items am
 * Boden und hebt sie auf, sobald die Figur darüber läuft. Gold landet direkt im Beutel.
 */
export class GroundLoot {
  private drops: Drop[] = [];
  /** Wird aufgerufen, wenn ein Item zu Boden fällt oder verschwindet – daran hängt das Speichern. */
  onChange: () => void = () => {};

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly inventory: Inventory,
    private readonly hud: Hud,
    private readonly floaters: FloatingText,
  ) {}

  /** Alle Items am Boden für den Spielstand. */
  toData(): GroundItem[] {
    return this.drops.map((drop) => ({ item: drop.item, x: drop.x, y: drop.y, ageMs: Math.round(drop.ageMs) }));
  }

  /** Legt die Items aus einem Spielstand wieder an ihren Platz. Ihre Liegezeit läuft dort weiter, wo sie war. */
  load(items: GroundItem[]): void {
    for (const entry of items) {
      if (entry.ageMs >= LOOT_DESPAWN_MS) continue;
      this.show({ ...entry.item, id: nextItemId() }, entry.x, entry.y, entry.ageMs, false);
    }
  }

  /** Ein Gegner wurde besiegt: Gold gutschreiben und vielleicht ein Item fallen lassen. */
  dropFrom(enemy: Enemy): void {
    const gold = (Phaser.Math.Between(GOLD_DROP.min, GOLD_DROP.max) + GOLD_DROP.perLevel * enemy.level) * GOLD_RANK_FACTOR[enemy.rank];
    this.inventory.addGold(gold);
    this.floaters.spawn(enemy.pos.x, enemy.pos.y - 4, `+${gold} Gold`, 'gold');

    // Drop-Chance und Seltenheit hängen vom Rang des Gegners ab (normal, Elite, Boss).
    if (Math.random() < DROP_TABLES[enemy.rank].itemChance) {
      this.place(generateItem(enemy.level, rollRarity(enemy.rank)), enemy.pos.x, enemy.pos.y);
    }
  }

  /** Einmal pro Frame: aufheben, was unter der Figur liegt, und alte Items verschwinden lassen. */
  update(deltaMs: number, player: Player): void {
    if (this.drops.length === 0) return;
    this.drops = this.drops.filter((drop) => {
      drop.ageMs += deltaMs;
      if (drop.ageMs >= LOOT_DESPAWN_MS) {
        this.remove(drop);
        this.onChange();
        return false;
      }
      const near = player.alive && drop.ageMs >= LOOT_PICKUP_DELAY_MS && player.distanceTo(drop) <= LOOT_PICKUP_RADIUS;
      if (!near) {
        drop.blocked = false;
        return true;
      }
      if (this.inventory.add(drop.item)) {
        const color = rarityById(drop.item.rarity).color;
        this.floaters.spawn(player.pos.x, player.pos.y - 22, drop.item.name, 'loot', color);
        this.hud.logLoot(drop.item.name, color);
        this.remove(drop);
        return false;
      }
      // Inventar voll: das Item bleibt liegen, der Hinweis kommt nur einmal pro Besuch.
      if (!drop.blocked) this.hud.flash('Inventar voll');
      drop.blocked = true;
      return true;
    });
  }

  /** Legt ein Item neben den Punkt (x, y): es springt kurz hoch und bleibt dann liegen. */
  private place(item: Item, x: number, y: number): void {
    const dropX = Math.round(x + Phaser.Math.Between(-LOOT_SCATTER, LOOT_SCATTER));
    const dropY = Math.round(y + Phaser.Math.Between(-LOOT_SCATTER, LOOT_SCATTER));
    this.show(item, dropX, dropY, 0, true);
    this.onChange();
  }

  /** Zeichnet ein Item an der Stelle (dropX, dropY). `bounce` = es fällt gerade erst herunter. */
  private show(item: Item, dropX: number, dropY: number, ageMs: number, bounce: boolean): void {
    const rarity = rarityById(item.rarity);
    const color = Phaser.Display.Color.HexStringToColor(rarity.color).color;
    // Dunkler Rand, damit auch ein grüner Schein im Gras zu sehen ist.
    const glow = this.scene.add.ellipse(dropX, dropY + 5, 16, 7, color, 0.9).setStrokeStyle(1, 0x140c0a, 0.7).setDepth(DEPTH);
    const sprite = this.scene.add.image(dropX, bounce ? dropY - 10 : dropY, 'characters', item.icon).setDepth(DEPTH + 0.2);
    const beam =
      RARITIES.indexOf(rarity) >= BEAM_FROM
        ? this.scene.add.rectangle(dropX, dropY - 14, 2, 26, color, 0.75).setDepth(DEPTH + 0.1)
        : null;
    if (bounce) this.scene.tweens.add({ targets: sprite, y: dropY, duration: 350, ease: 'Bounce.easeOut' });
    // Der Schein pulsiert, damit das Item auffällt.
    this.scene.tweens.add({ targets: beam ? [glow, beam] : glow, alpha: 0.45, duration: 700, yoyo: true, repeat: -1 });
    this.drops.push({ item, x: dropX, y: dropY, sprite, glow, beam, ageMs, blocked: false });
  }

  private remove(drop: Drop): void {
    for (const object of [drop.sprite, drop.glow, drop.beam]) {
      if (!object) continue;
      this.scene.tweens.killTweensOf(object);
      object.destroy();
    }
  }
}
