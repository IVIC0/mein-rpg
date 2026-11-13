import { TILE } from '../config';
import { MINIMAP } from '../data/minimap';
import { WORLD_MAP } from '../data/worldmap';
import type { Enemy } from '../entities/Enemy';
import type { Point } from '../world/Grid';
import { byId } from './dom';
import type { MinimapMark } from './Minimap';
import type { Settings } from './settings';

/** Ein Ortsname auf der Karte (z. B. "Ruine"): Platz in Welt-Pixeln und Text. */
export interface MapLabel {
  pos: Point;
  text: string;
}

/** Die Zeichenfläche ist höchstens so viel feiner als ihre Größe auf dem Bildschirm (scharf auf Handy-Displays). */
const MAX_PIXEL_RATIO = 2;

/** Was unter der Karte erklärt wird: Farbe des Punkts und Text. */
const LEGEND: { color: string; text: string }[] = [
  { color: MINIMAP.playerColor, text: 'Du' },
  { color: MINIMAP.enemies.normal.color, text: 'Gegner' },
  { color: MINIMAP.enemies.elite.color, text: 'Elite' },
  { color: MINIMAP.enemies.boss.color, text: 'Boss' },
  { color: MINIMAP.merchantColor, text: 'Händler' },
  { color: MINIMAP.builderColor, text: 'Baumeister' },
  { color: MINIMAP.chestColor, text: 'Truhe' },
  { color: MINIMAP.portalColor, text: 'Übergang' },
  { color: WORLD_MAP.goalColor, text: 'Ziel' },
];

/**
 * Die große Karte der aktuellen Zone (Taste M oder der Knopf in der Leiste oben rechts).
 * Sie zeigt die ganze Zone: Gelände, Ortsnamen, eigene Figur, Gegner, Händler, Truhen, Übergänge.
 * Ein Klick (oder Tippen) auf die Karte schickt die Figur dorthin – das meldet `onWalk`,
 * den Weg sucht die Spielwelt (WorldScene.autoWalkTo).
 *
 * Alles kommt aus der Karte der Zone: Das Gelände ist dasselbe Bild wie bei der Minimap,
 * die Ortsnamen stehen als `label` im Bauplan. Werte: src/data/worldmap.ts.
 * Die Karte passt sich dem Bildschirm an und ragt nie über den Rand (auch im Handy-Querformat).
 */
export class WorldMap {
  private readonly root = byId('worldmap');
  private readonly button = byId('worldmap-button');
  private readonly title = byId('worldmap-title');
  private readonly canvas = byId('worldmap-canvas') as HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private terrain: HTMLCanvasElement | null = null;
  private labels: MapLabel[] = [];
  /** Zeichen-Pixel je Bildschirm-Pixel (siehe layout). */
  private ratio = 1;

  /** Wird mit dem angeklickten Punkt (Welt-Pixel) aufgerufen. */
  onWalk: (target: Point) => void = () => {};

  constructor(private readonly settings: Settings) {
    const context = this.canvas.getContext('2d');
    if (!context) throw new Error('Die Karte lässt sich nicht zeichnen.');
    this.context = context;

    const legend = byId('worldmap-legend');
    for (const entry of LEGEND) {
      const item = document.createElement('span');
      const dot = document.createElement('i');
      dot.style.background = entry.color;
      item.append(dot, entry.text);
      legend.appendChild(item);
    }
    const hint = document.createElement('span');
    hint.className = 'worldmap-hint';
    hint.textContent = 'Klick auf die Karte: hinlaufen';
    legend.appendChild(hint);

    this.button.addEventListener('click', () => {
      this.toggle();
      this.button.blur();
    });
    byId('worldmap-close').addEventListener('click', () => this.close());
    // "click" kommt bei der Maus und beim Tippen mit dem Finger.
    this.canvas.addEventListener('click', (event) => this.onClick(event));
    window.addEventListener('resize', () => this.layout());
  }

  /** Neue Zone: ihr Gelände (1 Pixel pro Kachel), ihre Überschrift und ihre Ortsnamen. */
  setZone(terrain: HTMLCanvasElement, title: string, labels: MapLabel[]): void {
    this.terrain = terrain;
    this.labels = labels;
    this.title.textContent = title;
    this.layout();
  }

  get isOpen(): boolean {
    return !this.root.hidden;
  }

  toggle(): void {
    if (this.isOpen) this.close();
    else this.open();
  }

  open(): void {
    this.root.hidden = false;
    this.button.classList.add('active');
    this.layout();
  }

  close(): void {
    this.root.hidden = true;
    this.button.classList.remove('active');
  }

  /** Übernimmt Größe und Deckkraft aus den Einstellungen. */
  applySettings(): void {
    this.layout();
  }

