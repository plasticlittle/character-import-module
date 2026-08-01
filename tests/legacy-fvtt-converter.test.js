import test from "node:test";
import assert from "node:assert/strict";
import { convertLegacyFoundryActor, isLegacyFoundryActorDocument } from "../scripts/importer/legacy-fvtt-converter.js";
import { Mnm3eCharacterImportService } from "../scripts/importer/import-service.js";

test("detects and converts legacy Foundry actor exports", () => {
  const legacy = moodChangeActor();
  assert.equal(isLegacyFoundryActorDocument(legacy), true);
  const converted = convertLegacyFoundryActor(legacy);
  assert.equal(converted.actor.name, "Carmilla Lite");
  assert.equal(converted.actor.system.attributes.powerLevel, 12);
  assert.equal(converted.actor.items[0].name, "Mood Change");
  assert.equal(converted.actor.items[0].system.effects[0].name, "Weaken");
  assert.equal(converted.actor.items[0].system.powerArray[0].name, "Eidolon Blade");
  assert.equal(converted.actor.items[0].system.powerArray[0].system.effects[0].system.modifiers[0].name, "Alternate Resistance");
});

test("legacy Mood Change-style power arrays survive full preview preparation", async () => {
  const result = await new Mnm3eCharacterImportService().prepare(moodChangeActor(), { useFoundry: false });
  assert.equal(result.ok, true);
  assert.equal(result.issues.length, 0);
  const moodChange = result.normalized.itemDataArray.find((item) => item.name === "Mood Change");
  assert.equal(moodChange.data.powerArray.length, 1);
  assert.equal(moodChange.data.effects[0].data.action.roll.resist.formula.value[0].value, "10 + @rank");
  assert.equal(moodChange.data.powerArray[0].data.effects[0].data.action.roll.attack.rollType.value, "required");
  assert.equal(moodChange.data.powerArray[0].data.effects[0].data.action.roll.resist.formula.value[0].value, "15 + @rank + @abilities.str.rank");
});

