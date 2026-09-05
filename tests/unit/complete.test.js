import { MAX_SUGGESTIONS, candidates, commonPrefix } from "../../production/interpret.js";
import assert from "node:assert/strict";
import { test } from "node:test";

const CONTEXT = {
  details: [{ id: "m-kereis" }, { id: "m-run" }],
  sections: [{ id: "whoami" }, { id: "stack" }],
  shareTargets: ["linkedin", "github", "link"],
};

const hits = (value) => candidates(value, CONTEXT).hits;

// Le vocabulaire ne propose que ce que le dispatcher accepte : les easter eggs portent
// leur slash, les vraies commandes n'en ont pas.
test("le préfixe filtre le vocabulaire", () => {
  assert.deepEqual(hits("he"), ["help"]);
  assert.deepEqual(hits("wt"), [], "un easter egg sans slash n'est pas propose");
  assert.ok(hits("/wt").includes("/wtf"));
  assert.ok(hits("/co").includes("/coffee"));
  assert.ok(hits("/co").includes("/cowsay"));
});

test("les sections et les fiches font partie du vocabulaire", () => {
  assert.ok(hits("who").includes("whoami"));
  assert.ok(hits("m-").includes("m-kereis"));
});

test("jamais plus de dix propositions", () => {
  assert.ok(hits("").length <= MAX_SUGGESTIONS);
});

test("le préfixe slash fait partie de la proposition", () => {
  assert.deepEqual(candidates("/wt", CONTEXT).hits, ["/wtf"]);
  assert.deepEqual(candidates("/wt", CONTEXT).frag, "/wt");
});

test("les deux-points sont acceptés comme le slash", () => {
  assert.deepEqual(candidates(":wt", CONTEXT).hits, ["/wtf"]);
});

// Au second mot, seul le vocabulaire de la commande a du sens.
test("slime ne propose que des humeurs", () => {
  const result = candidates("slime ", CONTEXT);

  assert.ok(result.hits.includes("happy"));
  assert.ok(result.hits.includes("drop"));
  assert.ok(!result.hits.includes("wtf"));
  assert.equal(result.head, "slime");
});

test("cd ne propose que des sections et des fiches", () => {
  const result = candidates("cd ", CONTEXT);

  assert.deepEqual(result.hits, ["whoami", "stack", "m-kereis", "m-run"]);
});

test("share ne propose que ses cibles", () => {
  assert.deepEqual(candidates("share ", CONTEXT).hits, ["linkedin", "github", "link"]);
});

test("cowsay ne propose que ses modes de tête", () => {
  assert.deepEqual(candidates("cowsay -", CONTEXT).hits, [
    "-b",
    "-d",
    "-g",
    "-p",
    "-s",
    "-t",
    "-w",
    "-y",
  ]);
});

test("ask ne propose rien : c'est du texte libre", () => {
  assert.deepEqual(candidates("ask que", CONTEXT).hits, []);
});

test("les alias héritent du vocabulaire de leur commande", () => {
  assert.deepEqual(candidates("mood ha", CONTEXT).hits, candidates("slime ha", CONTEXT).hits);
});

test("le plus long préfixe commun sert à compléter", () => {
  assert.equal(commonPrefix(["cowsay", "cowthink"]), "cow");
  assert.equal(commonPrefix(["wtf"]), "wtf");
  assert.equal(commonPrefix([]), "");
  assert.equal(commonPrefix(["ls", "cd"]), "");
});
