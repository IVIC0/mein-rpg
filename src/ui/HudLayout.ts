import { byId } from './dom';
import type { Hud } from './Hud';
import { HUD_ITEMS, type HudItemId, type PlateSettings, type Settings } from './settings';

/**
 * Wendet die Einstellungen auf die Anzeigen an (ein-/ausblenden, Größe, Deckkraft, Platz)
 * und steuert den Bearbeitungsmodus, in dem sich die HUD-Elemente mit der Maus ziehen lassen.
 *
 * Der Platz eines Elements ist eine Verschiebung (dx, dy) gegenüber seinem Standard-Platz
 * aus hud.css. So bleibt z. B. die Skill-Leiste auch nach einer Größenänderung des
 * Browserfensters unten in der Mitte verankert.
 */
export class HudLayout {
  private readonly items = HUD_ITEMS.map((item) => ({ id: item.id, element: byId(item.elementId) }));
  private readonly editBar = byId('hud-edit-bar');
  private readonly plates = byId('nameplates');
  private readonly floaters = byId('floaters');

  /** `onChange` wird nach jedem Verschieben aufgerufen (zum Merken). */
  constructor(
    private readonly settings: Settings,
    private readonly hud: Hud,
    private readonly onChange: () => void,
  ) {
    for (const item of this.items) {
      item.element.classList.add('hud-item');
      item.element.addEventListener('pointerdown', (event) => this.startDrag(event, item.id, item.element));
    }
    byId('hud-edit-done').addEventListener('click', () => this.setEditing(false));
    byId('hud-edit-reset').addEventListener('click', () => this.resetPositions());
    // Wird das Browserfenster kleiner, rutschen verschobene Elemente zurück ins Bild.
    window.addEventListener('resize', () => this.apply());
    this.apply();
  }

  get editing(): boolean {
    return this.hud.editing;
  }

  /** Bearbeitungsmodus an/aus: Die Elemente bekommen einen Rahmen und lassen sich ziehen. */
  setEditing(editing: boolean): void {
    this.hud.editing = editing;
    document.body.classList.toggle('hud-edit', editing);
    this.editBar.hidden = !editing;
  }

  /** Alle Elemente zurück an ihren Standard-Platz (Größe und Deckkraft bleiben). */
  private resetPositions(): void {
    for (const item of this.items) {
      this.settings.hud[item.id].dx = 0;
      this.settings.hud[item.id].dy = 0;
    }
    this.apply();
    this.onChange();
  }

  /** Überträgt alle Einstellungen auf die Seite. Nach jeder Änderung aufrufen. */
  apply(): void {
    for (const item of this.items) {
      const values = this.settings.hud[item.id];
      const style = item.element.style;
      item.element.classList.toggle('hud-off', !values.visible);
      style.setProperty('--dx', `${values.dx}px`);
      style.setProperty('--dy', `${values.dy}px`);
      style.setProperty('--scale', `${values.scale}`);
      style.opacity = `${values.opacity}`;
      this.keepInView(item.id, item.element);
    }

    // Schilder: welche Teile zu sehen sind, regelt hud.css über diese Klassen.
    this.applyPlate('player', this.settings.playerPlate);
    this.applyPlate('enemy', this.settings.enemyPlates);

    this.floaters.hidden = !this.settings.floaters.visible;
    this.floaters.style.opacity = `${this.settings.floaters.opacity}`;
  }

  private applyPlate(kind: 'player' | 'enemy', values: PlateSettings): void {
    for (const part of ['name', 'level', 'bar'] as const) {
      this.plates.classList.toggle(`${kind}-no-${part}`, !values[part]);
    }
    this.plates.style.setProperty(`--${kind}-plate-opacity`, `${values.opacity}`);
  }

  /** Schiebt ein Element zurück, wenn es über den Bildrand hinausragt. */
  private keepInView(id: HudItemId, element: HTMLElement): void {
    const values = this.settings.hud[id];
    const rect = element.getBoundingClientRect();
    if (rect.width === 0) return; // gerade nicht zu sehen
    let { dx, dy } = values;
    if (rect.right > window.innerWidth) dx -= rect.right - window.innerWidth;
    if (rect.left < 0) dx -= rect.left;
    if (rect.bottom > window.innerHeight) dy -= rect.bottom - window.innerHeight;
    if (rect.top < 0) dy -= rect.top;
    if (dx === values.dx && dy === values.dy) return;
    values.dx = Math.round(dx);
    values.dy = Math.round(dy);
    element.style.setProperty('--dx', `${values.dx}px`);
    element.style.setProperty('--dy', `${values.dy}px`);
  }

  private startDrag(event: PointerEvent, id: HudItemId, element: HTMLElement): void {
    if (!this.editing || event.button !== 0) return;
    event.preventDefault();
    const values = this.settings.hud[id];
    const start = { x: event.clientX, y: event.clientY, dx: values.dx, dy: values.dy };

    const onMove = (move: PointerEvent): void => {
      values.dx = Math.round(start.dx + move.clientX - start.x);
      values.dy = Math.round(start.dy + move.clientY - start.y);
      element.style.setProperty('--dx', `${values.dx}px`);
      element.style.setProperty('--dy', `${values.dy}px`);
      this.keepInView(id, element);
    };
    const onUp = (): void => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      this.onChange();
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }
}
