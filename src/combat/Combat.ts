import Phaser from 'phaser';
import { MELEE_APPROACH, MELEE_RANGE, PLAYER_RESPAWN_MS } from '../config';
import { DEATH_XP_LOSS, xpForKill } from '../data/progression';
import { SKILLS, WARRIOR, type SkillId } from '../data/warrior';
import type { Enemy } from '../entities/Enemy';
import type { Player } from '../entities/Player';
import type { FloatingText } from '../ui/FloatingText';
import type { Hud } from '../ui/Hud';
import type { Grid, Point } from '../world/Grid';
import { findRoute } from '../world/pathfinding';
import { rollHit } from './damage';

/** Beim Verfolgen des Ziels berechnet die Spielfigur ihren Weg so oft neu (Millisekunden). */
const REPATH_MS = 250;

/** Näher als so (Welt-Pixel) rücken sich Gegner beim Angreifen nicht auf den Pelz. */
const ENEMY_SPACING = 12;

/** Stirbt das Ziel, wechselt die Figur zu einem Angreifer in diesem Umkreis (Welt-Pixel). */
const ATTACKER_RADIUS = 80;

/**
 * Die Kampfregeln: Ziel wählen, hinlaufen, Auto-Angriff, Skills, Schaden in
 * beide Richtungen, EP und Stufenaufstieg, Tod und Respawn der Spielfigur.
 */
export class Combat {
  /** Der angewählte Gegner. */
  target: Enemy | null = null;

