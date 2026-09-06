// Les trois artefacts publics doivent dire les mêmes faits. Un agent qui lit llms.txt et
// un agent qui suit le sitemap ne doivent pas trouver deux sites différents.

import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const SOURCE = new URL("../../src/", import.meta.url),
  read = (name: string) => readFileSync(fileURLToPath(new URL(name, SOURCE)), "utf8"),
  ORIGINE = "https://portfolio.brezinben.dpdns.org",
  sitemap = read("sitemap.xml"),
  robots = read("robots.txt"),
  llms = read("llms.txt"),
  texte = read("texte.html"),
  locs = [...sitemap.matchAll(/<loc>(?<url>[^<]+)<\/loc>/gu)].map((found) => found.groups?.url);

test("le sitemap est équilibré et déclare l'espace de noms attendu", () => {
  assert.match(sitemap, /^<\?xml version="1\.0" encoding="UTF-8"\?>/u);
  assert.match(sitemap, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/u);

  for (const tag of ["urlset", "url", "loc"]) {
    const opened = sitemap.match(new RegExp(`<${tag}[ >]`, "gu")) ?? [],
      closed = sitemap.match(new RegExp(`</${tag}>`, "gu")) ?? [];

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
    assert.ok(loc && llms.includes(loc), `llms.txt ne cite pas ${loc}`);
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

// La version texte recopie les huit thèmes de la version terminal, pour ne pas tirer une
// feuille de style de plus sur la page de repli. Ce test paie la duplication : une couleur
// qui change d'un côté doit changer de l'autre.
const CLES = ["--bg", "--panel", "--edge", "--fg", "--fg2", "--acc"],
  // Un thème peut s'écrire en plusieurs blocs : index.html surcharge « light » plus bas dans
  // la feuille. Les blocs de même nom se fondent, sinon le dernier efface le premier.
  themes = (html: string, prefixe: string) => {
    const releve: Record<string, Record<string, string>> = {};

    for (const bloc of html.matchAll(
      new RegExp(`${prefixe}\\[data-theme="(?<nom>[^"]+)"\\]\\s*\\{(?<corps>[^}]*)\\}`, "gu"),
    )) {
      const nom = bloc.groups?.nom ?? "",
        regles = [
          ...(bloc.groups?.corps ?? "").matchAll(/(?<cle>--[\w-]+):\s*(?<valeur>[^;\n]+)/gu),
        ];

      releve[nom] ??= {};

      for (const regle of regles) {
        releve[nom][regle.groups?.cle ?? ""] = regle.groups?.valeur?.trim() ?? "";
      }
    }

    return releve;
  };

test("les huit thèmes de la version texte reprennent les couleurs de la version terminal", () => {
  const source = themes(read("index.html"), String.raw`\.tm`),
    copie = themes(texte, ":root"),
    noms = Object.keys(source);

  assert.equal(noms.length, 8, "index.html ne déclare plus huit thèmes");
  assert.deepEqual(Object.keys(copie), noms, "texte.html ne déclare pas les mêmes thèmes");

  for (const nom of noms) {
    for (const cle of CLES) {
      assert.equal(copie[nom]?.[cle], source[nom]?.[cle], `${nom} : ${cle} a dérivé`);
    }
  }

  // L'ambre décoratif du thème clair ne passe pas le contraste sur du texte. Les deux pages
  // doivent porter la même variante sombre.
  assert.equal(copie["light"]?.["--acc-text"], "#8f5f00");
});

// Le contenu de la version texte est écrit en dur. content.json reste la source de vérité :
// sans ce test, la page dériverait en silence au prochain changement de contenu.
test("la version texte porte tout le contenu de content.json", () => {
  // SAFETY: content.json est un artefact du dépôt, versionné à côté de ce test, et son
  // schéma est tenu par tests/unit/content.test.ts. Seules trois clés sont lues ici.
  const contenu = JSON.parse(read("content.json")) as {
      stack: { kids: string[] }[];
      techNotes: Record<string, { note: string; where: string }>;
      timeline: { org: string }[];
    },
    absent = (valeur: string) => !texte.includes(valeur.replaceAll("&", "&amp;"));

  assert.deepEqual(Object.keys(contenu.techNotes).filter(absent), [], "des fiches techno manquent");
  assert.deepEqual(
    contenu.stack.flatMap((groupe) => groupe.kids).filter(absent),
    [],
    "des technos de la stack manquent",
  );
  assert.deepEqual(
    contenu.timeline.map((entree) => entree.org).filter(absent),
    [],
    "des expériences de la frise manquent",
  );
});