function moodChangeActor() {
  return {
    _id: "actor-carmilla-lite",
    name: "Carmilla Lite",
    type: "character",
    img: "icons/svg/mystery-man.svg",
    flags: {},
    data: {
      abilities: {
        str: { rank: 5 },
        sta: { rank: 3 },
        agl: { rank: 8 },
        dex: { rank: 3 },
        fgt: { rank: 3 },
        int: { rank: 4 },
        awe: { rank: 3 },
        pre: { rank: 5 }
      },
      defenses: {
        dge: { rank: 0, ability: "agl" },
        pry: { rank: 5, ability: "fgt" },
        frt: { rank: 4, ability: "sta" },
        tgh: { rank: 0, ability: "sta" },
        wil: { rank: 10, ability: "awe" }
      },
      attributes: {
        powerLevel: 12,
        equipmentPoints: 0,
        initiative: 0,
        penaltyPoints: 0,
        movement: { burrowing: 0, flight: 0, leaping: 0, speed: 0, swim: 0, teleport: 0 }
      },
      skills: {
        rco: {
          type: "dynamic",
          ability: "dex",
          trainedOnly: false,
          actions: ["standard"],
          base: 0,
          data: {
            MoodChange: { rank: 12, displayName: "Mood Change" }
          }
        },
        cco: {
          type: "dynamic",
          ability: "fgt",
          trainedOnly: false,
          actions: ["standard"],
          base: 0,
          data: {}
        }
      },
      pointCosts: { total: { value: 999 } }
    },
    effects: [],
    items: [
      {
        _id: "mood-change",
        name: "Mood Change",
        type: "power",
        img: "icons/svg/mystery-man.svg",
        flags: {},
        effects: [],
        data: {
          description: { value: "<p>Will-DC: 16</p>", chat: "" },
          effects: [
            {
              _id: "weaken-temp",
              name: "Weaken",
              type: "effect",
              img: "icons/svg/upgrade.svg",
              effects: [],
              data: {
                summary: {
                  format: "@prefix @name @rank @suffix",
                  position: "",
                  data: { prefix: "Selective 1 Area - Perception 2", suffix: "" },
                  parsed: "Selective 1 Area - Perception 2 Weaken 12"
                },
                description: { value: "", chat: "" },
                activation: {
                  check: emptyRoll("none"),
                  consume: emptyConsume(),
                  duration: { type: { value: "instant" } },
                  range: { area: { override: true, value: "perception", originalValue: null, overrideRank: 2 }, type: { value: "ranged" }, multiplier: { value: null } },
                  uses: emptyUses(),
                  type: { value: "standard" }
                },
                action: {
                  roll: {
                    attack: {
                      formula: { value: [{ op: "+", dataPath: "skills.rco.data.MoodChange.total" }], override: false, numOverrides: null },
                      targetScore: { type: { value: "defenses.wil.total" }, custom: { value: "" }, label: "Willpower" },
                      rollType: { value: "none" }
                    },
                    resist: {
                      formula: { value: [{ op: "+", dataPath: "formula", value: "10 + @rank" }], override: false, numOverrides: null },
                      targetScore: { type: { value: "defenses.wil.total" }, custom: { value: "" }, label: "Willpower" },
                      rollType: { value: "required" }
                    }
                  },
                  type: { value: "attack" }
                },
                rank: 12,
                cost: { value: 1, type: "perRank", discountPer: 1 },
                modifiers: [
                  modifier("Selective", 1, "perRank", 1),
                  modifier("Area - Perception", 2, "perRank", 2)
                ]
              }
            }
          ],
          powerArray: [
            {
              _id: "eidolon-blade-temp",
              name: "Eidolon Blade",
              type: "power",
              img: "icons/svg/mystery-man.svg",
              flags: { mnm3e: { isFavorite: true } },
              effects: [],
              data: {
                description: { value: "", chat: "" },
                effects: [
                  {
                    _id: "damage-temp",
                    name: "Damage",
                    type: "effect",
                    img: "icons/svg/upgrade.svg",
                    effects: [],
                    data: {
                      summary: { format: "@prefix @name @rank @suffix", position: "", data: { prefix: "Alternate Resistance 1" }, parsed: "Alternate Resistance 1 Damage 13" },
                      description: { value: "", chat: "" },
                      activation: {
                        check: {
                          formula: { value: [{ op: "+", dataPath: "skills.cco.base" }], override: false, numOverrides: null },
                          targetScore: { type: { value: "defenses.pry.total" }, custom: { value: "" }, label: "Parry" },
                          rollType: { value: "none" }
                        },
                        consume: emptyConsume(),
                        duration: { type: { value: "instant" } },
                        range: { area: { value: null }, type: { value: "close" }, multiplier: { value: null } },
                        uses: emptyUses(),
                        type: { value: "standard" }
                      },
                      action: {
                        roll: {
                          attack: {
                            formula: { override: false, value: [{ op: "+", dataPath: "skills.cco.base" }], numOverrides: null },
                            targetScore: { type: { override: false, value: "defenses.pry.total" }, custom: { value: "" }, label: "Parry" },
                            rollType: { override: false, value: "required" }
                          },
                          resist: {
                            formula: { override: false, value: [{ op: "+", dataPath: "formula", value: "15 + @rank + @abilities.str.rank" }], numOverrides: null },
                            targetScore: { type: { override: false, value: "defenses.wil.total" }, custom: { value: "" }, label: "Willpower" },
                            rollType: { override: false, value: "required" }
                          }
                        },
                        type: { override: false, value: "attack" }
                      },
                      rank: 13,
                      cost: { value: 1, type: "perRank", discountPer: 1 },
                      modifiers: [modifier("Alternate Resistance", 1, "perRank", 1)]
                    }
                  }
                ],
                powerArray: [],
                descriptor: "",
                totalCost: 26
              }
            }
          ],
          descriptor: ""
        }
      }
    ]
  };
}

function emptyRoll(rollType = "") {
  return {
    formula: { value: [] },
    targetScore: { type: { value: "" }, custom: { value: "" } },
    rollType: { value: rollType }
  };
}

function emptyConsume() {
  return {
    type: { value: "" },
    target: { value: null },
    amount: { value: null }
  };
}

function emptyUses() {
  return {
    amount: { value: 0 },
    max: { value: null },
    per: { value: null },
    remaining: null
  };
}

function modifier(name, rank, type, value) {
  return {
    _id: `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-temp`,
    name,
    type: "modifier",
    img: "icons/svg/mystery-man.svg",
    effects: [],
    data: {
      summary: { format: "@name @rank", position: "", data: { cost: value }, parsed: `${name} ${rank}` },
      description: { value: "", chat: "" },
      activation: {
        check: emptyRoll(""),
        consume: emptyConsume(),
        duration: { type: { value: "" } },
        range: { area: { value: "" }, type: { value: "" }, multiplier: { value: null } },
        uses: emptyUses(),
        type: { value: "" }
      },
      action: {
        roll: { attack: emptyRoll(""), resist: emptyRoll("") },
        type: { value: "" }
      },
      rank,
      cost: { value, type, discountPer: 1 },
      expressions: []
    }
  };
}

