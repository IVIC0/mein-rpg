// Erzeugt die Zone "Grünwald" als Tiled-Karte: public/assets/maps/gruenwald.json
// Die Karte ist von Hand geplant (Dorf, Wege, Lichtungen, Ruine); der Wald
// dazwischen wird mit festem Zufalls-Startwert aufgefüllt – jedes Ausführen
// liefert also exakt dieselbe Karte.
//
// Aufruf:           npm run assets
// Mit Vorschaubild: node tools/build-map.mjs --preview vorschau.png
import fs from 'node:fs';
import path from 'node:path';
import { drawTile, newImage, savePng, TILE } from './lib/png.mjs';
import { DIRT, FENCE, FOREST, GRASS, HOUSE, PIECE, PROPS, RUIN, SHEET_COLUMNS, TOTAL_TILE_COUNT } from './lib/tiles.mjs';

const W = 120;
const H = 90;
const SEED = 20261111;

// ---------------------------------------------------------------- Planung

const SPAWN = { x: 22, y: 75 };

// Der Händler steht auf dem Dorfplatz, rechts oberhalb des Brunnens (Werte: src/data/shop.ts).
const MERCHANT = { x: 25, y: 70 };

const VILLAGE = { cx: 22, cy: 72, rx: 15, ry: 10.5 };

// Lichtungen: Platz für spätere Gegnergruppen. `marker` landet als Punkt in der Karte.
const CLEARINGS = [
  { marker: 'pilzhain', cx: 24, cy: 30, rx: 8, ry: 6.5 },
  { marker: 'lichtung', cx: 66, cy: 46, rx: 10, ry: 7.5 },
  { marker: 'ostlichtung', cx: 98, cy: 54, rx: 8.5, ry: 6.5 },
  { marker: 'suedlichtung', cx: 90, cy: 78, rx: 7, ry: 5 },
  { marker: 'ruine', cx: 97, cy: 18, rx: 10, ry: 6.5 },
  { marker: 'westlichtung', cx: 46, cy: 52, rx: 5.5, ry: 4.5 },
];

// Wege als Linienzüge (Kachel-Koordinaten). width = Breite des Erdwegs in Kacheln.
const ROADS = [
  { width: 3, points: [[22, 72], [36, 72], [48, 72], [58, 65], [63, 55], [66, 46]] }, // Dorf → Lichtung
  { width: 2, points: [[66, 46], [69, 36], [72, 29], [84, 22], [96, 18]] }, // Lichtung → Ruine
  { width: 2, points: [[21, 70], [19, 58], [22, 44], [24, 30]] }, // Dorf → Pilzhain
  { width: 2, points: [[24, 30], [38, 26], [54, 27], [72, 29]] }, // Pilzhain → Nordweg
  { width: 2, points: [[66, 46], [80, 49], [98, 54]] }, // Lichtung → Ostlichtung
  { width: 2, points: [[98, 54], [97, 66], [90, 78]] }, // Ostlichtung → Südlichtung
  { width: 2, points: [[48, 72], [60, 80], [76, 81], [90, 78]] }, // Südweg
  { width: 2, points: [[46, 52], [56, 60]] }, // Abzweig zur Westlichtung
];

// Gegnergruppen je Lichtung: Gegnertyp → Stufen, ein Gegner pro Eintrag.
// Die Typen mit ihren Werten stehen in src/data/enemies.ts. Je weiter vom Dorf,
// desto höher die Stufe. Die genauen Plätze werden unten ausgewürfelt.
const ENEMY_GROUPS = {
  westlichtung: { ratte: [1, 1, 1, 1] },
  pilzhain: { ratte: [1, 2, 2], spinne: [2, 2, 3] },
  lichtung: { ratte: [3, 3, 3, 3], spinne: [3, 4, 4] },
  suedlichtung: { spinne: [5, 5, 5, 6] },
  ostlichtung: { spinne: [6, 6, 7], wegelagerer: [7, 7] },
  ruine: { wegelagerer: [8, 8, 9, 9, 10], raeuberhauptmann: [10] }, // der Hauptmann ist der Boss (src/data/enemies.ts)
};

// ---------------------------------------------------------------- Helfer

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(SEED);
const pick = (list) => list[Math.floor(rng() * list.length)];

