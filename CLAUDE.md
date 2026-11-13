# CLAUDE.md

**Rogoi Offline** – Solo-Browser-RPG mit Phaser 3, Vite und TypeScript. Konzept, Fahrplan und alle
Entscheidungen stehen in [GAME.md](GAME.md) – vor jeder Aufgabe lesen.

## Regeln

1. **Balancing-Werte gehören in Config-Dateien.** Schaden, EP, Drop-Raten, Leben,
   Abklingzeiten usw. stehen nie verteilt im Code, sondern hier:
   - `src/config.ts` – allgemeine Stellschrauben (Tempo, Reichweiten, Rüstungsformel, Respawn-Zeiten, Treffer-Feedback)
   - `src/data/warrior.ts` – Werte, Zuwachs pro Stufe und Skills des Kriegers
     (Auslöse-Bedingung `trigger` und Wirkung `effect` je Skill)
   - `src/data/enemies.ts` – Gegnertypen (mit `sprite` = Name ihres Bildes) und ihr Zuwachs pro Stufe
   - `src/data/elites.ts` – Elite-Chance, Werte je Rang (normal, Elite, Boss), Elite-Eigenschaften,
     feste Elite-Plätze (`NAMED_ELITES`) und ihr Respawn
   - `src/data/zones.ts` – Zonen: Name, Stufenbereich, Tileset, Hintergrundfarbe, Aufwach-Punkt nach dem Tod
   - `src/data/sprites.ts` – Bilder-Verzeichnis: Name → Bild-Datei und Einzelbilder (Stehen, Laufen)
   - `src/data/pois.ts` – Truhen (Inhalt, Auffüllzeit) und Übergänge zwischen Zonen
   - `src/data/progression.ts` – Levelkurve, EP pro Gegner (auch je Rang), EP- und Gold-Verlust beim Tod
   - `src/data/regen.ts` – passive Lebensregeneration: Sperre nach dem Kampf, Tempo beim Laufen und beim Rasten
   - `src/data/items.ts` – Seltenheiten, Basis-Items und Affixe (Wertespannen, erlaubte Plätze)
   - `src/data/loot.ts` – Drop-Tabellen je Gegnerrang (Drop-Chance, Seltenheits-Anteile), Gold pro Gegner, Inventargröße
   - `src/data/stats.ts` – Werte auf Items und was ein Attributpunkt bringt
   - `src/data/shop.ts` – Händler: Preisformel, Sortiment (Größe, Seltenheiten, Lieferzeit), Rückkauf (Größe der Liste), Heiltrank
   - `src/data/difficulty.ts` – Schwierigkeit: Grenzen der Regler, die vier Knöpfe, Belohnung (EP und Gold)
   - `src/data/minimap.ts` – Minimap: Größe, Ausschnitt, Farben der Punkte
   - `src/data/save.ts` – Speichern: Format-Nummer, Anzahl Slots, Auto-Save-Abstände, Namenslänge
   - `src/data/testSaves.ts` – Vorlagen für Test-Spielstände
   - `tools/zones/<zone>.mjs` – Bauplan je Zone: Lichtungen, Wege, Bauten, besondere Orte (`pois`:
     Händler, Truhen mit Itemlevel, Übergänge, feste Elite-Plätze) und welche Gegner mit welcher
     Stufe wo stehen (`enemyGroups`); nach Änderungen `npm run assets`

   Neue Werte kommen in die passende Datei oder in eine neue Datei unter `src/data/`.
2. **Nach jedem Feature muss `npm run build` fehlerfrei durchlaufen.**
3. **Nach jedem Schritt (Meilenstein) einen PR nach `main` aufmachen und stoppen.**
   Nicht von selbst mit dem nächsten Schritt weitermachen.
4. **GAME.md aktuell halten:** erledigte Schritte abhaken, Entscheidungen und neue
   Werte eintragen, Offene Punkte pflegen.
5. **Effizient testen:** Build prüfen und ein kurzer Check reichen. Keine großen
   Testreihen und nicht viele Screenshots – das Spielgefühl testet der Nutzer selbst.

## Befehle

| Befehl | Zweck |
|---|---|
| `npm run dev` | Spiel lokal starten |
| `npm run build` | TypeScript prüfen und nach `dist/` bauen |
| `npm run assets` | Tilesets, Figuren-Bilder und alle Karten neu erzeugen (nach Änderungen in `tools/`); prüft dabei die Baupläne |

## Konventionen

