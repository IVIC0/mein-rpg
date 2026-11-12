import Phaser from 'phaser';
import { BODY_RADIUS, ENEMY_LUNGE, HIT_FLASH_MS, KNOCKBACK_DISTANCE, KNOCKBACK_MS, LUNGE_MS } from '../config';
import type { Grid, Point } from '../world/Grid';

/** Das Sprite sitzt etwas über dem Standpunkt, damit die Füße auf der Kachel stehen. */
export const SPRITE_OFFSET_Y = -3;

/** Figuren liegen über der Karte; wer weiter unten steht, wird weiter vorn gezeichnet. */
const BASE_DEPTH = 10;

/**
 * Gemeinsame Basis für Spielfigur und Gegner: Position, Leben, Weg ablaufen
 * und die kleinen Animationen (Hüpfen, Ausfallschritt, Aufblitzen und Rückstoß bei Treffern).
 *
 * `pos` ist der genaue Punkt, an dem die Figur steht. Gezeichnet wird sie auf
 * ganze Bildschirm-Pixel gerundet (x/y des Containers), sonst flimmert Pixel-Art.
 */
export abstract class Actor extends Phaser.GameObjects.Container {
  /** Größe eines Bildschirm-Pixels in Welt-Pixeln (= 1 / Kamera-Zoom), gilt für alle Figuren. */
  static pixelStep = 1;

  /** Genaue Position in Welt-Pixeln. */
  readonly pos: Phaser.Math.Vector2;
  hp: number;
  maxHp: number;

