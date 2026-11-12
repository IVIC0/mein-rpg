// Figuren aus den Packs "0x72 DungeonTileset II" und "Ninja Adventure".
// build-tilesets.mjs setzt daraus public/assets/sprites/creatures.png zusammen und schreibt
// daneben creatures.json: dort steht, wo jedes Einzelbild liegt. Die Einzelbilder heißen
// "<name>-idle-0", "<name>-idle-1" … (Stehen) und "<name>-walk-0" … (Laufen) –
// unter diesen Namen benutzt sie das Spiel (src/data/sprites.ts).
//
// Neue Figur: einen Eintrag anhängen, `npm run assets`, dann in src/data/sprites.ts eintragen.

const DUNGEON = 'assets-src/0x72/dungeon-tileset-ii/frames';
const NINJA = 'assets-src/ninja-adventure/Ninja Adventure - Asset Pack/Actor';

/** Vier Einzeldateien je Bewegung, so wie 0x72 sie ausliefert. */
const dungeonFrames = (name) => ({
  idle: [0, 1, 2, 3].map((i) => ({ file: `${DUNGEON}/${name}_idle_anim_f${i}.png` })),
  walk: [0, 1, 2, 3].map((i) => ({ file: `${DUNGEON}/${name}_run_anim_f${i}.png` })),
});

/**
 * Die Tiere aus Ninja Adventure sind ein Streifen aus `count` Bildern nebeneinander
 * (zwei Schritte). Das erste Bild dient auch als Stehen.
 */
const ninjaStrip = (path, count = 2) => {
  const frames = Array.from({ length: count }, (_, i) => ({ file: `${NINJA}/${path}`, strip: count, index: i }));
  return { idle: [frames[0]], walk: frames };
};

export const CREATURES = [
  { name: 'goblin', ...dungeonFrames('goblin') },
  // Derselbe Goblin, umgefärbt (Farbton um 150° gedreht: grün → violett), damit man die Schleuderer erkennt.
  { name: 'goblin-schleuderer', ...dungeonFrames('goblin'), hueShift: 150 },
  { name: 'wildschwein', ...ninjaStrip('Animal/WildBoar/SpriteSheet.png') },
  // Der dunkle Hund ist der Wolf-Ersatz; die Hyäne liegt als zweite Möglichkeit bereit.
  { name: 'wolf', ...ninjaStrip('Animal/DogBlack/SpriteSheet.png') },
  { name: 'hyaene', ...ninjaStrip('Animal/Hyena/SpriteSheet.png') },
];
