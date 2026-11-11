import Phaser from 'phaser';
import { CLICK_SEARCH_RADIUS, TILE, zoomForViewport } from '../config';
import { Player } from '../entities/Player';
import { Grid, type Point } from '../world/Grid';
import { findWaypoints } from '../world/pathfinding';

/** Bei gedrückter Maustaste wird das Ziel höchstens so oft neu berechnet (Millisekunden). */
const HOLD_REPATH_MS = 120;

/** Die Spielwelt: Karte, Spielfigur, Kamera und Klick-Steuerung. */
export class WorldScene extends Phaser.Scene {
  private grid!: Grid;
  private player!: Player;
  private clickMarker!: Phaser.GameObjects.Image;
  private lastRepath = 0;

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

    // Die Kamera wird in update() selbst nachgeführt (siehe followPlayer). Phasers
    // eingebautes Runden ist aus, weil es auf ganze Welt-Pixel rundet – bei
    // 3-fachem Zoom würde das Bild dann in 3-Pixel-Sprüngen ruckeln.
    const camera = this.cameras.main;
    camera.setRoundPixels(false);
    camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.applyZoom();
    this.followPlayer();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.applyZoom, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, this.applyZoom, this));

    this.input.mouse?.disableContextMenu();
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown()) this.walkTo(pointer, true);
    });
  }

  update(time: number, delta: number): void {
    // Maustaste gehalten: der Figur laufend ein neues Ziel unter dem Mauszeiger geben.
    const pointer = this.input.activePointer;
    if (pointer.leftButtonDown() && time - this.lastRepath > HOLD_REPATH_MS) {
      this.walkTo(pointer, false);
    }
    this.player.step(delta);
    this.followPlayer();
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

  private walkTo(pointer: Phaser.Input.Pointer, showMarker: boolean): void {
    this.lastRepath = this.time.now;
    const world = pointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;
    const target = this.reachableTarget(world);
    if (!target) return;

    const waypoints = findWaypoints(this.grid, this.player.pos, target);
    if (!waypoints || waypoints.length === 0) return;
    this.player.walkAlong(waypoints);
    if (showMarker) this.flashClickMarker(waypoints[waypoints.length - 1]);
  }

  /**
   * Übersetzt einen Klickpunkt in ein Ziel, das die Figur wirklich erreichen kann.
   * Klick auf Baum, Haus oder außerhalb der Karte → nächste erreichbare Kachel.
   */
  private reachableTarget(world: Point): Point | null {
    const tx = Grid.toTile(world.x);
    const ty = Grid.toTile(world.y);
    const playerRegion = this.grid.regionAt(Grid.toTile(this.player.pos.x), Grid.toTile(this.player.pos.y));
    if (this.grid.regionAt(tx, ty) === playerRegion) return world;

    const nearest = this.grid.nearestInRegion(tx, ty, playerRegion, CLICK_SEARCH_RADIUS);
    return nearest ? { x: Grid.tileCenter(nearest.tx), y: Grid.tileCenter(nearest.ty) } : null;
  }

  private flashClickMarker(at: Point): void {
    this.tweens.killTweensOf(this.clickMarker);
    // Der Marker ist 9 × 9 Pixel groß: 4 nach links/oben versetzt liegt er mittig auf dem Ziel.
    this.clickMarker.setPosition(Math.round(at.x) - 4, Math.round(at.y) - 4).setAlpha(1).setVisible(true);
    this.tweens.add({
      targets: this.clickMarker,
      alpha: 0,
      duration: 450,
      onComplete: () => this.clickMarker.setVisible(false),
    });
  }
}
