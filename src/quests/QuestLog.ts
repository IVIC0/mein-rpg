import { NAMED_ELITES } from '../data/elites';
import { ENEMIES } from '../data/enemies';
import { BOUNTY_BOARD, NPCS } from '../data/npcs';
import { ENEMY_XP } from '../data/progression';
import { BOUNTY, BOUNTY_POOL, QUESTS, type BountyTemplate, type QuestGoal, type QuestReward } from '../data/quests';
import type { Enemy } from '../entities/Enemy';
import type { Town } from '../town/Town';

/** Stand einer festen Quest, so wie er im Spielstand steht. Fehlt der Eintrag, ist die Quest noch nicht angenommen. */
export interface QuestState {
  /** Wie weit das Ziel ist (besiegte Gegner, gesammelte Dinge; bei Boss, Elite und Erkunden 0 oder 1). */
  progress: number;
  /** Abgegeben und belohnt. */
  done: boolean;
  /** Im Quest-Zähler und auf den Karten zeigen? */
  tracked: boolean;
  /** Schon mitgenommene Quest-Kisten (Namen der POIs). */
  taken: string[];
}

/** Ein Kopfgeld am Brett. Es wird ausgewürfelt und steht deshalb ganz im Spielstand. */
export interface BountyData {
  /** Laufende Nummer – macht den Schlüssel "kopfgeld-12" eindeutig. */
  id: number;
  goal: QuestGoal;
  /** Stufe des Ziels. */
  level: number;
  reward: QuestReward;
  /** offered = hängt aus, active = angenommen, done = abgegeben (der Platz bleibt bis zum Wechsel leer). */
  status: 'offered' | 'active' | 'done';
  progress: number;
  tracked: boolean;
}

/** Alles zu den Quests, so wie es im Spielstand steht. */
export interface QuestData {
  quests: Record<string, QuestState>;
  board: {
    /** Zeitpunkt (Date.now()), zu dem die Kopfgelder wechseln. */
    rotateAt: number;
    nextId: number;
    slots: BountyData[];
  };
}

/**
 * locked = noch nicht zu haben (Stufe, Vorgänger), available = lässt sich annehmen,
 * active = angenommen, ready = Ziel erreicht – zurück zum Auftraggeber, done = abgegeben.
 */
export type QuestStatus = 'locked' | 'available' | 'active' | 'ready' | 'done';

/** Eine Quest oder ein Kopfgeld, fertig aufbereitet für Fenster, Zähler und Karten. */
export interface QuestEntry {
  /** Schlüssel: bei festen Quests der aus QUESTS, bei Kopfgeldern "kopfgeld-<Nummer>". */
  key: string;
  bounty: boolean;
  name: string;
  text: string;
  level: number;
  /** Schlüssel des NPCs – oder BOUNTY_BOARD.id beim Kopfgeld. */
  giver: string;
  giverName: string;
  goal: QuestGoal;
  reward: QuestReward;
  status: QuestStatus;
  /** Warum die Quest gesperrt ist; sonst leer. */
  lockReason: string;
  progress: number;
  /** So viel braucht das Ziel (bei Boss, Elite und Erkunden 1). */
  needed: number;
  tracked: boolean;
  taken: string[];
}

/** Ein leerer Quest-Stand: nichts angenommen, das Brett würfelt beim ersten Blick. */
export function emptyQuestData(): QuestData {
  return { quests: {}, board: { rotateAt: 0, nextId: 1, slots: [] } };
}

/** So viel braucht ein Ziel, bis es erreicht ist. */
export function goalNeeded(goal: QuestGoal): number {
  return goal.type === 'kill' || goal.type === 'collect' ? goal.count : 1;
}

/** Das Ziel in einem kurzen Satz, z. B. "Riesenratten besiegen". */
export function goalText(goal: QuestGoal): string {
  switch (goal.type) {
    case 'kill':
      return `${ENEMIES[goal.enemy]?.name ?? goal.enemy} besiegen`;
    case 'collect':
      return goal.enemy ? `${goal.item} sammeln (von: ${ENEMIES[goal.enemy]?.name ?? goal.enemy})` : `${goal.item} einsammeln`;
    case 'elite':
      return `${NAMED_ELITES[goal.elite]?.name ?? goal.elite} besiegen`;
    case 'boss':
      return `${ENEMIES[goal.enemy]?.name ?? goal.enemy} besiegen`;
    case 'explore':
      return `Erreiche: ${goal.place}`;
  }
}

