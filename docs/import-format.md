# Import Format

The canonical document uses `system` for actor and item system data. When committed to Foundry v9, the importer writes that content to `data`.

The importer also accepts legacy Foundry actor exports that use root `data`, `items` and `effects`. Those exports are converted internally to the canonical shape before schema and semantic validation. This preserves nested MNM3E power structures such as `power.data.powerArray[]`, `power.data.effects[]`, `effect.data.modifiers[]` and nested root active effects.

Actor active effects use `actor.activeEffects[]`. Item active effects use `item.activeEffects[]`. Both are written to the Foundry root field `effects[]`.

Top-level actor items may be `advantage`, `power`, `equipment`, `vehicle`, or `base`. Nested arrays must keep the system shape:

- `power.system.effects[]`: full `effect` objects.
- `power.system.powerArray[]`: full `power` objects.
- `effect.system.modifiers[]`: full `modifier` objects.
- `equipment.system.effects[]`, `vehicle.system.effects[]`, `base.system.effects[]`: full `effect` objects.

Each object can include `externalId`. The importer stores it as `flags.mnm3eCharacterImporter.externalId` and uses it for merge updates.

The importer rejects or strips derived fields such as `total`, `pointCosts`, `totalCost`, `summary.parsed`, `summary.data`, `isTrained`, target-score labels, and override bookkeeping.

Formulas are not evaluated. They are structurally validated and stored as formula builder entries.

For legacy actor exports, inactive roll details are cleaned before validation. Required roll details keep their formula entries, while empty legacy formula placeholders are removed so the normalizer can add usable defaults when needed.
