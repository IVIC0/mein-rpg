import Phaser from 'phaser';
import { Combat } from '../combat/Combat';
import { BODY_RADIUS, HOLD_DELAY_MS, TILE, zoomForViewport } from '../config';
import { DEFAULT_DIFFICULTY, type Difficulty } from '../data/difficulty';
import { NAMED_ELITES, NAMED_ELITE_RESPAWN_MS } from '../data/elites';
import { ENEMIES } from '../data/enemies';
import { RARITIES } from '../data/items';
import { MINIMAP } from '../data/minimap';
import { CHEST, PORTAL } from '../data/pois';
import { AUTOSAVE_INTERVAL_MS, SAVE_DELAY_MS } from '../data/save';
import { MERCHANT } from '../data/shop';
import { SKILLS, WARRIOR } from '../data/warrior';
import { START_ZONE, ZONES, ZONE_FADE_MS } from '../data/zones';
import { Actor } from '../entities/Actor';
import { Chest } from '../entities/Chest';
import { Enemy } from '../entities/Enemy';
import { Merchant } from '../entities/Merchant';
import { Player } from '../entities/Player';
import { Portal } from '../entities/Portal';
import { generateItem, rollRarityFrom } from '../items/generator';
import { GroundLoot } from '../items/GroundLoot';
import { Inventory } from '../items/Inventory';
import { Shop } from '../items/Shop';
import { cleanName, type SaveGame } from '../save/saveGame';
import { readTestParams, session, writeSlot } from '../save/slots';
import { FloatingText } from '../ui/FloatingText';
import { Hud } from '../ui/Hud';
import { HudLayout } from '../ui/HudLayout';
import { InventoryWindow } from '../ui/InventoryWindow';
import { ItemTooltip } from '../ui/ItemTooltip';
import { Minimap, type MinimapMark } from '../ui/Minimap';
import { Nameplates } from '../ui/Nameplates';
import { SaveMenu } from '../ui/SaveMenu';
import { SettingsMenu } from '../ui/SettingsMenu';
import { ShopWindow } from '../ui/ShopWindow';
import { byId } from '../ui/dom';
import { Grid, type Point } from '../world/Grid';
import type { Interactable } from '../world/Interactable';
import { findWaypoints } from '../world/pathfinding';

/** Längere Aussetzer (z. B. Tab im Hintergrund) zählen höchstens so viel (Millisekunden). */
const MAX_FRAME_MS = 100;

/**
 * Die Spielwelt: Karte, Spielfigur, Gegner, Kamera und Steuerung.
 * Die Kampfregeln selbst stehen in src/combat/Combat.ts.
 *
 * Die Welt besteht aus Zonen (src/data/zones.ts). Zu sehen ist immer genau eine:
 * `enterZone` baut sie aus ihrer Karte auf (Gelände, Gegner, besondere Orte), `leaveZone`
 * räumt sie wieder weg. Was ein besonderer Ort (POI) im Spiel tut, steht in `buildPoi`.
 *
 * Steuerung mit der linken Maustaste:
 * - Klick auf einen Gegner: als Ziel wählen, hinlaufen, automatisch angreifen.
 * - Klick auf begehbaren Boden: Figur läuft mit Wegfindung dorthin.
 * - Klick auf ein Hindernis: nichts passiert, ein rotes X zeigt das an.
 * - Gedrückt halten: Figur läuft direkt dem Mauszeiger nach und rutscht an
 *   Hindernissen entlang. Loslassen = stehen bleiben.
 *
 * Klick auf den Händler im Dorf: hinlaufen und handeln. Klick auf eine Truhe: hinlaufen und öffnen.
 * Q oder ein Klick auf das Trank-Feld der Skill-Leiste trinkt einen Heiltrank.
 * Betritt die Figur einen Übergang (z. B. den Höhleneingang), wechselt die Zone.
 *
 * Oben rechts zeigt die Minimap Gelände, Gegner, Händler, Truhen und Übergänge (src/ui/Minimap.ts).
 *
 * Skills lösen von selbst aus (siehe Combat). I oder C öffnet Charakter & Inventar.
 * Esc schließt das Fenster (wenn es nicht angepinnt ist) bzw. hebt die Zielauswahl auf.
 *
 * Speichern: Beim Start wird der Spielstand aus `session.save` übernommen (applySave).
 * Gespeichert wird von selbst – regelmäßig, kurz nach wichtigen Ereignissen und beim
 * Verlassen der Seite (siehe startAutosave). Im Testlauf (?stufe, ?beute, ?elite, ?zone) nie.
 */
