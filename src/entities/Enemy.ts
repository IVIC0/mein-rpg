import Phaser from 'phaser';
import { BODY_RADIUS, BOSS_RESPAWN_MS, ENEMY_FIRST_STRIKE_MS, ENEMY_RESPAWN_MS, MELEE_APPROACH, MELEE_RANGE } from '../config';
import { ELITE_CHANCE, RANKS, TRAIT_VALUES, rollTraits, type TraitId } from '../data/elites';
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
  /** Chance auf eine Elite beim Erscheinen. Zum Testen stellt ?elite=1 sie auf 100 % (WorldScene). */
  static eliteChance = ELITE_CHANCE;

  /**
   * Rang und Eigenschaften werden bei jedem Erscheinen neu gewürfelt (siehe rollRank),
   * ebenso die Werte darunter. Der Rang bestimmt auch die Drop-Tabelle (src/data/loot.ts).
   */
  rank: EnemyRank = 'normal';
  traits: TraitId[] = [];
  armor = 0;
  /** Angriff ohne den Bonus von "Rasend". */
  baseAttackPower = 0;
  /** Zählt jedes Erscheinen mit – daran merken die Namensschilder, dass sich der Rang geändert haben kann. */
  spawnCount = 0;

  private speed = 0;
  private attackIntervalMs = 0;
  private aura: Phaser.GameObjects.Ellipse | null = null;
  private enragedShown = false;

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
    super(scene, x, y, def.frame, 1);
    this.home = { x, y };
    this.rollRank();
    // Name, Stufe und Lebensbalken über dem Kopf zeichnet src/ui/Nameplates.ts.
  }

  hasTrait(id: TraitId): boolean {
    return this.traits.includes(id);
  }

  /** "Rasend": unter der Lebens-Schwelle schlägt die Elite härter zu. */
  get enraged(): boolean {
    return this.hasTrait('rasend') && this.alive && this.hp < this.maxHp * TRAIT_VALUES.rasend.hpFraction;
  }

  /** Aktueller Angriff – mit Bonus, wenn die Elite gerade rast. */
  get attackPower(): number {
    return this.baseAttackPower * (this.enraged ? 1 + TRAIT_VALUES.rasend.attackBonus : 1);
  }

  heal(amount: number): void {
    if (this.alive) this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  /**
   * Würfelt Rang und Eigenschaften und rechnet daraus die Werte aus:
   * Grundwerte des Typs auf seiner Stufe × Rang (RANKS) + Eigenschaften (TRAIT_VALUES).
   */
  private rollRank(): void {
    const def = this.def;
    this.rank = def.rank ?? (Math.random() < Enemy.eliteChance ? 'elite' : 'normal');
    this.traits = this.rank === 'elite' ? rollTraits() : [];

    const rank = RANKS[this.rank];
    const stats = enemyStats(def, this.level);
    this.maxHp = Math.round(stats.maxHp * rank.hpFactor);
    this.hp = this.maxHp;
    this.baseAttackPower = stats.attackPower * rank.attackFactor;
    this.armor = stats.armor + rank.armorBonus;
    if (this.hasTrait('gepanzert')) this.armor += TRAIT_VALUES.gepanzert.base + TRAIT_VALUES.gepanzert.perLevel * this.level;
    const fast = this.hasTrait('schnell');
    this.speed = def.speed * (fast ? TRAIT_VALUES.schnell.speedFactor : 1);
    this.attackIntervalMs = def.attackIntervalMs * (fast ? TRAIT_VALUES.schnell.attackIntervalFactor : 1);

    // Aussehen: Elite und Boss sind größer und stehen in einem pulsierenden Schein.
    this.setBodyScale(rank.scale);
    if (this.aura) {
      this.scene.tweens.killTweensOf(this.aura);
      this.aura.destroy();
      this.aura = null;
    }
    if (rank.auraColor !== null) {
      this.aura = this.scene.add.ellipse(0, 5, 20 * rank.scale, 9 * rank.scale, rank.auraColor, 0.7);
      this.addAt(this.aura, 0); // ganz nach unten, unter Schatten und Bild
      this.scene.tweens.add({ targets: this.aura, alpha: 0.25, duration: 800, yoyo: true, repeat: -1 });
    }
    this.spawnCount++;
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
    if (this.state === 'idle' || this.state === 'chase') {
      if (this.hasTrait('regenerierend')) this.heal((this.maxHp * TRAIT_VALUES.regenerierend.hpPerSecond * deltaMs) / 1000);
      // Rasende Elites färben sich rot, solange sie unter der Schwelle sind.
      if (this.enraged !== this.enragedShown) {
        this.enragedShown = this.enraged;
        this.setBaseTint(this.enraged ? TRAIT_VALUES.rasend.tint : null);
      }
    }
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
          walking = this.followPath(this.speed * 0.4, deltaMs);
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
            this.attackCooldown = this.attackIntervalMs;
            this.lungeAt(player.pos);
            strike(this);
          }
        }
        walking = this.followPath(this.speed, deltaMs);
        break;
      }

      case 'return':
        walking = this.followPath(this.speed * 1.5, deltaMs);
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
    this.respawnIn = this.rank === 'boss' ? BOSS_RESPAWN_MS : ENEMY_RESPAWN_MS;
    this.stop();
    this.scene.tweens.add({ targets: this, alpha: 0, duration: 350, onComplete: () => this.setVisible(false) });
  }

  private respawn(): void {
    this.state = 'idle';
    this.rollRank(); // neu würfeln: mit kleiner Chance steht jetzt eine Elite hier
    this.enragedShown = false;
    this.setBaseTint(null);
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
