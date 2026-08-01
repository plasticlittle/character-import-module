import { MODULE_ID } from "../importer/constants.js";
import { Mnm3eCharacterImportService, canImportActor } from "../importer/import-service.js";
import ImportReport from "./import-report.js";

export default class ImportDialog extends Application {
  constructor({ actor = null } = {}, options = {}) {
    super(options);
    this.actor = actor;
    this.preview = null;
    this.service = new Mnm3eCharacterImportService({
      maxDepth: game.settings.get(MODULE_ID, "maxDepth")
    });
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "mnm3e-character-import-dialog",
      title: game.i18n.localize("MNM3E_IMPORTER.DialogTitle"),
      template: `modules/${MODULE_ID}/templates/import-dialog.html`,
      classes: ["mnm3e", "mnm3e-character-importer", "import-dialog"],
      width: 760,
      height: "auto",
      resizable: true
    });
  }

  getData() {
    const actors = game.actors
      ? game.actors.filter((actor) => ["character", "npc"].includes(actor.type) && canImportActor(actor))
      : [];
    return {
      actor: this.actor,
      actors,
      hasActor: Boolean(this.actor),
      preview: this.preview,
      issueCount: this.preview?.issues?.length || 0,
      errorCount: this.preview?.issues?.filter((issue) => issue.severity === "error").length || 0,
      rows: flattenTree(this.preview?.itemTree || []),
      costs: this.preview?.costs || null,
      reportJson: this.preview ? JSON.stringify(this.preview.report, null, 2) : ""
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find('input[name="jsonFile"]').on("change", (event) => this.onFileSelected(event, html));
    html.find(".drop-zone")
      .on("dragover", (event) => {
        event.preventDefault();
        event.currentTarget.classList.add("dragging");
      })
      .on("dragleave", (event) => event.currentTarget.classList.remove("dragging"))
      .on("drop", (event) => this.onDrop(event, html));
    html.find('[data-action="preview"]').on("click", (event) => this.onPreview(event, html));
    html.find('[data-action="import"]').on("click", (event) => this.onImport(event, html));
    html.find('[name="mode"]').on("change", () => this.render(false));
  }

  async onFileSelected(event, html) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".json")) {
      ui.notifications.warn(game.i18n.localize("MNM3E_IMPORTER.WarnJsonOnly"));
      return;
    }
    html.find('textarea[name="jsonText"]').val(await readFile(file));
  }

  async onDrop(event, html) {
    event.preventDefault();
    event.currentTarget.classList.remove("dragging");
    const file = event.originalEvent?.dataTransfer?.files?.[0] || event.dataTransfer?.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".json")) {
      ui.notifications.warn(game.i18n.localize("MNM3E_IMPORTER.WarnJsonOnly"));
      return;
    }
    html.find('textarea[name="jsonText"]').val(await readFile(file));
  }

  async onPreview(event, html) {
    event.preventDefault();
    await this.runPreview(html);
    new ImportReport(this.preview).render(true);
  }

  async onImport(event, html) {
    event.preventDefault();
    const options = this.formOptions(html);
    if (!options.actor && options.mode === "update") {
      ui.notifications.error(game.i18n.localize("MNM3E_IMPORTER.ErrorNoActor"));
      return;
    }
    const source = html.find('textarea[name="jsonText"]').val();
    if (!String(source || "").trim()) {
      ui.notifications.warn(game.i18n.localize("MNM3E_IMPORTER.WarnEmptyInput"));
      return;
    }

    this.preview = await this.service.prepare(source, options);
    if (!this.preview.ok) {
      this.render(false);
      new ImportReport(this.preview).render(true);
      return;
    }

    if (options.dryRun) {
      const result = await this.service.import(source, options);
      this.preview = result;
      this.render(false);
      new ImportReport(result).render(true);
      return;
    }

    const confirmed = await Dialog.confirm({
      title: game.i18n.localize("MNM3E_IMPORTER.ConfirmTitle"),
      content: `<p>${game.i18n.localize("MNM3E_IMPORTER.ConfirmContent")}</p>`,
      yes: () => true,
      no: () => false,
      defaultYes: false
    });
    if (!confirmed) return;

    try {
      const result = await this.service.import(source, options);
      this.preview = result;
      this.render(false);
      new ImportReport(result).render(true);
      ui.notifications.info(game.i18n.localize("MNM3E_IMPORTER.ImportComplete"));
    } catch (error) {
      ui.notifications.error(error.message);
      throw error;
    }
  }

  async runPreview(html) {
    const source = html.find('textarea[name="jsonText"]').val();
    if (!String(source || "").trim()) {
      ui.notifications.warn(game.i18n.localize("MNM3E_IMPORTER.WarnEmptyInput"));
      return;
    }
    this.preview = await this.service.prepare(source, this.formOptions(html));
    this.render(false);
  }

  formOptions(html) {
    const mode = html.find('[name="mode"]').val();
    const actorId = html.find('[name="actorId"]').val();
    const actor = mode === "update"
      ? (this.actor || game.actors.get(actorId))
      : null;
    return {
      actor,
      mode,
      strategy: html.find('[name="strategy"]').val(),
      dryRun: html.find('[name="dryRun"]').is(":checked"),
      maxDepth: game.settings.get(MODULE_ID, "maxDepth")
    };
  }
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function flattenTree(tree, depth = 0) {
  return tree.flatMap((entry) => [
    { ...entry, depth, indent: `${depth * 1.25}rem` },
    ...flattenTree(entry.children || [], depth + 1)
  ]);
}

