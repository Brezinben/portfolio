import { MAX_SUGGESTIONS, candidates, commonPrefix, hintFor } from "../../src/interpret.ts";
import assert from "node:assert/strict";
import { it } from "node:test";

const CONTEXT = {
    details: [{ id: "m-kereis" }, { id: "m-run" }],
    model: false,
    sections: [{ id: "whoami" }, { id: "stack" }],
    shareTargets: ["linkedin", "github", "link"],
    themes: ["dark", "light", "noctis"],
  },
  // Le meme contexte, avec un modele local disponible : la recherche y porte l'etincelle.
  AVEC_MODELE = { ...CONTEXT, model: true },
  hits = (value: string) => {
    return candidates(value, CONTEXT).hits;
  };

// Le vocabulaire ne propose que ce que le dispatcher accepte : les easter eggs portent
// leur slash, les vraies commandes n'en ont pas.
it("should filter the vocabulary with the typed prefix", () => {
  assert.deepEqual(hits("he"), ["help"]);
  assert.deepEqual(hits("su"), [], "an easter egg without its slash is not suggested");
  assert.ok(hits("/su").includes("/sudo"));
  assert.ok(hits("/co").includes("/coffee"));
  assert.ok(hits("/co").includes("/cowsay"));
});

it("should hold the sections and the missions in the vocabulary", () => {
  assert.ok(hits("who").includes("whoami"));
  assert.ok(hits("m-").includes("m-kereis"));
});

// La completion ne tronque plus : tronquer ici faisait mentir « commonPrefix », qui
// completait au-dela du prefixe reel des que la onzieme proposition existait. C'est la
// coquille qui n'en montre que « MAX_SUGGESTIONS » a la fois.
it("should return every match instead of truncating the list", () => {
  assert.ok(hits("").length > MAX_SUGGESTIONS, "the whole vocabulary comes back");
});

it("should keep the slash prefix in the suggestion", () => {
  assert.deepEqual(candidates("/su", CONTEXT).hits, ["/sudo"]);
  assert.deepEqual(candidates("/su", CONTEXT).frag, "/su");
});

it("should accept the colon like the slash", () => {
  assert.deepEqual(candidates(":su", CONTEXT).hits, ["/sudo"]);
});

// Au second mot, seul le vocabulaire de la commande a du sens. Cinq sous-commandes claires
// valent mieux que dix mots mélangés : les expressions vivent un niveau plus bas.
it("should suggest only the five subcommands of slime", () => {
  const result = candidates("slime ", CONTEXT);

  assert.deepEqual(result.hits, ["expression", "activity", "evolve", "drop", "kill"]);
  assert.equal(result.head, "slime");
});

it("should suggest only expressions after slime expression", () => {
  const result = candidates("slime expression ", CONTEXT);

  assert.ok(result.hits.includes("happy"));
  assert.ok(!result.hits.includes("idle"), "idle is no longer suggested: it showed nothing");
  assert.equal(result.head, "slime expression");
});

it("should suggest only sections and missions after cd", () => {
  const result = candidates("cd ", CONTEXT);

  assert.deepEqual(result.hits, ["whoami", "stack", "m-kereis", "m-run"]);
});

it("should suggest only its targets after share", () => {
  assert.deepEqual(candidates("share ", CONTEXT).hits, ["linkedin", "github", "link"]);
});

it("should suggest nothing after ask, which takes free text", () => {
  assert.deepEqual(candidates("ask que", CONTEXT).hits, []);
});

it("should give an alias the vocabulary of its command", () => {
  assert.deepEqual(candidates("partager li", CONTEXT).hits, candidates("share li", CONTEXT).hits);
});

it("should complete with the longest common prefix", () => {
  assert.equal(commonPrefix(["coffee", "cowsay"]), "co");
  assert.equal(commonPrefix(["sudo"]), "sudo");
  assert.equal(commonPrefix([]), "");
  assert.equal(commonPrefix(["ls", "cd"]), "");
});

// Le second niveau : « slime » propose des expressions, « slime activity » des activités.
it("should suggest only activities after slime activity", () => {
  const result = candidates("slime activity ", CONTEXT);

  assert.deepEqual(result.hits, ["bike", "coffee", "goal", "juggle", "lift", "train"]);
  assert.equal(result.head, "slime activity");
});

it("should suggest activity and expression as the second word of slime", () => {
  const shown = candidates("slime ", CONTEXT).hits;

  assert.ok(shown.includes("activity"));
  assert.ok(shown.includes("expression"));
});

// Un troisième mot ne propose rien : le chemin « slime happy » n'a pas de vocabulaire.
it("should suggest nothing on one word too many", () => {
  assert.deepEqual(candidates("slime happy x", CONTEXT).hits, []);
});

