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

## Steuerung

| Eingabe | Wirkung |
|---|---|
| Linksklick auf den Boden | hinlaufen |
| Linke Maustaste halten | dem Mauszeiger nachlaufen |
| Linksklick auf einen Gegner | als Ziel wählen, hinlaufen, automatisch angreifen |
| `1`–`4` | Skills (auch per Klick auf den Skill-Balken); werden auf Stufe 1, 3, 5 und 8 freigeschaltet |
| `Esc` | Zielauswahl aufheben |

## Aufbau

| Ordner | Inhalt |
|---|---|
| `src/scenes/` | Szenen: `BootScene` lädt alles, `WorldScene` ist die Spielwelt |
| `src/entities/` | Spielfigur und Gegner; `Actor` ist die gemeinsame Basis |
| `src/combat/` | Kampfregeln (`Combat`: Angriffe, EP, Stufenaufstieg, Tod) und Schadensformel |
| `src/data/` | Werte zum Einstellen: Krieger mit Skills, Gegnertypen, Levelkurve und EP |
| `src/ui/` | Anzeigen über dem Spielbild (HTML/CSS): Leben, Mana, EP, Ziel, Skill-Balken, Schadenszahlen |
| `src/world/` | Kollisionsraster, Wegfindung (Klick) und direkte Bewegung (Maustaste halten) |
| `src/config.ts` | Stellschrauben wie Laufgeschwindigkeit, Zoom, Reichweiten, Respawn-Zeiten und Treffer-Feedback |
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

## Gegner ändern

- Werte eines Gegnertyps (Leben, Angriff, Tempo …) und ihr Zuwachs pro Stufe:
  `src/data/enemies.ts`.
- Welche Gegner mit welcher Stufe auf welcher Lichtung stehen: Liste `ENEMY_GROUPS`
  oben in `tools/build-map.mjs`, danach `npm run assets`.

## Leveln ändern und testen

- Levelkurve, EP pro Gegner, EP-Verlust beim Tod: `src/data/progression.ts`.
- Zuwachs des Kriegers pro Stufe und Skill-Stufen (`unlockLevel`): `src/data/warrior.ts`.
- Zum Testen `?stufe=5` an die Adresse hängen (z. B. `http://localhost:5173/?stufe=5`),
  dann startet die Figur auf Stufe 5.
