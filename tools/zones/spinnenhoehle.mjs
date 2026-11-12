// Bauplan der Zone "Spinnenhöhle" (Stufe 3–6): die Höhle unter dem Pilzhain in Grünwald.
// Aufbau wie tools/zones/gruenwald.mjs. In einer Höhle sind `clearings` die Kammern und
// `roads` die Gänge; alles andere ist Fels. Nach Änderungen: npm run assets

export default {
  id: 'spinnenhoehle',
  tileset: 'hoehle',
  terrain: 'hoehle',
  width: 64,
  height: 48,
  seed: 20261112,

  /** Hier kommt die Figur an, wenn sie die Leiter herunterkommt. */
  spawn: { x: 12, y: 8 },

  // Kammern, vom Eingang (oben links) bis zur Brutkammer (unten rechts).
  clearings: [
    { marker: 'eingang', cx: 12, cy: 9, rx: 6, ry: 4 },
    { marker: 'fledermaushalle', cx: 31, cy: 12, rx: 8, ry: 5 },
    { marker: 'netzkammer', cx: 49, cy: 20, rx: 8, ry: 6 },
    { marker: 'tropfgang', cx: 22, cy: 31, rx: 9, ry: 5 },
    { marker: 'brutkammer', cx: 47, cy: 38, rx: 10, ry: 5.5 },
  ],

  // Gänge zwischen den Kammern – ein Weg ohne Abkürzung, die Brutkammer liegt am Ende.
  roads: [
    { width: 2, points: [[12, 9], [21, 11], [31, 12]] },
    { width: 2, points: [[31, 12], [41, 14], [49, 20]] },
    { width: 2, points: [[49, 20], [38, 27], [22, 31]] },
    { width: 2, points: [[22, 31], [31, 38], [47, 38]] },
  ],

  // Fester Boden vor der Leiter, damit der Ausgang sicher frei steht.
  dirt: [{ rect: [11, 5, 3, 4] }],

  // Der Ausgang: Leiter im Fels, direkt über dem Portal.
  structures: [{ type: 'ding', tile: 'exit', x: 12, y: 4 }],

  pois: [
    { type: 'portal', name: 'ausgang', x: 12, y: 5, to: 'gruenwald', arrive: 'vor-der-hoehle', label: 'Grünwald' },
    { type: 'elite', name: 'brutmutter', x: 50, y: 38 },
    { type: 'truhe', name: 'truhe-brutkammer', x: 54, y: 36, level: 6 },
  ],

  markers: [],

  enemyGroups: {
    fledermaushalle: { fledermaus: [3, 3, 4, 4] },
    netzkammer: { spinne: [4, 5, 5], fledermaus: [4, 5] },
    tropfgang: { fledermaus: [5, 5, 6], spinne: [5, 6] },
    brutkammer: { spinne: [6, 6] },
  },
};
