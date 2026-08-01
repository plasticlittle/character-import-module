---
name: mnm3e-character-creation
description: Create German M&M 3E characters, NPCs, opponents, and compact stat blocks from character descriptions or recursive calls by CreateAdventure/CreateBattle, with power-point audit, power-level checks, and a guaranteed CreateImport subcall that saves a schema-valid MNM3E importer JSON for every created mechanical character.
---

# M&M 3E Character Creation Codex Skill

## Referenzpflicht

Verwende für jede Charaktererschaffung die Datei `references/characterCreation.md` als Regelreferenz. Die Datei enthält die zusammengefassten Regeln zu Power Points, Power-Level-Limits, Abilities, Skills, Advantages, Powers, Effects, Modifiers, Arrays, Descriptors, Complications, Power-Profile-Templates und den vom MNM3E-Importer unterstützten JSON-/Ausführbarkeitsfeldern.

Die `SKILL.md` beschreibt den Ablauf und die Ausgabeanforderungen. Mechanische Details müssen aus `references/characterCreation.md` abgeleitet werden. Wenn eine Regel dort nicht eindeutig genug ist, markiere die Stelle als `GM Review` und triff eine konservative, regelnahe Annahme.

## Recursive Skill Calls

Dieser Skill hat einen garantierten rekursiven Subskill: `.codex/pnp/CreateImport`.

Ein CreateCharacter-Auftrag gilt erst als abgeschlossen, wenn der Charakter gebaut **und** der CreateImport-Unteraufruf ausgefuehrt wurde. Der CreateImport-Unteraufruf ist Pflicht, kein Handoff-Prompt, kein optionaler naechster Schritt und kein To-do.

Fuehre fuer jeden mechanisch erstellten Charakter, NSC, Gegner oder Gegner-Archetyp nach dem PP-/PL-Audit sofort aus:

1. Lies `.codex/pnp/CreateImport/SKILL.md` vollstaendig.
2. Nutze das fertig gepruefte CreateCharacter-Profil als Input fuer CreateImport.
3. Uebergebe Name, Rolle, Actor-Typ, Power Level, Power-Point-Budget, Descriptors, Fraktion, Storyfunktion, Powers inklusive Effect-Ausführbarkeitsdaten, Skills, Advantages, Defenses, Complications, PP-Audit, PL-Audit und Zielpfad.
4. Schreibe das Import-JSON in den von CreateImport vorgesehenen Zielordner, normalerweise `Charaktere/<slug>.json` neben der aufrufenden Charakter-, Abenteuer- oder Kampfdatei.
5. Validiere das JSON mit `python3 .codex/pnp/CreateImport/scripts/validate_character_json.py <json-datei>`.
6. Korrigiere Validierungsfehler sofort und validiere erneut.
7. Verlinke das erzeugte JSON im Charakterprofil oder melde den Pfad und den Validierungsstatus im Parent-Artefakt.

Wenn kein Zielpfad aus Nutzerangabe, vorhandener Charakterdatei oder Parent-Skill ableitbar ist, frage genau eine kurze Rueckfrage nach dem Speicherziel. Ohne Speicherziel darf CreateCharacter nicht als fertig gemeldet werden.

Wenn dieser Skill von `.codex/pnp/CreateAdventure` oder `.codex/pnp/CreateBattle` aufgerufen wird, ist der Aufruf trotzdem verbindlich auszufuehren:

1. Lies `references/characterCreation.md`.
2. Nutze die vom Parent-Skill uebergebenen Angaben zu Name, Rolle, Powerlevel, Descriptors, Fraktion, Kampfziel und Storyfunktion.
3. Erzeuge mindestens ein spielbares Profil mit Complications, Powers, Defenses, Skills und PL-/PP-Audit.
4. Schreibe oder aktualisiere die gewuenschte Charakterdatei, wenn der Parent-Skill eine Ablage vorgibt.
5. Fuehre danach zwingend `.codex/pnp/CreateImport` fuer dasselbe Profil aus.
6. Gib im Parent-Artefakt Links oder Status zum erzeugten Charakterprofil und zum validierten Import-JSON an.

Wenn der Parent-Skill nur ein Kampf-Kurzprofil braucht, darf die Markdown-Ausgabe kompakter sein. Der CreateImport-Unteraufruf bleibt trotzdem Pflicht: Erzeuge fuer den Import ein vollstaendiges JSON-Profil oder markiere im JSON-`notes` klar `GM Review`, wenn das Profil als Encounter-Archetyp bewusst weniger fein ausgearbeitet ist. Mechanisch relevante Werte, Kernaktionen, Complications und PL-/PP-Audit duerfen nicht fehlen.

## Erwarteter Input

Der Skill erwartet als Input eine freie oder strukturierte Beschreibung eines Charakters. Idealerweise enthält der Input:

