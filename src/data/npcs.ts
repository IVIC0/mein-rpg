// NPCs: die Questgeber im Dorf und das Kopfgeld-Brett.
// Wo sie stehen, legt der Bauplan der Zone fest (tools/zones/<zone>.mjs): POI-Art `npc`, der
// Name des POI ist der Schlüssel hier. Welche Quests ein NPC vergibt, steht bei den Quests
// (`giver` in src/data/quests.ts). Namen und Bilder sind Startwerte.

import type { SpriteName } from './sprites';

export interface NpcDef {
  name: string;
  /** Name des Bildes (src/data/sprites.ts). */
  sprite: SpriteName;
}

export const NPCS: Record<string, NpcDef> = {
  aeltester: { name: 'Dorfältester Alrik', sprite: 'aeltester' },
  jaeger: { name: 'Jäger Bram', sprite: 'jaeger' },
  wachmann: { name: 'Wachmann Tomas', sprite: 'wachmann' },
};

/** So nah (Welt-Pixel) muss die Figur zum Reden stehen; geht sie weiter weg als `closeRange`, schließt das Fenster. */
export const NPC_TALK = { openRange: 30, closeRange: 56 };

/** Das Kopfgeld-Brett am Rathaus (Werte der Kopfgelder: BOUNTY in src/data/quests.ts). */
export const BOUNTY_BOARD = { id: 'kopfgeldbrett', name: 'Kopfgeld-Brett', sprite: 'kopfgeldbrett' as SpriteName, openRange: 30, closeRange: 56 };
