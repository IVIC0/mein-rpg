import { RANKS, traitName } from '../data/elites';
import { isTrivial } from '../data/progression';
import { WARRIOR, type SkillDef, type SkillId } from '../data/warrior';
import { byId, iconPosition } from './dom';
import { describeEffect, describeTrigger } from './skillText';
import type { Enemy } from '../entities/Enemy';
import type { Player } from '../entities/Player';

/** So lange bleibt ein Hinweis wie "Inventar voll" stehen (Millisekunden). */
const MESSAGE_MS = 1200;

/** So lange ist die Meldung zum Stufenaufstieg zu sehen (Millisekunden); passt zur Animation in hud.css. */
const LEVELUP_MS = 3500;

/** So lange steht ein aufgehobenes Item in der Beute-Liste (Millisekunden), und so viele Zeilen hat sie höchstens. */
const LOOT_LOG_MS = 7000;
const LOOT_LOG_LINES = 6;

interface Slot {
  skill: SkillDef;
  box: HTMLElement;
  cooldown: HTMLElement;
  timer: HTMLElement;
  count: HTMLElement;
}

/**
 * Die Anzeigen über dem Spielbild: Leben und EP, Zielrahmen, Skill-Balken, Hinweise,
 * Beute-Liste, die Meldung zum Stufenaufstieg und der Todes-Bildschirm. Das Grundgerüst steht in index.html,
 * das Aussehen in hud.css – hier werden nur die Werte eingetragen.
 */
export class Hud {
  private readonly hpFill = byId('player-hp-fill');
  private readonly hpText = byId('player-hp-text');
  private readonly level = byId('player-level');
  private readonly xpFill = byId('player-xp-fill');
  private readonly xpText = byId('player-xp-text');
  private readonly buffs = byId('player-buffs');
  private readonly targetFrame = byId('target-frame');
  private readonly targetName = byId('target-name');
  private readonly targetLevel = byId('target-level');
  private readonly targetRank = byId('target-rank');
  private readonly targetFill = byId('target-hp-fill');
  private readonly targetText = byId('target-hp-text');
  private readonly message = byId('message');
  private readonly deathScreen = byId('death-screen');
  private readonly deathLoss = byId('death-loss');
  private readonly levelUp = byId('levelup');
  private readonly levelUpTitle = byId('levelup-title');
  private readonly levelUpText = byId('levelup-text');
  private readonly lootLog = byId('loot-log');
  private readonly slots: Slot[] = [];
  private messageTimer = 0;
  private levelUpTimer = 0;
  /** Bearbeitungsmodus (HudLayout): der Zielrahmen ist dann auch ohne Ziel zu sehen, damit man ihn ziehen kann. */
  editing = false;

  /**
   * Baut den Skill-Balken. Er ist eine reine Anzeige: Skills lösen von selbst aus,
   * der Balken zeigt Abklingzeit, Schlag-Zähler und leuchtet beim Auslösen auf.
   */
  constructor(skills: SkillDef[]) {
    const bar = byId('skillbar');
    for (const skill of skills) {
      const box = document.createElement('div');
      box.className = 'skill';
      const cooldown = skill.cooldownMs > 0 ? `<i>${skill.cooldownMs / 1000} s Abklingzeit</i>` : '';
      box.innerHTML = `
        <span class="skill-icon sprite-icon" style="background-position: ${iconPosition(skill.iconFrame)}"></span>
        <span class="skill-cooldown"></span>
        <span class="skill-timer"></span>
        <span class="skill-count"></span>
        <span class="skill-lock">Stufe ${skill.unlockLevel}</span>
        <span class="skill-tooltip">
          <b>${skill.name}</b>
          ${cooldown}
          <u>Löst aus: ${describeTrigger(skill.trigger)}</u>
          ${describeEffect(skill.effect)}
          <em>Verfügbar ab Stufe ${skill.unlockLevel}.</em>
        </span>`;
      bar.appendChild(box);
      this.slots.push({
        skill,
        box,
        cooldown: box.querySelector('.skill-cooldown') as HTMLElement,
        timer: box.querySelector('.skill-timer') as HTMLElement,
        count: box.querySelector('.skill-count') as HTMLElement,
      });
    }
  }

