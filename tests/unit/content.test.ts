import assert from "node:assert/strict";
import { contentLine } from "../../src/interpret.ts";
import { it } from "node:test";

it("une ligne simple garde son texte, son ton et sa graisse", () => {
  const result = contentLine({ t: "bonjour", tone: "acc", w: "700" });

  assert.equal(result.text, "bonjour");
  assert.equal(result.tone, "acc");
  assert.equal(result.weight, "700");
  assert.equal(result.pad, "0");
});

it("une ligne bandeau porte son mot et son équivalent textuel", () => {
  const result = contentLine({ banner: "benjamin", t: "Benjamin" });

  assert.equal(result.banner, "benjamin");
  assert.equal(result.text, "Benjamin");
});

// La sortie jq est colorée par type : clé en ambre, chaîne en vert, nombre en orange.
it("une paire jq est découpée en jetons colorés", () => {
  const result = contentLine({ jq: ["14px", "email", "a@b.c", "str", true] });

  assert.deepEqual(
    result.tokens?.map((entry) => entry.t),
    ['"email"', ": ", '"a@b.c"', ","],
  );
  assert.deepEqual(
    result.tokens?.map((entry) => entry.c),
    ["acc", "fg2", "ok", "fg2"],
  );
  assert.equal(result.tokens?.[0]?.w, "700", "la clé est en gras");
  assert.equal(result.pad, "14px");
});

it("un nombre jq n'est pas mis entre guillemets", () => {
  const result = contentLine({ jq: ["0", "delai", 48, "num", false] });

  assert.equal(result.tokens?.[2]?.t, "48");
  assert.equal(result.tokens?.[2]?.c, "warn");
  assert.equal(result.tokens?.length, 3, "sans virgule finale");
});

it("une ouverture d'objet jq rend la clé et l'accolade", () => {
  const result = contentLine({ jqOpen: ["14px", "social"] });

  assert.deepEqual(
    result.tokens?.map((entry) => entry.t),
    ['"social"', ": {"],
  );
});

it("une ligne de ponctuation jq reste sourde", () => {
  const result = contentLine({ jqLine: ["0", "}"] });

  assert.deepEqual(result.tokens, [{ c: "fg2", t: "}", w: "400" }]);
});

it("le retrait déclaré est conservé tel quel, unité comprise", () => {
  assert.equal(contentLine({ jq: ["30px", "k", "v", "str", false] }).pad, "30px");
  assert.equal(contentLine({ pad: "14px", t: "x" }).pad, "14px");
});
