import Phaser from 'phaser';
import { Combat } from '../combat/Combat';
import { HOLD_DELAY_MS, TILE, zoomForViewport } from '../config';
import { ENEMIES } from '../data/enemies';
import { RARITIES } from '../data/items';
import { SKILLS } from '../data/warrior';
import { Actor } from '../entities/Actor';
import { Enemy } from '../entities/Enemy';
import { Player } from '../entities/Player';
import { generateItem } from '../items/generator';
import { GroundLoot } from '../items/GroundLoot';
import { Inventory } from '../items/Inventory';
import { FloatingText } from '../ui/FloatingText';
import { Hud } from '../ui/Hud';
import { InventoryWindow } from '../ui/InventoryWindow';
import { Nameplates } from '../ui/Nameplates';
import { SettingsMenu } from '../ui/SettingsMenu';
import { byId } from '../ui/dom';
import { Grid, type Point } from '../world/Grid';
import { findWaypoints } from '../world/pathfinding';

/** Längere Aussetzer (z. B. Tab im Hintergrund) zählen höchstens so viel (Millisekunden). */
const MAX_FRAME_MS = 100;

/**
 * Die Spielwelt: Karte, Spielfigur, Gegner, Kamera und Steuerung.
 * Die Kampfregeln selbst stehen in src/combat/Combat.ts.
 *
 * Steuerung mit der linken Maustaste:
 * - Klick auf einen Gegner: als Ziel wählen, hinlaufen, automatisch angreifen.
 * - Klick auf begehbaren Boden: Figur läuft mit Wegfindung dorthin.
 * - Klick auf ein Hindernis: nichts passiert, ein rotes X zeigt das an.
 * - Gedrückt halten: Figur läuft direkt dem Mauszeiger nach und rutscht an
 *   Hindernissen entlang. Loslassen = stehen bleiben.
 *
 * Skills lösen von selbst aus (siehe Combat). I oder C öffnet Charakter & Inventar.
 * Esc schließt das Fenster (wenn es nicht angepinnt ist) bzw. hebt die Zielauswahl auf.
 */
export class WorldScene extends Phaser.Scene {
  private grid!: Grid;
  private player!: Player;
  private combat!: Combat;
  private floaters!: FloatingText;
  private inventoryWindow!: InventoryWindow;
  private nameplates!: Nameplates;
  private settings!: SettingsMenu;
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
    this.player = new Player(this, spawn.x, spawn.y);

    // Jeder Punkt auf der Ebene "Gegner" ist ein Gegner; der Name des Punkts ist sein Typ.
    const enemies = (map.getObjectLayer('Gegner')?.objects ?? []).map((object) => {
      const def = ENEMIES[object.name];
      if (!def || object.x === undefined || object.y === undefined) throw new Error(`Unbekannter Gegner "${object.name}" in der Karte.`);
      return new Enemy(this, def, enemyLevel(object), object.x, object.y);
    });

    // Zum Testen: ?stufe=5 an die Adresse hängen, dann startet die Figur auf Stufe 5.
    const startLevel = Number(new URLSearchParams(window.location.search).get('stufe'));
    if (startLevel > 1) this.player.setLevel(startLevel);

    this.floaters = new FloatingText(byId('floaters'));
    this.nameplates = new Nameplates(byId('nameplates'), enemies);
    const hud = new Hud(SKILLS);

    // Inventar und Ausrüstung: nach jeder Änderung bekommt die Figur ihre neuen Werte.
    const inventory = new Inventory();
    this.inventoryWindow = new InventoryWindow(inventory, this.player, hud);
    this.settings = new SettingsMenu(() => this.inventoryWindow.resetLayout());
    inventory.onChange = () => {
      this.player.setGear(inventory.equippedStats(), inventory.equipped.weapon?.icon ?? null);
      this.inventoryWindow.render();
    };
    // Zum Testen: ?beute=10 legt 10 gewürfelte Items ins Inventar, von jeder Seltenheit reihum.
    const testItems = Number(new URLSearchParams(window.location.search).get('beute'));
    for (let i = 0; i < testItems; i++) inventory.add(generateItem(this.player.level, RARITIES[i % RARITIES.length].id));

    const loot = new GroundLoot(this, inventory, hud, this.floaters);
    this.combat = new Combat(this, this.grid, this.player, enemies, hud, this.floaters, { x: spawn.x, y: spawn.y }, inventory, loot);

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

    this.input.keyboard?.on('keydown-ESC', () => {
      // Esc schließt erst die Einstellungen, dann das Inventar (außer es ist angepinnt), sonst hebt es das Ziel auf.
      if (this.settings.isOpen) this.settings.close();
      else if (this.inventoryWindow.isOpen && !this.inventoryWindow.pinned) this.inventoryWindow.close();
      else this.combat.clearTarget();
    });
    this.input.keyboard?.on('keydown-I', () => this.inventoryWindow.toggle());
    this.input.keyboard?.on('keydown-C', () => this.inventoryWindow.toggle());

    // Schadenszahlen erst nach dem Zeichnen platzieren: dann steht die Kamera für diesen Frame fest.
    this.events.on(Phaser.Scenes.Events.RENDER, this.renderFloaters, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.applyZoom, this);
      this.game.events.off(Phaser.Core.Events.BLUR, this.cancelPress, this);
      this.events.off(Phaser.Scenes.Events.RENDER, this.renderFloaters, this);
    });
  }

  update(time: number, rawDelta: number): void {
    const delta = Math.min(rawDelta, MAX_FRAME_MS);
    const cursor = this.input.activePointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;

    // Erst die Kampfregeln (Gegner, Angriffe, Ziel verfolgen), dann die Bewegung der Figur.
    this.combat.update(delta);
    this.inventoryWindow.update();

    if (!this.player.alive) {
      this.cancelPress();
      this.player.step(delta);
    } else if (this.pressedAt >= 0 && time - this.pressedAt >= HOLD_DELAY_MS) {
      // Maustaste wird gehalten: direkt dem Mauszeiger nachlaufen.
      this.steering = true;
      this.combat.disengage();
      this.player.steerToward(cursor, this.grid, delta);
    } else {
      this.player.step(delta);
    }
    this.followPlayer();

    // Über einem Gegner wird der Mauszeiger zur Hand.
    this.input.setDefaultCursor(this.player.alive && this.combat.enemyAt(cursor) ? 'pointer' : 'default');
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (!pointer.leftButtonDown() || !this.player.alive) return;
    const world = pointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;

    const enemy = this.combat.enemyAt(world);
    if (enemy) {
      this.cancelPress();
      this.combat.engage(enemy);
      return;
    }

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

  private renderFloaters(): void {
    this.floaters.render(this.cameras.main);
    this.nameplates.render(this.cameras.main, this.player, this.combat.target, this.settings.values.showAllNameplates);
  }

  private applyZoom(): void {
    const zoom = zoomForViewport(this.scale.width, this.scale.height);
    this.cameras.main.setZoom(zoom);
    Actor.pixelStep = 1 / zoom;
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
    this.combat.disengage(); // ab jetzt bestimmt der Klick den Weg, nicht mehr das Ziel
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

/** Liest die Stufe eines Gegners aus der Karte (Eigenschaft "level" des Punkts); ohne Angabe Stufe 1. */
function enemyLevel(object: Phaser.Types.Tilemaps.TiledObject): number {
  const properties: unknown = object.properties;
  if (!Array.isArray(properties)) return 1;
  const level = (properties as { name: string; value: unknown }[]).find((property) => property.name === 'level')?.value;
  return typeof level === 'number' ? level : 1;
}
