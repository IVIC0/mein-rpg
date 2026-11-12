import type Phaser from 'phaser';
import { TILE } from '../config';
import { MERCHANT } from '../data/shop';
import { spriteDef } from '../data/sprites';
import type { Point } from '../world/Grid';
import type { Interactable } from '../world/Interactable';
import { SPRITE_OFFSET_Y } from './Actor';

/**
 * Der Händler im Dorf. Er steht nur da: ein Bild mit Schatten an einem festen Platz.
 * Ein Klick auf ihn lässt die Figur hinlaufen und öffnet den Handel (`onUse`, setzt WorldScene),
 * sein Namensschild zeichnet src/ui/Nameplates.ts.
 */
export class Merchant implements Interactable {
  readonly pos: Point;
  /** Die Figur stellt sich direkt vor ihn (eine Kachel tiefer) – auf seiner eigenen Kachel steht er selbst. */
  readonly standAt: Point;
  readonly range = MERCHANT.openRange;
  private readonly images: Phaser.GameObjects.GameObject[];

  constructor(scene: Phaser.Scene, x: number, y: number, private readonly onUse: () => void) {
    this.pos = { x, y };
    this.standAt = { x, y: y + TILE };
    // Tiefe wie bei den Figuren (Actor): wer weiter unten steht, wird weiter vorn gezeichnet.
    const depth = 10 + y / 10000;
    const look = spriteDef(MERCHANT.sprite);
    this.images = [
      scene.add.image(x, y + 5, 'shadow').setAlpha(0.25).setDepth(depth),
      scene.add.sprite(x, y + SPRITE_OFFSET_Y, look.sheet, look.idle[0]).setDepth(depth),
    ];
  }

  /** Liegt der Punkt `at` (Welt-Koordinaten) auf dem Bild des Händlers? Mit 2 Pixeln Rand, wie bei Gegnern. */
  contains(at: Point): boolean {
    return Math.abs(at.x - this.pos.x) <= 10 && Math.abs(at.y - (this.pos.y + SPRITE_OFFSET_Y)) <= 10;
  }

  use(): void {
    this.onUse();
  }

  destroy(): void {
    for (const image of this.images) image.destroy();
  }
}
