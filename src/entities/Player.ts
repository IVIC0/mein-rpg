import Phaser from 'phaser';
import { BODY_RADIUS, COMBAT_TIMEOUT_MS, PLAYER_SPEED } from '../config';
import { WARRIOR, type SkillDef, type SkillId } from '../data/warrior';
import type { Grid, Point } from '../world/Grid';
import { moveToward } from '../world/movement';
import { Actor } from './Actor';

/** Bild-Nummer des Ritters in assets/sprites/characters.png. */
const KNIGHT_FRAME = 96;

/** Eine laufende Verstärkung durch einen Skill. */
export interface Buff {
  skillId: SkillId;
  name: string;
  remainingMs: number;
  attackBonus: number;
  damageTakenFactor: number;
  tint: number;
}

/** Die Spielfigur: Bewegung, Leben, Mana, Abklingzeiten und Buffs. */
export class Player extends Actor {
  mana = WARRIOR.maxMana;
  readonly maxMana = WARRIOR.maxMana;

  /** Zeit bis zum nächsten Auto-Angriff in Millisekunden. */
  attackCooldown = 0;
  /** Restliche Abklingzeit je Skill in Millisekunden. */
  readonly cooldowns = new Map<SkillId, number>();
  buffs: Buff[] = [];

  private sinceCombatMs = COMBAT_TIMEOUT_MS;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, KNIGHT_FRAME, WARRIOR.maxHp);
  }

  /** Im Kampf ist die Figur, solange der letzte Treffer (ausgeteilt oder kassiert) frisch ist. */
  get inCombat(): boolean {
    return this.sinceCombatMs < COMBAT_TIMEOUT_MS;
  }

  /** Angriffskraft inklusive laufender Buffs. */
  get attackPower(): number {
    return WARRIOR.attackPower * (1 + this.buffs.reduce((sum, buff) => sum + buff.attackBonus, 0));
  }

  /** Faktor auf erlittenen Schaden, 1 = voller Schaden. */
  get damageTakenFactor(): number {
    return this.buffs.reduce((factor, buff) => factor * buff.damageTakenFactor, 1);
  }

  enterCombat(): void {
    this.sinceCombatMs = 0;
  }

  takeDamage(amount: number): void {
    this.hp = Math.max(0, this.hp - amount);
    this.flashHit();
    this.enterCombat();
  }

  addBuff(skill: SkillDef): void {
    if (skill.effect.type !== 'buff') return;
    const { durationMs, attackBonus, damageTakenFactor, tint } = skill.effect;
    this.buffs = this.buffs.filter((buff) => buff.skillId !== skill.id);
    this.buffs.push({ skillId: skill.id, name: skill.name, remainingMs: durationMs, attackBonus, damageTakenFactor, tint });
    this.refreshTint();
  }

  /** Lässt Abklingzeiten und Buffs ablaufen und regeneriert Leben und Mana. */
  tick(deltaMs: number): void {
    this.attackCooldown = Math.max(0, this.attackCooldown - deltaMs);
    for (const [id, remaining] of this.cooldowns) this.cooldowns.set(id, Math.max(0, remaining - deltaMs));

    if (this.buffs.length > 0) {
      for (const buff of this.buffs) buff.remainingMs -= deltaMs;
      const active = this.buffs.filter((buff) => buff.remainingMs > 0);
      if (active.length !== this.buffs.length) {
        this.buffs = active;
        this.refreshTint();
      }
    }

    this.sinceCombatMs += deltaMs;
    const seconds = deltaMs / 1000;
    if (this.inCombat) {
      this.mana += WARRIOR.manaRegenCombat * seconds;
    } else {
      this.mana += WARRIOR.manaRegenIdle * seconds;
      this.hp += this.maxHp * WARRIOR.hpRegenIdle * seconds;
    }
    this.mana = Math.min(this.maxMana, this.mana);
    this.hp = Math.min(this.maxHp, this.hp);
  }

  /** Die Figur fällt um und bleibt liegen, bis revive() aufgerufen wird. */
  die(): void {
    this.hp = 0;
    this.stop();
    this.buffs = [];
    this.refreshTint();
    this.sprite.setAngle(90);
  }

  /** Stellt die Figur mit vollem Leben und Mana an den Punkt `at`. */
  revive(at: Point): void {
    this.pos.set(at.x, at.y);
    this.hp = this.maxHp;
    this.mana = this.maxMana;
    this.attackCooldown = 0;
    this.cooldowns.clear();
    this.sinceCombatMs = COMBAT_TIMEOUT_MS;
    this.sprite.setAngle(0);
  }

  /**
   * Direkte Steuerung für einen Frame: läuft ohne Wegfindung geradewegs auf
   * `target` zu und rutscht an Hindernissen entlang. Ein laufender Weg wird verworfen.
   */
  steerToward(target: Point, grid: Grid, deltaMs: number): void {
    this.stop();
    const next = moveToward(grid, this.pos, target, (PLAYER_SPEED * deltaMs) / 1000, BODY_RADIUS);
    const moved = Math.hypot(next.x - this.pos.x, next.y - this.pos.y) > 0.01;
    if (Math.abs(target.x - this.pos.x) > 2) this.face(target.x);
    this.pos.set(next.x, next.y);
    this.draw(moved, deltaMs);
  }

  /** Einen Frame lang dem berechneten Weg folgen. `deltaMs` = Zeit seit dem letzten Frame. */
  step(deltaMs: number): void {
    this.draw(this.followPath(PLAYER_SPEED, deltaMs), deltaMs);
  }

  private refreshTint(): void {
    // Bei mehreren Buffs gewinnt der zuletzt gestartete.
    this.setBaseTint(this.buffs.length > 0 ? this.buffs[this.buffs.length - 1].tint : null);
  }
}