/**
 * Die Quests: was angenommen, wie weit und was erledigt ist – dazu das Kopfgeld-Brett.
 * Alle Werte stehen in src/data/quests.ts. Hier stehen nur die Regeln:
 * annehmen → Ziel erfüllen (zählt von selbst mit) → beim Auftraggeber abgeben → Belohnung.
 *
 * Was die Belohnung im Spiel bewirkt (EP, Gold, Item), macht die Spielwelt (`onReward`).
 */
export class QuestLog {
  private states: Record<string, QuestState> = {};
  private board: QuestData['board'] = emptyQuestData().board;

  /** Nach jeder Änderung: Fenster, Zähler und Karten neu zeichnen, speichern. */
  onChange: () => void = () => {};
  /** Kurze Meldung für die Beute-Liste (angenommen, Ziel erreicht, abgeschlossen). */
  onMessage: (text: string) => void = () => {};
  /** Ein Quest-Ding wurde gesammelt (Text wie "Spinnenseide 3 / 8") – steigt über der Figur auf. */
  onCollect: (text: string) => void = () => {};
  /** Eine Quest wurde abgegeben: Die Spielwelt zahlt die Belohnung aus. */
  onReward: (entry: QuestEntry) => void = () => {};

  /** `playerLevel` liefert die aktuelle Stufe der Figur (für Sperren und die Auswahl der Kopfgelder). */
  constructor(
    private readonly town: Town,
    private readonly playerLevel: () => number,
  ) {}

  /** Übernimmt den Stand aus einem Spielstand. */
  load(data: QuestData): void {
    this.states = {};
    for (const [key, state] of Object.entries(data.quests)) this.states[key] = { ...state, taken: [...state.taken] };
    this.board = { ...data.board, slots: data.board.slots.map((slot) => ({ ...slot })) };
    this.onChange();
  }

  /** Der Stand für den Spielstand. */
  toData(): QuestData {
    const quests: Record<string, QuestState> = {};
    for (const [key, state] of Object.entries(this.states)) quests[key] = { ...state, taken: [...state.taken] };
    return { quests, board: { ...this.board, slots: this.board.slots.map((slot) => ({ ...slot })) } };
  }

  // ---------------------------------------------------------------- Abfragen

  /** Alle festen Quests und alle Kopfgelder am Brett. */
  entries(): QuestEntry[] {
    return [...Object.keys(QUESTS).map((key) => this.storyEntry(key)), ...this.board.slots.map((slot) => this.bountyEntry(slot))];
  }

  /** Was gerade läuft: angenommen oder bereit zum Abgeben. */
  running(): QuestEntry[] {
    return this.entries().filter((entry) => entry.status === 'active' || entry.status === 'ready');
  }

  /** Die Quests eines NPCs bzw. die Kopfgelder des Bretts (`giver` = BOUNTY_BOARD.id). */
  entriesOf(giver: string): QuestEntry[] {
    return this.entries().filter((entry) => entry.giver === giver);
  }

  /** Abgeschlossene feste Quests und wie viele es gibt. */
  get doneCount(): { done: number; total: number } {
    const keys = Object.keys(QUESTS);
    return { done: keys.filter((key) => this.states[key]?.done).length, total: keys.length };
  }

  /** In wie vielen Millisekunden die Kopfgelder wechseln. */
  get rotateInMs(): number {
    return Math.max(0, this.board.rotateAt - Date.now());
  }

  private storyEntry(key: string): QuestEntry {
    const def = QUESTS[key];
    const state = this.states[key];
    const needed = goalNeeded(def.goal);
    let status: QuestStatus;
    let lockReason = '';
    if (state?.done) status = 'done';
    else if (state) status = state.progress >= needed ? 'ready' : 'active';
    else if (def.requires && !this.states[def.requires]?.done) {
      status = 'locked';
      lockReason = `Erst „${QUESTS[def.requires]?.name ?? def.requires}“ abschließen`;
    } else if (this.playerLevel() < def.minLevel) {
      status = 'locked';
      lockReason = `Ab Stufe ${def.minLevel}`;
    } else status = 'available';
    return {
      key,
      bounty: false,
      name: def.name,
      text: def.text,
      level: def.level,
      giver: def.giver,
      giverName: NPCS[def.giver]?.name ?? def.giver,
      goal: def.goal,
      reward: def.reward,
      status,
      lockReason,
      progress: Math.min(state?.progress ?? 0, needed),
      needed,
      tracked: state?.tracked ?? true,
      taken: state?.taken ?? [],
    };
  }

