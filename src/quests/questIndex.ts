import type Phaser from 'phaser';
import { NAMED_ELITES } from '../data/elites';
import { ENEMIES } from '../data/enemies';
import { BOUNTY_BOARD, NPCS } from '../data/npcs';
import { BOUNTY_POOL, QUESTS, type QuestGoal } from '../data/quests';
import { ZONES } from '../data/zones';

/** Was in einer Zone steht – soweit es die Quests betrifft. */
interface ZoneContent {
  /** Gegnertypen und Schlüssel fester Elites. */
  enemies: Set<string>;
  markers: Set<string>;
  /** NPCs (und das Kopfgeld-Brett unter BOUNTY_BOARD.id). */
  givers: Set<string>;
  /** Quest → Anzahl ihrer Kisten in dieser Zone. */
  crates: Record<string, number>;
  /** In diese Zonen führen die Übergänge der Zone. */
  exits: string[];
}

/** Ein Punkt in einer Karte, so wie er in der Karten-Datei steht. */
interface MapObject {
  name: string;
  type?: string;
  properties?: { name: string; value: unknown }[];
}

/**
 * Verzeichnis für die Quests: In welcher Zone steht welcher Gegner, NPC, Marker und welche Kiste?
 * Es wird beim Start aus den Karten aller Zonen gelesen – die Karten-Markierungen der Quests
 * (Ring um das Ziel oder um den Übergang dorthin) kommen so von selbst aus den Bauplänen.
 */
export class QuestIndex {
  private readonly zones: Record<string, ZoneContent> = {};

  constructor(scene: Phaser.Scene) {
    for (const zoneId of Object.keys(ZONES)) {
      const map = scene.cache.tilemap.get(`map-${zoneId}`)?.data as { layers?: { name: string; objects?: MapObject[] }[] } | undefined;
      const objects = (layer: string) => map?.layers?.find((candidate) => candidate.name === layer)?.objects ?? [];
      const text = (object: MapObject, name: string) => {
        const value = object.properties?.find((entry) => entry.name === name)?.value;
        return typeof value === 'string' ? value : '';
      };
      const content: ZoneContent = { enemies: new Set(), markers: new Set(), givers: new Set(), crates: {}, exits: [] };
      for (const enemy of objects('Gegner')) content.enemies.add(enemy.name);
      for (const marker of objects('Marker')) content.markers.add(marker.name);
      for (const poi of objects('POI')) {
        if (poi.type === 'elite') content.enemies.add(poi.name);
        else if (poi.type === 'npc') content.givers.add(poi.name);
        else if (poi.type === 'kopfgeldbrett') content.givers.add(BOUNTY_BOARD.id);
        else if (poi.type === 'portal') content.exits.push(text(poi, 'to'));
        else if (poi.type === 'questkiste') content.crates[text(poi, 'quest')] = (content.crates[text(poi, 'quest')] ?? 0) + 1;
      }
      this.zones[zoneId] = content;
    }
    this.validate();
  }

  /** Die Zonen, in denen das Ziel einer Quest liegt. `key` = Schlüssel der Quest (für ihre Kisten). */
  zonesOfGoal(key: string, goal: QuestGoal): string[] {
    const where = (test: (content: ZoneContent) => boolean) => Object.keys(this.zones).filter((zoneId) => test(this.zones[zoneId]));
    switch (goal.type) {
      case 'kill':
      case 'boss':
        return where((content) => content.enemies.has(goal.enemy));
      case 'elite':
        return where((content) => content.enemies.has(goal.elite));
      case 'collect':
        return where((content) => (goal.enemy ? content.enemies.has(goal.enemy) : (content.crates[key] ?? 0) > 0));
      case 'explore':
        return [goal.zone];
    }
  }

  /** Die Zonen, in denen ein Auftraggeber steht (NPC oder Kopfgeld-Brett). */
  zonesOfGiver(giver: string): string[] {
    return Object.keys(this.zones).filter((zoneId) => this.zones[zoneId].givers.has(giver));
  }

  /**
   * Der Weg von der Zone `from` zu einer der Zonen `targets`: Gibt die Zone zurück, in die man
   * als Nächstes wechseln muss – null, wenn man schon dort ist oder es keinen Weg gibt.
   */
  nextZoneToward(from: string, targets: string[]): string | null {
    if (targets.includes(from)) return null;
    // Breitensuche über die Übergänge; `first` merkt sich je Zone den ersten Schritt dorthin.
    const first = new Map<string, string>();
    const queue = [from];
    while (queue.length > 0) {
      const zoneId = queue.shift() as string;
      for (const exit of this.zones[zoneId]?.exits ?? []) {
        if (exit === from || first.has(exit)) continue;
        first.set(exit, zoneId === from ? exit : (first.get(zoneId) as string));
        if (targets.includes(exit)) return first.get(exit) as string;
        queue.push(exit);
      }
    }
    return null;
  }

  /** Prüft src/data/quests.ts gegen die Karten: Gibt es jedes Ziel und jeden Auftraggeber wirklich? */
  private validate(): void {
    const fail = (quest: string, message: string): never => {
      throw new Error(`Quest "${quest}" (src/data/quests.ts): ${message}`);
    };
    for (const [key, def] of Object.entries(QUESTS)) {
      if (!NPCS[def.giver]) fail(key, `Den NPC "${def.giver}" gibt es nicht (src/data/npcs.ts).`);
      if (this.zonesOfGiver(def.giver).length === 0) fail(key, `Der NPC "${def.giver}" steht in keiner Karte (POI-Art "npc" im Bauplan).`);
      if (def.requires && !QUESTS[def.requires]) fail(key, `Die Vorgänger-Quest "${def.requires}" gibt es nicht.`);
      const goal = def.goal;
      if ((goal.type === 'kill' || goal.type === 'boss') && !ENEMIES[goal.enemy]) fail(key, `Den Gegner "${goal.enemy}" gibt es nicht.`);
      if (goal.type === 'elite' && !NAMED_ELITES[goal.elite]) fail(key, `Die feste Elite "${goal.elite}" gibt es nicht.`);
      if (goal.type === 'explore') {
        if (!this.zones[goal.zone]?.markers.has(goal.marker)) fail(key, `Den Marker "${goal.marker}" gibt es in der Zone "${goal.zone}" nicht.`);
      } else if (this.zonesOfGoal(key, goal).length === 0) {
        fail(key, 'Das Ziel steht in keiner Karte.');
      }
      if (goal.type === 'collect' && !goal.enemy) {
        const crates = Object.values(this.zones).reduce((sum, content) => sum + (content.crates[key] ?? 0), 0);
        if (crates < goal.count) fail(key, `Es gibt nur ${crates} Kisten, die Quest verlangt ${goal.count}.`);
      }
    }
    BOUNTY_POOL.forEach((template, index) => {
      const goal = template.goal.type === 'kill' ? { ...template.goal, count: 1 } : template.goal;
      if (this.zonesOfGoal('', goal).length === 0) throw new Error(`Kopfgeld Nr. ${index + 1} (BOUNTY_POOL in src/data/quests.ts): Das Ziel steht in keiner Karte.`);
    });
  }
}
