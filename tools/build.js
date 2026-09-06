// Le dossier src/ reste la source lisible. dist/ est l'artefact compact, servi au visiteur.

import { basename, dirname, extname, join, relative } from "node:path";
import {
  cp,
  lstat,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  symlink,
  utimes,
  writeFile,
} from "node:fs/promises";
import { build } from "rolldown";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { minify } from "html-minifier-terser";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const SOURCE = join(ROOT, "src");

// La racine servie en ligne est dist/. Les tests construisent ailleurs, sinon lancer la
// suite publierait l'arbre de travail. Voir playwright.config.js.
const OUTPUT = process.env.PORTFOLIO_DIST ?? "dist";

const TARGET = join(ROOT, OUTPUT);
const VERSIONS = join(ROOT, ".versions", OUTPUT);
const LOCK = join(ROOT, ".versions", `${OUTPUT}.verrou`);
const LINK = join(ROOT, ".versions", `${OUTPUT}.lien`);
const LEGACY = join(ROOT, ".versions", `${OUTPUT}.reprise`);

const KEPT_VERSIONS = 3;

const CONTENT = "content.json";

const TRANSFORMED = new Set(["app.js", CONTENT, "index.html", "interpret.js", "texte.html"]);

// Ces noms sont des contrats avec l'extérieur : iOS demande /apple-touch-icon.png sans
// balise, la page charge content.json par une URL relative, et les robots lisent llms.txt.
const FIXED_NAMES = new Set([
  "apple-touch-icon.png",
  "content.json",
  "llms.txt",
  "robots.txt",
  "sitemap.xml",
]);

const STAMPED_EXTENSIONS = new Set([".css", ".js", ".pdf", ".png", ".svg", ".woff2"]);

const PAGES = ["index.html", "texte.html"];

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

const buildIndex = async (staging) => {
  const page = await readFile(join(SOURCE, "index.html"), "utf8");

  if (!page.includes(MODULE_TAG)) {
    throw new Error(`index.html ne porte plus ${MODULE_TAG}`);
  }

  const bundled = await bundle();
  // Une fonction de remplacement, car un remplacement littéral interprète les motifs en
  // dollar. Le code source porte « $$ » dans les yeux de cowsay.
  const replaced = page.replace(MODULE_TAG, () => `<script type="module">${bundled}</script>`);

  await writeFile(join(staging, "index.html"), await minify(replaced, MINIFY));
};

const buildTexte = async (staging) => {
  const page = await readFile(join(SOURCE, "texte.html"), "utf8");

  await writeFile(join(staging, "texte.html"), await minify(page, MINIFY));
};

// Le contenu est indenté à la main pour rester lisible. La construction retire cette mise
// en forme. La date de la source est reportée : sans elle, l'ETag changerait à chaque
// construction et la revalidation ne rendrait jamais de 304.
const buildContent = async (staging) => {
  const source = join(SOURCE, CONTENT);
  const target = join(staging, CONTENT);
  const { atime, mtime } = await stat(source);

  const parsed = JSON.parse(await readFile(source, "utf8"));

  await writeFile(target, JSON.stringify(parsed));
  await utimes(target, atime, mtime);
};

const walk = async (dir) => {
  const entries = await readdir(dir, { withFileTypes: true });
  const found = await Promise.all(
    entries.map(async (entry) => {
      const full = join(dir, entry.name);

      return entry.isDirectory() ? walk(full) : [full];
    }),
  );

  return found.flat();
};

// Cloudflare relève tout Cache-Control plus court que le sien sur les extensions qu'il met
// en cache. Une URL qui change avec le contenu est la seule garantie qu'un visiteur ne
// reçoive jamais un actif périmé contre une page fraîche.
const stampAssets = async (staging) => {
  const files = await walk(staging);
  const stampable = files.filter(
    (file) => STAMPED_EXTENSIONS.has(extname(file)) && !FIXED_NAMES.has(basename(file)),
  );

  const pairs = await Promise.all(
    stampable.map(async (file) => {
      const extension = extname(file);
      const bytes = await readFile(file);
      const digest = createHash("sha256").update(bytes).digest("hex").slice(0, 8);
      const stamped = join(dirname(file), `${basename(file, extension)}.${digest}${extension}`);

      await rename(file, stamped);

      return [relative(staging, file), relative(staging, stamped)];
    }),
  );

  return new Map(pairs);
};

// Du plus long au plus court : aucun nom n'est aujourd'hui le préfixe d'un autre, mais
// l'ordre protège le jour où deux actifs partageront un début de chemin.
const rewritePages = async (staging, renamed) => {
  const ordered = [...renamed].toSorted(([left], [right]) => right.length - left.length);
  const substitute = (text) =>
    ordered.reduce((carry, [from, to]) => carry.split(from).join(to), text);

  await Promise.all(
    PAGES.map(async (page) => {
      const file = join(staging, page);

      await writeFile(file, substitute(await readFile(file, "utf8")));
    }),
  );
};

const running = (pid) => {
  try {
    process.kill(pid, 0);

    return true;
  } catch {
    return false;
  }
};

const claimLock = async () => {
  await mkdir(LOCK);
  await writeFile(join(LOCK, "pid"), String(process.pid));
};

// La bascule est atomique, donc deux constructions simultanées ne peuvent plus détruire la
// version servie. Le verrou évite seulement le travail perdu.
const takeLock = async () => {
  await mkdir(dirname(LOCK), { recursive: true });

  try {
    await claimLock();

    return;
  } catch (error) {
    if (error.code !== "EEXIST") {
      throw error;
    }
  }

  // Un arrêt brutal ne passe pas par le nettoyage. Sans cette reprise, un Ctrl-C
  // interdirait toute construction suivante jusqu'à un effacement à la main.
  const owner = Number(await readFile(join(LOCK, "pid"), "utf8").catch(() => 0));

  if (owner && running(owner)) {
    throw new Error(`Une construction de ${OUTPUT} tourne déjà, sous le pid ${owner}.`);
  }

  await rm(LOCK, { force: true, recursive: true });
  await claimLock();
};

// Remplacer un lien symbolique est atomique. Le chemin servi désigne donc toujours une
// version complète, même si la construction meurt entre deux opérations.
const swap = async (version) => {
  await rm(LINK, { force: true });
  await symlink(relative(ROOT, version), LINK);

  const existing = await lstat(TARGET).catch(() => undefined);

  if (existing?.isDirectory()) {
    await rename(TARGET, LEGACY);
  }

  await rename(LINK, TARGET);
  await rm(LEGACY, { force: true, recursive: true });
};

const prune = async () => {
  const versions = await readdir(VERSIONS);
  const stale = versions.toSorted().slice(0, -KEPT_VERSIONS);

  await Promise.all(
    stale.map((name) => rm(join(VERSIONS, name), { force: true, recursive: true })),
  );
};

await takeLock();

try {
  const version = join(VERSIONS, new Date().toISOString().replaceAll(/[:.]/gu, "-"));

  await mkdir(version, { recursive: true });
  await cp(SOURCE, version, {
    filter: (from) => !TRANSFORMED.has(relative(SOURCE, from)),
    // Sans ça, chaque construction date à neuf des fichiers identiques. Leur ETag change,
    // et la revalidation « no-cache » du serveur ne rend jamais de 304.
    preserveTimestamps: true,
    recursive: true,
  });
  await buildIndex(version);
  await buildTexte(version);
  await buildContent(version);
  await rewritePages(version, await stampAssets(version));
  await swap(version);
  await prune();
} finally {
  await rm(LOCK, { force: true, recursive: true });
}
