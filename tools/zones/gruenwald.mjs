// Bauplan der Zone "Grünwald" (Stufe 1–10). Der Karten-Bauer (tools/build-map.mjs) macht
// daraus public/assets/maps/gruenwald.json. Nach Änderungen: npm run assets
//
// Alle Angaben sind Kachel-Koordinaten (x nach rechts, y nach unten). Die Karte ist von Hand
// geplant (Dorf, Wege, Lichtungen, Ruine); der Wald dazwischen wird mit dem festen
// Startwert `seed` aufgefüllt – jedes Ausführen liefert also exakt dieselbe Karte.

export default {
  id: 'gruenwald',
  tileset: 'gruenwald',
  terrain: 'wald',
  width: 120,
  height: 90,
  seed: 20261111,
  /** Herbstwald in der Ecke oben rechts (rund um die Ruine). */
  autumnCorner: true,

  /** Startpunkt im Dorf – hier wacht die Figur auch nach dem Tod auf. */
  spawn: { x: 22, y: 75 },

  // Freiflächen. Mit `marker` landen sie als Punkt in der Karte und können Gegnergruppen
  // aufnehmen (unten). Die erste ist das Dorf. `label` = Ortsname auf der großen Karte (Taste M);
  // das geht auch bei Lagern (`structures`) und benannten Punkten (`markers`).
  clearings: [
    { cx: 22, cy: 72, rx: 15, ry: 10.5, wobble: 0.25 },
    { marker: 'pilzhain', label: 'Pilzhain', cx: 24, cy: 30, rx: 8, ry: 6.5, mushrooms: 0.12 },
    { marker: 'lichtung', label: 'Große Lichtung', cx: 66, cy: 46, rx: 10, ry: 7.5 },
    { marker: 'ostlichtung', label: 'Ostlichtung', cx: 98, cy: 54, rx: 8.5, ry: 6.5 },
    { marker: 'suedlichtung', label: 'Südlichtung', cx: 90, cy: 78, rx: 7, ry: 5 },
    { marker: 'ruine', label: 'Ruine', cx: 97, cy: 18, rx: 10, ry: 6.5 },
    { marker: 'westlichtung', label: 'Westlichtung', cx: 46, cy: 52, rx: 5.5, ry: 4.5 },
    // Neu seit Meilenstein 11:
    { marker: 'wolfshang', label: 'Wolfshang', cx: 50, cy: 13, rx: 8, ry: 5 },
    { marker: 'eichenhain', label: 'Eichenhain', cx: 74, cy: 66, rx: 7, ry: 5 },
    { marker: 'wachposten', label: 'Wachposten', cx: 78, cy: 25.5, rx: 5, ry: 3.5 },
  ],

  // Wege als Linienzüge. width = Breite des Erdwegs in Kacheln.
  roads: [
    { width: 3, points: [[22, 72], [36, 72], [48, 72], [58, 65], [63, 55], [66, 46]] }, // Dorf → Lichtung
    { width: 2, points: [[66, 46], [69, 36], [72, 29], [84, 22], [96, 18]] }, // Lichtung → Ruine
    { width: 2, points: [[21, 70], [19, 58], [22, 44], [24, 30]] }, // Dorf → Pilzhain
    { width: 2, points: [[24, 30], [38, 26], [54, 27], [72, 29]] }, // Pilzhain → Nordweg
    { width: 2, points: [[66, 46], [80, 49], [98, 54]] }, // Lichtung → Ostlichtung
    { width: 2, points: [[98, 54], [97, 66], [90, 78]] }, // Ostlichtung → Südlichtung
    { width: 2, points: [[48, 72], [60, 80], [76, 81], [90, 78]] }, // Südweg
    { width: 2, points: [[46, 52], [56, 60]] }, // Abzweig zur Westlichtung
    { width: 2, points: [[54, 27], [52, 20], [50, 14]] }, // Nordweg → Wolfshang
    { width: 2, points: [[60, 62], [67, 65], [74, 66]] }, // Abzweig zum Eichenhain
    { width: 2, points: [[83, 44], [83, 50]] }, // Tor des Goblin-Lagers → Weg zur Ostlichtung
    { width: 2, points: [[24, 30], [22, 27]] }, // Pilzhain → Höhleneingang
  ],

  // Erdflächen ohne Rodung drumherum: Dorfplatz und kurze Wege zu den Haustüren.
  dirt: [
    { rect: [17, 69, 11, 7] },
    { line: [[14, 68], [14, 71], [17, 71]], width: 2 }, // Haus im Westen
    { line: [[29, 67], [29, 70], [27, 70]], width: 2 }, // Haus im Nordosten
    { line: [[35, 70], [35, 71]], width: 2 }, // Haus im Osten
    // Neu seit Schritt 11b (Dorfausbau):
    { line: [[24, 67], [24, 68]], width: 2 }, // Kontor hinter dem Händler
    { line: [[28, 74], [28, 77], [31, 77]], width: 2 }, // Gasse zum Lagerhaus
  ],

  // Bauten. Arten: haus, zaun, ruine, ding (ein einzelnes Teil aus PROPS in tools/lib/tiles.mjs),
  // lager (Zaun mit Tor unten; die Fläche darin kann über `marker` Gegner aufnehmen).
  structures: [
    { type: 'haus', x: 12, y: 65, width: 4, roof: 'red', wall: 'wood', door: 2, windows: [1], chimney: 1 },
    { type: 'haus', x: 27, y: 64, width: 5, roof: 'gray', wall: 'stone', door: 2, windows: [1, 3], chimney: 3 },
    { type: 'haus', x: 34, y: 67, width: 3, roof: 'red', wall: 'wood', door: 1 },
    { type: 'ding', tile: 'wellTop', x: 22, y: 71 },
    { type: 'ding', tile: 'well', x: 22, y: 72 },
    { type: 'ding', tile: 'sign', x: 39, y: 70 },
    { type: 'ding', tile: 'log', x: 17, y: 66 },
    { type: 'ding', tile: 'pot', x: 32, y: 67 },
    { type: 'ding', tile: 'cart', x: 34, y: 77 },
    { type: 'zaun', x: 10, y: 73, width: 5, height: 4, gate: 3 },
    { type: 'ding', tile: 'hay', x: 11, y: 74 },
    { type: 'ding', tile: 'hay', x: 12, y: 74 },
    { type: 'ding', tile: 'beehive', x: 11, y: 75 },
    { type: 'ding', tile: 'target', x: 16, y: 79 },
    { type: 'ruine', x: 92, y: 14 },
    // Neu seit Meilenstein 11: Höhleneingang im Pilzhain und das Goblin-Lager.
    { type: 'ding', tile: 'caveEntrance', x: 22, y: 25 },
    { type: 'lager', marker: 'goblinlager', label: 'Goblin-Lager', x: 77, y: 35, width: 13, height: 9, gate: 6 },
    { type: 'ding', tile: 'log', x: 80, y: 37 },
    { type: 'ding', tile: 'pot', x: 86, y: 37 },
    { type: 'ding', tile: 'hay', x: 79, y: 41 },
    // Neu seit Schritt 11b (Dorfausbau): Kontor hinter dem Händler, Lagerhaus im Südosten des Dorfs.
    // Die anderen Gebäude sind die drei alten Häuser: Gasthaus (Westen), Rathaus (Nordosten, Stein),
    // Alchemistin (Osten). Welches Haus welches Gebäude ist, legen die Fahnen unten fest.
    { type: 'haus', x: 23, y: 64, width: 3, roof: 'gray', wall: 'wood', door: 1 },
    { type: 'haus', x: 30, y: 74, width: 4, roof: 'red', wall: 'stone', door: 1 },
  ],

  // Besondere Orte (POIs). Was sie im Spiel tun, hängt an `type`:
  //   haendler – der Händler (Werte: src/data/shop.ts)
  //   truhe    – Truhe mit Itemlevel `level` (Werte: src/data/pois.ts)
  //   portal   – Übergang in die Zone `to`; die Figur kommt dort am Marker `arrive` an
  //   elite    – fester Elite-Platz; `name` ist der Schlüssel in NAMED_ELITES (src/data/elites.ts)
  //   baumeister – bei ihm baut man das Dorf aus (Werte: src/data/town.ts)
  //   lagertruhe – die Lagertruhe am Lagerhaus
  //   fahne    – Fahne am Haus des Gebäudes `building` (Schlüssel in BUILDINGS, src/data/town.ts);
  //              sie zeigt dessen Stufe und ist kein Hindernis
  // `name` muss in der Zone eindeutig sein – daran hängen die Zeiten im Spielstand.
  pois: [
    { type: 'haendler', name: 'haendler', x: 25, y: 70 },
    { type: 'portal', name: 'hoehleneingang', x: 22, y: 26, to: 'spinnenhoehle', arrive: 'spawn', label: 'Spinnenhöhle' },
    { type: 'truhe', name: 'truhe-wolfshang', x: 50, y: 10, level: 4 },
    { type: 'truhe', name: 'truhe-goblinlager', x: 83, y: 38, level: 7 },
    // Dorfausbau (seit Schritt 11b)
    { type: 'baumeister', name: 'baumeister', x: 18, y: 70 },
    { type: 'lagertruhe', name: 'lagertruhe', x: 32, y: 77 },
    { type: 'fahne', name: 'fahne-rathaus', x: 28, y: 67, building: 'rathaus' },
    { type: 'fahne', name: 'fahne-gasthaus', x: 13, y: 68, building: 'gasthaus' },
    { type: 'fahne', name: 'fahne-alchemistin', x: 34, y: 70, building: 'alchemistin' },
    { type: 'fahne', name: 'fahne-kontor', x: 23, y: 67, building: 'kontor' },
    { type: 'fahne', name: 'fahne-lagerhaus', x: 30, y: 77, building: 'lagerhaus' },
  ],

  /**
   * Benannte Punkte: Ankunft eines Portals (`arrive`) und die Dorfmitte – um sie herum gilt die
   * Dorf-Erholung des Gasthauses (TOWN in src/data/town.ts).
   */
  markers: [
    { name: 'vor-der-hoehle', x: 22, y: 28 },
    { name: 'dorfmitte', x: 22, y: 73, label: 'Dorf' },
  ],

  // Gegnergruppen je Lichtung oder Lager: Gegnertyp → Stufen, ein Gegner pro Eintrag.
  // Die Typen mit ihren Werten stehen in src/data/enemies.ts. Je weiter vom Dorf,
  // desto höher die Stufe. Die genauen Plätze würfelt der Karten-Bauer aus.
  enemyGroups: {
    westlichtung: { ratte: [1, 1, 1, 1] },
    pilzhain: { ratte: [1, 2, 2], spinne: [2, 2, 3] },
    lichtung: { ratte: [3, 3, 3, 3], spinne: [3, 4, 4] },
    suedlichtung: { spinne: [5, 5, 5, 6], wildschwein: [6, 7] },
    ostlichtung: { spinne: [6, 6, 7], wegelagerer: [7, 7] },
    ruine: { wegelagerer: [8, 8, 9, 9, 10], raeuberhauptmann: [10] }, // der Hauptmann ist der Boss (src/data/enemies.ts)
    wolfshang: { wolf: [2, 3, 3, 4, 4, 5] },
    eichenhain: { wildschwein: [4, 4, 5, 5, 6] },
    goblinlager: { goblin: [5, 6, 6, 7], schleuderer: [6, 7] },
    wachposten: { goblin: [8, 9], schleuderer: [9, 10] },
  },
};
