# GAME.md – Design-Dokument

Solo-Browser-RPG im MMO-Stil. Kein Multiplayer. Ziel: wochenlange Motivation durch
Leveln, zufälliges Loot und Elite-Jagd.

Legende: **Entschieden** = von dir im Interview festgelegt. **Vorschlag** = von mir
ergänzt, damit das Konzept vollständig ist – kannst du jederzeit ändern.

---

## 1. Technik & Rahmen

| Thema | Festlegung | Status |
|---|---|---|
| Engine | Phaser 3 | Entschieden |
| Build | Vite + TypeScript | Entschieden |
| Hosting | GitHub Pages (statisch, kein Server) | Entschieden |
| Multiplayer | Nein | Entschieden |
| Sprache im Spiel | Deutsch (UI, Itemnamen, Quests) | Entschieden |
| Deploy | GitHub Action baut und veröffentlicht bei Push auf `main` | Vorschlag |
| UI-Fenster (Inventar, Tooltips, Talente) | Als HTML/CSS über dem Spiel-Canvas statt in Phaser gezeichnet – Text bleibt scharf, Tooltips sind viel einfacher | Vorschlag |
| Karten | Tilemaps im Tiled-Format (JSON) | Vorschlag |

## 2. Eingabe & Steuerung

- **Gerät:** PC mit Maus + Tastatur. Kein Touch, kein Handy-Layout. *(Entschieden)*
- **Bewegung:** Klick auf den Boden = hinlaufen (Wegfindung um Hindernisse). *(Entschieden)*
- **Angriff:** Klick auf Gegner = als Ziel wählen, hinlaufen, automatisch angreifen. *(Entschieden)*
- **Skills:** Tasten `1`–`6`. *(Vorschlag)*
- **Fenster:** `I` Inventar, `C` Charakter, `T` Talente, `Esc` schließen/Menü. *(Vorschlag)*
- **Tränke:** `Q` Heiltrank, `E` Manatrank. *(Vorschlag)*

## 3. Perspektive & Grafik

- Top-down Pixel-Art. *(Entschieden)*
- Freie Asset-Packs mit CC0-Lizenz; Quelle und Lizenz jedes Packs werden in
  `CREDITS.md` dokumentiert. *(Entschieden)*
- 16×16-Tiles, ganzzahlig hochskaliert (×3 oder ×4), damit Pixel scharf bleiben. *(Vorschlag)*
- Welche Packs genau: wird beim Setup ausgesucht und geprüft (Kandidaten z. B. Kenney). *(offen)*

## 4. Kampfsystem

- **Stil:** Ziel anwählen + Auto-Angriff + Skills mit Cooldowns (klassisches MMO). *(Entschieden)*
- **Ressource:** Mana + Cooldowns. Mana regeneriert sich, schneller außerhalb des Kampfes. *(Entschieden)*
- **Tod:** Respawn in der Stadt mit kleinem Gold-/EP-Verlust, kein Itemverlust. *(Entschieden)*
  - Konkret: 5 % Gold und 5 % der EP des aktuellen Levels, nie Levelverlust. *(Vorschlag)*
- **Gegner-Verhalten:** Aggro-Radius, verfolgen, zurücklaufen bei zu großer Entfernung
  (Leash), Respawn nach Timer. *(Vorschlag)*
- **Schadensformel:** Angriffskraft gegen Rüstung, Krit-Chance, Schadenszahlen über dem Ziel. *(Vorschlag)*

## 5. Klassen

- Langfristig 4+ Klassen. *(Entschieden)*
- **V1: Krieger** (Nahkampf, robust). *(Entschieden)*
- Geplant danach: Magier, Waldläufer, Schurke; evtl. eine fünfte (Priester/Paladin). *(Vorschlag)*

Krieger-Skills für V1 *(Vorschlag)*:

| Skill | Wirkung |
|---|---|
| Wuchtschlag | Starker Einzelschlag, kurzer Cooldown |
| Rundumschlag | Schaden an allen Gegnern in Nahkampfreichweite |
| Kriegsschrei | Kurzzeitig mehr Angriffskraft |
| Schildwall | Kurzzeitig stark reduzierter Schaden, langer Cooldown |

## 6. Progression

- **Maximallevel 60**, bewusst langsam – mehrere Wochen. *(Entschieden)*
- **Talentbaum** als einziges Auswahlsystem beim Leveln. *(Entschieden)*
- Grundwerte (Leben, Mana, Stärke …) steigen pro Level automatisch – keine frei
  verteilbaren Attributpunkte. *(folgt aus deiner Auswahl)*