  private bountyEntry(slot: BountyData): QuestEntry {
    const needed = goalNeeded(slot.goal);
    const target = goalText(slot.goal).replace(' besiegen', '');
    let status: QuestStatus = 'available';
    if (slot.status === 'done') status = 'done';
    else if (slot.status === 'active') status = slot.progress >= needed ? 'ready' : 'active';
    return {
      key: `kopfgeld-${slot.id}`,
      bounty: true,
      name: `Kopfgeld: ${needed > 1 ? `${needed} × ` : ''}${target}`,
      text: needed > 1 ? 'Aushang am Rathaus: Das Dorf zahlt für jeden erlegten Gegner.' : 'Aushang am Rathaus: Das Dorf zahlt für diesen Kopf.',
      level: slot.level,
      giver: BOUNTY_BOARD.id,
      giverName: BOUNTY_BOARD.name,
      goal: slot.goal,
      reward: slot.reward,
      status,
      lockReason: '',
      progress: Math.min(slot.progress, needed),
      needed,
      tracked: slot.tracked,
      taken: [],
    };
  }

  private slotOf(key: string): BountyData | undefined {
    return this.board.slots.find((slot) => `kopfgeld-${slot.id}` === key);
  }

  // ---------------------------------------------------------------- Annehmen, abgeben, aufgeben

  /** Nimmt eine Quest oder ein Kopfgeld an. Gibt false zurück, wenn das gerade nicht geht. */
  accept(key: string): boolean {
    const entry = this.entries().find((candidate) => candidate.key === key);
    if (!entry || entry.status !== 'available') return false;
    const slot = this.slotOf(key);
    if (slot) slot.status = 'active';
    else this.states[key] = { progress: 0, done: false, tracked: true, taken: [] };
    this.onMessage(`Quest angenommen: ${entry.name}`);
    this.onChange();
    return true;
  }

  /** Gibt eine erfüllte Quest ab: Sie ist erledigt, die Belohnung wird ausgezahlt. */
  handIn(key: string): boolean {
    const entry = this.entries().find((candidate) => candidate.key === key);
    if (!entry || entry.status !== 'ready') return false;
    const slot = this.slotOf(key);
    if (slot) slot.status = 'done';
    else this.states[key].done = true;
    this.onReward(entry);
    this.onChange();
    return true;
  }

  /** Gibt ein angenommenes Kopfgeld auf: Es hängt wieder am Brett, der Zähler beginnt neu. Feste Quests kann man nicht aufgeben. */
  abandon(key: string): void {
    const slot = this.slotOf(key);
    if (!slot || slot.status !== 'active') return;
    slot.status = 'offered';
    slot.progress = 0;
    this.onChange();
  }

  /** Schaltet um, ob die Quest im Zähler und auf den Karten zu sehen ist. */
  toggleTracked(key: string): void {
    const target = this.slotOf(key) ?? this.states[key];
    if (!target) return;
    target.tracked = !target.tracked;
    this.onChange();
  }

  // ---------------------------------------------------------------- Mitzählen

  /** Ein Gegner wurde besiegt: bei allen laufenden Quests mitzählen, zu deren Ziel er passt. */
  recordKill(enemy: Enemy): void {
    let changed = false;
    for (const entry of this.running()) {
      if (entry.status !== 'active') continue;
      const goal = entry.goal;
      let hit = false;
      if (goal.type === 'kill') hit = enemy.type === goal.enemy && enemy.rank !== 'boss';
      else if (goal.type === 'elite') hit = enemy.bossId === goal.elite;
      else if (goal.type === 'boss') hit = enemy.rank === 'boss' && enemy.type === goal.enemy;
      else if (goal.type === 'collect' && goal.enemy === enemy.type) {
        // Elites lassen das Quest-Ding immer fallen, gewöhnliche Gegner mit der Chance der Quest.
        hit = enemy.rank !== 'normal' || Math.random() < (goal.chance ?? 1);
        if (hit) this.onCollect(`${goal.item} ${entry.progress + 1} / ${entry.needed}`);
      }
      if (hit) {
        this.advance(entry);
        changed = true;
      }
    }
    if (changed) this.onChange();
  }

