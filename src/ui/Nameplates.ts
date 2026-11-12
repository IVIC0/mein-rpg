import type Phaser from 'phaser';
import { isTrivial } from '../data/progression';
import type { Enemy } from '../entities/Enemy';
import type { Player } from '../entities/Player';

/** So weit (Welt-Pixel) sitzt das Schild über dem Standpunkt des Gegners – knapp über seinem Kopf. */
const OFFSET_Y = 13;

/** Schilder knapp außerhalb des Bildes werden noch gezeichnet (Bildschirm-Pixel), damit sie nicht aufploppen. */
const MARGIN = 60;

interface Plate {
  enemy: Enemy;
  root: HTMLElement;
  level: HTMLElement;
  fill: HTMLElement;
  visible: boolean;
  /** Zuletzt eingetragene Balkenbreite in Prozent – geschrieben wird nur bei Änderung. */
  percent: number;
}

/**
 * Namensschilder: Name, Stufe und Lebensbalken direkt über jedem Gegner.
 * Wie die Schadenszahlen sind es HTML-Elemente über dem Spielbild, damit die Schrift scharf bleibt.
 */
export class Nameplates {
  private readonly plates: Plate[];

  constructor(root: HTMLElement, enemies: Enemy[]) {
    this.plates = enemies.map((enemy) => {
      const element = document.createElement('div');
      element.className = 'nameplate';
      element.hidden = true;
      element.innerHTML = `
        <span class="nameplate-name">${enemy.def.name}</span><span class="nameplate-level">${enemy.level}</span>
        <div class="nameplate-bar"><div class="nameplate-fill"></div></div>`;
      root.appendChild(element);
      return {
        enemy,
        root: element,
        level: element.querySelector('.nameplate-level') as HTMLElement,
        fill: element.querySelector('.nameplate-fill') as HTMLElement,
        visible: false,
        percent: -1,
      };
    });
  }

  /**
   * Setzt alle Schilder an ihre Bildschirm-Position. Einmal pro Frame nach dem Zeichnen aufrufen.
   * `showAll` = false: nur das Ziel, Angreifer und verletzte Gegner bekommen ein Schild.
   */
  render(camera: Phaser.Cameras.Scene2D.Camera, player: Player, target: Enemy | null, showAll: boolean): void {
    for (const plate of this.plates) {
      const enemy = plate.enemy;
      // Welt → Bildschirm: die Kamera zoomt um die Bildmitte.
      const x = (enemy.x - camera.scrollX - camera.width / 2) * camera.zoom + camera.width / 2;
      const y = (enemy.y - OFFSET_Y - camera.scrollY - camera.height / 2) * camera.zoom + camera.height / 2;
      const onScreen = x > -MARGIN && x < camera.width + MARGIN && y > -MARGIN && y < camera.height + MARGIN;
      const wanted = showAll || enemy === target || enemy.state === 'chase' || enemy.hp < enemy.maxHp;
      const visible = enemy.state !== 'dead' && onScreen && wanted;

      if (visible !== plate.visible) {
        plate.visible = visible;
        plate.root.hidden = !visible;
      }
      if (!visible) continue;

      plate.root.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) translate(-50%, -100%)`;
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
}
