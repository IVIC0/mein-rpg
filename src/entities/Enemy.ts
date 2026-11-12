import Phaser from 'phaser';
import { BODY_RADIUS, ENEMY_FIRST_STRIKE_MS, ENEMY_RESPAWN_MS, MELEE_APPROACH, MELEE_RANGE } from '../config';
import { enemyStats, type EnemyDef } from '../data/enemies';
import type { EnemyRank } from '../data/loot';
import type { Grid, Point } from '../world/Grid';
import { findRoute, findWaypoints } from '../world/pathfinding';
import { Actor } from './Actor';

/**
 * idle   = steht an seinem Platz und schlendert ab und zu ein paar Schritte
 * chase  = verfolgt die Spielfigur und greift an
 * return = läuft zurück zu seinem Platz (Leash); in dieser Zeit nicht angreifbar
 * dead   = besiegt, wartet auf den Respawn
 */
export type EnemyState = 'idle' | 'chase' | 'return' | 'dead';

/** Verfolger berechnen ihren Weg so oft neu (Millisekunden). */
const REPATH_MS = 300;

/** Im Leerlauf entfernt sich ein Gegner höchstens so weit (Welt-Pixel) von seinem Platz. */
const WANDER_RADIUS = 36;

export class Enemy extends Actor {
  state: EnemyState = 'idle';
  /** Der Platz, an dem der Gegner steht und wieder erscheint. */
  readonly home: Point;
  /** Angriff und Rüstung auf der Stufe dieses Gegners. */
  readonly attackPower: number;
  readonly armor: number;
  /** Rang: bestimmt die Drop-Tabelle (src/data/loot.ts). Bis es Elites gibt (Meilenstein 6), sind alle normal. */
  readonly rank: EnemyRank = 'normal';

  private attackCooldown = 0;
  private repathIn = 0;
  private wanderIn = randomBetween(1000, 6000);
  private respawnIn = 0;

  constructor(
    scene: Phaser.Scene,
    readonly def: EnemyDef,
    readonly level: number,
    x: number,
    y: number,
  ) {
    const stats = enemyStats(def, level);
    super(scene, x, y, def.frame, stats.maxHp);
    this.attackPower = stats.attackPower;
    this.armor = stats.armor;
    this.home = { x, y };
    // Name, Stufe und Lebensbalken über dem Kopf zeichnet src/ui/Nameplates.ts.
  }

  /** Kann die Spielfigur diesen Gegner gerade anwählen und treffen? */
  get targetable(): boolean {
    return this.state === 'idle' || this.state === 'chase';
  }

  /** Zieht Leben ab. Wer dabei noch friedlich herumstand, geht zum Angriff über. */
  takeDamage(amount: number): void {
    if (!this.targetable) return;
    this.hp = Math.max(0, this.hp - amount);
    this.flashHit();
    if (this.hp <= 0) {
      this.die();
      return;
    }
    if (this.state === 'idle') this.startChase();
  }

  /**
   * Ein Frame Gegner-Verhalten. `strike` wird aufgerufen, wenn der Gegner zuschlägt –
   * den Schaden rechnet der Aufrufer aus.
   */
  update(deltaMs: number, grid: Grid, player: Actor, strike: (enemy: Enemy) => void): void {
    let walking = false;
    switch (this.state) {
      case 'dead':
        this.respawnIn -= deltaMs;
        if (this.respawnIn <= 0) this.respawn();
        return;

      case 'idle':
        if (player.alive && this.sees(player, grid)) {
          this.startChase();
        } else {
          this.wander(deltaMs, grid);
          walking = this.followPath(this.def.speed * 0.4, deltaMs);
        }
        break;

      case 'chase': {
        if (!player.alive || this.distanceTo(this.home) > this.def.leashRadius) {
          this.startReturn(grid);
          break;
        }
        const distance = this.distanceTo(player.pos);
        this.attackCooldown -= deltaMs;
        if (distance <= MELEE_APPROACH) {
          this.stop();
        } else {
          this.repathIn -= deltaMs;
          if (this.repathIn <= 0) {
            this.repathIn = REPATH_MS;
            const route = findRoute(grid, this.pos, player.pos);
            if (route) this.walkAlong(route);
          }
        }
        if (distance <= MELEE_RANGE) {
          this.face(player.pos.x);
          if (this.attackCooldown <= 0) {
            this.attackCooldown = this.def.attackIntervalMs;
            this.lungeAt(player.pos);
            strike(this);
          }
        }
        walking = this.followPath(this.def.speed, deltaMs);
        break;
      }

      case 'return':
        walking = this.followPath(this.def.speed * 1.5, deltaMs);
        if (!walking) this.state = 'idle';
        break;
    }
    this.draw(walking, deltaMs);
  }

  /** Sieht der Gegner die Figur? Nah genug und kein Hindernis dazwischen. */
  private sees(player: Actor, grid: Grid): boolean {
    return this.distanceTo(player.pos) <= this.def.aggroRadius && grid.hasClearLine(this.pos, player.pos, 0);
  }

  private startChase(): void {
    this.state = 'chase';
    this.repathIn = 0;
    this.attackCooldown = ENEMY_FIRST_STRIKE_MS; // kurze Schrecksekunde vor dem ersten Schlag
  }

  /** Bricht die Verfolgung ab: zurück zum Platz, dabei wieder volles Leben. */
  private startReturn(grid: Grid): void {
    this.state = 'return';
    this.hp = this.maxHp;
    const route = findWaypoints(grid, this.pos, this.home);
    if (route && route.length > 0) {
      this.walkAlong(route);
    } else {
      this.stop();
      this.pos.set(this.home.x, this.home.y);
    }
  }

  /** Ab und zu ein paar Schritte um den eigenen Platz herum. */
  private wander(deltaMs: number, grid: Grid): void {
    this.wanderIn -= deltaMs;
    if (this.wanderIn > 0 || this.hasPath) return;
    this.wanderIn = randomBetween(3000, 8000);
    const target = {
      x: this.home.x + randomBetween(-WANDER_RADIUS, WANDER_RADIUS),
      y: this.home.y + randomBetween(-WANDER_RADIUS, WANDER_RADIUS),
    };
    // Nur gerade Strecken: sonst liefe der Gegner womöglich einen langen Umweg um den Wald.
    if (grid.hasClearLine(this.pos, target, BODY_RADIUS)) this.walkAlong([target]);
  }

  private die(): void {
    this.state = 'dead';
    this.respawnIn = ENEMY_RESPAWN_MS;
    this.stop();
    this.scene.tweens.add({ targets: this, alpha: 0, duration: 350, onComplete: () => this.setVisible(false) });
  }

  private respawn(): void {
    this.state = 'idle';
    this.hp = this.maxHp;
    this.pos.set(this.home.x, this.home.y);
    this.wanderIn = randomBetween(2000, 6000);
    this.draw(false, 1000); // 1000 ms: setzt auch ein hängengebliebenes Aufblitzen zurück
    this.scene.tweens.killTweensOf(this);
    this.setVisible(true).setAlpha(0);
    this.scene.tweens.add({ targets: this, alpha: 1, duration: 500 });
  }

}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}
