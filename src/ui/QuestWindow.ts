import { BOUNTY_BOARD, NPCS } from '../data/npcs';
import { rarityById } from '../items/generator';
import { goalText, type QuestEntry, type QuestLog, type QuestStatus } from '../quests/QuestLog';
import { GameWindow } from './GameWindow';
import { byId } from './dom';

/** Reihenfolge der Karten im Fenster: was etwas von einem will, steht oben. */
const ORDER: QuestStatus[] = ['ready', 'available', 'active', 'locked', 'done'];

/** Was am Rand einer Karte steht. */
const STATUS_LABEL: Record<QuestStatus, string> = {
  locked: 'gesperrt',
  available: 'neu',
  active: 'läuft',
  ready: 'Ziel erreicht',
  done: 'erledigt',
};

/**
 * Das Fenster für alles rund um Quests. Es hat drei Ansichten:
 * - Questlog (Taste L oder der Knopf in der Leiste): alle laufenden Quests.
 * - Questgeber (Klick auf einen NPC): seine Quests – annehmen und abgeben.
 * - Kopfgeld-Brett (Klick auf das Brett am Rathaus): die Kopfgelder.
 *
 * Alles geht per Klick oder Tippen; das Fenster passt auch auf ein Handy im Querformat.
 * Das Grundgerüst steht in index.html, die Regeln in src/quests/QuestLog.ts, die Werte in
 * src/data/quests.ts.
 */
export class QuestWindow {
  private readonly root = byId('quests');
  /** Das gemeinsame Fenster-Gerüst: verschieben, Größe ziehen, merken, nach vorn holen. */
  private readonly win = new GameWindow(this.root, 'quests');
  private readonly button = byId('quests-button');
  private readonly title = byId('quests-title');
  private readonly list = byId('quests-list');
  private readonly footer = byId('quests-footer');
  /** null = Questlog; sonst der Auftraggeber, vor dem die Figur steht (NPC-Schlüssel oder BOUNTY_BOARD.id). */
  private currentGiver: string | null = null;
  /** Zuletzt gezeigte Restzeit des Bretts – die Fußzeile wird nur neu geschrieben, wenn sie sich ändert. */
  private shownCountdown = '';

  /**
   * `beforeOpen` wird aufgerufen, bevor das Fenster aufgeht – dort schließt die Spielwelt die
   * Fenster, die am selben Platz sitzen (Händler, Dorfausbau, Lagertruhe, Jagdbuch).
   */
  constructor(
    private readonly quests: QuestLog,
    private readonly beforeOpen: () => void,
  ) {
    this.button.addEventListener('click', () => {
      this.toggleLog();
      this.button.blur();
    });
    byId('quests-close').addEventListener('click', () => this.close());
    // Ein Lauscher für alle Knöpfe der Karten: Der Knopf nennt, was er tut und für welche Quest.
    this.list.addEventListener('click', (event) => {
      const button = (event.target as HTMLElement).closest<HTMLElement>('button[data-action]');
      const key = button?.dataset.key;
      if (!button || !key) return;
      const action = button.dataset.action;
      if (action === 'accept') this.quests.accept(key);
      else if (action === 'handin') this.quests.handIn(key);
      else if (action === 'abandon') this.quests.abandon(key);
      else if (action === 'track') this.quests.toggleTracked(key);
    });
  }

  get isOpen(): boolean {
    return this.win.isOpen;
  }

  /** Der Auftraggeber, dessen Ansicht gerade offen ist – null beim Questlog oder wenn das Fenster zu ist. */
  get giver(): string | null {
    return this.isOpen ? this.currentGiver : null;
  }

  /** Taste L / Knopf in der Leiste: Questlog auf und zu. */
  toggleLog(): void {
    if (this.isOpen && this.currentGiver === null) this.close();
    else this.open(null);
  }

  /** Öffnet das Questlog (`giver` = null) oder die Ansicht eines Auftraggebers. */
  open(giver: string | null): void {
    this.beforeOpen();
    this.currentGiver = giver;
    this.win.show();
    this.button.classList.toggle('active', giver === null);
    this.render();
  }

  close(): void {
    this.win.hide();
    this.button.classList.remove('active');
  }

