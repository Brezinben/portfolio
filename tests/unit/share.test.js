import { fillTokens, interpret, proposalPrompt, shareTarget } from "../../production/interpret.js";
import assert from "node:assert/strict";
import { test } from "node:test";

const SHARE = {
  targets: [
    {
      id: "linkedin",
      kind: "intent",
      label: "LinkedIn",
      url: "https://li/share?url={url}&t={title}",
    },
    { id: "link", kind: "copy", label: "le lien", url: "{url}" },
  ],
  text: "un texte",
  title: "un titre",
  url: "https://exemple.test/",
};

const FEEDBACK = {
  notSent: "Aucun cookie.",
  sent: "Votre texte, et rien d'autre.",
  tool: "Umami",
  umamiHost: "https://umami.test",
};

const CONTEXT = {
  current: { cmd: "x", id: "whoami" },
  details: [],
  feedback: FEEDBACK,
  jokeIndex: 0,
  jokes: [],
  sections: [{ id: "whoami", label: "whoami" }],
  share: SHARE,
};

test("les jetons sont substitués et encodés", () => {
  const filled = fillTokens("https://li/share?url={url}&t={title}", SHARE);

  assert.match(filled, /url=https%3A%2F%2Fexemple\.test%2F/u);
  assert.match(filled, /t=un%20titre/u);
});

test("une cible inconnue ne rend rien", () => {
  assert.equal(shareTarget("nexistepas", SHARE), undefined);
});

test("une cible connue rend son genre et son URL prête", () => {
  const target = shareTarget("link", SHARE);

  assert.equal(target.kind, "copy");
  assert.equal(target.url, "https%3A%2F%2Fexemple.test%2F");
});

test("share seul liste les cibles déclarées", () => {
  const result = interpret("share", CONTEXT);

  assert.match(result.lines[1].t, /linkedin · link/u);
  assert.ok(result.effects.some((effect) => effect.type === "shareMenu"));
});

test("share vers une cible rend un effet portant son genre", () => {
  const result = interpret("share linkedin", CONTEXT);
  const effect = result.effects.find((entry) => entry.type === "share");

  assert.equal(effect.kind, "intent");
  assert.ok(result.effects.some((entry) => entry.type === "track" && entry.event === "partage"));
});

test("share vers une cible inconnue le dit", () => {
  assert.match(interpret("share nexistepas", CONTEXT).lines[1].t, /cible inconnue/u);
});

// Consentement en deux temps : rien ne part avant un oui.
test("propose annonce ce qui part, où, et ce qui ne part pas", () => {
  const result = interpret("/propose ajouter une section", CONTEXT);
  const body = result.lines.map((entry) => entry.t).join("\n");

  assert.match(body, /« ajouter une section »/u);
  assert.match(body, /umami\.test/u);
  assert.match(body, /Votre texte, et rien d'autre/u);
  assert.match(body, /Aucun cookie/u);
  assert.match(body, /oui ou non/u);
  assert.ok(
    !result.effects.some((entry) => entry.type === "send"),
    "rien ne part avant la confirmation",
  );
});

test("propose sans texte explique la commande", () => {
  assert.match(interpret("/propose", CONTEXT).lines[1].t, /propose <idée>/u);
});

test("oui envoie, non annule", () => {
  const pending = { ...CONTEXT, pending: "mon idée" };

  assert.ok(interpret("oui", pending).effects.some((entry) => entry.type === "send"));

  const refused = interpret("non", pending);

  assert.ok(!refused.effects.some((entry) => entry.type === "send"));
  assert.match(refused.lines.at(-1).t, /rien n'a été envoyé/u);
});

test("une réponse hors oui/non redemande sans rien envoyer", () => {
  const result = interpret("peut-être", { ...CONTEXT, pending: "mon idée" });

  assert.match(result.lines[0].t, /oui » ou « non/u);
  assert.deepEqual(result.effects, []);
});

test("le prompt de proposition tient sur cinq lignes", () => {
  assert.equal(proposalPrompt("x", FEEDBACK).length, 5);
});
