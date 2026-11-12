import Phaser from 'phaser';
import { RARITIES } from '../data/items';
import { GOLD_DROP, ITEM_DROP_CHANCE, LOOT_DESPAWN_MS, LOOT_PICKUP_DELAY_MS, LOOT_PICKUP_RADIUS, LOOT_SCATTER } from '../data/loot';
import type { Enemy } from '../entities/Enemy';
import type { Player } from '../entities/Player';
import type { FloatingText } from '../ui/FloatingText';
import type { Hud } from '../ui/Hud';
import { generateItem, rarityById, type Item } from './generator';
import type { Inventory } from './Inventory';

/** Items am Boden liegen über der Karte, aber unter allen Figuren. */
const DEPTH = 7;

/** Ab dieser Seltenheit steht über dem Item zusätzlich ein Lichtstrahl. */
const BEAM_FROM = RARITIES.findIndex((rarity) => rarity.id === 'rare');

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

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly inventory: Inventory,
    private readonly hud: Hud,
    private readonly floaters: FloatingText,
  ) {}

  /** Ein Gegner wurde besiegt: Gold gutschreiben und vielleicht ein Item fallen lassen. */
  dropFrom(enemy: Enemy): void {
    const gold = Phaser.Math.Between(GOLD_DROP.min, GOLD_DROP.max) + GOLD_DROP.perLevel * enemy.level;
    this.inventory.addGold(gold);
    this.floaters.spawn(enemy.pos.x, enemy.pos.y - 4, `+${gold} Gold`, 'gold');

    if (Math.random() < ITEM_DROP_CHANCE) this.place(generateItem(enemy.level), enemy.pos.x, enemy.pos.y);
  }

  /** Einmal pro Frame: aufheben, was unter der Figur liegt, und alte Items verschwinden lassen. */
  update(deltaMs: number, player: Player): void {
    if (this.drops.length === 0) return;
    this.drops = this.drops.filter((drop) => {
      drop.ageMs += deltaMs;
      if (drop.ageMs >= LOOT_DESPAWN_MS) {
        this.remove(drop);
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
    const rarity = rarityById(item.rarity);
    const color = Phaser.Display.Color.HexStringToColor(rarity.color).color;
    // Dunkler Rand, damit auch ein grüner Schein im Gras zu sehen ist.
    const glow = this.scene.add.ellipse(dropX, dropY + 5, 16, 7, color, 0.9).setStrokeStyle(1, 0x140c0a, 0.7).setDepth(DEPTH);
    const sprite = this.scene.add.image(dropX, dropY - 10, 'characters', item.icon).setDepth(DEPTH + 0.2);
    const beam =
      RARITIES.indexOf(rarity) >= BEAM_FROM
        ? this.scene.add.rectangle(dropX, dropY - 14, 2, 26, color, 0.75).setDepth(DEPTH + 0.1)
        : null;
    this.scene.tweens.add({ targets: sprite, y: dropY, duration: 350, ease: 'Bounce.easeOut' });
    // Der Schein pulsiert, damit das Item auffällt.
    this.scene.tweens.add({ targets: beam ? [glow, beam] : glow, alpha: 0.45, duration: 700, yoyo: true, repeat: -1 });
    this.drops.push({ item, x: dropX, y: dropY, sprite, glow, beam, ageMs: 0, blocked: false });
  }

  private remove(drop: Drop): void {
    for (const object of [drop.sprite, drop.glow, drop.beam]) {
      if (!object) continue;
      this.scene.tweens.killTweensOf(object);
      object.destroy();
    }
  }
}