  protected readonly sprite: Phaser.GameObjects.Sprite;
  private readonly shadow: Phaser.GameObjects.Image;
  /** Größe des Bildes (1 = normal). Elite und Boss sind größer – siehe setBodyScale. */
  bodyScale = 1;
  /** Größer als 0 = die Figur wird vor allen anderen gezeichnet (z. B. während des Waffenschwungs). */
  protected depthBias = 0;
  private waypoints: Point[] = [];
  private walkTime = 0;
  /** Versatz des Sprites beim Zuschlagen. */
  private readonly lunge = { x: 0, y: 0 };
  /** Versatz des Sprites durch den Rückstoß nach einem Treffer. */
  private readonly recoil = { x: 0, y: 0 };
  private tint: number | null = null;
  private flashMs = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    frame: number,
    maxHp: number,
  ) {
    super(scene, x, y);
    this.pos = new Phaser.Math.Vector2(x, y);
    this.maxHp = maxHp;
    this.hp = maxHp;
    this.shadow = scene.add.image(0, 5, 'shadow').setAlpha(0.25);
    this.sprite = scene.add.sprite(0, SPRITE_OFFSET_Y, 'characters', frame);
    this.add([this.shadow, this.sprite]);
    scene.add.existing(this);
    this.draw(false, 0);
  }

  get alive(): boolean {
    return this.hp > 0;
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

  distanceTo(point: Point): number {
    return Math.hypot(point.x - this.pos.x, point.y - this.pos.y);
  }

  /** Dreht die Figur so, dass sie zur Welt-Koordinate `x` schaut. */
  face(x: number): void {
    if (Math.abs(x - this.pos.x) > 0.5) this.sprite.setFlipX(x < this.pos.x);
  }

  /** Ausfallschritt: kurzer Ruck um `reach` Welt-Pixel in Richtung `target` und zurück. */
  lungeAt(target: Point, reach = ENEMY_LUNGE): void {
    const distance = this.distanceTo(target);
    if (distance < 0.01) return;
    this.face(target.x);
    this.scene.tweens.killTweensOf(this.lunge);
    this.lunge.x = 0;
    this.lunge.y = 0;
    if (reach <= 0) return;
    this.scene.tweens.add({
      targets: this.lunge,
      x: ((target.x - this.pos.x) / distance) * reach,
      y: ((target.y - this.pos.y) / distance) * reach,
      duration: LUNGE_MS,
      ease: 'Quad.easeOut',
      yoyo: true,
    });
  }

  /** Macht das Bild größer oder kleiner. Die Füße bleiben dabei am Standpunkt. */
  protected setBodyScale(scale: number): void {
    this.bodyScale = scale;
    this.sprite.setScale(scale);
    this.shadow.setScale(scale);
  }

  /** Lässt die Figur kurz weiß aufblitzen (Treffer). */
  flashHit(): void {
    this.sprite.setTintFill(0xffffff);
    this.flashMs = HIT_FLASH_MS;
  }

  /**
   * Rückstoß: das Bild der Figur springt ein Stück von `source` weg und gleitet
   * zurück. Nur Optik – der Standpunkt `pos` ändert sich nicht.
   */
  recoilFrom(source: Point): void {
    const distance = this.distanceTo(source);
    if (distance < 0.01) return;
    this.scene.tweens.killTweensOf(this.recoil);
    this.recoil.x = ((this.pos.x - source.x) / distance) * KNOCKBACK_DISTANCE;
    this.recoil.y = ((this.pos.y - source.y) / distance) * KNOCKBACK_DISTANCE;
    this.scene.tweens.add({ targets: this.recoil, x: 0, y: 0, duration: KNOCKBACK_MS, ease: 'Quad.easeOut' });
  }

  /** Dauerhafte Einfärbung, z. B. solange ein Buff läuft. null = normale Farben. */
  protected setBaseTint(tint: number | null): void {
    this.tint = tint;
    if (this.flashMs <= 0) this.applyTint();
  }

  /** Schiebt die Figur ein Stück zur Seite, sofern dort Platz ist. */
  nudge(dx: number, dy: number, grid: Grid): void {
    if (grid.isBoxFree(this.pos.x + dx, this.pos.y + dy, BODY_RADIUS)) this.pos.set(this.pos.x + dx, this.pos.y + dy);
  }

  /**
   * Läuft einen Frame lang mit `speed` (Welt-Pixel pro Sekunde) den Weg entlang.
   * Gibt zurück, ob die Figur danach noch unterwegs ist.
   */
  protected followPath(speed: number, deltaMs: number): boolean {
    let budget = (speed * deltaMs) / 1000; // so weit darf die Figur in diesem Frame laufen
    while (budget > 0 && this.waypoints.length > 0) {
      const target = this.waypoints[0];
      const dx = target.x - this.pos.x;
      const dy = target.y - this.pos.y;
      const distance = Math.hypot(dx, dy);
      this.face(target.x);
      if (distance <= budget) {
        this.pos.set(target.x, target.y);
        this.waypoints.shift();
        budget -= distance;
      } else {
        this.pos.set(this.pos.x + (dx / distance) * budget, this.pos.y + (dy / distance) * budget);
        budget = 0;
      }
    }
    return this.hasPath;
  }

  /** Bringt die Darstellung auf den Stand von `pos`. Einmal pro Frame aufrufen. */
  protected draw(walking: boolean, deltaMs: number): void {
    // Kleines Hüpfen beim Laufen – das Asset-Pack hat keine Lauf-Animation.
    let hop = 0;
    if (walking) {
      this.walkTime += deltaMs;
      hop = Math.abs(Math.sin(this.walkTime * 0.014)) * 1.5;
    } else {
      this.walkTime = 0;
    }
    if (this.flashMs > 0) {
      this.flashMs -= deltaMs;
      if (this.flashMs <= 0) this.applyTint();
    }
    // Das Bild ist 16 Pixel hoch; bei größeren Figuren rückt es nach oben, damit die Füße unten bleiben.
    const baseY = SPRITE_OFFSET_Y - 8 * (this.bodyScale - 1);
    this.sprite.setPosition(snap(this.lunge.x + this.recoil.x), baseY - snap(hop) + snap(this.lunge.y + this.recoil.y));
    this.setPosition(snap(this.pos.x), snap(this.pos.y));
    this.setDepth(BASE_DEPTH + this.depthBias + this.pos.y / 10000);
  }

  private applyTint(): void {
    if (this.tint === null) this.sprite.clearTint();
    else this.sprite.setTint(this.tint);
  }
}

function snap(value: number): number {
  return Math.round(value / Actor.pixelStep) * Actor.pixelStep;
}
