import type Phaser from 'phaser';
import { QUEST_UI } from '../data/quests';
import type { Point } from '../world/Grid';
import type { Interactable } from '../world/Interactable';

/**
 * Eine Kiste, die man für eine Sammel-Quest einsammelt (POI-Art `questkiste` im Bauplan).
 * Sie ist nur zu sehen und anklickbar, solange ihre Quest läuft und sie noch nicht
 * mitgenommen wurde (das regelt WorldScene.refreshQuestWorld über `setVisible`).
 * Kein Hindernis: Die Figur läuft auf die Kachel und nimmt die Kiste dabei mit.
 */
export class QuestCrate implements Interactable {
  readonly pos: Point;
  readonly standAt: Point;
  readonly range = QUEST_UI.crateRange;
  visible = false;
  private readonly image: Phaser.GameObjects.Image;
  private readonly glow: Phaser.GameObjects.Ellipse;

  /** `name` = Name des POI in der Karte, `quest` = Schlüssel der Quest, zu der die Kiste gehört. */
  constructor(
    private readonly scene: Phaser.Scene,
    readonly name: string,
    readonly quest: string,
    x: number,
    y: number,
    private readonly onTake: (crate: QuestCrate) => void,
  ) {
    this.pos = { x, y };
    this.standAt = { x, y };
    const depth = 10 + y / 10000;
    // Ein heller Fleck in der Quest-Farbe pulsiert darunter, damit man die Kiste im Lager findet.
    this.glow = scene.add.ellipse(x, y + 4, 16, 8, Number.parseInt(QUEST_UI.markColor.slice(1), 16), 0.5).setDepth(5).setVisible(false);
    scene.tweens.add({ targets: this.glow, alpha: 0.15, duration: 700, yoyo: true, repeat: -1 });
    this.image = scene.add.image(x, y, 'quest-crate').setDepth(depth).setVisible(false);
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.image.setVisible(visible);
    this.glow.setVisible(visible);
  }

  contains(at: Point): boolean {
    return this.visible && Math.abs(at.x - this.pos.x) <= 9 && Math.abs(at.y - this.pos.y) <= 9;
  }

  use(): void {
    if (this.visible) this.onTake(this);
  }

  destroy(): void {
    this.scene.tweens.killTweensOf(this.glow);
    this.glow.destroy();
    this.image.destroy();
  }
}
