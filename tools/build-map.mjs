// Karten-Bauer: macht aus jedem Bauplan in tools/zones/ eine Tiled-Karte
// (public/assets/maps/<zone>.json). Ein Bauplan beschreibt Größe, Gelände-Art,
// Freiflächen, Wege, Bauten, besondere Orte (POIs) und Gegnergruppen – siehe
// tools/zones/gruenwald.mjs. Eine neue Zone braucht hier keinen Code, solange es ihre
// Gelände-Art schon gibt (TERRAINS unten).
//
// Vor dem Schreiben werden die Daten geprüft; bei einem Fehler bricht der Lauf mit einer
// klaren Meldung ab (unbekannter Gegner, POI nicht erreichbar, Portal ohne Ziel …).
//
// Aufruf:           npm run assets
// Mit Vorschaubild: node tools/build-map.mjs --preview ordner/   (ein Bild je Zone)
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { TILESETS } from './build-tilesets.mjs';
import { createKit, mulberry32 } from './lib/mapkit.mjs';
import { drawTile, newImage, savePng, TILE } from './lib/png.mjs';
import { buildCave } from './lib/terrain-hoehle.mjs';
import { buildForest } from './lib/terrain-wald.mjs';

/** Gelände-Arten: Name im Bauplan (`terrain`) → Funktion, die daraus Kacheln macht. */
const TERRAINS = { wald: buildForest, hoehle: buildCave };

/** POI-Arten, die das Spiel kennt (Verhalten: POI_BUILDERS in src/scenes/WorldScene.ts). */
const POI_TYPES = ['haendler', 'truhe', 'portal', 'elite', 'baumeister', 'lagertruhe', 'fahne'];
/** Auf diesen POIs steht etwas Festes: Die Kachel selbst ist ein Hindernis, davor (darunter) muss Platz sein. */
const SOLID_POIS = ['haendler', 'truhe', 'baumeister', 'lagertruhe'];

// ---------------------------------------------------------------- Baupläne und Spieldaten lesen

const zoneDir = 'tools/zones';
const plans = [];
for (const file of fs.readdirSync(zoneDir).filter((name) => name.endsWith('.mjs')).sort()) {
  const plan = (await import(pathToFileURL(path.join(zoneDir, file)).href)).default;
  if (plan.id !== path.basename(file, '.mjs')) throw new Error(`${file}: Die Datei muss so heißen wie die Zone ("${plan.id}.mjs").`);
  plans.push(plan);
}

/**
 * Liest die Schlüssel einer Liste aus einer Daten-Datei des Spiels, z. B. alle Gegnertypen
 * aus `export const ENEMIES … = {` in src/data/enemies.ts. So merkt schon der Karten-Bauer,
 * wenn ein Bauplan etwas nennt, das es im Spiel nicht gibt.
 */
function readKeys(file, constant) {
  const text = fs.readFileSync(file, 'utf8');
  const start = text.indexOf(`export const ${constant}`);
  if (start === -1) throw new Error(`${file}: "${constant}" nicht gefunden.`);
  const end = text.indexOf('\n};', start);
  // Schlüssel stehen mit genau zwei Leerzeichen eingerückt: "  ratte: {" oder "  'truhe-zu': {".
  return [...text.slice(start, end).matchAll(/^ {2}'?([\w-]+)'?: /gm)].map((match) => match[1]);
}

const enemyTypes = readKeys('src/data/enemies.ts', 'ENEMIES');
const namedElites = readKeys('src/data/elites.ts', 'NAMED_ELITES');
const gameZones = readKeys('src/data/zones.ts', 'ZONES');
const buildings = readKeys('src/data/town.ts', 'BUILDINGS');
for (const plan of plans) {
  if (!gameZones.includes(plan.id)) throw new Error(`Zone "${plan.id}" hat einen Bauplan, fehlt aber in src/data/zones.ts.`);
}
for (const id of gameZones) {
  if (!plans.some((plan) => plan.id === id)) throw new Error(`Zone "${id}" steht in src/data/zones.ts, hat aber keinen Bauplan in ${zoneDir}/.`);
}

