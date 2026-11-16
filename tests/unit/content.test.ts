import assert from "node:assert/strict";
import { contentLine } from "../../src/interpret.ts";
import { it } from "node:test";
import { readFileSync } from "node:fs";

// SAFETY: content.json est un artefact du dépôt, versionné à côté de ce test. Seul le
// cursus est lu ici.
const { cursus } = JSON.parse(
  readFileSync(new URL("../../src/content.json", import.meta.url), "utf8"),
) as { cursus: { kind: string; years: string }[] };

it("should give every cursus entry a kind, formation or certification", () => {
  assert.notEqual(cursus.length, 0, "the cursus is empty");
  assert.deepEqual(
    cursus.filter((entry) => {
      return entry.kind !== "formation" && entry.kind !== "certification";
    }),
    [],
  );
});

// Le code ne trie rien : l'ordre du fichier est l'ordre d'affichage.
it("should list the cursus from the most recent year to the oldest", () => {
  const ends = cursus.map((entry) => {
    return Number(entry.years.match(/\d{4}/gu)?.at(-1));
  });

  for (const [at, end] of ends.entries()) {
    assert.ok(Number.isInteger(end), `entry ${at} carries no year`);
    assert.ok(end >= (ends[at + 1] ?? 0), `entry ${at} is older than the next one`);
  }
});

it("should keep the text, the tone and the weight of a plain line", () => {
  const result = contentLine({ t: "bonjour", tone: "acc", w: "700" });

  assert.equal(result.text, "bonjour");
  assert.equal(result.tone, "acc");
  assert.equal(result.weight, "700");
  assert.equal(result.pad, "0");
});

it("should carry both the word and the text equivalent of a banner line", () => {
  const result = contentLine({ banner: "benjamin", t: "Benjamin" });

  assert.equal(result.banner, "benjamin");
  assert.equal(result.text, "Benjamin");
});

// La sortie jq est colorée par type : clé en ambre, chaîne en vert, nombre en orange.
it("should split a jq pair into colored tokens", () => {
  const result = contentLine({ jq: ["14px", "email", "a@b.c", "str", true] });

  assert.deepEqual(
    result.tokens?.map((entry) => {
      return entry.t;
    }),
    ['"email"', ": ", '"a@b.c"', ","],
  );
  assert.deepEqual(
    result.tokens?.map((entry) => {
      return entry.c;
    }),
    ["acc", "fg2", "ok", "fg2"],
  );
  assert.equal(result.tokens?.[0]?.w, "700", "the key is bold");
  assert.equal(result.pad, "14px");
});

it("should not quote a jq number", () => {
  const result = contentLine({ jq: ["0", "delai", 48, "num", false] });

  assert.equal(result.tokens?.[2]?.t, "48");
  assert.equal(result.tokens?.[2]?.c, "warn");
  assert.equal(result.tokens?.length, 3, "no trailing comma");
});

it("should render the key and the brace on a jq object opening", () => {
  const result = contentLine({ jqOpen: ["14px", "social"] });

  assert.deepEqual(
    result.tokens?.map((entry) => {
      return entry.t;
    }),
    ['"social"', ": {"],
  );
});

it("should keep a jq punctuation line muted", () => {
  const result = contentLine({ jqLine: ["0", "}"] });

  assert.deepEqual(result.tokens, [{ c: "fg2", t: "}", w: "400" }]);
});

it("should keep the declared indent as is, unit included", () => {
  assert.equal(contentLine({ jq: ["30px", "k", "v", "str", false] }).pad, "30px");
  assert.equal(contentLine({ pad: "14px", t: "x" }).pad, "14px");
});