  /**
   * Legt die Größe der Karte fest: so groß, wie es die Einstellung will – aber immer so,
   * dass das ganze Fenster (mit Titel und Erklärung) in den Bildschirm passt.
   */
  private layout(): void {
    this.root.style.opacity = `${this.settings.worldMap.opacity}`;
    const terrain = this.terrain;
    if (!terrain || !this.isOpen) return;
    const aspect = terrain.width / terrain.height;
    const maxWidth = window.innerWidth - 2 * WORLD_MAP.margin;
    const maxHeight = window.innerHeight - 2 * WORLD_MAP.margin;
    // Anteil des Bildschirms, den das Fenster füllen darf – auf kleinen Bildschirmen immer alles.
    const small = window.innerHeight < WORLD_MAP.smallScreenHeight;
    const share = small ? 1 : Math.min(1, WORLD_MAP.fill * this.settings.worldMap.scale);

    // Erst nach der Breite. Rahmen, Titel und Erklärung brauchen auch Platz – der wird gemessen.
    const frameWidth = this.root.offsetWidth - this.canvas.offsetWidth;
    let width = Math.max(40, maxWidth * share - frameWidth);
    // Dann die Höhe prüfen. Wird die Karte schmaler, kann die Erklärung umbrechen und höher werden:
    // deshalb höchstens dreimal nachmessen.
    for (let pass = 0; pass < 3; pass++) {
      this.canvas.style.width = `${Math.floor(width)}px`;
      this.canvas.style.height = `${Math.floor(width / aspect)}px`;
      const frameHeight = this.root.offsetHeight - this.canvas.offsetHeight;
      const allowed = Math.max(30, maxHeight * share - frameHeight);
      if (width / aspect <= allowed + 0.5) break;
      width = allowed * aspect;
    }

    this.ratio = Math.min(MAX_PIXEL_RATIO, window.devicePixelRatio || 1);
    this.canvas.width = Math.max(1, Math.round(this.canvas.offsetWidth * this.ratio));
    this.canvas.height = Math.max(1, Math.round(this.canvas.offsetHeight * this.ratio));
  }

  /** Klick oder Tippen auf die Karte: den Punkt in Welt-Pixel umrechnen und melden. */
  private onClick(event: MouseEvent): void {
    const terrain = this.terrain;
    if (!terrain) return;
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const x = ((event.clientX - rect.left) / rect.width) * terrain.width * TILE;
    const y = ((event.clientY - rect.top) / rect.height) * terrain.height * TILE;
    this.onWalk({ x, y });
  }

  /**
   * Zeichnet die Karte neu (nur nötig, solange sie offen ist). `player` = Platz der Figur in
   * Welt-Pixeln, `marks` = die festen Punkte der Zone (wie bei der Minimap), `goal` = Ziel des
   * Automatiklaufs oder null.
   */
  render(player: Point, enemies: readonly Enemy[], marks: readonly MinimapMark[], goal: Point | null): void {
    const terrain = this.terrain;
    if (!terrain || !this.isOpen) return;
    const context = this.context;
    const ratio = this.ratio;
    // So viele Zeichen-Pixel ist ein Welt-Pixel breit.
    const scale = this.canvas.width / (terrain.width * TILE);

    context.imageSmoothingEnabled = false; // harte Kanten, passend zur Pixel-Grafik
    context.drawImage(terrain, 0, 0, this.canvas.width, this.canvas.height);

    const dot = (at: Point, color: string, radius: number): void => {
      context.beginPath();
      context.arc(at.x * scale, at.y * scale, radius * WORLD_MAP.dotScale * ratio, 0, Math.PI * 2);
      context.fillStyle = color;
      context.fill();
      context.lineWidth = ratio;
      context.strokeStyle = '#000000';
      context.stroke();
    };

    for (const mark of marks) dot(mark.pos, mark.color, mark.radius);
    for (const enemy of enemies) {
      if (enemy.state === 'dead') continue;
      const look = MINIMAP.enemies[enemy.rank];
      dot(enemy.pos, look.color, look.radius);
    }

    // Ortsnamen: mittig über dem Ort, mit dunklem Rand, damit sie auf jedem Gelände lesbar sind.
    const pixelsPerTile = (scale * TILE) / ratio; // Bildschirm-Pixel je Kachel
    const size = Math.min(WORLD_MAP.labelMaxSize, Math.max(WORLD_MAP.labelMinSize, pixelsPerTile * 1.8));
    context.font = `bold ${size * ratio}px 'Trebuchet MS', Verdana, sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.lineJoin = 'round';
    for (const label of this.labels) {
      // Am Rand der Karte rückt der Name so weit herein, dass er ganz zu lesen ist.
      const half = context.measureText(label.text).width / 2 + 2 * ratio;
      const x = Math.min(this.canvas.width - half, Math.max(half, label.pos.x * scale));
      const y = Math.max(size * ratio, (label.pos.y - WORLD_MAP.labelRaise * TILE) * scale);
      context.lineWidth = 3 * ratio;
      context.strokeStyle = 'rgba(0, 0, 0, 0.85)';
      context.strokeText(label.text, x, y);
      context.fillStyle = WORLD_MAP.labelColor;
      context.fillText(label.text, x, y);
    }

    // Ziel des Automatiklaufs: ein Ring mit Punkt.
    if (goal) {
      context.beginPath();
      context.arc(goal.x * scale, goal.y * scale, WORLD_MAP.goalRadius * ratio, 0, Math.PI * 2);
      context.lineWidth = 4 * ratio;
      context.strokeStyle = '#000000';
      context.stroke();
      context.lineWidth = 2 * ratio;
      context.strokeStyle = WORLD_MAP.goalColor;
      context.stroke();
      dot(goal, WORLD_MAP.goalColor, 1.5);
    }

    // Die eigene Figur zuletzt, damit sie nie verdeckt ist: weißer Punkt mit hellem Ring.
    context.beginPath();
    context.arc(player.x * scale, player.y * scale, (MINIMAP.playerRadius * WORLD_MAP.dotScale + 3) * ratio, 0, Math.PI * 2);
    context.lineWidth = 1.5 * ratio;
    context.strokeStyle = MINIMAP.playerColor;
    context.stroke();
    dot(player, MINIMAP.playerColor, MINIMAP.playerRadius);
  }
}
