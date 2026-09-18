import { fillTokens, interpret, proposalPrompt, shareTarget } from "../../src/interpret.ts";
import assert from "node:assert/strict";
import { it } from "node:test";

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
  },
  FEEDBACK = {
    notSent: "Aucun cookie.",
    sent: "Votre texte, et rien d'autre.",
    tool: "Umami",
    umamiHost: "https://umami.test",
  },
  CONTEXT = {
    columns: 60,
    current: { cmd: "x", id: "whoami" },
    details: [],
    feedback: FEEDBACK,
    jokeIndex: 0,
    jokes: [],
    mascot: "here" as const,
    model: false,
    sections: [{ id: "whoami", label: "whoami" }],
    share: SHARE,
    shareTargets: [],
    themes: [],
  };

it("should substitute and encode the tokens", () => {
  const filled = fillTokens("https://li/share?url={url}&t={title}", SHARE);

  assert.match(filled, /url=https%3A%2F%2Fexemple\.test%2F/u);
  assert.match(filled, /t=un%20titre/u);
});

it("should return nothing for an unknown target", () => {
  assert.equal(shareTarget("nexistepas", SHARE), undefined);
});

it("should return the kind and the ready URL of a known target", () => {
  const target = shareTarget("link", SHARE);

  assert.equal(target?.kind, "copy");
  assert.equal(target?.url, "https%3A%2F%2Fexemple.test%2F");
});

it("should list the declared targets when share runs alone", () => {
  const result = interpret("share", CONTEXT);

  assert.match(result.lines[1]?.t ?? "", /linkedin · link/u);
  assert.ok(
    result.effects.some((effect) => {
      return effect.type === "shareMenu";
    }),
  );
});

it("should carry the target kind in the effect when share picks a target", () => {
  const result = interpret("share linkedin", CONTEXT),
    effect = result.effects.find((entry) => {
      return entry.type === "share";
    });

  assert.equal(effect?.kind, "intent");
  assert.ok(
    result.effects.some((entry) => {
      return entry.type === "track" && entry.event === "partage";
    }),
  );
});

it("should say so when share picks an unknown target", () => {
  assert.match(interpret("share nexistepas", CONTEXT).lines[1]?.t ?? "", /cible inconnue/u);
});

// Consentement en deux temps : rien ne part avant un oui.
it("should announce what is sent, where, and what is not sent", () => {
  const result = interpret("/propose ajouter une section", CONTEXT),
    body = result.lines
      .map((entry) => {
        return entry.t;
      })
      .join("\n");

  assert.match(body, /« ajouter une section »/u);
  assert.match(body, /umami\.test/u);
  assert.match(body, /Votre texte, et rien d'autre/u);
  assert.match(body, /Aucun cookie/u);
  assert.match(body, /oui ou non/u);
  assert.ok(
    !result.effects.some((entry) => {
      return entry.type === "send";
    }),
    "nothing is sent before the confirmation",
  );
});

it("should explain the command when propose has no text", () => {
  assert.match(interpret("/propose", CONTEXT).lines[1]?.t ?? "", /propose \[-y\] <idée>/u);
});

// La reponse attendue est deja ecrite : la validation tient en une touche.
it("should pre-write the answer in the input", () => {
  const pending = interpret("/propose ajouter une section", CONTEXT).effects.find((entry) => {
    return entry.type === "pending";
  });

  assert.equal(pending?.answer, "oui");
});

// -y vaut consentement : le drapeau a ete tape avec l'idee.
it("should send without asking the question when propose gets -y", () => {
  const result = interpret("/propose -y ajouter une section", CONTEXT);

  assert.ok(
    result.effects.some((entry) => {
      return entry.type === "send";
    }),
  );
  assert.ok(
    !result.effects.some((entry) => {
      return entry.type === "pending";
    }),
  );
  assert.match(result.lines.at(-1)?.t ?? "", /« ajouter une section »/u);
});

it("should explain the command when propose gets -y without an idea", () => {
  assert.match(interpret("/propose -y", CONTEXT).lines[1]?.t ?? "", /propose \[-y\] <idée>/u);
});

// Le drapeau est un mot entier : une idee qui commence par « -y » reste intacte.
it("should not cut an idea that starts with -y", () => {
  const result = interpret("/propose -yeux plus grands", CONTEXT);

  assert.ok(
    result.effects.some((entry) => {
      return entry.type === "pending";
    }),
  );
  assert.match(
    result.lines
      .map((entry) => {
        return entry.t;
      })
      .join("\n"),
    /« -yeux plus grands »/u,
  );
});

it("should send on oui and cancel on non", () => {
  const pending = { ...CONTEXT, pending: "mon idée" };

  assert.ok(
    interpret("oui", pending).effects.some((entry) => {
      return entry.type === "send";
    }),
  );

  const refused = interpret("non", pending);

  assert.ok(
    !refused.effects.some((entry) => {
      return entry.type === "send";
    }),
  );
  assert.match(refused.lines.at(-1)?.t ?? "", /rien n'a été envoyé/u);
  assert.ok(
    refused.effects.some((entry) => {
      return entry.type === "state" && entry.patch.pending === undefined;
    }),
    "refusing releases the pending state, otherwise the next command reads as an answer",
  );
});

it("should ask again without sending anything on an answer other than oui or non", () => {
  const result = interpret("peut-être", { ...CONTEXT, pending: "mon idée" });

  assert.match(result.lines[0]?.t ?? "", /oui » ou « non/u);
  assert.deepEqual(result.effects, []);
});

it("should keep the proposal prompt on five lines", () => {
  assert.equal(proposalPrompt("x", FEEDBACK).length, 5);
});
