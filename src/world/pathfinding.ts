import { BODY_RADIUS } from '../config';
import { Grid, type Point } from './Grid';

const STRAIGHT = 10;
const DIAGONAL = 14; // ≈ 10 × √2, ganzzahlig gerechnet

const DIRECTIONS = [
  [1, 0, STRAIGHT],
  [-1, 0, STRAIGHT],
  [0, 1, STRAIGHT],
  [0, -1, STRAIGHT],
  [1, 1, DIAGONAL],
  [1, -1, DIAGONAL],
  [-1, 1, DIAGONAL],
  [-1, -1, DIAGONAL],
] as const;

/**
 * A*-Wegsuche auf dem Kachelraster, in 8 Richtungen. Diagonal geht es nur,
 * wenn beide angrenzenden Kacheln frei sind – die Figur schneidet keine Ecken.
 * Liefert die Kacheln vom Start bis zum Ziel (beide inklusive) oder null.
 */
export function findTilePath(grid: Grid, sx: number, sy: number, gx: number, gy: number): { tx: number; ty: number }[] | null {
  if (!grid.isWalkable(sx, sy) || grid.regionAt(sx, sy) !== grid.regionAt(gx, gy)) return null;

  const size = grid.width * grid.height;
  const cost = new Int32Array(size).fill(-1); // bisher günstigste Kosten ab Start
  const cameFrom = new Int32Array(size).fill(-1);
  const closed = new Uint8Array(size);
  const open = new MinHeap();

  const estimate = (tx: number, ty: number) => {
    const dx = Math.abs(tx - gx);
    const dy = Math.abs(ty - gy);
    return STRAIGHT * Math.max(dx, dy) + (DIAGONAL - STRAIGHT) * Math.min(dx, dy);
  };

  const start = grid.index(sx, sy);
  const goal = grid.index(gx, gy);
  cost[start] = 0;
  open.push(start, estimate(sx, sy));

  while (open.size > 0) {
    const current = open.pop();
    if (current === goal) break;
    if (closed[current]) continue;
    closed[current] = 1;

    const tx = current % grid.width;
    const ty = Math.floor(current / grid.width);
    for (const [dx, dy, stepCost] of DIRECTIONS) {
      const nx = tx + dx;
      const ny = ty + dy;
      if (!grid.isWalkable(nx, ny)) continue;
      if (dx !== 0 && dy !== 0 && (!grid.isWalkable(tx + dx, ty) || !grid.isWalkable(tx, ty + dy))) continue;
      const neighbour = grid.index(nx, ny);
      if (closed[neighbour]) continue;
      const newCost = cost[current] + stepCost;
      if (cost[neighbour] !== -1 && newCost >= cost[neighbour]) continue;
      cost[neighbour] = newCost;
      cameFrom[neighbour] = current;
      open.push(neighbour, newCost + estimate(nx, ny));
    }
  }

  if (cost[goal] === -1) return null;
  const path: { tx: number; ty: number }[] = [];
  for (let current = goal; current !== -1; current = cameFrom[current]) {
    path.push({ tx: current % grid.width, ty: Math.floor(current / grid.width) });
  }
  return path.reverse();
}

/**
 * Berechnet die Wegpunkte (Welt-Koordinaten) von `from` nach `to`.
 * Der Kachelweg wird geglättet: Überall, wo die Figur geradeaus laufen kann,
 * fallen die Zwischenpunkte weg – so läuft sie nicht im Zickzack.
 */
export function findWaypoints(grid: Grid, from: Point, to: Point): Point[] | null {
  const sx = Grid.toTile(from.x);
  const sy = Grid.toTile(from.y);
  const gx = Grid.toTile(to.x);
  const gy = Grid.toTile(to.y);
  const tiles = findTilePath(grid, sx, sy, gx, gy);
  if (!tiles) return null;

  const points: Point[] = tiles.map((t) => ({ x: Grid.tileCenter(t.tx), y: Grid.tileCenter(t.ty) }));
  // Die Figur steht selten genau in der Kachelmitte: wenn möglich direkt loslaufen.
  if (points.length > 1 && grid.hasClearLine(from, points[1], BODY_RADIUS)) points.shift();
  // Am Ziel genau zum Klickpunkt, sofern die Figur dort Platz hat.
  if (grid.isBoxFree(to.x, to.y, BODY_RADIUS)) points.push({ x: to.x, y: to.y });

  const waypoints: Point[] = [];
  let anchor = from;
  let i = 0;
  while (i < points.length) {
    let reach = i;
    while (reach + 1 < points.length && grid.hasClearLine(anchor, points[reach + 1], BODY_RADIUS)) reach++;
    waypoints.push(points[reach]);
    anchor = points[reach];
    i = reach + 1;
  }
  return waypoints;
}

/** Vorrangwarteschlange: gibt immer den Eintrag mit der kleinsten Priorität zurück. */
class MinHeap {
  private readonly items: number[] = [];
  private readonly priorities: number[] = [];

  get size(): number {
    return this.items.length;
  }

  push(item: number, priority: number): void {
    let i = this.items.length;
    this.items.push(item);
    this.priorities.push(priority);
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.priorities[parent] <= this.priorities[i]) break;
      this.swap(i, parent);
      i = parent;
    }
  }

  pop(): number {
    const top = this.items[0];
    const lastItem = this.items.pop()!;
    const lastPriority = this.priorities.pop()!;
    if (this.items.length > 0) {
      this.items[0] = lastItem;
      this.priorities[0] = lastPriority;
      let i = 0;
      for (;;) {
        const left = 2 * i + 1;
        const right = left + 1;
        let smallest = i;
        if (left < this.items.length && this.priorities[left] < this.priorities[smallest]) smallest = left;
        if (right < this.items.length && this.priorities[right] < this.priorities[smallest]) smallest = right;
        if (smallest === i) break;
        this.swap(i, smallest);
        i = smallest;
      }
    }
    return top;
  }

  private swap(a: number, b: number): void {
    [this.items[a], this.items[b]] = [this.items[b], this.items[a]];
    [this.priorities[a], this.priorities[b]] = [this.priorities[b], this.priorities[a]];
  }
}