/** Weiches Rauschen 0..1: Zufallswerte auf einem Gitter, dazwischen geglättet. */
function makeNoise(seed) {
  const hash = (x, y) => {
    let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ seed;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const smooth = (t) => t * t * (3 - 2 * t);
  return (x, y) => {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = smooth(x - x0);
    const fy = smooth(y - y0);
    const top = hash(x0, y0) * (1 - fx) + hash(x0 + 1, y0) * fx;
    const bottom = hash(x0, y0 + 1) * (1 - fx) + hash(x0 + 1, y0 + 1) * fx;
    return top * (1 - fy) + bottom * fy;
  };
}

const idx = (x, y) => y * W + x;
const inside = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
const mask = () => new Uint8Array(W * H);
const has = (m, x, y) => inside(x, y) && m[idx(x, y)] === 1;

function forEachCell(fn) {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) fn(x, y);
}

const edgeNoise = makeNoise(SEED + 7);

function stampEllipse(m, { cx, cy, rx, ry }, wobble = 0.35) {
  forEachCell((x, y) => {
    const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
    if (d + (edgeNoise(x / 3, y / 3) - 0.5) * wobble <= 1) m[idx(x, y)] = 1;
  });
}

/** Zieht einen Pinsel (Quadrat mit Kantenlänge `size`) entlang eines Linienzugs. */
function stampLine(m, points, size) {
  const offset = Math.floor((size - 1) / 2);
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, ay] = points[i];
    const [bx, by] = points[i + 1];
    const steps = Math.ceil(Math.hypot(bx - ax, by - ay) * 2);
    for (let s = 0; s <= steps; s++) {
      const px = Math.round(ax + ((bx - ax) * s) / steps) - offset;
      const py = Math.round(ay + ((by - ay) * s) / steps) - offset;
      for (let dy = 0; dy < size; dy++) {
        for (let dx = 0; dx < size; dx++) {
          if (inside(px + dx, py + dy)) m[idx(px + dx, py + dy)] = 1;
        }
      }
    }
  }
}

function stampRect(m, x0, y0, w, h) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (inside(x, y)) m[idx(x, y)] = 1;
}

// ---------------------------------------------------------------- Ebenen

const clear = mask(); // hier darf kein Wald wachsen
const dirt = mask();
const forest = mask();
const autumn = mask();
const blocked = mask();

const ground = new Int16Array(W * H).fill(GRASS.plain);
const deco = new Int16Array(W * H).fill(-1); // begehbare Dekoration
const objects = new Int16Array(W * H).fill(-1); // alles hier blockiert

function putObject(x, y, tile) {
  objects[idx(x, y)] = tile;
  blocked[idx(x, y)] = 1;
  forest[idx(x, y)] = 0;
  deco[idx(x, y)] = -1;
}

// ---------------------------------------------------------------- Freiflächen und Wege

stampEllipse(clear, VILLAGE, 0.25);
for (const c of CLEARINGS) stampEllipse(clear, c);
for (const road of ROADS) {
  stampLine(clear, road.points, road.width + 3);
  stampLine(dirt, road.points, road.width);
}

// Dorfplatz und kurze Wege zu den Haustüren.
stampRect(dirt, 17, 69, 11, 7);
stampLine(dirt, [[14, 68], [14, 71], [17, 71]], 2); // Haus im Westen
stampLine(dirt, [[29, 67], [29, 70], [27, 70]], 2); // Haus im Nordosten
stampLine(dirt, [[35, 70], [35, 71]], 2); // Haus im Osten

// ---------------------------------------------------------------- Wald

const forestNoiseA = makeNoise(SEED + 1);
const forestNoiseB = makeNoise(SEED + 2);
const autumnNoise = makeNoise(SEED + 3);

forEachCell((x, y) => {
  const border = Math.min(x, y, W - 1 - x, H - 1 - y);
  let density = 0.62 * forestNoiseA(x / 10, y / 10) + 0.38 * forestNoiseB(x / 4, y / 4);
  if (border < 7) density += (7 - border) * 0.07; // zum Kartenrand hin dichter
  const isForest = border < 2 || (density > 0.47 && !clear[idx(x, y)]);
  if (isForest) forest[idx(x, y)] = 1;

  // Herbstwald im Nordosten rund um die Ruine.
  const distance = Math.hypot((W - 1 - x) / 1.25, y);
  if (distance < 34 + autumnNoise(x / 6, y / 6) * 12) autumn[idx(x, y)] = 1;
});

// ---------------------------------------------------------------- Dorf

