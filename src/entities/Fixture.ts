import type Phaser from 'phaser';
import { TILE } from '../config';
import { spriteDef, type SpriteName } from '../data/sprites';
import type { Point } from '../world/Grid';
import type { Interactable } from '../world/Interactable';
import { SPRITE_OFFSET_Y } from './Actor';

/**
 * Etwas, das fest an seinem Platz steht und sich anklicken lässt: der Händler, der Baumeister
 * und die Lagertruhe im Dorf. Es ist nur ein Bild mit Schatten – ein Klick lässt die Figur
 * hinlaufen und ruft dann `onUse` auf (was dort passiert, legt WorldScene.buildPoi fest).
 * Das Namensschild zeichnet src/ui/Nameplates.ts.
 */
export class Fixture implements Interactable {
  readonly pos: Point;
  /** Die Figur stellt sich direkt davor (eine Kachel tiefer) – die eigene Kachel ist ein Hindernis. */
  readonly standAt: Point;
  private readonly images: Phaser.GameObjects.GameObject[];

  /** `sprite` = Name des Bildes (src/data/sprites.ts), `range` = so nah muss die Figur zum Benutzen sein (Welt-Pixel). */
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    sprite: SpriteName,
    readonly range: number,
    private readonly onUse: () => void,
  ) {
    this.pos = { x, y };
    this.standAt = { x, y: y + TILE };
    // Tiefe wie bei den Figuren (Actor): wer weiter unten steht, wird weiter vorn gezeichnet.
    const depth = 10 + y / 10000;
    const look = spriteDef(sprite);
    this.images = [
      scene.add.image(x, y + 5, 'shadow').setAlpha(0.25).setDepth(depth),
      scene.add.sprite(x, y + SPRITE_OFFSET_Y, look.sheet, look.idle[0]).setDepth(depth),
    ];
  }

  /** Liegt der Punkt `at` (Welt-Koordinaten) auf dem Bild? Mit 2 Pixeln Rand, wie bei Gegnern. */
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
