// Werkzeugkasten für den Karten-Bauer: fester Zufall, weiches Rauschen und Schablonen
// (Ellipse, Linie, Rechteck) für eine Karte mit W × H Kacheln.
// Jede Gelände-Art (terrain-wald.mjs, terrain-hoehle.mjs) arbeitet damit.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Weiches Rauschen 0..1: Zufallswerte auf einem Gitter, dazwischen geglättet. */
export function makeNoise(seed) {
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

export const NEIGHBOURS_4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/**
 * Helfer für eine Karte mit `W` × `H` Kacheln. `seed` ist der feste Zufalls-Startwert:
 * Derselbe Bauplan ergibt bei jedem Lauf exakt dieselbe Karte.
 */
export function createKit(W, H, seed) {
  const rng = mulberry32(seed);
  const idx = (x, y) => y * W + x;
  const inside = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const edgeNoise = makeNoise(seed + 7);

  function forEachCell(fn) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) fn(x, y);
  }

  return {
    W, H, seed, rng, idx, inside, forEachCell,
    pick: (list) => list[Math.floor(rng() * list.length)],
    /** Eine leere Maske: ein Wert (0 oder 1) je Kachel. */
    mask: () => new Uint8Array(W * H),
    /** Eine leere Kachel-Ebene; -1 = hier liegt nichts. */
    layer: (fill = -1) => new Int16Array(W * H).fill(fill),
    has: (m, x, y) => inside(x, y) && m[idx(x, y)] === 1,

    /** Ellipse mit ausgefranstem Rand. `wobble` = wie stark der Rand ausfranst. */
    stampEllipse(m, { cx, cy, rx, ry }, wobble = 0.35) {
      forEachCell((x, y) => {
        const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
        if (d + (edgeNoise(x / 3, y / 3) - 0.5) * wobble <= 1) m[idx(x, y)] = 1;
      });
    },

    /** Zieht einen Pinsel (Quadrat mit Kantenlänge `size`) entlang eines Linienzugs. */
    stampLine(m, points, size) {
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
    },

    stampRect(m, x0, y0, w, h) {
      for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (inside(x, y)) m[idx(x, y)] = 1;
    },

    /** Nummeriert zusammenhängende begehbare Gebiete. `walkable(x, y)` sagt, wo man laufen kann. */
    labelRegions(walkable) {
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
          for (const [dx, dy] of NEIGHBOURS_4) {
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
    },
  };
}
