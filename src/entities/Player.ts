import Phaser from 'phaser';
import { BODY_RADIUS, COMBAT_TIMEOUT_MS, PLAYER_SPEED, SWING, SWING_HOLD_MS, SWING_RADIUS, SWING_TRAIL_WIDTH, SWING_WEAPON_FRAME } from '../config';
import { MAX_LEVEL, xpToNext } from '../data/progression';
import { REGEN, type RegenState } from '../data/regen';
import { emptyStats, withAttributesApplied, type Stats } from '../data/stats';
import { SKILLS, WARRIOR, warriorStat, type SkillDef, type SkillId } from '../data/warrior';
import type { Town } from '../town/Town';
import type { Grid, Point } from '../world/Grid';
import { moveToward } from '../world/movement';
import { Actor, SPRITE_OFFSET_Y } from './Actor';

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

/** Die Spielfigur: Bewegung, Leben, Stufe und EP, Werte aus der Ausrüstung, Abklingzeiten und Buffs. */
export class Player extends Actor {
  level = 1;
  /** Gesammelte EP innerhalb der aktuellen Stufe. */
  xp = 0;

  /** Heiltränke im Gepäck (Taste Q, Werte in src/data/shop.ts) und die Zeit, bis der nächste wirkt. */
  potions = 0;
  potionCooldown = 0;
  /** Steht die Figur gerade im Dorf? (setzt WorldScene jeden Frame – dort heilt das Gasthaus schneller) */
  inTown = false;

  /** Zeit bis zum nächsten Auto-Angriff in Millisekunden. */
  attackCooldown = 0;
  /** Restliche Abklingzeit je Skill in Millisekunden. */
  readonly cooldowns = new Map<SkillId, number>();
  buffs: Buff[] = [];
  /** Schläge seit dem letzten Auslösen, je Skill mit der Bedingung "jeder n-te Schlag". */
  private readonly hitCounts = new Map<SkillId, number>();

  /** Werte der angelegten Ausrüstung, so wie sie auf den Items stehen (mit Attributen). */
  private gear: Stats = emptyStats();
  /** Dieselben Werte, aber die Attribute sind schon in Angriffskraft, Leben und Krit-Chance umgerechnet. */
  private bonus: Stats = emptyStats();
  /** Leben und Angriffskraft aus den Sammelseiten des Jagdbuchs (0.01 = +1 %), siehe setBestiaryBonus. */
  private bestiaryBonus = { maxHp: 0, attackPower: 0 };

  private sinceCombatMs = COMBAT_TIMEOUT_MS;
  /** Zeit, seit zuletzt ein Gegner die Figur verfolgt hat – solange gibt es keine Regeneration. */
  private sinceHuntedMs = REGEN.delayMs;
  /** So lange steht die Figur schon still (fürs Rasten). */
  private stillMs = 0;
  /** Die Waffe ist nur während eines Schwungs zu sehen, die Spur ist der helle Bogen dahinter. */
  private readonly weapon: Phaser.GameObjects.Sprite;
  private readonly swingTrail: Phaser.GameObjects.Graphics;
  private readonly swing = { progress: 0 };

