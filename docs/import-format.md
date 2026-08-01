# Import Format

The canonical document uses `system` for actor and item system data. When committed to Foundry v9, the importer writes that content to `data`.

Actor active effects use `actor.activeEffects[]`. Item active effects use `item.activeEffects[]`. Both are written to the Foundry root field `effects[]`.

Top-level actor items may be `advantage`, `power`, `equipment`, `vehicle`, or `base`. Nested arrays must keep the system shape:

- `power.system.effects[]`: full `effect` objects.
- `power.system.powerArray[]`: full `power` objects.
- `effect.system.modifiers[]`: full `modifier` objects.
- `equipment.system.effects[]`, `vehicle.system.effects[]`, `base.system.effects[]`: full `effect` objects.

Each object can include `externalId`. The importer stores it as `flags.mnm3eCharacterImporter.externalId` and uses it for merge updates.

The importer rejects or strips derived fields such as `total`, `pointCosts`, `totalCost`, `summary.parsed`, `summary.data`, `isTrained`, target-score labels, and override bookkeeping.

Formulas are not evaluated. They are structurally validated and stored as formula builder entries.