export class WorldScene extends Phaser.Scene {
  private grid!: Grid;
  private player!: Player;
  private combat!: Combat;
  private floaters!: FloatingText;
  private inventoryWindow!: InventoryWindow;
  private nameplates!: Nameplates;
  private settings!: SettingsMenu;
  private hudLayout!: HudLayout;
  private saveMenu!: SaveMenu;
  private inventory!: Inventory;
  private hud!: Hud;
  private loot!: GroundLoot;
  private shop!: Shop;
  private shopWindow!: ShopWindow;
  private minimap!: Minimap;

  // ---- Die aktuelle Zone (alles hier baut enterZone neu auf) ----
  private zoneId = START_ZONE;
  private map: Phaser.Tilemaps.Tilemap | null = null;
  private enemies: Enemy[] = [];
  /** Der Händler – nur in Zonen, in denen einer steht. */
  private merchant: Merchant | null = null;
  private chests: Chest[] = [];
  private portals: Portal[] = [];
  /** Alles Anklickbare der Zone: Händler, Truhen, Übergänge. */
  private interactables: Interactable[] = [];
  /** Die Schilder der Orte dieser Zone (sammelt buildPoi, zeigt enterZone an). */
  private labels: { x: number; y: number; text: string }[] = [];
  /** Benannte Punkte der Karte (Ebene "Marker"): Startpunkt und Ankunftspunkte. */
  private readonly markers = new Map<string, Point>();
  /** Bosse und benannte Elites der Zone mit ihrem Schlüssel im Spielstand ("Zone:Typ@Platz"). */
  private readonly timedEnemies = new Map<string, Enemy>();
  /**
   * Erst wenn die Figur einmal außerhalb aller Übergänge stand, löst einer aus –
   * sonst spränge sie nach der Ankunft sofort wieder zurück.
   */
  private portalArmed = false;

  // ---- Zeiten für alle Zonen, so wie sie im Spielstand stehen ----
  /** Besiegte Bosse und benannte Elites: Schlüssel → Zeitpunkt, zu dem sie wieder erscheinen. */
  private respawnAt: Record<string, number> = {};
  /** Geöffnete Truhen: Schlüssel → Zeitpunkt, ab dem sie wieder gefüllt sind. */
  private chestRefillAt: Record<string, number> = {};

  /** Schwierigkeit dieses Spielstands. Die Regler in den Einstellungen ändern dieses Objekt direkt. */
  private readonly difficulty: Difficulty = { ...DEFAULT_DIFFICULTY };
  /** Ist die Figur gerade auf dem Weg zu etwas Anklickbarem (Händler, Truhe)? Dann wird es benutzt, sobald sie ankommt. */
  private walkingTo: Interactable | null = null;
  /** Gespielte Zeit dieses Spielstands in Millisekunden. */
  private playedMs = 0;
  /** Läuft schon ein Timer für das Speichern "gleich"? (siehe requestSave) */
  private saveTimer = 0;
  private saveFailed = false;
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
    // Der Spielstand, mit dem gespielt wird (legt main.ts fest), und die Test-Parameter der Adresse.
    const save = session.save;
    if (!save) throw new Error('Kein Spielstand geladen.');
    const test = readTestParams();

    // Zum Testen: ?elite=1 macht jeden normalen Gegner zur Elite.
    if (test.elite) Enemy.eliteChance = 1;
    // Schwierigkeit aus dem Spielstand – muss stehen, bevor die Gegner erscheinen.
    Object.assign(this.difficulty, save.difficulty);
    Enemy.difficulty = this.difficulty;

    // Die Figur und alle Anzeigen gibt es einmal; sie bleiben beim Zonenwechsel bestehen.
    this.player = new Player(this, 0, 0);
    this.minimap = new Minimap();
    this.floaters = new FloatingText(byId('floaters'));
    this.nameplates = new Nameplates(byId('nameplates'), save.name);
    const hud = new Hud(SKILLS);
    this.hud = hud;
    hud.onPotionClick = () => this.drinkPotion();