// L'interpréteur normalise les espaces avant de lire la commande. Sans la même
// normalisation ici, un espace de trop rend la liste muette au lieu de la filtrer.
it("should not break the completion on repeated spaces", () => {
  assert.deepEqual(hits("slime  "), hits("slime "));
  assert.deepEqual(hits("cd   who"), hits("cd who"));
  assert.deepEqual(hits("slime  activity  "), hits("slime activity "));
  assert.deepEqual(hits(" /wt"), hits("/wt"));
});

// L'espace final annonce l'argument suivant : la normalisation ne doit pas l'avaler.
it("should keep the trailing space through the normalization", () => {
  assert.equal(candidates("slime  ", CONTEXT).head, "slime");
  assert.equal(candidates("slime  ", CONTEXT).frag, "");
});

// « bd » est annoncé par l'aide, « sleep » et « ? » marchent : les trois manquaient au
// vocabulaire, donc la liste ne les proposait jamais.
it("should hold bd, sleep and ? in the vocabulary", () => {
  assert.ok(hits("b").includes("bd"));
  assert.ok(hits("sl").includes("sleep"));
  assert.ok(hits("?").includes("?"));
});

// Taper « / » rend tous les easter eggs, triés, quel qu'en soit le nombre. Aucun ne sort
// plus de la liste : la fenêtre de la coquille glisse au-delà de dix, et l'ordre
// d'écriture de « SLASH_ONLY » ne décide donc plus de ce qu'on voit.
it("should offer every easter egg in alphabetical order", () => {
  const shown = hits("/");

  assert.ok(shown.length >= 10, "no easter egg falls out of the list");
  assert.deepEqual(shown, shown.toSorted(), "the list comes back sorted");
  assert.ok(shown.includes("/joke"));
  assert.ok(shown.includes("/slime"));
});

// Le dispatcher réserve la navigation à ces trois verbes. La liste doit proposer des
// sections derrière les trois, et le test tombe si les deux listes divergent.
it("should suggest the sections and the missions after each of the three navigation verbs", () => {
  for (const verb of ["bd", "cd", "open"]) {
    assert.deepEqual(hits(`${verb} `), ["whoami", "stack", "m-kereis", "m-run"], verb);
  }
});

it("should suggest the themes as the second word of theme", () => {
  assert.deepEqual(candidates("theme ", CONTEXT).hits, ["dark", "light", "noctis"]);
});

// La recherche porte deux noms, et l'étincelle dit lequel : celui qui passe par un modèle
// local. Les proposer tous les deux ferait croire à deux recherches différentes.
it("should offer the search under the single name that matches the model", () => {
  const sans = candidates("a", CONTEXT).hits,
    avec = candidates("a", AVEC_MODELE).hits;

  assert.ok(sans.includes("ask"), "without a model, the plain name");
  assert.ok(!sans.includes("ask✨"), "without a model, no sparkle");

  assert.ok(avec.includes("ask✨"), "with a model, the sparkle");
  assert.ok(!avec.includes("ask"), "with a model, not the plain name");
});

// Les deux noms se décrivent différemment : c'est la seule chose qui dit au visiteur ce que
// l'étincelle change.
it("should give each search name its own description", () => {
  assert.equal(hintFor("", "ask"), "cherche dans le texte du site");
  assert.equal(hintFor("", "ask✨"), "un modèle local choisit la réponse");
});

// La liste ne montre que des noms. « goal » ou « bd » ne s'apprennent pas d'un nom :
// une ligne sous la liste dit ce que fait la proposition choisie.
it("should give each first word suggestion a description", () => {
  assert.equal(hintFor("", "bd"), "ouvre une section");
  assert.equal(hintFor("", "/slime"), "commande le slime");
  assert.equal(hintFor("", "cls"), "vide le journal");
});

it("should give each slime subcommand its own description, at every level", () => {
  assert.equal(hintFor("slime", "activity"), "lui donne une occupation");
  assert.equal(hintFor("slime activity", "goal"), "il marque un but");
  assert.equal(hintFor("slime expression", "scared"), "il prend peur");
});

// Un nom venu du contenu n'a pas de description écrite : la ligne se cache plutôt que
// d'afficher un vide.
it("should return an empty string for a suggestion without a description", () => {
  assert.equal(hintFor("", "whoami"), "");
  assert.equal(hintFor("share", "linkedin"), "");
  assert.equal(hintFor("xyzzy", "xyzzy"), "");
});

// Une ligne faite d'espaces n'est pas une ligne vide : la barre d'espace n'ouvre rien.
it("should suggest nothing for a line made of spaces", () => {
  assert.deepEqual(hits("   "), []);
});

// Au second mot, le filtre porte sur le début du mot tapé.
it("should filter the second word by its start", () => {
  assert.deepEqual(hits("theme no"), ["noctis"]);
});