  /** Trägt die aktuellen Werte ein. Einmal pro Frame aufrufen. */
  update(player: Player, target: Enemy | null): void {
    setWidth(this.hpFill, player.hp / player.maxHp);
    setText(this.hpText, `${Math.ceil(player.hp)} / ${player.maxHp}`);
    setText(this.level, `Stufe ${player.level}`);
    if (player.xpToNext > 0) {
      setWidth(this.xpFill, player.xp / player.xpToNext);
      setText(this.xpText, `${player.xp} / ${player.xpToNext} EP`);
    } else {
      setWidth(this.xpFill, 1);
      setText(this.xpText, 'Maximalstufe');
    }
    setText(this.buffs, player.buffs.map((buff) => `${buff.name} ${Math.ceil(buff.remainingMs / 1000)} s`).join(' · '));

    this.targetFrame.hidden = target === null && !this.editing;
    if (!target && this.editing) {
      // Platzhalter, solange kein Ziel angewählt ist.
      setText(this.targetName, 'Ziel');
      setText(this.targetLevel, '');
      setText(this.targetRank, '');
      this.targetFrame.classList.remove('rank-elite', 'rank-boss');
      setWidth(this.targetFill, 1);
      setText(this.targetText, '');
    }
    if (target) {
      setText(this.targetName, target.def.name);
      setText(this.targetLevel, `Stufe ${target.level}`);
      // Elite/Boss: eigene Rahmenfarbe und eine Zeile mit Rang und Eigenschaften.
      this.targetFrame.classList.toggle('rank-elite', target.rank === 'elite');
      this.targetFrame.classList.toggle('rank-boss', target.rank === 'boss');
      setText(this.targetRank, [RANKS[target.rank].label, ...target.traits.map(traitName)].filter(Boolean).join(' · '));
      // Rot = deutlich stärker als die Figur, grau = bringt nur noch wenig EP.
      this.targetLevel.classList.toggle('level-high', target.level >= player.level + 2);
      this.targetLevel.classList.toggle('level-low', isTrivial(target.level, player.level));
      setWidth(this.targetFill, target.hp / target.maxHp);
      setText(this.targetText, `${Math.ceil(target.hp)} / ${target.maxHp}`);
    }

    for (const slot of this.slots) {
      const skill = slot.skill;
      const locked = player.level < skill.unlockLevel;
      const remaining = player.cooldowns.get(skill.id) ?? 0;
      if (remaining > 0) {
        setHeight(slot.cooldown, remaining / skill.cooldownMs);
      } else if (skill.trigger.type === 'everyNthHit' && !locked) {
        // Der Vorhang schrumpft mit jedem Schlag; ist er weg, wird der nächste Schlag zum Skill.
        setHeight(slot.cooldown, 1 - player.hitsSince(skill.id) / (skill.trigger.n - 1));
      } else {
        setHeight(slot.cooldown, 0);
      }
      setText(slot.timer, remaining > 0 ? `${Math.ceil(remaining / 1000)}` : '');
      setText(slot.count, skill.trigger.type === 'everyNthHit' && !locked ? `${player.hitsSince(skill.id)}/${skill.trigger.n}` : '');
      slot.box.classList.toggle('active', player.hasBuff(skill.id));
      slot.box.classList.toggle('locked', locked);
    }
  }

  /** Lässt einen Skill im Balken kurz aufleuchten – er hat gerade ausgelöst. */
  flashSkill(id: SkillId): void {
    const box = this.slots.find((slot) => slot.skill.id === id)?.box;
    if (!box) return;
    // Klasse entfernen und Layout abfragen: so startet die Animation jedes Mal neu.
    box.classList.remove('fired');
    void box.offsetWidth;
    box.classList.add('fired');
  }

  /** Zeigt kurz einen Hinweis über dem Skill-Balken. */
  flash(text: string): void {
    this.message.textContent = text;
    this.message.classList.add('show');
    window.clearTimeout(this.messageTimer);
    this.messageTimer = window.setTimeout(() => this.message.classList.remove('show'), MESSAGE_MS);
  }

  /**
   * Große Meldung zum Stufenaufstieg: neue Stufe, Wertezuwachs und frisch
   * freigeschaltete Skills. `levelUps` = um wie viele Stufen es auf einmal ging.
   */
  showLevelUp(level: number, levelUps: number, unlocked: SkillDef[]): void {
    const gain = WARRIOR.perLevel;
    const lines = [
      `+${gain.maxHp * levelUps} Leben · +${gain.attackPower * levelUps} Angriff · +${gain.armor * levelUps} Rüstung`,
      ...unlocked.map((skill) => `Neuer Skill: ${skill.name} – ${describeTrigger(skill.trigger)}`),
    ];
    this.levelUpTitle.textContent = `Stufe ${level} erreicht!`;
    this.levelUpText.innerHTML = lines.join('<br>');
    // Klasse kurz entfernen und Layout abfragen: so startet die Animation auch bei zwei Aufstiegen hintereinander neu.
    this.levelUp.classList.remove('show');
    void this.levelUp.offsetWidth;
    this.levelUp.classList.add('show');
    window.clearTimeout(this.levelUpTimer);
    this.levelUpTimer = window.setTimeout(() => this.levelUp.classList.remove('show'), LEVELUP_MS);
  }

  /** Schreibt ein aufgehobenes Item in die Beute-Liste unten links; die Zeile verschwindet von selbst. */
  logLoot(name: string, color: string): void {
    const line = document.createElement('div');
    line.textContent = `Erhalten: ${name}`;
    line.style.color = color;
    this.lootLog.appendChild(line);
    while (this.lootLog.children.length > LOOT_LOG_LINES) this.lootLog.firstElementChild?.remove();
    window.setTimeout(() => line.remove(), LOOT_LOG_MS);
  }

  /** Todes-Bildschirm ein- oder ausblenden. `xpLost` / `goldLost` = was der Tod gekostet hat. */
  setDead(dead: boolean, xpLost: number, goldLost: number): void {
    this.deathScreen.hidden = !dead;
    const losses: string[] = [];
    if (xpLost > 0) losses.push(`${xpLost} EP`);
    if (goldLost > 0) losses.push(`${goldLost} Gold`);
    this.deathLoss.textContent = losses.length > 0 ? `Du verlierst ${losses.join(' und ')}.` : '';
  }
}

// Die Helfer schreiben nur, wenn sich der Wert geändert hat – das spart dem Browser Arbeit.

function setText(element: HTMLElement, text: string): void {
  if (element.textContent !== text) element.textContent = text;
}

function setWidth(element: HTMLElement, fraction: number): void {
  const value = `${Math.round(clamp01(fraction) * 100)}%`;
  if (element.style.width !== value) element.style.width = value;
}

function setHeight(element: HTMLElement, fraction: number): void {
  const value = `${Math.round(clamp01(fraction) * 100)}%`;
  if (element.style.height !== value) element.style.height = value;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
