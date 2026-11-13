import {
  BESTIARY_PAGES,
  BESTIARY_RANKS,
  ELITE_KILL_WEIGHT,
  PAGE_TIERS,
  noTypeBonus,
  pageOfType,
  rankKills,
  type BestiaryPageDef,
  type PageBonus,
  type TypeBonus,
} from '../data/bestiary';
import { ENEMIES } from '../data/enemies';
import type { Enemy } from '../entities/Enemy';

/** Das Jagdbuch, so wie es im Spielstand steht: nur Zähler. */
export interface BestiaryData {
  /** Gegnertyp → besiegte Gegner (eine Elite zählt mehrfach, siehe ELITE_KILL_WEIGHT). */
  kills: Record<string, number>;
  /** Boss oder feste Elite → Anzahl der Siege (für die Bosse-Zeile). */
  bosses: Record<string, number>;
}

/** Wo ein Gegnertyp gerade steht: Zähler, Rang und wie weit es bis zum nächsten Rang ist. */
export interface TypeProgress {
  kills: number;
  /** 0 = noch kein Rang, 1–5 = Rang aus BESTIARY_RANKS. */
  rank: number;
  /** Zähler, bei dem der aktuelle Rang begann (0 ohne Rang). */
  from: number;
  /** Zähler, den der nächste Rang braucht; null = höchster Rang erreicht. */
  next: number | null;
}

/**
 * Das Jagdbuch: zählt besiegte Gegner je Typ und rechnet daraus Ränge und Boni aus.
 * Alle Werte stehen in src/data/bestiary.ts.
 *
 * - Jeder Gegnertyp hat fünf Ränge mit kleinen Boni gegen genau diesen Typ (`bonusAgainst`).
 * - Jede Zone hat eine Sammelseite mit drei Stufen; sie geben Leben und Angriffskraft (`pageBonus`).
 * - Bosse und feste Elites stehen in der Bosse-Zeile – reines Sammeln, ohne Bonus.
 */
export class Bestiary {
  private kills: Record<string, number> = {};
  private bosses: Record<string, number> = {};
  /** Die Boni je Gegnertyp – werden nur neu gerechnet, wenn ein Rang steigt (nicht bei jedem Treffer). */
  private readonly typeBonus = new Map<string, TypeBonus>();
  /** Leben und Angriffskraft aus allen Sammelseiten zusammen (0.02 = +2 %). */
  pageBonus: PageBonus = { maxHp: 0, attackPower: 0 };

  /** Wird nach jedem gezählten Gegner aufgerufen (Fenster neu zeichnen, speichern). */
  onChange: () => void = () => {};
  /** Wird aufgerufen, wenn sich die Boni der Sammelseiten geändert haben (die Figur bekommt neue Werte). */
  onPageBonusChange: () => void = () => {};
  /** Wird mit einer kurzen Meldung aufgerufen, wenn ein Rang oder eine Seiten-Stufe erreicht ist. */
  onMessage: (text: string) => void = () => {};

  /** Übernimmt die Zähler aus einem Spielstand. */
  load(data: BestiaryData): void {
    this.kills = { ...data.kills };
    this.bosses = { ...data.bosses };
    this.refreshBonuses();
    this.onPageBonusChange();
    this.onChange();
  }

  /** Die Zähler für den Spielstand. */
  toData(): BestiaryData {
    return { kills: { ...this.kills }, bosses: { ...this.bosses } };
  }

  /**
   * Ein Gegner wurde besiegt.
   * - Normaler Gegner: +1 bei seinem Typ. Elite: +5 (ELITE_KILL_WEIGHT).
   * - Feste Elite (z. B. die Brutmutter): zählt als Elite ihres Typs und dazu in der Bosse-Zeile.
   * - Boss: zählt nur in der Bosse-Zeile.
   */
  record(enemy: Enemy): void {
    const bossId = enemy.bossId;
    if (bossId) this.bosses[bossId] = (this.bosses[bossId] ?? 0) + 1;

    if (enemy.rank !== 'boss') {
      const type = enemy.type;
      const page = pageOfType(type);
      const rankBefore = this.progress(type).rank;
      const tierBefore = page ? this.pageTier(page) : 0;
      this.kills[type] = (this.kills[type] ?? 0) + (enemy.rank === 'elite' ? ELITE_KILL_WEIGHT : 1);

      const rank = this.progress(type).rank;
      if (rank > rankBefore) {
        this.refreshBonuses();
        const def = BESTIARY_RANKS[rank - 1];
        this.onMessage(`Jagdbuch: ${ENEMIES[type]?.name ?? type} – Rang ${rank} „${def.name}“ (${def.reward})`);
        // Mit dem neuen Rang kann auch die Sammelseite eine Stufe weiter sein.
        const tier = page ? this.pageTier(page) : 0;
        if (page && tier > tierBefore) {
          const tierDef = PAGE_TIERS[tier - 1];
          this.onMessage(`Jagdbuch: Seite ${page.name} ist jetzt ${tierDef.name} (${tierDef.reward})`);
          this.onPageBonusChange();
        }
      }
    }
    this.onChange();
  }

  /** Zähler, Rang und nächste Schwelle eines Gegnertyps. */
  progress(type: string): TypeProgress {
    const kills = this.kills[type] ?? 0;
    const thresholds = rankKills(pageOfType(type));
    let rank = 0;
    while (rank < thresholds.length && kills >= thresholds[rank]) rank++;
    return { kills, rank, from: rank > 0 ? thresholds[rank - 1] : 0, next: rank < thresholds.length ? thresholds[rank] : null };
  }

  /** Die Boni gegen einen Gegnertyp aus allen Rängen, die er schon hat. */
  bonusAgainst(type: string): TypeBonus {
    return this.typeBonus.get(type) ?? NO_BONUS;
  }

  /** Stufe einer Sammelseite: 0 = keine, 1 = Bronze, 2 = Silber, 3 = Gold. */
  pageTier(page: BestiaryPageDef): number {
    // Der niedrigste Rang auf der Seite entscheidet.
    const lowest = Math.min(...page.types.map((type) => this.progress(type).rank));
    let tier = 0;
    while (tier < PAGE_TIERS.length && lowest >= PAGE_TIERS[tier].rank) tier++;
    return tier;
  }

  /** So oft wurde ein Boss oder eine feste Elite besiegt. */
  bossWins(id: string): number {
    return this.bosses[id] ?? 0;
  }

  /** Rechnet alle Boni aus den Zählern neu aus. */
  private refreshBonuses(): void {
    this.typeBonus.clear();
    for (const type of Object.keys(this.kills)) {
      const bonus = noTypeBonus();
      for (const def of BESTIARY_RANKS.slice(0, this.progress(type).rank)) {
        bonus.damageDealt += def.bonus.damageDealt ?? 0;
        bonus.damageTaken += def.bonus.damageTaken ?? 0;
        bonus.gold += def.bonus.gold ?? 0;
        bonus.dropChance += def.bonus.dropChance ?? 0;
      }
      this.typeBonus.set(type, bonus);
    }
    const total: PageBonus = { maxHp: 0, attackPower: 0 };
    for (const page of BESTIARY_PAGES) {
      for (const tier of PAGE_TIERS.slice(0, this.pageTier(page))) {
        total.maxHp += tier.bonus.maxHp ?? 0;
        total.attackPower += tier.bonus.attackPower ?? 0;
      }
    }
    this.pageBonus = total;
  }
}

/** Für Gegnertypen ohne Rang: kein Bonus. */
const NO_BONUS: TypeBonus = noTypeBonus();
