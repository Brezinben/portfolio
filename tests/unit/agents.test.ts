// Les trois artefacts publics doivent dire les mêmes faits. Un agent qui lit llms.txt et
// un agent qui suit le sitemap ne doivent pas trouver deux sites différents.

import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { it } from "node:test";
import { readFileSync } from "node:fs";

const SOURCE = new URL("../../src/", import.meta.url),
  read = (name: string) => {
    return readFileSync(fileURLToPath(new URL(name, SOURCE)), "utf8");
  },
  ORIGINE = "https://me.brezinben.dpdns.org",
  sitemap = read("sitemap.xml"),
  robots = read("robots.txt"),
  llms = read("llms.txt"),
  llmsFull = read("llms-full.txt"),
  texte = read("texte.html"),
  errorSheet = read("404.css"),
  styles = read("styles.css"),
  locs = [...sitemap.matchAll(/<loc>(?<url>[^<]+)<\/loc>/gu)].map((found) => {
    return found.groups?.url;
  });

it("should keep the sitemap balanced and declare the expected namespace", () => {
  assert.match(sitemap, /^<\?xml version="1\.0" encoding="UTF-8"\?>/u);
  assert.match(sitemap, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/u);

  for (const tag of ["urlset", "url", "loc"]) {
    const opened = sitemap.match(new RegExp(`<${tag}[ >]`, "gu")) ?? [],
      closed = sitemap.match(new RegExp(`</${tag}>`, "gu")) ?? [];

    assert.equal(
      opened.length,
      closed.length,
      `the ${tag} tag is not closed as many times as it is opened`,
    );
  }
});

it("should point every sitemap address at a served file", () => {
  assert.deepEqual(locs, [`${ORIGINE}/`, `${ORIGINE}/texte.html`]);

  for (const loc of locs) {
    const name = loc.slice(ORIGINE.length + 1) || "index.html";

    assert.doesNotThrow(() => {
      return read(name);
    }, `${loc} matches no file in src/`);
  }
});

it("should open the site and name the sitemap in robots.txt", () => {
  assert.ok(/^User-agent: \*$/mu.test(robots), "robots.txt carries no universal group");
  assert.ok(/^Allow: \/$/mu.test(robots), "robots.txt does not open the root");
  assert.ok(
    robots.includes(`Sitemap: ${ORIGINE}/sitemap.xml`),
    "robots.txt does not name the sitemap",
  );
});

it("should name only existing addresses in llms.txt", () => {
  assert.ok(!llms.includes(".dc.html"), "the canvas names are not served addresses");

  for (const loc of locs) {
    assert.ok(loc && llms.includes(loc), `llms.txt does not name ${loc}`);
  }
});

// https://llmstxt.org/ : un H1, un résumé en blockquote, des détails sans titre, puis des
// sections H2 qui ne contiennent que des listes de liens. Sans ce test, llms.txt redevient
// le document qu'il était, et plus aucun analyseur ne sait le lire.
const LIEN = /^- \[[^\]]+\]\(https:\/\/[^)]+\)(?<notes>: .+)?$/su;

it("should follow the grammar of the convention in llms.txt", () => {
  const [titre, vide, resume] = llms.split("\n");

  assert.match(titre ?? "", /^# \S/u, "the first line is not the title");
  assert.equal(vide, "", "the title is not followed by an empty line");
  assert.match(resume ?? "", /^> \S/u, "the blockquote summary does not follow the title");

  const sections = llms.split(/^## .+$/mu).slice(1);

  assert.ok(sections.length >= 1, "llms.txt carries no section");

  for (const section of sections) {
    const entrees = section.trim().split(/\n(?=- )/u);

    for (const entree of entrees) {
      assert.match(entree, LIEN, "a section carries more than a list of links");
    }
  }

  assert.ok(llms.includes("## Optional"), "the Optional section is missing");
  assert.ok(
    llms.includes(`${ORIGINE}/llms-full.txt`),
    "llms.txt does not link to the full content",
  );
});

// La version texte et la page d'erreur recopient les huit thèmes de la version terminal :
// ni l'une ni l'autre ne charge le point d'entrée, donc aucune ne peut lire la table. Ce
// test paie la duplication : une couleur qui change d'un côté doit changer des deux autres.
const CLES = ["--bg", "--panel", "--edge", "--fg", "--fg2", "--acc"],
  // Un thème peut s'écrire en plusieurs blocs, qui se fondent sous le même nom sinon le
  // dernier efface le premier. La casse tombe aussi : ce test surveille une dérive de
  // valeur, pas de graphie.
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
        releve[nom][regle.groups?.cle ?? ""] = (regle.groups?.valeur?.trim() ?? "").toLowerCase();
      }
    }

    return releve;
  };

it("should copy the terminal version colors into the eight themes of the other pages", () => {
  const source = themes(styles, String.raw`\.tm`),
    noms = Object.keys(source);

  assert.equal(noms.length, 8, "styles.css no longer declares eight themes");

  for (const [page, copy] of [
    ["texte.html", themes(texte, ":root")],
    ["404.css", themes(errorSheet, ":root")],
  ] as const) {
    assert.deepEqual(Object.keys(copy), noms, `${page} does not declare the same themes`);

    for (const theme of noms) {
      for (const key of CLES) {
        assert.equal(
          copy[theme]?.[key],
          source[theme]?.[key],
          `${page} ${theme}: ${key} has drifted`,
        );
      }
    }

    // L'ambre décoratif du thème clair ne passe pas le contraste sur du texte. Les trois
    // pages doivent porter la même variante sombre.
    assert.equal(copy.light?.["--acc-text"], "#8f5f00", `${page}: the light amber has drifted`);
  }
});

// Le contenu de la version texte est écrit en dur. content.json reste la source de vérité :
// sans ce test, la page dériverait en silence au prochain changement de contenu. Le contenu
// complet servi aux agents est une seconde copie, tenue par la même mesure.
it("should carry all of content.json in the text version and in the full content", () => {
  // SAFETY: content.json est un artefact du dépôt, versionné à côté de ce test, et son
  // schéma est tenu par tests/unit/content.test.ts. Seules trois clés sont lues ici.
  const contenu = JSON.parse(read("content.json")) as {
      stack: { kids: string[] }[];
      techNotes: Record<string, { note: string; where: string }>;
      timeline: { org: string }[];
    },
    absent = (valeur: string) => {
      return !texte.includes(valeur.replaceAll("&", "&amp;")) || !llmsFull.includes(valeur);
    };

  assert.deepEqual(
    Object.keys(contenu.techNotes).filter(absent),
    [],
    "some tech notes are missing",
  );
  assert.deepEqual(
    contenu.stack
      .flatMap((groupe) => {
        return groupe.kids;
      })
      .filter(absent),
    [],
    "some stack technologies are missing",
  );
  assert.deepEqual(
    contenu.timeline
      .map((entree) => {
        return entree.org;
      })
      .filter(absent),
    [],
    "some timeline entries are missing",
  );
});
