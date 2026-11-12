import type Phaser from 'phaser';
import { TILE } from '../config';
import { PORTAL } from '../data/pois';
import type { Point } from '../world/Grid';
import type { Interactable } from '../world/Interactable';

/**
 * Ein Übergang in eine andere Zone (z. B. der Höhleneingang). Betritt die Figur die Stelle,
 * wechselt die Zone (WorldScene.checkPortals). Ein Klick auf den Eingang – die Kachel
 * darüber – oder auf die Stelle selbst lässt die Figur hinlaufen.
 * Am Boden pulsiert ein heller Fleck, damit man sieht, wo es hineingeht.
 */
export class Portal implements Interactable {
  readonly pos: Point;
  readonly standAt: Point;
  readonly range = PORTAL.radius;
  private readonly glow: Phaser.GameObjects.Ellipse;

  /** `to` = Ziel-Zone, `arrive` = Marker dort, an dem die Figur ankommt. */
  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
    readonly to: string,
    readonly arrive: string,
  ) {
    this.pos = { x, y };
    this.standAt = { x, y };
    this.glow = scene.add.ellipse(x, y + 2, 12, 6, 0xfff2b0, 0.55).setDepth(5);
    scene.tweens.add({ targets: this.glow, alpha: 0.15, duration: 900, yoyo: true, repeat: -1 });
  }

  /** Klickbar sind die Stelle selbst und die Kachel darüber (dort steht der Eingang). */
  contains(at: Point): boolean {
    return Math.abs(at.x - this.pos.x) <= TILE / 2 && at.y >= this.pos.y - TILE * 1.5 && at.y <= this.pos.y + TILE / 2;
  }

  /** Nichts zu tun: Der Wechsel passiert von selbst, sobald die Figur auf der Stelle steht. */
  use(): void {}

  destroy(): void {
    this.scene.tweens.killTweensOf(this.glow);
    this.glow.destroy();
  }
}
