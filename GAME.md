# GAME.md – Design-Dokument für „Rogoi Offline"

**Rogoi Offline** ist ein Solo-Browser-RPG im MMO-Stil. Kein Multiplayer. Ziel: wochenlange Motivation durch
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
| Name | „Rogoi Offline" (steht als `GAME_TITLE` in `src/config.ts`). Repo, `package.json`, Pages-Adresse und die Schlüssel im Browser-Speicher heißen aus technischen Gründen weiter `mein-rpg` – nicht umbenennen, sonst gehen Spielstände verloren | Entschieden |
| Deploy | GitHub Action baut und veröffentlicht bei Push auf `main` | Vorschlag |
| UI-Fenster (Inventar, Tooltips, Talente) | Als HTML/CSS über dem Spiel-Canvas statt in Phaser gezeichnet – Text bleibt scharf, Tooltips sind viel einfacher | Vorschlag |
| Karten | Tilemaps im Tiled-Format (JSON), Zonen werden von Claude gebaut | Entschieden |

## 2. Eingabe & Steuerung

- **Gerät:** PC mit Maus + Tastatur. Kein Touch, kein Handy-Layout. *(Entschieden)*
- **Bewegung** mit der linken Maustaste *(Umgesetzt)*:
  - Klick auf begehbaren Boden = hinlaufen, mit Wegfindung um Hindernisse.
  - Klick auf eine nicht begehbare Stelle (Baum, Haus …) = keine Bewegung, dort
    erscheint für etwa 0,5 Sekunden ein rotes X. Ein laufender Weg wird nicht abgebrochen.
  - Maustaste gedrückt halten = Figur läuft ohne Wegfindung direkt Richtung Mauszeiger
    und folgt ihm. Hindernisse blockieren, die Figur rutscht aber an ihnen entlang und
    umrundet kleine Ecken von selbst (wie in Diablo). Loslassen = stehen bleiben.
  - Als „halten" gilt ein Mausdruck ab 0,25 Sekunden (`HOLD_DELAY_MS` in `src/config.ts`).
- **Angriff:** Klick auf Gegner = als Ziel wählen, hinlaufen, automatisch angreifen. *(Umgesetzt)*
  - Über einem Gegner wird der Mauszeiger zur Hand; das Ziel bekommt einen roten Ring.
  - Klick auf den Boden = weglaufen. Das Ziel bleibt angewählt, die Figur schlägt weiter
    zu, solange es in Reichweite steht. `Esc` hebt die Zielauswahl auf.
  - Wird die Figur ohne Ziel angegriffen, wählt sie den Angreifer von selbst an. Stirbt
    das Ziel, wechselt sie zum nächsten Angreifer.
- **Skills:** lösen automatisch aus, es gibt keine Skill-Tasten. Die Tasten `1`–`6`
  entfallen. *(Entschieden, umgesetzt – siehe Abschnitt 4 und 5)*
- **Fenster:** `I` oder `C` öffnet „Charakter & Inventar" (ein gemeinsames Fenster), `Esc`
  schließt es. *(Umgesetzt)*
  - Das Fenster lässt sich an der Titelzeile verschieben und an der Ecke unten rechts in der
    Größe ziehen (bei breiterem Fenster passen mehr Inventar-Felder in eine Zeile, bei zu
    kleinem wird gescrollt).
  - Pinnnadel in der Titelzeile = anpinnen: Das Fenster bleibt offen, `Esc` hebt dann nur die
    Zielauswahl auf, und nach dem Neuladen ist es wieder da. `I`, `C` und × schließen es weiterhin.
    Der Kampf läuft bei offenem Fenster immer weiter.
  - Position, Größe und Pin merkt sich der Browser (`localStorage`, getrennt vom Spielstand).
- **Knopf-Leiste** oben rechts *(Umgesetzt)*: kleine Knöpfe für Inventar, Spielstände (Diskette,
  Abschnitt 11) und Einstellungen; weitere (Talente, Karte) kommen dort dazu. Was die
  Einstellungen können, steht in Abschnitt 2b.
  `T` Talente kommt mit dem Talentbaum. *(Vorschlag)*
- **Karte:** `M` große Karte. *(Entschieden, geplant – siehe Abschnitt 13)*
- **Tränke:** `Q` trinkt einen Heiltrank. *(Umgesetzt, Abschnitt 7b)* Einen Manatrank gibt es nicht.
- **Händler:** Klick auf den Händler im Dorf = hinlaufen und handeln. *(Umgesetzt, Abschnitt 7b)*

## 2b. HUD und Einstellungen *(Schritt 6b, umgesetzt)*

- **Schild über der eigenen Figur:** Name, Stufe und Lebensbalken wie bei den Gegnern, aber mit
  grünem Namen und grünem Balken (Gegner: rot). Liegt die Figur am Boden, ist es weg. *(Entschieden;
  die Farbe Grün ist ein Startwert.)* Der Name ist seit Meilenstein 7 der eigene Figurenname
  (Abschnitt 11).
- **Einstellungen** (Zahnrad oben rechts): ein schmales Menü mit drei zugeklappten Bereichen,
  dazu „HUD verschieben …", „Fenster zurücksetzen" und „Alles auf Standard".

  | Bereich | Einzeln schaltbar | Regler |
  |---|---|---|
  | Über meiner Figur | Name, Stufe, Leben | Größe, Deckkraft |
  | Über Gegnern | Name (mit Elite-Eigenschaften), Stufe, Leben; „bei allen Gegnern" (aus = nur Ziel, Angreifer, Verletzte) | Größe, Deckkraft |
  | HUD-Elemente | Spielerrahmen, Zielrahmen, Skill-Leiste, Beute-Liste, Schwebende Zahlen (Schaden, Heilung, EP, Skill-Namen) | je Element Größe, Deckkraft |

