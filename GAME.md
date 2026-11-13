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
  Seit Meilenstein 11 geht das auch per **Mausklick** auf das Trank-Feld der Skill-Leiste
  *(Entschieden, umgesetzt)*. Es ist das einzige Feld der Leiste, das man anklickt (Mauszeiger wird
  zur Hand); im Bearbeitungsmodus des HUD wird die Leiste gezogen, dann trinkt der Klick nicht.
- **Händler:** Klick auf den Händler im Dorf = hinlaufen und handeln. *(Umgesetzt, Abschnitt 7b)*
- **Truhen:** Klick auf eine Truhe = hinlaufen und öffnen. *(Umgesetzt, Abschnitt 9b)*
- **Zonenwechsel:** Auf einen Übergang laufen (z. B. den Höhleneingang) oder ihn anklicken –
  dann läuft die Figur hin und wechselt die Zone. *(Umgesetzt, Abschnitt 9b)*

## 2b. HUD und Einstellungen *(Schritt 6b, umgesetzt)*

- **Schild über der eigenen Figur:** Name, Stufe und Lebensbalken wie bei den Gegnern, aber mit
  grünem Namen und grünem Balken (Gegner: rot). Liegt die Figur am Boden, ist es weg. *(Entschieden;
  die Farbe Grün ist ein Startwert.)* Der Name ist seit Meilenstein 7 der eigene Figurenname
  (Abschnitt 11).
- **Einstellungen** (Zahnrad oben rechts): ein schmales Menü mit vier zugeklappten Bereichen,
  dazu „HUD verschieben …", „Fenster zurücksetzen" und „Alles auf Standard".

  | Bereich | Einzeln schaltbar | Regler |
  |---|---|---|
  | Über meiner Figur | Name, Stufe, Leben | Größe, Deckkraft |
  | Über Gegnern | Name (mit Elite-Eigenschaften), Stufe, Leben; „bei allen Gegnern" (aus = nur Ziel, Angreifer, Verletzte) | Größe, Deckkraft |
  | HUD-Elemente | Spielerrahmen, Zielrahmen, Skill-Leiste, Beute-Liste, Minimap, Schwebende Zahlen (Schaden, Heilung, EP, Skill-Namen) | je Element Größe, Deckkraft |
  | Schwierigkeit *(seit Meilenstein 10, gehört zum Spielstand – Abschnitt 15.6)* | vier Knöpfe Leicht / Normal / Schwer / Brutal | Gegnerleben, Gegnerschaden |

