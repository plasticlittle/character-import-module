# characterCreation.md — M&M 3E Charaktererschaffung Referenz

Diese Datei ist die Regel- und Strukturreferenz für den Skill `mnm3e-character-creation`. Sie enthält die zusammengefassten Grundlagen für Mutants & Masterminds 3E Charaktererschaffung, Power-Point- und Power-Level-Prüfung, Abilities, Skills, Advantages, Powers, Effects, Modifiers, Arrays, Descriptors, Power-Profile-Templates, Complications und die vom MNM3E-Importer unterstützten JSON-/Ausführbarkeitsfelder.

Der Skill muss diese Datei als Referenz verwenden und daraus die mechanischen Details ableiten. `SKILL.md` enthält die operative Arbeitsweise, diese Datei enthält den notwendigen Regel- und Baukontext.

---

# M&M 3E Character Creation Codex Skill

## Zweck

Nutze diesen Skill, um Charaktere für Mutants & Masterminds 3rd Edition regelkonform zu entwerfen, zu prüfen, zu erklären und als maschinenlesbares Profil auszugeben. Der Skill arbeitet effects-based: Powers werden nie nur als Namen behandelt, sondern immer als regeltechnische Kombination aus Effect, Rank, Action, Range, Duration, Resistance, Descriptors, Extras, Flaws, Flat Modifiers und finalen Kosten.

Der Skill soll als Referenz für folgende Aufgaben dienen:

- vollständige Charaktererschaffung ab Konzept,
- Audit vorhandener Charaktere,
- Umwandlung von Konzepten in regeltechnische Builds,
- Power- und Array-Design,
- Auswahl und Bewertung von Advantages, Skills und Complications,
- Power-Level- und Power-Point-Validierung,
- Erstellung von Codex-kompatiblen YAML/JSON-Profilen.

## Grundprinzipien

1. Frage zuerst nach fehlenden Pflichtparametern, wenn sie entscheidend sind: Power Level, verfügbare Power Points, Kampagnenstil, erlaubte Bücher/Optionen, gewünschtes Ausgabeformat.
2. Standardannahme, falls nicht anders angegeben: Power Level 10, 150 Power Points, Hero's Handbook core rules, optionale Quellen nur nach Rückfrage oder Kennzeichnung.
3. Gib keinen Charakter als fertig aus, ohne Kosten-Audit und Power-Level-Audit.
4. Nutze keine Power-Namen ohne mechanischen Build. „Fire Blast“ bedeutet z. B. Ranged Damage mit passenden Descriptors, nicht eine eigenständige Regelkategorie.
5. Markiere GM-Entscheidungen klar, besonders bei Descriptors, Arrays, Variable, Immunity, Removable, optionalen Advantages und Power Profiles Templates.
6. Verwende Power Profiles als Template-Katalog, nicht als Ersatz für Core Effects.
7. Verwende Super-Powered Advantages und Proficiency nur, wenn die Kampagne optionale Regeln erlaubt.
8. Complications geben keine Power Points. Sie sind Hero-Point-Trigger und müssen als narrative und mechanische Auslöser beschrieben werden.
9. Wenn ein Import-JSON erzeugt wird, nutze nur Felder, Item-Typen, Kostenarten, Active Effects und Ausführbarkeitsoptionen, die der MNM3E-Importer validieren und nach Foundry schreiben kann.

## Charakterbau-Workflow

Führe Charaktererschaffung in dieser Reihenfolge aus:

1. Konzept erfassen: Name, Rolle, Herkunft, Power-Quelle, Kampagnen-Ton, Descriptors.
2. GM-Vorgaben prüfen: Power Level, Power Points, verbotene Powers, Pflicht-Descriptors, erlaubte Quellen.
3. Power Level setzen.
4. Abilities kaufen.
5. Defenses ableiten und ggf. erhöhen.
6. Skills kaufen.
7. Advantages kaufen.
8. Powers bauen: Effects, Ranks, Modifiers, Descriptors, Arrays, Devices, Removable usw.; für importierte Effects zusätzlich Aktivierung, Aktionstyp, Dauer, Reichweite, Würfe, Verbrauch und Nutzungen festlegen.
9. Mindestens zwei Complications definieren.
10. Details ergänzen: Identität, Aussehen, Motivation, Hintergrund, Teamrolle.
11. Kosten-Audit durchführen.
12. Power-Level-Audit durchführen.
13. Fehler korrigieren oder legale Alternativen vorschlagen.
14. Finales Charakterprofil ausgeben.

## Harte Formeln

### Start-Power-Points

Standard: `Start-PP = Power Level * 15`

Beispiele:

| PL | Start-PP |
|---:|---:|
| 5 | 75 |
| 8 | 120 |
| 10 | 150 |
| 12 | 180 |
| 15 | 225 |
| 20 | 300 |

### Trait-Kosten

| Trait | Kosten |
|---|---:|
| Ability | 2 PP pro +1 Ability Rank |
| Defense | 1 PP pro +1 Defense Rank |
| Skill | 1 PP pro 2 Skill Ranks |
| Advantage | 1 PP pro Advantage Rank |
| Power | `((base effect cost + extras - flaws) * rank) + flat modifiers` |

### Power-Level-Limits

Für PL `N` gilt:

- Skill total modifier <= `N + 10`.
- Attack bonus + effect rank <= `2N`.
- Resisted effect ohne Attack Check <= `N`.
- Dodge + Toughness <= `2N`.
- Parry + Toughness <= `2N`.
- Fortitude + Will <= `2N`.

Trade-offs sind erlaubt. Beispiel: Ein PL 10 Charakter darf Attack +12 / Damage 8 oder Attack +8 / Damage 12 haben, aber nicht Attack +12 / Damage 10.

## Datenmodell

Nutze dieses Modell für YAML oder JSON-Ausgabe.