- **Bearbeitungsmodus** („HUD verschieben …"): Spielerrahmen, Zielrahmen, Skill-Leiste und
  Beute-Liste bekommen einen gestrichelten Rahmen und lassen sich mit der Maus ziehen. Sie bleiben
  immer ganz im Bild. Oben erscheint eine Leiste mit „Plätze zurücksetzen" und „Fertig"; `Esc`
  beendet den Modus. Das Spiel läuft dabei weiter.
- **Alles auf Standard** setzt alle Einstellungen, die Plätze der HUD-Elemente und das
  Inventarfenster zurück.
- **Technik:** Alle Einstellungen liegen in einem einzigen Objekt (`Settings` in
  `src/ui/settings.ts`, nur einfache Werte). Die Einstellungen sind **global**: Sie gelten für
  alle Slots und liegen im Browser, nicht im Spielstand *(Entschieden)*. Der Platz eines Elements ist als
  Verschiebung gegenüber dem Standard-Platz gespeichert, damit z. B. die Skill-Leiste auch bei
  anderer Fenstergröße unten in der Mitte verankert bleibt.

**Startwerte** (von mir gesetzt, in `src/ui/settings.ts`): alles sichtbar, Größe 100 %, Deckkraft
100 %. Regler Größe 60–200 %, Deckkraft 20–100 % (nie 0 – dafür gibt es das Ausblenden), beide in
5-%-Schritten.

**Bewusst anders gebaut als gewünscht:**
- *Minimap:* gibt es noch nicht (Abschnitt 13), also auch keinen Schalter. Kommt sie, wird sie ein
  weiteres HUD-Element mit denselben Reglern.
- *Knopf-Leiste oben rechts:* fest, nicht ausblendbar und nicht verschiebbar – sonst käme man
  nicht mehr an die Einstellungen.
- *Schilder und schwebende Zahlen:* hängen an den Figuren und lassen sich deshalb nicht
  verschieben, nur ein-/ausblenden, skalieren und durchsichtiger machen.
- *Meldungen* (Stufenaufstieg, „Inventar voll", Todes-Bildschirm) sind nicht einstellbar.

## 3. Perspektive & Grafik

- Top-down Pixel-Art. *(Entschieden)*
- Freie Asset-Packs mit CC0-Lizenz; Quelle und Lizenz jedes Packs werden in
  `CREDITS.md` dokumentiert. *(Entschieden)*
- **Packs:** Kenney „Tiny Town" (Landschaft, Gebäude) und „Tiny Dungeon" (Figuren,
  Gegner, Items), beide CC0. *(Umgesetzt)*
- 16×16-Tiles, ganzzahlig hochskaliert, damit Pixel scharf bleiben. Der Zoom richtet
  sich nach der Fenstergröße (×2 bis ×4), sichtbar sind rund 40 × 22 Kacheln. *(Umgesetzt)*
- Das Spielfeld füllt immer das ganze Browserfenster; ein größeres Fenster zeigt
  mehr von der Welt. *(Umgesetzt)*
- Einschränkungen der Packs: keine Lauf-Animationen (Figur hüpft stattdessen leicht)
  und keine Wasser-Kacheln (Grünwald hat deshalb keinen Fluss oder See).

## 4. Kampfsystem

- **Stil:** sehr simpel – Ziel anwählen + Auto-Angriff, die Skills lösen von selbst aus. *(Entschieden, umgesetzt)*
  - Der Auto-Angriff ist unverändert: Ziel anklicken, die Figur läuft hin und schlägt zu.
  - Skills werden nie gedrückt. Jeder Skill hat eine Auslöse-Bedingung (z. B. „jeder
    5. Schlag"); trifft sie zu, löst er aus – sofern er freigeschaltet und abgeklungen ist.
  - Angriffs-Skills (Wuchtschlag, Rundumschlag) ersetzen einen Auto-Angriff: der Schlag
    *wird* zum Skill. Treffen bei einem Schlag beide zu, gewinnt der Wuchtschlag (er steht
    im Skill-Balken weiter vorn).
  - Verstärkungen (Kriegsschrei, Schildwall) lösen sofort aus, wenn ihre Bedingung zutrifft.
  - Der Skill-Balken ist reine Anzeige: Abklingzeit, Schlag-Zähler („3/5"), Aufleuchten
    beim Auslösen, Tooltip mit Bedingung und Wirkung. Über der Figur steigt der Name des
    Skills auf.
  - Bedingungen und Werte stehen pro Skill in `src/data/warrior.ts` (`trigger`, `effect`),
    damit Loot und Talente sie später verbessern können (z. B. jeder 4. statt jeder 5. Schlag).
- **Ressource:** Der Krieger hat **kein Mana**. Skills hängen nur an ihrer Bedingung und
  ihrer Abklingzeit. *(Entschieden, umgesetzt)*
  - Mana-Balken, Manakosten und Manatrank sind gestrichen. Mana kommt eventuell später
    als Ressource des Magiers zurück.
  - Außerhalb des Kampfes kommen 5 % des Lebens pro Sekunde zurück. „Im Kampf" heißt:
    der letzte Treffer (ausgeteilt oder kassiert) ist höchstens 5 Sekunden her.
- **Tod:** Respawn in der Stadt mit kleinem Gold-/EP-Verlust, kein Itemverlust. *(Entschieden)*
  - Umgesetzt: Die Figur bleibt 3 Sekunden liegen und wacht dann mit vollem Leben im Dorf auf.
  - EP-Abzug *(Umgesetzt)*: 5 % der EP, die die aktuelle Stufe braucht – höchstens so viel,
    wie man in der Stufe schon gesammelt hat, also nie Stufenverlust. Der Todes-Bildschirm
    zeigt den Verlust an.
  - Gold-Abzug *(Umgesetzt)*: 5 % des Goldes. Items gehen nie verloren.
- **Gegner-Verhalten** *(Umgesetzt)*:
  - Aggro: Ein Gegner greift an, wenn die Figur in seinem Radius steht (3–4,5 Kacheln je
    nach Typ) und kein Hindernis die Sicht versperrt – oder wenn er getroffen wird.
  - Leash: Entfernt er sich mehr als 11–12 Kacheln von seinem Platz, läuft er zurück,
    ist dabei nicht angreifbar und hat wieder volles Leben.
  - Respawn 30 Sekunden nach dem Tod am selben Platz (Boss: 5 Minuten).
  - Im Leerlauf schlendern Gegner ein paar Schritte um ihren Platz.
- **Schadensformel** *(Umgesetzt)*: Schaden = Angriffskraft × Skill-Faktor × Streuung
  (85–115 %) × (1 − Schadensreduktion), mindestens 1.
  - **Rüstung** *(seit Schritt 5b abgeflacht)*: Schadensreduktion = 75 % × Rüstung / (Rüstung + 100).
    Jeder weitere Punkt bringt weniger, mehr als 75 % geht nie. Gilt für Figur und Gegner.
    Werte: `ARMOR` in `src/config.ts`. Das Charakterfenster zeigt die Reduktion hinter der Rüstung.

    | Rüstung | 10 | 46 | 100 | 150 | 200 | 400 |
    |---|---|---|---|---|---|---|
    | Reduktion neu | 7 % | 24 % | 37,5 % | 45 % | 50 % | 60 % |
    | Reduktion alt (100 / (100 + Rüstung)) | 9 % | 32 % | 50 % | 60 % | 67 % | 80 % |

    Stufe 10: ohne Ausrüstung 46 Rüstung = 24 %, mit fünf Rüstungsteilen (Itemlevel 10, ca. 107
    Rüstung) 39 %, mit zusätzlichen „Gehärtet"-Affixen (ca. 140) 44 %. Volle Ausrüstung senkt
    den erlittenen Schaden damit um rund 20–27 % (vorher 30–39 %).
  Kritische Treffer (Krieger: 5 % Chance) machen 150 %. Ausrüstung erhöht Angriffskraft,
  Rüstung, Krit-Chance und Krit-Schaden (siehe Abschnitt 7).
- **Treffer-Feedback** *(Entschieden, umgesetzt)*:
  - Angriff der Figur: kurzer Ausfallschritt Richtung Ziel und ein sichtbarer Waffenschwung
    (Schwert im Bogen mit heller Spur). Wuchtschlag schwingt weiter aus, Rundumschlag
    einmal im Kreis.
  - Ein getroffener Gegner blitzt kurz weiß auf und bekommt einen kleinen Rückstoß
    (nur Optik, seine Position ändert sich nicht).
  - Schadenszahlen: eigener Schaden weiß-gelb über dem Gegner, kritische Treffer orange
    und größer, erlittener Schaden rot über der eigenen Figur, Heilung grün. Dazu lila
    für erhaltene EP. Alle Zahlen sind groß und haben eine kräftige dunkle
    Umrandung, damit sie auf jedem Untergrund lesbar sind.
- **Nahkampf-Reichweite:** 22 Pixel, also knapp anderthalb Kacheln. *(Umgesetzt)*
- **Krieger auf Stufe 1** *(Umgesetzt)*: 120 Leben, 12 Angriffskraft, 10 Rüstung,
  ein Auto-Angriff alle 1,8 Sekunden. Zuwachs pro Stufe: siehe Abschnitt 6.

Alle Zahlen sind Startwerte fürs Balancing und stehen in `src/config.ts`,
`src/data/warrior.ts`, `src/data/enemies.ts`, `src/data/elites.ts` und `src/data/progression.ts`
(Loot: `src/data/items.ts`, `src/data/loot.ts`, `src/data/stats.ts`).

## 5. Klassen

- Langfristig 4+ Klassen. *(Entschieden)*
- **V1: Krieger** (Nahkampf, robust). *(Entschieden)*
- Geplant danach: Magier, Waldläufer, Schurke; evtl. eine fünfte (Priester/Paladin). *(Vorschlag)*

Krieger-Skills für V1 *(Umgesetzt; Zahlen sind Startwerte fürs Balancing)*:

| Skill | Ab Stufe | Löst aus | Cooldown | Wirkung |
|---|---|---|---|---|
| Wuchtschlag | 1 | jeder 5. Schlag | – | 220 % Schaden auf das Ziel |
| Rundumschlag | 3 | ab 3 angreifenden Gegnern in Reichweite (28 Pixel) | 10 s | 130 % Schaden an allen Gegnern in Reichweite |
| Kriegsschrei | 5 | zu Kampfbeginn | 30 s | 10 Sekunden lang 30 % mehr Angriffskraft |
| Schildwall | 8 | unter 30 % Leben (im Kampf) | 60 s | 8 Sekunden lang 60 % weniger erlittener Schaden |

- Die Bedingungen sind von dir vorgegeben *(Entschieden)*, die Zahlen sind Startwerte fürs Balancing.
- Wuchtschlag: Der Zähler läuft über Kämpfe hinweg weiter und zählt jeden Schlag (auch
  einen Rundumschlag).
- Kriegsschrei: löst mit dem ersten Schlag aus (oder wenn die Figur getroffen wird). Dauert
  ein Kampf länger als die Abklingzeit, löst er im selben Kampf erneut aus. *(Vorschlag)*
- Schildwall: war er beim Unterschreiten noch nicht bereit, löst er aus, sobald er es ist.
- Gesperrte Skills sind im Skill-Balken dunkel und zeigen ihre Stufe. Die Stufen
  (1 / 3 / 5 / 8) sind ein *Vorschlag* und stehen als `unlockLevel` in `src/data/warrior.ts`.

## 6. Progression

- **Maximallevel 60**, bewusst langsam – mehrere Wochen. *(Entschieden)*
- **Talentbaum** als einziges Auswahlsystem beim Leveln. *(Entschieden)*
- Grundwerte (Leben, Angriffskraft, Rüstung …) steigen pro Level automatisch – keine frei
  verteilbaren Attributpunkte. *(folgt aus deiner Auswahl)*
- 1 Talentpunkt pro Level ab Level 2 (59 Punkte auf 60). *(Vorschlag)*
- Pro Klasse 3 Bäume (Krieger z. B. Waffen / Wut / Schutz) mit passiven Boni und
  Skill-Verbesserungen. *(Vorschlag)*
- Aktive Skills werden auf festen Stufen freigeschaltet, der Talentbaum verbessert sie. *(Entschieden)*
- Talente gegen Gold zurücksetzbar. *(Vorschlag)*
- Zieltempo: ca. 40–60 Spielstunden bis Level 60. *(Vorschlag, wird durch Balancing eingestellt)*

Attribute *(Umgesetzt mit dem Loot, Zahlen sind Startwerte)*: Stärke, Ausdauer, Geschick.
Sie kommen von der Ausrüstung und werden umgerechnet: 1 Stärke = 1 Angriffskraft,
1 Ausdauer = 6 Leben, 1 Geschick = 0,5 Prozentpunkte Krit-Chance (`src/data/stats.ts`).
Intelligenz und Mana gibt es beim Krieger nicht – sie kommen eventuell mit dem Magier.

### Leveln in V1: Stufe 1–10 *(Umgesetzt, Zahlen sind Startwerte fürs Balancing)*

- **EP** gibt es für jeden besiegten Gegner: 10 + 5 × Stufe des Gegners (Stufe 1 = 15 EP,
  Stufe 10 = 60 EP). Liegt die Figur 3 / 4 / 5 Stufen über dem Gegner, gibt es nur noch
  75 % / 50 % / 25 %, darüber 10 %. Elite geben das 3-Fache, Bosse das 10-Fache *(Startwert)*.
- **Levelkurve** – ausgelegt auf rund 500 Gegner bzw. 2–3 Stunden bis Stufe 10:

  | Aufstieg auf Stufe | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
  |---|---|---|---|---|---|---|---|---|---|
  | EP nötig | 120 | 300 | 625 | 1050 | 1750 | 2600 | 3600 | 5000 | 6600 |

- **Wertezuwachs pro Stufe** (Krieger): +18 Leben, +3 Angriffskraft, +4 Rüstung.
  Auf Stufe 10 also 282 Leben, 39 Angriffskraft, 46 Rüstung (ohne Ausrüstung).
- **Stufenaufstieg:** Das Leben ist sofort wieder voll, eine Meldung zeigt die neue
  Stufe, den Zuwachs und neu freigeschaltete Skills.
- **Anzeige:** Stufe und EP-Balken im Rahmen oben links. Über jedem Gegner und über der eigenen
  Figur stehen Name, Stufe und Lebensbalken (alles in den Einstellungen schaltbar, siehe Abschnitt 2b).
  Dort und im Zielrahmen ist die Stufe des Gegners rot, wenn er 2 oder mehr Stufen über der Figur liegt, und grau, wenn er nur noch
  verringerte EP bringt.
- Leben, Angriffskraft und Rüstung steigen pro Stufe direkt. Die Attribute (Stärke,
  Ausdauer, Geschick) kommen nur von der Ausrüstung. *(Vorschlag)*
- **Zum Testen:** `?stufe=5` an die Adresse hängen, dann startet die Figur auf Stufe 5.
  `?beute=12` legt 12 gewürfelte Items ins Inventar (jede Seltenheit reihum), `?elite=1`
  macht jeden normalen Gegner zur Elite; alles zusammen: `?stufe=5&beute=12&elite=1`.
  Mit einem dieser Parameter läuft ein **Testlauf**, der nie gespeichert wird und keinen Slot
  berührt (Abschnitt 11). Für Tests, die man weiterspielen will, gibt es die Test-Spielstände.

Alle Werte stehen in `src/data/progression.ts` (Kurve, EP) und `src/data/warrior.ts` (Zuwachs).

## 7. Loot

- **Affix-System im Diablo-Stil:** Basis-Item + zufällige Prä-/Suffixe mit gewürfelten
  Werten. *(Entschieden)*
- **6 Seltenheiten:** Gewöhnlich, Ungewöhnlich, Selten, Episch, Legendär, Mythisch. *(Entschieden)*
- **Händler + Gold:** Items verkaufen, Tränke und Basis-Ausrüstung kaufen. Ein einfacher
  Händler ist schon in V1 dabei. *(Entschieden, umgesetzt – Abschnitt 7b)*
- **Aufwerten:** Items mit Material/Gold bis maximal **+10** verstärken. *(Entschieden)*
  - +1 bis +5: gelingt immer.
  - Ab +6: Fehlschlag-Risiko. Bei Fehlschlag fällt das Item **eine Stufe zurück**,
    es geht nie kaputt. Material/Gold sind in beiden Fällen verbraucht.
  - Erfolgschancen pro Stufe und Kosten: *(Balancing, kommt mit dem Schmied nach V1)*
- Kein Crafting, kein Neu-Würfeln einzelner Affixe. *(Entschieden – nicht gewählt)*

Seltenheiten *(Farben entschieden, Zahlen Vorschlag – Startwerte fürs Balancing)*:

| Seltenheit | Farbe | Affixe |
|---|---|---|
| Gewöhnlich | Weiß | 0 |
| Ungewöhnlich | Grün | 1 |
| Selten | Blau | 2 |
| Episch | Lila | 3 |
| Legendär | Orange | 4 |
| Mythisch | Rot | 5 |

**Drop-Tabelle je Gegnerrang** *(Schritt 5b; `DROP_TABLES` in `src/data/loot.ts`)*: erst wird
gewürfelt, ob ein Item fällt, dann die Seltenheit.

| | Normal | Elite | Boss |
|---|---|---|---|
| **Drop-Chance** | **10 %** | **100 %** | **100 %** |
| Gewöhnlich | 50 % | – | – |
| Ungewöhnlich | 32 % | 45 % | – |
| Selten | 13 % | 37 % | 55 % |
| Episch | 4 % | 14 % | 34 % |
| Legendär | 0,9 % | 3,6 % | 10 % |
| Mythisch | 0,1 % | 0,4 % | 1 % |

- Normaler Gegner, im Schnitt ein Item auf so viele Gegner: irgendeins 10 · Selten 77 ·
  Episch 250 · Legendär 1 111 · Mythisch 10 000. Auf dem Weg zu Stufe 10 (rund 500 Gegner)
  sind das etwa 50 Items: 25 weiße, 16 grüne, 6–7 blaue, 2 lila.
- Vorher (30 %, Anteile 60 / 28 / 9 / 2,5 / 0,45 / 0,05) waren 88 % aller Drops weiß oder grün.
  Bei nur noch 10 % Drop-Chance wäre das zu viel Ausschuss, deshalb sind die Anteile leicht
  nach oben verschoben (jetzt 82 %).
- Elite und Boss nutzen ihre Spalten seit Meilenstein 6 (siehe Abschnitt 8): sie lassen immer
  genau ein Item fallen und geben mehr Gold (Elite ×3, Boss ×10 – *Startwert*).

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

### Loot in V1 *(Umgesetzt, Zahlen sind Startwerte fürs Balancing)*

- **Drops:** Jeder besiegte Gegner gibt Gold (Stufe 1: 2–5, Stufe 10: 11–14) und lässt mit
  10 % Chance ein Item fallen (Elite/Boss: siehe Drop-Tabelle oben). Itemlevel = Stufe des
  Gegners. Die Seltenheit wird nach der Drop-Tabelle gewürfelt.
- **Aufheben:** Das Item liegt mit einem Schein in der Farbe seiner Seltenheit am Boden
  (ab Selten zusätzlich ein Lichtstrahl). Läuft die Figur darüber, wandert es ins Inventar;
  der Name steigt über der Figur auf und steht kurz unten links in der Beute-Liste. Ist das
  Inventar voll, bleibt es liegen. Nach 3 Minuten verschwindet es.
- **Basis-Items** (11 Stück): Schwert, Axt, Dolch (Angriffskraft) · Holzschild, Rundschild,
  Helm, Rüstung, Handschuhe, Stiefel (Rüstung) · Amulett (Leben) · Ring (Angriffskraft).
  Der feste Wert wächst mit dem Itemlevel und streut um ±15 %. Erst wird die Art gewürfelt
  (jede gleich oft), dann das Basis-Item.

  | Basis-Item | Wert | Itemlevel 1 | Itemlevel 10 |
  |---|---|---|---|
  | Schwert, Axt, Dolch | Angriffskraft | 3 | 14 |
  | Holzschild, Rundschild | Rüstung | 4 | 18 |
  | Rüstung (Brust) | Rüstung | 5 | 19 |
  | Helm | Rüstung | 3 | 10 |
  | Handschuhe, Stiefel | Rüstung | 2 | 7 |
  | Amulett | Leben | 8 | 35 |
  | Ring | Angriffskraft | 1 | 4 |

- **Affixe** (9 Stück): Präfixe geben direkte Werte, Suffixe Attribute. Die Spanne wächst
  pro Itemlevel um den angegebenen Anteil; der Wurf landet irgendwo dazwischen.

  | Affix | Wert | Auf | Itemlevel 1 | Itemlevel 10 |
  |---|---|---|---|---|
  | Scharf… | Angriffskraft | Waffe | 1–3 | 3–10 |
  | Gehärtet… | Rüstung | alles außer Waffe | 2–4 | 7–13 |
  | Leicht… | Angriffstempo | Waffe, Handschuhe | 3–5 % | 6–10 % |
  | Tödlich… | Krit-Schaden | Waffe, Handschuhe, Amulett, Ring | 5–10 % | 12–24 % |
  | Blutig… | Lebensraub | Waffe, Amulett, Ring | 1–2 % | 2–4 % |
  | … der Stärke | Stärke | alles | 1–2 | 3–7 |
  | … der Ausdauer | Ausdauer | alles | 1–2 | 3–7 |
  | … des Geschicks | Geschick | alles | 1–2 | 3–7 |
  | … der Erholung | Leben pro Sekunde (auch im Kampf) | alles | 0,3–0,6 | 1,0–2,0 |

  Lebensraub heilt um den Anteil des ausgeteilten Schadens. Angriffstempo verkürzt die Zeit
  zwischen zwei Schlägen (10 % = 1,8 s → 1,64 s).
- **Namen:** [Präfix] Basis [Suffix], z. B. „Scharfes Schwert der Stärke". Das Präfix richtet
  sich nach dem Geschlecht (Scharfer Dolch, Scharfe Axt, Scharfes Schwert, Gehärtete Stiefel).
  Hat ein Item mehrere Präfixe oder Suffixe, steht nur das erste im Namen.
- **Inventar:** 40 Plätze. Linksklick legt ein Item an (das bisher angelegte kommt an seinen
  Platz), Linksklick auf Ausrüstung legt sie ab, Umschalt + Linksklick wirft ein Item weg.
  Ein Ring geht in den freien Ring-Platz; sind beide belegt, ersetzt er Ring 1.
- **Tooltip:** Name in der Farbe der Seltenheit, Itemlevel, jeder Wert mit seiner Spanne
  (so sieht man, wie gut der Wurf war) und der Vergleich mit dem angelegten Item: was beim
  Anlegen dazukommt (grün) und wegfällt (rot), Attribute schon umgerechnet.
- **Charakterwerte** stehen im selben Fenster und ändern sich sofort beim Anlegen. Die
  angelegte Waffe ist auch beim Zuschlagen zu sehen.
- **Symbole:** Waffen und Schilde stammen aus „Tiny Dungeon". Helm, Rüstung, Handschuhe,
  Stiefel, Amulett und Ring fehlen dort und sind selbst gezeichnet (`tools/lib/item-icons.mjs`).

Alle Werte stehen in `src/data/items.ts` (Seltenheiten, Basis-Items, Affixe),
`src/data/loot.ts` (Drop-Tabellen je Gegnerrang, Gold, Inventargröße) und `src/data/stats.ts` (Attribute).

## 7b. Händler *(Meilenstein 8, umgesetzt)*

Von dir vorgegeben *(Entschieden)*: Items verkaufen, Ausrüstung kaufen, Sicherheits-Klick beim
Verkaufen ab Episch, Sortiment und Gold im Spielstand. Der Heiltrank stand schon im Konzept
(Abschnitt 2 und 7). Alle Zahlen und Details unten sind **Startwerte** von mir, alle in
`src/data/shop.ts`.

- **Wo:** Der Händler steht auf dem Dorfplatz rechts oberhalb des Brunnens (Platz in
  `tools/build-map.mjs`, Marker `haendler`). Über ihm steht sein Name in Gold, der Mauszeiger
  wird über ihm zur Hand. Seine Kachel ist ein Hindernis.
- **Handeln:** Klick auf ihn – die Figur läuft hin, das Händler-Fenster geht links auf, das
  Inventar rechts dazu. Entfernt sich die Figur (mehr als 56 Pixel) oder stirbt sie, schließt
  es sich; `Esc` und × ebenfalls. Der Kampf läuft weiter.
- **Kaufen:** Linksklick auf ein Item im Regal. Unter jedem Item steht der Preis (rot = zu teuer).
  Der Tooltip zeigt wie im Inventar die Werte und den Vergleich mit dem angelegten Item.
- **Verkaufen:** Rechtsklick auf ein Item im Inventar, solange der Händler offen ist. Der
  Tooltip zeigt den Erlös. Angelegte Items muss man erst ablegen.
- **Sicherheits-Klick:** Bei Episch, Legendär und Mythisch pulsiert das Feld nach dem ersten
  Rechtsklick rot und der Tooltip fragt nach; erst ein zweiter Rechtsklick innerhalb von
  3 Sekunden verkauft. Maus weg oder Zeit um = abgebrochen.
- Verkauft ist verkauft – einen Rückkauf gibt es nicht (siehe Offene Punkte).

**Preise** – abgeleitet aus Itemlevel und Seltenheit:
Wert = (10 + 6 × Itemlevel) × Faktor der Seltenheit. Kaufen kostet den Wert, Verkaufen bringt 20 %.

| Seltenheit | Faktor | Kauf Itemlevel 1 | Kauf Itemlevel 5 | Kauf Itemlevel 10 | Verkauf Itemlevel 10 |
|---|---|---|---|---|---|
| Gewöhnlich | 1 | 16 | 40 | 70 | 14 |
| Ungewöhnlich | 2,5 | 40 | 100 | 175 | 35 |
| Selten | 6 | 96 | 240 | 420 | 84 |
| Episch | 15 | – | – | – | 210 |
| Legendär | 40 | – | – | – | 560 |
| Mythisch | 100 | – | – | – | 1 400 |

Zum Einordnen: Ein normaler Gegner gibt auf Stufe 5 rund 7, auf Stufe 10 rund 12 Gold. Ein
blaues Item kostet also etwa 30–35 Gegner; als Beute fällt eins im Schnitt alle 77 Gegner.

**Sortiment:** 8 gewürfelte Items auf der Stufe der Figur (Itemlevel = ihre Stufe zum Zeitpunkt
der Lieferung), jede Art gleich oft. Seltenheit: 60 % Gewöhnlich, 32 % Ungewöhnlich, 8 % Selten –
der Händler führt bewusst nur einfache Ware, die besten Stücke gibt es weiter nur als Beute.
Gekauftes ist weg, bis neue Ware kommt: alle **10 Minuten** wird das ganze Regal neu gewürfelt.
Die Uhr läuft in echter Zeit weiter, auch wenn das Spiel zu ist (wie beim Boss). Sortiment und
Lieferzeitpunkt stehen im Spielstand, also pro Slot.

**Heiltrank:** heilt 40 % des maximalen Lebens, 30 Sekunden Abklingzeit, höchstens 5 im Gepäck
(sie belegen keinen Inventar-Platz). Preis = 10 + 4 × Stufe der Figur (Stufe 1: 14, Stufe 5: 30,
Stufe 10: 50 Gold). Der Händler hat immer welche. Der Trank steht als Feld mit Anzahl und
Abklingzeit am Ende der Skill-Leiste; er ist das Einzige dort, das man selbst auslöst (`Q`).
Die Abklingzeit wird nicht gespeichert.

## 8. Elite- und Boss-Gegner

- Normale Gegner spawnen mit kleiner Chance als Elite mit 1–3 zufälligen Eigenschaften,
  mehr Leben und deutlich besserem Loot. *(Entschieden, umgesetzt in Meilenstein 6)*
- Elite und Boss lassen immer ein Item fallen, mit höheren Seltenheiten (Drop-Tabelle in
  Abschnitt 7). *(Entschieden in Schritt 5b)*

Alles Folgende habe ich mir ausgedacht – **Startwerte fürs Balancing**, alle in
`src/data/elites.ts` (Boss-Respawn in `src/config.ts`):

**Elite**
- Jeder normale Gegner wird beim Erscheinen mit **5 %** Chance zur Elite – auch bei jedem
  Respawn wird neu gewürfelt. Bei 31 normalen Gegnern steht im Schnitt 1–2 Elites auf der Karte.
- Anzahl Eigenschaften: 1 (60 %), 2 (30 %), 3 (10 %); jede höchstens einmal.
- EP ×3, Gold ×3.

**Boss:** der **Räuberhauptmann** (Stufe 10) steht fest in der Ruine, hat keine Eigenschaften
und erscheint 5 Minuten nach seinem Tod wieder. EP ×10, Gold ×10. Bosse waren erst nach V1
geplant; dieser eine ist auf deinen Wunsch vorgezogen. Seine Grundwerte sind die des Wegelagerers.

**Werte je Rang** – auf die Werte des Gegnertyps (Abschnitt 9) gerechnet:

| Rang | Leben | Angriff | Rüstung | Größe | Schein |
|---|---|---|---|---|---|
| Normal | ×1 | ×1 | +0 | ×1 | – |
| Elite | ×3 | ×1,25 | +15 | ×1,5 | gold |
| Boss | ×6 | ×1,6 | +30 | ×2 | lila |

Die Rüstung ist ein fester Zuschlag statt eines Faktors, weil die Formel aus 5b (75 % × Rüstung /
(Rüstung + 100)) weitere Punkte immer schwächer wertet – so bleibt der Unterschied spürbar,
ohne dass ein Gegner zur Wand wird. Beispiel Stufe 10:

| Gegner (Stufe 10) | Leben | Angriff | Rüstung | Schadensreduktion |
|---|---|---|---|---|
| Wegelagerer | 179 | 21,2 | 29 | 17 % |
| Wegelagerer, Elite | 537 | 26,4 | 44 | 23 % |
| … mit „Gepanzert" | 537 | 26,4 | 94 | 36 % |
| Räuberhauptmann (Boss) | 1 074 | 33,8 | 59 | 28 % |

Zum Vergleich unten: Riesenratte Stufe 1 als Elite = 90 Leben, 6,3 Angriff, 15 Rüstung (10 %).

Gedachte Auslegung (grob gerechnet, nicht ausgespielt): Eine Elite auf eigener Stufe dauert
etwa dreimal so lang wie ein normaler Gegner und kostet ohne Ausrüstung den Großteil des
Lebens – mit Ausrüstung gut machbar. Der Boss ist ohne Ausrüstung nicht zu schaffen und mit
voller Ausrüstung auf Stufe 10 ein knapper Kampf von rund 30–40 Sekunden.

**Eigenschaften**

| Eigenschaft | Wirkung |
|---|---|
| Schnell | läuft 15 % schneller (bleibt langsamer als die Figur), schlägt 20 % öfter zu |
| Gepanzert | +20 Rüstung, dazu +3 pro Stufe (Stufe 10: +50) |
| Vampirisch | heilt sich um 50 % des ausgeteilten Schadens |
| Explosiv | 1,5 Sekunden nach dem Tod Explosion im Umkreis von 30 Pixeln (knapp 2 Kacheln): ein Treffer mit 250 % Angriff, die eigene Rüstung zählt. Ein roter Kreis warnt – weglaufen hilft |
| Rasend | unter 30 % Leben +50 % Angriff, die Elite färbt sich rot |
| Regenerierend | heilt 1 % des maximalen Lebens pro Sekunde, auch im Kampf |

**Erkennbar** *(Umgesetzt)*: Elite und Boss sind größer und stehen in einem pulsierenden Schein.
Das Namensschild ist größer und farbig (Elite gold mit ★ und den Eigenschaften unter dem Namen,
Boss lila mit ☠), der Lebensbalken breiter. Der Zielrahmen bekommt einen farbigen Rand und eine
Zeile „Elite · Schnell · Gepanzert" bzw. „Boss". Sind die Namensschilder in den Einstellungen
auf „nur Ziel, Angreifer und Verletzte" gestellt, erkennt man Elites von Weitem an Größe und Schein.

## 9. Welt & Setting

- **Klassische Fantasy:** Wälder, Burgen, Orks, Untote, Drachen. *(Entschieden)*
- **Aufbau:** eine sichere Stadt als Hub, drumherum Zonen mit Levelbereich,
  Übergänge per Kartenrand/Portal. *(Entschieden)*
- **Quests:** einfache Töte-/Sammle-/Boss-Quests von NPCs mit EP, Gold und Item als
  Belohnung, wenig Text, keine durchgehende Story. *(Entschieden)*

Zonen-Skizze *(Vorschlag)*:

| Zone | Level | Gegner |
|---|---|---|
| Stadt (Hub) | – | Händler, Schmied, Questgeber (in V1 ein Dorf am Rand von Grünwald) |
| Grünwald | 1–10 | Riesenratten, Waldspinnen, Wegelagerer (ursprünglich geplant: Wölfe, Wildschweine, Goblins – siehe Offene Punkte) |
| Orkhügel | 10–20 | Orks, Schamanen |
| Sumpf / Friedhof | 20–35 | Untote |
| Burgruine | 35–50 | Ritter-Geister, Dämonen |
| Drachenberge | 50–60 | Drachlinge, Drache als Weltboss |

Grünwald, Stand V1 *(Umgesetzt)*: 120 × 90 Kacheln, vom Dorf bis zur Ruine läuft man rund
20 Sekunden. Dorf mit Startpunkt im Südwesten, sechs Lichtungen als Plätze für
Gegnergruppen (Pilzhain, Westlichtung, Große Lichtung, Ostlichtung, Südlichtung,
Ruine im Herbstwald im Nordosten), verbunden durch Erdwege. Die Lichtungen sind in
der Karte als Marker hinterlegt.

Gegner in Grünwald *(Umgesetzt)* – 31 Stück plus ein Boss, je weiter vom Dorf, desto höher die Stufe.
Jeder Gegnertyp hat Grundwerte für Stufe 1; pro Stufe darüber kommen +20 % Leben,
+15 % Angriff und +2 Rüstung dazu *(Vorschlag, Startwerte fürs Balancing)*:

| Gegner | Leben | Angriff | Rüstung | Stufen | Beispiel auf höchster Stufe |
|---|---|---|---|---|---|
| Riesenratte | 30 | 5 | 0 | 1–3 | Stufe 3: 42 Leben, 6,5 Angriff, 4 Rüstung |
| Waldspinne | 45 | 7 | 3 | 2–7 | Stufe 7: 99 Leben, 13,3 Angriff, 15 Rüstung |
| Wegelagerer | 64 | 9 | 11 | 7–10 | Stufe 10: 179 Leben, 21,2 Angriff, 29 Rüstung |

| Lichtung | Gegner (Stufe) |
|---|---|
| Westlichtung | 4 Riesenratten (1) |
| Pilzhain | 3 Riesenratten (1, 2, 2), 3 Waldspinnen (2, 2, 3) |
| Große Lichtung | 4 Riesenratten (3), 3 Waldspinnen (3, 4, 4) |
| Südlichtung | 4 Waldspinnen (5, 5, 5, 6) |
| Ostlichtung | 3 Waldspinnen (6, 6, 7), 2 Wegelagerer (7) |
| Ruine | 5 Wegelagerer (8, 8, 9, 9, 10), Boss Räuberhauptmann (10) – Werte in Abschnitt 8 |

Die Stufen je Lichtung stehen in `tools/build-map.mjs` (Liste `ENEMY_GROUPS`), die
Grundwerte und der Zuwachs in `src/data/enemies.ts`.

Alle Gegner sind etwas langsamer als die Figur – weglaufen geht also immer (auch vor
„schnellen" Elites: die schnellste, eine Riesenratte, kommt auf 71 gegenüber 72 Pixeln pro Sekunde).

## 10. Endgame

- **Endlos-Turm:** immer schwerere Ebenen, steigende Loot-Qualität, persönlicher Rekord. *(Entschieden)*
- **Weltbosse + Elite-Jagd:** seltene Spawns in den Zonen mit Respawn-Timer und
  besonders guten Drops. *(Entschieden)*
- Keine Dungeons, keine Paragon-Level. *(Entschieden – nicht gewählt)*

## 11. Speichern *(Meilenstein 7, umgesetzt)*

Von dir vorgegeben *(Entschieden)*: Speichern im Browser (`localStorage`), automatisch und beim
Neuladen wieder da; mehrere Slots mit Anlegen, Löschen (mit Sicherheitsabfrage) und Umbenennen;
der zuletzt gespielte Slot lädt von selbst; Test-Spielstände aus Vorlagen in einem eigenen Slot;
Export/Import als Datei; Versionsnummer; Namenseingabe pro Slot. Alles, was unten als
**Startwert** markiert ist, habe ich mir dazu ausgedacht.

**Was im Spielstand steht** (`SaveGame` in `src/save/saveGame.ts`):
- Name der Figur, Stufe, EP, aktuelles Leben, Position, Gold, Inventar, Ausrüstung, Heiltränke.
- Items, die am Boden liegen, mit Platz und Liegezeit *(Entschieden, seit Meilenstein 8)*. Die
  3 Minuten bis zum Verschwinden zählen nur Spielzeit – bei geschlossenem Spiel läuft nichts ab.
- Sortiment des Händlers und wann neue Ware kommt (Abschnitt 7b).
- Respawn-Zeitpunkt besiegter Bosse, Spielzeit, Zeitpunkt des letzten Speicherns, Format-Nummer.
- Nicht darin: die Werte der Figur (Leben, Angriffskraft, Rüstung …) – sie ergeben sich aus Stufe
  und Ausrüstung und werden beim Laden neu berechnet, damit Balancing-Änderungen sofort gelten.
- Ebenfalls nicht: die **HUD-Einstellungen** aus Abschnitt 2b. Sie sind global *(Entschieden)*:
  eine Fassung für alle Slots, im Browser gemerkt, nicht im Export. Auch ein Testlauf benutzt
  und ändert sie. Position und Pin des Inventarfensters bleiben wie bisher pro Browser.
  (In Meilenstein 7 lagen die Einstellungen kurz pro Slot im Spielstand. Beim ersten Start mit
  Meilenstein 8 werden die des zuletzt gespielten Slots einmalig als globale übernommen.)

**Was beim Neuladen verloren geht** *(Startwert)*: Abklingzeiten (auch die des Heiltranks) und
Buffs, der Wuchtschlag-Zähler und der Zustand normaler Gegner – sie stehen alle wieder frisch
an ihrem Platz (Elites werden neu gewürfelt). Lag die Figur beim Speichern am Boden, wacht sie mit
vollem Leben im Dorf auf (der Verlust durch den Tod ist dann schon abgezogen).

**Wann gespeichert wird** (Werte in `src/data/save.ts`, *Startwerte*):
- alle 30 Sekunden,
- 1 Sekunde nach einem wichtigen Ereignis: Item fällt zu Boden, aufgehoben, Gold erhalten (also
  nach jedem besiegten Gegner), an-/abgelegt, weggeworfen, gekauft, verkauft, Trank getrunken,
  neue Ware beim Händler, Stufenaufstieg, Tod, Aufwachen, Boss besiegt,
- sofort beim Verlassen, Neuladen oder Wegschalten der Seite und mit „Jetzt speichern".

**Slots:** 3 normale Slots plus 1 Slot „Test" *(Anzahl 3 ist ein Startwert, `SLOT_COUNT`)*.
- Menü „Spielstände" (Diskette oben rechts): je Slot Laden, Umbenennen, Export, Löschen; leere
  Slots haben „Neue Figur …". Der aktive Slot ist gelb umrandet.
- Jeder Slot hat einen eigenen Schlüssel im Browser. Gespeichert wird nur in den Slot, der beim
  Laden der Seite gewählt wurde – ein Slot kann also nie einen anderen überschreiben. Ein
  Slot-Wechsel speichert den laufenden Stand und lädt dann die Seite neu. *(Technik: Startwert)*
- Start des Spiels: Der zuletzt gespielte Slot lädt von selbst. Gibt es noch gar keinen
  Spielstand, fragt das Spiel nach dem Namen und legt Slot 1 an. Wurde der zuletzt gespielte Slot
  gelöscht oder lässt er sich nicht laden, erscheint die Auswahl „Spielstand wählen".
- Löschen fragt immer nach („… wirklich löschen?"), der Abbrechen-Knopf ist vorausgewählt.
- **Name:** höchstens 16 Zeichen, nicht leer *(Startwert)*. Er steht im Schild über der Figur, im
  Spielerrahmen und im Charakterfenster („Name · Krieger") und lässt sich im Menü ändern.

**Test-Spielstände:** Im Menü Vorlage wählen und „Test-Spielstand anlegen". Er landet immer im
Slot „Test" (ersetzt dort ohne Nachfrage den vorigen Test-Spielstand), wird gleich geladen und
speichert wie jeder andere Slot – die normalen Slots bleiben unberührt. Vorlagen stehen in
`src/data/testSaves.ts` (Stufe, Gold, Tränke, Ausrüstung je Platz mit Seltenheit, Inventar als Liste von
Seltenheiten; die Items werden beim Anlegen gewürfelt). *Startwerte:*

| Vorlage | Stufe | Gold | Tränke | Ausrüstung | Inventar |
|---|---|---|---|---|---|
| Stufe 1 – neu | 1 | 0 | 0 | – | leer |
| Stufe 5 – etwas Loot | 5 | 150 | 2 | Waffe und Stiefel grün, Brust und Helm weiß | 6 Items (3 weiß, 2 grün, 1 blau) |
| Stufe 10 – voll ausgerüstet | 10 | 1500 | 5 | alle 9 Plätze: Waffe und Brust lila, Ring 2 grün, Rest blau | 8 Items, jede Seltenheit dabei |

**Test-Parameter in der Adresse** (`?stufe`, `?beute`, `?elite`) *(Startwert)*: Ist einer davon
gesetzt, läuft ein **Testlauf** – eine frische „Testfigur", die in keinem Slot liegt. Es wird
nichts geladen und nichts gespeichert, auch der „zuletzt gespielte Slot" bleibt, wie er ist.
Der Händler hat im Testlauf jedes Mal frische Ware. Im Menü steht ein Hinweis mit „Testlauf beenden" (lädt ohne
die Parameter neu). Auch `?elite=1` allein ist ein Testlauf – sonst könnte man in einem echten
Slot Elite-Beute farmen.

**Export/Import:** „Export" lädt den Slot als Datei herunter (`rogoi-offline-Name-Datum.json`,
derselbe Text wie im Browser). „Importieren …" legt eine Datei in den **ersten freien** normalen
Slot und lädt sie nicht von selbst. Sind alle Slots belegt, gibt es eine Meldung – ein Import
überschreibt nie etwas. *(Startwert)*

**Versionsnummer:** `SAVE_VERSION` in `src/data/save.ts`, aktuell **2**. Ändert sich der Aufbau,
wird sie erhöht und in `MIGRATIONS` (`src/save/saveGame.ts`) eingetragen, wie ein alter Stand ins
neue Format kommt.
- Format 1 (Meilenstein 7) → 2 (Meilenstein 8): Die Einstellungen fallen aus dem Spielstand;
  neu sind Tränke (Start: 0), Items am Boden (Start: keine) und das Händler-Sortiment (Start:
  frische Ware beim ersten Besuch). Alte Spielstände und alte Export-Dateien laden weiter.
- Alter Stand: wird beim Laden Schritt für Schritt umgebaut.
- Stand aus einer **neueren** Spielversion, zu alter Stand ohne Umbau oder kaputte Daten: Der Slot
  wird als „Nicht ladbar: …" mit Grund angezeigt und **nicht angerührt** (man kann ihn noch
  exportieren oder löschen).
- Einzelne unbrauchbare Werte (z. B. ein Item, dessen Basis-Item es nicht mehr gibt) fallen weg
  bzw. werden durch Standardwerte ersetzt, der Rest lädt.

**Boss-Respawn** *(Startwert)*: Im Spielstand steht der Zeitpunkt, zu dem ein besiegter Boss
wiederkommt (Uhrzeit, nicht Restzeit). Neuladen bringt ihn also nicht zurück und setzt die
5 Minuten auch nicht neu an; die Zeit läuft weiter, während das Spiel zu ist. Wer nach dem Sieg
schließt und später wiederkommt, findet ihn wieder vor. Der Timer gilt pro Slot.

---

## 12. Plan für Version 1

**Umfang:** Stadt-Ecke + Zone Grünwald (Lvl 1–10), Krieger, Kampf, Leveln, Loot mit
Elites, Speichern. Ziel: 2–3 Stunden Spielzeit, die sich schon nach dem fertigen Spiel anfühlen.

| # | Meilenstein | Inhalt | Fertig, wenn … |
|---|---|---|---|
| 1 ✅ | Setup + Deploy | Vite + TS + Phaser, GitHub-Pages-Action, leere Szene | die Seite unter der Pages-URL lädt |
| 2 ✅ | Karte + Bewegung | Tilemap Grünwald, Kollision, Klick-Laufen mit Wegfindung, Kamera folgt | man um Bäume herum durch die Zone laufen kann |
| 3 ✅ | Kampf | Ziel wählen, Auto-Angriff, 3 Gegnertypen mit Aggro/Leash/Respawn, Lebensbalken, 4 Krieger-Skills, Tod + Respawn | man Gegner töten und sterben kann |
| 4 ✅ | Leveln | EP, Levelkurve 1–10, Wertezuwachs, Skill-Freischaltung auf festen Stufen | Level 10 erreichbar ist und sich stärker anfühlt |
| 5 ✅ | Loot | Item-Generator (Affixe, 6 Seltenheiten, Itemlevel), Drops, Inventar, Ausrüstung, Tooltip mit Vergleich | ein Fund die Werte sichtbar verbessert |
| 5b ✅ | Feinschliff Loot | Drop-Chance 10 % und Drop-Tabellen je Gegnerrang, Rüstung abgeflacht (max. 75 %), Inventarfenster verschiebbar/anpinnbar, Knopf-Leiste, Namensschilder über Gegnern | Loot seltener, aber wertiger ist und das Fenster beim Kämpfen nicht stört |
| 6 ✅ | Elites | Zufällige Elite-Spawns mit 1–3 Eigenschaften und besserem Loot, dazu ein Boss in der Ruine | Elites erkennbar gefährlicher und lohnender sind |
| 6b ✅ | HUD und Einstellungen | Schild über der eigenen Figur, HUD-Elemente ein-/ausblenden, skalieren, Deckkraft, im Bearbeitungsmodus verschieben, alles zurücksetzen | sich das HUD nach eigenem Geschmack einrichten lässt |
| 7 ✅ | Speichern | Auto-Save, 3 Slots + Test-Slot mit Vorlagen, Namenseingabe, Export/Import, Versionsnummer, Einstellungen aus 6b mit in den Spielstand | Seite neu laden nichts verliert |
| 8 ✅ | Händler | 1 Händler im Dorf (Ausrüstung kaufen, Items verkaufen, Heiltrank mit Taste `Q`), Items am Boden im Spielstand, Einstellungen global, Spielname „Rogoi Offline". `CREDITS.md` gibt es seit Meilenstein 2. Balancing bleibt laufende Arbeit (Offene Punkte) | Gold und volles Inventar einen Zweck haben |

**Bewusst nicht in V1:** Talentbaum, Aufwerten, Quests, weitere Zonen und Klassen,
Endlos-Turm, Weltbosse, Sound. (Der Räuberhauptmann ist ein fester Zonen-Boss, kein Weltboss.)

Der Talentbaum ist das Erste nach V1 – bei nur 10 Leveln und 9 Punkten trägt er noch
nicht, und er hängt an Skills und Balancing, die erst nach V1 stehen.

**Reihenfolge nach V1** *(Vorschlag)*: Talentbaum → Quests + Stadt ausbauen → Aufwerten
(Schmied) → Zone 2 → zweite Klasse → Weltbosse → Endlos-Turm. (Die Charakter-Slots gibt es seit
Meilenstein 7.)

## 13. Geplante Features

Von dir gewünscht, noch nicht umgesetzt. *(Entschieden)*

| Feature | Wann | Inhalt |
|---|---|---|
| Minimap | direkt nach Meilenstein 3 (Kampf) | Kleine Übersichtskarte oben rechts im Bild, unter der Knopf-Leiste: Gelände, eigene Position, Gegner in der Nähe. Wird ein HUD-Element wie die anderen (ausblenden, Größe, Deckkraft, verschieben – Abschnitt 2b) |
| Große Karte | sobald es mehrere Zonen gibt | Taste `M` öffnet und schließt die Karte der ganzen Zone |
| Nebel des Krieges | optional, zusammen mit Minimap oder großer Karte | Noch nicht besuchte Bereiche der Karte bleiben verdeckt und werden beim Erkunden aufgedeckt |
| Mehr Skills als Plätze | nach V1, zusammen mit dem Talentbaum | Mit der Zeit 8–10 Skills pro Klasse freischalten, aber nur 4 aktive Plätze. Die Auswahl ist der Build. |
| Legendäre Items mit einzigartigen Effekten | nach V1, baut auf dem Loot (Meilenstein 5) auf | Legendäre Items verändern Skills, z. B. „Rundumschlag hinterlässt Feuerspur". |

Oben rechts sitzt die Knopf-Leiste; der Platz darunter bleibt für die Minimap frei.

## 14. Offene Punkte

1. Aufwerten: Erfolgschancen ab +6 und Kosten pro Stufe (Balancing, nach V1).
2. Lauf-Animation: kommt später als Feinschliff, vorerst reicht das Hüpfen. *(Entschieden)*
3. Gegner in Grünwald: „Tiny Dungeon" enthält keine Wölfe, Wildschweine oder Goblins.
   Deshalb sind es vorerst Riesenratten, Waldspinnen und Wegelagerer. So lassen, oder
   ein weiteres CC0-Pack mit Waldtieren suchen?
4. Skill-Symbole sind vorerst Waffenbilder aus „Tiny Dungeon" (Hammer, Axt, Schwert,
   Schild). Eigene Symbole wären schöner.
5. Mana: beim Krieger gestrichen *(Entschieden)*. Ob der Magier später Mana bekommt, ist offen.
6. Balancing: Levelkurve, Wertezuwachs, Gegnerstufen und Skill-Stufen sind erste
   Schätzungen (Ziel: 2–3 Stunden bis Stufe 10) und müssen im Spiel erprobt werden.
   Mit Ausrüstung ist die Figur deutlich stärker (auf Stufe 10 grob +50 % Angriffskraft). Die
   Rüstung ist seit 5b abgeflacht; ob die Angriffskraft der Ausrüstung auch gebremst werden
   muss oder die Gegner nachziehen, muss das Spielen zeigen. Ohne Ausrüstung kassiert die
   Figur durch die neue Formel etwas mehr (Stufe 10: rund +12 %), Gegner ebenfalls (rund +7 %).
7. Loot-Balancing: Drop-Tabellen (10 % bei normalen Gegnern), Gold pro Gegner, Wertespannen der Affixe und die
   Umrechnung der Attribute sind erste Schätzungen.
8. Händler (Meilenstein 8), von mir gesetzte Startwerte zum Prüfen im Spiel (alle in
   `src/data/shop.ts`): Preisformel und Faktoren, 20 % Erlös, 8 Regalplätze, 60/32/8 %
   Seltenheiten, neue Ware alle 10 Minuten, Trank (40 %, 30 s, höchstens 5, Preis).
   - Kein Rückkauf: Ein versehentlich verkauftes weißes, grünes oder blaues Item ist weg.
     Soll der Händler die letzten verkauften Items zum selben Preis zurückgeben?
   - Sortiment auf der Stufe der Figur: Wer aufsteigt, sieht bis zur nächsten Lieferung noch
     die alte Ware.
   - Der Händler-Platz und sein Bild (Figur aus „Tiny Dungeon") sind Startwerte.
9. Vielfalt: Jede Item-Art außer der Waffe hat erst 5–7 mögliche Affixe, die drei Waffen
   unterscheiden sich nur im Aussehen. Mehr Affixe und eigene Waffenwerte (z. B. Dolch
   schneller, Axt stärker) wären ein möglicher Ausbau.
10. Elite/Boss-Balancing: Alle Werte in Abschnitt 8 (Chance, Faktoren, Eigenschaften, EP und
    Gold, Boss-Respawn) sind von mir gesetzte Startwerte und nur grob gerechnet. Zu prüfen im
    Spiel: Sind 5 % zu selten? Ist der Boss mit Ausrüstung schaffbar? Ist ein einzelnes Item
    für den Boss-Kampf Lohn genug (oder besser 2–3 Items)?
11. Namen von Elites: Die Eigenschaften stehen unter dem Namen statt davor („Schnelle
    Waldspinne") – dafür müsste jede Eigenschaft nach dem Geschlecht des Gegners gebeugt werden.
12. HUD-Einstellungen (6b): Grenzen der Regler und die Farbe des eigenen Schilds sind Startwerte.
    Erledigt *(Entschieden)*: Die Einstellungen sind global, nicht pro Slot (Abschnitt 11).
13. Speichern (Meilenstein 7), von mir gesetzte Startwerte zum Prüfen:
    - Neuladen mitten im Kampf: Die Gegner stehen danach wieder friedlich an ihrem Platz – man
      kann sich so aus einem Kampf retten (das Leben bleibt aber, wie es war). Stört das?
    - Erledigt *(Entschieden)*: Items am Boden bleiben beim Neuladen liegen.
    - Ein neuer Test-Spielstand ersetzt den alten im Slot „Test" ohne Nachfrage.
    - Dasselbe Spiel in zwei Browser-Tabs mit demselben Slot: Der Tab, der zuletzt speichert,
      gewinnt. Verschiedene Slots in zwei Tabs stören sich nicht.
    - Spielstände liegen nur in diesem Browser. Vor „Browserdaten löschen" exportieren.
