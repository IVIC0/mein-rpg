// Gelände-Art "wald": Wiesen, Erdwege und Lichtungen, dazwischen dichter Wald.
// Was wo liegt, steht im Bauplan der Zone (tools/zones/<zone>.mjs) – hier steht nur, wie
// daraus Kacheln werden. Benutzt das Tileset "gruenwald".
import { makeNoise, NEIGHBOURS_4 } from './mapkit.mjs';
import { DIRT, FENCE, FOREST, GRASS, HOUSE, PIECE, PROPS, RUIN } from './tiles.mjs';

/**
 * Baut das Gelände einer Wald-Zone.
 * `reserved` = Kacheln, auf denen später etwas Festes steht (Truhe, Händler): Dort wächst
 * nichts, und für die Erreichbarkeit zählen sie als Hindernis.
 * Zurück kommen die drei Kachel-Ebenen, `walkable(x, y)` und Zahlen für die Ausgabe.
 */
export function buildForest(plan, kit, reserved) {
  const { W, H, rng, pick, idx, inside, has, forEachCell } = kit;
  const seed = plan.seed;
  const spawn = plan.spawn;

  const clear = kit.mask(); // hier darf kein Wald wachsen
  const dirt = kit.mask();
  const forest = kit.mask();
  const autumn = kit.mask();
  const blocked = kit.mask();

  const ground = kit.layer(GRASS.plain);
  const deco = kit.layer(); // begehbare Dekoration
  const objects = kit.layer(); // alles hier blockiert

  function putObject(x, y, tile) {
    objects[idx(x, y)] = tile;
    blocked[idx(x, y)] = 1;
    forest[idx(x, y)] = 0;
    deco[idx(x, y)] = -1;
  }

  // ---------------------------------------------------------------- Freiflächen und Wege

  for (const c of plan.clearings) kit.stampEllipse(clear, c, c.wobble);
  for (const road of plan.roads) {
    kit.stampLine(clear, road.points, road.width + 3);
    kit.stampLine(dirt, road.points, road.width);
  }
  // Plätze und kurze Wege ohne Rodung drumherum (z. B. Dorfplatz, Wege zu den Haustüren).
  for (const patch of plan.dirt ?? []) {
    if (patch.rect) kit.stampRect(dirt, ...patch.rect);
    else kit.stampLine(dirt, patch.line, patch.width);
  }
  // Ein Lager braucht Platz: seine Fläche und zwei Kacheln rundherum bleiben frei.
  for (const s of plan.structures ?? []) {
    if (s.type === 'lager') kit.stampRect(clear, s.x - 2, s.y - 2, s.width + 4, s.height + 4);
  }
  for (let i = 0; i < reserved.length; i++) if (reserved[i]) clear[i] = 1;

  // ---------------------------------------------------------------- Wald

  const forestNoiseA = makeNoise(seed + 1);
  const forestNoiseB = makeNoise(seed + 2);
  const autumnNoise = makeNoise(seed + 3);

  forEachCell((x, y) => {
    const border = Math.min(x, y, W - 1 - x, H - 1 - y);
    let density = 0.62 * forestNoiseA(x / 10, y / 10) + 0.38 * forestNoiseB(x / 4, y / 4);
    if (border < 7) density += (7 - border) * 0.07; // zum Kartenrand hin dichter
    const isForest = border < 2 || (density > 0.47 && !clear[idx(x, y)]);
    if (isForest) forest[idx(x, y)] = 1;

    // Herbstwald in der Ecke oben rechts (in Grünwald rund um die Ruine).
    if (plan.autumnCorner) {
      const distance = Math.hypot((W - 1 - x) / 1.25, y);
      if (distance < 34 + autumnNoise(x / 6, y / 6) * 12) autumn[idx(x, y)] = 1;
    }
  });

  // ---------------------------------------------------------------- Bauten

  function stampHouse({ x, y, width, roof, wall, door, windows = [], chimney = -1 }) {
    const roofTiles = HOUSE[roof];
    const wallTiles = HOUSE[wall];
    if (!roofTiles || !wallTiles) throw new Error(`Haus bei ${x}/${y}: Dach "${roof}" oder Wand "${wall}" gibt es nicht.`);
    for (let i = 0; i < width; i++) {
      const part = i === 0 ? 0 : i === width - 1 ? 2 : 1;
      putObject(x + i, y, i === chimney ? roofTiles.chimney : roofTiles.roofTop[part]);
      putObject(x + i, y + 1, roofTiles.roofBottom[part]);
      let tile = part === 0 ? wallTiles.left : part === 2 ? wallTiles.right : wallTiles.mid;
      if (i === door) tile = wallTiles.door;
      if (windows.includes(i)) tile = wallTiles.window;
      putObject(x + i, y + 2, tile);
    }
  }

  /** Zaun als Rechteck. `gate` = Abstand des offenen Tors von der linken Ecke (unten). */
  function stampFence({ x, y, width, height, gate }) {
    for (let i = 0; i < width; i++) {
      putObject(x + i, y, i === 0 ? FENCE.nw : i === width - 1 ? FENCE.ne : FENCE.n);
      const bottom = i === 0 ? FENCE.sw : i === width - 1 ? FENCE.se : i === gate ? -1 : FENCE.n;
      if (bottom === -1) deco[idx(x + i, y + height - 1)] = FENCE.gate; // offenes Tor, begehbar
      else putObject(x + i, y + height - 1, bottom);
    }
    for (let j = 1; j < height - 1; j++) {
      putObject(x, y + j, FENCE.w);
      putObject(x + width - 1, y + j, FENCE.e);
    }
  }

  function stampRuin({ x, y }) {
    const face = [RUIN.wall, RUIN.slit, RUIN.wall, RUIN.wall, RUIN.archLeft, RUIN.archRight, RUIN.wall, RUIN.wall, RUIN.slit, RUIN.wall];
    face.forEach((tile, i) => {
      putObject(x + i, y, i === 0 ? RUIN.topLeft : i === face.length - 1 ? RUIN.topRight : RUIN.top);
      putObject(x + i, y + 1, tile);
    });
  }

  for (const s of plan.structures ?? []) {
    if (s.type === 'haus') stampHouse(s);
    else if (s.type === 'zaun' || s.type === 'lager') stampFence(s);
    else if (s.type === 'ruine') stampRuin(s);
    else if (s.type === 'ding') {
      if (PROPS[s.tile] === undefined) throw new Error(`Ding "${s.tile}" bei ${s.x}/${s.y} gibt es im Tileset nicht (PROPS in tools/lib/tiles.mjs).`);
      putObject(s.x, s.y, PROPS[s.tile]);
    } else throw new Error(`Bauten: Die Art "${s.type}" kennt die Gelände-Art "wald" nicht.`);
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
    return inside(x, y) && !forest[idx(x, y)] && !blocked[idx(x, y)] && !reserved[idx(x, y)];
  }

  // Abgeschnittene Wiesen: kleine werden zugeforstet, größere bekommen einen
  // Durchgang zum Hauptgebiet (versteckte Lichtungen).
  let pocketsFilled = 0;
  let pocketsOpened = 0;
  for (let pass = 0; pass < 40; pass++) {
    const { label, sizes } = kit.labelRegions(walkable);
    const main = label[idx(spawn.x, spawn.y)];
    const pocket = sizes.findIndex((size, id) => id !== main && size > 0);
    if (pocket === -1) break;

    const cells = [];
    forEachCell((x, y) => {
      if (label[idx(x, y)] === pocket) cells.push([x, y]);
    });
    const touchesObject = cells.some(([x, y]) => NEIGHBOURS_4.some(([dx, dy]) => has(blocked, x + dx, y + dy)));

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
      for (const [dx, dy] of NEIGHBOURS_4) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 2 || ny < 2 || nx >= W - 2 || ny >= H - 2) continue;
        const next = idx(nx, ny);
        if (previous[next] !== -2 || blocked[next] || reserved[next]) continue;
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
  // Lichtungen mit `mushrooms` im Bauplan bekommen besonders viele Pilze (0.12 = auf 12 % der Kacheln).
  const mushroomAreas = plan.clearings.filter((c) => c.mushrooms);
  forEachCell((x, y) => {
    const i = idx(x, y);
    if (blocked[i] || dirt[i] || deco[i] !== -1 || reserved[i]) return;
    if (Math.abs(x - spawn.x) < 2 && Math.abs(y - spawn.y) < 2) return;
    const nearForest = NEIGHBOURS_4.some(([dx, dy]) => has(forest, x + dx, y + dy));
    const mushroomArea = mushroomAreas.find((c) => ((x - c.cx) / c.rx) ** 2 + ((y - c.cy) / c.ry) ** 2 < 1);
    const r = rng();
    if (mushroomArea && r < mushroomArea.mushrooms) deco[i] = PROPS.mushrooms;
    else if (nearForest && r < 0.05) deco[i] = rng() < 0.6 ? PROPS.mushrooms : PROPS.sprout;
    else if (!clear[i] && !nearForest && r < 0.02) {
      // Ein Busch darf keinen Durchgang verschließen: nur setzen, wenn ringsum alles frei ist.
      let free = true;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (!walkable(x + dx, y + dy)) free = false;
      if (free) putObject(x, y, PROPS.bush);
    }
  });

  return {
    ground, deco, objects, walkable,
    info: `Wald ${Math.round((forest.reduce((a, b) => a + b, 0) / (W * H)) * 100)} %, Wiesen zugeforstet: ${pocketsFilled}, angebunden: ${pocketsOpened}, unsaubere Wegkacheln: ${roughDirtCells}`,
  };
}