```yaml
character:
  name: string
  player: optional string
  power_level: number
  power_points_total: number
  concept: string
  origin: string
  role: string
  descriptors: [string]
  abilities:
    STR: number
    STA: number | null
    AGL: number
    DEX: number
    FGT: number
    INT: number
    AWE: number
    PRE: number
  defenses:
    Dodge:
      base_from: AGL
      purchased: number
      total: number
    Parry:
      base_from: FGT
      purchased: number
      total: number
    Fortitude:
      base_from: STA
      purchased: number
      total: number
    Toughness:
      base_from: STA | null
      protection: number
      defensive_roll: number
      total: number
    Will:
      base_from: AWE
      purchased: number
      total: number
  skills:
    - name: string
      ability: string
      ranks: number
      misc: number
      total: number
      trained_only: boolean
      action: string
      notes: string
  advantages:
    - name: string
      type: Combat | Fortune | General | Skill | Optional | Proficiency
      ranks: number
      cost: number
      effect_summary: string
      limits: string
  powers:
    - name: string
      descriptors: [string]
      device: boolean
      removable: none | removable | easily_removable
      array_group: optional string
      total_cost: number
      effects:
        - effect: string
          rank: number | string
          action: string
          range: string
          duration: string
          resistance: string | null
          importer_execution:
            activation_type: none | standard | move | free | reaction
            action_type: attack | control | defense | general | movement | sensory
            duration_type: instant | concentration | sustained | continuous | permanent
            range_type: personal | close | ranged | perception | rank
            area_type: null | burst | cloud | cone | cylinder | line | perception | shapeable
            range_multiplier: null | positive | negative
            activation_check: none | required
            attack_roll: none | required
            resist_roll: none | required
            consume: optional string
            uses: optional string
          base_cost_per_rank: number | string
          extras:
            - name: string
              cost: string
              ranks: optional number
          flaws:
            - name: string
              value: string
              ranks: optional number
          flat_modifiers:
            - name: string
              value: number
          final_cost: number
          notes: string
  complications:
    - type: string
      name: string
      trigger: string
      effect_in_play: string
      hero_point_condition: string
  audit:
    pp_breakdown:
      abilities: number
      defenses: number
      skills: number
      advantages: number
      powers: number
      equipment: number
      total: number
      expected: number
      delta: number
    pl_checks:
      skill_caps: pass | fail
      attack_effect_caps: pass | fail
      resisted_effect_caps: pass | fail
      dodge_toughness: pass | fail
      parry_toughness: pass | fail
      fortitude_will: pass | fail
    gm_review_flags: [string]
```

## Importer-kompatible Ausgabe

Wenn CreateCharacter CreateImport füttert oder selbst ein Importprofil vorbereitet, muss die Ausgabe zu `schemas/mnm3e-character.codex-skill.schema.json` passen. Die kurze Charakterantwort darf freier sein, aber das mechanische Profil muss genug Informationen enthalten, damit CreateImport daraus ein valides JSON bauen kann.

### Dokumentstruktur

- Root-Felder: optional `$schema`, Pflicht `schemaVersion: "1.0.0"`, `actor`, `expected`.
- `actor.type`: `character` oder `npc`.
- `actor.externalId`: stabil und im ganzen Dokument eindeutig; erlaubt sind Buchstaben/Zahlen plus `_ . : -`, beginnend mit Buchstabe oder Zahl.
- `actor.activeEffects` und jedes `item.activeEffects` sind importierbar und werden vom Importer nach Foundry-root `effects` geschrieben.
- Top-Level-Items dürfen nur `advantage`, `power`, `equipment`, `vehicle` oder `base` sein.
- Verschachtelung: `power.system.effects[]` enthält `effect`; `power.system.powerArray[]` enthält `power`; `effect.system.modifiers[]` enthält `modifier`; `equipment`, `vehicle` und `base` enthalten `system.effects[]`.
- Jedes Item darf `externalId`, `name`, `type`, `img`, `system`, `activeEffects` und `flags` haben. Für Merge-Updates sollten alle mechanischen Items eine eindeutige `externalId` haben.
- Common-Effect-Items verwenden `description.value/chat`, `summary.format/position`, `activation`, `action`, `rank` und `cost`.
- `modifier.system.expressions[]` ist importierbar; nutze es nur, wenn der MNM3E-System-Modifikator diese Ausdrucksdaten tatsächlich braucht, sonst `[]`.
- `vehicle.system.info` unterstützt `size`, `strength`, `speed`, `defense`, `toughness`, `powers`, `features`; `base.system.info` unterstützt `size`, `toughness`, `features`.
- Nicht importieren: derived Felder wie `total`, `pointCosts`, `equipmentCost`, `totalCost`, `summary.parsed`, `summary.data`, `isTrained`, `targetScore.label`, Override-Bookkeeping oder bereits vorbereitete Systemdaten.

### Actor-System

Für `character` müssen alle bekannten Felder gesetzt sein, auch wenn ein Wert 0 oder leer ist:

- Abilities: `str`, `sta`, `agl`, `dex`, `fgt`, `int`, `awe`, `pre` jeweils `{ rank }`.
- Defenses: `dge`, `pry`, `frt`, `tgh`, `wil` jeweils `{ rank, ability }` mit den korrekten Basis-Abilities.
- Attributes: `powerLevel`, `equipmentPoints`, `initiative`, `penaltyPoints`, `movement`.
- Movement: `burrowing`, `flight`, `leaping`, `speed`, `swim`, `teleport`.
- Skills: `acr`, `ath`, `cco`, `dec`, `exp`, `ins`, `itm`, `inv`, `prc`, `per`, `rco`, `slt`, `ste`, `tec`, `tre`, `vhc`.
- Dynamische Skills sind `cco`, `exp`, `rco`; ihre Subskill-IDs müssen mit einem Buchstaben beginnen und dürfen nur Buchstaben, Zahlen, `_` und `-` enthalten.
- Skill-`actions` dürfen `standard`, `move`, `free` und `reaction` enthalten.
- Info-Felder: `groupAffiliation`, `identity`, `baseOfOperations`, `background`, `notes`, `complications`, `gender`, `age`, `eyes`, `height`, `weight`, `hair`, `origins`, `relationships`, `assets`.

### Kostenfelder

Importer-Kosten verwenden überall dieselbe Struktur:

```json
{
  "rank": 8,
  "cost": {
    "type": "perRank",
    "value": 2,
    "discountPer": 1
  }
}
```

Erlaubte `cost.type`-Werte:

- `perRank`: `value` wird zum Kostenwert pro Rang addiert.
- `flat`: `value * rank` wird als flat cost addiert; bei unranked flat modifiers nutze `rank: 1`.
- `discount`: nach der Effektkosten-Summe wird `total / discountPer * value` addiert, typischerweise mit negativem `value`.

Importer-Kostenlogik:

- Powerkosten = Summe der `system.effects[]` plus `powerArray.length`.
- Equipmentkosten = mindestens 1 oder die Effektkosten, je nachdem was höher ist; Equipment-PP im Charakterbudget kommen normalerweise über den Advantage `Equipment`.
- `powerArray`-Alternativen dürfen nicht teurer sein als die unmittelbare Parent-Power.
- Das Schema hat kein eigenes Feld für Dynamic Alternate Effect. Wenn eine dynamische Alternative regeltechnisch 2 PP kosten soll, dokumentiere den Aufpreis als Kostenannahme und markiere `GM Review`, sofern CreateImport ihn nicht explizit als separaten Modifier abbildet.
- Negative oder fractionale Kosten müssen im PP-Audit zur M&M-Regel passen; der Importer validiert Struktur und rechnet Vorschauwerte, ersetzt aber keine GM-Entscheidung.

### Active Effects

Active Effects sind für dauerhafte Foundry-Automation importierbar. Nutze sie nur für Werte, die das MNM3E-System per ActiveEffect wirklich verändern soll, nicht als Ersatz für normale Power-Beschreibung.

