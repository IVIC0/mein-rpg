import type Phaser from 'phaser';
import { TILE } from '../config';
import { CHEST } from '../data/pois';
import { spriteDef } from '../data/sprites';
import type { Point } from '../world/Grid';
import type { Interactable } from '../world/Interactable';
import { SPRITE_OFFSET_Y } from './Actor';

/**
 * Eine Truhe: ein festes Bild, das man anklickt. Was herauskommt, würfelt die Spielwelt
 * (`onUse`, WorldScene.openChest) – hier steht nur, ob sie gerade gefüllt ist und wie sie aussieht.
 * Alle Werte: CHEST in src/data/pois.ts.
 */
export class Chest implements Interactable {
  readonly pos: Point;
  /** Die Figur stellt sich vor die Truhe (eine Kachel tiefer). Dort landet auch der Inhalt. */
  readonly standAt: Point;
  readonly range = CHEST.openRange;
  /** Zeitpunkt (Date.now()), ab dem die Truhe wieder gefüllt ist. 0 = sie ist gefüllt. */
  refillAt = 0;
  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly shadow: Phaser.GameObjects.Image;
  private shownFull = true;

  /** `key` = Schlüssel der Truhe im Spielstand (Zone und Name), `level` = Itemlevel des Inhalts. */
  constructor(
    scene: Phaser.Scene,
    readonly key: string,
    x: number,
    y: number,
    readonly level: number,
    private readonly onUse: (chest: Chest) => void,
  ) {
    this.pos = { x, y };
    this.standAt = { x, y: y + TILE };
    const depth = 10 + y / 10000;
    const look = spriteDef(CHEST.spriteClosed);
    this.shadow = scene.add.image(x, y + 5, 'shadow').setAlpha(0.25).setDepth(depth);
    this.sprite = scene.add.sprite(x, y + SPRITE_OFFSET_Y, look.sheet, look.idle[0]).setDepth(depth);
  }

  get full(): boolean {
    return Date.now() >= this.refillAt;
  }

  /** Einmal pro Frame: zeigt die Truhe offen (leer) oder geschlossen (gefüllt). */
  update(): void {
    if (this.full === this.shownFull) return;
    this.shownFull = this.full;
    const look = spriteDef(this.full ? CHEST.spriteClosed : CHEST.spriteOpen);
    this.sprite.setTexture(look.sheet, look.idle[0]);
  }

  contains(at: Point): boolean {
    return Math.abs(at.x - this.pos.x) <= 10 && Math.abs(at.y - (this.pos.y + SPRITE_OFFSET_Y)) <= 10;
  }

  use(): void {
    this.onUse(this);
  }

  destroy(): void {
    this.sprite.destroy();
    this.shadow.destroy();
  }
}
