import type Phaser from 'phaser';
import { BESTIARY_PAGES } from '../data/bestiary';
import { NAMED_ELITES, type TraitId } from '../data/elites';
import { ENEMIES, type EnemyDef } from '../data/enemies';
import type { EnemyRank } from '../data/loot';
import { spriteDef } from '../data/sprites';
import { ZONES } from '../data/zones';

/** Wo ein Gegner steht: Name der Zone und auf welchen Stufen. */
export interface Spot {
  zone: string;
  minLevel: number;
  maxLevel: number;
}

/** Was das Jagdbuch-Fenster über einen Gegnertyp, einen Boss oder eine feste Elite wissen muss. */
export interface GuideEntry {
  name: string;
  /** Das Bild als Daten-Adresse für ein <img> im Fenster. */
  icon: string;
  /** Grundwerte des Gegnertyps (src/data/enemies.ts). */
  def: EnemyDef;
  rank: EnemyRank;
  /** Feste Eigenschaften (nur bei festen Elites). */
  traits: TraitId[];
  spots: Spot[];
}

/** Alle Einträge des Jagdbuchs: Schlüssel = Gegnertyp bzw. Schlüssel der Bosse-Zeile. */
export type FieldGuide = Record<string, GuideEntry>;

/** Ein Punkt in einer Karte, so wie er in der Karten-Datei steht. */
interface MapObject {
  name: string;
  type?: string;
  properties?: { name: string; value: unknown }[];
}

/**
 * Sammelt für das Jagdbuch aus den Karten aller Zonen, wo welcher Gegner auf welcher Stufe steht,
 * und holt die Bilder. Die Fundorte kommen so von selbst aus den Bauplänen der Zonen.
 *
 * Dabei wird geprüft, ob src/data/bestiary.ts vollständig ist: Jeder Gegnertyp aus einer Karte
 * muss auf einer Seite stehen, jeder Boss und jede feste Elite in einer Bosse-Zeile.
 */
export function buildFieldGuide(scene: Phaser.Scene): FieldGuide {
  // 1. Die Karten durchgehen: Schlüssel → Fundorte.
  const spots: Record<string, Spot[]> = {};
  const addSpot = (key: string, zoneName: string, level: number) => {
    const list = (spots[key] ??= []);
    const spot = list.find((candidate) => candidate.zone === zoneName);
    if (!spot) list.push({ zone: zoneName, minLevel: level, maxLevel: level });
    else {
      spot.minLevel = Math.min(spot.minLevel, level);
      spot.maxLevel = Math.max(spot.maxLevel, level);
    }
  };
  for (const [zoneId, zone] of Object.entries(ZONES)) {
    const map = scene.cache.tilemap.get(`map-${zoneId}`)?.data as { layers?: { name: string; objects?: MapObject[] }[] } | undefined;
    const objects = (layer: string) => map?.layers?.find((candidate) => candidate.name === layer)?.objects ?? [];
    for (const object of objects('Gegner')) {
      const level = object.properties?.find((entry) => entry.name === 'level')?.value;
      addSpot(object.name, zone.name, typeof level === 'number' ? level : 1);
    }
    // Feste Elites stehen als besonderer Ort in der Karte; ihre Stufe steht in NAMED_ELITES.
    for (const poi of objects('POI')) {
      if (poi.type === 'elite' && NAMED_ELITES[poi.name]) addSpot(poi.name, zone.name, NAMED_ELITES[poi.name].level);
    }
  }

  // 2. Je Eintrag der Seiten: Name, Bild, Werte.
  const guide: FieldGuide = {};
  const icon = (def: EnemyDef) => {
    const sprite = spriteDef(def.sprite);
    return scene.textures.getBase64(sprite.sheet, sprite.idle[0]);
  };
  for (const page of BESTIARY_PAGES) {
    for (const type of page.types) {
      const def = ENEMIES[type];
      if (!def) throw new Error(`Jagdbuch, Seite "${page.name}": Den Gegnertyp "${type}" gibt es nicht (src/data/enemies.ts).`);
      guide[type] = { name: def.name, icon: icon(def), def, rank: 'normal', traits: [], spots: spots[type] ?? [] };
    }
    for (const id of page.bosses) {
      const named = NAMED_ELITES[id];
      const def = ENEMIES[named?.enemy ?? id];
      if (!def) throw new Error(`Jagdbuch, Seite "${page.name}": Den Boss "${id}" gibt es nicht (src/data/enemies.ts, src/data/elites.ts).`);
      guide[id] = {
        name: named?.name ?? def.name,
        icon: icon(def),
        def,
        rank: named ? 'elite' : 'boss',
        traits: named?.traits ?? [],
        spots: spots[id] ?? [],
      };
    }
  }

  // 3. Steht in einer Karte etwas, das auf keiner Seite vorkommt? Dann fehlt ein Eintrag in src/data/bestiary.ts.
  for (const key of Object.keys(spots)) {
    if (!guide[key]) throw new Error(`Jagdbuch: "${key}" steht in einer Karte, aber auf keiner Seite in src/data/bestiary.ts.`);
  }
  return guide;
}
