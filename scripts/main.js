import { MODULE_ID } from "./importer/constants.js";
import { Mnm3eCharacterImportService, canImportActor } from "./importer/import-service.js";
import ImportDialog from "./ui/import-dialog.js";

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, "maxDepth", {
    name: "MNM3E_IMPORTER.SettingsMaxDepthName",
    hint: "MNM3E_IMPORTER.SettingsMaxDepthHint",
    scope: "world",
    config: true,
    type: Number,
    default: 20
  });

  loadTemplates([
    `modules/${MODULE_ID}/templates/import-dialog.html`,
    `modules/${MODULE_ID}/templates/import-report.html`
  ]);
});

Hooks.once("ready", () => {
  game.mnm3eCharacterImporter = {
    service: new Mnm3eCharacterImportService({ maxDepth: game.settings.get(MODULE_ID, "maxDepth") }),
    open: (actor = null) => new ImportDialog({ actor }).render(true),
    ImportDialog
  };
});

Hooks.on("getActorSheetHeaderButtons", (sheet, buttons) => {
  const actor = sheet.actor || sheet.document;
  if (!actor || actor.type && !["character", "npc"].includes(actor.type)) return;
  if (game.system?.id !== "mnm3e" && game.system?.data?.name !== "mnm3e") return;
  if (!canImportActor(actor)) return;

  buttons.unshift({
    label: game.i18n.localize("MNM3E_IMPORTER.Import"),
    class: "mnm3e-character-importer-open",
    icon: "fas fa-file-import",
    onclick: () => new ImportDialog({ actor }).render(true)
  });
});

Hooks.on("renderActorDirectory", (app, html) => {
  if (game.system?.id !== "mnm3e" && game.system?.data?.name !== "mnm3e") return;
  if (!canImportActor()) return;
  const footer = html.find(".directory-footer");
  const button = $(`<button type="button" class="mnm3e-character-importer-global"><i class="fas fa-file-import"></i> ${game.i18n.localize("MNM3E_IMPORTER.Import")}</button>`);
  button.on("click", () => new ImportDialog({ actor: null }).render(true));
  if (footer.length) footer.append(button);
  else html.append(button);
});

