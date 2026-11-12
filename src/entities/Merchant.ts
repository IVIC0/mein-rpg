import type Phaser from 'phaser';
import { MERCHANT } from '../data/shop';
import type { Point } from '../world/Grid';
import { SPRITE_OFFSET_Y } from './Actor';

/**
 * Der Händler im Dorf. Er steht nur da: ein Bild mit Schatten an einem festen Platz.
 * Ein Klick auf ihn lässt die Figur hinlaufen und öffnet den Handel (WorldScene),
 * sein Namensschild zeichnet src/ui/Nameplates.ts.
 */
export class Merchant {
  readonly pos: Point;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.pos = { x, y };
    // Tiefe wie bei den Figuren (Actor): wer weiter unten steht, wird weiter vorn gezeichnet.
    const depth = 10 + y / 10000;
    scene.add.image(x, y + 5, 'shadow').setAlpha(0.25).setDepth(depth);
    scene.add.sprite(x, y + SPRITE_OFFSET_Y, 'characters', MERCHANT.frame).setDepth(depth);
  }

  /** Liegt der Punkt `at` (Welt-Koordinaten) auf dem Bild des Händlers? Mit 2 Pixeln Rand, wie bei Gegnern. */
  contains(at: Point): boolean {
    return Math.abs(at.x - this.pos.x) <= 10 && Math.abs(at.y - (this.pos.y + SPRITE_OFFSET_Y)) <= 10;
  }
}