```json
{
  "label": "Enhanced Dodge",
  "icon": "icons/svg/aura.svg",
  "disabled": false,
  "changes": [
    {
      "key": "data.defenses.dge.rank",
      "mode": 2,
      "value": "2",
      "priority": 20
    }
  ]
}
```

Erlaubt sind zusätzlich `duration`, `origin`, `transfer` und `flags`. `changes[].mode` ist 0 bis 5.

### Ausführbarkeit von Effects

Jeder importierte `effect`, außerdem `advantage`, `modifier` und `vehicle` mit Common-Effect-Feldern, kann Foundry-Ausführungsdaten tragen. Für Power-Effekte sind diese Felder Pflicht im Skill-Profil, wenn der Effekt im Sheet nutzbar, würfelbar oder widerstehbar sein soll.

Alle Werte liegen im Import-JSON als Wrapper vor, z. B. `"type": { "value": "standard" }`.

`activation` beschreibt, wie der Effekt aktiviert oder genutzt wird:

- `activation.type.value`: `none`, `standard`, `move`, `free`, `reaction`.
- `activation.check`: optionaler Aktivierungswurf, z. B. Check Required.
- `activation.consume.type/target/amount`: optionale verbrauchte Ressource.
- `activation.duration.type.value`: `instant`, `concentration`, `sustained`, `continuous`, `permanent`.
- `activation.range.type.value`: `personal`, `close`, `ranged`, `perception`, `rank`.
- `activation.range.area.value`: `null`, `burst`, `cloud`, `cone`, `cylinder`, `line`, `perception`, `shapeable`.
- `activation.range.multiplier.value`: `null`, `positive` für erhöhte Reichweite, `negative` für verminderte Reichweite.
- `activation.uses.amount.value`: verbrauchte Nutzungen pro Aktivierung, meist 0 oder 1.
- `activation.uses.max.value`: maximale Nutzungen oder `null`.
- `activation.uses.remaining`: verbleibende Nutzungen, darf nicht höher als `max.value` sein.
- `activation.uses.per.value`: Nutzungsperiode als Text oder `null`, z. B. `scene`, `day`, `session`.

`action` beschreibt, welche Art Spielaktion im Sheet ausgelöst wird:

- `action.type.value`: `attack`, `control`, `defense`, `general`, `movement`, `sensory`.
- `action.roll.attack`: Angriffswurf gegen Defense oder custom DC.
- `action.roll.resist`: Widerstandswurf oder Widerstands-DC.

Roll-Details haben immer diese Struktur:

```json
{
  "rollType": { "value": "required" },
  "formula": {
    "value": [
      { "op": "+", "dataPath": "skills.rco.data.Energy-Blast.total" },
      { "op": "+", "dataPath": "formula", "value": "2" }
    ]
  },
  "targetScore": {
    "type": { "value": "defenses.dge.total" },
    "custom": { "value": "" }
  }
}
```

Roll-Detail-Regeln:

- `rollType.value`: `none` oder `required`.
- Wenn `required`, muss `formula.value` mindestens einen Eintrag haben.
- `formula.value[].op`: `+` oder `-`.
- `formula.value[].dataPath`: gültiger Actor-Pfad oder `formula`.
- Bei `dataPath: "formula"` muss `value` eine nichtleere Formel sein, z. B. `@rank`, `10 + @rank` oder `15 + @rank`.
- Gültige Actor-Pfade sind `abilities.<id>.total`, `defenses.<id>.total`, statische Skill-Pfade wie `skills.prc.data.total`, dynamische Skill-Basen `skills.cco.base`, `skills.exp.base`, `skills.rco.base` und dynamische Subskills wie `skills.rco.data.Energy-Blast.total`.
- Dynamische Subskill-Pfade sind nur gültig, wenn der Subskill in `actor.system.skills.cco/exp/rco.data` angelegt wurde.
- `targetScore.type.value`: gültiger Actor-Pfad, `custom` oder leer.
- Wenn `targetScore.type.value` `custom` ist, muss `targetScore.custom.value` ein sichtbares Label haben, z. B. `Toughness DC`, `Will DC` oder `DC 15`.

### Ausführbarkeits-Defaults

Der Importer ergänzt fehlende Details defensiv, aber CreateCharacter soll für spielrelevante Effekte explizite Werte liefern.

Wenn `action.type.value` fehlt, setzt der Importer `general`. Daraus folgen Default-Werte:

| action.type | activation.type | duration | range | attack roll |
|---|---|---|---|---|
| attack | standard | instant | ranged | required |
| control | standard | instant | ranged | none |
| defense | none | permanent | personal | none |
| general | standard | instant | personal | none |
| movement | move | sustained | personal | none |
| sensory | none | sustained | personal | none |

Widerstandswürfe defaulten auf `none`; wenn ein Effekt widerstanden wird, setze `action.roll.resist.rollType.value: required` explizit. Der Default-DC ist `15 + @rank` für Damage/Toughness und sonst `10 + @rank`, aber bei Affliction, Weaken, Nullify, Area und Alternate Resistance sollte der Skill den DC und das Ziel immer selbst setzen.

### Empfohlene Power-Mappings

| Regelbuild | action.type | activation | range | attack | resist |
|---|---|---|---|---|---|
| Close Damage | attack | standard, instant | close | required gegen `defenses.pry.total`, Formel `skills.cco...` oder `abilities.fgt.total` | required, custom `Toughness DC`, Formel `15 + @rank` |
| Ranged Damage | attack | standard, instant | ranged | required gegen `defenses.dge.total`, Formel `skills.rco...` oder `abilities.dex.total` | required, custom `Toughness DC`, Formel `15 + @rank` |
| Perception Damage | attack | standard, instant | perception | none | required, custom `Toughness DC`, Formel `15 + @rank` |
| Area Damage | attack | standard, instant | ranged oder rank plus Area | none | required, meist Dodge für halben Effekt plus Toughness-Notation in Beschreibung |
| Affliction | attack oder control | standard, instant | close/ranged/perception | nach Range | required, custom `Fortitude DC`, `Will DC` oder `Dodge DC`, Formel `10 + @rank` |
| Weaken | attack oder control | standard, instant | close/ranged/perception | nach Range | required, Fortitude oder Will, Formel `10 + @rank` |
| Protection | defense | none, permanent oder sustained bei Force Field | personal | none | none |
| Immunity | defense | none, permanent | personal | none | none |
| Speed, Flight, Teleport | movement | Free/Move nach Core Effect | personal oder rank | none | none |
| Senses, Concealment, Remote Sensing | sensory | none oder free nach Core Effect | personal, perception oder rank | none | none |
| Create, Move Object, Environment, Transform | control | standard oder nach Build | close/ranged/rank | required nur bei gezieltem Angriff | required, wenn Ziel widersteht |

