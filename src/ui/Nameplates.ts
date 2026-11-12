import type Phaser from 'phaser';
import { RANKS, traitName } from '../data/elites';
import { isTrivial } from '../data/progression';
import type { Enemy } from '../entities/Enemy';
import type { Player } from '../entities/Player';
import type { Settings } from './settings';

/** So weit (Welt-Pixel) sitzt das Schild über dem Kopf des Gegners. */
const GAP_Y = 2;

/** Zeichen vor dem Namen je Rang. */
const RANK_ICON = { normal: '', elite: '★ ', boss: '☠ ' };

/** Schilder knapp außerhalb des Bildes werden noch gezeichnet (Bildschirm-Pixel), damit sie nicht aufploppen. */
const MARGIN = 60;

interface Plate {
  enemy: Enemy;
  root: HTMLElement;
  name: HTMLElement;
  level: HTMLElement;
  traits: HTMLElement;
  fill: HTMLElement;
  /** Für welches Erscheinen des Gegners Name und Rang zuletzt eingetragen wurden. */
  spawnCount: number;
  visible: boolean;
  /** Zuletzt eingetragene Balkenbreite in Prozent – geschrieben wird nur bei Änderung. */
  percent: number;
}

/**
 * Namensschilder: Name, Stufe und Lebensbalken direkt über der eigenen Figur und jedem Gegner.
 * Das eigene Schild ist grün (Name und Balken), damit man es nicht mit einem Gegner verwechselt.
 * Elite und Boss bekommen ein größeres Schild in eigener Farbe, Elites dazu ihre Eigenschaften.
 * Wie die Schadenszahlen sind es HTML-Elemente über dem Spielbild, damit die Schrift scharf bleibt.
 */
export class Nameplates {
  /** Die Schilder der Gegner der aktuellen Zone (setEnemies tauscht sie beim Zonenwechsel aus). */
  private plates: Plate[] = [];
  // Das Schild der eigenen Figur.
  private readonly own: HTMLElement;
  private readonly ownName: HTMLElement;
  private readonly ownLevel: HTMLElement;
  private readonly ownFill: HTMLElement;
  private ownVisible = true;
  private ownPercent = -1;
  /** Schilder für friedliche Figuren und Orte (Händler, Höhleneingang): nur ein Name an einem festen Platz. */
  private labels: { x: number; y: number; root: HTMLElement }[] = [];

  /** `playerName` = Name der eigenen Figur aus dem Spielstand. */
  constructor(
    private readonly root: HTMLElement,
    playerName: string,
  ) {
    this.own = document.createElement('div');
    this.own.className = 'nameplate nameplate-player';
    this.own.innerHTML = `
      <span class="nameplate-name"></span><span class="nameplate-level"></span>
      <div class="nameplate-bar"><div class="nameplate-fill"></div></div>`;
    root.appendChild(this.own);
    this.ownName = this.own.querySelector('.nameplate-name') as HTMLElement;
    this.setPlayerName(playerName);
    this.ownLevel = this.own.querySelector('.nameplate-level') as HTMLElement;
    this.ownFill = this.own.querySelector('.nameplate-fill') as HTMLElement;
  }

  /** Neue Zone: die alten Schilder (Gegner und Orte) weg, eines für jeden Gegner der neuen Zone. */
  setEnemies(enemies: Enemy[]): void {
    for (const plate of this.plates) plate.root.remove();
    for (const label of this.labels) label.root.remove();
    this.labels = [];
    const root = this.root;
    this.plates = enemies.map((enemy) => {
      const element = document.createElement('div');
      element.className = 'nameplate';
      element.hidden = true;
      element.innerHTML = `
        <span class="nameplate-name"></span><span class="nameplate-level">${enemy.level}</span>
        <div class="nameplate-traits"></div>
        <div class="nameplate-bar"><div class="nameplate-fill"></div></div>`;
      root.appendChild(element);
      return {
        enemy,
        root: element,
        name: element.querySelector('.nameplate-name') as HTMLElement,
        level: element.querySelector('.nameplate-level') as HTMLElement,
        traits: element.querySelector('.nameplate-traits') as HTMLElement,
        spawnCount: -1,
        fill: element.querySelector('.nameplate-fill') as HTMLElement,
        visible: false,
        percent: -1,
      };
    });
  }

  /** Ein Namensschild für eine friedliche Figur oder einen Ort am Punkt (x, y), z. B. den Händler. */
  addLabel(x: number, y: number, name: string): void {
    const root = document.createElement('div');
    root.className = 'nameplate nameplate-npc';
    root.textContent = name;
    this.root.appendChild(root);
    this.labels.push({ x, y, root });
  }

