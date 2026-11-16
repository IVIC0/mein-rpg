import { QUEST_UI } from '../data/quests';
import type { QuestEntry } from '../quests/QuestLog';
import { byId } from './dom';

/**
 * Der Quest-Zähler unter der Minimap: eine Zeile je laufender Quest ("Rattenplage 3 / 10").
 * Grün = Ziel erreicht, zurück zum Auftraggeber. Zu sehen sind nur Quests, bei denen
 * "Auf der Karte" an ist. Ein Klick (oder Tippen) öffnet das Questlog (`onOpen`).
 * Er ist ein HUD-Element wie die anderen: ausblenden, Größe, Deckkraft, verschieben.
 */
export class QuestTracker {
  private readonly root = byId('quest-tracker');
  private entries: QuestEntry[] = [];
  onOpen: () => void = () => {};

  constructor() {
    this.root.addEventListener('click', () => this.onOpen());
    // Dreht man das Handy, passen mehr oder weniger Zeilen ins Bild.
    window.addEventListener('resize', () => this.render(this.entries));
  }

  /** Zeichnet den Zähler neu. `entries` = alle laufenden Quests. */
  render(entries: QuestEntry[]): void {
    this.entries = entries;
    // Was abgegeben werden kann, steht oben.
    const shown = entries.filter((entry) => entry.tracked).sort((a, b) => Number(b.status === 'ready') - Number(a.status === 'ready'));
    const small = window.innerHeight < QUEST_UI.smallScreenHeight;
    const lines = small ? QUEST_UI.trackerLinesSmall : QUEST_UI.trackerLines;
    // Passt nicht alles hinein, gehört die letzte Zeile dem Hinweis "+ n weitere".
    const fit = shown.length > lines ? lines - 1 : lines;
    const html = shown.slice(0, fit).map((entry) => {
      const ready = entry.status === 'ready';
      return `<div class="${ready ? 'ready' : ''}"><b>${entry.name}</b><span>${ready ? '✔ abgeben' : `${entry.progress} / ${entry.needed}`}</span></div>`;
    });
    if (shown.length > fit) html.push(`<div class="more">+ ${shown.length - fit} weitere</div>`);
    this.root.innerHTML = html.join('');
  }
}
