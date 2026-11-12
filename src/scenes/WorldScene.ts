import Phaser from 'phaser';
import { Combat } from '../combat/Combat';
import { BODY_RADIUS, BOSS_RESPAWN_MS, HOLD_DELAY_MS, TILE, zoomForViewport } from '../config';
import { DEFAULT_DIFFICULTY, type Difficulty } from '../data/difficulty';
import { ENEMIES } from '../data/enemies';
import { RARITIES } from '../data/items';
import { AUTOSAVE_INTERVAL_MS, SAVE_DELAY_MS } from '../data/save';
import { MERCHANT } from '../data/shop';
import { SKILLS, WARRIOR } from '../data/warrior';
import { Actor } from '../entities/Actor';
import { Enemy } from '../entities/Enemy';
import { Merchant } from '../entities/Merchant';
import { Player } from '../entities/Player';
import { generateItem } from '../items/generator';
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
import { Minimap } from '../ui/Minimap';
import { Nameplates } from '../ui/Nameplates';
import { SaveMenu } from '../ui/SaveMenu';
import { SettingsMenu } from '../ui/SettingsMenu';
import { ShopWindow } from '../ui/ShopWindow';
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
 * Klick auf den Händler im Dorf: hinlaufen und handeln. Q trinkt einen Heiltrank.
 *
 * Oben rechts zeigt die Minimap Gelände, Gegner und Händler (src/ui/Minimap.ts).
 *
 * Skills lösen von selbst aus (siehe Combat). I oder C öffnet Charakter & Inventar.
 * Esc schließt das Fenster (wenn es nicht angepinnt ist) bzw. hebt die Zielauswahl auf.
 *
 * Speichern: Beim Start wird der Spielstand aus `session.save` übernommen (applySave).
 * Gespeichert wird von selbst – regelmäßig, kurz nach wichtigen Ereignissen und beim
 * Verlassen der Seite (siehe startAutosave). Im Testlauf (?stufe, ?beute, ?elite) nie.
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
  private merchant!: Merchant;
  private shop!: Shop;
  private shopWindow!: ShopWindow;
  private minimap!: Minimap;
  private enemies: Enemy[] = [];
  /** Schwierigkeit dieses Spielstands. Die Regler in den Einstellungen ändern dieses Objekt direkt. */
  private readonly difficulty: Difficulty = { ...DEFAULT_DIFFICULTY };
  /** Ist die Figur gerade auf dem Weg zum Händler? Dann öffnet sich der Handel, sobald sie ankommt. */
  private walkingToMerchant = false;
  /** Die Bosse der Karte mit ihrem Schlüssel im Spielstand (Typ und Platz). */
  private readonly bosses = new Map<string, Enemy>();
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
    // Der Händler steht fest an seinem Platz – seine Kachel ist ebenfalls ein Hindernis.
    const merchantAt = map.findObject('Marker', (object) => object.name === 'haendler');
    if (!merchantAt || merchantAt.x === undefined || merchantAt.y === undefined) throw new Error('Marker "haendler" fehlt in der Karte.');
    blocked[Grid.toTile(merchantAt.y) * map.width + Grid.toTile(merchantAt.x)] = 1;
    this.grid = new Grid(map.width, map.height, blocked);
    this.merchant = new Merchant(this, merchantAt.x, merchantAt.y);

    const spawn = map.findObject('Marker', (object) => object.name === 'spawn');
    if (!spawn || spawn.x === undefined || spawn.y === undefined) throw new Error('Marker "spawn" fehlt in der Karte.');
    this.player = new Player(this, spawn.x, spawn.y);

    // Der Spielstand, mit dem gespielt wird (legt main.ts fest), und die Test-Parameter der Adresse.
    const save = session.save;
    if (!save) throw new Error('Kein Spielstand geladen.');
    const test = readTestParams();

    // Zum Testen: ?elite=1 macht jeden normalen Gegner zur Elite.
    if (test.elite) Enemy.eliteChance = 1;
    // Schwierigkeit aus dem Spielstand – muss stehen, bevor die Gegner erscheinen.
    Object.assign(this.difficulty, save.difficulty);
    Enemy.difficulty = this.difficulty;

    // Jeder Punkt auf der Ebene "Gegner" ist ein Gegner; der Name des Punkts ist sein Typ.
    const enemies = (map.getObjectLayer('Gegner')?.objects ?? []).map((object) => {
      const def = ENEMIES[object.name];
      if (!def || object.x === undefined || object.y === undefined) throw new Error(`Unbekannter Gegner "${object.name}" in der Karte.`);
      const enemy = new Enemy(this, def, enemyLevel(object), object.x, object.y);
      if (enemy.rank === 'boss') this.bosses.set(`${object.name}@${object.x},${object.y}`, enemy);
      return enemy;
    });
    this.enemies = enemies;
    this.minimap = new Minimap(map, tileset);

    this.floaters = new FloatingText(byId('floaters'));
    this.nameplates = new Nameplates(byId('nameplates'), enemies, save.name);
    this.nameplates.addLabel(this.merchant.pos.x, this.merchant.pos.y, MERCHANT.name);
    const hud = new Hud(SKILLS);
    this.hud = hud;

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

    this.applySave(save);
    this.showName(save.name);

    // Zum Testen (Testlauf, wird nie gespeichert): ?stufe=5 startet auf Stufe 5,
    // ?beute=10 legt 10 gewürfelte Items ins Inventar, von jeder Seltenheit reihum.
    if (test.level > 1) this.player.setLevel(test.level);
    for (let i = 0; i < test.loot; i++) inventory.add(generateItem(this.player.level, RARITIES[i % RARITIES.length].id));

    this.combat = new Combat(this, this.grid, this.player, enemies, hud, this.floaters, { x: spawn.x, y: spawn.y }, inventory, loot);
    this.combat.onSaveEvent = () => this.requestSave();

    // Menü "Spielstände": Slots wechseln, anlegen, löschen, exportieren, importieren.
    this.saveMenu = new SaveMenu({
      saveNow: () => this.saveNow(),
      rename: (name) => this.rename(name),
    });
    // Beide Menüs sitzen am selben Platz: Öffnet man das eine, geht das andere zu.
    byId('saves-button').addEventListener('click', () => this.settings.close());
    byId('settings-button').addEventListener('click', () => this.saveMenu.close());
    this.startAutosave();

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
    this.updateMerchant();

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
    if (this.settings.values.hud.minimap.visible) this.minimap.render(this.player.pos, this.enemies, this.merchant.pos);

    // Über einem Gegner oder dem Händler wird der Mauszeiger zur Hand.
    const clickable = this.combat.enemyAt(cursor) !== null || this.merchant.contains(cursor);
    this.input.setDefaultCursor(this.player.alive && clickable ? 'pointer' : 'default');
  }

  // ---------------------------------------------------------------- Händler und Heiltrank

  /** Klick auf den Händler: Steht die Figur nah genug, öffnet sich der Handel – sonst läuft sie erst hin. */
  private visitMerchant(): void {
    this.combat.disengage();
    if (this.player.distanceTo(this.merchant.pos) <= MERCHANT.openRange) {
      this.player.stop();
      this.shopWindow.open();
      return;
    }
    // Ziel ist die Stelle direkt vor ihm (eine Kachel tiefer), auf seiner eigenen Kachel steht er selbst.
    const route = findWaypoints(this.grid, this.player.pos, { x: this.merchant.pos.x, y: this.merchant.pos.y + TILE });
    if (!route || route.length === 0) return;
    this.player.walkAlong(route);
    this.walkingToMerchant = true;
  }

  /** Einmal pro Frame: Handel öffnen, wenn die Figur beim Händler ankommt, und schließen, wenn sie weggeht. */
  private updateMerchant(): void {
    const distance = this.player.distanceTo(this.merchant.pos);
    if (this.walkingToMerchant && this.player.alive && distance <= MERCHANT.openRange) {
      this.walkingToMerchant = false;
      this.player.stop();
      this.shopWindow.open();
    }
    if (this.shopWindow.isOpen && (distance > MERCHANT.closeRange || !this.player.alive)) this.shopWindow.close();
    this.shopWindow.update();
  }

  /** Taste Q: einen Heiltrank trinken (Werte in src/data/shop.ts). */
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

  /** Übernimmt einen Spielstand (die Schwierigkeit schon in create, vor den Gegnern): Inventar, Ausrüstung, Gold, Tränke, Stufe, EP, Leben, Position, Items am Boden, Händler, Boss-Timer. */
  private applySave(save: SaveGame): void {
    this.playedMs = save.playedMs;
    this.player.potions = save.potions;
    this.shop.load(save.shop);
    this.loot.load(save.groundItems);
    // Erst die Ausrüstung (setzt über onChange die Werte der Figur), dann Stufe und Leben.
    this.inventory.load(save.bag, save.equipped, save.gold);
    this.player.restore(save.character.level, save.character.xp, save.character.hp);

    // Die Figur steht wieder dort, wo sie war – außer die Stelle ist inzwischen verbaut (Karte geändert).
    const at = save.position;
    if (at && this.grid.isBoxFree(at.x, at.y, BODY_RADIUS)) this.player.pos.set(at.x, at.y);

    // Ein besiegter Boss bleibt weg, bis seine Zeit um ist. Die Uhr lief weiter, während das Spiel zu war.
    for (const [key, boss] of this.bosses) {
      const remaining = (save.bossRespawnAt[key] ?? 0) - Date.now();
      if (remaining > 0) boss.startDead(Math.min(remaining, BOSS_RESPAWN_MS));
    }
  }

  /** Der aktuelle Stand des Spiels als Spielstand. */
  private snapshot(base: SaveGame): SaveGame {
    const player = this.player;
    const bossRespawnAt: Record<string, number> = {};
    for (const [key, boss] of this.bosses) {
      if (boss.respawnRemainingMs > 0) bossRespawnAt[key] = Date.now() + boss.respawnRemainingMs;
    }
    return {
      ...base,
      savedAt: Date.now(),
      playedMs: Math.round(this.playedMs),
      // Liegt die Figur am Boden, wacht sie nach dem Laden mit vollem Leben im Dorf auf.
      character: { level: player.level, xp: player.xp, hp: player.alive ? player.hp : null },
      position: player.alive ? { x: Math.round(player.pos.x), y: Math.round(player.pos.y) } : null,
      gold: this.inventory.gold,
      bag: [...this.inventory.bag],
      equipped: { ...this.inventory.equipped },
      potions: player.potions,
      groundItems: this.loot.toData(),
      shop: this.shop.toData(),
      difficulty: { ...this.difficulty },
      bossRespawnAt,
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

    this.walkingToMerchant = false;
    const enemy = this.combat.enemyAt(world);
    if (enemy) {
      this.cancelPress();
      this.combat.engage(enemy);
      return;
    }
    if (this.merchant.contains(world)) {
      this.cancelPress();
      this.visitMerchant();
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

/** Liest die Stufe eines Gegners aus der Karte (Eigenschaft "level" des Punkts); ohne Angabe Stufe 1. */
function enemyLevel(object: Phaser.Types.Tilemaps.TiledObject): number {
  const properties: unknown = object.properties;
  if (!Array.isArray(properties)) return 1;
  const level = (properties as { name: string; value: unknown }[]).find((property) => property.name === 'level')?.value;
  return typeof level === 'number' ? level : 1;
}
