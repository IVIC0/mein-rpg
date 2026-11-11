import { Grid, type Point } from './Grid';

/** Die Figur tastet sich in so kleinen Schritten (Welt-Pixel) an Hindernisse heran. */
const STEP = 0.25;

/** Ragt eine Ecke höchstens so weit (Welt-Pixel) in den Weg, weicht die Figur ihr von selbst aus. */
const CORNER_REACH = 6;

/** Ausweichen nur, wenn das Ziel noch mindestens so weit weg ist – sonst zappelt die Figur am Ziel. */
const CORNER_MIN_DISTANCE = 12;

/**
 * Ausweichen nur, wenn die Figur ziemlich frontal gegen das Hindernis läuft:
 * der Anteil quer zur Laufrichtung darf höchstens halb so groß sein wie der nach vorn.
 */
const FRONTAL_RATIO = 0.5;

const EPSILON = 1e-6;

/**
 * Direkte Bewegung ohne Wegfindung: bis zu `maxDistance` Pixel geradewegs auf
 * `target` zu. Hindernisse blockieren, aber die Figur rutscht an ihnen entlang:
 * x- und y-Anteil der Bewegung werden einzeln ausgeführt, der freie Anteil
 * bleibt also erhalten. Gibt die neue Position zurück.
 */
export function moveToward(grid: Grid, from: Point, target: Point, maxDistance: number, radius: number): Point {
  const toX = target.x - from.x;
  const toY = target.y - from.y;
  const distance = Math.hypot(toX, toY);
  if (distance < 0.01) return { x: from.x, y: from.y };

  const travel = Math.min(maxDistance, distance);
  const dx = (toX / distance) * travel;
  const dy = (toY / distance) * travel;

  // Normalfall: erst der x-Anteil, dann der y-Anteil.
  const pos = { x: from.x, y: from.y };
  const blockedX = advance(grid, pos, dx, 0, radius) < Math.abs(dx) - EPSILON;
  const blockedY = advance(grid, pos, 0, dy, radius) < Math.abs(dy) - EPSILON;

  // Frontal an einer Ecke hängen geblieben? Dann seitlich um sie herumschieben.
  const targetIsOpen = grid.isWalkable(Grid.toTile(target.x), Grid.toTile(target.y));
  if (distance > CORNER_MIN_DISTANCE && targetIsOpen) {
    if (blockedX && Math.abs(toY) <= Math.abs(toX) * FRONTAL_RATIO) {
      const around = roundCorner(grid, from, dx, dy, toX, toY, travel, radius, false);
      if (around) return around;
    } else if (blockedY && Math.abs(toX) <= Math.abs(toY) * FRONTAL_RATIO) {
      const around = roundCorner(grid, from, dx, dy, toX, toY, travel, radius, true);
      if (around) return around;
    }
  }
  return pos;
}

/**
 * Die Figur ist nach vorn blockiert. Sucht quer zur Laufrichtung eine Lücke in
 * Reichweite und schiebt die Figur darauf zu. Der normale Quer-Anteil der
 * Bewegung entfällt in diesem Frame, damit sich beides nicht gegenseitig aufhebt.
 * `vertical` = die Figur läuft hauptsächlich nach oben/unten.
 * Gibt null zurück, wenn es keine passende Lücke gibt.
 */
function roundCorner(
  grid: Grid,
  from: Point,
  dx: number,
  dy: number,
  toX: number,
  toY: number,
  travel: number,
  radius: number,
  vertical: boolean,
): Point | null {
  const pos = { x: from.x, y: from.y };
  const ahead = vertical ? dy : dx;
  const movedAhead = vertical ? advance(grid, pos, 0, dy, radius) : advance(grid, pos, dx, 0, radius);
  if (movedAhead >= Math.abs(ahead) - EPSILON) return null; // von hier aus doch frei

  const toAhead = vertical ? toY : toX;
  const toSide = vertical ? toX : toY;
  const first = Math.sign(toSide) || 1; // bei gleichem Abstand zuerst die Seite prüfen, auf der das Ziel liegt
  for (let offset = 1; offset <= CORNER_REACH; offset++) {
    for (const side of [first, -first]) {
      const x = vertical ? pos.x + side * offset : pos.x + Math.sign(dx);
      const y = vertical ? pos.y + Math.sign(dy) : pos.y + side * offset;
      if (!grid.isBoxFree(x, y, radius)) continue;
      // Nur ausweichen, wenn die Figur danach immer noch frontal Richtung Ziel
      // unterwegs ist. Sonst liefe sie nach dem Ausweichen sofort wieder zurück.
      if (Math.abs(toSide - side * offset) > Math.abs(toAhead) * FRONTAL_RATIO) continue;
      const shift = side * Math.min(offset, travel - movedAhead);
      if (vertical) advance(grid, pos, shift, 0, radius);
      else advance(grid, pos, 0, shift, radius);
      return pos;
    }
  }
  return null;
}

/**
 * Schiebt `pos` entlang einer Achse (dx oder dy ist 0), bis die Strecke
 * geschafft ist oder ein Hindernis kommt. Gibt die zurückgelegte Strecke zurück.
 */
function advance(grid: Grid, pos: Point, dx: number, dy: number, radius: number): number {
  const length = Math.abs(dx) + Math.abs(dy);
  const sx = Math.sign(dx);
  const sy = Math.sign(dy);
  let moved = 0;
  while (moved < length - 1e-9) {
    const step = Math.min(STEP, length - moved);
    if (!grid.isBoxFree(pos.x + sx * step, pos.y + sy * step, radius)) break;
    pos.x += sx * step;
    pos.y += sy * step;
    moved += step;
  }
  return moved;
}
