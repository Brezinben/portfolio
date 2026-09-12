import { MAX_SUGGESTIONS, candidates, commonPrefix, hintFor } from "../../src/interpret.ts";
import assert from "node:assert/strict";
import { test } from "node:test";

const CONTEXT = {
    details: [{ id: "m-kereis" }, { id: "m-run" }],
    model: false,
    sections: [{ id: "whoami" }, { id: "stack" }],
    shareTargets: ["linkedin", "github", "link"],
    themes: ["dark", "light", "noctis"],
  },
  // Le meme contexte, avec un modele local disponible : la recherche y porte l'etincelle.
  AVEC_MODELE = { ...CONTEXT, model: true },
  hits = (value: string) => candidates(value, CONTEXT).hits;

// Le vocabulaire ne propose que ce que le dispatcher accepte : les easter eggs portent
// leur slash, les vraies commandes n'en ont pas.
test("le préfixe filtre le vocabulaire", () => {
  assert.deepEqual(hits("he"), ["help"]);
  assert.deepEqual(hits("su"), [], "un easter egg sans slash n'est pas propose");
  assert.ok(hits("/su").includes("/sudo"));
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
  assert.deepEqual(candidates("/su", CONTEXT).hits, ["/sudo"]);
  assert.deepEqual(candidates("/su", CONTEXT).frag, "/su");
});

test("les deux-points sont acceptés comme le slash", () => {
  assert.deepEqual(candidates(":su", CONTEXT).hits, ["/sudo"]);
});

// Au second mot, seul le vocabulaire de la commande a du sens. Cinq sous-commandes claires
// valent mieux que dix mots mélangés : les expressions vivent un niveau plus bas.
test("slime ne propose que ses cinq sous-commandes", () => {
  const result = candidates("slime ", CONTEXT);

  assert.deepEqual(result.hits, ["expression", "activity", "evolve", "drop", "kill"]);
  assert.equal(result.head, "slime");
});

test("slime expression ne propose que des expressions", () => {
  const result = candidates("slime expression ", CONTEXT);

  assert.ok(result.hits.includes("happy"));
  assert.ok(!result.hits.includes("idle"), "idle n'est plus proposé : il ne montrait rien");
  assert.equal(result.head, "slime expression");
});

test("cd ne propose que des sections et des fiches", () => {
  const result = candidates("cd ", CONTEXT);

  assert.deepEqual(result.hits, ["whoami", "stack", "m-kereis", "m-run"]);
});

test("share ne propose que ses cibles", () => {
  assert.deepEqual(candidates("share ", CONTEXT).hits, ["linkedin", "github", "link"]);
});

test("ask ne propose rien : c'est du texte libre", () => {
  assert.deepEqual(candidates("ask que", CONTEXT).hits, []);
});

test("les alias héritent du vocabulaire de leur commande", () => {
  assert.deepEqual(candidates("partager li", CONTEXT).hits, candidates("share li", CONTEXT).hits);
});

test("le plus long préfixe commun sert à compléter", () => {
  assert.equal(commonPrefix(["coffee", "cowsay"]), "co");
  assert.equal(commonPrefix(["sudo"]), "sudo");
  assert.equal(commonPrefix([]), "");
  assert.equal(commonPrefix(["ls", "cd"]), "");
});

// Le second niveau : « slime » propose des expressions, « slime activity » des activités.
test("slime activity ne propose que des activités", () => {
  const result = candidates("slime activity ", CONTEXT);

  assert.deepEqual(result.hits, ["bike", "coffee", "goal", "juggle", "lift", "train"]);
  assert.equal(result.head, "slime activity");
});

test("slime propose activity et expression comme second mot", () => {
  const shown = candidates("slime ", CONTEXT).hits;

  assert.ok(shown.includes("activity"));
  assert.ok(shown.includes("expression"));
});

// Un troisième mot ne propose rien : le chemin « slime happy » n'a pas de vocabulaire.
test("un mot de trop ne propose rien", () => {
  assert.deepEqual(candidates("slime happy x", CONTEXT).hits, []);
});

