import { TILE } from '../config';

export interface Point {
  x: number;
  y: number;
}

/**
 * Kollisionsraster der Zone: weiß für jede Kachel, ob sie begehbar ist, und
 * welche Kacheln überhaupt miteinander verbunden sind.
 * Kachel-Koordinaten heißen tx/ty, Welt-Koordinaten (Pixel) x/y.
 */
export class Grid {
  /** Nummer des zusammenhängenden Gebiets je Kachel, -1 = blockiert. */
  private readonly region: Int32Array;

  constructor(
    readonly width: number,
    readonly height: number,
    private readonly blocked: Uint8Array,
  ) {
    this.region = this.labelRegions();
  }

  index(tx: number, ty: number): number {
    return ty * this.width + tx;
  }

  isWalkable(tx: number, ty: number): boolean {
    return tx >= 0 && ty >= 0 && tx < this.width && ty < this.height && this.blocked[this.index(tx, ty)] === 0;
  }

  regionAt(tx: number, ty: number): number {
    return this.isWalkable(tx, ty) ? this.region[this.index(tx, ty)] : -1;
  }

  static toTile(world: number): number {
    return Math.floor(world / TILE);
  }

  static tileCenter(t: number): number {
    return t * TILE + TILE / 2;
  }

  /** Ist ein Quadrat mit halber Kantenlänge `radius` um den Punkt komplett auf begehbaren Kacheln? */
  isBoxFree(x: number, y: number, radius: number): boolean {
    const x0 = Grid.toTile(x - radius);
    const x1 = Grid.toTile(x + radius);
    const y0 = Grid.toTile(y - radius);
    const y1 = Grid.toTile(y + radius);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (!this.isWalkable(tx, ty)) return false;
      }
    }
    return true;
  }

  /**
   * Kann die Figur in gerader Linie von a nach b laufen, ohne ein Hindernis zu streifen?
   * Geprüft wird alle 2 Pixel mit 1 Pixel Sicherheitsabstand – damit ist auch
   * jede Position zwischen zwei Prüfpunkten garantiert frei.
   */
  hasClearLine(a: Point, b: Point, radius: number): boolean {
    const distance = Math.hypot(b.x - a.x, b.y - a.y);
    const steps = Math.max(1, Math.ceil(distance / 2));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      if (!this.isBoxFree(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, radius + 1)) return false;
    }
    return true;
  }

  /**
   * Die Stelle, die `target` am nächsten liegt und von `from` aus zu Fuß erreichbar ist.
   * Ist `target` selbst erreichbar, kommt genau dieser Punkt zurück – sonst die Mitte der
   * nächsten erreichbaren Kachel (z. B. der Waldrand, wenn mitten in den Wald geklickt wurde).
   * null, wenn `from` selbst auf keiner begehbaren Kachel steht.
   */
  nearestReachable(from: Point, target: Point): Point | null {
    const region = this.regionAt(Grid.toTile(from.x), Grid.toTile(from.y));
    if (region === -1) return null;
    if (this.regionAt(Grid.toTile(target.x), Grid.toTile(target.y)) === region) return { x: target.x, y: target.y };
    let best: Point | null = null;
    let bestDistance = Infinity;
    for (let ty = 0; ty < this.height; ty++) {
      for (let tx = 0; tx < this.width; tx++) {
        if (this.region[this.index(tx, ty)] !== region) continue;
        const distance = Math.hypot(Grid.tileCenter(tx) - target.x, Grid.tileCenter(ty) - target.y);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = { x: Grid.tileCenter(tx), y: Grid.tileCenter(ty) };
        }
      }
    }
    return best;
  }

  private labelRegions(): Int32Array {
    const region = new Int32Array(this.width * this.height).fill(-1);
    let next = 0;
    const stack: number[] = [];
    for (let start = 0; start < region.length; start++) {
      if (this.blocked[start] !== 0 || region[start] !== -1) continue;
      region[start] = next;
      stack.push(start);
      while (stack.length > 0) {
        const current = stack.pop()!;
        const tx = current % this.width;
        const ty = Math.floor(current / this.width);
        for (const [dx, dy] of NEIGHBOURS_4) {
          const nx = tx + dx;
          const ny = ty + dy;
          if (!this.isWalkable(nx, ny)) continue;
          const neighbour = this.index(nx, ny);
          if (region[neighbour] !== -1) continue;
          region[neighbour] = next;
          stack.push(neighbour);
        }
      }
      next++;
    }
    return region;
  }
}

const NEIGHBOURS_4 = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;
