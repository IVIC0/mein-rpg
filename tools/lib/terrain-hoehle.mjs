// Gelände-Art "hoehle": Kammern und Gänge im Fels. Alles, was nicht Boden ist, ist Fels
// und bleibt leer (dort sieht man die dunkle Hintergrundfarbe der Zone). Wo unterhalb
// einer Felskachel Boden liegt, steht eine Mauer – so sieht man die Höhlenwand von vorn.
// Benutzt das Tileset "hoehle".
import { CAVE } from './tiles.mjs';

/**
 * Baut das Gelände einer Höhle. Im Bauplan sind `clearings` die Kammern und `roads` die Gänge.
 * `reserved` = Kacheln, auf denen später etwas Festes steht (Truhe): Sie zählen als Hindernis.
 */
export function buildCave(plan, kit, reserved) {
  const { W, H, rng, idx, inside, forEachCell } = kit;

  const floor = kit.mask();
  for (const chamber of plan.clearings) kit.stampEllipse(floor, chamber, chamber.wobble ?? 0.3);
  for (const tunnel of plan.roads) kit.stampLine(floor, tunnel.points, tunnel.width);
  for (const patch of plan.dirt ?? []) {
    if (patch.rect) kit.stampRect(floor, ...patch.rect);
    else kit.stampLine(floor, patch.line, patch.width);
  }
  // Der Kartenrand ist immer Fels.
  forEachCell((x, y) => {
    if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) floor[idx(x, y)] = 0;
  });

  const ground = kit.layer();
  const deco = kit.layer();
  const objects = kit.layer();

  // Feste Dinge im Fels (z. B. der Ausgang): Die Kachel selbst ist kein Boden.
  for (const s of plan.structures ?? []) {
    if (s.type !== 'ding') throw new Error(`Bauten: Die Art "${s.type}" kennt die Gelände-Art "hoehle" nicht.`);
    if (CAVE[s.tile] === undefined) throw new Error(`Ding "${s.tile}" bei ${s.x}/${s.y} gibt es im Tileset nicht (CAVE in tools/lib/tiles.mjs).`);
    floor[idx(s.x, s.y)] = 0;
    objects[idx(s.x, s.y)] = CAVE[s.tile];
  }

  forEachCell((x, y) => {
    const i = idx(x, y);
    if (floor[i]) {
      // Boden mit etwas Abwechslung: ab und zu Geröll oder Löcher.
      const r = rng();
      ground[i] = r < 0.05 ? CAVE.rubble : r < 0.08 ? CAVE.holes : CAVE.floor;
    } else if (objects[i] === -1 && inside(x, y + 1) && floor[idx(x, y + 1)]) {
      objects[i] = CAVE.wall;
    }
  });

  const walkable = (x, y) => inside(x, y) && floor[idx(x, y)] === 1 && !reserved[idx(x, y)];
  return {
    ground, deco, objects, walkable,
    info: `Boden ${Math.round((floor.reduce((a, b) => a + b, 0) / (W * H)) * 100)} %`,
  };
}