- Vorname und Nachname des Charakters,
- Powerlevel des Charakters,
- besondere Fähigkeiten oder Talente,
- Charakterzüge, Motivation, Schwächen oder Eigenheiten,
- besondere Powers oder übernatürliche/technologische Effekte,
- besondere Skills, Beruf, Training oder Fachgebiete,
- optional: Power Level, Power-Point-Budget, erlaubte Zusatzquellen, gewünschtes Format,
- optional: Connection zu Spielercharakteren oder zur bisherigen Story.

Fehlende Elemente werden nicht als Fehler behandelt. Ergänze sie passend, plausibel und konsistent mit dem vorhandenen Input. Frage nur dann nach, wenn eine explizite Nutzervorgabe ohne Klärung nicht erfüllbar ist.

## Standardannahmen

Wenn nicht anders angegeben:

- Power Level: 10.
- Power Points: 150.
- Setting: Emerald City.
- Ton: moderner Superhelden-Comic mit bodenständigem Alltagsanker.
- Quellen: Core-Regeln aus `references/characterCreation.md`; optionale Super-Powered Advantages und Power Profiles nur verwenden, wenn sie ausdrücklich passen oder als optionale GM-Entscheidung markiert werden.
- Keine automatische Verbindung zu bestehenden Spielercharakteren, laufender Kampagnenhandlung oder wichtigen Canon-Figuren.

## Umgang mit fehlenden Input-Elementen

Wenn Vorname oder Nachname fehlen, erzeuge einen passenden Namen. Der Name soll zu Herkunft, Alter, Kultur und Kampagnen-Kontext passen, ohne Klischees zu überzeichnen.
Wenn besondere Fähigkeiten fehlen, leite sie aus Beruf, Herkunft, Persönlichkeit oder Powers ab. Trenne dabei zwischen normalen Fähigkeiten, Skills, Advantages und Powers.
Wenn Charakterzüge fehlen, ergänze mindestens drei prägende Eigenschaften: eine Stärke, eine soziale Eigenheit und eine Schwäche oder innere Spannung.

Wenn besondere Powers fehlen, entwickle ein zusammenhängendes Power-Konzept mit klaren Descriptors. Powers müssen effects-based und importer-ready gebaut werden: kein Power-Name ohne Effect, Rank, Action, Range, Duration, Resistance, Modifiers, Kosten und Ausführbarkeitsdaten für den Importer.

Wenn Skills fehlen, wähle Skills passend zu Beruf, Alltag, Training und Teamrolle. Vermeide reine Kampfoptimierung, außer der Input verlangt sie.
Wenn Complications fehlen, erzeuge mindestens zwei passende Complications als Hero-Point-Trigger. Complications geben keine Power Points.

## Emerald-City-Biografie

Erzeuge für jeden Charakter eine Biografie, die sich neutral in die Welt der in diesem Vault vorliegenden Kampagne einpasst.

Neutral bedeutet:

- Der Charakter kann in Emerald City leben, arbeiten, studieren, ermitteln oder aktiv sein, ohne bestehende Spielercharaktere oder laufende Storylines zu überschreiben.
- Keine direkte Beziehung zu Spielercharakteren, Kampagnenereignissen, Teams, Schurken oder wichtigen NSCs erfinden, außer der Input verlangt dies ausdrücklich.
- Emerald City darf als lokaler Rahmen genutzt werden: Nachbarschaften, Medien, Forschung, Behörden, Hafen, Universitäts-/Tech-Umfeld, lokale Unternehmen, soziale Konflikte und Superhelden-Alltag können generisch eingebunden werden.
- Der Charakter soll anschlussfähig sein: Die Biografie soll Hooks bieten, aber keine bereits entschiedenen Plot-Fakten setzen.

Wenn der Input eine Connection zu einem Spielercharakter oder zur bisherigen Story verlangt, baue diese Connection gezielt ein und markiere sie in der Ausgabe separat als `Requested Connection`. Erfinde keine zusätzlichen Connections.

## Arbeitsablauf

1. Input normalisieren: Explizite Angaben extrahieren und fehlende Felder markieren.
2. Fehlende Felder plausibel ergänzen.
3. Konzept und Rolle formulieren.
4. Emerald-City-neutrale Biografie schreiben.
5. M&M-3E-Build auf Basis von `references/characterCreation.md` erstellen.
6. Powers effects-based und importer-ready bauen, inklusive Descriptors, Modifiers und Ausführbarkeitsdaten für jeden importierten Effect.
7. Advantages, Skills und Complications passend zum Konzept wählen.
8. Power-Point-Kosten berechnen.
9. Power-Level-Limits prüfen.
10. Unklare oder optionale Elemente als `GM Review` markieren.
11. `.codex/pnp/CreateImport` mit dem fertigen Profil ausfuehren, JSON speichern und validieren.
12. Finale Ausgabe strukturiert liefern und den CreateImport-Pfad samt Validierungsstatus nennen oder im Zielprofil verlinken.

## Ausgabeformat

