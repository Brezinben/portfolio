// Les trois artefacts publics doivent dire les mêmes faits. Un agent qui lit llms.txt et
// un agent qui suit le sitemap ne doivent pas trouver deux sites différents.

import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const SOURCE = new URL("../../src/", import.meta.url);

const read = (name) => readFileSync(fileURLToPath(new URL(name, SOURCE)), "utf8");

const ORIGINE = "https://portfolio.brezinben.dpdns.org";

const sitemap = read("sitemap.xml");
const robots = read("robots.txt");
const llms = read("llms.txt");
const texte = read("texte.html");

const locs = [...sitemap.matchAll(/<loc>(?<url>[^<]+)<\/loc>/gu)].map((found) => found.groups.url);

test("le sitemap est équilibré et déclare l'espace de noms attendu", () => {
  assert.match(sitemap, /^<\?xml version="1\.0" encoding="UTF-8"\?>/u);
  assert.match(sitemap, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/u);

  for (const tag of ["urlset", "url", "loc"]) {
    const opened = sitemap.match(new RegExp(`<${tag}[ >]`, "gu")) ?? [];
    const closed = sitemap.match(new RegExp(`</${tag}>`, "gu")) ?? [];

    assert.equal(opened.length, closed.length, `la balise ${tag} n'est pas fermée autant de fois`);
  }
});

test("chaque adresse du sitemap désigne un fichier servi", () => {
  assert.deepEqual(locs, [`${ORIGINE}/`, `${ORIGINE}/texte.html`]);

  for (const loc of locs) {
    const name = loc.slice(ORIGINE.length + 1) || "index.html";

    assert.doesNotThrow(() => read(name), `${loc} ne correspond à aucun fichier de src/`);
  }
});

test("robots.txt ouvre le site et désigne le sitemap", () => {
  assert.ok(/^User-agent: \*$/mu.test(robots), "robots.txt ne porte pas de groupe universel");
  assert.ok(/^Allow: \/$/mu.test(robots), "robots.txt n'ouvre pas la racine");
  assert.ok(
    robots.includes(`Sitemap: ${ORIGINE}/sitemap.xml`),
    "robots.txt ne cite pas le sitemap",
  );
});

test("llms.txt ne nomme que des adresses qui existent", () => {
  assert.ok(!llms.includes(".dc.html"), "les noms du canvas ne sont pas des adresses servies");

  for (const loc of locs) {
    assert.ok(llms.includes(loc), `llms.txt ne cite pas ${loc}`);
  }
});

// Le contresens le plus coûteux : croire que ce domaine héberge un serveur MCP parce que
// Benjamin en conçoit pour ses clients.
test("llms.txt dit ce que le site n'expose pas", () => {
  assert.ok(llms.includes("## Quand ce site répond à votre question"), "la section manque");
  assert.ok(llms.includes("n'en héberge aucun"), "llms.txt ne dément pas le serveur MCP hébergé");
  assert.ok(llms.includes("ni produit, ni API"), "llms.txt ne dément pas l'API");
});

test("llms.txt et la version texte donnent le même contact", () => {
  const contact = "benjamin.david1@hotmail.fr";

  assert.ok(llms.includes(contact), "llms.txt ne donne pas le contact attendu");
  assert.ok(texte.includes(contact), "texte.html ne donne pas le contact attendu");
});
