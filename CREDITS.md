# Credits

## Grafik

| Paket | Urheber | Lizenz | Verwendet für |
|---|---|---|---|
| [Tiny Town](https://kenney.nl/assets/tiny-town) (Version 1.1) | Kenney (www.kenney.nl) | [CC0 1.0](http://creativecommons.org/publicdomain/zero/1.0/) | Landschaft, Häuser, Zäune, Ruine |
| [Tiny Dungeon](https://kenney.nl/assets/tiny-dungeon) (Version 1.0) | Kenney (www.kenney.nl) | [CC0 1.0](http://creativecommons.org/publicdomain/zero/1.0/) | Spielfigur, Gegner, Skill-Symbole; später Items |

Die unveränderten Originaldateien liegen mit ihrer jeweiligen `License.txt` unter
`assets-src/kenney/`.

CC0 heißt: frei nutzbar für private und kommerzielle Projekte, Namensnennung ist
freiwillig. Danke an Kenney!

### Herkunft der Dateien

`kenney.nl` lässt keine automatischen Downloads zu. Die beiden `tilemap_packed.png`
und die Lizenzdateien wurden deshalb aus einem öffentlichen GitHub-Repository
übernommen, das die Pakete weiterverteilt
(`xiaoxiandadada/job-multi-agent-town`, Commit `28a988f`, Ordner `web/assets/kenney/`).
Wer ganz sichergehen will, lädt die Pakete von kenney.nl und ersetzt die Dateien
in `assets-src/kenney/` – danach `npm run assets` ausführen.

### Abgeleitete Dateien

`npm run assets` erzeugt aus den Originalen die Dateien, die das Spiel lädt:

- `public/assets/tilesets/gruenwald.png` – Tiny Town mit 1 px Rand um jede Kachel,
  ergänzt um Waldkacheln, die aus Kenneys Baum-Teilstücken zusammengesetzt sind
- `public/assets/sprites/characters.png` – Tiny Dungeon mit 1 px Rand um jedes Bild
- `public/assets/maps/gruenwald.json` – die Karte der Zone Grünwald (eigenes Werk)

## Technik

- [Phaser 3](https://phaser.io/) – MIT-Lizenz
- [Vite](https://vite.dev/), [TypeScript](https://www.typescriptlang.org/), [pngjs](https://github.com/pngjs/pngjs) – nur zum Bauen
