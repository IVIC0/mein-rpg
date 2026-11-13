import type { Bestiary } from '../bestiary/Bestiary';
import type { FieldGuide, GuideEntry } from '../bestiary/fieldGuide';
import { BESTIARY_PAGES, BESTIARY_RANKS, BOSS_STEPS, ELITE_KILL_WEIGHT, PAGE_TIERS, type BestiaryPageDef, type TypeBonus } from '../data/bestiary';
import { RANKS, traitName } from '../data/elites';
import { enemyStats } from '../data/enemies';
import { byId } from './dom';

/**
 * Das Fenster "Jagdbuch" (Taste J oder der Knopf in der Leiste): ein Reiter je Sammelseite,
 * darin je Gegnertyp Bild, Zähler, Balken bis zum nächsten Rang und die Boni; darunter die Bosse.
 * Das Grundgerüst steht in index.html, die Regeln in src/bestiary/Bestiary.ts, alle Werte in
 * src/data/bestiary.ts. Woher Bilder und Fundorte kommen: src/bestiary/fieldGuide.ts.
 */
export class BestiaryWindow {
  private readonly root = byId('bestiary');
  private readonly button = byId('bestiary-button');
  private readonly tabs = byId('bestiary-tabs');
  private readonly pageBox = byId('bestiary-page');
  private readonly list = byId('bestiary-list');
  private readonly bossBox = byId('bestiary-bosses');
  private readonly total = byId('bestiary-total');
  /** Die Seite, die gerade zu sehen ist. */
  private page: BestiaryPageDef = BESTIARY_PAGES[0];

  /**
   * `beforeOpen` wird aufgerufen, bevor das Fenster aufgeht – dort schließt die Spielwelt die
   * Fenster, die am selben Platz sitzen (Händler, Dorfausbau, Lagertruhe).
   */
  constructor(
    private readonly bestiary: Bestiary,
    private readonly guide: FieldGuide,
    private readonly beforeOpen: () => void,
  ) {
    for (const page of BESTIARY_PAGES) {
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'shop-tab';
      tab.dataset.page = page.id;
      tab.addEventListener('click', () => {
        this.page = page;
        this.render();
        tab.blur();
      });
      this.tabs.appendChild(tab);
    }
    this.button.addEventListener('click', () => {
      this.toggle();
      this.button.blur();
    });
    byId('bestiary-close').addEventListener('click', () => this.close());
    byId('bestiary-help').textContent = `Gezählt wird jeder besiegte Gegner, eine Elite zählt ${ELITE_KILL_WEIGHT}-fach. Die Boni gelten nur gegen den jeweiligen Typ.`;
  }

  get isOpen(): boolean {
    return !this.root.hidden;
  }

  toggle(): void {
    if (this.isOpen) this.close();
    else this.open();
  }

  open(): void {
    this.beforeOpen();
    this.root.hidden = false;
    this.button.classList.add('active');
    this.render();
  }

  close(): void {
    this.root.hidden = true;
    this.button.classList.remove('active');
  }

  /** Zeichnet die Seite neu. Aufrufen, wenn ein Gegner gezählt wurde. */
  render(): void {
    if (!this.isOpen) return;
    const page = this.page;
    const bestiary = this.bestiary;
    const tier = bestiary.pageTier(page);

    // Reiter: Name der Seite, dahinter ihre Stufe.
    for (const tab of Array.from(this.tabs.children) as HTMLElement[]) {
      const tabPage = BESTIARY_PAGES.find((candidate) => candidate.id === tab.dataset.page);
      if (!tabPage) continue;
      const tabTier = bestiary.pageTier(tabPage);
      tab.textContent = tabTier > 0 ? `${tabPage.name} · ${PAGE_TIERS[tabTier - 1].name}` : tabPage.name;
      tab.classList.toggle('active', tabPage === page);
    }

    // Die drei Stufen der Sammelseite: Bedingung, Bonus und wie viele Typen schon so weit sind.
    const ranks = page.types.map((type) => bestiary.progress(type).rank);
    this.pageBox.innerHTML = PAGE_TIERS.map((def, index) => {
      const done = ranks.filter((rank) => rank >= def.rank).length;
      const reached = index < tier;
      return `<div class="bestiary-tier tier-${index + 1}${reached ? ' reached' : ''}">
        <b>${reached ? '✔ ' : ''}${def.name}</b>
        <span>alle auf Rang ${def.rank} (${done} / ${ranks.length})</span>
        <i>${def.reward}</i>
      </div>`;
    }).join('');

    this.list.innerHTML = page.types.map((type) => this.typeCard(type)).join('');
    this.bossBox.innerHTML = page.bosses.map((id) => this.bossCard(id)).join('');

    const bonus = bestiary.pageBonus;
    this.total.textContent = `Alle Seiten zusammen: +${percent(bonus.maxHp)} Leben · +${percent(bonus.attackPower)} Angriffskraft`;
  }