Wenn ein Effekt regeltechnisch zwei Zielwürfe braucht, z. B. Area Damage mit Dodge für halben Effekt und anschließend Toughness, kann der Importer nur einen primären `action.roll.resist`-Block direkt modellieren. Lege den wichtigsten Klick-/Roll-Block dort ab und notiere den zweiten Widerstand klar in `description.value` oder als `GM Review`.

### Minimales JSON-Snippet für einen ausführbaren Ranged Damage Effect

```json
{
  "name": "Energy Blast",
  "type": "effect",
  "system": {
    "rank": 10,
    "cost": { "type": "perRank", "value": 2, "discountPer": 1 },
    "summary": { "format": "@name @rank", "position": "" },
    "description": { "value": "Ranged Damage 10, resisted by Toughness.", "chat": "" },
    "activation": {
      "type": { "value": "standard" },
      "check": {
        "rollType": { "value": "none" },
        "formula": { "value": [] },
        "targetScore": { "type": { "value": "custom" }, "custom": { "value": "DC" } }
      },
      "consume": {
        "type": { "value": "" },
        "target": { "value": null },
        "amount": { "value": null }
      },
      "duration": { "type": { "value": "instant" } },
      "range": {
        "area": { "value": null },
        "type": { "value": "ranged" },
        "multiplier": { "value": null }
      },
      "uses": {
        "amount": { "value": 0 },
        "max": { "value": null },
        "per": { "value": null }
      }
    },
    "action": {
      "type": { "value": "attack" },
      "roll": {
        "attack": {
          "rollType": { "value": "required" },
          "formula": {
            "value": [
              { "op": "+", "dataPath": "abilities.dex.total" }
            ]
          },
          "targetScore": { "type": { "value": "defenses.dge.total" }, "custom": { "value": "" } }
        },
        "resist": {
          "rollType": { "value": "required" },
          "formula": {
            "value": [
              { "op": "+", "dataPath": "formula", "value": "15 + @rank" }
            ]
          },
          "targetScore": { "type": { "value": "custom" }, "custom": { "value": "Toughness DC" } }
        }
      }
    },
    "modifiers": []
  }
}
```

## Abilities

Abilities starten bei 0. Erhöhung um +1 kostet 2 PP. Senkung um –1 gibt 2 PP zurück. Übliche Untergrenze ist –5; darunter gelten Debilitation- oder Absent-Ability-Sonderregeln.

| Kürzel | Ability | Primäre Funktionen |
|---|---|---|
| STR | Strength | Nahkampfschaden, Heben, Tragen, Werfen, Athletics |
| STA | Stamina | Toughness, Fortitude, Gesundheit, körperliche Widerstandsfähigkeit |
| AGL | Agility | Dodge, Initiative, Acrobatics, Stealth |
| DEX | Dexterity | Ranged Attack Checks, Sleight of Hand, Vehicles |
| FGT | Fighting | Close Attack Checks, Parry |
| INT | Intellect | Expertise, Investigation, Technology, Treatment |
| AWE | Awareness | Will, Insight, Perception |
| PRE | Presence | Deception, Intimidation, Persuasion |

Enhanced Abilities sind Powers, kosten grundsätzlich gleich wie normale Ability Ranks, können aber nullified werden, Modifiers haben und Power Stunts erlauben.

## Skills

Skill Check:

`d20 + skill rank + ability modifier + miscellaneous modifiers`

Kosten:

`1 PP = 2 Skill Ranks`

| Skill | Ability | Untrained? | Typische Aktion |
|---|---|---|---|
| Acrobatics | AGL | Nein | Move oder Free |
| Athletics | STR | Ja | Move |
| Close Combat | FGT | Ja | Standard |
| Deception | PRE | Ja | Standard |
| Expertise | INT | Nein, Ausnahmen möglich | Variabel |
| Insight | AWE | Ja | Free |
| Intimidation | PRE | Ja | Standard |
| Investigation | INT | Nein | Variabel |
| Perception | AWE | Ja | Free |
| Persuasion | PRE | Ja | Variabel |
| Ranged Combat | DEX | Ja | Standard |
| Sleight of Hand | DEX | Nein | Standard |
| Stealth | AGL | Ja | Move |
| Technology | INT | Nein | Standard |
| Treatment | INT | Nein | Standard |
| Vehicles | DEX | Nein | Move |

Skill-Kategorien:

- Interaction Skills: Deception, Intimidation, Persuasion, teils Insight/Fascinate-Kontexte. Ziel muss wahrnehmen und verstehen können. Mindless oder mental absent targets sind meist immun.
- Manipulation Skills: brauchen geeignete Gliedmaßen, Strength oder Precise Power Effect.
- Expertise ist jeweils ein eigener Skill pro Wissens-/Berufsfeld.

## Core Advantages

Advantages kosten 1 PP pro Rang. Ranked Advantages können mehrfach gekauft werden, sofern Limit nicht überschritten wird.

### Combat Advantages

| Advantage | Effekt |
|---|---|
| Accurate Attack | Bis –5 Effect, gleicher Bonus auf Attack. |
| All-out Attack | Bis –5 Dodge/Parry, gleicher Bonus auf Attack. |
| Chokehold | Restrained Grab löst Suffocation aus. |
| Close Attack | +1 Close Attack pro Rang, PL-limitiert. |
| Defensive Attack | Bis –5 Attack, gleicher Bonus auf Dodge/Parry. |
| Defensive Roll | +1 active Toughness pro Rang; entfällt bei vulnerable/defenseless. |
| Evasion | Bonus gegen Area Effects. |
| Fast Grab | Nach Unarmed Hit kostenloser Grab Check. |
| Favored Environment | +2 Attack oder Defense in definierter Umgebung. |
| Grabbing Finesse | DEX statt STR für Grab. |
| Improved Aim | Doppelte Aim-Boni. |
| Improved Critical | Threat Range +1 pro Rang für gewählten Angriff, max. 16–20. |
| Improved Defense | +2 active defense bei Defend Action. |
| Improved Disarm | Keine Disarm-Penalty, kein Gegen-Disarm. |
| Improved Grab | Einarmig grabben, nicht vulnerable beim Grab. |
| Improved Hold | Gegner –5 zum Entkommen. |
| Improved Initiative | +4 Initiative pro Rang. |
| Improved Smash | Keine Penalty gegen gehaltene Objekte. |
| Improved Trip | Keine Trip-Penalty, bessere Kontrolle über opposed check. |
| Improvised Weapon | Nutzt Unarmed-Skill für improvisierte Waffen, +Damage pro Rang. |
| Move-by Action | Vor und nach Standard Action bewegen. |
| Power Attack | Bis –5 Attack, gleicher Bonus auf Effect. |
| Precise Attack | Ignoriert Cover/Concealment-Penalties für Close/Ranged-Kombinationen. |
| Prone Fighting | Keine üblichen Prone-Angriffsprobleme. |
| Quick Draw | Waffe als Free Action ziehen. |
| Ranged Attack | +1 Ranged Attack pro Rang, PL-limitiert. |
| Redirect | Nach Trick fehlgeleiteten Angriff auf anderes Ziel lenken. |
| Set-up | Interaction-Vorteil auf Allies übertragen, 1 Ally pro Rang. |
| Takedown | Extra-Angriffe gegen Minions nach Incapacitate. |
| Throwing Mastery | +1 Damage mit Wurfwaffen pro Rang. |
| Uncanny Dodge | Nicht vulnerable durch Surprise/Caught Off-Guard. |
| Weapon Bind | Free Disarm nach erfolgreicher Active Defense. |
| Weapon Break | Free Smash nach erfolgreicher Active Defense. |