- **Bearbeitungsmodus** („HUD verschieben …"): Spielerrahmen, Zielrahmen, Skill-Leiste,
  Beute-Liste und Minimap bekommen einen gestrichelten Rahmen und lassen sich mit der Maus ziehen. Sie bleiben
  immer ganz im Bild. Oben erscheint eine Leiste mit „Plätze zurücksetzen" und „Fertig"; `Esc`
  beendet den Modus. Das Spiel läuft dabei weiter.
- **Alles auf Standard** setzt alle Einstellungen, die Plätze der HUD-Elemente und das
  Inventarfenster zurück. Die Schwierigkeit bleibt dabei, wie sie ist (dafür gibt es den Knopf „Normal").
- **Technik:** Alle Einstellungen liegen in einem einzigen Objekt (`Settings` in
  `src/ui/settings.ts`, nur einfache Werte). Die Einstellungen sind **global**: Sie gelten für
  alle Slots und liegen im Browser, nicht im Spielstand *(Entschieden)*. Einzige Ausnahme ist die
  Schwierigkeit: Sie steht im Spielstand, also pro Slot *(Entschieden, Abschnitt 15.6)*. Der Platz eines Elements ist als
  Verschiebung gegenüber dem Standard-Platz gespeichert, damit z. B. die Skill-Leiste auch bei
  anderer Fenstergröße unten in der Mitte verankert bleibt.

**Startwerte** (von mir gesetzt, in `src/ui/settings.ts`): alles sichtbar, Größe 100 %, Deckkraft
100 %. Regler Größe 60–200 %, Deckkraft 20–100 % (nie 0 – dafür gibt es das Ausblenden), beide in
5-%-Schritten.

**Bewusst anders gebaut als gewünscht:**
- *Knopf-Leiste oben rechts:* fest, nicht ausblendbar und nicht verschiebbar – sonst käme man
  nicht mehr an die Einstellungen.
- *Schilder und schwebende Zahlen:* hängen an den Figuren und lassen sich deshalb nicht
  verschieben, nur ein-/ausblenden, skalieren und durchsichtiger machen.
- *Meldungen* (Stufenaufstieg, „Inventar voll", Todes-Bildschirm) sind nicht einstellbar.

## 2c. Minimap *(Meilenstein 10, umgesetzt)*

Oben rechts unter der Knopf-Leiste. Alle Zahlen und Farben sind **Startwerte** von mir
(`src/data/minimap.ts`), gezeichnet wird in `src/ui/Minimap.ts`.

- **Ausschnitt:** 140 × 140 Pixel, zeigt 35 × 35 Kacheln um die Figur (4 Pixel je Kachel). Die
  Figur steht in der Mitte; am Kartenrand bleibt der Ausschnitt stehen wie die Kamera.
- **Gelände:** Jede Kachel bekommt die Durchschnittsfarbe ihres Bildes – Wald dunkelgrün, Wiese
  hell, Wege braun, Häuser und Ruine in ihren Farben. Das rechnet das Spiel beim Start selbst
  aus der Karte aus; eine neue Zone braucht dafür also nichts Eigenes.
- **Punkte:** eigene Figur weiß, Händler hellblau, Gegner rot, Elite gold (größer), Boss lila
  (am größten). Seit Meilenstein 11 dazu *(Startwerte)*: Truhen orange (leer: grau), Übergänge
  in eine andere Zone türkis. Das Gelände wird beim Betreten einer Zone neu aufgebaut. Besiegte Gegner verschwinden, bis sie wieder erscheinen. Zu sehen sind alle
  Gegner im Ausschnitt – auch hinter Bäumen (kein Nebel des Krieges, Abschnitt 13).
- **HUD-Element** wie die anderen: ausblenden, Größe, Deckkraft, im Bearbeitungsmodus
  verschieben (Abschnitt 2b). Ausgeblendet wird sie auch nicht mehr gezeichnet.
- Die Menüs „Einstellungen" und „Spielstände" klappen an derselben Stelle auf und verdecken sie,
  solange sie offen sind.

## 3. Perspektive & Grafik

- Top-down Pixel-Art. *(Entschieden)*
- Freie Asset-Packs mit CC0-Lizenz; Quelle und Lizenz jedes Packs werden in
  `CREDITS.md` dokumentiert. *(Entschieden)*
- **Packs:** Kenney „Tiny Town" (Landschaft, Gebäude) und „Tiny Dungeon" (Figuren,
  Gegner, Items, Höhle), beide CC0. *(Umgesetzt)* Seit Meilenstein 11 dazu Figuren aus
  „0x72 DungeonTileset II" (Goblins) und „Ninja Adventure" (Wildschwein, Wolf-Ersatz), ebenfalls
  CC0 – der Stilmix ist vorerst in Ordnung *(Entschieden, 15.9)*. Alle Packs liegen entpackt in
  `assets-src/`, die Liste steht in `CREDITS.md`.
- 16×16-Tiles, ganzzahlig hochskaliert, damit Pixel scharf bleiben. Der Zoom richtet
  sich nach der Fenstergröße (×2 bis ×4), sichtbar sind rund 40 × 22 Kacheln. *(Umgesetzt)*
- Das Spielfeld füllt immer das ganze Browserfenster; ein größeres Fenster zeigt
  mehr von der Welt. *(Umgesetzt)*
- Einschränkungen der Packs: Kenneys Figuren haben keine Lauf-Animationen (sie hüpfen
  stattdessen leicht), und „Tiny Town" hat keine Wasser-Kacheln (Grünwald hat deshalb keinen
  Fluss oder See). Die neuen Figuren bringen Lauf-Bilder mit: Goblins vier fürs Stehen und vier
  fürs Laufen, Wildschwein und Wolf zwei fürs Laufen – sie hüpfen nicht.

## 4. Kampfsystem

- **Stil:** sehr simpel – Ziel anwählen + Auto-Angriff, die Skills lösen von selbst aus. *(Entschieden, umgesetzt)*
  Ab Zone 2 bekommen Gegner eigene Fähigkeiten (Fernkampf, Heilen, Beschwören …); die Bedienung
  bleibt dieselbe. *(Entschieden, Abschnitt 15.5)*
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
  - „Im Kampf" heißt: der letzte Treffer (ausgeteilt oder kassiert) ist höchstens 5 Sekunden her.
  - **Passive Regeneration** *(seit Schritt 10b gebremst, Abschnitt 4b)*: im Kampf und kurz
    danach keine, dann langsam – beim Rasten (Stehen) schneller als im Laufen. Der schnelle
    Heilweg ist der Heiltrank.
- **Tod:** Respawn in der Stadt mit kleinem Gold-/EP-Verlust, kein Itemverlust. *(Entschieden)*
  - Umgesetzt: Die Figur bleibt 3 Sekunden liegen und wacht dann mit vollem Leben im Dorf auf.
  - EP-Abzug *(Umgesetzt)*: 5 % der EP, die die aktuelle Stufe braucht – höchstens so viel,
    wie man in der Stufe schon gesammelt hat, also nie Stufenverlust. Der Todes-Bildschirm
    zeigt den Verlust an.
  - Gold-Abzug *(Umgesetzt)*: 10 % des Goldes *(Startwert seit Schritt 10b, vorher 5 %)*. Items
    gehen nie verloren.
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

## 4b. Balancing-Fixes *(Schritt 10b, umgesetzt)*

Auslöser war dein Test auf Stufe 1–3: (1) Zwischen zwei Gegnern heilt man gratis auf voll, Tränke
braucht niemand; (2) Gold kommt zu leicht und hat zu wenig Verwendung; (3) Items fallen zu oft.
Von dir vorgegeben *(Entschieden)*: Regeneration bremsen statt abschaffen (im Kampf und kurz
danach keine, dann langsam, Rasten schneller als Laufen, Richtwert 2–3 Minuten bis voll); Gegner
heilen weiter voll, wenn man sie abhängt; Tränke bleiben der schnelle Heilweg; ein blaues Item
vom Händler soll auf Stufe 1–5 spürbar Spielzeit kosten. **Alle Zahlen unten sind Startwerte von
mir** – jede steht in genau einer Datei und lässt sich dort nachstellen. Der Spielstand bleibt
Format 4, alte Stände laden unverändert.

**1. Regeneration** (`src/data/regen.ts`)

| | Alt | Neu *(Startwert)* | Stellschraube |
|---|---|---|---|
| Sperre nach dem letzten Treffer | 5 s | **8 s** (5 s „im Kampf" + 3 s danach) | `delayMs` |
| … und solange ein Gegner die Figur verfolgt | – | keine Regeneration, auch ohne Treffer | – |
| Im Laufen | 5 % pro Sekunde = voll in 20 s | voll in **180 s** (0,56 % pro Sekunde) | `walkingFullSeconds` |
| Im Stehen (Rasten) | wie Laufen | voll in **120 s** (0,83 % pro Sekunde), gilt nach 1,5 s Stillstand | `restingFullSeconds`, `restAfterMs` |

- Stufe 5 (192 Leben): Rasten bringt 1,6 Leben pro Sekunde, Laufen 1,1. Vorher 9,6.
- Im Spielerrahmen steht unter den Balken „Erholung" (Laufen) bzw. „Rasten", solange Leben
  zurückkommt – so sieht man, dass Stehenbleiben hilft und wann die Sperre vorbei ist.
- Unverändert: Stufenaufstieg und Aufwachen im Dorf füllen das Leben, Lebensraub und der Affix
  „… der Erholung" (Leben pro Sekunde von der Ausrüstung) wirken weiter auch im Kampf. Gegner
  heilen voll, wenn sie zurücklaufen.
- Ein Heiltrank (40 %) spart damit rund 48 Sekunden Rasten.

**2. Gold** (`src/data/loot.ts`, `src/data/shop.ts`, `src/data/progression.ts`, `src/data/pois.ts`)

| | Alt | Neu *(Startwert)* | Wo |
|---|---|---|---|
| Gold je normalem Gegner | 1–4 + 1 × Stufe: Stufe 1 = 2–5, Stufe 5 = 6–9, Stufe 10 = 11–14 | 1–3 + 0,5 × Stufe: Stufe 1 = **2–3**, Stufe 5 = **4–5**, Stufe 10 = **6–8** | `GOLD_DROP` |
| Elite / Boss | ×3 / ×10 | unverändert | `GOLD_RANK_FACTOR` |
| Gold aus Truhen | (10 + 5 × Stufe) ± 20 %: Stufe 6 = 32–48 | (6 + 3 × Stufe) ± 20 %: Stufe 6 = **19–29** | `CHEST.gold` |
| Preis-Faktor Gewöhnlich / Ungewöhnlich / Selten | 1 / 2,5 / 6 | 1 / **3** / **10** | `PRICE.rarityFactor` |
| Preis-Faktor Episch / Legendär / Mythisch | 15 / 40 / 100 | **25** / **60** / **150** | `PRICE.rarityFactor` |
| Blaues Item kaufen, Itemlevel 1 / 5 / 10 | 96 / 240 / 420 | **160** / **400** / **700** | – |
| Verkaufserlös | 20 % des Werts | **10 %** | `PRICE.sellFraction` |
| Verkauf Itemlevel 5: weiß / grün / blau / lila | 8 / 20 / 48 / 120 | **4** / **12** / **40** / **100** | – |
| Heiltrank | 10 + 4 × Stufe: 14 / 30 / 50 Gold (Stufe 1 / 5 / 10) | 6 + 2 × Stufe: **8** / **16** / **26** Gold | `POTION` |
| Gold-Verlust beim Tod | 5 % | **10 %** | `DEATH_GOLD_LOSS` |
| EP-Verlust beim Tod | 5 % der Stufe | unverändert | `DEATH_XP_LOSS` |

- **Was ein blaues Item jetzt kostet** (gerechnet mit 3 Gegnern pro Minute, 5 % Elites):

  | Stufe | Einkommen alt (Gold pro Minute, ohne / mit Verkauf aller Beute) | Einkommen neu | Blaues Item alt | Blaues Item neu |
  |---|---|---|---|---|
  | 1 | 12 / 18 | 8 / 11 | 5–8 Minuten | **14–19 Minuten** |
  | 3 | 18 / 29 | 12 / 17 | 6–9 Minuten | **17–24 Minuten** |
  | 5 | 25 / 41 | 15 / 22 | 6–10 Minuten | **18–27 Minuten** |
  | 10 | 41 / 69 | 23 / 36 | 6–10 Minuten | **20–30 Minuten** |

  Zum Vergleich: Der Aufstieg von Stufe 5 auf 6 dauert rund 17 Minuten. Bis Stufe 5 kommen aus
  Gegnern zusammen rund 320 Gold (vorher 510) – das erste blaue Item vom Händler (400 Gold auf
  Itemlevel 5) gibt es also erst um Stufe 5–6, und nur, wenn man dafür spart.
- **Tränke** sind in Gegnern gerechnet etwas billiger geworden (rund 3,5 statt 4 Gegner je Trank),
  weil man sie jetzt braucht. Sie sind damit die laufende Gold-Ausgabe.
- **Tod:** Aufwachen im Dorf bleibt mit vollem Leben. Damit Sterben kein billiger Heilweg wird,
  kostet es doppelt so viel Gold; der EP-Verlust bleibt, weil der Weg zurück schon Zeit kostet.
- Händler-Sortiment (60 / 32 / 8 %), Lieferzeit, Rückkauf zum Verkaufspreis: unverändert.
- Die große Gold-Verwendung fehlt weiter – dafür ist der Stadtausbau geplant (Abschnitt 16.2).

**3. Drops** (`src/data/loot.ts`, Truhen in `src/data/pois.ts`)

| | Alt | Neu *(Startwert)* |
|---|---|---|
| Drop-Chance normaler Gegner | 10 % | **6 %** |
| Anteile normal (weiß / grün / blau / lila / orange / rot) | 50 / 32 / 13 / 4 / 0,9 / 0,1 | **60 / 29 / 8,5 / 2,1 / 0,36 / 0,04** |
| Ein Item auf … normale Gegner: irgendeins / blau / lila / orange | 10 / 77 / 250 / 1 111 | **17 / 196 / 794 / 4 630** |
| Elite (immer ein Item): grün / blau / lila / orange / rot | 45 / 37 / 14 / 3,6 / 0,4 | **58 / 31 / 9 / 1,8 / 0,2** |
| Boss (immer ein Item): blau / lila / orange / rot | 55 / 34 / 10 / 1 | **65 / 28 / 6,4 / 0,6** |
| Truhe: grün / blau / lila / orange / rot | 55 / 32 / 10,5 / 2,3 / 0,2 | **64 / 28 / 7 / 0,9 / 0,1** |

- Auf dem Weg zu Stufe 10 (rund 500 Gegner, davon etwa 25 Elites): von normalen Gegnern rund
  **29 Items** statt 48 (17 weiß, 8 grün, 2–3 blau, 0–1 lila; vorher 24 / 15 / 6 / 2). Dazu wie
  bisher 25 Items von Elites, jetzt mit 8 blauen und 2 lila statt 9 und 3–4.
- Geprüft: Elites sind die halbe Beute. Die 5 % Elite-Chance und „Elite lässt immer ein Item
  fallen" *(Entschieden)* habe ich nicht angefasst, nur ihre Seltenheiten etwas gesenkt. Ist es
  auf Stufe 1–3 danach immer noch zu viel, ist die Elite-Chance (`ELITE_CHANCE` in
  `src/data/elites.ts`) die nächste Stellschraube.
- Die Tabellen gelten für alle Stufen (es gibt erst Grünwald). Eigene Tabellen je Zone sind
  möglich, sobald Zone 2 kommt.

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

- **Maximallevel 40** mit den ersten vier Zonen, später mit weiteren Zonen erweiterbar bis 60.
  Bewusst langsam – mehrere Wochen. *(Entschieden; Kurve in Abschnitt 15.1 – ersetzt „Maximallevel 60")*
  Im Spiel liegt das Cap noch bei 10 und steigt mit jeder neuen Zone (20 → 30 → 40).
- **Talentbaum** als einziges Auswahlsystem beim Leveln. *(Entschieden)*
- Grundwerte (Leben, Angriffskraft, Rüstung …) steigen pro Level automatisch – keine frei
  verteilbaren Attributpunkte. *(folgt aus deiner Auswahl)*
- 1 Talentpunkt pro Level ab Level 2 (39 Punkte auf 40, 59 auf 60). *(Vorschlag)*
- Pro Klasse 3 Bäume (Krieger z. B. Waffen / Wut / Schutz) mit passiven Boni und
  Skill-Verbesserungen. *(Vorschlag)*
- Aktive Skills werden auf festen Stufen freigeschaltet, der Talentbaum verbessert sie. *(Entschieden)*
- Talente gegen Gold zurücksetzbar. *(Vorschlag)*
- Zieltempo: ca. 45 Spielstunden bis Level 40. *(Vorschlag, wird durch Balancing eingestellt)*

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
  `?zone=spinnenhoehle` startet den Testlauf direkt in dieser Zone *(seit Meilenstein 11)*.
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
  Items beim Schmied zu Schmiedesteinen zerlegen zählt nicht als Crafting und ist in Ordnung
  *(Entschieden, Abschnitt 15.3)*.

Seltenheiten *(Farben entschieden, Zahlen Vorschlag – Startwerte fürs Balancing)*:

| Seltenheit | Farbe | Affixe |
|---|---|---|
| Gewöhnlich | Weiß | 0 |
| Ungewöhnlich | Grün | 1 |
| Selten | Blau | 2 |
| Episch | Lila | 3 |
| Legendär | Orange | 4 |
| Mythisch | Rot | 5 |

**Drop-Tabelle je Gegnerrang** *(Schritt 5b, Werte seit Schritt 10b gesenkt – alt und neu
nebeneinander in Abschnitt 4b; `DROP_TABLES` in `src/data/loot.ts`)*: erst wird
gewürfelt, ob ein Item fällt, dann die Seltenheit.

| | Normal | Elite | Boss |
|---|---|---|---|
| **Drop-Chance** | **6 %** | **100 %** | **100 %** |
| Gewöhnlich | 60 % | – | – |
| Ungewöhnlich | 29 % | 58 % | – |
| Selten | 8,5 % | 31 % | 65 % |
| Episch | 2,1 % | 9 % | 28 % |
| Legendär | 0,36 % | 1,8 % | 6,4 % |
| Mythisch | 0,04 % | 0,2 % | 0,6 % |

- Normaler Gegner, im Schnitt ein Item auf so viele Gegner: irgendeins 17 · Selten 196 ·
  Episch 794 · Legendär 4 630 · Mythisch 41 667. Auf dem Weg zu Stufe 10 (rund 500 Gegner)
  sind das etwa 29 Items von normalen Gegnern: 17 weiße, 8 grüne, 2–3 blaue, 0–1 lila.
- Verlauf: erst 30 % (Anteile 60 / 28 / 9 / 2,5 / 0,45 / 0,05), seit 5b 10 % (50 / 32 / 13 / 4 /
  0,9 / 0,1), seit 10b 6 % – dein Test auf Stufe 1–3 fand auch 10 % noch zu häufig.
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

- **Drops:** Jeder besiegte Gegner gibt Gold (Stufe 1: 2–3, Stufe 10: 6–8 – seit Schritt 10b,
  vorher 2–5 und 11–14) und lässt mit
  6 % Chance ein Item fallen (Elite/Boss: siehe Drop-Tabelle oben). Itemlevel = Stufe des
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
- **Rückkauf** *(Meilenstein 10, umgesetzt)*: Das Händler-Fenster hat zwei Reiter, „Ware" und
  „Rückkauf". Im Rückkauf liegen die letzten **10** verkauften Items, das neueste vorn; beim
  elften fällt das älteste heraus und ist endgültig weg *(Entschieden)*. Linksklick kauft ein
  Item zum **Verkaufspreis** zurück – man zahlt also genau das Gold, das man bekommen hat, ohne
  Verlust und ohne Gewinn. Die Liste steht im Spielstand (übersteht Neuladen, pro Slot) und
  bleibt auch bei neuer Ware erhalten. Am Reiter steht die Anzahl, z. B. „Rückkauf (3)". Größe
  der Liste: `BUYBACK` in `src/data/shop.ts`.

**Preise** – abgeleitet aus Itemlevel und Seltenheit *(Faktoren und Erlös seit Schritt 10b neu,
alte Werte in Abschnitt 4b)*:
Wert = (10 + 6 × Itemlevel) × Faktor der Seltenheit. Kaufen kostet den Wert, Verkaufen bringt 10 %.

| Seltenheit | Faktor | Kauf Itemlevel 1 | Kauf Itemlevel 5 | Kauf Itemlevel 10 | Verkauf Itemlevel 10 |
|---|---|---|---|---|---|
| Gewöhnlich | 1 | 16 | 40 | 70 | 7 |
| Ungewöhnlich | 3 | 48 | 120 | 210 | 21 |
| Selten | 10 | 160 | 400 | 700 | 70 |
| Episch | 25 | – | – | – | 175 |
| Legendär | 60 | – | – | – | 420 |
| Mythisch | 150 | – | – | – | 1 050 |

Zum Einordnen: Ein normaler Gegner gibt auf Stufe 5 rund 4–5, auf Stufe 10 rund 7 Gold. Ein
blaues Item kostet also etwa 90–100 Gegner (rund 20–30 Minuten, Rechnung in Abschnitt 4b); als
Beute fällt eins im Schnitt alle 196 normalen Gegner.

**Sortiment:** 8 gewürfelte Items auf der Stufe der Figur (Itemlevel = ihre Stufe zum Zeitpunkt
der Lieferung), jede Art gleich oft. Seltenheit: 60 % Gewöhnlich, 32 % Ungewöhnlich, 8 % Selten –
der Händler führt bewusst nur einfache Ware, die besten Stücke gibt es weiter nur als Beute.
Gekauftes ist weg, bis neue Ware kommt: alle **10 Minuten** wird das ganze Regal neu gewürfelt.
Die Uhr läuft in echter Zeit weiter, auch wenn das Spiel zu ist (wie beim Boss). Sortiment und
Lieferzeitpunkt stehen im Spielstand, also pro Slot.

**Heiltrank:** heilt 40 % des maximalen Lebens, 30 Sekunden Abklingzeit, höchstens 5 im Gepäck
(sie belegen keinen Inventar-Platz). Preis = 6 + 2 × Stufe der Figur (Stufe 1: 8, Stufe 5: 16,
Stufe 10: 26 Gold – seit Schritt 10b, vorher 14 / 30 / 50). Der Händler hat immer welche. Getrunken wird mit `Q` oder per Mausklick auf
das Trank-Feld *(Klick seit Meilenstein 11)*. Der Trank steht als Feld mit Anzahl und
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

Zonen-Skizze *(Vorschlag, erste Fassung – der ausgearbeitete Plan steht in Abschnitt 15.2)*:

| Zone | Level | Gegner |
|---|---|---|
| Stadt (Hub) | – | Händler, Schmied, Questgeber (in V1 ein Dorf am Rand von Grünwald) |
| Grünwald | 1–10 | Riesenratten, Waldspinnen, Wegelagerer (ursprünglich geplant: Wölfe, Wildschweine, Goblins – siehe Offene Punkte) |
| Orkhügel | 10–20 | Orks, Schamanen |
| Sumpf / Friedhof | 20–35 | Untote |
| Burgruine | 35–50 | Ritter-Geister, Dämonen |
| Drachenberge | 50–60 | Drachlinge, Drache als Weltboss |

**Seit Meilenstein 11 ist Grünwald ergänzt** (neue Lichtungen, Goblin-Lager, Spinnenhöhle, fünf
neue Gegner, Truhen, Brutmutter) – der aktuelle Stand steht in Abschnitt 9b. Die Tabellen hier
zeigen den Stand von V1; alles daraus gibt es weiterhin.

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

Die Stufen je Lichtung stehen im Bauplan der Zone (`tools/zones/gruenwald.mjs`, Liste
`enemyGroups` – bis Meilenstein 10: `ENEMY_GROUPS` in `tools/build-map.mjs`), die
Grundwerte und der Zuwachs in `src/data/enemies.ts`.

Alle Gegner sind etwas langsamer als die Figur – weglaufen geht also immer (auch vor
„schnellen" Elites: die schnellste, eine Riesenratte, kommt auf 71 gegenüber 72 Pixeln pro Sekunde).
Das gilt auch für die neuen Gegner: Wolf und Fledermaus sind so schnell wie die Ratte (62), nicht schneller.

## 9b. Zonen, besondere Orte und Grünwald-Ergänzung *(Meilenstein 11, umgesetzt)*

Der Umbau aus Abschnitt 15.5 und die Ergänzung von Grünwald aus 15.2. Vorgegeben waren: Zonen
datengetrieben, die POI-Arten Truhe / fester Elite-Platz / Höhle, Zonenwechsel, Fledermaus,
Goblin, Goblin-Schleuderer, Wildschwein, Wolf-Ersatz, Spinnenhöhle unter dem Pilzhain,
Goblin-Lager zwischen Großer Lichtung und Ostlichtung, 3 Truhen, Brutmutter (Waldspinne Stufe 6,
Regenerierend + Vampirisch) *(Entschieden)*. **Alles andere in diesem Abschnitt – Plätze, Stufen,
Werte, Zeiten, Farben, Namen der neuen Lichtungen – habe ich mir ausgedacht: Startwerte.**

**Zonen** (`src/data/zones.ts`): Zu sehen ist immer genau eine Zone. Beim Wechsel blendet das Bild
kurz auf (0,35 s), oben steht drei Sekunden lang Name und Stufenbereich. Figur, Inventar, HUD und
Abklingzeiten bleiben, wie sie sind.

| Zone | Stufen | Größe | Gegner | Aufwachen nach dem Tod |
|---|---|---|---|---|
| Grünwald | 1–10 | 120 × 90 | 55 (mit Boss) | im Dorf |
| Spinnenhöhle | 3–6 | 64 × 48 | 17 (mit Brutmutter) | im Dorf in Grünwald |

- **Übergang:** Im Pilzhain steht oben links ein Steinrahmen mit Leiter (Schild „Spinnenhöhle"),
  davor pulsiert ein heller Fleck. Wer ihn betritt (9 Pixel Umkreis) oder den Eingang anklickt,
  landet in der Höhle; dort führt dieselbe Leiter zurück. Die Figur kommt zwei bis drei Kacheln
  vor dem Übergang an, damit sie nicht sofort zurückspringt.
- **Zone verlassen = Zone zurückgesetzt:** Gewöhnliche Gegner stehen beim Wiederbetreten alle
  wieder da (auch frisch besiegte). Bosse, benannte Elites und Truhen behalten ihre Zeit, Items
  am Boden bleiben liegen (ihre 3 Minuten laufen nur, solange die Figur in der Zone ist).
- **Tod in der Höhle:** Aufwachen im Dorf, wie überall – der Weg zurück ist die Strafe.

**Besondere Orte (POIs)** – stehen im Bauplan der Zone, Werte in `src/data/pois.ts` und
`src/data/elites.ts`:

| Art | Was passiert | Werte *(Startwerte)* |
|---|---|---|
| Truhe | Anklicken: Gold in den Beutel, 1–2 Items fallen davor auf den Boden. Danach steht sie offen und ist leer | füllt sich nach **30 Minuten** (echte Zeit, läuft auch bei geschlossenem Spiel). Gold = (6 + 3 × Stufe der Truhe) × 0,8–1,2. Seltenheiten: 64 % ungewöhnlich, 28 % selten, 7 % episch, 0,9 % legendär, 0,1 % mythisch – nie gewöhnlich, knapp unter einer Elite *(Gold und Seltenheiten seit Schritt 10b gesenkt, Abschnitt 4b)*. Öffnen ab 26 Pixel Abstand |
| Fester Elite-Platz | Hier steht immer dieselbe benannte Elite mit festen Eigenschaften; Beute und EP wie jede Elite | Respawn **10 Minuten** (steht im Spielstand, läuft weiter wie beim Boss) |
| Übergang (Höhle) | Wechsel in eine andere Zone | Umkreis 9 Pixel |
| Lager | Zaun mit Tor, darin eine dichte Gegnergruppe und eine Truhe. Gegner sehen nicht durch den Zaun – sie greifen erst an, wenn man durchs Tor kommt | – |
| Händler | wie bisher (Abschnitt 7b), jetzt ebenfalls als POI im Bauplan | – |

Die drei Truhen: **Wolfshang** (Itemlevel 4), **Goblin-Lager** (7), **Brutkammer** am Ende der
Spinnenhöhle (6). Eine leere Truhe sagt beim Anklicken, in wie vielen Minuten sie wieder voll ist.

**Neue Gegner** – Grundwerte für Stufe 1, Zuwachs wie bei allen (+20 % Leben, +15 % Angriff,
+2 Rüstung je Stufe), alle Werte in `src/data/enemies.ts` *(Startwerte)*:

| Gegner | Bild | Leben | Angriff | Rüstung | Schlag alle | Tempo | Stufen | Beispiel auf höchster Stufe | Eigenart |
|---|---|---|---|---|---|---|---|---|---|
| Wolf | dunkler Hund aus „Ninja Adventure" | 38 | 6,5 | 1 | 1,4 s | 62 | 2–5 | Stufe 5: 68 Leben, 10,4 Angriff, 9 Rüstung | schnell, beißt oft, sieht die Figur von Weitem (5 Kacheln) |
| Wildschwein | „Ninja Adventure" | 60 | 8,5 | 6 | 2,2 s | 56 | 4–7 | Stufe 7: 132 Leben, 16,2 Angriff, 18 Rüstung | zäh, schlägt selten, aber hart |
| Fledermaus | „Tiny Dungeon" | 26 | 5,5 | 0 | 1,2 s | 62 | 3–6 | Stufe 6: 52 Leben, 9,6 Angriff, 10 Rüstung | nur in der Höhle, schwach, in Gruppen |
| Goblin | „0x72" | 50 | 8 | 6 | 1,7 s | 60 | 5–9 | Stufe 9: 130 Leben, 17,6 Angriff, 22 Rüstung | – |
| Goblin-Schleuderer | „0x72", violett umgefärbt | 40 | 9,5 | 3 | 1,9 s | 56 | 6–10 | Stufe 10: 112 Leben, 22,3 Angriff, 21 Rüstung | wenig Leben, harter Treffer; **wirft erst ab Meilenstein 13**, bis dahin Nahkampf |

- **Wolf-Ersatz:** Kein Pack hat einen Wolf. Ich habe mich am Bild für den **dunklen Hund**
  (`DogBlack`) entschieden – er sieht mit spitzen Ohren und buschigem Schwanz am ehesten nach
  Wolf aus – und nenne ihn im Spiel „Wolf". Die Hyäne ist kleiner und wirkt eher wie ein Kojote;
  sie liegt als zweites Bild bereit: In `src/data/enemies.ts` beim Wolf `sprite: 'hyaene'`
  eintragen, mehr braucht es nicht.
- **Brutmutter** (`NAMED_ELITES` in `src/data/elites.ts`): Waldspinne Stufe 6 als Elite mit
  Regenerierend + Vampirisch – 270 Leben, 15,3 Angriff, 28 Rüstung. Sie sitzt in der Brutkammer
  am Ende der Spinnenhöhle neben der Truhe (im Plan stand nur „fester Elite-Platz"; die Höhle
  als Ort ist von mir).

**Grünwald, Stand Meilenstein 11** – drei neue Lichtungen, ein Lager, ein Höhleneingang. Das
Gelände aus V1 ist geblieben (derselbe Startwert); außerhalb der neuen Orte stehen nur einzelne
Büsche und Pilze anders. Etwa ein Drittel der alten Gegner (auch der Boss) steht ein paar Kacheln
neben dem alten Platz, weil die Plätze neu ausgewürfelt wurden.

| Ort | Wo | Gegner (Stufe) |
|---|---|---|
| Westlichtung, Pilzhain, Große Lichtung, Ostlichtung, Ruine | wie in V1 | wie in V1 (Tabelle in Abschnitt 9) |
| Südlichtung | wie in V1 | 4 Waldspinnen (5, 5, 5, 6), **neu:** 2 Wildschweine (6, 7) |
| **Wolfshang** | im Norden, Abzweig vom Nordweg | 6 Wölfe (2, 3, 3, 4, 4, 5), Truhe |
| **Eichenhain** | südöstlich der Großen Lichtung, Abzweig vom Weg ins Dorf | 5 Wildschweine (4, 4, 5, 5, 6) |
| **Goblin-Lager** | nördlich des Wegs zur Ostlichtung, Zaun mit Tor nach Süden | 4 Goblins (5, 6, 6, 7), 2 Schleuderer (6, 7), Truhe in der Mitte |
| **Wachposten** | auf dem Weg zur Ruine | 2 Goblins (8, 9), 2 Schleuderer (9, 10) |
| **Höhleneingang** | im Pilzhain oben links | – |

**Spinnenhöhle** – vier Kammern hintereinander, ohne Abkürzung:

| Kammer | Gegner (Stufe) |
|---|---|
| Eingang | – (Leiter nach Grünwald) |
| Fledermaushalle | 4 Fledermäuse (3, 3, 4, 4) |
| Netzkammer | 3 Waldspinnen (4, 5, 5), 2 Fledermäuse (4, 5) |
| Tropfgang | 3 Fledermäuse (5, 5, 6), 2 Waldspinnen (5, 6) |
| Brutkammer | 2 Waldspinnen (6, 6), **Brutmutter** (6, Elite), Truhe |

**Datengetrieben – so ist es jetzt gebaut** (Soll steht in 15.5):

| Was | Wo |
|---|---|
| Zone (Name, Stufen, Tileset, Hintergrund, Aufwach-Punkt) | `src/data/zones.ts` |
| Karten-Bauplan (Größe, Startwert, Gelände-Art, Lichtungen, Wege, Bauten, POIs, Gegnergruppen) | `tools/zones/<zone>.mjs`; `tools/build-map.mjs` baut alle |
| Gelände-Arten | `wald` und `hoehle` (`tools/lib/terrain-*.mjs`) |
| Bilder: Name → Datei und Einzelbilder (Stehen, Laufen) | `src/data/sprites.ts`; Gegner nennen ihr Bild mit `sprite` |
| Figuren aus den neuen Packs | Liste in `tools/lib/creatures.mjs` → `creatures.png` |
| POI-Art → Verhalten | `buildPoi` in `src/scenes/WorldScene.ts` |

- `npm run assets` prüft die Baupläne und bricht mit klarer Meldung ab: unbekannter Gegner,
  unbekannte Elite, POI oder Marker nicht erreichbar, POI-Name doppelt, Portal in eine Zone oder
  zu einem Marker, die es nicht gibt, Zone ohne Eintrag in `zones.ts` (und umgekehrt).
- Beim Start prüft das Spiel, ob es jedes Einzelbild aus `sprites.ts` wirklich gibt.
- **Noch nicht gebaut** (kommt mit dem Meilenstein, der es braucht): `abilities` der Gegner und
  `src/data/abilities.ts` (13), Quests und NPCs (12), Portalsteine, Außenposten und Übergänge am
  Kartenrand (13), Legendär-Effekte und Sets (15, 18). Übergänge stehen nicht in `zones.ts`,
  sondern als POI im Bauplan – dort liegt auch ihr Platz.

**Bewusst so gebaut:**
- Die Höhle ist eine eigene Zone (wie in 15.2 für „Höhle / Gruft" beschrieben), nicht ein Teil
  der Grünwald-Karte. Sie ist der erste Zonenwechsel im Spiel.
- Die 3 Truhen aus dem Plan zählen die in der Höhle mit (2 in Grünwald, 1 in der Brutkammer).
- Die Schwierigkeit gibt bei Truhen keinen Zuschlag auf Gold – sie hängt weiter nur an Gegnern.
- Mehr Gegner heißt mehr EP: Grünwald und Höhle haben zusammen 72 Gegner statt 32. Die
  Levelkurve ist unverändert; ob Stufe 10 jetzt zu schnell kommt, muss das Spielen zeigen.

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
- Name der Figur, Stufe, EP, aktuelles Leben, **Zone** *(seit Meilenstein 11)* und Position darin,
  Gold, Inventar, Ausrüstung, Heiltränke.
- Items, die am Boden liegen, mit Zone, Platz und Liegezeit *(Entschieden, seit Meilenstein 8)*. Die
  3 Minuten bis zum Verschwinden zählen nur Spielzeit – bei geschlossenem Spiel läuft nichts ab.
- Sortiment des Händlers, wann neue Ware kommt und die Rückkauf-Liste (Abschnitt 7b).
- Schwierigkeit: Gegnerleben und Gegnerschaden in Prozent (Abschnitt 15.6). *(seit Meilenstein 10)*
- Respawn-Zeitpunkt besiegter Bosse und benannter Elites, Zeitpunkt, ab dem eine geöffnete Truhe
  wieder gefüllt ist *(beides je Zone, seit Meilenstein 11)*, Spielzeit, Zeitpunkt des letzten
  Speicherns, Format-Nummer.
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
  nach jedem besiegten Gegner), an-/abgelegt, weggeworfen, gekauft, verkauft, zurückgekauft,
  Schwierigkeit geändert, Trank getrunken,
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

**Test-Parameter in der Adresse** (`?stufe`, `?beute`, `?elite`, `?zone`) *(Startwert)*: Ist einer davon
gesetzt, läuft ein **Testlauf** – eine frische „Testfigur", die in keinem Slot liegt. Es wird
nichts geladen und nichts gespeichert, auch der „zuletzt gespielte Slot" bleibt, wie er ist.
Der Händler hat im Testlauf jedes Mal frische Ware. Im Menü steht ein Hinweis mit „Testlauf beenden" (lädt ohne
die Parameter neu). Auch `?elite=1` allein ist ein Testlauf – sonst könnte man in einem echten
Slot Elite-Beute farmen.

**Export/Import:** „Export" lädt den Slot als Datei herunter (`rogoi-offline-Name-Datum.json`,
derselbe Text wie im Browser). „Importieren …" legt eine Datei in den **ersten freien** normalen
Slot und lädt sie nicht von selbst. Sind alle Slots belegt, gibt es eine Meldung – ein Import
überschreibt nie etwas. *(Startwert)*

**Versionsnummer:** `SAVE_VERSION` in `src/data/save.ts`, aktuell **4** (Schritt 10b hat nur
Balancing-Werte geändert – das Format ist geblieben, alte Stände laden unverändert). Ändert sich der Aufbau,
wird sie erhöht und in `MIGRATIONS` (`src/save/saveGame.ts`) eingetragen, wie ein alter Stand ins
neue Format kommt.
- Format 1 (Meilenstein 7) → 2 (Meilenstein 8): Die Einstellungen fallen aus dem Spielstand;
  neu sind Tränke (Start: 0), Items am Boden (Start: keine) und das Händler-Sortiment (Start:
  frische Ware beim ersten Besuch). Alte Spielstände und alte Export-Dateien laden weiter.
- Format 2 → 3 (Meilenstein 10): Neu sind die Schwierigkeit (Start: Normal, 100 / 100) und die
  Rückkauf-Liste des Händlers (Start: leer). Stände aus Format 1 und 2 laden weiter (im Browser
  geprüft mit einem Format-2-Stand).
- Format 3 → 4 (Meilenstein 11): Es gibt mehrere Zonen. Alte Stände spielen in Grünwald weiter:
  Die Figur steht dort an ihrem Platz (ist er inzwischen verbaut, am Startpunkt), Items am Boden
  und der Boss-Timer bekommen die Zone dazu. Neu sind die Zeiten der Truhen (Start: alle gefüllt).
  Im Browser geprüft mit einem Format-3-Stand. Der Boss steht nach dem Umbau der Karte ein paar
  Kacheln woanders – ein gerade laufender Boss-Timer aus einem alten Stand verfällt deshalb
  einmalig (der Boss ist dann sofort wieder da).
- Im Menü „Spielstände" steht bei jedem Slot jetzt auch die Zone.
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

| 9 ✅ | Inhaltsplan | Nur Planung, kein Code: Levelcap und Kurve, Zonen, Endgame, Loot-Vielfalt, Daten-Aufbau, Schwierigkeit, Meilensteine 10–20, Assets (Abschnitt 15) | der Plan steht und die Fragen in 15.9 beantwortet sind |

**Bewusst nicht in V1:** Talentbaum, Aufwerten, Quests, weitere Zonen und Klassen,
Endlos-Turm, Weltbosse, Sound. (Der Räuberhauptmann ist ein fester Zonen-Boss, kein Weltboss.)

Der Talentbaum ist das Erste nach V1 – bei nur 10 Leveln und 9 Punkten trägt er noch
nicht, und er hängt an Skills und Balancing, die erst nach V1 stehen.

Meilenstein 10 (Minimap, Rückkauf, Schwierigkeit), Meilenstein 11 (Zonen-Fundament,
Grünwald-Ergänzung, Abschnitt 9b) und Schritt 10b (Balancing-Fixes, Abschnitt 4b) sind
umgesetzt ✅ – siehe Tabelle in 15.7. Die zweite Fortschrittsachse (Dorfausbau, Jagdbuch,
Meisterschaft) ist in Abschnitt 16 geplant.

**Reihenfolge nach V1:** steht jetzt als Meilensteine 10–20 in Abschnitt 15.7 (ersetzt die
frühere Kurzliste Talentbaum → Quests → Aufwerten → Zone 2 → …).

## 13. Geplante Features

Von dir gewünscht. *(Entschieden)*

| Feature | Wann | Inhalt |
|---|---|---|
| Minimap ✅ | Meilenstein 10, umgesetzt (Abschnitt 2c) | Kleine Übersichtskarte oben rechts im Bild, unter der Knopf-Leiste: Gelände, eigene Position, Gegner in der Nähe, Händler. HUD-Element wie die anderen (ausblenden, Größe, Deckkraft, verschieben – Abschnitt 2b) |
| Große Karte | Meilenstein 13 (mit Zone 2) | Taste `M` öffnet und schließt die Karte der ganzen Zone |
| Nebel des Krieges | optional, zusammen mit Minimap oder großer Karte | Noch nicht besuchte Bereiche der Karte bleiben verdeckt und werden beim Erkunden aufgedeckt |
| Mehr Skills als Plätze | Meilenstein 14, zusammen mit dem Talentbaum | Mit der Zeit 8–10 Skills pro Klasse freischalten, aber nur 4 aktive Plätze. Die Auswahl ist der Build. |
| Legendäre Items mit einzigartigen Effekten | Meilenstein 15 (Liste in Abschnitt 15.4) | Legendäre Items verändern Skills, z. B. „Rundumschlag hinterlässt Feuerspur". |

Oben rechts sitzt die Knopf-Leiste, darunter die Minimap.

## 14. Offene Punkte

1. Aufwerten: Erfolgschancen ab +6 und Kosten pro Stufe – Vorschlag steht in Abschnitt 15.3, Umsetzung in Meilenstein 17.
2. Lauf-Animation: kommt später als Feinschliff, vorerst reicht das Hüpfen. *(Entschieden)*
3. Gegner in Grünwald: „Tiny Dungeon" enthält keine Wölfe, Wildschweine oder Goblins.
   Erledigt *(Entschieden)*: Wolf und Wildschwein kommen nur, wenn ein Pack sie liefert; sonst
   bleibt es bei Ratten, Spinnen, Wegelagerern plus Fledermäusen und Goblins (Abschnitt 15.2).
   Stand Meilenstein 11 *(Umgesetzt)*: Wildschwein, Goblin, Goblin-Schleuderer und Fledermaus sind
   im Spiel. Einen Wolf hat kein Pack; als Ersatz dient der dunkle Hund aus „Ninja Adventure"
   (im Spiel „Wolf"), die Hyäne liegt als zweites Bild bereit (Abschnitt 9b).
4. Skill-Symbole sind vorerst Waffenbilder aus „Tiny Dungeon" (Hammer, Axt, Schwert,
   Schild). Eigene Symbole wären schöner.
5. Mana: beim Krieger gestrichen *(Entschieden)*. Ob der Magier später Mana bekommt, ist offen.
6. Balancing: Levelkurve, Wertezuwachs, Gegnerstufen und Skill-Stufen sind erste
   Schätzungen (Ziel: 2–3 Stunden bis Stufe 10) und müssen im Spiel erprobt werden.
   Mit Ausrüstung ist die Figur deutlich stärker (auf Stufe 10 grob +50 % Angriffskraft). Die
   Rüstung ist seit 5b abgeflacht; ob die Angriffskraft der Ausrüstung auch gebremst werden
   muss oder die Gegner nachziehen, muss das Spielen zeigen. Ohne Ausrüstung kassiert die
   Figur durch die neue Formel etwas mehr (Stufe 10: rund +12 %), Gegner ebenfalls (rund +7 %).
7. Loot-Balancing: Drop-Tabellen (seit 10b 6 % bei normalen Gegnern), Gold pro Gegner, Wertespannen der Affixe und die
   Umrechnung der Attribute sind erste Schätzungen.
8. Händler (Meilenstein 8), von mir gesetzte Startwerte zum Prüfen im Spiel (alle in
   `src/data/shop.ts`): Preisformel und Faktoren, 10 % Erlös (seit 10b), 8 Regalplätze, 60/32/8 %
   Seltenheiten, neue Ware alle 10 Minuten, Trank (40 %, 30 s, höchstens 5, Preis).
   - Erledigt *(Umgesetzt, Meilenstein 10)*: Rückkauf der letzten 10 verkauften Items zum
     Verkaufspreis (Abschnitt 7b).
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
14. Inhaltsplan (Schritt 9): Erledigt – deine Antworten stehen in Abschnitt 15.9. Alle Zahlen im
    Plan bleiben Startwerte fürs Balancing.
15. Meilenstein 10, von mir gesetzte Startwerte zum Prüfen im Spiel:
    - Minimap (`src/data/minimap.ts`): Größe 140 Pixel, Ausschnitt 35 Kacheln, Farben und Größen
      der Punkte. Sie zeigt alle Gegner im Ausschnitt, auch hinter Bäumen.
    - Schwierigkeit (`src/data/difficulty.ts`): Die Belohnung hängt an der Schwierigkeit, mit der
      ein Gegner **erschienen** ist – nicht am Regler im Moment des Sieges. Neuladen der Seite
      lässt alle Gegner mit der aktuellen Schwierigkeit neu erscheinen.
    - „Alles auf Standard" in den Einstellungen lässt die Schwierigkeit unberührt.
    - Im Menü „Spielstände" steht die Schwierigkeit eines Slots noch nicht dabei.
16. Meilenstein 11, von mir gesetzte Startwerte zum Prüfen im Spiel (Abschnitt 9b):
    - Werte, Stufen und Plätze der fünf neuen Gegner; Namen und Lage von Wolfshang, Eichenhain,
      Wachposten und Goblin-Lager; Aufbau der Spinnenhöhle.
    - Wolf = dunkler Hund. Passt das Bild, oder lieber die Hyäne (ein Wort in `enemies.ts`)?
    - Goblin-Schleuderer violett umgefärbt – erkennbar genug, andere Farbe gewünscht?
    - Truhen (`src/data/pois.ts`): 30 Minuten, 1–2 Items, Gold, Seltenheiten. Die Brutmutter
      erscheint nach 10 Minuten wieder.
    - Zone verlassen setzt gewöhnliche Gegner zurück: Kurz aus der Höhle und wieder hinein füllt
      sie komplett auf. Stört das (z. B. als Farm-Trick), bekommen Zonen ein Gedächtnis.
    - Der Wachposten steht direkt auf dem Weg zur Ruine (Stufe 8–10) – der Weg zum Boss ist damit
      schwerer als vorher.
    - Mit 72 statt 32 Gegnern geht das Leveln bis 10 schneller; die Levelkurve ist unverändert.
    - Stilmix: Goblins (0x72) sind kleiner und dunkler als Kenneys Figuren, die Tiere aus
      „Ninja Adventure" haben kräftigere Umrisse.
    - Die vier ZIPs liegen weiter neben den entpackten Ordnern in `assets-src/` (doppelt, rund
      7 MB). Sie können weg, wenn du sie nicht mehr brauchst – gelöscht habe ich sie nicht.

17. Schritt 10b, von mir gesetzte Startwerte zum Prüfen im Spiel (alle in Abschnitt 4b):
    - Regeneration: 8 s Sperre, voll in 120 s (Rasten) bzw. 180 s (Laufen). Fühlt sich das
      Rasten nach Warten an, sind `restingFullSeconds` oder der Trankpreis die Stellschrauben.
    - Der Unterschied Rasten / Laufen ist mit 1,5-fach bewusst klein gehalten (dein Richtwert
      2–3 Minuten). Soll Stehenbleiben deutlicher lohnen: z. B. 90 s und 240 s.
    - „… der Erholung" (Leben pro Sekunde von der Ausrüstung) und Lebensraub sind unverändert
      und wirken auch im Kampf. Gegenüber der gebremsten Regeneration sind sie jetzt viel mehr
      wert: Ein einziges Teil mit 0,5 Leben pro Sekunde ist auf Stufe 1 so stark wie halbes
      Rasten. Nicht angefasst – im Spiel beobachten.
    - Aufwachen im Dorf mit vollem Leben: Sterben ist damit eine (teure) Heilung. Reichen
      10 % Gold und 5 % EP als Preis?
    - Gold: Einkommen rund −40 %, blaues Item rund dreimal so viel Spielzeit wie vorher.
      Tränke 8 / 16 / 26 Gold. Truhen geben rund 40 % weniger Gold.
    - Drops: 6 % statt 10 %, gute Seltenheiten seltener. Elite-Chance (5 %) unverändert.
    - Die Test-Vorlagen (150 Gold auf Stufe 5, 1 500 auf Stufe 10) sind unverändert und damit
      etwas reicher als eine echte Figur.
    - Verfolgt irgendein Gegner die Figur, steht die Regeneration – auch wenn er nie trifft.

---

## 15. Inhaltsplan nach V1 *(Schritt 9 – nur Planung)*

Ziel: Das Spiel soll über Wochen tragen, im MMO-Stil und ohne Seasons. Die Richtung ist seit
deinen Antworten in 15.9 **entschieden** und in den Abschnitten 15.1–15.8 eingearbeitet; alle
Zahlen, Namen und Details sind Startwerte von mir.

### 15.1 Levelcap und Levelkurve

**Levelcap 40** mit vier Zonen zu je 10 Stufen, später erweiterbar bis 60 *(Entschieden – ersetzt
„Maximallevel 60" aus Abschnitt 6)*. Grund: 60 Stufen auf
vier Zonen wären 15–17 Stufen pro Zone mit denselben fünf Gegnertypen, das zieht sich. Mit einer
fünften und sechsten Zone (z. B. Drachenberge) lässt sich das Cap später auf 50 und 60 anheben,
ohne etwas umzubauen – die Kurve ist nur eine Liste in `src/data/progression.ts`. Im Spiel steigt
das Cap schrittweise mit den Zonen: 10 (jetzt) → 20 (Meilenstein 13) → 30 (Meilenstein 16) →
40 (Meilenstein 19).

| Stufen | Zone | Dauer | Minuten je Stufe (Anfang → Ende) | EP je Aufstieg (Anfang → Ende) |
|---|---|---|---|---|
| 1–10 | Grünwald | ca. 3 h (wie jetzt) | 3 → 40 | 120 → 6 600 (unverändert) |
| 10–20 | Orkhügel | ca. 8 h | 40 → 56 | 7 200 → 17 600 |
| 20–30 | Nebelmoor | ca. 14 h | 65 → 103 | 21 500 → 47 900 |
| 30–40 | Aschenfeste | ca. 20 h | 108 → 132 | 51 800 → 81 200 |
| | **Summe bis Stufe 40** | **ca. 45 h** | | |

- Rechenweg: EP für einen Aufstieg = Minuten × 3 × EP eines Gegners auf eigener Stufe
  (10 + 5 × Stufe, wie bisher). Die 3 Gegner pro Minute stammen aus V1 (rund 500 Gegner in
  2–3 Stunden). Beispiel Stufe 20 → 21: 65 × 3 × 110 = 21 450.
- Die Minuten zählen alles: Laufen, Händler, Sterben. Quests sollen pro Zone etwa ein Viertel der
  EP liefern, Elites und Bosse kommen dazu – reine Gegnerzahlen liegen also darunter.
- Bei 1–2 Stunden am Tag sind das 4–6 Wochen bis zum Cap, danach kommt das Endgame (15.3).
- Die genaue Liste (eine Zahl je Stufe) wird beim Umsetzen der jeweiligen Zone gerechnet und
  nach deinem Spieltest nachgestellt.
- Unsicher: ob Gegner (+20 % Leben je Stufe) und Figur (+3 Angriffskraft je Stufe plus
  Ausrüstung) über 40 Stufen gleich schnell wachsen. Das wird je Zone geprüft und in
  `ENEMY_SCALING` bzw. den Grundwerten der neuen Gegner eingestellt.

### 15.2 Zonen

Jede neue Zone ist rund 160 × 120 Kacheln groß (Grünwald: 120 × 90) und hat 60–80 Gegner, einen
**Außenposten** (Händler, Questgeber, Aufwach-Punkt nach dem Tod, Portalstein), einen Zwischenboss,
einen Zonen-Boss und einen Weltboss-Platz. Übergänge laufen über den Kartenrand; zwischen
entdeckten Portalsteinen kann man springen. Das Dorf in Grünwald bleibt der Hub (dort später
Schmied und Turm-Eingang).

**POI-Arten** (gelten für alle Zonen):

| POI | Was passiert dort |
|---|---|
| Lager | Dichte Gegnergruppe hinter Palisaden, in der Mitte eine Truhe |
| Höhle / Gruft | Eigene kleine Karte mit Eingang; enger, mehr Gegner, am Ende Truhe oder Zwischenboss |
| Truhe | Einmal öffnen: Gold und 1–2 Items mit besserer Seltenheit. Füllt sich nach 30 Minuten neu |
| Fester Elite-Platz | Hier steht immer eine benannte Elite mit festen Eigenschaften (Respawn 10 Minuten) |
| Boss-Platz | Zwischenboss oder Zonen-Boss (Respawn 5 Minuten wie der Räuberhauptmann) |
| Weltboss-Platz | Siehe 15.3 |
| Außenposten | Händler, Questgeber, Portalstein |

**Zone 1 – Grünwald (Stufe 1–10), wird ergänzt**

| Neu | Inhalt |
|---|---|
| Gegner | Fledermaus (3–6, nur in der Höhle), Goblin (5–9), Goblin-Schleuderer (6–10; wirft erst ab Meilenstein 13, bis dahin Nahkampf). Wolf und Wildschwein nur, wenn ein Pack sie liefert *(Entschieden)* – Stand Meilenstein 10: **Wildschwein** ist in „Ninja Adventure", ein Wolf in keinem Pack, als Wolf-Ersatz dient **Hyäne oder Hund** (ebenfalls „Ninja Adventure"). Damit 8 Typen. Stufen der beiden Tiere *(Vorschlag)*: Hyäne/Hund 2–5, Wildschwein 4–7; ob Hyäne oder Hund besser passt, entscheide ich beim Einbau am Bild |
| POIs | Spinnenhöhle (unter dem Pilzhain), Goblin-Lager (zwischen Großer Lichtung und Ostlichtung), 3 Truhen, fester Elite-Platz „Brutmutter" (Waldspinne, Stufe 6, Regenerierend + Vampirisch) |
| Boss | Räuberhauptmann (10), wie gehabt |
| Quests (6) | „Rattenplage" (10 Ratten) · „Spinnenseide" (8 Seide sammeln) · „Die Brutmutter" (Elite) · „Goblin-Diebesgut" (5 Kisten im Lager) · „In die Höhle" (Höhlenende erreichen) · „Der Räuberhauptmann" (Boss) |

**Zone 2 – Orkhügel (Stufe 10–20):** karge Hügel, Felsen, Palisaden-Lager.

| | Inhalt |
|---|---|
| Gegner (6) | Ork-Krieger (Nahkampf, viel Leben) · Ork-Speerwerfer (Fernkampf) · Ork-Schamane (heilt andere Orks) · Warg (schnell, stürmt an) · Oger (langsam, harter Schlag mit Ansage – weglaufen hilft) · Goblin-Plünderer (in Gruppen, schwach) |
| Zwischenboss | Oger „Steinfaust" (15) in der Erzmine |
| Zonen-Boss | Kriegshäuptling Grommak (20) in der Ork-Festung, ruft bei 50 % Leben Verstärkung |
| POIs | Außenposten Hügelwacht · 3 Ork-Lager · Erzmine (Höhle) · verfallener Wachturm · 5 Truhen · 2 feste Elite-Plätze (Warg-Rudelführer, Schamanen-Ältester) · Weltboss-Platz |
| Quests (9) | 3 Töte-Quests, 2 Sammel-Quests (Ork-Banner, Erz), 1 Erkunden (Wachturm), 2 Elite-Quests, 1 Boss-Quest |

**Zone 3 – Nebelmoor (Stufe 20–30):** Sumpf mit Stegen, alter Friedhof, Nebel.

| | Inhalt |
|---|---|
| Gegner (6) | Skelett (Nahkampf) · Skelett-Schütze (Fernkampf) · Zombie (langsam, sehr viel Leben) · Moorschleim (teilt sich beim Tod in zwei kleine) · Geist (ignoriert die Hälfte der Rüstung) · Nekromant (beschwört Skelette, bis er fällt) |
| Zwischenboss | „Der Ertrunkene" (25) in der versunkenen Kapelle, vergiftet |
| Zonen-Boss | Lich Morvan (30) in der Gruft, beschwört und heilt sich an seinen Dienern |
| POIs | Außenposten Pfahldorf · Friedhof (Lager) · Gruft und Kapelle (Höhlen) · Hexenhütte (Questgeberin) · 6 Truhen · 2 feste Elite-Plätze · Weltboss-Platz |
| Quests (10) | wie Zone 2, dazu eine kurze Kette (3 Schritte) bis zum Lich |

**Zone 4 – Aschenfeste (Stufe 30–40):** zerstörte Burg auf verbranntem Land, Lava-Risse.

| | Inhalt |
|---|---|
| Gegner (6) | Geisterritter (starke Rüstung) · Kultist (Fernkampf, Feuer) · Imp (schnell, klein, in Rudeln) · Höllenhund (stürmt an, brennt nach) · Dämon (schwer, Flächenschlag mit Ansage) · Feuerelementar (hinterlässt brennenden Boden) |
| Zwischenboss | Der Schwarze Ritter (35) im Burghof |
| Zonen-Boss | Dämonenfürst Azgar (40) im Thronsaal, drei Phasen |
| POIs | Außenposten Letzte Wacht · Burghof, Kaserne (Lager) · Verlies und Thronsaal (Höhlen) · Beschwörungskreise (feste Elite-Plätze, 3) · 6 Truhen · Weltboss-Platz |
| Quests (10) | wie Zone 3, Kette bis zum Dämonenfürsten |

Drachenberge (aus der alten Skizze in Abschnitt 9) wären Zone 5, falls das Cap später steigt.

**Quests** – fünf Arten, alle als Daten: Töten (X Gegner eines Typs), Sammeln (Gegner lassen ein
Quest-Ding fallen, oder Kisten im Lager), Boss, Elite jagen, Erkunden (einen POI erreichen).
Belohnung: EP, Gold und bei Elite-/Boss-Quests ein Item mit fester Mindest-Seltenheit. Wenig Text
(zwei Sätze je Quest), Questlog mit Taste `L`, Zähler unter der Minimap. Dazu je Außenposten ein
**Kopfgeld-Brett** *(Entschieden)*: eine wiederholbare Quest, die alle 30 Minuten wechselt.

Gegner mit Fähigkeiten (Fernkampf, Heiler, Beschwörer …) sind gewollt *(Entschieden)* – der Kampf
darf damit mehr sein als „Ziel anwählen und zuschauen". Die Zonen Orkhügel, Nebelmoor und
Aschenfeste sind mit Namen, Themen und Bossen so in Ordnung *(Entschieden)*.

### 15.3 Endgame-Loop (ab Levelcap)

Vier Dinge greifen ineinander: Weltbosse und Sets geben die besten Items, der Turm misst, wie
stark man ist, und das Aufwerten frisst Gold und Material aus beidem.

- **Alte Zonen bleiben leicht** *(Entschieden)*: Gegner behalten ihre Stufe, es gibt kein
  Hochschalten auf Stufe 40. Folge: Am Cap spielt das Endgame in der Aschenfeste (Elite-Plätze,
  Bosse, Weltboss) und im Turm. Die Weltbosse und Sets der ersten drei Zonen sind Ziele für
  unterwegs – ihre Items haben das Itemlevel der Zone und werden am Cap abgelöst; am Cap sind
  sie leicht und vor allem noch für den Kodex da. Sollte das Endgame dadurch zu dünn werden, ist
  der Turm die Stelle zum Nachlegen (mehr Raum-Vorlagen, eigene Turm-Bosse). Wer es in den alten
  Zonen schwerer will, hat den Schwierigkeitsregler (15.6).
- **Weltbosse:** einer je Zone, Respawn alle 45 Minuten in echter Zeit (wie der Boss, auch bei
  geschlossenem Spiel). Stufe = Obergrenze der Zone (10 / 20 / 30 / 40), Leben ×20, zwei bis drei
  eigene Fähigkeiten. Beute: 3 Items aus der Boss-Tabelle, dazu eine Chance auf ein Set-Teil der
  Zone und Schmiedesteine. Die große Karte zeigt, welcher Weltboss gerade da ist.
  Vorschlag: Sumpfhydra (Nebelmoor), Kriegsmammut (Orkhügel), Uralter Baumhirte (Grünwald),
  Aschendrache (Aschenfeste).
- **Endlos-Turm:** Eingang im Dorf. Jede Ebene ist ein kleiner Raum aus einer Vorlage: alle
  Gegner besiegen (8–12 aus allen Zonen gemischt, dabei mindestens eine Elite), dann geht die
  Treppe auf. Jede 5. Ebene ein Boss. Gegnerstufe = 40 + Ebene, also ohne Obergrenze schwerer.
  Tod = der Lauf ist vorbei (kein EP-/Gold-Verlust). Wiedereinstieg auf der höchsten erreichten
  5er-Ebene *(Entschieden)*. Belohnung: Turmmarken je Ebene (für das Turm-Set beim Turmwächter), bessere
  Seltenheits-Chancen je höher, persönlicher Rekord im Spielstand.
- **Aufwerten beim Schmied** (Regeln aus Abschnitt 7: bis +10, ab +6 Risiko, bei Fehlschlag eine
  Stufe zurück): Jede Stufe gibt +4 % auf alle Werte des Items (+10 = +40 %).

  | Stufe | +1 bis +5 | +6 | +7 | +8 | +9 | +10 |
  |---|---|---|---|---|---|---|
  | Erfolgschance | 100 % | 80 % | 65 % | 50 % | 35 % | 25 % |

  Kosten: Gold (steigt mit Itemlevel, Seltenheit und Stufe) und **Schmiedesteine**. Die fallen
  bei Elites, Bossen, Weltbossen und aus Truhen; außerdem **zerlegt** der Schmied Items zu
  Steinen (je seltener, desto mehr) *(Entschieden)*. So hat auch Ausschuss einen Zweck. Zerlegen
  zählt nicht als Crafting.
- **Kodex:** ein Fenster, das festhält, was man schon geschafft hat – gefundene Legendär-Effekte
  und Set-Teile, besiegte Bosse und Weltbosse, Turm-Rekord. Reines Sammelziel, kein Bonus.
  Das Jagdbuch (Abschnitt 16.3, geplant als Schritt 11c) kommt früher und wird später der erste
  Reiter des Kodex.

Bewusst nicht: Seasons, Paragon-Stufen, Dungeons (bleibt wie in Abschnitt 10 entschieden).

### 15.4 Loot-Vielfalt

**Mehr Affixe** – von 9 auf rund 24. Neu:

| Affix | Wert | Auf |
|---|---|---|
| Robust… | Leben | alles außer Waffe |
| Präzise… | Krit-Chance | Waffe, Handschuhe, Ring |
| Stachelig… | Dornen: Anteil des erlittenen Schadens zurück an den Angreifer | Schild, Brust |
| Flink… | Lauftempo | Stiefel |
| Schützend… | Blockchance (ein geblockter Treffer macht halben Schaden) | Schild |
| Wuchtig… | Schaden des Wuchtschlags | Waffe |
| … des Wirbels | Schaden des Rundumschlags | Waffe, Handschuhe |
| … des Rufers | Dauer des Kriegsschreis | Helm, Amulett |
| … der Wacht | kürzere Abklingzeit des Schildwalls | Schild, Brust |
| … der Eile | kürzere Abklingzeit aller Skills | Amulett, Ring |
| … des Schlächters | Schaden gegen Elite und Boss | Waffe, Ring |
| … des Henkers | Schaden gegen Gegner unter 30 % Leben | Waffe |
| … des Reichtums | mehr Gold | Amulett, Ring, Handschuhe |
| … des Lernens | mehr EP (nützt am Cap nichts – bewusst ein Level-Affix) | Helm, Amulett |
| … des Finders | höhere Chance auf bessere Seltenheit | Amulett, Ring |

**Waffen unterscheiden sich:** Dolch schlägt schneller und schwächer (dafür mehr Krit), Axt
langsamer und stärker, Schwert bleibt die Mitte. Neu dazu: Streitkolben (ignoriert einen Teil der
Rüstung) und Zweihandschwert (stärkste Waffe, sperrt den Schild-Platz). Erledigt Offenen Punkt 9.

**Legendär-Effekte:** Jedes legendäre und mythische Item bekommt zusätzlich zu seinen Affixen
einen Effekt aus einer Liste (mythisch: derselbe Effekt mit stärkerem Wert). Start mit 12:

| Effekt | Wirkung |
|---|---|
| Feuerspur | Rundumschlag hinterlässt 4 Sekunden Feuer am Boden |
| Schneller Schlag | Wuchtschlag löst bei jedem 4. statt jedem 5. Schlag aus |
| Echo | Wuchtschlag trifft mit 40 % ein zweites Ziel |
| Blutrausch | Jeder besiegte Gegner: 5 Sekunden +5 % Angriffstempo, bis zu 5-fach |
| Zweiter Atem | Schildwall heilt beim Auslösen 20 % des Lebens |
| Donnerruf | Kriegsschrei betäubt Gegner in Reichweite für 2 Sekunden |
| Splitter | Kritische Treffer machen 30 % Schaden an Gegnern neben dem Ziel |
| Unbeugsam | Ein tödlicher Treffer lässt 1 Leben übrig (alle 3 Minuten) |
| Sturmschritt | Nach einem besiegten Gegner 3 Sekunden +30 % Lauftempo |
| Vollstrecker | Normale Gegner unter 15 % Leben sterben beim nächsten Treffer |
| Wirbelsturm | Rundumschlag löst schon ab 2 Gegnern aus |
| Vergeltung | Am Ende des Schildwalls: Flächenschaden in Höhe des abgewehrten Schadens |

**Sets** *(Entschieden)*: Set-Teile sind epische Items mit festem Namen und grünem Zusatz „Set"; die sechs
Seltenheiten bleiben. Sie fallen nur bei den benannten Gegnern ihrer Zone (feste Elites, Bosse,
Weltboss) – man weiß also, wo man farmen muss.

| Set | Woher | Teile | Bonus |
|---|---|---|---|
| Wegelagerer-Kluft | Grünwald | 3 | 2 Teile: +15 % Gold · 3 Teile: +10 % Lauftempo |
| Zorn des Häuptlings | Orkhügel | 4 | 2: +10 % Angriffskraft · 4: Kriegsschrei hält doppelt so lang |
| Grabwächter | Nebelmoor | 4 | 2: +3 % Lebensraub · 4: Schildwall löst schon unter 50 % Leben aus, Abklingzeit −20 s |
| Aschenplatte | Aschenfeste | 5 | 2: +15 % Leben · 4: Rundumschlag +50 % Schaden · 5: Treffer setzen Gegner in Brand |
| Turmbezwinger | Turm (Turmmarken) | 5 | 2: +10 % Angriffstempo · 4: +25 % Schaden gegen Elite und Boss · 5: jeder 3. Wuchtschlag ist ein sicherer Krit |

### 15.5 Datengetrieben bauen *(Fundament in Meilenstein 11 umgesetzt – Ist-Stand in Abschnitt 9b)*

Bis Meilenstein 10 war Grünwald fest verdrahtet: `tools/build-map.mjs` baute genau diese eine
Karte, die Szene lud genau diese eine. Der Umbau ist **einmal** passiert (Meilenstein 11), seitdem gilt
(Zeilen zu Fähigkeiten, Bossen mit Phasen, Quests, NPCs, Legendär-Effekten und Sets kommen mit
ihren Meilensteinen):

| Was | Wo es dann steht | Neuer Inhalt braucht Code? |
|---|---|---|
| Zone (Name, Stufenbereich, Tileset, Übergänge, Außenposten, Weltboss) | `src/data/zones.ts` | nein |
| Karten-Bauplan (Größe, Startwert, Gelände-Art, Lichtungen, Wege, POIs, Gegnergruppen) | `tools/zones/<zone>.mjs`, ein allgemeiner Karten-Bauer liest alle | nein, solange die Gelände-Art schon existiert |
| Gegner | `src/data/enemies.ts`, neu mit `sprite` (Name statt Bild-Nummer) und `abilities` (Liste) | nur für eine neue Fähigkeits-Art |
| Fähigkeiten der Gegner (Fernkampf, Heilen, Beschwören, Gift, Anstürmen, Flächenschlag mit Ansage, Teilen beim Tod, Boden-Effekt) | je Art einmal Code, Werte in `src/data/abilities.ts` | einmal je Art, danach frei kombinierbar |
| Bosse | Gegner mit `abilities` und `phases` (ab wie viel Leben was passiert) | nein |
| POIs | Objekte in der Karte mit `type` und Eigenschaften; im Spiel ein Verzeichnis „Art → Verhalten" | nur für eine neue POI-Art |
| Quests und NPCs | `src/data/quests.ts`, `src/data/npcs.ts` | nur für eine neue Quest-Art |
| Bilder | `src/data/sprites.ts`: Name → Datei, Bild-Nummer, Animation | nein |
| Affixe, Legendär-Effekte, Sets | `src/data/items.ts`, `src/data/legendary.ts`, `src/data/sets.ts` | nur für einen neuen Effekt |

- Eine neue Zone ist dann: ein Bauplan, ein Eintrag in `zones.ts`, Gegner, Quests, NPCs, Bilder –
  und `npm run assets`. Code nur, wenn die Zone etwas Neues *kann*.
- `npm run assets` prüft die Daten und bricht mit einer klaren Meldung ab (unbekannter Gegner,
  Quest ohne Ziel, POI nicht erreichbar) – das macht der Karten-Bauer für Gegnergruppen schon.
- Spielstand: aktuelle Zone, entdeckte Portalsteine, Quest-Stand, Zeitpunkte für Truhen, feste
  Elites und Bosse je Zone. Format 4 (seit Meilenstein 11) enthält davon Zone, Truhen, feste
  Elites und Bosse; Portalsteine und Quest-Stand kommen mit den Meilensteinen 12 und 13 dazu.
  Alte Stände laden weiter.
- Ehrlich: Dieser Umbau ist der teuerste Einzelschritt im Plan, und die erste neue Zone danach
  ist noch teurer als die späteren, weil Fernkampf und Co. dort zum ersten Mal gebaut werden.

### 15.6 Schwierigkeitsregler *(Meilenstein 10, umgesetzt)*

Von dir entschieden *(Entschieden)*: vier Knöpfe plus freie Regler, mehr EP und Gold ab über
100 %, **pro Spielstand**. Die Zahlen sind Startwerte von mir, alle in `src/data/difficulty.ts`.

- In den Einstellungen gibt es den Bereich „Schwierigkeit (dieser Spielstand)" mit zwei Reglern: **Gegnerleben** und
  **Gegnerschaden**, je 50–300 % in 10-%-Schritten, Standard 100 %. Dazu vier Knöpfe als
  Abkürzung; der passende ist gelb umrandet.

  | Knopf | Gegnerleben | Gegnerschaden | Belohnung |
  |---|---|---|---|
  | Leicht | 75 % | 75 % | – |
  | Normal | 100 % | 100 % | – |
  | Schwer | 150 % | 130 % | +6 % EP und Gold |
  | Brutal | 220 % | 170 % | +14 % EP und Gold |

- Gilt für alle Gegner, Elites und Bosse, auf ihre fertigen Werte gerechnet (auch die Explosion
  der Eigenschaft „Explosiv"). Eine Änderung wirkt erst auf Gegner, die danach erscheinen –
  mitten im Kampf herunterdrehen bringt also nichts.
- **Belohnung:** Liegen beide Regler über 100 %, gibt es mehr EP und Gold – je 10 Prozentpunkte
  des niedrigeren Reglers +2 %, höchstens +40 % (ab 300 / 300). Unter 100 % gibt es keinen Abzug.
  Drop-Chancen bleiben gleich. Die Belohnung wird beim Erscheinen des Gegners festgelegt: Wer
  erst kurz vor dem Sieg hochdreht, bekommt nichts extra. Das Menü zeigt die aktuelle Belohnung.
- **Pro Spielstand:** Die Schwierigkeit steht im Spielstand (Format 3, Abschnitt 11), jeder Slot
  hat seine eigene. Neue und alte Spielstände starten auf Normal. Sie ist damit die einzige
  Einstellung im Menü, die nicht global ist; „Alles auf Standard" lässt sie in Ruhe.
- Im Testlauf (`?stufe` …) lässt sie sich einstellen, wird aber wie alles dort nicht gespeichert.
- Für später: Im Turm zählt der Rekord nur mit mindestens 100 / 100.

### 15.7 Reihenfolge und Aufwand

„Sitzung" = ein Arbeitsgang mit einem PR wie bisher. Die Schätzungen sind grob; dein Testen und
das Nachstellen von Werten kommen jeweils dazu. Die Versionsnummer folgt weiter dem Meilenstein
(Meilenstein 10 = 0.10.0, Meilenstein 11 = 0.11.0); Zwischenschritte mit Buchstaben zählen die
letzte Stelle hoch (10b = 0.11.1, weil er nach Meilenstein 11 kam; 11b = 0.11.2 …). Die Schritte
11b, 11c und 14b sind die zweite Fortschrittsachse aus Abschnitt 16 – sie sind **Vorschlag**, bis
du die Fragen in 16.6 beantwortet hast. Die Nummern 12–20 bleiben, wie sie waren.

| # | Meilenstein | Inhalt | Aufwand |
|---|---|---|---|
| 10 ✅ | Minimap, Rückkauf, Schwierigkeit | **Minimap** unter der Knopf-Leiste: Gelände, eigene Position, Gegner in der Nähe (rot, Elite gold, Boss lila), Händler; HUD-Element mit Schalter, Größe, Deckkraft, verschiebbar. **Rückkauf:** eigener Reiter beim Händler mit den letzten 10 verkauften Items zum Verkaufspreis; die Liste steht im Spielstand, das älteste fällt raus. **Schwierigkeit** (15.6): zwei Regler plus vier Knöpfe, pro Spielstand, Bonus auf EP und Gold über 100 %. Spielstand Format 3 | 1–2 Sitzungen, klein bis mittel |
| 11 ✅ | Zonen-Fundament | Umgesetzt (Abschnitt 9b). Umbau aus 15.5: Zonen, Karten-Bauer, Bilder-Verzeichnis, POI-Arten Truhe / fester Elite-Platz / Höhle, Zonenwechsel, Spielstand Format 4. Die hochgeladenen Packs einbinden (Figuren von 0x72 und Ninja Adventure neben Kenney, kein Umstellen der vorhandenen Figuren), `CREDITS.md` ergänzen. Grünwald darauf umgestellt und um Höhle, Lager, Truhen, Brutmutter, Fledermaus und Goblins ergänzt; Wolf und Wildschwein nur, wenn ein Pack sie hat – also Wildschwein und als Wolf-Ersatz Hyäne/Hund (15.8) | 2–3 Sitzungen, groß |
| 10b ✅ | Balancing-Fixes | Umgesetzt nach Meilenstein 11 (Abschnitt 4b): Regeneration gebremst (Sperre, Rasten), Gold-Drops, Händlerpreise, Trankpreis, Todesstrafe und Drop-Tabellen neu. Kein neues Spielstand-Format. Dazu der Plan für die zweite Fortschrittsachse (Abschnitt 16) | 1 Sitzung, klein |
| 11b | Dorfausbau *(Vorschlag, 16.2)* | Baumeister im Dorf, Fenster „Dorfausbau", Rathaus, Kontor, Alchemistin, Gasthaus, Lagerhaus mit Lagertruhe; in Grünwald erreichbar sind Stufe 1–2 (Stufe 2 nach dem Räuberhauptmann). Spielstand Format 5 | 1–2 Sitzungen, mittel |
| 11c | Jagdbuch *(Vorschlag, 16.3)* | Kills je Gegnertyp zählen, Ränge mit kleinen Boni, Sammelseite Grünwald, Bosse-Zeile, Fenster (`J`). Spielstand Format 6 | 1 Sitzung, klein bis mittel |
| 12 | Quests | NPCs, fünf Quest-Arten, Questlog (`L`), Zähler im HUD (unter der Minimap), Kopfgeld-Brett (Anzahl der Kopfgelder hängt an der Rathaus-Stufe, 16.2), die 6 Quests in Grünwald | 1–2 Sitzungen, mittel |
| 13 | Zone 2: Orkhügel | Gegner-Fähigkeiten (Fernkampf, Heilen, Anstürmen, Schlag mit Ansage, Verstärkung rufen), Zone mit Außenposten, Portalsteine, große Karte (`M`), Cap 20, neue Assets | 2–3 Sitzungen, groß |
| 14 | Talentbaum und neue Skills | 3 Bäume, 1 Punkt je Stufe (19 Punkte bei Cap 20, 39 bei Cap 40), Zurücksetzen gegen Gold, Taste `T`. Dazu neue Skills auf Stufe 12 / 16 / 20 / 25 / 30 / 35 und die Auswahl „mehr Skills als Plätze" (Abschnitt 13). Erst hier, weil der Baum mit 9 Punkten nicht trägt | 2 Sitzungen, groß |
| 14b | Skill-Meisterschaft *(Vorschlag, 16.4)* | Skills steigen durch Auslösen (Stufe 0–10), Übungsplatz als Gebäude im Dorf. Erst hier, weil es vorher nichts zu wählen gibt und die Rechnung „Skill-Werte nach Talenten" aus Meilenstein 14 stammt | 1 Sitzung, mittel |
| 15 | Loot-Vielfalt | Neue Affixe, Waffen-Unterschiede, zwei neue Waffen, 12 Legendär-Effekte. Dazu *(Vorschlag, 16.4)* die Waffen-Meisterschaft, weil sich die Waffen erst hier unterscheiden | 2 Sitzungen, mittel |
| 16 | Zone 3: Nebelmoor | Zone, Fähigkeiten Beschwören / Gift / Teilen, Cap 30 | 1–2 Sitzungen, mittel |
| 17 | Schmied | Aufwerten bis +10, Items zu Schmiedesteinen zerlegen. Die Schmiede wird ein Gebäude im Dorfausbau (16.2) | 1 Sitzung, mittel |
| 18 | Sets und Weltbosse | Die Sets der bis dahin fertigen Zonen (Grünwald, Orkhügel, Nebelmoor) als epische Items mit Zusatz „Set", je Zone ein Weltboss auf Zonen-Stufe mit Timer und Anzeige auf der Karte | 1–2 Sitzungen, mittel |
| 19 | Zone 4: Aschenfeste | Zone, Fähigkeit Boden-Effekt, Boss mit Phasen, Weltboss und Set der Zone, Cap 40 | 1–2 Sitzungen, mittel |
| 20 | Endgame | Endlos-Turm (Tod beendet den Lauf, Wiedereinstieg alle 5 Ebenen), Turm-Set, Kodex (das Jagdbuch wird sein erster Reiter). Kein Hochschalten alter Zonen (15.3) | 2 Sitzungen, groß |

Zusammen rund 19–28 Sitzungen (davon 4–5 für 10b und die zweite Fortschrittsachse). Der Talentbaum bleibt Meilenstein 14 *(Entschieden)*. Nach Meilenstein 13 gibt es etwa 11 Stunden Inhalt, nach 16 etwa
25, nach 19 etwa 45 plus Endgame. Nicht im Plan und später: zweite Klasse, Sound, Nebel des
Krieges, Lauf-Animation der eigenen Figur, einheitlicher Figuren-Stil (der Stilmix ist vorerst
in Ordnung, 15.9 Frage 2), Cap über 40 mit Zone 5 und 6.

### 15.8 Assets: was fehlt, was ein CC0-Pack löst

**Stand Meilenstein 11:** Die vier Packs sind in `assets-src/` entpackt (`0x72/dungeon-tileset-ii/`,
`ninja-adventure/`, `kenney/roguelike-rpg-pack/`, `kenney/1-bit-pack/`) und stehen in `CREDITS.md`.
Im Spiel sind bisher: Goblin (0x72), Wildschwein und dunkler Hund als Wolf (Ninja Adventure).
Das Roguelike/RPG Pack und das 1-Bit Pack liegen bereit, werden aber noch nicht benutzt.
Am Bild geprüft: 0x72 liefert Truhen (auch mit Öffnen-Animation), Kisten, Leiter und Treppe im
Boden; „Tiny Dungeon" liefert Fledermaus, Geist, Truhen, Höhlenboden und Mauern (alles im Spiel).

*Tabelle vom Stand Meilenstein 10:*

| Datei in `assets-src/` | Pack | Am Inhalt geprüft (Dateiliste) |
|---|---|---|
| `0x72_DungeonTilesetII_v1.7.zip` | 0x72 „16x16 DungeonTileset II" | Ork-Krieger, Ork-Schamane, maskierter Ork, Goblin, Oger, Skelett, Zombies (klein, normal, groß, Eis), Nekromant, Imp, großer Dämon – die meisten mit Stehen und Laufen |
| `ninja-adventure-ohne-audio.zip` | „Ninja Adventure Asset Pack" ohne Audio | **Wildschwein** (`WildBoar`), **Hyäne** (`Hyena`) und mehrere **Hunde** (`Dog…`) sind drin, ein **Wolf nicht** |
| `Roguelike pack.zip` | Kenney „Roguelike/RPG Pack" | ein Kachel-Blatt (`roguelikeSheet`); Wasser und Friedhof schaue ich mir beim Einbau am Bild an |
| `kenney_1-bit-pack.zip` | Kenney „1-Bit Pack" | noch nicht im Einzelnen angesehen |

Die Tabelle darunter ist der Plan aus Schritt 9; „nicht sicher" gilt dort nur noch, wo oben
nichts geprüft ist.

**Vorhanden und noch ungenutzt:** „Tiny Dungeon" hat weitere Figuren (unter anderem Fledermaus,
Geist, Zyklop, Krabbe, Magier, Ritter, Zwerg – genaue Liste prüfe ich beim Einbau am Bild) und
Dungeon-Kacheln (Mauern, Böden, Türen). Das reicht für die Grünwald-Ergänzung, für Höhlen und
für die Turm-Räume. „Tiny Town" hat Burgmauern (schon in der Ruine verwendet).

| Fehlt | Wofür | Lösung | Sicher? |
|---|---|---|---|
| Orks, Goblins, Oger, Skelette, Zombies, Nekromant, Imps, Dämonen | Zonen 1–4 | **0x72 „16x16 DungeonTileset II"** (CC0, itch.io). Figuren mit Steh- und Lauf-Animation, auch große (Oger, großer Dämon) | Lizenz geprüft; Inhalt aus der Erinnerung, beim Einbau prüfen |
| Wolf, Wildschwein, Warg, Höllenhund, Geist-Varianten, Drache, Hydra | Tiere und Weltbosse | **„Ninja Adventure Asset Pack"** von Pixel-Boy (CC0, itch.io), sehr großes 16×16-Pack mit Monstern, Bossen, Kacheln, Effekten, Symbolen, Sound und Musik | Lizenz geprüft; ob genau diese Tiere drin sind, **nicht sicher** |
| Kacheln Hügel / Steppe | Orkhügel | Tiny Town umgefärbt (das Werkzeug setzt schon Kacheln zusammen) plus Felsen aus einem Pack | machbar |
| Kacheln Sumpf, Wasser, Stege | Nebelmoor | Wasser fehlt in Tiny Town. **Kenney „Roguelike/RPG Pack"** (CC0, 16×16, 1 700+ Kacheln) oder Ninja Adventure | Wasser im Kenney-Pack: aus der Erinnerung ja, nicht geprüft |
| Kacheln Friedhof (Grabsteine, Zäune, Gruft) | Nebelmoor | Kenney „Roguelike/RPG Pack" oder Ninja Adventure, sonst selbst gezeichnet | nicht geprüft |
| Kacheln verbrannte Erde, Lava | Aschenfeste | Tiny Town umgefärbt, Lava = umgefärbtes Wasser | machbar |
| Höhlen-Kacheln | Höhlen, Gruft, Verlies | Tiny Dungeon (vorhanden), bei Bedarf Kenney „Roguelike Caves & Dungeons" (CC0) | ja |
| Truhe, Portalstein, Kisten, Palisaden, Banner | POIs | Truhe aus Tiny Dungeon, Rest aus den Packs oder selbst gezeichnet wie die Item-Symbole | teils |
| Symbole für Skills, Talente, Legendär-Effekte, Quests, Karten-Marker | UI | **Kenney „1-Bit Pack"** (CC0, 16×16, einfarbig – lässt sich beliebig einfärben). Löst auch Offenen Punkt 4 | Lizenz und Größe geprüft |
| Geschosse, Feuer, Gift, Heil-Effekt | Gegner-Fähigkeiten | Kleine Formen direkt im Spiel gezeichnet (wie der Waffenschwung) oder Effekte aus Ninja Adventure | ja |
| Neue Item-Symbole (Streitkolben, Zweihandschwert, Schmiedestein, Turmmarke) | Loot | Tiny Dungeon hat Hammer und große Waffen, Rest selbst gezeichnet | ja |
| Weltbosse als große Figuren | Endgame | Große Figuren aus 0x72 bzw. Bosse aus Ninja Adventure; Notlösung: normale Figur ×3 wie beim Boss heute | Notlösung geht immer |
| NPCs (Questgeber, Schmied, Turmwächter) | Außenposten | Tiny Dungeon hat genug Menschen-Figuren | ja |
| Sound und Musik | später | Kenney-Audio-Packs oder Ninja Adventure (alles CC0); das hochgeladene Ninja-Adventure-ZIP ist bewusst ohne Audio | nicht Teil dieses Plans |

Was kein Pack löst:
- **Einheitlicher Stil.** Die Figuren von 0x72 und Ninja Adventure sehen anders aus als Kenneys
  (andere Farben, teils höher als 16 Pixel). Nebeneinander fällt das auf. Der Mix ist
  vorerst in Ordnung *(Entschieden)*; alle Figuren (auch die eigene) auf ein Pack umzustellen
  wäre die sauberste Lösung und bleibt eine spätere Möglichkeit.
- **Deine genauen Wunsch-Gegner.** Was es im Pack nicht gibt, wird umbenannt (wie Wölfe →
  Waldspinnen in V1) oder umgefärbt.
- **Der Download.** Ich komme von hier weder an kenney.nl noch an itch.io. Du lädst die Packs
  selbst nach `assets-src/` ins Repo hoch *(Entschieden)*, am besten vor Meilenstein 11 – erledigt,
  die vier ZIPs liegen dort (Tabelle oben); den Rest (Zuschneiden, Zusammensetzen, `CREDITS.md`)
  mache ich.

### 15.9 Fragen und deine Antworten *(alle entschieden)*

| # | Frage | Deine Antwort | Wo es im Plan steht |
|---|---|---|---|
| 1 | Levelcap 40 oder 60? | Cap 40, später erweiterbar bis 60 | 15.1, Abschnitt 6 |
| 2 | Figuren aus mehreren Packs mischen? | Stilmix ist erstmal in Ordnung | 15.8, Meilenstein 11 |
| 3 | Wer lädt die Packs? | Du lädst sie selbst hoch (als ZIP nach `assets-src/`, Ninja Adventure ohne Audio). Die vier ZIPs liegen seit Meilenstein 10 dort | 15.8, Meilenstein 11 |
| 4 | Orkhügel, Nebelmoor, Aschenfeste? | Ja | 15.2 |
| 5 | Gegner mit Fähigkeiten? | Ja | 15.5, Meilensteine 13 / 16 / 19 |
| 6 | Schwierigkeit: Bedienung, Belohnung, Geltung? | Vier Knöpfe plus freie Regler, mehr EP und Gold über 100 %, pro Spielstand | 15.6, Abschnitt 11, Meilenstein 10 – umgesetzt |
| 7 | Zerlegen beim Schmied trotz „kein Crafting"? | Ja, Zerlegen ist in Ordnung | 15.3, Meilenstein 17 |
| 8 | Sets als epische Items mit Zusatz? | Ja | 15.4, Meilensteine 18 / 19 |
| 9 | Zonen im Endgame auf Maximalstufe? | Nein, alte Zonen bleiben leicht | 15.3 (gestrichen aus Meilenstein 20) |
| 10 | Turm: Tod beendet den Lauf, Wiedereinstieg alle 5 Ebenen? | Ja | 15.3, Meilenstein 20 |
| 11 | Talentbaum als Meilenstein 14? | Ja, wie geplant | 15.7 |
| 12 | Rückkauf: 10 Items, im Spielstand, ältestes fällt raus? | Ja | Abschnitt 7b, Meilenstein 10 – umgesetzt |
| 13 | Kopfgeld-Brett? | Ja | 15.2, Meilenstein 12 |
| 14 | Wolf und Wildschwein? | Nur wenn ein Pack sie liefert. Wildschwein ist in Ninja Adventure, Wolf nicht – Ersatz Hyäne oder Hund | 15.2, 15.8, Meilenstein 11, Offener Punkt 3 |

Zu Abschnitt 15 ist keine Frage offen. Meilenstein 11 und Schritt 10b sind umgesetzt. Neue
Fragen zur zweiten Fortschrittsachse stehen in Abschnitt 16.6; nächster Schritt nach deinen
Antworten: 11b (Dorfausbau) – oder direkt Meilenstein 12 (Quests), falls du die Achse später
willst. Was ich in Meilenstein 11 und 10b selbst festgelegt habe, steht als Startwert in den
Abschnitten 9b und 4b und in den Offenen Punkten 16 und 17.

---

## 16. Zweite Fortschrittsachse *(Schritt 10b, Teil B – nur Planung, kein Code)*

Dem Spiel fehlt neben der Stufe etwas, auf das man hinarbeitet. Drei Systeme sollen das ändern.
Die Richtung (Stadtausbau als Gold-Sink, Jagdbuch, Meisterschaft durch Benutzung) ist von dir
vorgegeben; **alle Gebäude, Stufen, Zahlen, Boni und die Reihenfolge sind Vorschläge von mir**
und gelten erst, wenn du die Fragen in 16.6 beantwortet hast.

### 16.1 Überblick und Grundregeln

| System | Womit man es füllt | Was man bekommt | Wann |
|---|---|---|---|
| Dorfausbau | Gold | Komfort und Wirtschaft (Händler, Tränke, Rasten, Lager) – keine Kampfwerte | Schritt 11b |
| Jagdbuch | besiegte Gegner je Typ | kleine Boni gegen den Typ, je Zone eine Sammelseite mit +1 % Leben / Angriffskraft | Schritt 11c |
| Meisterschaft | Skills auslösen, mit einer Waffenart zuschlagen | der Skill bzw. die Waffenart wird bis zu 20 % / 10 % besser | Skills 14b, Waffen in 15 |

- **Alles hat ein Ende.** „Keine Paragon-Stufen" ist entschieden (Abschnitt 10) – deshalb hat
  jedes System feste Höchststufen statt endloser Stufen.
- **Kleine Boni.** Alles zusammen bringt am Ende höchstens rund +8 % Leben, +8 % Angriffskraft
  (Jagdbuch, vier Zonen), +10 % Waffenschaden und +20 % auf einzelne Skills (Meisterschaft). Das
  wird beim Balancing der Zonen 3 und 4 mitgerechnet.
- **Alles sind Daten** wie bisher: `src/data/town.ts`, `src/data/bestiary.ts`,
  `src/data/mastery.ts`. Im Spielstand stehen nur Zähler und Stufen, die Boni werden daraus
  berechnet – Werte lassen sich also später nachstellen, ohne Spielstände anzufassen.
- **Pro Spielstand**, nicht global (wie Gold und Schwierigkeit).
- **Zeitangaben** rechnen mit 3 Gegnern pro Minute und dem Gold-Einkommen aus Schritt 10b, wenn
  man alle Beute verkauft: rund 1 300 Gold pro Stunde auf Stufe 5, 2 100 auf Stufe 10, 3 000 auf
  15, 4 600 auf 25, 6 200 auf 35, 7 100 auf 40. Bis zum Cap (45 Stunden) sind das zusammen rund
  217 000 Gold. Das ist die Obergrenze – Tränke, Händler-Käufe und später der Schmied gehen davon
  ab, in Wirklichkeit dauert alles eher das Anderthalbfache.

| System | Erste Belohnung | Nebenbei bis zum Cap | Alles fertig |
|---|---|---|---|
| Dorfausbau | erstes Gebäude für 150 Gold: nach rund 15 Minuten | Stufe 1–4 aller Gebäude: rund 16 Stunden Gold-Einkommen (etwa 40 % des Golds bis zum Cap) | 235 000 Gold = rund 37 Stunden Gold-Einkommen; mit Übungsplatz und Schmiede 314 000 = rund 50 Stunden |
| Jagdbuch | Rang 1 nach 10 Gegnern: 3 Minuten | Bronze und Silber fast überall beim Leveln, in Grünwald rund 3 Stunden extra | alle vier Gold-Seiten: rund 35–50 Stunden extra |
| Meisterschaft | Stufe 1 nach rund 30 Minuten | ein Skill auf Stufe 10 nach rund 28 Stunden, eine Waffenart auf Stufe 10 nach rund 11 Stunden | alle 8–10 Skills: rund 55–70 Stunden; eine Waffenart auf Stufe 20: rund 42 Stunden |

### 16.2 Dorfausbau (Stadtausbau als Gold-Sink)

Das Dorf in Grünwald ist der Hub (15.2). Dort steht ein **Baumeister**; bei ihm baut man mit Gold
Gebäude aus. Jedes Gebäude hat Stufe 0–5, Stufe 0 heißt „noch nicht gebaut" (nur das Rathaus
beginnt auf Stufe 1).

**Gebäude und Boni**

| Gebäude | Stufe 1 → 5 | Heute (ohne Ausbau) |
|---|---|---|
| **Rathaus** | begrenzt alle anderen Gebäude auf seine eigene Stufe. Stufe 1 steht von Anfang an (das Dorf gibt es ja schon), Stufe 2–5 brauchen den Sieg über den Zonen-Boss: Räuberhauptmann / Grommak / Lich Morvan / Azgar. Dazu ab Meilenstein 12: 1 / 1 / 2 / 2 / 3 Kopfgelder gleichzeitig am Kopfgeld-Brett | – |
| **Kontor** (Händler) | Regal 9 / 10 / 11 / 12 / 14 Plätze · Anteil Selten 10 / 12 / 14 / 17 / 20 %, ab Stufe 4 dazu 2 % / 4 % Episch · neue Ware alle 9 / 8 / 7 / 6 / 5 Minuten · ab Stufe 3 Knopf „Neue Ware sofort" (kostet so viel wie ein grünes Item der eigenen Stufe – eine kleine Dauer-Ausgabe) | 8 Plätze, 8 % Selten, 10 Minuten |
| **Alchemistin** | Tränke im Gepäck 6 / 7 / 8 / 9 / 10 · Heilung 42 / 44 / 46 / 48 / 50 % · Abklingzeit ab Stufe 3: 25 s, ab Stufe 5: 20 s | 5 Tränke, 40 %, 30 s |
| **Gasthaus** | Rasten: voll in 110 / 100 / 90 / 80 / 70 s · Gold-Verlust beim Tod 9 / 8 / 7 / 6 / 5 % · im Dorf selbst heilt die Figur ab Stufe 1 in 15 s voll | 120 s, 10 % |
| **Lagerhaus** | Lagertruhe im Dorf mit 20 / 40 / 60 / 80 / 100 Plätzen | nur 40 Plätze im Inventar |
| **Übungsplatz** *(erst mit 14b baubar)* | Meisterschaft (16.4) wächst 10 / 20 / 30 / 40 / 50 % schneller; hier werden auch Talente zurückgesetzt | – |
| **Schmiede** *(erst mit Meilenstein 17 baubar)* | höchste Aufwertung +2 / +4 / +6 / +8 / +10; Zerlegen ab Stufe 1 | – |

Bewusst keine Gebäude für Angriffskraft, Leben oder EP: Gold soll Komfort kaufen, keine
Kampfstärke – die kommt weiter aus Stufe, Beute und Talenten.

**Kosten**

| Stufe | Rathaus | jedes andere Gebäude | Rathaus-Stufe frei ab |
|---|---|---|---|
| 1 | – (steht schon) | 150 | sofort |
| 2 | 1 500 | 800 | Räuberhauptmann besiegt (Stufe 10) |
| 3 | 6 000 | 3 500 | Grommak besiegt (Stufe 20) |
| 4 | 20 000 | 10 000 | Lich Morvan besiegt (Stufe 30) |
| 5 | 50 000 | 25 000 | Azgar besiegt (Stufe 40) |
| Summe | 77 500 | 39 450 | |

**Zeitaufwand** – Rathaus (ab Stufe 2) plus die vier Gebäude vom Start (Kontor, Alchemistin, Gasthaus, Lagerhaus):

| Stufe | Kosten zusammen | Man bezahlt sie in | Gold-Einkommen dort | Reine Gold-Spielzeit |
|---|---|---|---|---|
| 1 | 600 | Grünwald (Stufe 3–10) | 1 300 pro Stunde | 30 Minuten |
| 2 | 4 700 | Orkhügel | 3 000 | 1,6 Stunden |
| 3 | 20 000 | Nebelmoor | 4 600 | 4,3 Stunden |
| 4 | 60 000 | Aschenfeste | 6 200 | 9,6 Stunden |
| 5 | 150 000 | Endgame | 7 100 | 21 Stunden |
| Summe | 235 300 | | | rund 37 Stunden |

- Stufe 1–4 kosten zusammen 85 300 Gold – rund 40 % von allem, was man bis zum Cap verdient.
  Stufe 5 ist das Endgame-Ziel.
- Übungsplatz und Schmiede kosten je weitere 39 450 Gold; mit beiden sind es 314 200 Gold, rund
  50 Stunden Gold-Einkommen.
- Die 150 Gold für das erste Gebäude hat man auf Stufe 3 nach rund 15 Minuten zusammen – Gold
  hat damit ab der ersten Viertelstunde ein Ziel.

**Reihenfolge:** Der Spieler wählt frei, nur das Rathaus gibt den Takt vor. Empfohlen und im
Fenster so sortiert: Alchemistin (Tränke sind seit 10b wichtig) → Gasthaus → Kontor →
Lagerhaus, dann jeweils das Rathaus für die nächste Runde.

**Im Spiel:** Baumeister am Dorfplatz (neue POI-Art, steht im Bauplan wie der Händler). Klick
öffnet das Fenster „Dorfausbau": je Gebäude Stufe, was die nächste Stufe bringt, Preis, Knopf
„Ausbauen". Ist etwas gesperrt, steht der Grund da („braucht Rathaus 3 – besiege Grommak").
Zu sehen ist der Ausbau an einem Schild mit Fahne am jeweiligen Haus, das mit der Stufe wechselt
(ein Bild über der Karte – die Karte selbst wird nicht umgebaut). Die Lagertruhe steht am
Lagerhaus und öffnet ein Fenster neben dem Inventar.

| | |
|---|---|
| Passt zu den Zonen | Jede Zone schaltet mit ihrem Boss eine Rathaus-Stufe frei – das Dorf wächst mit der Welt. Die Boni gelten überall, auch bei den Händlern der Außenposten. Portalsteine (Meilenstein 13) bringen einen zum Bauen zurück |
| Passt zum Talentbaum | Keine Überschneidung: Das Dorf gibt keine Kampfwerte. „Talente zurücksetzen gegen Gold" zieht an den Übungsplatz |
| Passt zum Rest | Kopfgeld-Brett (12) hängt am Rathaus, Schmied (17) wird ein Gebäude, das Gasthaus stellt an den Werten aus `src/data/regen.ts` |
| Aufwand | 1–2 Sitzungen, mittel. Neu: `src/data/town.ts`, Baumeister, Fenster, Lagertruhe (das größte Einzelteil). Die Boni hängen an Stellen, die es schon gibt (Händler-Sortiment, Trank, Regeneration, Tod) |
| Spielstand | Format 5: `town` (Stufe je Gebäude) und `stash` (Items der Lagertruhe). Alte Stände: alles Stufe 0, Truhe leer – nichts geht verloren |

### 16.3 Jagdbuch (Bestiarium)

Das Jagdbuch zählt, wie viele Gegner jedes Typs man besiegt hat. Eine Elite zählt fünffach.
Jeder Typ hat fünf Ränge:

| Rang | Besiegt | Belohnung |
|---|---|---|
| 1 Gesichtet | 10 | Eintrag: Bild, Werte (Leben, Angriff, Rüstung, Tempo), Fundorte |
| 2 Bekannt | 50 | +3 % Schaden gegen diesen Typ |
| 3 Erfahren | 150 | 3 % weniger Schaden von diesem Typ |
| 4 Jäger | 350 | +10 % Gold von diesem Typ |
| 5 Meisterjäger | 750 | +10 % Drop-Chance bei diesem Typ (6 % → 6,6 %), goldener Eintrag |

**Sammelseite je Zone:** Jede Zone hat eine Seite mit allen ihren Gegnertypen (Grünwald samt
Spinnenhöhle: 8, die neuen Zonen je 6). Die Seite selbst hat drei Stufen mit einem dauerhaften
Bonus, der überall gilt:

| Seite | Bedingung | Bonus |
|---|---|---|
| Bronze | alle Typen der Zone auf Rang 2 | +1 % Leben |
| Silber | alle auf Rang 3 | +1 % Angriffskraft |
| Gold | alle auf Rang 5 | noch einmal +1 % Leben und +1 % Angriffskraft |

Mit vier Zonen also höchstens +8 % Leben und +8 % Angriffskraft. Unter den Typen steht je Seite
eine **Bosse-Zeile** (feste Elites, Zwischenboss, Zonen-Boss, später Weltboss): 1 / 5 / 20 Siege
= Eintrag / Werte und Fähigkeiten / Stern. Ohne Bonus, reines Sammeln.

**Zeitaufwand** (im Schnitt 3 Gegner pro Minute beim Leveln, 5 in einer alten, leichten Zone):

| Zone | Typen | Gegner beim normalen Leveln | Bronze (50 je Typ) | Silber (150 je Typ) | Gold (750 je Typ) |
|---|---|---|---|---|---|
| Grünwald | 8 | rund 500 | +0,5 Stunden | +2–3 Stunden | +15–18 Stunden |
| Orkhügel | 6 | rund 1 400 | nebenbei | nebenbei | +10–17 Stunden |
| Nebelmoor | 6 | rund 2 500 | nebenbei | nebenbei | +7–11 Stunden |
| Aschenfeste | 6 | rund 3 600 | nebenbei | nebenbei | +3–5 Stunden |

- „Nebenbei" stimmt nur, wenn sich die Gegner halbwegs gleich verteilen; ein seltener Typ braucht
  gezielte Jagd. Alle Gold-Seiten zusammen: rund 35–50 Stunden.
- Grünwald ist am teuersten, weil man dort am kürzesten levelt. Die Schwellen stehen als Liste in
  der Datei und können je Zone verschieden sein.
- Anzeige: Taste `J` und ein Knopf in der Leiste. Fenster mit einem Reiter je Zone; je Typ Bild,
  Zähler, Balken bis zum nächsten Rang und die Boni. Ein neuer Rang gibt eine kleine Meldung.

| | |
|---|---|
| Passt zu den Zonen | Jede neue Zone bringt ihre Seite von selbst mit (die Typen stehen im Bauplan). „Alte Zonen bleiben leicht" (15.3) bekommt damit einen Grund, zurückzukommen |
| Passt zum Talentbaum | Die Typ-Boni gelten nur gegen einen Gegner, die Seiten-Boni sind flach und klein – beides konkurriert nicht mit Talent-Entscheidungen |
| Passt zum Rest | Quests (12) brauchen dasselbe Ereignis „Gegner besiegt" – einmal bauen, zweimal nutzen. Der Kodex (20) übernimmt das Jagdbuch als ersten Reiter; seine eigenen Seiten bleiben ohne Bonus |
| Aufwand | 1 Sitzung, klein bis mittel. Neu: `src/data/bestiary.ts`, Zähler beim Sieg, Fenster. Boni an vier Stellen (Schaden hin und zurück, Gold, Drop-Chance) und bei Leben / Angriffskraft der Figur |
| Spielstand | Ein Format weiter: `bestiary` (Zähler je Typ, Siege je Boss). Alte Stände beginnen bei 0 – bisher wird nichts gezählt, **rückwirkend geht es nicht**. Das spricht dafür, früh damit anzufangen |

### 16.4 Meisterschaft (Skills und Waffen leveln durch Benutzung)

**Skill-Meisterschaft:** Jeder Skill hat Stufe 0–10. Er steigt, wenn er auslöst. Weil die Skills
verschieden oft auslösen, hat jeder seine eigene Schwelle; Stufe n braucht n-mal den Grundwert,
alle zehn Stufen zusammen das 55-Fache.

| Skill | Löst aus (geschätzt, pro Spielstunde) | Grundwert | Bonus je Stufe | Auf Stufe 10 |
|---|---|---|---|---|
| Wuchtschlag | 200 | 100 | +4 Prozentpunkte Schaden | 220 % → 260 % |
| Rundumschlag | 30 | 15 | +3 Prozentpunkte Schaden | 130 % → 160 % |
| Kriegsschrei | 80 | 40 | +0,3 s Dauer | 10 s → 13 s |
| Schildwall | 8 | 4 | −1,5 s Abklingzeit | 60 s → 45 s |

- Zeit: Stufe 1 nach rund 30 Minuten, Stufe 5 nach 7–8 Stunden, Stufe 10 nach rund 28 Stunden –
  jeweils nur, solange der Skill aktiv ist. Mit 8–10 Skills und 4 Plätzen (Meilenstein 14) sind
  das für alle Skills rund 55–70 Stunden.
- Die Auslöse-Zahlen sind geschätzt. Vor dem Einbau zähle ich sie eine Stunde im Spiel mit und
  stelle die Grundwerte danach ein.

**Waffen-Meisterschaft:** Jede Waffenart (Schwert, Axt, Dolch; ab Meilenstein 15 auch Streitkolben
und Zweihandschwert) hat Stufe 0–20. Sie steigt mit jedem Schlag, den man mit dieser Art macht
(rund 1 000 pro Spielstunde); Stufe n braucht 200 × n Schläge.

| | |
|---|---|
| Je Stufe | +0,5 % Schaden mit dieser Waffenart (Stufe 20: +10 %) |
| Stufe 10 und 20 | je ein kleiner Bonus, der zur Waffe passt (15.4). Dolch: +3 % Angriffstempo, dann +3 % Krit-Chance · Axt: +5 % Krit-Schaden, dann 5 % Rüstung ignorieren · Schwert: +2 % Krit-Chance, dann +3 % Schaden |
| Zeit | Stufe 10 nach rund 11 Stunden, Stufe 20 nach rund 42 Stunden mit derselben Waffenart |

**Was daran schwierig ist – ehrlich:**

1. Skills lösen von selbst aus. Solange es nur vier Skills und drei gleiche Waffen gibt, füllt
   sich die Meisterschaft bei jedem gleich – ein zweiter EP-Balken ohne Entscheidung. Erst mit der
   Skill-Auswahl (Meilenstein 14) und unterschiedlichen Waffen (15) gibt es etwas zu wählen.
   Deshalb plane ich sie **nicht** vor Meilenstein 12 ein.
2. Der Talentbaum verbessert Skills ebenfalls (Abschnitt 6, entschieden). Trennung: **Talente
   ändern, wie ein Skill wirkt** (neue Wirkung, große Schritte, Wahl), **Meisterschaft dreht nur an
   einer Zahl** und endet bei rund +20 %. Beide laufen durch dieselbe Rechnung „Werte eines Skills
   nach allen Boni", die mit dem Talentbaum entsteht – noch ein Grund für die Reihenfolge.
3. Waffen-Meisterschaft bindet an eine Waffenart: Wer Schwerter gemeistert hat, freut sich weniger
   über eine bessere Axt. Mit höchstens +10 % ist das gebremst, aber es bleibt (Frage 9).
4. Mit Legendär-Effekten (z. B. „Schneller Schlag") und den neuen Affixen (z. B. „Wuchtig…")
   stapeln sich die Boni auf einzelne Skills. Die Obergrenzen oben sind dafür klein gewählt.

| | |
|---|---|
| Passt zu den Zonen | Neutral – wächst überall mit. Lohnt auch in alten Zonen, weil nur Auslösen und Treffen zählt |
| Passt zum Talentbaum | Ergänzt ihn (siehe Punkt 2). Mit „mehr Skills als Plätze" wird ein gemeisterter Skill ein Grund, bei einem Build zu bleiben – oder ein Ziel, alle zu meistern |
| Passt zum Rest | Der Übungsplatz im Dorf (16.2) beschleunigt sie – Gold fließt so auch hier hinein |
| Aufwand | Skills: 1 Sitzung, mittel (nach Meilenstein 14). Waffen: eine halbe Sitzung zusätzlich in Meilenstein 15. Neu: `src/data/mastery.ts`, Zähler beim Auslösen und Treffen, Anzeige im Skill-Tooltip und ein Reiter im Charakterfenster |
| Spielstand | Ein Format weiter: `mastery` (Zähler je Skill und je Waffenart – gespeichert werden die Zähler, nicht die Stufen). Alte Stände beginnen bei 0 |

### 16.5 Reihenfolge

| Schritt | Was | Warum dort |
|---|---|---|
| **11b** | Dorfausbau | **Vor den Quests.** Antwortet direkt auf dein Feedback „Gold hat zu wenig Verwendung", braucht nichts, was es noch nicht gibt, und Stufe 1–2 lassen sich schon in Grünwald testen. Das Kopfgeld-Brett dockt in Meilenstein 12 an |
| **11c** | Jagdbuch | **Vor den Quests.** Gezählt wird erst ab dem Einbau – je früher, desto weniger geht verloren. Das Ereignis „Gegner besiegt" brauchen die Quests danach ohnehin |
| 12, 13, 14 | Quests, Orkhügel, Talentbaum | wie geplant |
| **14b** | Skill-Meisterschaft, Übungsplatz | **Nicht vor Meilenstein 12**, sondern direkt nach dem Talentbaum (Gründe in 16.4, Punkt 1 und 2) |
| 15 | Loot-Vielfalt **plus Waffen-Meisterschaft** | die Waffen unterscheiden sich erst hier |
| 17 | Schmied **als Gebäude** | Aufwerten war dort schon geplant |
| 20 | Kodex | übernimmt das Jagdbuch als ersten Reiter |

Du hattest „vor Meilenstein 11" geschrieben – der ist schon umgesetzt und gemergt (PR #15), also
heißt es hier „vor Meilenstein 12". Die Nummern 12–20 bleiben; die neuen Schritte bekommen
Buchstaben (wie 5b, 6b, 10b). Mehraufwand: 3–4 Sitzungen.

### 16.6 Offene Fragen an dich

| # | Frage | Mein Vorschlag |
|---|---|---|
| 1 | **Reihenfolge:** Dorfausbau (11b) und Jagdbuch (11c) vor den Quests – oder erst Quests? | 11b und 11c zuerst |
| 2 | **Meisterschaft erst nach dem Talentbaum** (14b), Waffen in 15? Oder früher als reiner „Balken füllt sich"? | wie geplant, nicht früher |
| 3 | **Dorf: nur Komfort** (Händler, Tränke, Rasten, Lager) oder auch Gebäude mit Kampfwerten? | nur Komfort |
| 4 | **Kosten:** Stufe 1–4 fressen rund 40 % des Golds bis zum Cap, Stufe 5 rund 21 Stunden im Endgame. Passt die Größenordnung? | ja, als Startwert |
| 5 | **Rathaus-Stufen an die Zonen-Bosse koppeln?** Dann geht in Grünwald nur Stufe 1–2 | ja |
| 6 | **Sichtbarer Ausbau:** reicht Schild mit Fahne am Haus, oder soll sich das Dorf wirklich verändern (neue Häuser – deutlich mehr Aufwand, eigene Karten-Varianten)? | Schild mit Fahne |
| 7 | **Lagertruhe pro Spielstand** oder eine für alle Slots (dann könnte man Items zwischen Figuren tauschen; braucht eigenen Speicher und eigenen Export)? | pro Spielstand |
| 8 | **Jagdbuch mit Boni** (wie oben) oder reines Sammeln wie der Kodex? Und: Gold-Seite Grünwald kostet 15–18 Stunden in einer leichten Zone – zu viel? | mit Boni; Schwellen als Startwert lassen |
| 9 | **Waffen-Meisterschaft je Waffenart** (bindet an Schwert, Axt …) – gewollt? Alternativen: eine einzige Meisterschaft „Waffen", oder nur Skills | je Waffenart, wegen der kleinen Boni vertretbar |
| 10 | **Zählt das Jagdbuch auf jeder Schwierigkeit?** Auf „Leicht" geht es schneller | ja, immer – sonst wird es kompliziert |
| 11 | **Aus 10b:** Aufwachen im Dorf mit vollem Leben lassen? Mit der langsamen Regeneration ist Sterben eine (teure) Heilung | lassen, im Spiel beobachten |
| 12 | **Aus 10b:** „… der Erholung" und Lebensraub wirken weiter im Kampf und sind jetzt viel mehr wert. Bremsen? | erst spielen, dann entscheiden |
