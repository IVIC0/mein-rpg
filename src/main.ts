import Phaser from 'phaser';
import './ui/hud.css';
import { BootScene } from './scenes/BootScene';
import { WorldScene } from './scenes/WorldScene';
import { newSave } from './save/saveGame';
import { ALL_SLOTS, MAIN_SLOTS, lastSlot, rawSlot, readSlot, readTestParams, session, setLastSlot, slotLabel, writeSlot } from './save/slots';
import { askName } from './ui/dialog';
import { SaveMenu } from './ui/SaveMenu';
import { loadLegacySettings } from './ui/settings';

const versionLabel = document.getElementById('version');
if (versionLabel) versionLabel.textContent = `v${__APP_VERSION__}`;

void start();

/**
 * Entscheidet, womit gespielt wird, und startet dann das Spiel:
 * 1. Test-Parameter in der Adresse (?stufe, ?beute, ?elite) → Testlauf ohne Slot, wird nie gespeichert.
 * 2. Sonst der zuletzt gespielte Slot.
 * 3. Gibt es noch gar keinen Spielstand → Namen erfragen und Slot 1 anlegen.
 * 4. Sonst (z. B. zuletzt gespielter Slot gelöscht oder nicht ladbar) → Auswahl zeigen.
 */
async function start(): Promise<void> {
  const last = lastSlot();
  const lastContent = last ? readSlot(last) : null;

  if (readTestParams().active) {
    // Der Testlauf sieht aus wie gewohnt (Einstellungen des letzten Slots), ändert dort aber nichts.
    const settings = lastContent?.state === 'ok' ? lastContent.save.settings : loadLegacySettings();
    session.save = newSave('Testfigur', settings);
    startGame();
    return;
  }

  if (last && lastContent?.state === 'ok') {
    session.slotId = last;
    session.save = lastContent.save;
    startGame();
    return;
  }

  if (ALL_SLOTS.every((id) => rawSlot(id) === null)) {
    // Allererster Start: Die Figur bekommt einen Namen und landet in Slot 1.
    const name = (await askName('Willkommen! Wie soll deine Figur heißen?', '', false)) ?? '';
    const slot = MAIN_SLOTS[0];
    session.slotId = slot;
    session.save = newSave(name, loadLegacySettings());
    writeSlot(slot, session.save);
    setLastSlot(slot);
    startGame();
    return;
  }

  // Es gibt Spielstände, aber keiner lädt von selbst: Auswahl zeigen. Das Spiel startet nach der Wahl (Seite lädt neu).
  const notice = last && lastContent?.state === 'broken' ? `${slotLabel(last)} lässt sich nicht laden: ${lastContent.reason}` : '';
  new SaveMenu(null, notice);
}

function startGame(): void {
  // Bis hierher waren die Anzeigen des Spiels ausgeblendet (Klasse "no-game" in index.html).
  document.body.classList.remove('no-game');
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#1b2a1f',
    pixelArt: true, // keine Weichzeichnung beim Vergrößern
    scale: {
      // Die Spielfläche ist immer genau so groß wie das Browserfenster.
      // Größeres Fenster = man sieht mehr von der Welt, nichts wird verzerrt.
      mode: Phaser.Scale.RESIZE,
      width: '100%',
      height: '100%',
    },
    scene: [BootScene, WorldScene],
  });

  // Nur beim lokalen Entwickeln: Spiel in der Browser-Konsole als __rpg erreichbar.
  if (import.meta.env.DEV) {
    (window as unknown as { __rpg: Phaser.Game }).__rpg = game;
  }
}