    // Inventar und Ausrüstung: nach jeder Änderung bekommt die Figur ihre neuen Werte.
    const inventory = new Inventory();
    this.inventory = inventory;
    const tooltip = new ItemTooltip(inventory);
    this.inventoryWindow = new InventoryWindow(inventory, this.player, hud, tooltip);
    // Händler: Sortiment und Preise (Shop) und sein Fenster.
    this.shop = new Shop(inventory, this.player);
    this.shopWindow = new ShopWindow(this.shop, inventory, this.player, hud, tooltip, this.inventoryWindow);
    this.shop.onChange = () => {
      this.shopWindow.render();
      this.requestSave();
    };
    // Einstellungen (ein Objekt: settings.values, gilt für alle Spielstände) und die Anordnung der HUD-Elemente.
    this.settings = new SettingsMenu();
    this.hudLayout = new HudLayout(this.settings.values, hud, () => this.settings.save());
    this.settings.connect({
      onChange: () => this.hudLayout.apply(),
      onEditHud: () => this.hudLayout.setEditing(true),
      onResetWindows: () => this.inventoryWindow.resetLayout(),
      difficulty: this.difficulty,
      onDifficultyChange: () => this.requestSave(),
    });
    inventory.onChange = () => {
      this.player.setGear(inventory.equippedStats(), inventory.equipped.weapon?.icon ?? null);
      this.inventoryWindow.render();
      this.shopWindow.render();
      this.requestSave();
    };

    const loot = new GroundLoot(this, inventory, hud, this.floaters);
    this.loot = loot;
    loot.onChange = () => this.requestSave();

    this.combat = new Combat(this, this.player, hud, this.floaters, inventory, loot);
    this.combat.onSaveEvent = () => this.requestSave();
    this.combat.respawnPoint = () => this.respawnPoint();

    this.applySave(save);
    this.showName(save.name);

    // Zum Testen (Testlauf, wird nie gespeichert): ?stufe=5 startet auf Stufe 5,
    // ?beute=10 legt 10 gewürfelte Items ins Inventar, von jeder Seltenheit reihum,
    // ?zone=spinnenhoehle startet in dieser Zone.
    if (test.level > 1) this.player.setLevel(test.level);
    for (let i = 0; i < test.loot; i++) inventory.add(generateItem(this.player.level, RARITIES[i % RARITIES.length].id));

    this.clickMarker = this.add.image(0, 0, 'click-marker').setOrigin(0).setDepth(5).setVisible(false);
    this.blockedMarker = this.add.image(0, 0, 'blocked-marker').setOrigin(0).setDepth(20).setVisible(false);

