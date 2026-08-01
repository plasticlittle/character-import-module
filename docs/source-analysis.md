# Source Analysis

The importer was built against the checked-in `mnm3e` reference system at version `0.4.30`.

## system.json

`mnm3e` targets Foundry Core `0.7.9` through `9`, loads one ES module entry, and uses the legacy v9 document shape where system data is stored under `document.data`. The importer therefore writes canonical `system` to Foundry `data`.

## template.json

Actors support `character` and `npc`. Items support `advantage`, `effect`, `equipment`, `modifier`, `power`, `vehicle`, and `base`.

Important nested data:

- `power.data.effects[]` contains full `effect` item sources.
- `power.data.powerArray[]` contains full `power` item sources and can recurse.
- `effect.data.modifiers[]` contains full `modifier` item sources.
- `equipment.data.effects[]`, `vehicle.data.effects[]`, and `base.data.effects[]` contain full `effect` item sources.
- Active effects live on the document root as `effects[]`, not inside `data`.

## module/item/entity.js

`Item3e.prepareEmbeddedEntities` gathers active effects from nested effect item sources into the parent item effects collection. `Item3e.preparePowerEffectData` mutates derived override fields and summary data, so importer input strips those values. `Item3e.calculateEffectCost` contains the cost algorithm reproduced in `scripts/importer/cost-calculator.js`.

## module/actor/entity.js

Actor point costs are derived from ability ranks, skill ranks, defense ranks, advantage costs, and power total costs. Equipment, vehicles, and bases are not counted in actor total PP by the system. Maximum character points use `15 * powerLevel + earnedCharacterPoints` unless `flags.mnm3e.overrideMaxPoints` is set and `data.maxPoints` exists.

## module/item/sheets/base.js

The system creates nested list entries by calling `Item.create({ name, type, img }, { temporary: true })`, assigning an `_id` ending in `-temp`, then storing the full item source in the parent list. The importer follows that pattern for nested effects, modifiers, and power-array entries.

## module/item/sheets/power.js

Power sheets edit `data.effects` and `data.powerArray`. The sheet marks a power-array alternative invalid when its prepared total cost is higher than the immediate parent power.

## module/item/sheets/effect.js

Effect sheets edit `data.modifiers` as full modifier item sources. Dropped modifier items are copied into the nested array.

## module/apps/score-config.js

Dynamic skill IDs are created under `skills.cco.data`, `skills.exp.data`, and `skills.rco.data`. Formula paths can reference static totals, dynamic base values, or dynamic custom skill totals.

## module/config.js

The importer validates known ability, defense, skill, activation, action, range, duration, and cost identifiers against the same identifier sets used by the system UI.