### Fortune Advantages

| Advantage | Effekt |
|---|---|
| Beginner's Luck | Hero Point für 5 temporäre Skillränge in einem Skill. |
| Inspire | Hero Point + Standard Action für Ally-Bonus, +1 pro Rang bis +5. |
| Leadership | Hero Point + Standard Action, entfernt Dazed/Fatigued/Stunned von Ally. |
| Luck | 1 Reroll pro Rang pro Session, meist max. 1/2 PL. |
| Seize Initiative | Hero Point, zu Kampfbeginn zuerst handeln. |
| Ultimate Effort | Hero Point, bestimmter Check zählt als 20. |

### General Advantages

| Advantage | Effekt |
|---|---|
| Assessment | Insight erkennt relative/exakte Combat-Werte. |
| Benefit | Bedeutender Status-, Rechts-, Ressourcen- oder Sondervorteil. |
| Diehard | Automatisch stabilisieren beim Dying. |
| Eidetic Memory | Perfektes Gedächtnis, Bonus zum Erinnern, Expertise-Sondernutzung. |
| Equipment | 5 Equipment Points pro Rang. |
| Extraordinary Effort | Zwei Extra-Effort-Benefits, höherer Erschöpfungspreis. |
| Fearless | Immun gegen Fear. |
| Great Endurance | Bonus bei Erschöpfung, Atem, Hunger, Durst, Umwelt, Suffocation. |
| Instant Up | Von prone zu standing als Free Action. |
| Interpose | Einmal/Runde Angriff für Ally übernehmen. |
| Minion | Minion mit 15 PP pro Rang. |
| Second Chance | Einmaliger Reroll gegen spezifischen Hazard/Check. |
| Sidekick | Sidekick mit 5 PP pro Rang, kein Minion. |
| Teamwork | +5 Team Checks, Aid, Team Attacks. |
| Trance | Todesähnliche Meditation mit Atem-/Resistance-Vorteilen. |

### Skill Advantages

| Advantage | Effekt |
|---|---|
| Agile Feint | Feint/Trick mit Acrobatics oder Movement Speed. |
| Animal Empathy | Interaction Skills normal mit Tieren. |
| Artificer | Temporäre magische Devices mit Expertise: Magic. |
| Attractive | +2/+5 auf passende Deception/Persuasion. |
| Connected | Favors über Persuasion. |
| Contacts | Gather Information in 1 Minute. |
| Daze | Deception oder Intimidation kann Dazed verursachen. |
| Fascinate | Interaction/Expertise kann Entranced erzeugen. |
| Favored Foe | Bonus bei Deception, Intimidation, Insight, Perception gegen Kategorie. |
| Hide in Plain Sight | Hide ohne Diversion, wenn Cover/Concealment erreichbar. |
| Improvised Tools | Ignoriert oder reduziert Tool-Penalty. |
| Inventor | Temporäre Devices mit Technology. |
| Jack-of-all-trades | Alle Skills untrained nutzbar. |
| Languages | Zusätzliche Sprachen; Anzahl verdoppelt pro Rang. |
| Ritualist | Magische Rituale mit Expertise: Magic. |
| Skill Mastery | Routine Checks unter Druck für gewählten Skill. |
| Startle | Feint mit Intimidation. |
| Taunt | Demoralize mit Deception. |
| Tracking | Tracks mit Perception verfolgen. |
| Well-informed | Sofortiger Check, um etwas über Person/Situation zu wissen. |

## Optionale Super-Powered Advantages

Nutze diese nur, wenn optionale Regeln erlaubt sind. Behandle sie als vorkonstruierte Mini-Powers oder Advantage-Power-Hybride.

| Advantage | Effekt |
|---|---|
| Ancestral Enmity | +1 circumstance attack bonus gegen eng definierte Feindkategorie. |
| Backstab | +Damage bei Surprise Attack, max. 1/2 PL empfohlen. |
| Cold Breath | Cone Area Affliction: Hindered, Immobile, Paralyzed; STR-basierter DC. |
| Deflect Arrows | Deflect-Rang als Active Defense gegen passende Angriffe. |
| Ghost Punch | Unarmed Alternate Effect mit Affects Insubstantial. |
| Holy Strike | –2 Attack für +2 Effect mit holy descriptor. |
| Inner Light | Licht erzeugen, darkness concealment reduzieren/countern. |
| Massive Damage | +1 Damage mit bestimmtem Close Attack pro Rang, PL-limitiert. |
| Massive Knockback | Statt Damage Ziel nach STR minus Mass wegschleudern. |
| Monastic Training | Halber Bedarf an Essen, Wasser, Schlaf. |
| Natural Immunity | Immun gegen natürliche Krankheiten/Gifte. |
| Power Moves | –2 Close Attack für +2 Damage. |
| Rage | Sustained STR/STA-Bonus, Defense/Close-Attack-Penalty. |
| Shadowmeld | Stealth-Bonus in Low-Light und stationär. |
| Shockwave | Burst Area Affliction gegen Bodenziele. |
| Stunning Strike | Melee Attack als Fortitude-Affliction statt Damage. |
| Super-breath | Cone Area Move Object zum Push/Pull. |
| Trackless Step | Keine Spuren in natürlichen Gebieten. |
| Thunderclap | Burst Area Fortitude-Affliction durch Schockwelle. |
| Weapon Style: Archery | Stance: +2 ranged attack mit Fernwaffen. |
| Weapon Style: Dual Weapon | Stance: +2 close attack mit zwei Einhandwaffen. |
| Weapon Style: Single Weapon | Stance: +2 Parry mit einer Einhandwaffe. |
| Weapon Style: Two-Hander | Stance: +2 Damage mit Zweihandwaffe. |
| Weapon Style: Weapon and Shield | Stance: +1 Dodge und +1 Parry. |
| Withstand Damage | Dodge/Parry senken, Toughness erhöhen. |
| Woodland Stride | Natürliches Unterholz ohne Beeinträchtigung durchqueren. |

Optionale Proficiency-Regeln:

- Nicht-proficient: typischerweise –5 auf passende Attack oder Skill Checks.
- Armor non-proficiency kann Attack und Active Defenses senken.
- Proficiency Advantages: Archaic Weapons Proficiency, Armor Proficiency, Improvised Weapons Proficiency.