- Kampf: Skills lösen automatisch aus, es gibt keine Skill-Tasten. Der Skill-Balken ist reine Anzeige.
  Der Krieger hat kein Mana – Skills hängen nur an Bedingung und Abklingzeit.
- Zonen: Zu sehen ist immer genau eine. `enterZone` / `leaveZone` in `src/scenes/WorldScene.ts` bauen sie
  aus ihrer Karte auf und räumen sie weg; Figur, HUD, Inventar und Kampf bleiben bestehen. Was ein
  besonderer Ort (POI) im Spiel tut, steht dort in `buildPoi` (Art → Verhalten). Eine neue Zone braucht
  einen Bauplan (`tools/zones/`), einen Eintrag in `src/data/zones.ts` und `npm run assets` – Code nur,
  wenn sie etwas Neues *kann* (neue Gelände-Art in `tools/lib/terrain-*.mjs`, neue POI-Art).
- Bilder: Figuren nennen ihr Bild beim Namen (`src/data/sprites.ts`). Neue Figuren aus den Packs kommen
  über `tools/lib/creatures.mjs` nach `public/assets/sprites/creatures.png`. Item-, Skill- und
  Trank-Symbole bleiben Bild-Nummern in `characters.png` (sie werden auch im HTML-HUD gezeigt).
- Loot: Items sind einfache Daten (`Item` in `src/items/generator.ts`), damit sie sich später speichern lassen.
- Sprache: Texte im Spiel, Kommentare und Doku auf Deutsch.
- UI (Balken, Skill-Leiste, Schadenszahlen, Inventar-Fenster, Minimap) ist HTML/CSS über dem Canvas:
  `index.html`, `src/ui/hud.css`, `src/ui/Hud.ts`, `src/ui/InventoryWindow.ts`, `src/ui/Nameplates.ts`,
  `src/ui/Minimap.ts`.
- Einstellungen des Spielers liegen in einem Objekt (`Settings` in `src/ui/settings.ts`, dort auch
  Standardwerte und Regler-Grenzen). Sie sind global (Browser), nicht Teil des Spielstands.
  Ausnahme: Die Schwierigkeit (`Difficulty` in `src/data/difficulty.ts`) steht im Spielstand (pro Slot); ihre Regler
  sitzen im selben Menü, eingerechnet wird sie beim Erscheinen eines Gegners (`Enemy.rollRank`). Menü: `src/ui/SettingsMenu.ts`, Anwenden und Verschieben: `src/ui/HudLayout.ts`.
- Speichern: Aufbau des Spielstands, Prüfen und Umbau alter Formate in `src/save/saveGame.ts`,
  Slots im Browser und der laufende Spielstand (`session`) in `src/save/slots.ts`, Menü in
  `src/ui/SaveMenu.ts`, Dialoge in `src/ui/dialog.ts`. Übernehmen und Einsammeln des Stands:
  `applySave` / `snapshot` in `src/scenes/WorldScene.ts`. Kommt etwas Neues dazu, das gespeichert
  werden soll: dort ergänzen. Ändert sich der Aufbau: `SAVE_VERSION` erhöhen und in `MIGRATIONS` eintragen.
- Händler: Regeln in `src/items/Shop.ts`, Fenster in `src/ui/ShopWindow.ts`, Figur in
  `src/entities/Merchant.ts`; verkauft wird per Rechtsklick im Inventar-Fenster,
  zurückgekauft im Reiter „Rückkauf" des Händler-Fensters. Der Item-Tooltip
  (`src/ui/ItemTooltip.ts`) gehört beiden Fenstern.
- Name: Das Spiel heißt „Rogoi Offline" (`GAME_TITLE` in `src/config.ts`). Repo-Name, `name` in
  `package.json`, `base` in `vite.config.ts`, die Schlüssel im Browser-Speicher (`mein-rpg.…`) und
  das Kennzeichen `app: 'mein-rpg'` im Spielstand bleiben, wie sie sind – sonst bricht die
  Pages-Adresse oder alte Spielstände gehen verloren.
- Die Test-Parameter `?stufe`, `?beute`, `?elite`, `?zone` starten einen Testlauf, der nie gespeichert wird.
- `public/assets/` wird erzeugt – nicht von Hand ändern. `assets-src/` enthält die unveränderten
  Original-Packs (entpackt, dazu die hochgeladenen ZIPs) – dort ebenfalls nichts ändern.
- Die Versionsnummer in `package.json` folgt den Meilensteinen (Meilenstein 4 = 0.4.0).
- Der Nutzer ist Programmier-Anfänger: Code knapp kommentieren, verständlich halten.