- 1 Talentpunkt pro Level ab Level 2 (59 Punkte auf 60). *(Vorschlag)*
- Pro Klasse 3 Bäume (Krieger z. B. Waffen / Wut / Schutz) mit passiven Boni und
  Skill-Verbesserungen. *(Vorschlag)*
- Aktive Skills werden auf festen Stufen freigeschaltet, der Talentbaum verbessert sie.
  *(Vorschlag – du hattest „Skills per Level" nicht angekreuzt, aber irgendwoher müssen
  die Skills kommen. Alternative: Skills komplett im Talentbaum freischalten.)*
- Talente gegen Gold zurücksetzbar. *(Vorschlag)*
- Zieltempo: ca. 40–60 Spielstunden bis Level 60. *(Vorschlag, wird durch Balancing eingestellt)*

Attribute *(Vorschlag)*: Stärke, Geschick, Intelligenz, Ausdauer. Daraus abgeleitet:
Leben, Mana, Angriffskraft, Rüstung, Krit-Chance, Krit-Schaden, Angriffstempo,
Lebens-/Manaregeneration.

## 7. Loot

- **Affix-System im Diablo-Stil:** Basis-Item + zufällige Prä-/Suffixe mit gewürfelten
  Werten. *(Entschieden)*
- **6 Seltenheiten:** Gewöhnlich, Ungewöhnlich, Selten, Episch, Legendär, Mythisch. *(Entschieden)*
- **Händler + Gold:** Items verkaufen, Tränke und Basis-Ausrüstung kaufen. *(Entschieden)*
- **Aufwerten:** Items mit Material/Gold auf +1, +2 … verstärken. *(Entschieden)*
  - Obergrenze (+9?) und ob es ein Fehlschlag-Risiko gibt: *(offen)*
- Kein Crafting, kein Neu-Würfeln einzelner Affixe. *(Entschieden – nicht gewählt)*

Seltenheiten *(Farben entschieden, Zahlen Vorschlag – Startwerte fürs Balancing)*:

| Seltenheit | Farbe | Affixe | Drop-Anteil (normaler Gegner) |
|---|---|---|---|
| Gewöhnlich | Weiß | 0 | 60 % |
| Ungewöhnlich | Grün | 1 | 28 % |
| Selten | Blau | 2 | 9 % |
| Episch | Lila | 3 | 2,5 % |
| Legendär | Orange | 4 | 0,45 % |
| Mythisch | Rot | 5 | 0,05 % |

Weitere Regeln *(Vorschlag)*:

- **Itemlevel = Level des Gegners.** Affix-Wertebereiche wachsen mit dem Itemlevel.
- Jeder Affix würfelt innerhalb einer Spanne (z. B. +12–18 Stärke). Der Tooltip zeigt,
  wie gut der Wurf war – auch ein Legendäres kann schlecht gerollt sein, das hält die
  Jagd am Leben.