// ---------------------------------------------------------------- Eine Zone bauen

function buildZone(plan) {
  const fail = (message) => {
    throw new Error(`Zone "${plan.id}": ${message}`);
  };
  const W = plan.width;
  const H = plan.height;
  const terrain = TERRAINS[plan.terrain];
  if (!terrain) fail(`Die Gelände-Art "${plan.terrain}" gibt es nicht.`);
  const tileset = TILESETS[plan.tileset];
  if (!tileset) fail(`Das Tileset "${plan.tileset}" gibt es nicht.`);

  const kit = createKit(W, H, plan.seed);
  const { idx, inside } = kit;

  // ---- POIs prüfen und ihre Kacheln freihalten
  const seenNames = new Set();
  const reserved = kit.mask();
  for (const poi of plan.pois ?? []) {
    if (!POI_TYPES.includes(poi.type)) fail(`POI "${poi.name}": Die Art "${poi.type}" gibt es nicht.`);
    if (!poi.name || seenNames.has(poi.name)) fail(`POI-Name "${poi.name}" fehlt oder kommt doppelt vor.`);
    seenNames.add(poi.name);
    if (!inside(poi.x, poi.y)) fail(`POI "${poi.name}" liegt außerhalb der Karte.`);
    if (SOLID_POIS.includes(poi.type)) reserved[idx(poi.x, poi.y)] = 1;
    if (poi.type === 'elite' && !namedElites.includes(poi.name)) fail(`Elite "${poi.name}" fehlt in NAMED_ELITES (src/data/elites.ts).`);
    if (poi.type === 'fahne' && !buildings.includes(poi.building)) fail(`Fahne "${poi.name}": Das Gebäude "${poi.building}" fehlt in BUILDINGS (src/data/town.ts).`);
    if (poi.type === 'portal') {
      const target = plans.find((other) => other.id === poi.to);
      if (!target) fail(`Portal "${poi.name}" führt in die Zone "${poi.to}", die es nicht gibt.`);
      const arrivals = ['spawn', ...(target.markers ?? []).map((marker) => marker.name)];
      if (!arrivals.includes(poi.arrive)) fail(`Portal "${poi.name}": In der Zone "${poi.to}" gibt es den Marker "${poi.arrive}" nicht.`);
    }
  }

  // ---- Gelände
  const { ground, deco, objects, walkable, info } = terrain(plan, kit, reserved);

  // ---- Erreichbarkeit
  const { label, sizes } = kit.labelRegions(walkable);
  const mainRegion = label[idx(plan.spawn.x, plan.spawn.y)];
  if (mainRegion === -1) fail('Der Startpunkt ist blockiert.');
  const reachable = (x, y) => inside(x, y) && label[idx(x, y)] === mainRegion;
  for (const c of plan.clearings) {
    if (c.marker && !reachable(Math.round(c.cx), Math.round(c.cy))) fail(`"${c.marker}" ist vom Start aus nicht erreichbar.`);
  }
  const walkableCells = sizes.reduce((sum, n) => sum + n, 0);
  const unreachable = walkableCells - sizes[mainRegion];
  if (unreachable > 0) fail(`${unreachable} begehbare Kacheln sind nicht erreichbar.`);
  for (const poi of plan.pois ?? []) {
    // Feste POIs (Truhe, Händler) erreicht man von der Kachel darunter, alle anderen betritt man.
    const ok = SOLID_POIS.includes(poi.type) ? reachable(poi.x, poi.y + 1) : reachable(poi.x, poi.y);
    if (!ok) fail(`POI "${poi.name}" (${poi.x}/${poi.y}) ist nicht erreichbar.`);
  }
  for (const marker of plan.markers ?? []) {
    if (!reachable(marker.x, marker.y)) fail(`Marker "${marker.name}" (${marker.x}/${marker.y}) ist nicht erreichbar.`);
  }

  // ---- Gegner

  // Flächen, die Gegnergruppen aufnehmen können: Lichtungen und Lager (innerhalb des Zauns).
  const areas = new Map();
  for (const c of plan.clearings) if (c.marker) areas.set(c.marker, c);
  for (const s of plan.structures ?? []) {
    if (s.type === 'lager') areas.set(s.marker, { cx: s.x + (s.width - 1) / 2, cy: s.y + (s.height - 1) / 2, rx: (s.width - 2) / 2, ry: (s.height - 2) / 2 });
  }
  // Rund um POIs bleibt Platz: Dort erscheint kein gewöhnlicher Gegner.
  const taken = (plan.pois ?? []).map((poi) => ({ x: poi.x, y: poi.y }));

  // Eigener Zufallsgenerator: so ändert sich die Landschaft nicht, wenn man Gegner umstellt.
  const enemyRng = mulberry32(plan.seed + 11);
  const enemySpawns = [];
  for (const [marker, group] of Object.entries(plan.enemyGroups ?? {})) {
    const area = areas.get(marker);
    if (!area) fail(`Gegnergruppe "${marker}": diese Lichtung (oder dieses Lager) gibt es nicht.`);
    const placed = [];
    for (const [type, levels] of Object.entries(group)) {
      if (!enemyTypes.includes(type)) fail(`Gegnergruppe "${marker}": Den Gegner "${type}" gibt es nicht (src/data/enemies.ts).`);
      for (const level of levels) {
        // Erst mit großem Abstand zueinander versuchen, dann enger werden.
        let spot = null;
        for (let spacing = 5; spacing >= 2 && !spot; spacing -= 0.5) {
          for (let attempt = 0; attempt < 60 && !spot; attempt++) {
            const angle = enemyRng() * Math.PI * 2;
            const radius = Math.sqrt(enemyRng()) * 0.8;
            const x = Math.round(area.cx + Math.cos(angle) * area.rx * radius);
            const y = Math.round(area.cy + Math.sin(angle) * area.ry * radius);
            // Rundherum muss Platz sein, und der Platz muss vom Start aus erreichbar sein.
            let free = reachable(x, y);
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (!walkable(x + dx, y + dy)) free = false;
            if (free && taken.some((p) => Math.hypot(p.x - x, p.y - y) < 2)) free = false;
            if (free && placed.every((p) => Math.hypot(p.x - x, p.y - y) >= spacing)) spot = { x, y };
          }
        }
        if (!spot) fail(`Gegnergruppe "${marker}": kein Platz für "${type}".`);
        placed.push(spot);
        enemySpawns.push({ name: type, type: 'gegner', x: spot.x, y: spot.y, level });
      }
    }
  }

  // ---- Schreiben

  const center = (v) => v * TILE + TILE / 2;
  let nextObjectId = 1;
  /** Ein Punkt in der Karte. Alles außer Name, Art und Platz landet als Eigenschaft daran (z. B. level, to). */
  const toPoint = ({ name, type, x, y, ...rest }) => {
    const properties = Object.entries(rest).map(([key, value]) => ({ name: key, type: typeof value === 'number' ? 'int' : 'string', value }));
    return {
      id: nextObjectId++, name, type, x: center(x), y: center(y),
      width: 0, height: 0, point: true, rotation: 0, visible: true,
      ...(properties.length > 0 ? { properties } : {}),
    };
  };
  const markers = [
    { name: 'spawn', type: 'spawn', x: plan.spawn.x, y: plan.spawn.y },
    ...(plan.markers ?? []).map((marker) => ({ ...marker, type: 'ankunft' })),
    // `label` = Ortsname auf der großen Karte (src/ui/WorldMap.ts).
    ...plan.clearings.filter((c) => c.marker).map((c) => ({ name: c.marker, type: 'gebiet', x: Math.round(c.cx), y: Math.round(c.cy), ...(c.label ? { label: c.label } : {}) })),
    // Lager mit Ortsnamen bekommen ebenfalls einen Punkt (in ihrer Mitte).
    ...(plan.structures ?? []).filter((s) => s.type === 'lager' && s.label).map((s) => ({ name: s.marker, type: 'gebiet', x: Math.round(s.x + (s.width - 1) / 2), y: Math.round(s.y + (s.height - 1) / 2), label: s.label })),
  ].map(toPoint);
  const poiPoints = (plan.pois ?? []).map(toPoint);
  const enemyPoints = enemySpawns.map(toPoint);

  const layerRows = (data) => {
    const rows = [];
    for (let y = 0; y < H; y++) rows.push(Array.from(data.subarray(y * W, (y + 1) * W), (t) => t + 1).join(','));
    return `[\n${rows.join(',\n')}]`;
  };

  const tiles = tileset.build();
  const sheetRows = Math.ceil(tiles.length / tileset.columns);
  const objectLayer = (id, name, objects) => ({ id, name, type: 'objectgroup', draworder: 'topdown', x: 0, y: 0, opacity: 1, visible: true, objects });
  const map = {
    compressionlevel: -1,
    width: W, height: H, tilewidth: TILE, tileheight: TILE,
    infinite: false, orientation: 'orthogonal', renderorder: 'right-down',
    type: 'map', version: '1.10', tiledversion: '1.11.0',
    nextlayerid: 7, nextobjectid: nextObjectId,
    layers: [
      ...[
        { id: 1, name: 'Boden', data: '@@Boden@@' },
        { id: 2, name: 'Deko', data: '@@Deko@@' },
        { id: 3, name: 'Objekte', data: '@@Objekte@@' },
      ].map((layer) => ({ ...layer, type: 'tilelayer', width: W, height: H, x: 0, y: 0, opacity: 1, visible: true })),
      objectLayer(4, 'Marker', markers),
      // Ein Punkt je besonderem Ort; `type` sagt dem Spiel, was dort passiert.
      objectLayer(5, 'POI', poiPoints),
      // Ein Punkt je Gegner; der Name ist der Gegnertyp aus src/data/enemies.ts, "level" seine Stufe.
      objectLayer(6, 'Gegner', enemyPoints),
    ],
    tilesets: [{
      firstgid: 1, name: plan.tileset, image: `../tilesets/${plan.tileset}.png`,
      imagewidth: tileset.columns * (TILE + 2), imageheight: sheetRows * (TILE + 2),
      margin: 1, spacing: 2, tilewidth: TILE, tileheight: TILE,
      tilecount: sheetRows * tileset.columns, columns: tileset.columns,
    }],
  };

  const json = JSON.stringify(map, null, 1)
    .replace('"@@Boden@@"', layerRows(ground))
    .replace('"@@Deko@@"', layerRows(deco))
    .replace('"@@Objekte@@"', layerRows(objects));

  const outFile = `public/assets/maps/${plan.id}.json`;
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, json + '\n');

  console.log(`Karte ${W}×${H} geschrieben: ${outFile}`);
  console.log(`  begehbar ${Math.round((walkableCells / (W * H)) * 100)} %, ${info}`);
  console.log(`  Gegner: ${enemySpawns.length}, POIs: ${poiPoints.length}`);

  // ---- Vorschau

  const previewAt = process.argv.indexOf('--preview');
  if (previewAt !== -1) {
    const image = newImage(W * TILE, H * TILE);
    for (let i = 0; i < image.data.length; i += 4) image.data.set([27, 26, 43, 255], i);
    for (const layer of [ground, deco, objects]) {
      kit.forEachCell((x, y) => {
        const tile = layer[idx(x, y)];
        if (tile >= 0) drawTile(image, tiles[tile], x * TILE, y * TILE);
      });
    }
    // Gegner rot, POIs gelb – nur damit man in der Vorschau sieht, wo etwas steht.
    const dot = (x, y, color) => {
      for (let dy = 5; dy < 11; dy++) for (let dx = 5; dx < 11; dx++) image.data.set(color, ((y * TILE + dy) * image.width + x * TILE + dx) * 4);
    };
    for (const enemy of enemySpawns) dot(enemy.x, enemy.y, [230, 40, 40, 255]);
    for (const poi of plan.pois ?? []) dot(poi.x, poi.y, [255, 230, 60, 255]);
    const file = path.join(process.argv[previewAt + 1], `${plan.id}.png`);
    savePng(file, image);
    console.log(`  Vorschau: ${file}`);
  }
}

for (const plan of plans) buildZone(plan);
