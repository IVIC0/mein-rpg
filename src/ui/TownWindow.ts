import { BUILDINGS, BUILDING_IDS, MAX_BUILDING_LEVEL, type BuildingId } from '../data/town';
import type { Inventory } from '../items/Inventory';
import type { Town } from '../town/Town';
import { byId, iconPosition } from './dom';
import type { Hud } from './Hud';
import { describeBuilding } from './townText';

interface Row {
  id: BuildingId;
  level: HTMLElement;
  now: HTMLElement;
  next: HTMLElement;
  lock: HTMLElement;
  button: HTMLButtonElement;
}

/**
 * Das Fenster "Dorfausbau" (Klick auf den Baumeister): je Gebäude seine Stufe, was es gerade
 * bringt, was die nächste Stufe bringt, der Preis und der Knopf "Ausbauen". Ist der Ausbau
 * gesperrt, steht der Grund da. Das Grundgerüst steht in index.html, die Regeln in
 * src/town/Town.ts, alle Werte in src/data/town.ts.
 */
export class TownWindow {
  private readonly root = byId('town');
  private readonly gold = byId('town-gold');
  private readonly rows: Row[] = [];

  constructor(
    private readonly town: Town,
    private readonly inventory: Inventory,
    private readonly hud: Hud,
  ) {
    const list = byId('town-list');
    for (const id of BUILDING_IDS) {
      const def = BUILDINGS[id];
      const row = document.createElement('div');
      row.className = 'town-row';
      row.innerHTML = `
        <span class="town-icon"><span class="sprite-icon" style="background-position: ${iconPosition(def.icon)}"></span></span>
        <div class="town-info">
          <div class="town-name"><b>${def.name}</b><span class="town-level"></span></div>
          <div class="town-summary">${def.summary}</div>
          <div class="town-now"></div>
          <div class="town-next"></div>
          <div class="town-lock"></div>
        </div>
        <button class="town-upgrade" type="button"></button>`;
      list.appendChild(row);
      const button = row.querySelector('.town-upgrade') as HTMLButtonElement;
      button.addEventListener('click', () => {
        if (this.town.upgrade(id)) this.hud.flash(`${def.name} ist jetzt Stufe ${this.town.levels[id]}`);
        button.blur();
      });
      this.rows.push({
        id,
        level: row.querySelector('.town-level') as HTMLElement,
        now: row.querySelector('.town-now') as HTMLElement,
        next: row.querySelector('.town-next') as HTMLElement,
        lock: row.querySelector('.town-lock') as HTMLElement,
        button,
      });
    }
    byId('town-close').addEventListener('click', () => this.close());
  }

  get isOpen(): boolean {
    return !this.root.hidden;
  }

  open(): void {
    this.root.hidden = false;
    this.render();
  }

  close(): void {
    this.root.hidden = true;
  }

  /** Zeichnet alle Zeilen neu. Aufrufen, wenn sich Gold, eine Stufe oder ein Boss-Sieg geändert hat. */
  render(): void {
    if (!this.isOpen) return;
    const levels = this.town.levels;
    for (const row of this.rows) {
      const level = levels[row.id];
      const info = this.town.upgradeInfo(row.id);
      const atMax = info.blocked === 'max';
      row.level.textContent = level === 0 ? 'nicht ausgebaut' : `Stufe ${level} / ${MAX_BUILDING_LEVEL}`;
      row.now.textContent = `Jetzt: ${describeBuilding(row.id, level, levels)}`;
      row.next.textContent = atMax ? '' : `Stufe ${info.nextLevel}: ${describeBuilding(row.id, info.nextLevel, levels)}`;
      // Zu wenig Gold steht schon am Knopf (roter Preis) – der Text nennt die anderen Gründe.
      row.lock.textContent = info.blocked === 'gold' ? '' : info.reason;
      row.button.innerHTML = atMax ? 'Fertig' : `Ausbauen<br /><span>${info.cost} Gold</span>`;
      row.button.disabled = info.blocked !== null;
      row.button.title = info.reason;
      row.button.classList.toggle('too-expensive', info.blocked === 'gold');
    }
    this.gold.textContent = `${this.inventory.gold} Gold`;
  }
}