  /** Trägt den Namen der eigenen Figur ein (auch nach dem Umbenennen). */
  setPlayerName(name: string): void {
    this.ownName.textContent = name;
  }

  /**
   * Setzt alle Schilder an ihre Bildschirm-Position. Einmal pro Frame nach dem Zeichnen aufrufen.
   * Aus den Einstellungen kommen die Größe der Schilder und `showAll`
   * (false = nur das Ziel, Angreifer und verletzte Gegner bekommen ein Schild).
   * Welche Teile (Name, Stufe, Balken) zu sehen sind, regelt hud.css (Klassen setzt HudLayout).
   */
  render(camera: Phaser.Cameras.Scene2D.Camera, player: Player, target: Enemy | null, settings: Settings): void {
    this.renderOwn(camera, player, settings.playerPlate.scale);
    for (const label of this.labels) {
      const x = (label.x - camera.scrollX - camera.width / 2) * camera.zoom + camera.width / 2;
      const y = (label.y + 5 - 16 - GAP_Y - camera.scrollY - camera.height / 2) * camera.zoom + camera.height / 2;
      label.root.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) translate(-50%, -100%)`;
    }
    const showAll = settings.enemyPlates.showAll;
    const scale = settings.enemyPlates.scale;
    for (const plate of this.plates) {
      const enemy = plate.enemy;
      // Welt → Bildschirm: die Kamera zoomt um die Bildmitte.
      const x = (enemy.x - camera.scrollX - camera.width / 2) * camera.zoom + camera.width / 2;
      const y = (enemy.y + 5 - 16 * enemy.bodyScale - GAP_Y - camera.scrollY - camera.height / 2) * camera.zoom + camera.height / 2;
      const onScreen = x > -MARGIN && x < camera.width + MARGIN && y > -MARGIN && y < camera.height + MARGIN;
      const wanted = showAll || enemy === target || enemy.state === 'chase' || enemy.hp < enemy.maxHp;
      const visible = enemy.state !== 'dead' && onScreen && wanted;

      if (visible !== plate.visible) {
        plate.visible = visible;
        plate.root.hidden = !visible;
      }
      if (!visible) continue;

      // Nach jedem Respawn kann aus dem Gegner eine Elite geworden sein (oder umgekehrt).
      if (plate.spawnCount !== enemy.spawnCount) {
        plate.spawnCount = enemy.spawnCount;
        plate.name.textContent = RANK_ICON[enemy.rank] + enemy.displayName;
        plate.traits.textContent = enemy.traits.map(traitName).join(' · ');
        for (const rank of Object.keys(RANKS)) plate.root.classList.toggle(`rank-${rank}`, rank === enemy.rank);
      }

      plate.root.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) translate(-50%, -100%) scale(${scale})`;
      plate.root.classList.toggle('selected', enemy === target);
      // Rot = deutlich stärker als die Figur, grau = bringt nur noch wenig EP.
      plate.level.classList.toggle('level-high', enemy.level >= player.level + 2);
      plate.level.classList.toggle('level-low', isTrivial(enemy.level, player.level));
      const percent = Math.round((enemy.hp / enemy.maxHp) * 100);
      if (percent !== plate.percent) {
        plate.percent = percent;
        plate.fill.style.width = `${percent}%`;
      }
    }
  }

  /** Das Schild über der eigenen Figur. Liegt sie am Boden, ist es ausgeblendet. */
  private renderOwn(camera: Phaser.Cameras.Scene2D.Camera, player: Player, scale: number): void {
    if (player.alive !== this.ownVisible) {
      this.ownVisible = player.alive;
      this.own.hidden = !player.alive;
    }
    if (!player.alive) return;

    const x = (player.x - camera.scrollX - camera.width / 2) * camera.zoom + camera.width / 2;
    const y = (player.y + 5 - 16 - GAP_Y - camera.scrollY - camera.height / 2) * camera.zoom + camera.height / 2;
    this.own.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) translate(-50%, -100%) scale(${scale})`;

    const level = `${player.level}`;
    if (this.ownLevel.textContent !== level) this.ownLevel.textContent = level;
    const percent = Math.round((player.hp / player.maxHp) * 100);
    if (percent !== this.ownPercent) {
      this.ownPercent = percent;
      this.ownFill.style.width = `${percent}%`;
    }
  }
}