  /** Die Figur hat eine Quest-Kiste mitgenommen. `crate` = Name des POI in der Karte. */
  takeCrate(key: string, crate: string): void {
    const entry = this.running().find((candidate) => candidate.key === key);
    const state = this.states[key];
    if (!entry || !state || entry.status !== 'active' || state.taken.includes(crate)) return;
    state.taken.push(crate);
    if (entry.goal.type === 'collect') this.onCollect(`${entry.goal.item} ${entry.progress + 1} / ${entry.needed}`);
    this.advance(entry);
    this.onChange();
  }

  /** Die Figur hat den Ort einer Erkunden-Quest erreicht. */
  reach(key: string): void {
    const entry = this.running().find((candidate) => candidate.key === key);
    if (!entry || entry.status !== 'active' || entry.goal.type !== 'explore') return;
    this.advance(entry);
    this.onChange();
  }

  /** Zählt bei einer laufenden Quest eins weiter und meldet, wenn das Ziel damit erreicht ist. */
  private advance(entry: QuestEntry): void {
    const target = this.slotOf(entry.key) ?? this.states[entry.key];
    if (!target) return;
    target.progress = Math.min(entry.needed, target.progress + 1);
    if (target.progress >= entry.needed) this.onMessage(`Quest-Ziel erreicht: ${entry.name} – zurück zu: ${entry.giverName}`);
  }

  // ---------------------------------------------------------------- Kopfgeld-Brett

  /**
   * Hält das Brett aktuell – einmal pro Frame aufrufen (kostet fast nichts):
   * Ist die Zeit um, werden alle Kopfgelder ersetzt, die nicht gerade angenommen sind.
   * Hat das Rathaus eine neue Stufe, kommen sofort weitere Plätze dazu.
   */
  tick(): void {
    const wanted = this.town.effects.bountySlots;
    const due = Date.now() >= this.board.rotateAt;
    if (!due && this.board.slots.length === wanted) return;

    let slots = this.board.slots;
    if (due) {
      slots = slots.filter((slot) => slot.status === 'active');
      this.board.rotateAt = Date.now() + BOUNTY.rotateMs;
    }
    // Zu viele Plätze (z. B. geänderte Werte): nicht angenommene fallen zuerst weg.
    while (slots.length > wanted) {
      const spare = slots.findIndex((slot) => slot.status !== 'active');
      slots.splice(spare >= 0 ? spare : slots.length - 1, 1);
    }
    this.board.slots = slots;
    while (this.board.slots.length < wanted) this.board.slots.push(this.rollBounty());
    this.onChange();
  }

  /** Würfelt ein neues Kopfgeld, das zur Stufe der Figur passt und noch nicht am Brett hängt. */
  private rollBounty(): BountyData {
    const level = this.playerLevel();
    const targetOf = (goal: QuestGoal | BountyTemplate['goal']) => (goal.type === 'elite' ? goal.elite : goal.type === 'explore' ? goal.marker : (goal.enemy ?? ''));
    const hanging = this.board.slots.map((slot) => targetOf(slot.goal));
    const fresh = BOUNTY_POOL.filter((template) => !hanging.includes(targetOf(template.goal)));
    const fitting = fresh.filter((template) => level >= template.minLevel && level <= template.maxLevel);
    // Passt nichts zur Stufe (oder hängt schon alles), nimmt das Brett irgendeines.
    const pool = fitting.length > 0 ? fitting : fresh.length > 0 ? fresh : BOUNTY_POOL;
    const template = pool[Math.floor(Math.random() * pool.length)];

    let goal: QuestGoal;
    let worth = template.worth ?? 1;
    if (template.goal.type === 'kill') {
      const [min, max] = template.goal.count;
      const count = min + Math.floor(Math.random() * (max - min + 1));
      goal = { type: 'kill', enemy: template.goal.enemy, count };
      worth = count;
    } else goal = template.goal;

    const xpPerEnemy = ENEMY_XP.base + ENEMY_XP.perLevel * template.level;
    return {
      id: this.board.nextId++,
      goal,
      level: template.level,
      reward: { xp: Math.round(worth * xpPerEnemy * BOUNTY.xpShare), gold: Math.round(worth * template.level * BOUNTY.goldPerLevel) },
      status: 'offered',
      progress: 0,
      tracked: true,
    };
  }
}
