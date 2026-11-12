# Credits

## Grafik

Alle Packs stehen unter [CC0 1.0](http://creativecommons.org/publicdomain/zero/1.0/): frei nutzbar
für private und kommerzielle Projekte, Namensnennung ist freiwillig. Danke an alle Urheber!

### Im Spiel verwendet

| Paket | Urheber | Lizenz | Verwendet für | Liegt in `assets-src/` |
|---|---|---|---|---|
| [Tiny Town](https://kenney.nl/assets/tiny-town) (Version 1.1) | Kenney (www.kenney.nl) | CC0 1.0 | Landschaft, Häuser, Zäune (auch das Goblin-Lager), Ruine, Höhleneingang | `kenney/tiny-town/` |
| [Tiny Dungeon](https://kenney.nl/assets/tiny-dungeon) (Version 1.0) | Kenney (www.kenney.nl) | CC0 1.0 | Spielfigur, Händler, Riesenratte, Waldspinne, Fledermaus, Wegelagerer, Räuberhauptmann, Truhen, Höhlenboden und -mauern, Skill-Symbole, Waffen- und Schild-Symbole, Heiltrank | `kenney/tiny-dungeon/` |
| [16x16 DungeonTileset II](https://0x72.itch.io/dungeontileset-ii) (Version 1.7) | 0x72 | CC0 1.0 | Goblin und – umgefärbt – Goblin-Schleuderer, je mit Bildern fürs Stehen und Laufen | `0x72/dungeon-tileset-ii/` |
| [Ninja Adventure Asset Pack](https://pixel-boy.itch.io/ninja-adventure-asset-pack) (ohne Audio) | Pixel-boy und AAA | CC0 1.0 | Wildschwein (`WildBoar`), Wolf (der dunkle Hund `DogBlack` als Wolf-Ersatz); die Hyäne (`Hyena`) liegt als zweite Möglichkeit bereit | `ninja-adventure/` |

### Liegt bereit, noch nicht im Spiel

| Paket | Urheber | Lizenz | Geplant für | Liegt in `assets-src/` |
|---|---|---|---|---|
| [Roguelike/RPG Pack](https://kenney.nl/assets/roguelike-rpg-pack) | Kenney (www.kenney.nl), mit Lynn Evers | CC0 1.0 | Wasser, Stege und Friedhof für spätere Zonen | `kenney/roguelike-rpg-pack/` |
| [1-Bit Pack](https://kenney.nl/assets/1-bit-pack) (Version 1.2) | Kenney (www.kenney.nl) | CC0 1.0 | Symbole für Skills, Talente, Quests und Karten-Marker | `kenney/1-bit-pack/` |

Aus 0x72 und Ninja Adventure ist ebenfalls erst ein kleiner Teil im Spiel; die übrigen Figuren
(Orks, Skelette, Dämonen …) kommen mit den nächsten Zonen.

### Herkunft der Dateien

- **Tiny Town, Tiny Dungeon:** `kenney.nl` lässt keine automatischen Downloads zu. Die beiden
  `tilemap_packed.png` und die Lizenzdateien wurden deshalb aus einem öffentlichen
  GitHub-Repository übernommen, das die Pakete weiterverteilt
  (`xiaoxiandadada/job-multi-agent-town`, Commit `28a988f`, Ordner `web/assets/kenney/`).
  Wer ganz sichergehen will, lädt die Pakete von kenney.nl und ersetzt die Dateien
  in `assets-src/kenney/` – danach `npm run assets` ausführen.
- **0x72, Ninja Adventure, Roguelike/RPG Pack, 1-Bit Pack:** vom Projektinhaber von den
  Seiten der Urheber geladen und als ZIP nach `assets-src/` gelegt. Die ZIPs sind dort
  unverändert entpackt (nur die macOS-Hilfsdateien `__MACOSX` und `.DS_Store` fehlen);
  die ZIPs selbst liegen weiter daneben.
- **Lizenznachweise:** Kenneys Pakete und Ninja Adventure bringen ihre Lizenzdatei mit
  (`License.txt` bzw. `LICENSE.txt` im jeweiligen Ordner). Im ZIP von 0x72 liegt keine
  Lizenzdatei; die Angabe CC0 stammt von der Seite des Packs auf itch.io.

### Abgeleitete Dateien

`npm run assets` erzeugt aus den Originalen die Dateien, die das Spiel lädt:

- `public/assets/tilesets/gruenwald.png` – Tiny Town mit 1 px Rand um jede Kachel,
  ergänzt um Waldkacheln, die aus Kenneys Baum-Teilstücken zusammengesetzt sind
- `public/assets/tilesets/hoehle.png` – Tiny Dungeon mit 1 px Rand um jede Kachel,
  ergänzt um den Ausgang (Leiter im Steinrahmen) aus Tiny Town
- `public/assets/sprites/characters.png` – Tiny Dungeon mit 1 px Rand um jedes Bild,
  ergänzt um sechs selbst gezeichnete Item-Symbole (Helm, Rüstung, Handschuhe, Stiefel,
  Amulett, Ring; eigenes Werk, Muster in `tools/lib/item-icons.mjs`)
- `public/assets/sprites/creatures.png` und `creatures.json` – die Figuren von 0x72 und
  Ninja Adventure nebeneinander (Liste in `tools/lib/creatures.mjs`). Der Goblin-Schleuderer
  ist der Goblin von 0x72 mit gedrehtem Farbton (grün → violett)
- `public/assets/maps/gruenwald.json`, `public/assets/maps/spinnenhoehle.json` – die Karten
  der Zonen (eigenes Werk, Baupläne in `tools/zones/`)

## Technik

- [Phaser 3](https://phaser.io/) – MIT-Lizenz
- [Vite](https://vite.dev/), [TypeScript](https://www.typescriptlang.org/), [pngjs](https://github.com/pngjs/pngjs) – nur zum Bauen