  /** `town` = der Dorfausbau: Er verbessert Heiltrank und Erholung (src/data/town.ts). */
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly town: Town,
  ) {
    super(scene, x, y, 'ritter', WARRIOR.maxHp);
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

  /** Angriffskraft aus Stufe, Ausrüstung und Jagdbuch, inklusive laufender Buffs. */
  get attackPower(): number {
    const base = (warriorStat('attackPower', this.level) + this.bonus.attackPower) * (1 + this.bestiaryBonus.attackPower);
    return base * (1 + this.buffs.reduce((sum, buff) => sum + buff.attackBonus, 0));
  }

  get armor(): number {
    return warriorStat('armor', this.level) + this.bonus.armor;
  }

  /** Chance auf einen kritischen Treffer, 0.05 = 5 %. */
  get critChance(): number {
    return WARRIOR.critChance + this.bonus.critChance / 100;
  }

  /** Ein kritischer Treffer macht so viel mal Schaden. */
  get critMultiplier(): number {
    return WARRIOR.critMultiplier + this.bonus.critDamage / 100;
  }

  /** Zeit zwischen zwei Auto-Angriffen in Millisekunden; Angriffstempo verkürzt sie. */
  get attackIntervalMs(): number {
    return WARRIOR.attackIntervalMs / (1 + this.bonus.attackSpeed / 100);
  }

  /** Anteil des ausgeteilten Schadens, der die Figur heilt (0.03 = 3 %). */
  get lifeSteal(): number {
    return this.bonus.lifeSteal / 100;
  }

  /** Leben pro Sekunde aus der Ausrüstung – wirkt auch im Kampf. */
  get hpRegen(): number {
    return this.bonus.hpRegen;
  }

  /**
   * Passive Regeneration (Werte in src/data/regen.ts): im Kampf und kurz danach keine,
   * dann langsam im Laufen und schneller beim Rasten. Im Dorf geht es mit Gasthaus am schnellsten.
   */
  get regenState(): RegenState {
    if (!this.alive || Math.min(this.sinceCombatMs, this.sinceHuntedMs) < REGEN.delayMs) return 'none';
    if (this.inTown && this.town.effects.townFullSeconds !== null) return 'town';
    return this.stillMs >= REGEN.restAfterMs ? 'resting' : 'walking';
  }

  /** So viele Sekunden dauert die passive Regeneration gerade von 0 auf volles Leben; 0 = es gibt keine. */
  private get regenFullSeconds(): number {
    const effects = this.town.effects;
    switch (this.regenState) {
      case 'town':
        return effects.townFullSeconds ?? 0;
      case 'resting':
        return effects.restingFullSeconds;
      case 'walking':
        return REGEN.walkingFullSeconds;
      case 'none':
        return 0;
    }
  }

  /** Ein Heiltrank heilt diesen Anteil des maximalen Lebens (die Alchemistin verbessert ihn). */
  get potionHealFraction(): number {
    return this.town.effects.potionHealFraction;
  }

  /** Abklingzeit des Heiltranks in Millisekunden. */
  get potionCooldownMs(): number {
    return this.town.effects.potionCooldownMs;
  }

  /** Mit so viel Leben wacht die Figur nach dem Tod auf (REGEN.reviveHpFraction). */
  get reviveHp(): number {
    return Math.max(1, Math.round(this.maxHp * REGEN.reviveHpFraction));
  }

  /** Stärke, Ausdauer und Geschick aus der Ausrüstung (für das Charakterfenster). */
  get gearStats(): Stats {
    return this.gear;
  }

  /**
   * Übernimmt die Werte der angelegten Ausrüstung. `weaponFrame` = Bild der Waffe
   * für den Schwung; null = die Figur hat keine angelegt und nimmt ihr altes Schwert.
   */
  setGear(stats: Stats, weaponFrame: number | null): void {
    this.gear = stats;
    this.bonus = withAttributesApplied(stats);
    this.weapon.setFrame(weaponFrame ?? SWING_WEAPON_FRAME);
    this.refreshMaxHp();
  }

  /** Übernimmt die Boni der Sammelseiten des Jagdbuchs (src/data/bestiary.ts): Anteile, 0.01 = +1 %. */
  setBestiaryBonus(bonus: { maxHp: number; attackPower: number }): void {
    this.bestiaryBonus = { ...bonus };
    this.refreshMaxHp();
  }

  heal(amount: number): void {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  /**
   * Trinkt einen Heiltrank. Gibt zurück, wie viel Leben er gebracht hat –
   * 0 heißt: ging nicht (keiner da, Abklingzeit läuft, Leben voll oder am Boden).
   */
  drinkPotion(): number {
    if (!this.alive || this.potions <= 0 || this.potionCooldown > 0 || this.hp >= this.maxHp) return 0;
    const before = this.hp;
    this.heal(this.maxHp * this.potionHealFraction);
    this.potions--;
    this.potionCooldown = this.potionCooldownMs;
    return this.hp - before;
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
   * bei einem Aufstieg ist das Leben wieder voll.
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
    if (levelUps > 0) {
      this.refreshMaxHp();
      this.hp = this.maxHp;
    }
    return levelUps;
  }

  /** Zieht `fraction` der EP ab, die die aktuelle Stufe braucht – nie unter 0. Gibt den Verlust zurück. */
  loseXp(fraction: number): number {
    const loss = Math.min(this.xp, Math.round(this.xpToNext * fraction));
    this.xp -= loss;
    return loss;
  }

  /**
   * Stellt die Figur aus einem Spielstand wieder her. `hp` = null heißt volles Leben.
   * Vorher die Ausrüstung setzen (setGear), damit das maximale Leben schon stimmt.
   */
  restore(level: number, xp: number, hp: number | null): void {
    this.setLevel(level);
    this.xp = this.level >= MAX_LEVEL ? 0 : Math.min(xp, Math.max(0, this.xpToNext - 1));
    if (hp !== null) this.hp = Phaser.Math.Clamp(hp, 1, this.maxHp);
  }

  /** Setzt die Figur direkt auf eine Stufe (zum Testen, siehe ?stufe= in WorldScene). */
  setLevel(level: number): void {
    this.level = Phaser.Math.Clamp(Math.floor(level), 1, MAX_LEVEL);
    this.xp = 0;
    this.refreshMaxHp();
    this.hp = this.maxHp;
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

  /** So viele Schläge hat die Figur gemacht, seit dieser Skill zuletzt ausgelöst hat. */
  hitsSince(id: SkillId): number {
    return this.hitCounts.get(id) ?? 0;
  }

  /**
   * Zählt einen Schlag für alle Skills mit der Bedingung "jeder n-te Schlag".
   * `fired` = der Skill, zu dem dieser Schlag wurde: sein Zähler beginnt wieder bei 0.
   * Kann ein Skill gerade nicht auslösen (z. B. noch gesperrt), bleibt sein Zähler bei n - 1 stehen.
   */
  countHit(fired?: SkillId): void {
    for (const skill of SKILLS) {
      if (skill.trigger.type !== 'everyNthHit') continue;
      this.hitCounts.set(skill.id, skill.id === fired ? 0 : Math.min(skill.trigger.n - 1, this.hitsSince(skill.id) + 1));
    }
  }

  hasBuff(id: SkillId): boolean {
    return this.buffs.some((buff) => buff.skillId === id);
  }

  addBuff(skill: SkillDef): void {
    if (skill.effect.type !== 'buff') return;
    const { durationMs, attackBonus, damageTakenFactor, tint } = skill.effect;
    this.buffs = this.buffs.filter((buff) => buff.skillId !== skill.id);
    this.buffs.push({ skillId: skill.id, name: skill.name, remainingMs: durationMs, attackBonus, damageTakenFactor, tint });
    this.refreshTint();
  }

  /**
   * Lässt Abklingzeiten und Buffs ablaufen und regeneriert Leben.
   * `hunted` = gerade verfolgt ein Gegner die Figur (dann gibt es keine passive Regeneration).
   */
  tick(deltaMs: number, hunted: boolean): void {
    this.attackCooldown = Math.max(0, this.attackCooldown - deltaMs);
    this.potionCooldown = Math.max(0, this.potionCooldown - deltaMs);
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
    this.sinceHuntedMs = hunted ? 0 : this.sinceHuntedMs + deltaMs;
    // Leben pro Sekunde: die Ausrüstung wirkt immer, die passive Regeneration nur in Ruhe.
    let regen = this.hpRegen;
    const fullSeconds = this.regenFullSeconds;
    if (fullSeconds > 0) regen += this.maxHp / fullSeconds;
    this.heal((regen * deltaMs) / 1000);
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

  /** Stellt die Figur an den Punkt `at` – mit einem Teil ihres Lebens (REGEN.reviveHpFraction, Start: die Hälfte). */
  revive(at: Point): void {
    this.pos.set(at.x, at.y);
    this.hp = this.reviveHp;
    this.attackCooldown = 0;
    this.cooldowns.clear();
    this.hitCounts.clear();
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
    this.trackStill(moved, deltaMs);
    this.draw(moved, deltaMs);
  }

  /** Einen Frame lang dem berechneten Weg folgen. `deltaMs` = Zeit seit dem letzten Frame. */
  step(deltaMs: number): void {
    const walking = this.followPath(PLAYER_SPEED, deltaMs);
    this.trackStill(walking, deltaMs);
    this.draw(walking, deltaMs);
  }

  /** Merkt sich, wie lange die Figur schon still steht – daran hängt das Rasten. */
  private trackStill(moving: boolean, deltaMs: number): void {
    this.stillMs = moving ? 0 : this.stillMs + deltaMs;
  }

  /** Maximales Leben aus Stufe, Ausrüstung und Jagdbuch. Das aktuelle Leben bleibt, höchstens bis zum neuen Maximum. */
  private refreshMaxHp(): void {
    this.maxHp = Math.round((warriorStat('maxHp', this.level) + this.bonus.maxHp) * (1 + this.bestiaryBonus.maxHp));
    if (this.alive) this.hp = Math.min(this.hp, this.maxHp);
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