  /** Läuft die Figur ihrem Ziel von selbst hinterher? (Nach Klick auf einen Gegner.) */
  private engaging = false;
  private repathIn = 0;
  private respawnIn = 0;
  private readonly ring: Phaser.GameObjects.Image;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly grid: Grid,
    private readonly player: Player,
    private readonly enemies: Enemy[],
    private readonly hud: Hud,
    private readonly floaters: FloatingText,
    private readonly respawnPoint: Point,
  ) {
    this.ring = scene.add.image(0, 0, 'target-ring').setDepth(6).setVisible(false);
  }

  /** Der Gegner unter dem Punkt `at` (Welt-Koordinaten), sonst null. */
  enemyAt(at: Point): Enemy | null {
    let best: Enemy | null = null;
    let bestDistance = Infinity;
    for (const enemy of this.enemies) {
      if (!enemy.targetable) continue;
      // Das Bild sitzt 3 Pixel über dem Standpunkt; 2 Pixel Rand machen das Treffen leichter.
      const dx = at.x - enemy.pos.x;
      const dy = at.y - (enemy.pos.y - 3);
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) continue;
      const distance = Math.hypot(dx, dy);
      if (distance < bestDistance) {
        best = enemy;
        bestDistance = distance;
      }
    }
    return best;
  }

  /** Klick auf einen Gegner: als Ziel wählen, hinlaufen und angreifen. */
  engage(enemy: Enemy): void {
    this.select(enemy);
    this.engaging = true;
    this.repathIn = 0;
  }

  /** Die Figur läuft dem Ziel nicht mehr hinterher. Das Ziel bleibt angewählt. */
  disengage(): void {
    this.engaging = false;
  }

  clearTarget(): void {
    this.select(null);
    if (this.engaging) this.player.stop();
    this.engaging = false;
  }

  useSkill(id: SkillId): void {
    const player = this.player;
    const skill = SKILLS.find((s) => s.id === id);
    if (!skill || !player.alive) return;
    if (player.level < skill.unlockLevel) return this.hud.flash(`${skill.name} gibt es ab Stufe ${skill.unlockLevel}`);
    if ((player.cooldowns.get(id) ?? 0) > 0) return this.hud.flash('Noch nicht bereit');
    if (player.mana < skill.manaCost) return this.hud.flash('Zu wenig Mana');

    const effect = skill.effect;
    switch (effect.type) {
      case 'strike': {
        const target = this.target;
        if (!target || !target.targetable) return this.hud.flash('Kein Ziel');
        if (player.distanceTo(target.pos) > MELEE_RANGE) return this.hud.flash('Ziel zu weit entfernt');
        player.swingAt(target.pos, 'strike');
        this.hitEnemy(target, effect.multiplier);
        break;
      }
      case 'cleave': {
        const inReach = this.enemies.filter((enemy) => enemy.targetable && player.distanceTo(enemy.pos) <= effect.radius);
        if (inReach.length === 0) return this.hud.flash('Kein Gegner in Reichweite');
        // Der Schwung beginnt beim Ziel, sonst beim ersten Gegner in Reichweite.
        player.swingAt((this.target && inReach.includes(this.target) ? this.target : inReach[0]).pos, 'cleave');
        this.showShockwave(effect.radius, 0xfff2b0, 220);
        for (const enemy of inReach) this.hitEnemy(enemy, effect.multiplier);
        break;
      }
      case 'buff':
        player.addBuff(skill);
        this.floaters.spawn(player.pos.x, player.pos.y - 14, `${skill.name}!`, 'info');
        break;
    }
    player.mana -= skill.manaCost;
    player.cooldowns.set(id, skill.cooldownMs);
  }

  /** Einmal pro Frame, vor der Bewegung der Spielfigur. */
  update(deltaMs: number): void {
    const player = this.player;
    if (player.alive) {
      player.tick(deltaMs);
      this.followTarget(deltaMs);
      this.autoAttack();
    } else {
      this.respawnIn -= deltaMs;
      if (this.respawnIn <= 0) this.respawnPlayer();
    }

    for (const enemy of this.enemies) enemy.update(deltaMs, this.grid, player, this.enemyStrikes);
    this.spreadEnemies();

    // Ziel tot oder auf dem Rückweg: Auswahl aufheben.
    if (this.target && !this.target.targetable) this.clearTarget();
    this.ring.setVisible(this.target !== null);
    if (this.target) this.ring.setPosition(this.target.x, this.target.y + 4);

    this.hud.update(player, this.target);
  }

  private select(enemy: Enemy | null): void {
    if (this.target === enemy) return;
    this.target?.setSelected(false);
    this.target = enemy;
    enemy?.setSelected(true);
  }

  /** Nach einem Klick auf einen Gegner: so lange nachlaufen, bis er in Reichweite ist. */
  private followTarget(deltaMs: number): void {
    const target = this.target;
    if (!this.engaging || !target) return;
    if (this.player.distanceTo(target.pos) <= MELEE_APPROACH) {
      this.player.stop();
      this.player.face(target.pos.x);
      return;
    }
    this.repathIn -= deltaMs;
    if (this.repathIn > 0) return;
    this.repathIn = REPATH_MS;
    const route = findRoute(this.grid, this.player.pos, target.pos);
    if (route) this.player.walkAlong(route);
  }

  /** Steht das Ziel in Reichweite, schlägt die Figur von selbst zu. */
  private autoAttack(): void {
    const player = this.player;
    const target = this.target;
    if (!target || !target.targetable || player.attackCooldown > 0) return;
    if (player.distanceTo(target.pos) > MELEE_RANGE) return;
    player.attackCooldown = WARRIOR.attackIntervalMs;
    player.swingAt(target.pos, 'auto');
    this.hitEnemy(target, 1);
  }

  private hitEnemy(enemy: Enemy, multiplier: number): void {
    const hit = rollHit(this.player.attackPower, enemy.armor, multiplier, WARRIOR.critChance, WARRIOR.critMultiplier);
    this.player.enterCombat();
    enemy.takeDamage(hit.amount);
    enemy.recoilFrom(this.player.pos);
    this.floaters.spawn(enemy.pos.x, enemy.pos.y - 16, hit.crit ? `${hit.amount}!` : `${hit.amount}`, hit.crit ? 'crit' : 'hit');
    if (!enemy.alive) this.grantXp(enemy);

    // Ziel besiegt: gleich zum nächsten Angreifer wechseln, falls noch einer da ist.
    if (!enemy.alive && enemy === this.target) {
      const next = this.nearestAttacker();
      if (next) this.select(next);
      else this.clearTarget();
    }
  }

  /** EP für einen besiegten Gegner – und alles, was bei einem Stufenaufstieg passiert. */
  private grantXp(enemy: Enemy): void {
    const player = this.player;
    if (player.xpToNext === 0) return; // Maximalstufe
    const amount = xpForKill(enemy.level, player.level);
    const missingHp = player.maxHp - player.hp;
    const levelUps = player.gainXp(amount);
    this.floaters.spawn(player.pos.x, player.pos.y - 16, `+${amount} EP`, 'xp');
    if (levelUps === 0) return;

    // Aufstieg: Leben und Mana sind wieder voll, neue Skills werden angesagt.
    const unlocked = SKILLS.filter((skill) => skill.unlockLevel > player.level - levelUps && skill.unlockLevel <= player.level);
    this.hud.showLevelUp(player.level, levelUps, unlocked);
    this.floaters.spawn(player.pos.x, player.pos.y - 26, `Stufe ${player.level}!`, 'level');
    if (missingHp >= 1) this.floaters.spawn(player.pos.x, player.pos.y - 8, `+${Math.round(missingHp)}`, 'heal');
    this.showShockwave(40, 0xffd34d, 600);
  }

  /** Der nächste Gegner, der die Figur gerade verfolgt und schon in ihrer Nähe ist. */
  private nearestAttacker(): Enemy | null {
    let best: Enemy | null = null;
    let bestDistance = ATTACKER_RADIUS;
    for (const enemy of this.enemies) {
      if (enemy.state !== 'chase') continue;
      const distance = this.player.distanceTo(enemy.pos);
      if (distance < bestDistance) {
        best = enemy;
        bestDistance = distance;
      }
    }
    return best;
  }

  /** Ein Gegner schlägt zu. Als Pfeilfunktion, damit sie als Callback übergeben werden kann. */
  private readonly enemyStrikes = (enemy: Enemy): void => {
    const player = this.player;
    if (!player.alive) return;
    const hit = rollHit(enemy.attackPower, player.armor);
    const amount = Math.max(1, Math.round(hit.amount * player.damageTakenFactor));
    player.takeDamage(amount);
    this.floaters.spawn(player.pos.x, player.pos.y - 16, `${amount}`, 'hurt');

    if (!player.alive) {
      this.killPlayer();
    } else if (!this.target) {
      // Ohne Ziel angegriffen: den Angreifer anwählen. Steht die Figur nur herum, wehrt sie sich.
      this.select(enemy);
      if (!player.hasPath) this.engaging = true;
    }
  };

  private killPlayer(): void {
    this.clearTarget();
    this.player.die();
    this.respawnIn = PLAYER_RESPAWN_MS;
    this.hud.setDead(true, this.player.loseXp(DEATH_XP_LOSS));
  }

  private respawnPlayer(): void {
    this.player.revive(this.respawnPoint);
    this.hud.setDead(false, 0);
  }

  /** Schiebt Angreifer auseinander, die aufeinander stehen – so umringen sie die Figur. */
  private spreadEnemies(): void {
    const chasing = this.enemies.filter((enemy) => enemy.state === 'chase');
    for (let i = 0; i < chasing.length; i++) {
      for (let j = i + 1; j < chasing.length; j++) {
        const a = chasing[i];
        const b = chasing[j];
        let dx = b.pos.x - a.pos.x;
        let dy = b.pos.y - a.pos.y;
        let distance = Math.hypot(dx, dy);
        if (distance >= ENEMY_SPACING) continue;
        if (distance < 0.01) {
          // Exakt aufeinander: irgendeine Richtung wählen.
          const angle = Math.random() * Math.PI * 2;
          dx = Math.cos(angle);
          dy = Math.sin(angle);
          distance = 1;
        }
        const push = Math.min(1, (ENEMY_SPACING - distance) / 2);
        a.nudge((-dx / distance) * push, (-dy / distance) * push, this.grid);
        b.nudge((dx / distance) * push, (dy / distance) * push, this.grid);
      }
    }
  }

  /** Ring, der sich um die Figur ausbreitet: Zeichen für einen Flächenangriff oder Stufenaufstieg. */
  private showShockwave(radius: number, color: number, durationMs: number): void {
    const ring = this.scene.add
      .circle(this.player.pos.x, this.player.pos.y, radius)
      .setStrokeStyle(1.5, color, 0.9)
      .setDepth(9)
      .setScale(0.3);
    this.scene.tweens.add({ targets: ring, scale: 1, alpha: 0, duration: durationMs, onComplete: () => ring.destroy() });
  }
}
