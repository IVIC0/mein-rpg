# CLAUDE.md

Solo-Browser-RPG mit Phaser 3, Vite und TypeScript. Konzept, Fahrplan und alle
Entscheidungen stehen in [GAME.md](GAME.md) – vor jeder Aufgabe lesen.

## Regeln

1. **Balancing-Werte gehören in Config-Dateien.** Schaden, EP, Drop-Raten, Leben,
   Abklingzeiten usw. stehen nie verteilt im Code, sondern hier:
   - `src/config.ts` – allgemeine Stellschrauben (Tempo, Reichweiten, Respawn-Zeiten, Treffer-Feedback)
   - `src/data/warrior.ts` – Werte, Zuwachs pro Stufe und Skills des Kriegers
     (Auslöse-Bedingung `trigger` und Wirkung `effect` je Skill)
   - `src/data/enemies.ts` – Gegnertypen und ihr Zuwachs pro Stufe
   - `src/data/progression.ts` – Levelkurve, EP pro Gegner, EP-Verlust beim Tod
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
- Sprache: Texte im Spiel, Kommentare und Doku auf Deutsch.
- UI (Balken, Skill-Leiste, Schadenszahlen) ist HTML/CSS über dem Canvas:
  `index.html`, `src/ui/hud.css`, `src/ui/Hud.ts`.
- `public/assets/` wird erzeugt – nicht von Hand ändern.
- Die Versionsnummer in `package.json` folgt den Meilensteinen (Meilenstein 4 = 0.4.0).
- Der Nutzer ist Programmier-Anfänger: Code knapp kommentieren, verständlich halten.