## Power Effects

Core Effects sind Bausteine. Beispiel-Powers wie Blast, Force Field, Mind Control oder Magic sind vordefinierte Builds aus diesen Effects.

| Effect | Cost | Action | Range | Duration | Resistance | Kernfunktion |
|---|---:|---|---|---|---|---|
| Affliction | 1/rank | Standard | Close | Instant | Fortitude oder Will | Conditions nach Degrees. |
| Burrowing | 1/rank | Free | Personal | Sustained | — | Durch Erde/Fels graben. |
| Communication | 4/rank | Free | Rank | Sustained | — | Fernkommunikation. |
| Comprehend | 2/rank | None | Personal | Permanent | — | Sprachen/Symbole/Kommunikation verstehen. |
| Concealment | 2/rank | Free | Personal | Sustained | — | Sinnesbasierte Verbergung. |
| Create | 2/rank | Standard | Ranged | Sustained | — | Objekte/Barrieren erschaffen. |
| Damage | 1/rank | Standard | Close | Instant | Toughness | Schaden verursachen. |
| Deflect | 1/rank | Standard | Ranged | Instant | — | Angriffe abwehren. |
| Elongation | 1/rank | Free | Personal | Sustained | — | Reichweite/Körper strecken. |
| Enhanced Trait | base trait | Free | Personal | Sustained | — | Trait als Power kaufen. |
| Environment | 1-2/rank | Standard | Rank | Sustained | — | Umweltbedingungen ändern. |
| Extra Limbs | 1/rank | None | Personal | Permanent | — | Zusätzliche Gliedmaßen. |
| Feature | 1/rank | None | Personal | Permanent | — | Kleiner Effekt mit Spielrelevanz. |
| Flight | 2/rank | Free | Personal | Sustained | — | Fliegen, Speed Rank = Effect Rank. |
| Growth | 2/rank | Free | Personal | Sustained | — | Größe, STR, STA, Masse hoch; Defense/Stealth runter. |
| Healing | 2/rank | Standard | Close | Instant | — | Damage Conditions heilen. |
| Illusion | 1-5/rank | Standard | Perception | Sustained | Awareness/Insight | Falsche Sinneseindrücke. |
| Immortality | 2/rank | None | Personal | Permanent | — | Rückkehr vom Tod. |
| Immunity | 1/rank | None | Personal | Permanent | — | Auto-Erfolg gegen definierte Effekte. |
| Insubstantial | 5/rank | Free | Personal | Sustained | — | Fluid/Gas/Energy/Incorporeal. |
| Leaping | 1/rank | Free | Personal | Instant | — | Übermenschliche Sprünge. |
| Luck Control | 3/rank | Reaction | Perception | Instant | — | Hero Points/Luck beeinflussen. |
| Mind Reading | 2/rank | Standard | Perception | Sustained | Will | Gedanken lesen. |
| Morph | 5/rank | Free | Personal | Sustained | — | Aussehen ändern. |
| Move Object | 2/rank | Standard | Ranged | Sustained | Strength | Objekte auf Distanz bewegen. |
| Movement | 2/rank | Free | Personal | Sustained | — | Spezialbewegungen. |
| Nullify | 1/rank | Standard | Ranged | Instant | Rank/Will | Effekte eines Deskriptors negieren/countern. |
| Protection | 1/rank | None | Personal | Permanent | — | Toughness erhöhen. |
| Quickness | 1/rank | Free | Personal | Sustained | — | Aufgaben schneller erledigen. |
| Regeneration | 1/rank | None | Personal | Permanent | — | Schneller heilen. |
| Remote Sensing | 1-5/rank | Free | Rank | Sustained | — | Sinne an entfernten Ort verlagern. |
| Senses | 1/rank | None | Personal | Permanent | — | Sinne verbessern/erweitern. |
| Shrinking | 2/rank | Free | Personal | Sustained | — | Kleiner werden. |
| Speed | 1/rank | Free | Personal | Sustained | — | Bodengeschwindigkeit. |
| Summon | 2/rank | Standard | Close | Sustained | — | Minion/Creature beschwören. |
| Swimming | 1/rank | Free | Personal | Sustained | — | Schwimmgeschwindigkeit. |
| Teleport | 2/rank | Move | Rank | Instant | — | Sofortige Bewegung. |
| Transform | 2-5/rank | Standard | Close | Sustained | — | Materie transformieren. |
| Variable | 7/rank | Standard | Personal | Sustained | — | Flexibler 5-PP-Pool pro Rang. |
| Weaken | 1/rank | Standard | Close | Instant | Fortitude oder Will | Traits temporär reduzieren. |

## Beispiel-Powers und Aliase

Behandle diese als Templates, nicht als neue Grundeffekte:

| Name | Mechanik |
|---|---|
| Blast | Ranged Damage, 2 PP/rank. |
| Dazzle | Ranged Affliction gegen Sinne. |
| Energy Aura | Reaction Damage when touched. |
| Force Field | Sustained Protection. |
| Invisibility | Visual Concealment, typischerweise 4 oder 8 PP. |
| Magic | Ranged Damage plus thematische Alternate Effects. |
| Mental Blast | Perception Ranged Damage, resisted by Will. |
| Mind Control | Perception Ranged Cumulative Affliction, resisted by Will. |
| Mimic | Variable mit Move Action und Zielbezug. |
| Power-Lifting | Enhanced Strength, Limited to Lifting. |
| Shapeshift | Variable oder Morph/Metamorph-basiert. |
| Sleep | Ranged Affliction, Fortitude, endet in asleep/incapacitated. |
| Snare | Ranged Affliction, resisted by Dodge. |
| Strike | Close Damage. |
| Suffocation | Affliction über Atem/Erstickung. |
| Super-Speed | Kombiniert Speed, Quickness, ggf. Advantages/Defenses. |

## Effect Parameters

### Actions

- Standard: benötigt Standard Action.
- Move: benötigt Move Action.
- Free: Aktivierung/Nutzung als Free Action; GM kann Anzahl begrenzen.
- Reaction: automatisch als Reaktion auf Trigger.
- None: immer aktiv, keine Aktion.

### Ranges

- Personal: nur User.
- Close: Berührung; gegen Unwillige meist Close Attack gegen Parry.
- Ranged: benötigt Ranged Attack gegen Dodge; Short = rank x 25 ft, Medium = rank x 50 ft mit –2, Long = rank x 100 ft mit –5.
- Perception: jedes präzise wahrgenommene Ziel, kein Attack Check.
- Rank: Reichweite/Area durch Effektbeschreibung nach Rang.

### Durations

- Instant: Effekt tritt ein und endet im selben Turn, Ergebnisse können bleiben.
- Concentration: Standard Action pro Runde zum Halten.
- Sustained: Free Action pro Runde zum Halten.
- Continuous: bleibt ohne Aktion, bis deaktiviert.
- Permanent: immer aktiv, nicht deaktivierbar, nicht durch Extra Effort verbesserbar.