Gib standardmäßig in deutscher Sprache aus. Nutze die folgende Struktur:

```yaml
input_analysis:
  provided:
    first_name:
    last_name:
    abilities_or_talents: []
    personality_traits: []
    powers: []
    skills: []
    requested_connections: []
  inferred:
    first_name:
    last_name:
    abilities_or_talents: []
    personality_traits: []
    powers: []
    skills: []
    assumptions: []

biography:
  public_identity:
  emerald_city_context:
  origin:
  personality:
  current_status:
  plot_hooks: []
  requested_connections: []

character:
  name:
  power_level:
  power_points_total:
  concept:
  role:
  descriptors: []
  abilities:
    STR:
    STA:
    AGL:
    DEX:
    FGT:
    INT:
    AWE:
    PRE:
  defenses:
    Dodge:
    Parry:
    Fortitude:
    Toughness:
    Will:
  skills: []
  advantages: []
  powers: []
  complications: []

audit:
  pp_breakdown:
    abilities:
    defenses:
    skills:
    advantages:
    powers:
    equipment:
    total:
    expected:
    delta:
  pl_checks:
    skill_caps:
    attack_effect_caps:
    resisted_effect_caps:
    dodge_toughness:
    parry_toughness:
    fortitude_will:
  gm_review_flags: []
create_import:
  required: true
  json_path:
  validation:
  status:
```

Wenn der Nutzer ein kompakteres oder erzählerisches Format verlangt, darf die Ausgabe angepasst werden. Kosten-Audit und Power-Level-Audit müssen trotzdem enthalten sein.

Der Abschnitt `create_import` darf nicht entfallen. Wenn in eine Vault-Datei geschrieben wird, verlinke dort das JSON mit einem sichtbaren Task- oder Status-Eintrag, z. B. `#taskcreateimport ... VALID`.

## Mechanische Mindestanforderungen

Jede Power muss mindestens enthalten:

- Name,
- Descriptors,
- Effect oder Effect-Kombination,
- Rank,
- Action,
- Range,
- Duration,
- Resistance, falls vorhanden,
- Extras,
- Flaws,
- Flat Modifiers,
- finaler PP-Kostenwert,
- kurze Regel- und Erzählbeschreibung.

Jeder importierte Power-, Equipment-, Vehicle- oder Base-Effect muss zusätzlich die vom Importer unterstützten Ausführbarkeitsfelder enthalten oder bewusst als nicht ausführbar modelliert werden:

- `activation.type.value`: `none`, `standard`, `move`, `free` oder `reaction`.
- `action.type.value`: `attack`, `control`, `defense`, `general`, `movement` oder `sensory`.
- `activation.duration.type.value`: `instant`, `concentration`, `sustained`, `continuous` oder `permanent`.
- `activation.range.type.value`: `personal`, `close`, `ranged`, `perception` oder `rank`.
- optional `activation.range.area.value`: `burst`, `cloud`, `cone`, `cylinder`, `line`, `perception` oder `shapeable`.
- optional `activation.range.multiplier.value`: `positive` fuer Extended Range oder `negative` fuer Diminished Range.
- `activation.check`, `action.roll.attack` und `action.roll.resist` jeweils mit `rollType.value` `none` oder `required`, passendem `targetScore` und Formel, wenn `required`.
- optional `activation.consume` und `activation.uses` fuer verbrauchte Ressourcen, maximale Nutzungen, verbleibende Nutzungen und Nutzungsperiode.

Verlasse dich nicht auf Importer-Fallbacks, wenn eine Power spielrelevant per Sheet geklickt, gewuerfelt oder widerstanden werden soll. Schreibe Attack Powers mit Required-Attack-Roll, Widerstandseffekte mit Required-Resist-Roll und nicht aktive Dauer-/Schutz-/Sinnes-Effekte mit `activation.type.value: none`.

Jede Attack Power muss für die PL-Prüfung einen Attack/Effect-Eintrag liefern. Perception-Range oder andere Effekte ohne Attack Check müssen gegen das Effekt-Rang-Limit geprüft werden.

Jede Skill-Auswahl muss Total Modifier und PL-Cap-Relevanz prüfen.

Jede Defense-Auswahl muss die Paare Dodge/Toughness, Parry/Toughness und Fortitude/Will prüfen.

## Stilregeln

Schreibe klar, knapp und spielfertig. Trenne Erzählung und Mechanik. Erfinde nur so viel, wie für einen spielbaren Charakter nötig ist. Kennzeichne Annahmen sichtbar, aber integriere sie nicht unsicher in den Regelteil.

Vermeide Power-Gaming ohne Konzeptbezug. Wenn eine starke mechanische Option gewählt wird, erkläre kurz, warum sie zum Charakter passt.

Nutze Emerald City als Bühne, nicht als Besitz des Charakters. Der Charakter darf Bedeutung haben, aber nicht automatisch zentrale Setting-Fakten kontrollieren.
