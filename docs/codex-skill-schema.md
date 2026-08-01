# Codex Skill Authoring Schema

Use `schemas/mnm3e-character.codex-skill.schema.json` when a Codex skill should generate a complete MNM3E character document.

The schema is stricter than the runtime import schema:

- All actor abilities, defenses, movement entries, skills and info fields are required.
- Top-level actor items must be real `advantage`, `power`, `equipment`, `vehicle` or `base` objects.
- Nested powers, effects and modifiers must use the same full item-source shape the MNM3E sheets edit.
- The canonical field is `system`, not Foundry v9 `data`.
- Active effects use `activeEffects`; the importer maps them to root `effects`.
- `expected.points` is required so the importer can compare the generated character against the skill's own PP audit.

Codex skills should not emit derived MNM3E fields such as `total`, `pointCosts`, `totalCost`, `summary.parsed`, `summary.data`, `isTrained`, target-score labels or override bookkeeping. The importer derives those values through the MNM3E system.

Recommended skill output flow:

1. Build the full JSON document against `mnm3e-character.codex-skill.schema.json`.
2. Calculate `expected.points` and item `expected.items` using the same PP formula documented in `docs/import-format.md`.
3. Validate with this schema.
4. Pass the document unchanged to the importer.