function stampHouse(x, y, width, roof, wall, { door, windows = [], chimney = -1 }) {
  for (let i = 0; i < width; i++) {
    const part = i === 0 ? 0 : i === width - 1 ? 2 : 1;
    putObject(x + i, y, i === chimney ? roof.chimney : roof.roofTop[part]);
    putObject(x + i, y + 1, roof.roofBottom[part]);
    let tile = part === 0 ? wall.left : part === 2 ? wall.right : wall.mid;
    if (i === door) tile = wall.door;
    if (windows.includes(i)) tile = wall.window;
    putObject(x + i, y + 2, tile);
  }
}

function stampFence(x, y, width, height, gateOffset) {
  for (let i = 0; i < width; i++) {
    putObject(x + i, y, i === 0 ? FENCE.nw : i === width - 1 ? FENCE.ne : FENCE.n);
    const bottom = i === 0 ? FENCE.sw : i === width - 1 ? FENCE.se : i === gateOffset ? -1 : FENCE.n;
    if (bottom === -1) deco[idx(x + i, y + height - 1)] = FENCE.gate; // offenes Tor, begehbar
    else putObject(x + i, y + height - 1, bottom);
  }
  for (let j = 1; j < height - 1; j++) {
    putObject(x, y + j, FENCE.w);
    putObject(x + width - 1, y + j, FENCE.e);
  }
}

stampHouse(12, 65, 4, HOUSE.red, HOUSE.wood, { door: 2, windows: [1], chimney: 1 });
stampHouse(27, 64, 5, HOUSE.gray, HOUSE.stone, { door: 2, windows: [1, 3], chimney: 3 });
stampHouse(34, 67, 3, HOUSE.red, HOUSE.wood, { door: 1 });

putObject(22, 71, PROPS.wellTop);
putObject(22, 72, PROPS.well);
putObject(39, 70, PROPS.sign);
putObject(17, 66, PROPS.log);
putObject(32, 67, PROPS.pot);
putObject(29, 76, PROPS.cart);

stampFence(10, 73, 5, 4, 3);
putObject(11, 74, PROPS.hay);
putObject(12, 74, PROPS.hay);
putObject(11, 75, PROPS.beehive);
putObject(16, 79, PROPS.target);

// ---------------------------------------------------------------- Ruine

{
  const x0 = 92;
  const y0 = 14;
  const face = [RUIN.wall, RUIN.slit, RUIN.wall, RUIN.wall, RUIN.archLeft, RUIN.archRight, RUIN.wall, RUIN.wall, RUIN.slit, RUIN.wall];
  face.forEach((tile, i) => {
    putObject(x0 + i, y0, i === 0 ? RUIN.topLeft : i === face.length - 1 ? RUIN.topRight : RUIN.top);
    putObject(x0 + i, y0 + 1, tile);
  });
}

// ---------------------------------------------------------------- Aufräumen

// Kein Erdweg unter Bäumen, und nie nur eine Kachel breit (dafür gibt es keine Grafik).
forEachCell((x, y) => {
  if (forest[idx(x, y)]) dirt[idx(x, y)] = 0;
});
for (let changed = true; changed; ) {
  changed = false;
  forEachCell((x, y) => {
    if (!dirt[idx(x, y)]) return;
    const thinH = !has(dirt, x - 1, y) && !has(dirt, x + 1, y);
    const thinV = !has(dirt, x, y - 1) && !has(dirt, x, y + 1);
    if (thinH || thinV) {
      dirt[idx(x, y)] = 0;
      changed = true;
    }
  });
}

function walkable(x, y) {
  return inside(x, y) && !forest[idx(x, y)] && !blocked[idx(x, y)];
}

/** Nummeriert zusammenhängende begehbare Gebiete. */
function labelRegions() {
  const label = new Int32Array(W * H).fill(-1);
  const sizes = [];
  forEachCell((sx, sy) => {
    if (!walkable(sx, sy) || label[idx(sx, sy)] !== -1) return;
    const id = sizes.length;
    const queue = [[sx, sy]];
    label[idx(sx, sy)] = id;
    let size = 0;
    while (queue.length) {
      const [x, y] = queue.pop();
      size++;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const ny = y + dy;
        if (walkable(nx, ny) && label[idx(nx, ny)] === -1) {
          label[idx(nx, ny)] = id;
          queue.push([nx, ny]);
        }
      }
    }
    sizes.push(size);
  });
  return { label, sizes };
}