  /** Einmal pro Frame: Am Kopfgeld-Brett läuft die Zeit bis zum Wechsel sichtbar herunter. */
  update(): void {
    if (this.giver !== BOUNTY_BOARD.id) return;
    const countdown = clock(this.quests.rotateInMs);
    if (countdown === this.shownCountdown) return;
    this.shownCountdown = countdown;
    this.footer.textContent = `Neue Kopfgelder in ${countdown} · mehr Kopfgelder gibt ein höheres Rathaus`;
  }

  /** Zeichnet das Fenster neu. Aufrufen, wenn sich bei den Quests etwas getan hat. */
  render(): void {
    if (!this.isOpen) return;
    const giver = this.currentGiver;
    const atGiver = giver !== null;
    let entries: QuestEntry[];
    if (giver === null) {
      this.title.textContent = 'Quests';
      entries = this.quests.running();
    } else if (giver === BOUNTY_BOARD.id) {
      this.title.textContent = BOUNTY_BOARD.name;
      entries = this.quests.entriesOf(giver);
    } else {
      this.title.textContent = NPCS[giver]?.name ?? giver;
      // Erledigte Quests zeigt der NPC nicht mehr.
      entries = this.quests.entriesOf(giver).filter((entry) => entry.status !== 'done');
    }
    entries.sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status));

    if (entries.length > 0) this.list.innerHTML = entries.map((entry) => card(entry, atGiver)).join('');
    else if (atGiver) this.list.innerHTML = '<div class="quest-empty">„Danke für deine Hilfe – im Moment habe ich nichts für dich.“</div>';
    else this.list.innerHTML = '<div class="quest-empty">Keine laufende Quest. Sprich mit den Leuten im Dorf: Wer etwas für dich hat, trägt ein „!“ über dem Kopf. Am Rathaus hängt das Kopfgeld-Brett.</div>';

    const { done, total } = this.quests.doneCount;
    this.shownCountdown = '';
    if (giver === BOUNTY_BOARD.id) this.update();
    else this.footer.textContent = `Abgeschlossene Quests: ${done} / ${total}${atGiver ? '' : ' · abgegeben wird beim Auftraggeber'}`;
  }
}

/** Die Karte einer Quest. `atGiver` = die Figur steht beim Auftraggeber (dann gibt es Annehmen und Abgeben). */
function card(entry: QuestEntry, atGiver: boolean): string {
  const { status } = entry;
  const lines: string[] = [];
  lines.push(`<div class="quest-text">${entry.text}</div>`);

  if (status === 'ready') lines.push(`<div class="quest-goal">✔ ${goalText(entry.goal)} – ${atGiver ? 'jetzt abgeben' : `abgeben bei: ${entry.giverName}`}</div>`);
  else if (status === 'done') lines.push('<div class="quest-goal">Erledigt – bis die Kopfgelder wechseln, bleibt der Platz leer.</div>');
  else lines.push(`<div class="quest-goal">${goalText(entry.goal)}${status === 'active' || entry.needed > 1 ? `: <b>${entry.progress} / ${entry.needed}</b>` : ''}</div>`);

  const reward = [`${entry.reward.xp} EP`, `${entry.reward.gold} Gold`];
  if (entry.reward.item) {
    const rarity = rarityById(entry.reward.item);
    reward.push(`ein Item <span style="color: ${rarity.color}">(${rarity.name})</span>`);
  }
  if (status !== 'done') lines.push(`<div class="quest-reward">Belohnung: ${reward.join(' · ')}</div>`);
  if (entry.lockReason) lines.push(`<div class="quest-lock">${entry.lockReason}</div>`);

  const buttons: string[] = [];
  const button = (action: string, label: string, plain = false) => buttons.push(`<button class="quest-button${plain ? ' plain' : ''}" type="button" data-action="${action}" data-key="${entry.key}">${label}</button>`);
  if (atGiver && status === 'available') button('accept', 'Annehmen');
  if (atGiver && status === 'ready') button('handin', 'Abgeben');
  if (status === 'active' || status === 'ready') button('track', entry.tracked ? 'Auf der Karte: an' : 'Auf der Karte: aus', true);
  if (atGiver && entry.bounty && status === 'active') button('abandon', 'Aufgeben', true);

  return `<div class="quest-card status-${status}">
    <div class="quest-head"><b>${entry.name}</b><span>Stufe ${entry.level} · ${STATUS_LABEL[status]}</span></div>
    ${lines.join('')}
    <div class="quest-actions">${buttons.join('')}</div>
  </div>`;
}

/** "12:05" aus Millisekunden. */
function clock(ms: number): string {
  const seconds = Math.ceil(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
