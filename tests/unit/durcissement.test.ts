import { TONES, contentLine, isSafeUrl, safeTone, shareTarget } from "../../src/interpret.ts";
import assert from "node:assert/strict";
import { it } from "node:test";

// Les tons sont interpolés dans un attribut style. Un ton non filtré permet de fermer la
// déclaration et d'injecter du CSS, jusqu'à faire sortir une requête vers un tiers.
it("should fall back to the safe tone on an unknown tone", () => {
  assert.equal(safeTone("fg);background-image:url(https://evil.test/x"), "fg");
  assert.equal(safeTone(undefined), "fg");
  assert.equal(safeTone("", "fg2"), "fg2");
});

it("should accept the five tones of the glossary", () => {
  assert.deepEqual(TONES, ["acc", "fg", "fg2", "ok", "warn"]);

  for (const tone of TONES) {
    assert.equal(safeTone(tone), tone);
  }
});

it("should not let a content line carry an arbitrary tone", () => {
  const hostile = contentLine({
    mc: "x);content:'a'",
    t: "charge",
    tone: "fg);background:url(https://evil.test/",
  });

  assert.equal(hostile.tone, "fg");
  assert.equal(hostile.markerTone, "fg2");
});

it("should not let a jq token carry an arbitrary tone", () => {
  const [key] = contentLine({ jq: ["0", "k", "v", "str", false] }).tokens ?? [];

  assert.ok(key && TONES.includes(key.c));
});

// Une cible declaree dans le contenu ne doit pas pouvoir executer de script.
it("should accept http, https, mailto and relative URLs", () => {
  assert.equal(isSafeUrl("https://exemple.test/"), true);
  assert.equal(isSafeUrl("http://exemple.test/"), true);
  assert.equal(isSafeUrl("mailto:a@b.c"), true);
  assert.equal(isSafeUrl("/relatif"), true);
});

// Les URL executables sont composees et non ecrites en clair : la regle no-script-url
// interdit le litteral, alors qu'il est ici la charge utile du test.
const SCRIPT = ["java", "script:"].join("");

it("should reject executable URL schemes", () => {
  for (const hostile of [
    `${SCRIPT}alert(1)`,
    `${SCRIPT.toUpperCase()}alert(1)`,
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox",
    "file:///etc/passwd",
  ]) {
    assert.equal(isSafeUrl(hostile), false, `${hostile} must be rejected`);
  }
});

it("should not return a share target with a forbidden scheme", () => {
  const share = {
    targets: [
      { id: "piege", kind: "open", label: "piège", url: `${SCRIPT}globalThis.pwned = 1` },
      { id: "sain", kind: "open", label: "sain", url: "https://exemple.test/?u={url}" },
    ],
    url: "https://portfolio.test/",
  };

  assert.equal(shareTarget("piege", share), undefined);
  assert.ok(shareTarget("sain", share)?.url.startsWith("https://"));
});

// Une sequence pourcent invalide ne doit pas lever d'exception.
it("should not break the validation on a badly encoded URL", () => {
  assert.doesNotThrow(() => isSafeUrl("https://x.test/%E0%A4%A"));
  assert.equal(isSafeUrl("https://x.test/%E0%A4%A"), true);
});