// Abgeschnittene Wiesen: kleine werden zugeforstet, größere bekommen einen
// Durchgang zum Hauptgebiet (versteckte Lichtungen).
let pocketsFilled = 0;
let pocketsOpened = 0;
for (let pass = 0; pass < 40; pass++) {
  const { label, sizes } = labelRegions();
  const main = label[idx(SPAWN.x, SPAWN.y)];
  const pocket = sizes.findIndex((size, id) => id !== main && size > 0);
  if (pocket === -1) break;

  const cells = [];
  forEachCell((x, y) => {
    if (label[idx(x, y)] === pocket) cells.push([x, y]);
  });
  const touchesObject = cells.some(([x, y]) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => has(blocked, x + dx, y + dy)));

  if (sizes[pocket] < 14 && !touchesObject) {
    for (const [x, y] of cells) forest[idx(x, y)] = 1;
    pocketsFilled++;
    continue;
  }

  // Breitensuche durch den Wald bis zum Hauptgebiet, dann den Weg freischlagen.
  const previous = new Int32Array(W * H).fill(-2);
  const queue = cells.map(([x, y]) => idx(x, y));
  for (const i of queue) previous[i] = -1;
  let hit = -1;
  for (let head = 0; head < queue.length && hit === -1; head++) {
    const current = queue[head];
    const x = current % W;
    const y = Math.floor(current / W);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 2 || ny < 2 || nx >= W - 2 || ny >= H - 2) continue;
      const next = idx(nx, ny);
      if (previous[next] !== -2 || blocked[next]) continue;
      previous[next] = current;
      if (label[next] === main) {
        hit = next;
        break;
      }
      queue.push(next);
    }
  }
  if (hit === -1) throw new Error('Abgeschnittenes Gebiet lässt sich nicht anbinden.');
  for (let current = hit; current !== -1; current = previous[current]) forest[current] = 0;
  pocketsOpened++;
}

// ---------------------------------------------------------------- Kacheln setzen

// Boden: Gras mit etwas Abwechslung, in Lichtungen mehr Blumen.
forEachCell((x, y) => {
  const r = rng();
  const open = !forest[idx(x, y)];
  const flowerChance = open && clear[idx(x, y)] ? 0.07 : open ? 0.035 : 0;
  let tile = GRASS.plain;
  if (r < flowerChance) tile = GRASS.flowers;
  else if (r < flowerChance + 0.16) tile = GRASS.tufts;
  else if (open && r > 0.992) tile = GRASS.stones;
  ground[idx(x, y)] = tile;
});

// Erdweg: passende Rand- oder Eckkachel je nach Nachbarn.
let roughDirtCells = 0;
forEachCell((x, y) => {
  if (!dirt[idx(x, y)]) return;
  const n = has(dirt, x, y - 1);
  const s = has(dirt, x, y + 1);
  const w = has(dirt, x - 1, y);
  const e = has(dirt, x + 1, y);
  const missingDiagonals = [
    [!has(dirt, x - 1, y - 1) && n && w, DIRT.innerNW],
    [!has(dirt, x + 1, y - 1) && n && e, DIRT.innerNE],
    [!has(dirt, x + 1, y + 1) && s && e, DIRT.innerSE],
    [!has(dirt, x - 1, y + 1) && s && w, DIRT.innerSW],
  ].filter(([missing]) => missing);

  let tile = DIRT.center;
  if (n && s && w && e) {
    if (missingDiagonals.length > 0) tile = missingDiagonals[0][1];
    if (missingDiagonals.length > 1) roughDirtCells++;
  } else {
    if (!n && !w) tile = DIRT.nw;
    else if (!n && !e) tile = DIRT.ne;
    else if (!s && !w) tile = DIRT.sw;
    else if (!s && !e) tile = DIRT.se;
    else if (!n) tile = DIRT.n;
    else if (!s) tile = DIRT.s;
    else if (!w) tile = DIRT.w;
    else tile = DIRT.e;
    if (missingDiagonals.length > 0) roughDirtCells++;
  }
  ground[idx(x, y)] = tile;
});

