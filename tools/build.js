// Le dossier production/ reste la source lisible. dist/ est l'artefact compact, servi au visiteur.

import { cp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { build } from "rolldown";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { minify } from "html-minifier-terser";

const SOURCE = fileURLToPath(new URL("../production/", import.meta.url));
const TARGET = fileURLToPath(new URL("../dist/", import.meta.url));

// Le serveur public sert dist/. Construire dedans le viderait le temps de la construction,
// donc le site rendrait des 404. Le dossier neuf se construit a cote, puis remplace l'ancien.
const STAGING = fileURLToPath(new URL("../dist.neuf/", import.meta.url));

const TRANSFORMED = new Set(["app.js", "index.html", "interpret.js", "texte.html"]);

const MODULE_TAG = '<script type="module" src="app.js"></script>';

// MinifyJS reste absent. Rolldown a déjà minifié le seul script en ligne du projet.
// RemoveAttributeQuotes et removeOptionalTags rendent le balisage déroutant pour 0,3 Ko.
const MINIFY = { collapseWhitespace: true, minifyCSS: true, removeComments: true };

const bundle = async () => {
  const result = await build({
    input: join(SOURCE, "app.js"),
    output: { format: "esm", minify: true },
    write: false,
  });

  return result.output[0].code;
};

const buildIndex = async () => {
  const page = await readFile(join(SOURCE, "index.html"), "utf8");

  if (!page.includes(MODULE_TAG)) {
    throw new Error(`index.html ne porte plus ${MODULE_TAG}`);
  }

  const bundled = await bundle();
  // Une fonction de remplacement, car un remplacement littéral interprète les motifs en
  // dollar. Le code source porte « $$ » dans les yeux de cowsay.
  const replaced = page.replace(MODULE_TAG, () => `<script type="module">${bundled}</script>`);

  await writeFile(join(STAGING, "index.html"), await minify(replaced, MINIFY));
};

const buildTexte = async () => {
  const page = await readFile(join(SOURCE, "texte.html"), "utf8");

  await writeFile(join(STAGING, "texte.html"), await minify(page, MINIFY));
};

await rm(STAGING, { force: true, recursive: true });
await cp(SOURCE, STAGING, {
  filter: (from) => !TRANSFORMED.has(from.slice(SOURCE.length)),
  recursive: true,
});
await buildIndex();
await buildTexte();

const previous = `${TARGET.replace(/\/$/u, "")}.ancien`;

await rm(previous, { force: true, recursive: true });
await rename(TARGET, previous).catch(() => {});
await rename(STAGING, TARGET);
await rm(previous, { force: true, recursive: true });
