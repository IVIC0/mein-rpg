import Phaser from 'phaser';
import { BODY_RADIUS, COMBAT_TIMEOUT_MS, PLAYER_SPEED, SWING, SWING_HOLD_MS, SWING_RADIUS, SWING_TRAIL_WIDTH, SWING_WEAPON_FRAME } from '../config';
import { MAX_LEVEL, xpToNext } from '../data/progression';
import { WARRIOR, warriorStat, type SkillDef, type SkillId } from '../data/warrior';
import type { Grid, Point } from '../world/Grid';
import { moveToward } from '../world/movement';
import { Actor, SPRITE_OFFSET_Y } from './Actor';

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

/** Welche Art Schlag gezeigt wird – die Werte dazu stehen in SWING (config.ts). */
export type SwingKind = keyof typeof SWING;

/** Die Spielfigur: Bewegung, Leben, Mana, Stufe und EP, Abklingzeiten und Buffs. */
export class Player extends Actor {
  level = 1;
  /** Gesammelte EP innerhalb der aktuellen Stufe. */
  xp = 0;
  mana = WARRIOR.maxMana;
  maxMana = WARRIOR.maxMana;

  /** Zeit bis zum nächsten Auto-Angriff in Millisekunden. */
  attackCooldown = 0;
  /** Restliche Abklingzeit je Skill in Millisekunden. */
  readonly cooldowns = new Map<SkillId, number>();
  buffs: Buff[] = [];

  private sinceCombatMs = COMBAT_TIMEOUT_MS;
  /** Die Waffe ist nur während eines Schwungs zu sehen, die Spur ist der helle Bogen dahinter. */
  private readonly weapon: Phaser.GameObjects.Sprite;
  private readonly swingTrail: Phaser.GameObjects.Graphics;
  private readonly swing = { progress: 0 };

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, KNIGHT_FRAME, WARRIOR.maxHp);
    this.swingTrail = scene.add.graphics().setVisible(false);
    // Drehpunkt knapp unter dem Griff: so kreist die Klinge um die Figur.
    this.weapon = scene.add.sprite(0, SPRITE_OFFSET_Y, 'characters', SWING_WEAPON_FRAME).setOrigin(0.5, 1.15).setVisible(false);
    this.add([this.swingTrail, this.weapon]);
  }

  /** EP, die diese Stufe bis zum Aufstieg braucht; auf der Maximalstufe 0. */
  get xpToNext(): number {
    return xpToNext(this.level);
  }

  /** Im Kampf ist die Figur, solange der letzte Treffer (ausgeteilt oder kassiert) frisch ist. */
  get inCombat(): boolean {
    return this.sinceCombatMs < COMBAT_TIMEOUT_MS;
  }

  /** Angriffskraft inklusive laufender Buffs. */
  get attackPower(): number {
    return warriorStat('attackPower', this.level) * (1 + this.buffs.reduce((sum, buff) => sum + buff.attackBonus, 0));
  }

  get armor(): number {
    return warriorStat('armor', this.level);
  }

  /** Faktor auf erlittenen Schaden, 1 = voller Schaden. */
  get damageTakenFactor(): number {
    return this.buffs.reduce((factor, buff) => factor * buff.damageTakenFactor, 1);
  }

  enterCombat(): void {
    this.sinceCombatMs = 0;
  }

  /**
   * Schreibt EP gut. Gibt zurück, um wie viele Stufen die Figur dabei aufgestiegen ist;
   * bei einem Aufstieg sind Leben und Mana wieder voll.
   */
  gainXp(amount: number): number {
    if (this.level >= MAX_LEVEL) return 0;
    this.xp += amount;
    let levelUps = 0;
    while (this.level < MAX_LEVEL && this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.level++;
      levelUps++;
    }
    if (this.level >= MAX_LEVEL) this.xp = 0;
    if (levelUps > 0) this.applyLevelStats();
    return levelUps;
  }

  /** Zieht `fraction` der EP ab, die die aktuelle Stufe braucht – nie unter 0. Gibt den Verlust zurück. */
  loseXp(fraction: number): number {
    const loss = Math.min(this.xp, Math.round(this.xpToNext * fraction));
    this.xp -= loss;
    return loss;
  }

  /** Setzt die Figur direkt auf eine Stufe (zum Testen, siehe ?stufe= in WorldScene). */
  setLevel(level: number): void {
    this.level = Phaser.Math.Clamp(Math.floor(level), 1, MAX_LEVEL);
    this.xp = 0;
    this.applyLevelStats();
  }

  /**
   * Angriffs-Animation: Ausfallschritt Richtung `target` und ein sichtbarer
   * Waffenschwung im Bogen um diese Richtung.
   */
  swingAt(target: Point, kind: SwingKind): void {
    const { arcDeg, ms, lunge } = SWING[kind];
    this.lungeAt(target, lunge);
    const arc = Phaser.Math.DegToRad(arcDeg);
    const from = Math.atan2(target.y - this.pos.y, target.x - this.pos.x) - arc / 2;

    this.scene.tweens.killTweensOf(this.swing);
    this.swing.progress = 0;
    this.weapon.setVisible(true);
    this.swingTrail.setVisible(true);
    this.depthBias = 1; // sonst verdeckt der Gegner die Waffe
    this.scene.tweens.add({
      targets: this.swing,
      progress: 1,
      duration: ms,
      ease: 'Quad.easeOut',
      onUpdate: () => {
        const angle = from + arc * this.swing.progress;
        // Das Waffenbild zeigt nach oben, daher eine Vierteldrehung dazu.
        this.weapon.setRotation(angle + Math.PI / 2);
        this.swingTrail
          .clear()
          .lineStyle(SWING_TRAIL_WIDTH, 0xffffff, 0.95 - 0.45 * this.swing.progress)
          .beginPath()
          .arc(0, SPRITE_OFFSET_Y, SWING_RADIUS, from, angle)
          .strokePath();
      },
      // Die Waffe bleibt am Ende des Bogens noch einen Moment stehen.
      completeDelay: SWING_HOLD_MS,
      onComplete: () => this.hideSwing(),
    });
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
    this.scene.tweens.killTweensOf(this.swing);
    this.hideSwing();
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

  /** Leben und Mana passend zur Stufe, beides aufgefüllt. */
  private applyLevelStats(): void {
    this.maxHp = warriorStat('maxHp', this.level);
    this.maxMana = warriorStat('maxMana', this.level);
    this.hp = this.maxHp;
    this.mana = this.maxMana;
  }

  private hideSwing(): void {
    this.weapon.setVisible(false);
    this.swingTrail.clear().setVisible(false);
    this.depthBias = 0;
  }

  private refreshTint(): void {
    // Bei mehreren Buffs gewinnt der zuletzt gestartete.
    this.setBaseTint(this.buffs.length > 0 ? this.buffs[this.buffs.length - 1].tint : null);
  }
}
