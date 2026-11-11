# Mein RPG

Solo-Browser-RPG im MMO-Stil mit Phaser 3, Vite und TypeScript.
Spielkonzept und Fahrplan stehen in [GAME.md](GAME.md), Lizenzen in [CREDITS.md](CREDITS.md).

## Befehle

| Befehl | Was passiert |
|---|---|
| `npm install` | Abhängigkeiten installieren (einmalig) |
| `npm run dev` | Spiel lokal starten, lädt bei Änderungen automatisch neu |
| `npm run build` | TypeScript prüfen und fertige Seite nach `dist/` bauen |
| `npm run assets` | Tilesets und Karte aus `assets-src/` und `tools/` neu erzeugen |

Jeder Push auf `main` veröffentlicht das Spiel automatisch auf GitHub Pages.

## Aufbau

| Ordner | Inhalt |
|---|---|
| `src/scenes/` | Szenen: `BootScene` lädt alles, `WorldScene` ist die Spielwelt |
| `src/entities/` | Spielfigur, später Gegner |
| `src/world/` | Kollisionsraster, Wegfindung (Klick) und direkte Bewegung (Maustaste halten) |
| `src/config.ts` | Stellschrauben wie Laufgeschwindigkeit und Zoom |
| `public/assets/` | Grafiken und Karten, die das Spiel lädt (erzeugt, nicht von Hand ändern) |
| `assets-src/` | Original-Grafikpakete mit Lizenzdateien |
| `tools/` | Werkzeuge, die Tilesets und Karten bauen |

## Karte ändern

Die Zone Grünwald wird von `tools/build-map.mjs` erzeugt. Dorf, Wege und
Lichtungen stehen oben in der Datei als Koordinatenlisten. Nach einer Änderung:

```bash
npm run assets
```

Mit `node tools/build-map.mjs --preview karte.png` gibt es zusätzlich ein
Übersichtsbild der ganzen Karte.
