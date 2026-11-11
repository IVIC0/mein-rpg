import Phaser from 'phaser';
import { BODY_RADIUS, PLAYER_SPEED } from '../config';
import type { Grid, Point } from '../world/Grid';
import { moveToward } from '../world/movement';

/** Bild-Nummer des Ritters in assets/sprites/characters.png. */
const KNIGHT_FRAME = 96;

/** Das Sprite sitzt etwas über dem Standpunkt, damit die Füße auf der Kachel stehen. */
const SPRITE_OFFSET_Y = -3;

/**
 * Die Spielfigur. `pos` ist der genaue Punkt, an dem die Figur steht.
 * Gezeichnet wird sie auf ganze Bildschirm-Pixel gerundet (x/y des Containers),
 * sonst flimmert Pixel-Art beim Laufen.
 */
export class Player extends Phaser.GameObjects.Container {
  /** Genaue Position in Welt-Pixeln. */
  readonly pos: Phaser.Math.Vector2;

  /** Größe eines Bildschirm-Pixels in Welt-Pixeln (= 1 / Kamera-Zoom). */
  pixelStep = 1;

  private readonly sprite: Phaser.GameObjects.Sprite;
  private waypoints: Point[] = [];
  private walkTime = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    this.pos = new Phaser.Math.Vector2(x, y);
    const shadow = scene.add.image(0, 5, 'shadow').setAlpha(0.25);
    this.sprite = scene.add.sprite(0, SPRITE_OFFSET_Y, 'characters', KNIGHT_FRAME);
    this.add([shadow, this.sprite]);
    scene.add.existing(this);
  }

  /** Läuft die Figur gerade einen berechneten Weg ab? */
  get hasPath(): boolean {
    return this.waypoints.length > 0;
  }

  walkAlong(waypoints: Point[]): void {
    this.waypoints = waypoints;
  }

  stop(): void {
    this.waypoints = [];
  }

  /**
   * Direkte Steuerung für einen Frame: läuft ohne Wegfindung geradewegs auf
   * `target` zu und rutscht an Hindernissen entlang. Ein laufender Weg wird verworfen.
   */
  steerToward(target: Point, grid: Grid, deltaMs: number): void {
    this.waypoints = [];
    const next = moveToward(grid, this.pos, target, (PLAYER_SPEED * deltaMs) / 1000, BODY_RADIUS);
    const moved = Math.hypot(next.x - this.pos.x, next.y - this.pos.y) > 0.01;
    if (Math.abs(target.x - this.pos.x) > 2) this.sprite.setFlipX(target.x < this.pos.x);
    this.pos.set(next.x, next.y);
    this.animate(moved, deltaMs);
  }

  /** Einen Frame lang dem berechneten Weg folgen. `deltaMs` = Zeit seit dem letzten Frame. */
  step(deltaMs: number): void {
    let budget = (PLAYER_SPEED * deltaMs) / 1000; // so weit darf die Figur in diesem Frame laufen
    while (budget > 0 && this.waypoints.length > 0) {
      const target = this.waypoints[0];
      const dx = target.x - this.pos.x;
      const dy = target.y - this.pos.y;
      const distance = Math.hypot(dx, dy);
      if (Math.abs(dx) > 0.5) this.sprite.setFlipX(dx < 0);
      if (distance <= budget) {
        this.pos.set(target.x, target.y);
        this.waypoints.shift();
        budget -= distance;
      } else {
        this.pos.set(this.pos.x + (dx / distance) * budget, this.pos.y + (dy / distance) * budget);
        budget = 0;
      }
    }

    this.animate(this.hasPath, deltaMs);
  }

  private animate(walking: boolean, deltaMs: number): void {
    // Kleines Hüpfen beim Laufen – das Asset-Pack hat keine Lauf-Animation.
    let hop = 0;
    if (walking) {
      this.walkTime += deltaMs;
      hop = Math.abs(Math.sin(this.walkTime * 0.014)) * 1.5;
    } else {
      this.walkTime = 0;
    }
    this.sprite.y = SPRITE_OFFSET_Y - this.snap(hop);
    this.setPosition(this.snap(this.pos.x), this.snap(this.pos.y));
  }

  private snap(value: number): number {
    return Math.round(value / this.pixelStep) * this.pixelStep;
  }
}