// L'interpréteur normalise les espaces avant de lire la commande. Sans la même
// normalisation ici, un espace de trop rend la liste muette au lieu de la filtrer.
test("les espaces multiples ne cassent pas la complétion", () => {
  assert.deepEqual(hits("slime  "), hits("slime "));
  assert.deepEqual(hits("cd   who"), hits("cd who"));
  assert.deepEqual(hits("slime  activity  "), hits("slime activity "));
  assert.deepEqual(hits(" /wt"), hits("/wt"));
});

// L'espace final annonce l'argument suivant : la normalisation ne doit pas l'avaler.
test("l'espace final survit à la normalisation", () => {
  assert.equal(candidates("slime  ", CONTEXT).head, "slime");
  assert.equal(candidates("slime  ", CONTEXT).frag, "");
});

// « bd » est annoncé par l'aide, « sleep » et « ? » marchent : les trois manquaient au
// vocabulaire, donc la liste ne les proposait jamais.
test("bd, sleep et ? font partie du vocabulaire", () => {
  assert.ok(hits("b").includes("bd"));
  assert.ok(hits("sl").includes("sleep"));
  assert.ok(hits("?").includes("?"));
});

// Dix propositions au maximum, et « SLASH_ONLY » en porte exactement dix : le menu est
// plein au ras. Un onzième easter egg en pousserait un dehors, et l'ordre déciderait
// lequel. « /slime » porte le plus de branches, il vient donc en premier.
test("les dix easter eggs tiennent dans les dix propositions du slash", () => {
  const shown = hits("/");

  assert.equal(shown.length, 10, "le menu du slash est plein");
  assert.equal(shown[0], "/slime", "le plus riche se découvre en premier");
  assert.ok(shown.includes("/joke"));
});

// Le dispatcher réserve la navigation à ces trois verbes. La liste doit proposer des
// sections derrière les trois, et le test tombe si les deux listes divergent.
test("les trois verbes qui naviguent proposent tous les sections et les fiches", () => {
  for (const verb of ["bd", "cd", "open"]) {
    assert.deepEqual(hits(`${verb} `), ["whoami", "stack", "m-kereis", "m-run"], verb);
  }
});

test("theme propose ses thèmes au second mot", () => {
  assert.deepEqual(candidates("theme ", CONTEXT).hits, ["dark", "light", "noctis"]);
});

// La recherche porte deux noms, et l'étincelle dit lequel : celui qui passe par un modèle
// local. Les proposer tous les deux ferait croire à deux recherches différentes.
test("la recherche ne s'offre que sous le nom qui correspond au modèle", () => {
  const sans = candidates("a", CONTEXT).hits,
    avec = candidates("a", AVEC_MODELE).hits;

  assert.ok(sans.includes("ask"), "sans modèle, le nom simple");
  assert.ok(!sans.includes("ask✨"), "sans modèle, pas d'étincelle");

  assert.ok(avec.includes("ask✨"), "avec un modèle, l'étincelle");
  assert.ok(!avec.includes("ask"), "avec un modèle, pas le nom simple");
});

// Les deux noms se décrivent différemment : c'est la seule chose qui dit au visiteur ce que
// l'étincelle change.
test("chaque nom de la recherche porte sa propre description", () => {
  assert.equal(hintFor("", "ask"), "cherche dans le texte du site");
  assert.equal(hintFor("", "ask✨"), "un modèle local choisit la réponse");
});

// La liste ne montre que des noms. « goal » ou « bd » ne s'apprennent pas d'un nom :
// une ligne sous la liste dit ce que fait la proposition choisie.
test("chaque proposition du premier mot porte une description", () => {
  assert.equal(hintFor("", "bd"), "ouvre une section");
  assert.equal(hintFor("", "/slime"), "commande la mascotte");
  assert.equal(hintFor("", "cls"), "vide le journal");
});

test("les sous-commandes de slime portent la leur, à chaque niveau", () => {
  assert.equal(hintFor("slime", "activity"), "lui donne une occupation");
  assert.equal(hintFor("slime activity", "goal"), "il marque un but");
  assert.equal(hintFor("slime expression", "scared"), "il prend peur");
});

// Un nom venu du contenu n'a pas de description écrite : la ligne se cache plutôt que
// d'afficher un vide.
test("une proposition sans description rend une chaîne vide", () => {
  assert.equal(hintFor("", "whoami"), "");
  assert.equal(hintFor("share", "linkedin"), "");
  assert.equal(hintFor("xyzzy", "xyzzy"), "");
});
