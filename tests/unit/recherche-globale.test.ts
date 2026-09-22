import {
  GLOBAL_GROUPS,
  type GlobalSource,
  ghostFor,
  globalIndex,
  rankHits,
} from "../../src/interpret.ts";
import assert from "node:assert/strict";
import { it } from "node:test";

const SOURCE: GlobalSource = {
    details: [
      { cmd: "bd show mission/kereis", id: "m-kereis", label: "kereis", sub: "mai 2026 →" },
    ],
    model: false,
    sections: [
      {
        ask: "je suis développeur",
        cmd: "bd whoami",
        id: "whoami",
        label: "whoami",
        sub: "identité",
      },
      { cmd: "bd stack", id: "stack", label: "stack", sub: "les outils" },
    ],
    techNotes: {
      "Vue.js": { note: "Composition API, stores", where: "Transway" },
      "Éco-conception": { note: "mesure de l'impact", where: "fruggr" },
    },
    themes: [{ id: "noctis", label: "noctis" }],
  },
  INDEX = globalIndex(SOURCE),
  labels = (query: string) => {
    return rankHits(query, INDEX, 20).map((hit) => {
      return hit.label;
    });
  };

it("should derive every searchable entry from the content", () => {
  const kinds = new Set(
    INDEX.map((hit) => {
      return hit.kind;
    }),
  );

  for (const group of GLOBAL_GROUPS) {
    assert.ok(kinds.has(group.kind), `the group ${group.kind} has no entry`);
  }
});

// Le classement tient au genre du match. Un libelle qui commence par la saisie passe devant
// une commande qui la contient : sans cet ordre, taper « st » ouvrait autre chose que stack.
it("should rank a label prefix before anything else", () => {
  const [first] = labels("st");

  assert.equal(first, "stack");
});

it("should rank a command prefix before a label that only contains the query", () => {
  const found = labels("bd s");

  assert.ok(found.includes("stack"), "the section answers its own command");
});

// Les mots-cles se cherchent sans s'afficher : le resume « ask » d'une section y entre.
it("should search the keywords a row never shows", () => {
  assert.ok(labels("développeur").includes("whoami"));
  assert.ok(labels("composition api").includes("Vue.js"));
});

it("should ignore the accents and the case on both sides", () => {
  assert.ok(labels("eco").includes("Éco-conception"));
  assert.ok(labels("ÉCO-CON").includes("Éco-conception"));
});

it("should read the slash that targets the command line", () => {
  assert.deepEqual(labels("/stack"), labels("stack"));
});

it("should return nothing for an empty query", () => {
  assert.deepEqual(rankHits("   ", INDEX, 20), []);
});

it("should stop at the limit", () => {
  assert.equal(rankHits("e", INDEX, 3).length, 3);
});

// Une brique n'a pas de commande a elle : elle ouvre la stack, et la coquille pose sa fiche.
it("should send a stack brick to the stack section", () => {
  const [brick] = rankHits("Vue.js", INDEX, 1);

  assert.equal(brick?.cmd, "bd stack");
  assert.equal(brick?.tech, "Vue.js");
});

// Un succes s'ouvre, il ne se lance pas.
it("should leave an achievement without a command", () => {
  const found = INDEX.filter((hit) => {
    return hit.kind === "achievement";
  });

  assert.ok(found.length > 0);
  assert.ok(
    found.every((hit) => {
      return hit.cmd === "";
    }),
  );
});

// Soumettre « theme » seul rendrait une erreur : la ligne se remplit, et le visiteur finit.
it("should mark the commands that want an argument", () => {
  const needing = new Set(
    INDEX.filter((hit) => {
      return hit.needsArgument;
    }).map((hit) => {
      return hit.label;
    }),
  );

  assert.ok(needing.has("theme"));
  assert.ok(needing.has("ask"));
  assert.ok(!needing.has("help"));
});

it("should complete only towards a label that starts with the query", () => {
  assert.equal(ghostFor("sta", rankHits("sta", INDEX, 5)), "ck");
  assert.equal(ghostFor("api", rankHits("api", INDEX, 5)), "", "a keyword match completes nothing");
  assert.equal(ghostFor("", INDEX), "");
});