- Ausrüstungsplätze: Waffe, Schild, Helm, Brust, Handschuhe, Stiefel, Amulett, 2 Ringe.
- Tooltip mit direktem Vergleich zum angelegten Item.
- Deutsche Itemnamen brauchen das grammatische Geschlecht pro Basis-Item
  („Scharfes Schwert", „Scharfe Axt", „Scharfer Dolch") – der Namensgenerator muss das können.
- Begrenztes Inventar (z. B. 40 Plätze), damit Händlerbesuche einen Sinn haben.

## 8. Elite-Gegner

- Normale Gegner spawnen mit kleiner Chance als Elite mit 1–3 zufälligen Eigenschaften,
  mehr Leben und deutlich besserem Loot. *(Entschieden)*
- Startwerte *(Vorschlag)*: 5 % Elite-Chance, 3× Leben, höhere Seltenheits-Chancen,
  garantiert mindestens 1 Item.
- Erste Elite-Eigenschaften *(Vorschlag)*: Schnell, Gepanzert, Vampirisch, Explosiv
  (Schaden beim Tod), Rasend (stärker bei wenig Leben), Regenerierend.
- Elites sind optisch erkennbar (Färbung/Aura + Name mit Eigenschaften).

## 9. Welt & Setting

- **Klassische Fantasy:** Wälder, Burgen, Orks, Untote, Drachen. *(Entschieden)*
- **Aufbau:** eine sichere Stadt als Hub, drumherum Zonen mit Levelbereich,
  Übergänge per Kartenrand/Portal. *(Entschieden)*
- **Quests:** einfache Töte-/Sammle-/Boss-Quests von NPCs mit EP, Gold und Item als
  Belohnung, wenig Text, keine durchgehende Story. *(Entschieden)*

Zonen-Skizze *(Vorschlag)*:

| Zone | Level | Gegner |
|---|---|---|
| Stadt (Hub) | – | Händler, Schmied, Questgeber |
| Grünwald | 1–10 | Wölfe, Wildschweine, Goblins |
| Orkhügel | 10–20 | Orks, Schamanen |
| Sumpf / Friedhof | 20–35 | Untote |
| Burgruine | 35–50 | Ritter-Geister, Dämonen |
| Drachenberge | 50–60 | Drachlinge, Drache als Weltboss |

## 10. Endgame

- **Endlos-Turm:** immer schwerere Ebenen, steigende Loot-Qualität, persönlicher Rekord. *(Entschieden)*
- **Weltbosse + Elite-Jagd:** seltene Spawns in den Zonen mit Respawn-Timer und
  besonders guten Drops. *(Entschieden)*
- Keine Dungeons, keine Paragon-Level. *(Entschieden – nicht gewählt)*

## 11. Speichern

- Auto-Save im Browser (`localStorage`). *(Entschieden)*
- Spielstand als Datei exportieren und wieder importieren (Schutz vor gelöschten
  Browserdaten, Gerätewechsel). *(Entschieden)*
- Spielstand bekommt eine Versionsnummer, damit alte Stände nach Updates noch laden. *(Vorschlag)*
- Auto-Save bei Levelaufstieg, Item-Aufnahme, Zonenwechsel und alle 30 Sekunden. *(Vorschlag)*
- Vorerst 1 Charakter; mehrere Slots kommen mit der zweiten Klasse. *(Vorschlag)*

---

## 12. Plan für Version 1

**Umfang:** Stadt-Ecke + Zone Grünwald (Lvl 1–10), Krieger, Kampf, Leveln, Loot mit
Elites, Speichern. Ziel: 2–3 Stunden Spielzeit, die sich schon nach dem fertigen Spiel anfühlen.

| # | Meilenstein | Inhalt | Fertig, wenn … |
|---|---|---|---|
| 1 | Setup + Deploy | Vite + TS + Phaser, GitHub-Pages-Action, leere Szene | die Seite unter der Pages-URL lädt |
| 2 | Karte + Bewegung | Tilemap Grünwald, Kollision, Klick-Laufen mit Wegfindung, Kamera folgt | man um Bäume herum durch die Zone laufen kann |
| 3 | Kampf | Ziel wählen, Auto-Angriff, 3 Gegnertypen mit Aggro/Leash/Respawn, Leben/Mana-Balken, 4 Krieger-Skills, Tod + Respawn | man Gegner töten und sterben kann |
| 4 | Leveln | EP, Levelkurve 1–10, Wertezuwachs, Skill-Freischaltung auf festen Stufen | Level 10 erreichbar ist und sich stärker anfühlt |
| 5 | Loot | Item-Generator (Affixe, 6 Seltenheiten, Itemlevel), Drops, Inventar, Ausrüstung, Tooltip mit Vergleich | ein Fund die Werte sichtbar verbessert |
| 6 | Elites | Zufällige Elite-Spawns mit 1–3 Eigenschaften und besserem Loot | Elites erkennbar gefährlicher und lohnender sind |
| 7 | Speichern | Auto-Save, Export/Import, Versionsnummer | Seite neu laden nichts verliert |
| 8 | Händler + Feinschliff | 1 Händler (verkaufen, Tränke kaufen), Balancing, `CREDITS.md` | Gold und volles Inventar einen Zweck haben |

**Bewusst nicht in V1:** Talentbaum, Aufwerten, Quests, weitere Zonen und Klassen,
Endlos-Turm, Weltbosse, Sound.

Der Talentbaum ist das Erste nach V1 – bei nur 10 Leveln und 9 Punkten trägt er noch
nicht, und er hängt an Skills und Balancing, die erst nach V1 stehen.

**Reihenfolge nach V1** *(Vorschlag)*: Talentbaum → Quests + Stadt ausbauen → Aufwerten
(Schmied) → Zone 2 → zweite Klasse + Charakter-Slots → Weltbosse → Endlos-Turm.

## 13. Offene Punkte

1. Aufwerten: Obergrenze und Fehlschlag-Risiko (ja/nein, Item zerstörbar oder nur Stufe runter)?
2. Skills: auf festen Stufen freischalten (Vorschlag) oder komplett über den Talentbaum?
3. Händler schon in V1 (Vorschlag) oder später?
4. Karten: Baue ich die Zonen, oder willst du sie selbst im Tiled-Editor zeichnen?
