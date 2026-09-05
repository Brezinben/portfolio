// Le dossier production/ reste la source lisible. dist/ est l'artefact compact, servi au visiteur.

import { cp, readFile, rm, writeFile } from "node:fs/promises";
import { build } from "rolldown";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { minify } from "html-minifier-terser";

const SOURCE = fileURLToPath(new URL("../production/", import.meta.url));
const TARGET = fileURLToPath(new URL("../dist/", import.meta.url));

const TRANSFORMED = new Set(["index.html", "interpret.js", "texte.html"]);

const INLINE_MODULE = /<script type="module">(?<code>[\s\S]*?)<\/script>/u;

// Le module en ligne n'existe pas sur le disque. Un identifiant situé dans production/
// laisse rolldown résoudre « ./interpret.js » comme le fait le navigateur.
const ENTRY = join(SOURCE, "index.inline.js");

// MinifyJS reste absent. Rolldown a déjà minifié le seul script en ligne du projet.
// RemoveAttributeQuotes et removeOptionalTags rendent le balisage déroutant pour 0,3 Ko.
const MINIFY = { collapseWhitespace: true, minifyCSS: true, removeComments: true };

const inlineEntry = (code) => ({
  load: (id) => (id === ENTRY ? code : undefined),
  name: "inline-entry",
  resolveId: (source) => (source === ENTRY ? ENTRY : undefined),
});

const bundle = async (code) => {
  const result = await build({
    input: ENTRY,
    output: { format: "esm", minify: true },
    plugins: [inlineEntry(code)],
    write: false,
  });

  return result.output[0].code;
};

const buildIndex = async () => {
  const page = await readFile(join(SOURCE, "index.html"), "utf8");
  const match = page.match(INLINE_MODULE);

  if (!match) {
    throw new Error('index.html ne porte plus de <script type="module">');
  }

  const bundled = await bundle(match.groups.code);
  // Une fonction de remplacement, car un remplacement littéral interprète les motifs en
  // dollar. Le code source porte « $$ » dans les yeux de cowsay.
  const replaced = page.replace(INLINE_MODULE, () => `<script type="module">${bundled}</script>`);

  await writeFile(join(TARGET, "index.html"), await minify(replaced, MINIFY));
};

const buildTexte = async () => {
  const page = await readFile(join(SOURCE, "texte.html"), "utf8");

  await writeFile(join(TARGET, "texte.html"), await minify(page, MINIFY));
};

await rm(TARGET, { force: true, recursive: true });
await cp(SOURCE, TARGET, {
  filter: (from) => !TRANSFORMED.has(from.slice(SOURCE.length)),
  recursive: true,
});
await buildIndex();
await buildTexte();