## Modifiers

### Berechnung

`modified_cost_per_rank = base_cost + sum(extras) - sum(flaws)`

Wenn modified cost unter 1 PP/rank sinkt, verwende fractional costs:

- 1 PP per rank = 1:1
- 1 PP per 2 ranks = 1:2
- 1 PP per 3 ranks = 1:3
- usw., üblicher GM-Grenzwert oft nicht unter 1:5.

Flat Modifiers werden nach Multiplikation mit Ranks addiert oder abgezogen. Flat flaws können den Endpreis nicht unter 1 PP senken.

### Core Extras

| Extra | Kosten | Funktion |
|---|---|---|
| Accurate | flat 1/rank | +2 Attack Check pro Rang. |
| Affects Corporeal | flat 1/rank | Insubstantial User kann corporeal targets beeinflussen. |
| Affects Insubstantial | flat 1-2 | Halb/voll gegen insubstantial targets. |
| Affects Objects | +0/+1/rank | Fortitude-resisted effects wirken auf Objekte. |
| Affects Others | +0/+1/rank | Personal effect auf andere übertragen. |
| Alternate Effect | flat 1/2 | Array-Alternative; Dynamic kostet mehr. |
| Alternate Resistance | +0/+1/rank | Andere Resistance als Standard. |
| Area | +1/rank pro Stufe | Gebiet statt Einzelziel. |
| Attack | +0/rank | Personal effect als Attack gegen andere. |
| Contagious | +1/rank | Kontakt verbreitet Effekt. |
| Dimensional | flat 1-3 | Andere Dimensionen erreichen. |
| Extended Range | flat 1/rank | Distanzen verdoppeln. |
| Feature | flat 1/rank | Kleine Zusatzfunktion. |
| Homing | flat 1/rank | Zusätzliche Trefferchancen. |
| Impervious | +1/rank | Ignoriert ausreichend schwache Effekte. |
| Increased Duration | +1/rank | Duration verbessern. |
| Increased Mass | flat 1/rank | Mehr Masse tragen/mitnehmen. |
| Increased Range | +1/rank | Range verbessern. |
| Incurable | flat 1 | Nicht durch normale Healing/Regeneration entfernbar. |
| Indirect | flat 1/rank | Ursprung/Winkel verändern. |
| Innate | flat 1 | Nicht nullifizierbar. |
| Insidious | flat 1 | Effekt schwer erkennbar. |
| Linked | flat 0 | Effekte wirken gemeinsam. |
| Multiattack | +1/rank | Mehrere Ziele oder Zusatzwirkung. |
| Penetrating | flat 1/rank | Überwindet Impervious. |
| Precise | flat 1 | Feinkontrolle. |
| Reach | flat 1/rank | +5 ft Close Reach pro Rang. |
| Reaction | +1/+3/rank | Aktion zu Reaction. |
| Reversible | flat 1 | Effekt frei entfernen. |
| Ricochet | flat 1/rank | Effekt abprallen lassen. |
| Secondary Effect | +1/rank | Instant effect wirkt später erneut. |
| Selective | +1/rank | Ziele innerhalb Area/Effect wählen. |
| Sleep | +0/rank | Ziel schläft statt incapacitated. |
| Split | flat 1/rank | Ränge auf Ziele aufteilen. |
| Subtle | flat 1-2 | Schwer/nicht bemerkbar. |
| Sustained | +0/rank | Permanent wird Sustained. |
| Triggered | flat 1/rank | Später auslösbar. |
| Variable Descriptor | flat 1-2 | Deskriptoren flexibel. |

### Core Flaws

| Flaw | Funktion |
|---|---|
| Activation | Aktivierung braucht Move oder Standard Action. |
| Check Required | Check bestimmt nutzbare Ränge. |
| Concentration | Sustained wird Concentration. |
| Diminished Range | Ranged Entfernungen reduziert. |
| Distracting | User wird vulnerable. |
| Fades | Effekt verliert Punkte/Ränge bei Nutzung. |
| Feedback | Schaden/Einwirkung auf Manifestation trifft User. |
| Grab-Based | Benötigt erfolgreichen Grab. |
| Inaccurate | –2 Attack Check pro Rang. |
| Increased Action | Nutzung dauert länger. |
| Limited | Nur unter bestimmten Bedingungen. |
| Noticeable | Normal subtiler Effekt ist auffällig. |
| Permanent | Continuous wird nicht deaktivierbar. |
| Quirk | Kleine Einschränkung, flat flaw. |
| Reduced Range | Range-Stufe gesenkt. |
| Removable | Kann als Device entzogen werden. |
| Resistible | Zusätzliche Resistance möglich. |
| Sense-Dependent | Ziel muss Effekt wahrnehmen. |
| Side Effect | Nachteil bei Nutzung/Fehlschlag. |
| Tiring | Nutzung verursacht Fatigue. |
| Uncontrolled | GM steuert Effekt. |
| Unreliable | Begrenzte Nutzungen oder Zuverlässigkeitswurf. |

## Arrays und Alternate Effects

Ein Array ist eine Gruppe von Alternate Effects mit gemeinsamem Thema. Regeln:

- Ein Alternate Effect kostet flat 1 PP, Dynamic Alternate Effect flat 2 PP.
- Jede Alternative darf nicht mehr PP kosten als der Primary/Base Effect des Arrays.
- Nur eine nicht-dynamische Alternative kann gleichzeitig aktiv sein.
- Wechseln ist eine Free Action, einmal pro Turn.
- Wenn ein Effekt im Array nullified/drained/disabled wird, betrifft dies das Array nach GM-Entscheidung häufig insgesamt.
- Arrays brauchen ein klares Thema: z. B. Battlesuit Weapons, Elemental Control, Spell List, Psychic Techniques.
- Nutze Power Stunts statt permanenter Alternate Effects für seltene Tricks.

## Descriptors

Descriptors erklären Quelle, Medium, Energieform, Sinnestyp, Zieltyp oder Stil. Sie sind regelrelevant für Countering, Immunity, Weakness, Nullify, Complications und GM-Rulings.

Beispiel-Kategorien:

- Allegiance: good, evil, law, chaos, justice, tyranny.
- Elements: air, earth, fire, plant, water, weather.
- Energy: acid, cold, cosmic, darkness, electricity, gravity, heat, kinetic, light, magnetic, radiation, sonic.
- Phenomena: dreams, entropy, luck, mind, quantum, space, time.
- Sources: alien, biological, chi, divine, magic, mutant, psionic, skill, technology, training.

Pflicht: Jeder Power-Build muss mindestens einen aussagekräftigen Descriptor haben.

## Countering Effects

Powers können andere Powers countern, wenn ihre Descriptors logisch entgegengesetzt oder passend sind. Beispiele: fire vs. water, light vs. darkness, heat vs. cold. Manche gleichartigen Descriptors können einander ebenfalls countern, z. B. magic vs. magic oder mental vs. mental.