    // Die Kamera wird in update() selbst nachgeführt (siehe followPlayer). Phasers
    // eingebautes Runden ist aus, weil es auf ganze Welt-Pixel rundet – bei
    // 3-fachem Zoom würde das Bild dann in 3-Pixel-Sprüngen ruckeln.
    this.cameras.main.setRoundPixels(false);
    this.applyZoom();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.applyZoom, this);

    // Die Zone aus dem Spielstand aufbauen; die Figur steht wieder dort, wo sie war.
    if (test.zone && ZONES[test.zone]) this.enterZone(test.zone, null);
    else this.enterZone(save.zone, save.position);

    // Menü "Spielstände": Slots wechseln, anlegen, löschen, exportieren, importieren.
    this.saveMenu = new SaveMenu({
      saveNow: () => this.saveNow(),
      rename: (name) => this.rename(name),
    });
    // Beide Menüs sitzen am selben Platz: Öffnet man das eine, geht das andere zu.
    byId('saves-button').addEventListener('click', () => this.settings.close());
    byId('settings-button').addEventListener('click', () => this.saveMenu.close());
    this.startAutosave();

    this.input.mouse?.disableContextMenu();
    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
    this.input.on(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);
    this.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onPointerUp, this);
    // Fenster verliert den Fokus (z. B. Alt+Tab): Maustaste gilt als losgelassen.
    this.game.events.on(Phaser.Core.Events.BLUR, this.cancelPress, this);

    this.input.keyboard?.on('keydown-ESC', () => {
      // Esc beendet erst den Bearbeitungsmodus, schließt dann die Einstellungen, dann das Inventar
      // (außer es ist angepinnt), sonst hebt es das Ziel auf.
      if (this.hudLayout.editing) this.hudLayout.setEditing(false);
      else if (this.saveMenu.isOpen) this.saveMenu.close();
      else if (this.settings.isOpen) this.settings.close();
      else if (this.shopWindow.isOpen) this.shopWindow.close();
      else if (this.inventoryWindow.isOpen && !this.inventoryWindow.pinned) this.inventoryWindow.close();
      else this.combat.clearTarget();
    });
    this.input.keyboard?.on('keydown-I', () => this.inventoryWindow.toggle());
    this.input.keyboard?.on('keydown-C', () => this.inventoryWindow.toggle());
    this.input.keyboard?.on('keydown-Q', () => this.drinkPotion());

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
    this.playedMs += delta;
    const cursor = this.input.activePointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;

    // Erst die Kampfregeln (Gegner, Angriffe, Ziel verfolgen), dann die Bewegung der Figur.
    this.combat.update(delta);
    this.inventoryWindow.update();
    this.updateInteractables();

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
    // Steht die Figur auf einem Übergang, wechselt hier die Zone.
    this.checkPortals();
    this.followPlayer();
    if (this.settings.values.hud.minimap.visible) this.minimap.render(this.player.pos, this.enemies, this.minimapMarks());

    // Über einem Gegner, dem Händler, einer Truhe oder einem Eingang wird der Mauszeiger zur Hand.
    const clickable = this.combat.enemyAt(cursor) !== null || this.interactables.some((thing) => thing.contains(cursor));
    this.input.setDefaultCursor(this.player.alive && clickable ? 'pointer' : 'default');
  }

  // ---------------------------------------------------------------- Zonen

  /**
   * Baut die Zone `zoneId` auf und stellt die Figur hinein. `arrive` = Name eines Markers
   * der Karte oder ein Punkt in Welt-Pixeln; null (oder ein verbauter Punkt) = Startpunkt der Zone.
   */
  private enterZone(zoneId: string, arrive: string | Point | null): void {
    const zone = ZONES[zoneId];
    if (!zone) throw new Error(`Die Zone "${zoneId}" gibt es nicht (src/data/zones.ts).`);
    this.leaveZone();
    this.zoneId = zoneId;

    const map = this.make.tilemap({ key: `map-${zoneId}` });
    this.map = map;
    const tileset = map.addTilesetImage(zone.tileset, `tiles-${zone.tileset}`, TILE, TILE, 1, 2);
    if (!tileset) throw new Error(`Tileset "${zone.tileset}" fehlt in der Karte "${zoneId}".`);
    const ground = map.createLayer('Boden', tileset);
    map.createLayer('Deko', tileset);
    const objects = map.createLayer('Objekte', tileset);
    if (!ground || !objects) throw new Error(`Ebene "Boden" oder "Objekte" fehlt in der Karte "${zoneId}".`);

    // Hindernisse: alles auf der Ebene "Objekte" – und jede Kachel ohne Boden (in Höhlen der Fels).
    const blocked = new Uint8Array(map.width * map.height);
    objects.forEachTile((tile) => {
      if (tile.index !== -1) blocked[tile.y * map.width + tile.x] = 1;
    });
    ground.forEachTile((tile) => {
      if (tile.index === -1) blocked[tile.y * map.width + tile.x] = 1;
    });
    // Händler und Truhen stehen fest an ihrem Platz – ihre Kachel ist ebenfalls ein Hindernis.
    const pois = map.getObjectLayer('POI')?.objects ?? [];
    for (const poi of pois) {
      if (poi.type === 'haendler' || poi.type === 'truhe') blocked[Grid.toTile(poi.y ?? 0) * map.width + Grid.toTile(poi.x ?? 0)] = 1;
    }
    this.grid = new Grid(map.width, map.height, blocked);

    for (const marker of map.getObjectLayer('Marker')?.objects ?? []) {
      if (marker.x !== undefined && marker.y !== undefined) this.markers.set(marker.name, { x: marker.x, y: marker.y });
    }
    const spawn = this.markers.get('spawn');
    if (!spawn) throw new Error(`Marker "spawn" fehlt in der Karte "${zoneId}".`);

    // Jeder Punkt auf der Ebene "Gegner" ist ein Gegner; der Name des Punkts ist sein Typ.
    for (const object of map.getObjectLayer('Gegner')?.objects ?? []) {
      const def = ENEMIES[object.name];
      if (!def || object.x === undefined || object.y === undefined) throw new Error(`Unbekannter Gegner "${object.name}" in der Karte "${zoneId}".`);
      this.addEnemy(new Enemy(this, def, numberProperty(object, 'level', 1), object.x, object.y), object.name);
    }
    // Die besonderen Orte bauen (auch benannte Elites), dann die Schilder: eines je Gegner, eines je Ort.
    for (const poi of pois) this.buildPoi(poi);
    this.nameplates.setEnemies(this.enemies);
    for (const label of this.labels) this.nameplates.addLabel(label.x, label.y, label.text);

    // Ein besiegter Boss (oder eine benannte Elite) bleibt weg, bis seine Zeit um ist. Die Uhr lief weiter, während das Spiel zu war.
    for (const [key, enemy] of this.timedEnemies) {
      const remaining = (this.respawnAt[key] ?? 0) - Date.now();
      if (remaining > 0) enemy.startDead(Math.min(remaining, enemy.respawnMs));
    }

    this.combat.setZone(this.grid, this.enemies);
    this.minimap.setMap(map, tileset);
    this.loot.setZone(zoneId);

    // Die Figur an ihren Platz stellen – außer die Stelle ist inzwischen verbaut (Karte geändert).
    let at = typeof arrive === 'string' ? this.markers.get(arrive) : arrive;
    if (!at || !this.grid.isBoxFree(at.x, at.y, BODY_RADIUS)) at = spawn;
    this.player.stop();
    this.player.pos.set(at.x, at.y);
    this.portalArmed = false;

    const camera = this.cameras.main;
    camera.setBackgroundColor(zone.background);
    camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.followPlayer();
    camera.fadeIn(ZONE_FADE_MS);
    this.hud.showZone(zone.name, zone.levels);
  }

  /** Nimmt einen Gegner in die Zone auf. `type` = sein Name in der Karte (für den Schlüssel im Spielstand). */
  private addEnemy(enemy: Enemy, type: string): void {
    this.enemies.push(enemy);
    if (enemy.timed) this.timedEnemies.set(`${this.zoneId}:${type}@${enemy.home.x},${enemy.home.y}`, enemy);
  }

  /**
   * Besondere Orte: Was ein Punkt der Ebene "POI" im Spiel wird, hängt an seiner Art (`type`).
   * Eine neue Art bekommt hier einen Eintrag – ihre Werte gehören nach src/data/.
   */
  private buildPoi(poi: Phaser.Types.Tilemaps.TiledObject): void {
    const x = poi.x ?? 0;
    const y = poi.y ?? 0;
    const builders: Record<string, () => void> = {
      haendler: () => {
        this.merchant = new Merchant(this, x, y, () => this.shopWindow.open());
        this.interactables.push(this.merchant);
        this.labels.push({ x, y, text: MERCHANT.name });
      },
      truhe: () => {
        const chest = new Chest(this, `${this.zoneId}:${poi.name}`, x, y, numberProperty(poi, 'level', 1), (opened) => this.openChest(opened));
        chest.refillAt = this.chestRefillAt[chest.key] ?? 0;
        chest.update();
        this.chests.push(chest);
        this.interactables.push(chest);
      },
      portal: () => {
        const portal = new Portal(this, x, y, textProperty(poi, 'to'), textProperty(poi, 'arrive'));
        if (!ZONES[portal.to]) throw new Error(`Übergang "${poi.name}" führt in die unbekannte Zone "${portal.to}".`);
        this.portals.push(portal);
        this.interactables.push(portal);
        // Das Schild sitzt über dem Eingang, also eine Kachel über der Stelle, die man betritt.
        this.labels.push({ x, y: y - TILE, text: textProperty(poi, 'label') || ZONES[portal.to].name });
      },
      elite: () => {
        // Fester Elite-Platz: Der Name des Punkts ist der Schlüssel in NAMED_ELITES.
        const named = NAMED_ELITES[poi.name];
        const def = named ? ENEMIES[named.enemy] : undefined;
        if (!named || !def) throw new Error(`Benannte Elite "${poi.name}" fehlt in src/data/elites.ts.`);
        const fixed = { name: named.name, traits: named.traits, respawnMs: NAMED_ELITE_RESPAWN_MS };
        this.addEnemy(new Enemy(this, def, named.level, x, y, fixed), poi.name);
      },
    };
    const build = builders[poi.type];
    if (!build) throw new Error(`Besonderer Ort "${poi.name}": Die Art "${poi.type}" kennt das Spiel nicht.`);
    build();
  }

  /** Räumt die aktuelle Zone weg. Vorher werden die Zeiten von Bossen und Truhen gemerkt. */
  private leaveZone(): void {
    if (!this.map) return;
    this.rememberTimes();
    this.cancelPress();
    this.walkingTo = null;
    this.shopWindow.close();
    for (const enemy of this.enemies) enemy.destroy();
    for (const thing of this.interactables) thing.destroy();
    this.enemies = [];
    this.interactables = [];
    this.chests = [];
    this.portals = [];
    this.labels = [];
    this.merchant = null;
    this.markers.clear();
    this.timedEnemies.clear();
    this.map.destroy();
    this.map = null;
  }

  /** Steht die Figur auf einem Übergang, geht es in dessen Zone. */
  private checkPortals(): void {
    if (!this.player.alive) return;
    const portal = this.portals.find((candidate) => this.player.distanceTo(candidate.pos) <= PORTAL.radius);
    if (!portal) {
      this.portalArmed = true;
      return;
    }
    if (!this.portalArmed) return;
    this.enterZone(portal.to, portal.arrive);
    this.requestSave();
  }

  /** Wo die Figur nach dem Tod aufwacht. Liegt der Punkt in einer anderen Zone, wird dorthin gewechselt. */
  private respawnPoint(): Point {
    const target = ZONES[this.zoneId].respawn;
    if (target.zone !== this.zoneId) this.enterZone(target.zone, target.marker);
    const at = this.markers.get(target.marker) ?? this.markers.get('spawn');
    if (!at) throw new Error(`Aufwach-Punkt "${target.marker}" fehlt in der Zone "${target.zone}".`);
    return at;
  }

  /** Die festen Punkte der Zone für die Minimap: Händler, Truhen, Übergänge. */
  private minimapMarks(): MinimapMark[] {
    const marks: MinimapMark[] = [];
    if (this.merchant) marks.push({ pos: this.merchant.pos, color: MINIMAP.merchantColor, radius: MINIMAP.merchantRadius });
    for (const chest of this.chests) marks.push({ pos: chest.pos, color: chest.full ? MINIMAP.chestColor : MINIMAP.chestEmptyColor, radius: MINIMAP.chestRadius });
    for (const portal of this.portals) marks.push({ pos: portal.pos, color: MINIMAP.portalColor, radius: MINIMAP.portalRadius });
    return marks;
  }

  /** Schreibt die laufenden Zeiten der aktuellen Zone (Bosse, benannte Elites, Truhen) in die Listen für den Spielstand. */
  private rememberTimes(): void {
    for (const [key, enemy] of this.timedEnemies) {
      if (enemy.respawnRemainingMs > 0) this.respawnAt[key] = Date.now() + enemy.respawnRemainingMs;
      else delete this.respawnAt[key];
    }
    for (const chest of this.chests) {
      if (chest.full) delete this.chestRefillAt[chest.key];
      else this.chestRefillAt[chest.key] = chest.refillAt;
    }
  }

  // ---------------------------------------------------------------- Händler, Truhen und Heiltrank

  /**
   * Klick auf etwas Anklickbares (Händler, Truhe, Eingang): Steht die Figur nah genug,
   * wird es gleich benutzt – sonst läuft sie erst hin.
   */
  private visit(thing: Interactable): void {
    this.combat.disengage();
    if (this.player.distanceTo(thing.pos) <= thing.range) {
      this.player.stop();
      thing.use();
      return;
    }
    const route = findWaypoints(this.grid, this.player.pos, thing.standAt);
    if (!route || route.length === 0) return;
    this.player.walkAlong(route);
    this.walkingTo = thing;
  }

  /**
   * Einmal pro Frame: benutzen, worauf die Figur zuläuft, sobald sie ankommt. Dazu den Handel
   * schließen, wenn sie vom Händler weggeht, und die Truhen offen oder geschlossen zeigen.
   */
  private updateInteractables(): void {
    const thing = this.walkingTo;
    if (thing && this.player.alive && this.player.distanceTo(thing.pos) <= thing.range) {
      this.walkingTo = null;
      this.player.stop();
      thing.use();
    }
    const tooFar = !this.merchant || this.player.distanceTo(this.merchant.pos) > MERCHANT.closeRange;
    if (this.shopWindow.isOpen && (tooFar || !this.player.alive)) this.shopWindow.close();
    this.shopWindow.update();
    for (const chest of this.chests) chest.update();
  }

  /** Öffnet eine Truhe: Gold in den Beutel, die Items fallen davor auf den Boden. Danach ist sie eine Weile leer (CHEST in src/data/pois.ts). */
  private openChest(chest: Chest): void {
    if (!chest.full) {
      const minutes = Math.max(1, Math.ceil((chest.refillAt - Date.now()) / 60000));
      this.hud.flash(`Die Truhe ist leer (füllt sich in ${minutes} min)`);
      return;
    }
    chest.refillAt = Date.now() + CHEST.refillMs;
    chest.update();

    const spread = 1 + Phaser.Math.FloatBetween(-CHEST.gold.spread, CHEST.gold.spread);
    const gold = Math.round((CHEST.gold.base + CHEST.gold.perLevel * chest.level) * spread);
    this.inventory.addGold(gold);
    this.floaters.spawn(chest.pos.x, chest.pos.y - 8, `+${gold} Gold`, 'gold');
    const count = Phaser.Math.Between(CHEST.items.min, CHEST.items.max);
    for (let i = 0; i < count; i++) {
      this.loot.dropItem(generateItem(chest.level, rollRarityFrom(CHEST.rarity)), chest.standAt.x, chest.standAt.y);
    }
    this.requestSave();
  }

  /** Taste Q oder Klick auf das Trank-Feld der Skill-Leiste: einen Heiltrank trinken (Werte in src/data/shop.ts). */
  private drinkPotion(): void {
    const player = this.player;
    if (!player.alive) return;
    const healed = player.drinkPotion();
    if (healed > 0) {
      this.floaters.spawn(player.pos.x, player.pos.y - 8, `+${Math.round(healed)}`, 'heal');
      this.hud.flashPotion();
      this.shopWindow.render();
      this.requestSave();
    } else if (player.potions === 0) {
      this.hud.flash('Kein Heiltrank');
    } else if (player.potionCooldown > 0) {
      this.hud.flash('Heiltrank noch nicht bereit');
    }
  }

  // ---------------------------------------------------------------- Speichern und Laden

  /**
   * Übernimmt einen Spielstand: Inventar, Ausrüstung, Gold, Tränke, Stufe, EP, Leben, Händler,
   * Items am Boden und die Zeiten von Bossen und Truhen. Die Schwierigkeit übernimmt create
   * schon vorher, Zone und Position danach (enterZone).
   */
  private applySave(save: SaveGame): void {
    this.playedMs = save.playedMs;
    this.player.potions = save.potions;
    this.shop.load(save.shop);
    this.loot.load(save.groundItems);
    this.respawnAt = { ...save.respawnAt };
    this.chestRefillAt = { ...save.chests };
    // Erst die Ausrüstung (setzt über onChange die Werte der Figur), dann Stufe und Leben.
    this.inventory.load(save.bag, save.equipped, save.gold);
    this.player.restore(save.character.level, save.character.xp, save.character.hp);
  }

  /** Der aktuelle Stand des Spiels als Spielstand. */
  private snapshot(base: SaveGame): SaveGame {
    const player = this.player;
    this.rememberTimes();
    // Zeiten, die schon abgelaufen sind (auch in anderen Zonen), braucht der Spielstand nicht mehr.
    const stillRunning = (times: Record<string, number>) => Object.fromEntries(Object.entries(times).filter(([, at]) => at > Date.now()));
    return {
      ...base,
      savedAt: Date.now(),
      playedMs: Math.round(this.playedMs),
      // Liegt die Figur am Boden, wacht sie nach dem Laden mit vollem Leben im Dorf auf
      // (am Startpunkt der Zone, in der man aus dieser Zone heraus aufwacht).
      character: { level: player.level, xp: player.xp, hp: player.alive ? player.hp : null },
      zone: player.alive ? this.zoneId : ZONES[this.zoneId].respawn.zone,
      position: player.alive ? { x: Math.round(player.pos.x), y: Math.round(player.pos.y) } : null,
      gold: this.inventory.gold,
      bag: [...this.inventory.bag],
      equipped: { ...this.inventory.equipped },
      potions: player.potions,
      groundItems: this.loot.toData(),
      shop: this.shop.toData(),
      difficulty: { ...this.difficulty },
      respawnAt: stillRunning(this.respawnAt),
      chests: stillRunning(this.chestRefillAt),
    };
  }

  /**
   * Speichert sofort in den Slot dieses Spiels. Im Testlauf (kein Slot) und kurz vor
   * einem Slot-Wechsel (`frozen`) passiert nichts.
   */
  private saveNow(): void {
    window.clearTimeout(this.saveTimer);
    this.saveTimer = 0;
    if (session.slotId === null || session.frozen || !session.save) return;
    session.save = this.snapshot(session.save);
    const ok = writeSlot(session.slotId, session.save);
    // Den Hinweis nur einmal zeigen, nicht alle paar Sekunden.
    if (!ok && !this.saveFailed) this.hud.flash('Speichern fehlgeschlagen');
    this.saveFailed = !ok;
  }

  /** Speichert gleich (nach SAVE_DELAY_MS). Mehrere Ereignisse kurz hintereinander ergeben ein Speichern. */
  private requestSave(): void {
    if (this.saveTimer !== 0) return;
    this.saveTimer = window.setTimeout(() => this.saveNow(), SAVE_DELAY_MS);
  }

  /** Regelmäßig speichern – und sofort, wenn die Seite verlassen, neu geladen oder der Tab gewechselt wird. */
  private startAutosave(): void {
    window.setInterval(() => this.saveNow(), AUTOSAVE_INTERVAL_MS);
    window.addEventListener('pagehide', () => this.saveNow());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.saveNow();
    });
  }

  /** Neuer Name für die laufende Figur (aus dem Menü "Spielstände"). */
  private rename(name: string): void {
    if (!session.save) return;
    session.save.name = cleanName(name);
    this.showName(session.save.name);
    this.saveNow();
  }

  /** Trägt den Namen der Figur überall ein: Schild über der Figur, Spielerrahmen, Charakterfenster. */
  private showName(name: string): void {
    this.nameplates.setPlayerName(name);
    byId('player-name').textContent = name;
    byId('character-name').textContent = `${name} · ${WARRIOR.name}`;
  }

  // ---------------------------------------------------------------- Maus

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (!pointer.leftButtonDown() || !this.player.alive) return;
    const world = pointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;

    this.walkingTo = null;
    const enemy = this.combat.enemyAt(world);
    if (enemy) {
      this.cancelPress();
      this.combat.engage(enemy);
      return;
    }
    const thing = this.interactables.find((candidate) => candidate.contains(world));
    if (thing) {
      this.cancelPress();
      this.visit(thing);
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
    const settings = this.settings.values;
    this.floaters.render(this.cameras.main, settings.floaters.scale);
    this.nameplates.render(this.cameras.main, this.player, this.combat.target, settings);
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

/** Liest eine Eigenschaft eines Punkts der Karte (z. B. "level" eines Gegners, "to" eines Übergangs). */
function property(object: Phaser.Types.Tilemaps.TiledObject, name: string): unknown {
  const properties: unknown = object.properties;
  if (!Array.isArray(properties)) return undefined;
  return (properties as { name: string; value: unknown }[]).find((entry) => entry.name === name)?.value;
}

/** Eine Zahl aus den Eigenschaften eines Punkts; fehlt sie, gilt `fallback`. */
function numberProperty(object: Phaser.Types.Tilemaps.TiledObject, name: string, fallback: number): number {
  const value = property(object, name);
  return typeof value === 'number' ? value : fallback;
}

/** Ein Text aus den Eigenschaften eines Punkts; fehlt er, kommt ein leerer Text zurück. */
function textProperty(object: Phaser.Types.Tilemaps.TiledObject, name: string): string {
  const value = property(object, name);
  return typeof value === 'string' ? value : '';
}
