# CLAUDE.md

Solo-Browser-RPG mit Phaser 3, Vite und TypeScript. Konzept, Fahrplan und alle
Entscheidungen stehen in [GAME.md](GAME.md) – vor jeder Aufgabe lesen.

## Regeln

1. **Balancing-Werte gehören in Config-Dateien.** Schaden, EP, Drop-Raten, Leben,
   Abklingzeiten usw. stehen nie verteilt im Code, sondern hier:
   - `src/config.ts` – allgemeine Stellschrauben (Tempo, Reichweiten, Rüstungsformel, Respawn-Zeiten, Treffer-Feedback)
   - `src/data/warrior.ts` – Werte, Zuwachs pro Stufe und Skills des Kriegers
     (Auslöse-Bedingung `trigger` und Wirkung `effect` je Skill)
   - `src/data/enemies.ts` – Gegnertypen und ihr Zuwachs pro Stufe
   - `src/data/elites.ts` – Elite-Chance, Werte je Rang (normal, Elite, Boss) und Elite-Eigenschaften
   - `src/data/progression.ts` – Levelkurve, EP pro Gegner (auch je Rang), EP- und Gold-Verlust beim Tod
   - `src/data/items.ts` – Seltenheiten, Basis-Items und Affixe (Wertespannen, erlaubte Plätze)
   - `src/data/loot.ts` – Drop-Tabellen je Gegnerrang (Drop-Chance, Seltenheits-Anteile), Gold pro Gegner, Inventargröße
   - `src/data/stats.ts` – Werte auf Items und was ein Attributpunkt bringt
   - `tools/build-map.mjs` (Liste `ENEMY_GROUPS`) – welche Gegner mit welcher Stufe wo stehen;
     nach Änderungen `npm run assets`

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
| `npm run assets` | Tilesets und Karte neu erzeugen (nach Änderungen in `tools/`) |

## Konventionen

- Kampf: Skills lösen automatisch aus, es gibt keine Skill-Tasten. Der Skill-Balken ist reine Anzeige.
  Der Krieger hat kein Mana – Skills hängen nur an Bedingung und Abklingzeit.
- Loot: Items sind einfache Daten (`Item` in `src/items/generator.ts`), damit sie sich später speichern lassen.
- Sprache: Texte im Spiel, Kommentare und Doku auf Deutsch.
- UI (Balken, Skill-Leiste, Schadenszahlen, Inventar-Fenster) ist HTML/CSS über dem Canvas:
  `index.html`, `src/ui/hud.css`, `src/ui/Hud.ts`, `src/ui/InventoryWindow.ts`, `src/ui/Nameplates.ts`.
- Einstellungen des Spielers liegen in einem Objekt (`Settings` in `src/ui/settings.ts`, dort auch
  Standardwerte und Regler-Grenzen). Menü: `src/ui/SettingsMenu.ts`, Anwenden und Verschieben: `src/ui/HudLayout.ts`.
- `public/assets/` wird erzeugt – nicht von Hand ändern.
- Die Versionsnummer in `package.json` folgt den Meilensteinen (Meilenstein 4 = 0.4.0).
- Der Nutzer ist Programmier-Anfänger: Code knapp kommentieren, verständlich halten.
