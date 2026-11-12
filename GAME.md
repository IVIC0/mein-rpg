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
- **Knopf-Leiste** oben rechts *(Umgesetzt)*: kleine Knöpfe für Inventar und Einstellungen;
  weitere (Talente, Karte) kommen dort dazu. In den Einstellungen: „Namen über allen Gegnern
  zeigen" (an/aus) und „Fenster zurücksetzen".
  `T` Talente kommt mit dem Talentbaum. *(Vorschlag)*
- **Karte:** `M` große Karte. *(Entschieden, geplant – siehe Abschnitt 13)*
- **Tränke:** `Q` Heiltrank. *(Vorschlag, kommt mit dem Händler)* Einen Manatrank gibt es nicht.

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
  - Respawn 30 Sekunden nach dem Tod am selben Platz.
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
`src/data/warrior.ts`, `src/data/enemies.ts` und `src/data/progression.ts`
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
  75 % / 50 % / 25 %, darüber 10 %.
- **Levelkurve** – ausgelegt auf rund 500 Gegner bzw. 2–3 Stunden bis Stufe 10:

  | Aufstieg auf Stufe | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
  |---|---|---|---|---|---|---|---|---|---|
  | EP nötig | 120 | 300 | 625 | 1050 | 1750 | 2600 | 3600 | 5000 | 6600 |

- **Wertezuwachs pro Stufe** (Krieger): +18 Leben, +3 Angriffskraft, +4 Rüstung.
  Auf Stufe 10 also 282 Leben, 39 Angriffskraft, 46 Rüstung (ohne Ausrüstung).
- **Stufenaufstieg:** Das Leben ist sofort wieder voll, eine Meldung zeigt die neue
  Stufe, den Zuwachs und neu freigeschaltete Skills.
- **Anzeige:** Stufe und EP-Balken im Rahmen oben links. Über jedem Gegner stehen Name, Stufe
  und Lebensbalken (in den Einstellungen umstellbar auf: nur Ziel, Angreifer und Verletzte).
  Dort und im Zielrahmen ist die Stufe des Gegners rot, wenn er 2 oder mehr Stufen über der Figur liegt, und grau, wenn er nur noch
  verringerte EP bringt.
- Leben, Angriffskraft und Rüstung steigen pro Stufe direkt. Die Attribute (Stärke,
  Ausdauer, Geschick) kommen nur von der Ausrüstung. *(Vorschlag)*
- **Zum Testen:** `?stufe=5` an die Adresse hängen, dann startet die Figur auf Stufe 5.
  `?beute=12` legt 12 gewürfelte Items ins Inventar (jede Seltenheit reihum); beides
  zusammen: `?stufe=5&beute=12`. Solange es kein Speichern gibt (Meilenstein 7), beginnt
  jedes Neuladen wieder auf Stufe 1 und mit leerem Inventar.

Alle Werte stehen in `src/data/progression.ts` (Kurve, EP) und `src/data/warrior.ts` (Zuwachs).

## 7. Loot

- **Affix-System im Diablo-Stil:** Basis-Item + zufällige Prä-/Suffixe mit gewürfelten
  Werten. *(Entschieden)*
- **6 Seltenheiten:** Gewöhnlich, Ungewöhnlich, Selten, Episch, Legendär, Mythisch. *(Entschieden)*
- **Händler + Gold:** Items verkaufen, Tränke und Basis-Ausrüstung kaufen. Ein einfacher
  Händler ist schon in V1 dabei. *(Entschieden)*
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
- Elite und Boss sind vorbereitet, greifen aber erst, wenn es sie gibt (Elites: Meilenstein 6,
  Bosse nach V1). Bis dahin haben alle Gegner den Rang „normal".

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
- Noch nicht dabei: Verkaufen und Tränke (Händler, Meilenstein 8), besseres Loot von
  Elites (Meilenstein 6), Speichern des Inventars (Meilenstein 7).

