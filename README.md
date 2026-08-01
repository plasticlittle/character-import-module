# MNM3E Character Importer

Standalone Foundry VTT module for importing canonical JSON character documents into the legacy `mnm3e` system version `0.4.30`.

## Features

- Foundry v9 legacy write model: canonical `system` becomes `data`.
- Actor and item `activeEffects` become root `effects`.
- Create and update imports.
- Update strategies: `replace`, `merge-by-external-id`, `append`.
- Dry-run preview with schema validation, semantic validation, cost audit, item tree, and JSON report.
- Bug-compatible PP calculation based on `Item3e.calculateEffectCost`.
- Transaction rollback for create and update failures.

## Install

Copy or extract this folder into Foundry's `Data/modules` directory and enable `MNM3E Character Importer` for an `mnm3e` world.

## Test

```sh
npm test
```

## Release

The release archive is generated as `1000_mnm3e-character-importer-v0.1.0.zip`.

