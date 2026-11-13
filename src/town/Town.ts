import { BUILDINGS, MAX_BUILDING_LEVEL, TOWN_HALL_BOSSES, startLevels, townEffects, type BuildingId, type TownEffects, type TownLevels } from '../data/town';
import type { Inventory } from '../items/Inventory';

/** Ob und warum sich ein Gebäude gerade (nicht) ausbauen lässt. */
export interface UpgradeInfo {
  /** Die Stufe, die als Nächstes käme. */
  nextLevel: number;
  /** Preis in Gold (0 auf der höchsten Stufe). */
  cost: number;
  /** null = Ausbau möglich. Sonst der Grund: höchste Stufe, Rathaus zu niedrig, Boss nicht besiegt, zu wenig Gold. */
  blocked: 'max' | 'rathaus' | 'boss' | 'gold' | null;
  /** Der Grund als Text für das Fenster; leer, wenn der Ausbau möglich ist. */
  reason: string;
}

/**
 * Der Dorfausbau: die Stufe jedes Gebäudes, die Regeln fürs Ausbauen und was die Gebäude
 * gerade bringen (`effects`). Alle Werte stehen in src/data/town.ts.
 * Händler, Heiltrank, Erholung, Tod und Lagertruhe lesen ihre Werte aus `effects`.
 * Nach einem Ausbau wird `onChange` mit dem Gebäude aufgerufen (Fenster neu zeichnen, speichern).
 */
export class Town {
  readonly levels: TownLevels = startLevels();
  effects: TownEffects = townEffects(this.levels);
  /** Besiegte Bosse: Gegnertyp → Anzahl der Siege. Daran hängen die Rathaus-Stufen. */
  bossKills: Record<string, number> = {};
  onChange: (changed: BuildingId | null) => void = () => {};

  constructor(private readonly inventory: Inventory) {}

  /** Übernimmt Stufen und Boss-Siege aus einem Spielstand. */
  load(levels: TownLevels, bossKills: Record<string, number>): void {
    Object.assign(this.levels, levels);
    this.bossKills = { ...bossKills };
    this.effects = townEffects(this.levels);
    this.onChange(null);
  }

  /** Lässt sich das Gebäude ausbauen – und wenn nicht, warum? */
  upgradeInfo(id: BuildingId): UpgradeInfo {
    const level = this.levels[id];
    const nextLevel = level + 1;
    if (level >= MAX_BUILDING_LEVEL) return { nextLevel: level, cost: 0, blocked: 'max', reason: 'Höchste Stufe erreicht' };
    const cost = BUILDINGS[id].costs[level];

    // Das Rathaus braucht den Sieg über den Boss der Zone – alle anderen Gebäude brauchen das Rathaus.
    const hallLevel = id === 'rathaus' ? nextLevel : this.levels.rathaus + 1;
    const boss = TOWN_HALL_BOSSES[hallLevel];
    const bossMissing = boss !== undefined && (this.bossKills[boss.enemy] ?? 0) === 0;
    if (id === 'rathaus' && bossMissing) {
      return { nextLevel, cost, blocked: 'boss', reason: `Besiege ${boss.name} (${boss.where})` };
    }
    if (id !== 'rathaus' && nextLevel > this.levels.rathaus) {
      const hint = bossMissing ? ` – besiege ${boss.name}` : '';
      return { nextLevel, cost, blocked: 'rathaus', reason: `Braucht Rathaus Stufe ${nextLevel}${hint}` };
    }
    if (this.inventory.gold < cost) {
      return { nextLevel, cost, blocked: 'gold', reason: `Dir fehlen ${cost - this.inventory.gold} Gold` };
    }
    return { nextLevel, cost, blocked: null, reason: '' };
  }

  /** Baut das Gebäude um eine Stufe aus und zieht das Gold ab. Gibt false zurück, wenn es nicht geht. */
  upgrade(id: BuildingId): boolean {
    const info = this.upgradeInfo(id);
    if (info.blocked) return false;
    this.levels[id] = info.nextLevel;
    this.effects = townEffects(this.levels);
    this.inventory.spendGold(info.cost);
    this.onChange(id);
    return true;
  }

  /** Ein Boss wurde besiegt. `type` = sein Gegnertyp aus src/data/enemies.ts. */
  recordBossKill(type: string): void {
    this.bossKills[type] = (this.bossKills[type] ?? 0) + 1;
    this.onChange(null);
  }
}