// Wald: jede Kachel bekommt die Baum-Teilstücke, die sie mit ihren Nachbarn teilt.
forEachCell((x, y) => {
  if (!forest[idx(x, y)]) return;
  const isAutumn = autumn[idx(x, y)] === 1;
  const variant = isAutumn ? FOREST.autumn : FOREST.green;
  // Jenseits des Kartenrands geht der Wald gedanklich weiter, sonst stünden am Rand halbe Lücken.
  const shares = (nx, ny) => !inside(nx, ny) || (has(forest, nx, ny) && (autumn[idx(nx, ny)] === 1) === isAutumn);
  let pieces = 0;
  if (shares(x - 1, y)) pieces |= PIECE.L;
  if (shares(x + 1, y)) pieces |= PIECE.R;
  if (shares(x, y - 1)) pieces |= PIECE.T;
  if (shares(x, y + 1)) pieces |= PIECE.B;
  objects[idx(x, y)] = pieces === 0 ? pick(variant.single) : variant.first + pieces;
  blocked[idx(x, y)] = 1;
});

// Büsche auf wilden Wiesen (blockieren), Pilze und Triebe am Waldrand (begehbar).
const pilzhain = CLEARINGS.find((c) => c.marker === 'pilzhain');
forEachCell((x, y) => {
  const i = idx(x, y);
  if (blocked[i] || dirt[i] || deco[i] !== -1) return;
  if (Math.abs(x - SPAWN.x) < 2 && Math.abs(y - SPAWN.y) < 2) return;
  const nearForest = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => has(forest, x + dx, y + dy));
  const inPilzhain = ((x - pilzhain.cx) / pilzhain.rx) ** 2 + ((y - pilzhain.cy) / pilzhain.ry) ** 2 < 1;
  const r = rng();
  if (inPilzhain && r < 0.12) deco[i] = PROPS.mushrooms;
  else if (nearForest && r < 0.05) deco[i] = rng() < 0.6 ? PROPS.mushrooms : PROPS.sprout;
  else if (!clear[i] && !nearForest && r < 0.02) {
    // Ein Busch darf keinen Durchgang verschließen: nur setzen, wenn ringsum alles frei ist.
    let free = true;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (!walkable(x + dx, y + dy)) free = false;
    if (free) putObject(x, y, PROPS.bush);
  }
});

// ---------------------------------------------------------------- Prüfen

const { label, sizes } = labelRegions();
const mainRegion = label[idx(SPAWN.x, SPAWN.y)];
if (mainRegion === -1) throw new Error('Der Startpunkt ist blockiert.');
for (const c of CLEARINGS) {
  if (label[idx(Math.round(c.cx), Math.round(c.cy))] !== mainRegion) throw new Error(`"${c.marker}" ist vom Start aus nicht erreichbar.`);
}
const walkableCells = sizes.reduce((sum, n) => sum + n, 0);
const unreachable = walkableCells - sizes[mainRegion];
if (unreachable > 0) throw new Error(`${unreachable} begehbare Kacheln sind nicht erreichbar.`);

// ---------------------------------------------------------------- Gegner

// Eigener Zufallsgenerator: so ändert sich die Landschaft nicht, wenn man Gegner umstellt.
const enemyRng = mulberry32(SEED + 11);
const enemySpawns = [];
for (const [marker, group] of Object.entries(ENEMY_GROUPS)) {
  const clearing = CLEARINGS.find((c) => c.marker === marker);
  if (!clearing) throw new Error(`Gegnergruppe "${marker}": diese Lichtung gibt es nicht.`);
  const placed = [];
  for (const [type, levels] of Object.entries(group)) {
    for (const level of levels) {
      // Erst mit großem Abstand zueinander versuchen, dann enger werden.
      let spot = null;
      for (let spacing = 5; spacing >= 2 && !spot; spacing -= 0.5) {
        for (let attempt = 0; attempt < 60 && !spot; attempt++) {
          const angle = enemyRng() * Math.PI * 2;
          const radius = Math.sqrt(enemyRng()) * 0.8;
          const x = Math.round(clearing.cx + Math.cos(angle) * clearing.rx * radius);
          const y = Math.round(clearing.cy + Math.sin(angle) * clearing.ry * radius);
          // Rundherum muss Platz sein, und der Platz muss vom Dorf aus erreichbar sein.
          let free = label[idx(x, y)] === mainRegion;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (!walkable(x + dx, y + dy)) free = false;
          if (free && placed.every((p) => Math.hypot(p.x - x, p.y - y) >= spacing)) spot = { x, y };
        }
      }
      if (!spot) throw new Error(`Gegnergruppe "${marker}": kein Platz für "${type}".`);
      placed.push(spot);
      enemySpawns.push({ name: type, type: 'gegner', x: spot.x, y: spot.y, level });
    }
  }
}

// ---------------------------------------------------------------- Schreiben

