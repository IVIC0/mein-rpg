import { isTrivial } from '../data/progression';
import { WARRIOR, type SkillDef, type SkillId } from '../data/warrior';
import type { Enemy } from '../entities/Enemy';
import type { Player } from '../entities/Player';

/** So lange bleibt ein Hinweis wie "Zu wenig Mana" stehen (Millisekunden). */
const MESSAGE_MS = 1200;

/** So lange ist die Meldung zum Stufenaufstieg zu sehen (Millisekunden); passt zur Animation in hud.css. */
const LEVELUP_MS = 3500;

/** Die Symbole kommen aus characters.png: 12 Bilder pro Zeile, 18 Pixel Raster, 1 Pixel Rand. */
const ICON_COLUMNS = 12;
const ICON_STEP = 18;

interface Slot {
  skill: SkillDef;
  button: HTMLElement;
  cooldown: HTMLElement;
  timer: HTMLElement;
}

/**
 * Die Anzeigen über dem Spielbild: Leben, Mana und EP, Zielrahmen, Skill-Balken,
 * Hinweise, die Meldung zum Stufenaufstieg und der Todes-Bildschirm. Das Grundgerüst steht in index.html,
 * das Aussehen in hud.css – hier werden nur die Werte eingetragen.
 */
export class Hud {
  private readonly hpFill = byId('player-hp-fill');
  private readonly hpText = byId('player-hp-text');
  private readonly manaFill = byId('player-mana-fill');
  private readonly manaText = byId('player-mana-text');
  private readonly level = byId('player-level');
  private readonly xpFill = byId('player-xp-fill');
  private readonly xpText = byId('player-xp-text');
  private readonly buffs = byId('player-buffs');
  private readonly targetFrame = byId('target-frame');
  private readonly targetName = byId('target-name');
  private readonly targetLevel = byId('target-level');
  private readonly targetFill = byId('target-hp-fill');
  private readonly targetText = byId('target-hp-text');
  private readonly message = byId('message');
  private readonly deathScreen = byId('death-screen');
  private readonly deathLoss = byId('death-loss');
  private readonly levelUp = byId('levelup');
  private readonly levelUpTitle = byId('levelup-title');
  private readonly levelUpText = byId('levelup-text');
  private readonly slots: Slot[] = [];
  private messageTimer = 0;
  private levelUpTimer = 0;

  /** `onSkill` wird aufgerufen, wenn ein Skill im Balken angeklickt wird. */
  constructor(skills: SkillDef[], onSkill: (id: SkillId) => void) {
    const bar = byId('skillbar');
    for (const skill of skills) {
      const button = document.createElement('button');
      button.className = 'skill';
      const iconX = 1 + (skill.iconFrame % ICON_COLUMNS) * ICON_STEP;
      const iconY = 1 + Math.floor(skill.iconFrame / ICON_COLUMNS) * ICON_STEP;
      button.innerHTML = `
        <span class="skill-icon" style="background-position: -${iconX}px -${iconY}px"></span>
        <span class="skill-cooldown"></span>
        <span class="skill-timer"></span>
        <span class="skill-key">${skill.key}</span>
        <span class="skill-lock">Stufe ${skill.unlockLevel}</span>
        <span class="skill-tooltip">
          <b>${skill.name}</b>
          <i>${skill.manaCost} Mana · ${skill.cooldownMs / 1000} s Abklingzeit</i>
          ${skill.description}
          <em>Verfügbar ab Stufe ${skill.unlockLevel}.</em>
        </span>`;
      // Kein Tastatur-Fokus auf dem Knopf, sonst würde die Leertaste ihn erneut auslösen.
      button.addEventListener('mousedown', (event) => event.preventDefault());
      button.addEventListener('click', () => onSkill(skill.id));
      bar.appendChild(button);
      this.slots.push({
        skill,
        button,
        cooldown: button.querySelector('.skill-cooldown') as HTMLElement,
        timer: button.querySelector('.skill-timer') as HTMLElement,
      });
    }
  }

  /** Trägt die aktuellen Werte ein. Einmal pro Frame aufrufen. */
  update(player: Player, target: Enemy | null): void {
    setWidth(this.hpFill, player.hp / player.maxHp);
    setText(this.hpText, `${Math.ceil(player.hp)} / ${player.maxHp}`);
    setWidth(this.manaFill, player.mana / player.maxMana);
    setText(this.manaText, `${Math.floor(player.mana)} / ${player.maxMana}`);
    setText(this.level, `Stufe ${player.level}`);
    if (player.xpToNext > 0) {
      setWidth(this.xpFill, player.xp / player.xpToNext);
      setText(this.xpText, `${player.xp} / ${player.xpToNext} EP`);
    } else {
      setWidth(this.xpFill, 1);
      setText(this.xpText, 'Maximalstufe');
    }
    setText(this.buffs, player.buffs.map((buff) => `${buff.name} ${Math.ceil(buff.remainingMs / 1000)} s`).join(' · '));

    this.targetFrame.hidden = target === null;
    if (target) {
      setText(this.targetName, target.def.name);
      setText(this.targetLevel, `Stufe ${target.level}`);
      // Rot = deutlich stärker als die Figur, grau = bringt nur noch wenig EP.
      this.targetLevel.classList.toggle('level-high', target.level >= player.level + 2);
      this.targetLevel.classList.toggle('level-low', isTrivial(target.level, player.level));
      setWidth(this.targetFill, target.hp / target.maxHp);
      setText(this.targetText, `${Math.ceil(target.hp)} / ${target.maxHp}`);
    }

    for (const slot of this.slots) {
      const remaining = player.cooldowns.get(slot.skill.id) ?? 0;
      setHeight(slot.cooldown, remaining / slot.skill.cooldownMs);
      setText(slot.timer, remaining > 0 ? `${Math.ceil(remaining / 1000)}` : '');
      slot.button.classList.toggle('no-mana', player.mana < slot.skill.manaCost);
      slot.button.classList.toggle('active', player.buffs.some((buff) => buff.skillId === slot.skill.id));
      slot.button.classList.toggle('locked', player.level < slot.skill.unlockLevel);
    }
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
      `+${gain.maxHp * levelUps} Leben · +${gain.maxMana * levelUps} Mana · +${gain.attackPower * levelUps} Angriff · +${gain.armor * levelUps} Rüstung`,
      ...unlocked.map((skill) => `Neuer Skill: ${skill.name} (Taste ${skill.key})`),
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

  /** Todes-Bildschirm ein- oder ausblenden. `xpLost` = EP, die der Tod gekostet hat. */
  setDead(dead: boolean, xpLost: number): void {
    this.deathScreen.hidden = !dead;
    this.deathLoss.textContent = xpLost > 0 ? `Du verlierst ${xpLost} EP.` : '';
  }
}

function byId(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Element #${id} fehlt in index.html.`);
  return element;
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
