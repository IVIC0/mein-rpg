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
| Linksklick auf den Baumeister im Dorf | Dorfausbau: Gebäude mit Gold ausbauen |
| Linksklick auf die Lagertruhe am Lagerhaus | Truhe öffnen (Rechtsklick im Inventar: einlagern, Linksklick in der Truhe: herausnehmen) |
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
| `src/entities/` | Spielfigur, Gegner, Truhe, Übergang; `Fixture` = Händler, Baumeister und Lagertruhe; `Actor` ist die gemeinsame Basis der Figuren |
| `src/town/` | Dorfausbau: Stufen der Gebäude und was sie bringen |
| `src/combat/` | Kampfregeln (`Combat`: Angriffe, EP, Stufenaufstieg, Tod) und Schadensformel |
| `src/items/` | Loot: Item-Generator, Inventar mit Ausrüstung, Items am Boden, Händler |
| `src/save/` | Spielstand (Aufbau, Format-Umbau) und Slots im Browser |
| `src/data/` | Werte zum Einstellen: Krieger mit Skills, Gegnertypen, Zonen, Bilder der Figuren, Truhen, Levelkurve und EP, Items, Affixe, Drops, Händler-Preise, Speichern |
| `src/ui/` | Anzeigen über dem Spielbild (HTML/CSS): Leben, EP, Ziel, Skill-Balken, Schadenszahlen, Inventar-, Händler- und Spielstand-Fenster, Einstellungen |
| `src/world/` | Kollisionsraster, Wegfindung (Klick) und direkte Bewegung (Maustaste halten) |
| `src/config.ts` | Stellschrauben wie Laufgeschwindigkeit, Zoom, Reichweiten, Respawn-Zeiten und Treffer-Feedback |
| `public/assets/` | Grafiken und Karten, die das Spiel lädt (erzeugt, nicht von Hand ändern) |
| `assets-src/` | Original-Grafikpakete mit Lizenzdateien |
| `tools/` | Werkzeuge, die Tilesets, Figuren-Bilder und Karten bauen; `tools/zones/` enthält je Zone einen Bauplan |

## Karte ändern

Jede Zone hat einen Bauplan in `tools/zones/` (z. B. `gruenwald.mjs`): Größe, Lichtungen,
Wege, Bauten, besondere Orte (Händler, Truhen, Übergänge, feste Elite-Plätze) und
Gegnergruppen als Koordinatenlisten. `tools/build-map.mjs` baut daraus die Karten.
Nach einer Änderung:

```bash
npm run assets
```

Mit `node tools/build-map.mjs --preview ordner/` gibt es zusätzlich je Zone ein
Übersichtsbild der ganzen Karte (Gegner rot, besondere Orte gelb).

Eine neue Zone: Bauplan in `tools/zones/` anlegen, in `src/data/zones.ts` eintragen,
`npm run assets`. Zum Testen `?zone=<name>` an die Adresse hängen.

## Gegner ändern

- Werte eines Gegnertyps (Leben, Angriff, Tempo …) und ihr Zuwachs pro Stufe:
  `src/data/enemies.ts`. Sein Bild steht dort als Name (`sprite`); die Bilder selbst
  verzeichnet `src/data/sprites.ts`.
- Welche Gegner mit welcher Stufe auf welcher Lichtung stehen: Liste `enemyGroups`
  im Bauplan der Zone (`tools/zones/<zone>.mjs`), danach `npm run assets`.
- Feste Elite-Plätze (z. B. die Brutmutter): `NAMED_ELITES` in `src/data/elites.ts`.
- Eine neue Figur aus den Packs in `assets-src/`: in `tools/lib/creatures.mjs` eintragen,
  `npm run assets`, dann in `src/data/sprites.ts` aufnehmen.

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
- Dorfausbau (Kosten und Boni der Gebäude): `src/data/town.ts`.
- Wo der Händler steht: Eintrag `haendler` in der Liste `pois` in `tools/zones/gruenwald.mjs`, danach `npm run assets`.

## Truhen ändern

- Inhalt (Gold, Anzahl Items, Seltenheiten) und Zeit bis zum Auffüllen: `CHEST` in `src/data/pois.ts`.
- Wo Truhen stehen und welches Itemlevel sie haben: Liste `pois` im Bauplan der Zone.