Grundablauf:

1. User readied eine passende Action oder nutzt geeigneten Reaction-Effekt.
2. Beide Seiten würfeln Effect Check: `d20 + rank`.
3. Höheres Ergebnis gewinnt.
4. Erfolgreiches Countering negiert beide Effekte oder beendet einen laufenden Effekt.
5. Instant Countering kann per Hero Point erlaubt sein.

## Power Profiles Template-Katalog

Power Profiles liefert thematische Power Templates. Importiere sie als Templates mit Theme, Category, Descriptors, Effects, Modifiers und Cost.

### Themenliste

Air, Armor, Animal, Cold, Cosmic, Darkness, Death, Dimension, Dream, Earth, Electrical, Element, Fire, Gravity, Illusion, Kinetic, Life, Light, Luck, Magic, Magnetic, Martial, Mental, Meta, Morphing, Plant, Radiation, Sensory, Size, Sonic, Speed, Strength, Summoning, Talent, Tech, Teleport, Time, Water, Weather.

### Template-Schema

```yaml
power_template:
  theme: string
  category: Offensive | Defensive | Movement | Utility | Feature | Complication | Other
  name: string
  description: string
  descriptors: [string]
  effects:
    - effect: string
      rank: variable | fixed number
      action: string
      range: string
      duration: string
      resistance: string | null
      modifiers: [string]
      cost: string
  notes: string
  gm_flags: [string]
```

### Beispieltemplates

```yaml
- theme: Air
  category: Offensive
  name: Air Blast
  descriptors: [air, pressure]
  effects:
    - effect: Damage
      rank: variable
      range: Ranged
      duration: Instant
      resistance: Toughness
      modifiers: [Ranged]
      cost: 2/rank

- theme: Fire
  category: Offensive
  name: Fire Blast
  descriptors: [fire, heat]
  effects:
    - effect: Damage
      rank: variable
      range: Ranged
      duration: Instant
      resistance: Toughness
      modifiers: [Ranged]
      cost: 2/rank
  gm_flags:
    - Fire may ignite flammable materials as a complication unless controlled/Precise.

- theme: Armor
  category: Defensive
  name: Life Support System
  descriptors: [armor, technology, sealed-system]
  effects:
    - effect: Immunity
      rank: 10
      duration: Permanent
      resistance: null
      cost: 10 points
  notes: Immunity 10 Life Support.
```

## Complications

Ein Charakter muss mindestens zwei Complications haben. Schreibe jede Complication als konkreten Trigger mit Konsequenz und Hero-Point-Bedingung.

Typen:

- Motivation
- Accident
- Addiction
- Disability
- Enemy
- Fame
- Hatred
- Honor
- Identity
- Obsession
- Phobia
- Power Loss
- Prejudice
- Relationship
- Reputation
- Responsibility
- Rivalry
- Secret
- Temper
- Weakness

Schema:

```yaml
complication:
  type: Power Loss
  name: Needs Open Air
  trigger: Vacuum, underwater scenes, sealed environments, or anti-air magic.
  effect_in_play: Air powers become unavailable or require extra effort/power stunts.
  hero_point_condition: Award a hero point when this meaningfully restricts the character or creates danger.
```

## Validierung

Führe diese Checks immer aus.

```yaml
validation_protocol:
  - calculate_power_points:
      abilities: sum ability ranks * 2, including negative refunds
      defenses: purchased defenses only
      skills: total_skill_ranks / 2
      advantages: total_advantage_ranks
      powers: sum final power costs
      equipment: equipment advantage handled under advantages unless itemized separately
  - compare_total_to_budget
  - check_skill_caps: each skill total <= PL + 10
  - check_attack_effect_caps: attack bonus + effect rank <= 2 * PL
  - check_no_attack_resisted_effects: rank <= PL
  - check_defense_pairs:
      dodge_plus_toughness <= 2 * PL
      parry_plus_toughness <= 2 * PL
      fortitude_plus_will <= 2 * PL
  - check_arrays:
      all alternate effects <= base effect cost
      theme is coherent
      dynamic effects costed correctly
  - check_modifiers:
      costs are legal
      flat flaws do not reduce below 1 PP
      fractional costs handled correctly
  - check_descriptors:
      all powers have descriptors
      required campaign descriptors included
  - check_complications:
      at least two
      each has trigger and hero point condition
  - check_importer_structure:
      schemaVersion is 1.0.0
      externalIds are stable and unique
      top-level and nested item types are legal
      no derived fields are emitted
      expected.points and expected.items match the PP audit
  - check_power_effect_execution:
      every imported effect has activation.type, action.type, duration, range and roll details
      attack powers have attack roll details or explicit no-attack justification
      resisted effects have resist roll details with formula and target label
      passive effects use activation none and non-required rolls
      uses.remaining does not exceed uses.max
```

## Ausgabeformate

### Kurze Charakterantwort

Nutze diese Struktur:

1. Konzept
2. PL/PP
3. Abilities
4. Defenses
5. Skills
6. Advantages
7. Powers mit Builds
8. Offense
9. Complications
10. PP-Audit
11. PL-Audit
12. GM-Hinweise

### Maschinenlesbare Antwort

Wenn der Nutzer Codex, JSON, YAML oder Import verlangt, gib nur das Datenmodell und vermeide Fließtext außer `notes`.

### Audit-Antwort

Wenn der Nutzer einen bestehenden Charakter prüfen will:

- liste Fehler zuerst,
- danach Warnungen,
- danach legale Korrekturvorschläge,
- danach korrigierte PP/PL-Rechnung.

## Korrekturregeln

Wenn ein Build illegal ist:

- Attack+Effect zu hoch: senke Attack, senke Effect, nutze Trade-off, ändere Range/Resistance oder markiere GM-Ausnahme.
- Skill zu hoch: senke Skillränge, Ability, misc bonus oder erkläre Circumstance Bonus als nicht cap-relevant, sofern passend.
- Defense-Paar zu hoch: senke Defense oder Toughness, trenne Defensive Roll als active und beachte vulnerability.
- Power zu billig: prüfe Extras/Flaws, flat modifiers und fractional costs.
- Array missbraucht: verlange gemeinsames Thema oder mache Powers separat.
- Variable zu offen: beschränke Descriptor, Source, Trait-Klasse oder Situation.
- Immunity zu breit: schlage Protection, Impervious, Limited Immunity oder Half Effect vor.
- Removable fraglich: nutze nur, wenn Gegner die Power realistisch entziehen können; sonst Power Loss Complication.

## Antwortstil

- Deutsch, klar, tabellarisch wenn hilfreich.
- Regelmechanik knapp, aber vollständig.
- Keine langen Quellenzitate.
- Bei Unsicherheit: als GM-Entscheidung markieren.
- Immer zwischen Core Rules, optionalen Regeln und Template-Vorschlägen unterscheiden.
