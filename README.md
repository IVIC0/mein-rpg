# Rogoi Offline

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
| Linksklick auf den Händler im Dorf | hinlaufen und handeln (Linksklick auf Ware: kaufen) |
| Rechtsklick auf ein Item im Inventar | verkaufen (nur beim Händler; ab Episch zweimal klicken) |
| `Q` | Heiltrank trinken |
| `I` oder `C` | Charakter & Inventar öffnen und schließen |
| Linksklick auf ein Item im Inventar | anlegen (angelegte Ausrüstung: ablegen) |
| Umschalt + Linksklick auf ein Item | wegwerfen |
| `Esc` | Fenster schließen bzw. Zielauswahl aufheben |

Skills lösen von selbst aus (z. B. jeder 5. Schlag = Wuchtschlag); der Skill-Balken zeigt
nur an. Sie werden auf Stufe 1, 3, 5 und 8 freigeschaltet. Mana gibt es nicht.

Besiegte Gegner lassen Gold und manchmal ein Item fallen. Über ein Item laufen hebt es auf.

Gespeichert wird von selbst im Browser. Slots, Export/Import und Test-Spielstände gibt es im
Menü „Spielstände" (Diskette oben rechts), HUD-Einstellungen hinter dem Zahnrad.

## Aufbau

| Ordner | Inhalt |
|---|---|
| `src/scenes/` | Szenen: `BootScene` lädt alles, `WorldScene` ist die Spielwelt |
| `src/entities/` | Spielfigur und Gegner; `Actor` ist die gemeinsame Basis |
| `src/combat/` | Kampfregeln (`Combat`: Angriffe, EP, Stufenaufstieg, Tod) und Schadensformel |
| `src/items/` | Loot: Item-Generator, Inventar mit Ausrüstung, Items am Boden, Händler |
| `src/save/` | Spielstand (Aufbau, Format-Umbau) und Slots im Browser |
| `src/data/` | Werte zum Einstellen: Krieger mit Skills, Gegnertypen, Levelkurve und EP, Items, Affixe, Drops, Händler-Preise, Speichern |
| `src/ui/` | Anzeigen über dem Spielbild (HTML/CSS): Leben, EP, Ziel, Skill-Balken, Schadenszahlen, Inventar-, Händler- und Spielstand-Fenster, Einstellungen |
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
- Zuwachs des Kriegers pro Stufe, Skill-Stufen (`unlockLevel`), Auslöse-Bedingungen
  (`trigger`) und Wirkungen (`effect`) der Skills: `src/data/warrior.ts`.
- Zum Testen `?stufe=5` an die Adresse hängen (z. B. `http://localhost:5173/?stufe=5`),
  dann startet die Figur auf Stufe 5.

## Loot ändern und testen

- Seltenheiten (Farbe, Zahl der Affixe, Drop-Anteil), Basis-Items und Affixe: `src/data/items.ts`.
- Drop-Chance, Gold pro Gegner, Inventargröße: `src/data/loot.ts`.
- Was ein Punkt Stärke, Ausdauer oder Geschick bringt: `src/data/stats.ts`.
- Zum Testen `?beute=12` an die Adresse hängen (auch zusammen: `?stufe=5&beute=12`),
  dann liegen 12 gewürfelte Items im Inventar. Ein solcher Testlauf wird nie gespeichert.

## Händler ändern

- Preise, Sortiment (Größe, Seltenheiten, Lieferzeit) und Heiltrank: `src/data/shop.ts`.
- Wo der Händler steht: `MERCHANT` oben in `tools/build-map.mjs`, danach `npm run assets`.
