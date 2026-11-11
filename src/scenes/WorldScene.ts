import Phaser from 'phaser';
import { HOLD_DELAY_MS, TILE, zoomForViewport } from '../config';
import { Player } from '../entities/Player';
import { Grid, type Point } from '../world/Grid';
import { findWaypoints } from '../world/pathfinding';

/**
 * Die Spielwelt: Karte, Spielfigur, Kamera und Maus-Steuerung.
 *
 * Steuerung mit der linken Maustaste:
 * - Klick auf begehbaren Boden: Figur läuft mit Wegfindung dorthin.
 * - Klick auf ein Hindernis: nichts passiert, ein rotes X zeigt das an.
 * - Gedrückt halten: Figur läuft direkt dem Mauszeiger nach und rutscht an
 *   Hindernissen entlang. Loslassen = stehen bleiben.
 */
export class WorldScene extends Phaser.Scene {
  private grid!: Grid;
  private player!: Player;
  private clickMarker!: Phaser.GameObjects.Image;
  private blockedMarker!: Phaser.GameObjects.Image;

  /** Zeitpunkt, zu dem die linke Maustaste gedrückt wurde; -1 = nicht gedrückt. */
  private pressedAt = -1;
  private pressPoint: Point = { x: 0, y: 0 };
  /** Hat der Mausdruck einen Weg ausgelöst (begehbare, erreichbare Stelle)? */
  private pressStartedWalk = false;
  /** Läuft die Figur gerade direkt dem Mauszeiger nach? */
  private steering = false;

  constructor() {
    super('World');
  }

  create(): void {
    const map = this.make.tilemap({ key: 'map-gruenwald' });
    const tileset = map.addTilesetImage('gruenwald', 'tiles-gruenwald', TILE, TILE, 1, 2);
    if (!tileset) throw new Error('Tileset "gruenwald" fehlt in der Karte.');

    map.createLayer('Boden', tileset);
    map.createLayer('Deko', tileset);
    const objects = map.createLayer('Objekte', tileset);
    if (!objects) throw new Error('Ebene "Objekte" fehlt in der Karte.');

    // Alles auf der Ebene "Objekte" ist ein Hindernis.
    const blocked = new Uint8Array(map.width * map.height);
    objects.forEachTile((tile) => {
      if (tile.index !== -1) blocked[tile.y * map.width + tile.x] = 1;
    });
    this.grid = new Grid(map.width, map.height, blocked);

    const spawn = map.findObject('Marker', (object) => object.name === 'spawn');
    if (!spawn || spawn.x === undefined || spawn.y === undefined) throw new Error('Marker "spawn" fehlt in der Karte.');
    this.player = new Player(this, spawn.x, spawn.y).setDepth(10);

    this.clickMarker = this.add.image(0, 0, 'click-marker').setOrigin(0).setDepth(5).setVisible(false);
    this.blockedMarker = this.add.image(0, 0, 'blocked-marker').setOrigin(0).setDepth(20).setVisible(false);

    // Die Kamera wird in update() selbst nachgeführt (siehe followPlayer). Phasers
    // eingebautes Runden ist aus, weil es auf ganze Welt-Pixel rundet – bei
    // 3-fachem Zoom würde das Bild dann in 3-Pixel-Sprüngen ruckeln.
    const camera = this.cameras.main;
    camera.setRoundPixels(false);
    camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.applyZoom();
    this.followPlayer();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.applyZoom, this);

    this.input.mouse?.disableContextMenu();
    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
    this.input.on(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);
    this.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onPointerUp, this);
    // Fenster verliert den Fokus (z. B. Alt+Tab): Maustaste gilt als losgelassen.
    this.game.events.on(Phaser.Core.Events.BLUR, this.cancelPress, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.applyZoom, this);
      this.game.events.off(Phaser.Core.Events.BLUR, this.cancelPress, this);
    });
  }

  update(time: number, delta: number): void {
    if (this.pressedAt >= 0 && time - this.pressedAt >= HOLD_DELAY_MS) {
      // Maustaste wird gehalten: direkt dem Mauszeiger nachlaufen.
      this.steering = true;
      const cursor = this.input.activePointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;
      this.player.steerToward(cursor, this.grid, delta);
    } else {
      this.player.step(delta);
    }
    this.followPlayer();
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (!pointer.leftButtonDown()) return;
    const world = pointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;
    this.pressedAt = this.time.now;
    this.pressPoint = { x: world.x, y: world.y };
    this.pressStartedWalk = this.walkTo(this.pressPoint);
    this.steering = false;
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    if (this.pressedAt < 0 || pointer.leftButtonDown()) return;
    // Kurzer Klick auf eine Stelle, zu der es keinen Weg gibt: rotes X statt Bewegung.
    if (!this.steering && !this.pressStartedWalk) this.flashMarker(this.blockedMarker, this.pressPoint, 300, 200);
    this.cancelPress();
  }

  /** Beendet den aktuellen Mausdruck. War die Figur im Direktlauf, bleibt sie stehen. */
  private cancelPress(): void {
    if (this.steering) this.player.stop();
    this.pressedAt = -1;
    this.steering = false;
  }

  private applyZoom(): void {
    const zoom = zoomForViewport(this.scale.width, this.scale.height);
    this.cameras.main.setZoom(zoom);
    this.player.pixelStep = 1 / zoom;
  }

  /** Hält die Figur in der Bildmitte; am Kartenrand stoppt die Kamera von selbst. */
  private followPlayer(): void {
    const camera = this.cameras.main;
    camera.setScroll(this.player.x - camera.width / 2, this.player.y - camera.height / 2);
  }

  /**
   * Schickt die Figur mit Wegfindung zu `target`. Gibt false zurück, wenn es
   * dorthin keinen Weg gibt (Hindernis, außerhalb der Karte, abgeschnittenes Gebiet).
   */
  private walkTo(target: Point): boolean {
    const waypoints = findWaypoints(this.grid, this.player.pos, target);
    if (!waypoints || waypoints.length === 0) return false;
    this.player.walkAlong(waypoints);
    this.flashMarker(this.clickMarker, waypoints[waypoints.length - 1], 0, 450);
    return true;
  }

  /** Zeigt einen Marker an der Stelle `at`: erst `holdMs` voll sichtbar, dann in `fadeMs` ausblenden. */
  private flashMarker(marker: Phaser.GameObjects.Image, at: Point, holdMs: number, fadeMs: number): void {
    this.tweens.killTweensOf(marker);
    // Die Marker sind 9 × 9 Pixel groß: 4 nach links/oben versetzt liegen sie mittig auf dem Punkt.
    marker.setPosition(Math.round(at.x) - 4, Math.round(at.y) - 4).setAlpha(1).setVisible(true);
    this.tweens.add({
      targets: marker,
      alpha: 0,
      delay: holdMs,
      duration: fadeMs,
      onComplete: () => marker.setVisible(false),
    });
  }
}