  /** Die Karte eines Gegnertyps. */
  private typeCard(type: string): string {
    const entry = this.guide[type];
    const progress = this.bestiary.progress(type);
    const { kills, rank, next } = progress;
    const unknown = kills === 0;
    const rankDef = rank > 0 ? BESTIARY_RANKS[rank - 1] : null;

    // Balken: vom aktuellen Rang bis zum nächsten.
    const fill = next === null ? 1 : (kills - progress.from) / (next - progress.from);
    const counter = next === null ? `${kills} besiegt` : `${kills} / ${next}`;

    const lines: string[] = [];
    // Ab Rang 1 steht der Eintrag da: Werte und Fundorte.
    if (rank >= 1) lines.push(`<div class="bestiary-facts">${statsText(entry)}<br />Fundorte: ${spotsText(entry)}</div>`);
    const active = bonusText(this.bestiary.bonusAgainst(type));
    if (active) lines.push(`<div class="bestiary-bonus">${active}</div>`);
    if (next !== null) {
      const nextDef = BESTIARY_RANKS[rank];
      lines.push(`<div class="bestiary-next">Rang ${rank + 1} „${nextDef.name}“: ${nextDef.reward}</div>`);
    }

    return `<div class="bestiary-card${unknown ? ' unknown' : ''}${next === null ? ' master' : ''}">
      <img class="bestiary-icon" src="${entry.icon}" alt="" />
      <div class="bestiary-info">
        <div class="bestiary-name"><b>${unknown ? '???' : entry.name}</b><span>${rankDef ? `Rang ${rank} · ${rankDef.name}` : unknown ? 'unbekannt' : 'ohne Rang'}</span></div>
        <div class="bestiary-bar"><div style="width: ${Math.round(Math.min(1, fill) * 100)}%"></div><span>${counter}</span></div>
        ${lines.join('')}
      </div>
    </div>`;
  }

  /** Die Karte eines Bosses oder einer festen Elite: reines Sammeln, ohne Bonus. */
  private bossCard(id: string): string {
    const entry = this.guide[id];
    const wins = this.bestiary.bossWins(id);
    const unknown = wins < BOSS_STEPS.entry;
    const star = wins >= BOSS_STEPS.star;

    const lines: string[] = [];
    if (!unknown) lines.push(`<div class="bestiary-facts">${RANKS[entry.rank].label} · Fundort: ${spotsText(entry)}</div>`);
    if (wins >= BOSS_STEPS.details) {
      const traits = entry.traits.length > 0 ? `<br />Eigenschaften: ${entry.traits.map(traitName).join(', ')}` : '';
      lines.push(`<div class="bestiary-facts">${statsText(entry)}${traits}</div>`);
    }
    if (wins < BOSS_STEPS.details) lines.push(`<div class="bestiary-next">${BOSS_STEPS.details} Siege: Werte und Eigenschaften</div>`);
    else if (!star) lines.push(`<div class="bestiary-next">${BOSS_STEPS.star} Siege: Stern</div>`);

    return `<div class="bestiary-card${unknown ? ' unknown' : ''}${star ? ' master' : ''}">
      <img class="bestiary-icon" src="${entry.icon}" alt="" />
      <div class="bestiary-info">
        <div class="bestiary-name"><b>${unknown ? '???' : entry.name}${star ? ' ★' : ''}</b><span>${wins === 1 ? '1 Sieg' : `${wins} Siege`}</span></div>
        ${lines.join('')}
      </div>
    </div>`;
  }
}

/** "3 %" aus 0.03. */
function percent(fraction: number): string {
  return `${(fraction * 100).toLocaleString('de-DE', { maximumFractionDigits: 1 })} %`;
}

function number(value: number): string {
  return value.toLocaleString('de-DE', { maximumFractionDigits: 1 });
}

/** "30–42" – oder nur "30", wenn beide Werte gleich sind. */
function range(min: number, max: number): string {
  return min === max ? number(min) : `${number(min)}–${number(max)}`;
}

/** Die aktiven Boni gegen einen Gegnertyp in einer Zeile; leer, wenn es noch keine gibt. */
function bonusText(bonus: TypeBonus): string {
  const parts: string[] = [];
  if (bonus.damageDealt > 0) parts.push(`+${percent(bonus.damageDealt)} Schaden`);
  if (bonus.damageTaken > 0) parts.push(`−${percent(bonus.damageTaken)} erlittener Schaden`);
  if (bonus.gold > 0) parts.push(`+${percent(bonus.gold)} Gold`);
  if (bonus.dropChance > 0) parts.push(`+${percent(bonus.dropChance)} Drop-Chance`);
  return parts.join(' · ');
}

/** Leben, Angriff, Rüstung und Tempo auf den Stufen, auf denen der Gegner vorkommt (Rang eingerechnet). */
function statsText(entry: GuideEntry): string {
  const levels = entry.spots.flatMap((spot) => [spot.minLevel, spot.maxLevel]);
  const minLevel = levels.length > 0 ? Math.min(...levels) : 1;
  const maxLevel = levels.length > 0 ? Math.max(...levels) : 1;
  const rank = RANKS[entry.rank];
  const low = enemyStats(entry.def, minLevel);
  const high = enemyStats(entry.def, maxLevel);
  const hp = range(Math.round(low.maxHp * rank.hpFactor), Math.round(high.maxHp * rank.hpFactor));
  const attack = range(low.attackPower * rank.attackFactor, high.attackPower * rank.attackFactor);
  const armor = range(low.armor + rank.armorBonus, high.armor + rank.armorBonus);
  return `Leben ${hp} · Angriff ${attack} · Rüstung ${armor} · Tempo ${entry.def.speed}`;
}

/** "Grünwald (Stufe 1–3), Spinnenhöhle (Stufe 4–6)". */
function spotsText(entry: GuideEntry): string {
  if (entry.spots.length === 0) return 'unbekannt';
  return entry.spots.map((spot) => `${spot.zone} (Stufe ${range(spot.minLevel, spot.maxLevel)})`).join(', ');
}