Alle Werte stehen in `src/data/items.ts` (Seltenheiten, Basis-Items, Affixe),
`src/data/loot.ts` (Drop-Tabellen je Gegnerrang, Gold, Inventargröße) und `src/data/stats.ts` (Attribute).

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

Gegner in Grünwald *(Umgesetzt)* – 31 Stück, je weiter vom Dorf, desto höher die Stufe.
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
| Ruine | 5 Wegelagerer (8, 8, 9, 9, 10) |

Die Stufen je Lichtung stehen in `tools/build-map.mjs` (Liste `ENEMY_GROUPS`), die
Grundwerte und der Zuwachs in `src/data/enemies.ts`.

Alle Gegner sind etwas langsamer als die Figur – weglaufen geht also immer.

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
| 1 ✅ | Setup + Deploy | Vite + TS + Phaser, GitHub-Pages-Action, leere Szene | die Seite unter der Pages-URL lädt |
| 2 ✅ | Karte + Bewegung | Tilemap Grünwald, Kollision, Klick-Laufen mit Wegfindung, Kamera folgt | man um Bäume herum durch die Zone laufen kann |
| 3 ✅ | Kampf | Ziel wählen, Auto-Angriff, 3 Gegnertypen mit Aggro/Leash/Respawn, Lebensbalken, 4 Krieger-Skills, Tod + Respawn | man Gegner töten und sterben kann |
| 4 ✅ | Leveln | EP, Levelkurve 1–10, Wertezuwachs, Skill-Freischaltung auf festen Stufen | Level 10 erreichbar ist und sich stärker anfühlt |
| 5 ✅ | Loot | Item-Generator (Affixe, 6 Seltenheiten, Itemlevel), Drops, Inventar, Ausrüstung, Tooltip mit Vergleich | ein Fund die Werte sichtbar verbessert |
| 5b ✅ | Feinschliff Loot | Drop-Chance 10 % und Drop-Tabellen je Gegnerrang, Rüstung abgeflacht (max. 75 %), Inventarfenster verschiebbar/anpinnbar, Knopf-Leiste, Namensschilder über Gegnern | Loot seltener, aber wertiger ist und das Fenster beim Kämpfen nicht stört |
| 6 | Elites | Zufällige Elite-Spawns mit 1–3 Eigenschaften und besserem Loot | Elites erkennbar gefährlicher und lohnender sind |
| 7 | Speichern | Auto-Save, Export/Import, Versionsnummer | Seite neu laden nichts verliert |
| 8 | Händler + Feinschliff | 1 Händler (verkaufen, Tränke kaufen), Balancing, `CREDITS.md` | Gold und volles Inventar einen Zweck haben |

**Bewusst nicht in V1:** Talentbaum, Aufwerten, Quests, weitere Zonen und Klassen,
Endlos-Turm, Weltbosse, Sound.

Der Talentbaum ist das Erste nach V1 – bei nur 10 Leveln und 9 Punkten trägt er noch
nicht, und er hängt an Skills und Balancing, die erst nach V1 stehen.

**Reihenfolge nach V1** *(Vorschlag)*: Talentbaum → Quests + Stadt ausbauen → Aufwerten
(Schmied) → Zone 2 → zweite Klasse + Charakter-Slots → Weltbosse → Endlos-Turm.

## 13. Geplante Features

Von dir gewünscht, noch nicht umgesetzt. *(Entschieden)*

| Feature | Wann | Inhalt |
|---|---|---|
| Minimap | direkt nach Meilenstein 3 (Kampf) | Kleine Übersichtskarte oben rechts im Bild, unter der Knopf-Leiste: Gelände, eigene Position, Gegner in der Nähe |
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
8. Inventar ohne Händler: Bis Meilenstein 8 kann man überzählige Items nur wegwerfen, und
   Gold hat noch keinen Zweck.
9. Vielfalt: Jede Item-Art außer der Waffe hat erst 5–7 mögliche Affixe, die drei Waffen
   unterscheiden sich nur im Aussehen. Mehr Affixe und eigene Waffenwerte (z. B. Dolch
   schneller, Axt stärker) wären ein möglicher Ausbau.