const center = (v) => v * TILE + TILE / 2;
let nextObjectId = 1;
const toPoint = (m) => ({
  id: nextObjectId++, name: m.name, type: m.type, x: center(m.x), y: center(m.y),
  width: 0, height: 0, point: true, rotation: 0, visible: true,
  // Gegner tragen ihre Stufe als Eigenschaft "level".
  ...(m.level ? { properties: [{ name: 'level', type: 'int', value: m.level }] } : {}),
});
const markers = [
  { name: 'spawn', type: 'spawn', x: SPAWN.x, y: SPAWN.y },
  { name: 'haendler', type: 'npc', x: MERCHANT.x, y: MERCHANT.y },
  ...CLEARINGS.map((c) => ({ name: c.marker, type: 'gebiet', x: Math.round(c.cx), y: Math.round(c.cy) })),
].map(toPoint);
const enemyPoints = enemySpawns.map(toPoint);

const layerRows = (data) => {
  const rows = [];
  for (let y = 0; y < H; y++) rows.push(Array.from(data.subarray(y * W, (y + 1) * W), (t) => t + 1).join(','));
  return `[\n${rows.join(',\n')}]`;
};

const sheetRows = Math.ceil(TOTAL_TILE_COUNT / SHEET_COLUMNS);
const map = {
  compressionlevel: -1,
  width: W, height: H, tilewidth: TILE, tileheight: TILE,
  infinite: false, orientation: 'orthogonal', renderorder: 'right-down',
  type: 'map', version: '1.10', tiledversion: '1.11.0',
  nextlayerid: 6, nextobjectid: nextObjectId,
  layers: [
    { id: 1, name: 'Boden', data: '@@Boden@@' },
    { id: 2, name: 'Deko', data: '@@Deko@@' },
    { id: 3, name: 'Objekte', data: '@@Objekte@@' },
  ].map((layer) => ({ ...layer, type: 'tilelayer', width: W, height: H, x: 0, y: 0, opacity: 1, visible: true })),
  tilesets: [{
    firstgid: 1, name: 'gruenwald', image: '../tilesets/gruenwald.png',
    imagewidth: SHEET_COLUMNS * (TILE + 2), imageheight: sheetRows * (TILE + 2),
    margin: 1, spacing: 2, tilewidth: TILE, tileheight: TILE,
    tilecount: sheetRows * SHEET_COLUMNS, columns: SHEET_COLUMNS,
  }],
};
map.layers.push({
  id: 4, name: 'Marker', type: 'objectgroup', draworder: 'topdown',
  x: 0, y: 0, opacity: 1, visible: true, objects: markers,
});
// Ein Punkt je Gegner; der Name ist der Gegnertyp aus src/data/enemies.ts, "level" seine Stufe.
map.layers.push({
  id: 5, name: 'Gegner', type: 'objectgroup', draworder: 'topdown',
  x: 0, y: 0, opacity: 1, visible: true, objects: enemyPoints,
});

const json = JSON.stringify(map, null, 1)
  .replace('"@@Boden@@"', layerRows(ground))
  .replace('"@@Deko@@"', layerRows(deco))
  .replace('"@@Objekte@@"', layerRows(objects));

const outFile = 'public/assets/maps/gruenwald.json';
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, json + '\n');

const percent = (n) => `${Math.round((n / (W * H)) * 100)} %`;
console.log(`Karte ${W}×${H} geschrieben: ${outFile}`);
console.log(`  begehbar ${percent(walkableCells)}, Wald ${percent(forest.reduce((a, b) => a + b, 0))}`);
console.log(`  Gegner: ${enemySpawns.length}`);
console.log(`  Wiesen zugeforstet: ${pocketsFilled}, angebunden: ${pocketsOpened}, unsaubere Wegkacheln: ${roughDirtCells}`);

// ---------------------------------------------------------------- Vorschau

const previewAt = process.argv.indexOf('--preview');
if (previewAt !== -1) {
  const { buildTownTiles } = await import('./build-tilesets.mjs');
  const tiles = buildTownTiles();
  const image = newImage(W * TILE, H * TILE);
  for (const layer of [ground, deco, objects]) {
    forEachCell((x, y) => {
      const tile = layer[idx(x, y)];
      if (tile >= 0) drawTile(image, tiles[tile], x * TILE, y * TILE);
    });
  }
  savePng(process.argv[previewAt + 1], image);
  console.log(`  Vorschau: ${process.argv[previewAt + 1]}`);
}
