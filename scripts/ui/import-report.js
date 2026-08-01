import { MODULE_ID } from "../importer/constants.js";

export default class ImportReport extends Application {
  constructor(preview, options = {}) {
    super(options);
    this.preview = preview;
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "mnm3e-character-import-report",
      title: game.i18n.localize("MNM3E_IMPORTER.ReportTitle"),
      template: `modules/${MODULE_ID}/templates/import-report.html`,
      classes: ["mnm3e", "mnm3e-character-importer", "import-report"],
      width: 860,
      height: 720,
      resizable: true,
      tabs: [{ navSelector: ".tabs", contentSelector: ".report-body", initial: "issues" }]
    });
  }

  getData() {
    return {
      preview: this.preview,
      issues: this.preview?.issues || [],
      costs: this.preview?.costs || null,
      rows: flattenTree(this.preview?.itemTree || []),
      reportJson: JSON.stringify(this.preview?.report || this.preview || {}, null, 2)
    };
  }
}

function flattenTree(tree, depth = 0) {
  return tree.flatMap((entry) => [
    { ...entry, depth, indent: `${depth * 1.25}rem` },
    ...flattenTree(entry.children || [], depth + 1)
  ]);
}

