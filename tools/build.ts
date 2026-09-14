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
import { crc32, deflateSync, inflateSync } from "node:zlib";
import { build } from "rolldown";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { minify } from "html-minifier-terser";

const ROOT = fileURLToPath(new URL("../", import.meta.url)),
  SOURCE = join(ROOT, "src"),
  // La racine servie en ligne est dist/. Les tests construisent ailleurs, sinon lancer la
  // suite publierait l'arbre de travail. Voir playwright.config.ts.
  OUTPUT = process.env.PORTFOLIO_DIST ?? "dist",
  TARGET = join(ROOT, OUTPUT),
  VERSIONS = join(ROOT, ".versions", OUTPUT),
  LOCK = join(ROOT, ".versions", `${OUTPUT}.verrou`),
  LINK = join(ROOT, ".versions", `${OUTPUT}.lien`),
  LEGACY = join(ROOT, ".versions", `${OUTPUT}.reprise`),
  KEPT_VERSIONS = 3,
  CONTENT = "content.json",
  TRANSFORMED = new Set([CONTENT, "404.css", "404.html", "index.html", "texte.html"]),
  // Ces noms sont des contrats avec l'extérieur : iOS demande /apple-touch-icon.png sans
  // balise, la page charge content.json par une URL relative, et les robots lisent llms.txt.
  FIXED_NAMES = new Set([
    "apple-touch-icon.png",
    "content.json",
    "llms-full.txt",
    "llms.txt",
    "robots.txt",
    "sitemap.xml",
  ]),
  STAMPED_EXTENSIONS = new Set([".css", ".js", ".pdf", ".png", ".svg", ".woff2"]),
  PAGES = ["404.html", "index.html", "texte.html"],
  MODULE_TAG = '<script type="module" src="app.ts"></script>',
  STYLE_TAG = '<link rel="stylesheet" href="404.css">',
  SCRIPT_TAG = '<script src="404.ts"></script>',
  // Une case de mascotte fait 32 px natifs et s'affiche à x2. Voir l'ADR 0004.
  FRAME = 32,
  SCALE = 2,
  BAND = FRAME * SCALE,
  // Trois formes, une feuille fusionnée chacune. Le dossier porte le nom de la forme, le
  // fichier porte le préfixe que le designer emploie. Le préfixe « -sheets » est tenu par le
  // budget, qui compte les images de mascotte dessus.
  FORMS = [
    { dir: "slime", prefix: "slime" },
    { dir: "cube", prefix: "cube" },
    { dir: "pingouin", prefix: "peng" },
  ],
  sheetsOf = (dir: string) => `assets/sprites/${dir}-sheets.png`,
  dirOf = (file: string) => file.replace(LEADING_SLASH, "").split("/")[2] ?? "",
  // Le CSS de src/ nomme une feuille par état, dans l'ordre des bandes attendues ; la
  // construction empile les feuilles dans cet ordre, puis remplace chaque paire par le
  // décalage de sa bande. Les deux sortent du même balayage : ils ne peuvent pas diverger.
  SHEET_RULE =
    /(?<indent>[^\S\n]*)background-image: url\("(?<file>\/?assets\/sprites\/[a-z]+\/[^"]+\.png)"\);\n[^\S\n]*background-size: \d+px \d+px;\n/gu,
  SHEET_URL = /\/?assets\/sprites\/[a-z]+\/[^"]+\.png/gu,
  // La 404 est servie sur une adresse quelconque : elle écrit des chemins absolus, là où
  // index.html les écrit relatifs. Le plan, lui, ne connaît que la forme relative.
  LEADING_SLASH = /^\//u,
  // La règle de base d'une forme porte la position de départ. Elle reçoit l'image fusionnée,
  // que les règles d'état ne déclarent plus. Le slime est la forme par défaut, sans attribut.
  BASE_RULE = {
    cube: /(?<head>\.slime\[data-form="cube"\] \{\n)(?<indent>[^\S\n]*)background-position: 0 0\n/u,
    pingouin:
      /(?<head>\.slime\[data-form="pingouin"\] \{\n)(?<indent>[^\S\n]*)background-position: 0 0\n/u,
    slime: /(?<head>)(?<indent>[^\S\n]*)background-position: 0 0;\n/u,
  },
  // MinifyJS reste absent. Rolldown a déjà minifié les deux scripts en ligne du projet.
  // RemoveAttributeQuotes et removeOptionalTags rendent le balisage déroutant pour 0,3 Ko.
  MINIFY = { collapseWhitespace: true, minifyCSS: true, removeComments: true },
  // Le code d'erreur de Node n'est pas dans le type Error : on le retrecit plutot que de
  // l'affirmer. TypeScript impose « unknown » sur un catch ; deviner une forme avant de la verifier ecrirait moins sur que ce code.
  // oxlint-disable-next-line anti-slop/no-unknown-parameters
  errorCode = (error: unknown): string | undefined =>
    // oxlint-disable-next-line anti-slop/no-runtime-typeof
    error instanceof Error && "code" in error && typeof error.code === "string"
      ? error.code
      : undefined,
  // La page d'accueil charge un module ; la page d'erreur pose son thème avant le premier
  // rendu, donc son script est bloquant et ne peut pas être un module. D'où les deux formats.
  bundle = async (entry: string, format: "esm" | "iife") => {
    const result = await build({
        input: join(SOURCE, entry),
        output: { format, minify: true },
        write: false,
      }),
      [chunk] = result.output;

    if (!chunk) {
      throw new Error(`Rolldown n'a rien produit pour ${entry}`);
    }

    return chunk.code;
  },
  // Les feuilles sont en 8 bits RGBA, non entrelacées : le cas le plus simple du
  // format. Les lire et les réécrire à la main coûte moins qu'une dépendance de plus.
  BYTES_PER_PIXEL = 4,
  BYTE = 255,
  // La signature écrite en octets, et non en hexadécimal : oxfmt et oxlint ne s'accordent
  // pas sur la casse des chiffres hexadécimaux.
  PNG_SIGNATURE = Buffer.from("\x89PNG\r\n\x1A\n", "latin1"),
  // Le prédicteur du filtre 4, défini par la spécification PNG.
  paeth = (left: number, above: number, corner: number) => {
    const estimate = left + above - corner,
      toLeft = Math.abs(estimate - left),
      toAbove = Math.abs(estimate - above),
      toCorner = Math.abs(estimate - corner);

    if (toLeft <= toAbove && toLeft <= toCorner) {
      return left;
    }

    if (toAbove <= toCorner) {
      return above;
    }

    return corner;
  },
  // Un voisin hors de l'image vaut zéro. La spécification PNG le demande pour la première
  // ligne et pour la première colonne.
  neighbour = (pixels: Buffer, offset: number, options: { inside: boolean }) => {
    if (!options.inside) {
      return 0;
    }

    return pixels.readUInt8(offset);
  };

// Le voisinage qu'un filtre PNG consulte : le pixel de gauche, celui du dessus, et le coin
// entre les deux. Un voisin hors de l'image vaut zéro.
type Around = { above: number; corner: number; left: number };

// Ce qu'un balayage de index.html apprend sur les feuilles fusionnées : la bande de
// chaque feuille source, et la taille d'affichage de l'image de chaque forme.
type SheetSize = { height: number; width: number };
type SheetPlan = { bands: Map<string, number>; sizes: Map<string, SheetSize> };

// Les cinq filtres de ligne de la spécification PNG, défaits.
const unfilter = (filter: number, value: number, around: Around) => {
    switch (filter) {
      case 1: {
        return value + around.left;
      }
      case 2: {
        return value + around.above;
      }
      case 3: {
        return value + ((around.left + around.above) >> 1);
      }
      case 4: {
        return value + paeth(around.left, around.above, around.corner);
      }
      default: {
        return value;
      }
    }
  },
  readSheet = (file: string, bytes: Buffer) => {
    const width = bytes.readUInt32BE(16),
      height = bytes.readUInt32BE(20),
      usable =
        bytes.subarray(0, 8).equals(PNG_SIGNATURE) &&
        bytes.readUInt8(24) === 8 &&
        bytes.readUInt8(25) === 6 &&
        bytes.readUInt8(28) === 0;

    if (!usable) {
      throw new Error(`${file} n'est pas un PNG 8 bits RGBA non entrelacé`);
    }

    const parts: Buffer[] = [];
    let cursor = 8;

    while (cursor < bytes.length) {
      const length = bytes.readUInt32BE(cursor);

      if (bytes.toString("ascii", cursor + 4, cursor + 8) === "IDAT") {
        parts.push(bytes.subarray(cursor + 8, cursor + 8 + length));
      }

      cursor += 12 + length;
    }

    const raw = inflateSync(Buffer.concat(parts)),
      stride = width * BYTES_PER_PIXEL,
      pixels = Buffer.alloc(height * stride);

    for (let row = 0; row < height; row += 1) {
      const line = row * (stride + 1),
        filter = raw.readUInt8(line),
        target = row * stride,
        previous = (row - 1) * stride;

      for (let index = 0; index < stride; index += 1) {
        const back = index - BYTES_PER_PIXEL,
          left = neighbour(pixels, target + back, { inside: back >= 0 }),
          above = neighbour(pixels, previous + index, { inside: row > 0 }),
          corner = neighbour(pixels, previous + back, { inside: back >= 0 && row > 0 }),
          value = raw.readUInt8(line + 1 + index),
          restored = unfilter(filter, value, { above, corner, left });

        pixels.writeUInt8(restored & BYTE, target + index);
      }
    }

    return { height, pixels, width };
  },
  chunk = (type: string, body: Buffer) => {
    const framed = Buffer.alloc(12 + body.length);

    framed.writeUInt32BE(body.length, 0);
    framed.write(type, 4, "ascii");
    body.copy(framed, 8);
    framed.writeUInt32BE(crc32(framed.subarray(4, 8 + body.length)), 8 + body.length);

    return framed;
  },
  // Aucune ligne n'est filtrée. Mesuré sur ce dessin : 5 937 octets brut, contre 7 904 pour
  // le meilleur filtre par ligne. Le pixel art est fait de plages plates, que deflate encode
  // mieux telles quelles que différenciées.
  writeSheets = (width: number, height: number, pixels: Buffer) => {
    const stride = width * BYTES_PER_PIXEL,
      raw = Buffer.alloc(height * (stride + 1)),
      header = Buffer.alloc(13);

    for (let row = 0; row < height; row += 1) {
      pixels.copy(raw, row * (stride + 1) + 1, row * stride, (row + 1) * stride);
    }

    header.writeUInt32BE(width, 0);
    header.writeUInt32BE(height, 4);
    header.writeUInt8(8, 8);
    header.writeUInt8(6, 9);

    return Buffer.concat([
      PNG_SIGNATURE,
      chunk("IHDR", header),
      chunk("IDAT", deflateSync(raw, { level: 9 })),
      chunk("IEND", Buffer.alloc(0)),
    ]);
  },
  // Les feuilles s'empilent, une par bande, dans l'ordre reçu. Les plus étroites laissent du
  // vide à droite : le CSS ne s'y rend jamais, il s'arrête au nombre de cases de son état.
  mergeSheets = async (files: string[]) => {
    const sheets = await Promise.all(
        files.map(async (file) => readSheet(file, await readFile(join(SOURCE, file)))),
      ),
      tall = sheets.findIndex((sheet) => sheet.height !== FRAME);

    if (tall !== -1) {
      throw new Error(`${files[tall]} ne tient pas sur une ligne de ${FRAME} px`);
    }

    const width = Math.max(...sheets.map((sheet) => sheet.width)),
      height = sheets.length * FRAME,
      pixels = Buffer.alloc(width * height * BYTES_PER_PIXEL);

    sheets.forEach((sheet, band) => {
      for (let row = 0; row < sheet.height; row += 1) {
        sheet.pixels.copy(
          pixels,
          (band * FRAME + row) * width * BYTES_PER_PIXEL,
          row * sheet.width * BYTES_PER_PIXEL,
          (row + 1) * sheet.width * BYTES_PER_PIXEL,
        );
      }
    });

    return { bytes: writeSheets(width, height, pixels), height, width };
  },
  // Une seule requête au lieu d'une par état : un seul flux deflate exploite la ressemblance
  // entre les feuilles, que src/ garde separees pour rester lisibles une par une. Le plan
  // sort d'un seul balayage de index.html, donc feuilles et bandes ne peuvent pas diverger.
  planSheets = async (staging: string) => {
    const page = await readFile(join(SOURCE, "index.html"), "utf8"),
      declared = page.match(SHEET_URL) ?? [],
      // Les trente-deux etats communs ne sont ecrits qu'une fois, sous le slime : les trois
      // formes portent les memes, dans le meme ordre, avec le meme nombre de cases. Les
      // autres formes les deduisent par leur prefixe, et n'ecrivent que leurs transitions.
      common = declared.filter((file) => dirOf(file) === "slime");

    if (common.length === 0) {
      throw new Error("index.html ne déclare plus de feuille de mascotte");
    }

    // Une transition suit les trente-deux etats communs de la feuille ou elle vit :
    // « evolveCube » montre un slime, mais elle vit dans la feuille du cube.
    const forms = FORMS.map(({ dir, prefix }) => ({
        dir,
        files: [
          ...common.map((file) => file.replace(`/slime/slime-`, `/${dir}/${prefix}-`)),
          ...declared.filter((file) => dirOf(file) === dir && !common.includes(file)),
        ],
      })),
      merges = await Promise.all(forms.map(({ files }) => mergeSheets(files))),
      bands = new Map<string, number>(),
      sizes = new Map<string, SheetSize>();

    forms.forEach(({ dir, files }, index) => {
      const merged = merges[index];

      files.forEach((file, band) => bands.set(file, band));
      sizes.set(dir, {
        height: (merged?.height ?? 0) * SCALE,
        width: (merged?.width ?? 0) * SCALE,
      });
    });

    // Les feuilles source sortent de l'artefact : leur dossier ne sert plus a rien une fois
    // les bandes empilees.
    await Promise.all([
      ...forms.map(({ dir }, index) =>
        writeFile(join(staging, sheetsOf(dir)), merges[index]?.bytes ?? Buffer.alloc(0)),
      ),
      ...forms.map(({ dir }) =>
        rm(join(staging, "assets/sprites", dir), { force: true, recursive: true }),
      ),
    ]);

    return { bands, sizes };
  },
  // Le texte plié est une page ou une feuille de style : seules les règles comptent.
  foldPage = (text: string, plan: SheetPlan, dirs: string[]) => {
    let seen = 0;

    // Le balayage est plus large que le pliage : il prend toute adresse de feuille, la regle
    // exige en plus les deux lignes dans l'ordre. Sans ce garde-fou, une regle defaite par un
    // reformatage laisserait survivre une adresse dont le dossier a ete retire.
    const declared = text.match(SHEET_URL) ?? [],
      // L'adresse de l'image fusionnée reprend la forme de celles qu'elle remplace : une page
      // servie sur une adresse quelconque écrit des chemins absolus, et les garde.
      root = LEADING_SLASH.test(declared[0] ?? "") ? "/" : "",
      folded = text.replace(SHEET_RULE, (_rule, indent: string, file: string) => {
        const band = plan.bands.get(file.replace(LEADING_SLASH, ""));

        if (band === undefined) {
          throw new Error(`${file} ne correspond à aucune bande de la feuille fusionnée`);
        }

        seen += 1;

        return `${indent}background-position-y: ${-(band * BAND)}px;\n`;
      });

    if (seen !== declared.length) {
      throw new Error(`${declared.length} feuilles déclarées, mais ${seen} règles pliées`);
    }

    if (seen === 0) {
      throw new Error("aucune règle d'état de mascotte à plier");
    }

    return dirs.reduce((carry, dir) => {
      const size = plan.sizes.get(dir),
        // SAFETY: « dir » vient de FORMS, dont les trois noms sont exactement les clefs de
        // BASE_RULE. Une forme ajoutee sans sa regle de base ne compilerait pas.
        next = carry.replace(
          BASE_RULE[dir as keyof typeof BASE_RULE],
          (_rule: string, head: string, indent: string) =>
            `${head}${indent}background-image: url("${root}${sheetsOf(dir)}");\n${
              // Seule la forme par defaut pose la position de depart. Un « background-position »
              // sur une regle d'attribut ecraserait le « background-position-y » des regles
              // d'etat, moins specifiques : toutes les bandes retomberaient sur la premiere.
              dir === "slime" ? `${indent}background-position: 0 0;\n` : ""
            }${indent}background-size: ${size?.width ?? 0}px ${size?.height ?? 0}px;\n`,
        );

      if (next === carry) {
        throw new Error(`La règle de base de ${dir} ne porte plus « background-position: 0 0 »`);
      }

      return next;
    }, folded);
  },
  buildIndex = async (staging: string, plan: SheetPlan) => {
    const page = await readFile(join(SOURCE, "index.html"), "utf8");

    if (!page.includes(MODULE_TAG)) {
      throw new Error(`index.html ne porte plus ${MODULE_TAG}`);
    }

    const folded = foldPage(
        page,
        plan,
        FORMS.map(({ dir }) => dir),
      ),
      bundled = await bundle("app.ts", "esm"),
      // Une fonction de remplacement, car un remplacement littéral interprète les motifs en
      // dollar. Le code source porte « $$ » dans les yeux de cowsay.
      replaced = folded.replace(MODULE_TAG, () => `<script type="module">${bundled}</script>`);

    await writeFile(join(staging, "index.html"), await minify(replaced, MINIFY));
  },
  // La page d'erreur garde sa feuille et son script a part dans src/, pour qu'ils s'editent,
  // se relisent et passent sous les memes outils que le reste. L'artefact les remet en ligne :
  // une adresse inconnue ne doit pas couter deux requetes bloquantes de plus.
  build404 = async (staging: string, plan: SheetPlan) => {
    const page = await readFile(join(SOURCE, "404.html"), "utf8"),
      sheet = await readFile(join(SOURCE, "404.css"), "utf8");

    for (const tag of [STYLE_TAG, SCRIPT_TAG]) {
      if (!page.includes(tag)) {
        throw new Error(`404.html ne porte plus ${tag}`);
      }
    }

    const folded = foldPage(sheet, plan, ["slime"]),
      bundled = await bundle("404.ts", "iife"),
      // Deux fonctions de remplacement : un littéral interpréterait les motifs en dollar.
      inlined = page
        .replace(STYLE_TAG, () => `<style>${folded}</style>`)
        .replace(SCRIPT_TAG, () => `<script>${bundled}</script>`);

    await writeFile(join(staging, "404.html"), await minify(inlined, MINIFY));
  },
  buildTexte = async (staging: string) => {
    const page = await readFile(join(SOURCE, "texte.html"), "utf8");

    await writeFile(join(staging, "texte.html"), await minify(page, MINIFY));
  },
  // Le contenu est indenté à la main pour rester lisible. La construction retire cette mise
  // en forme. La date de la source est reportée : sans elle, l'ETag changerait à chaque
  // construction et la revalidation ne rendrait jamais de 304.
  buildContent = async (staging: string) => {
    const source = join(SOURCE, CONTENT),
      target = join(staging, CONTENT),
      { atime, mtime } = await stat(source),
      // Le contenu vient d'un fichier : sa forme n'est pas garantie ici. La construction ne
      // le lit pas, elle le reserialise, donc « unknown » suffit et interdit de s'y fier.
      parsed: unknown = JSON.parse(await readFile(source, "utf8"));

    await writeFile(target, JSON.stringify(parsed));
    await utimes(target, atime, mtime);
  },
  walk = async (dir: string): Promise<string[]> => {
    const entries = await readdir(dir, { withFileTypes: true }),
      found = await Promise.all(
        entries.map(async (entry) => {
          const full = join(dir, entry.name);

          return entry.isDirectory() ? walk(full) : [full];
        }),
      );

    return found.flat();
  },
  // Cloudflare relève tout Cache-Control plus court que le sien sur les extensions qu'il met
  // en cache. Une URL qui change avec le contenu est la seule garantie qu'un visiteur ne
  // reçoive jamais un actif périmé contre une page fraîche.
  stampAssets = async (staging: string) => {
    const files = await walk(staging),
      stampable = files.filter(
        (file) => STAMPED_EXTENSIONS.has(extname(file)) && !FIXED_NAMES.has(basename(file)),
      ),
      pairs = await Promise.all(
        stampable.map(async (file) => {
          const extension = extname(file),
            bytes = await readFile(file),
            digest = createHash("sha256").update(bytes).digest("hex").slice(0, 8),
            stamped = join(dirname(file), `${basename(file, extension)}.${digest}${extension}`);

          await rename(file, stamped);

          return [relative(staging, file), relative(staging, stamped)] as const;
        }),
      );

    return new Map(pairs);
  },
  // Du plus long au plus court : aucun nom n'est aujourd'hui le préfixe d'un autre, mais
  // l'ordre protège le jour où deux actifs partageront un début de chemin.
  rewritePages = async (staging: string, renamed: Map<string, string>) => {
    const ordered = [...renamed].toSorted(([left], [right]) => right.length - left.length),
      substitute = (text: string) =>
        ordered.reduce((carry, [from, to]) => carry.split(from).join(to), text);

    await Promise.all(
      PAGES.map(async (page) => {
        const file = join(staging, page);

        await writeFile(file, substitute(await readFile(file, "utf8")));
      }),
    );
  },
  running = (pid: number) => {
    try {
      process.kill(pid, 0);

      return true;
    } catch {
      return false;
    }
  },
  claimLock = async () => {
    await mkdir(LOCK);
    await writeFile(join(LOCK, "pid"), String(process.pid));
  },
  // La bascule est atomique, donc deux constructions simultanées ne peuvent plus détruire la
  // version servie. Le verrou évite seulement le travail perdu.
  takeLock = async () => {
    await mkdir(dirname(LOCK), { recursive: true });

    try {
      await claimLock();

      return;
    } catch (error) {
      if (errorCode(error) !== "EEXIST") {
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
  },
  // Remplacer un lien symbolique est atomique. Le chemin servi désigne donc toujours une
  // version complète, même si la construction meurt entre deux opérations.
  swap = async (version: string) => {
    await rm(LINK, { force: true });
    await symlink(relative(ROOT, version), LINK);

    const existing = await lstat(TARGET).catch(() => undefined);

    if (existing?.isDirectory()) {
      await rename(TARGET, LEGACY);
    }

    await rename(LINK, TARGET);
    await rm(LEGACY, { force: true, recursive: true });
  },
  prune = async () => {
    const versions = await readdir(VERSIONS),
      stale = versions.toSorted().slice(0, -KEPT_VERSIONS);

    await Promise.all(
      stale.map((name) => rm(join(VERSIONS, name), { force: true, recursive: true })),
    );
  };

// Un dossier vide n'a rien a faire dans l'artefact. L'elagage remonte des feuilles vers la
// racine : un dossier qui ne contenait que des dossiers vides se vide a son tour.
const pruneChildren = async (directory: string): Promise<void> => {
  const entries = await readdir(directory, { withFileTypes: true });

  await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => pruneEmpty(join(directory, entry.name))),
  );
};

const pruneEmpty = async (directory: string): Promise<boolean> => {
  const entries = await readdir(directory, { withFileTypes: true }),
    kept = await Promise.all(
      entries.map(async (entry) =>
        entry.isDirectory() ? await pruneEmpty(join(directory, entry.name)) : true,
      ),
    );

  if (kept.some(Boolean)) {
    return true;
  }

  await rm(directory, { recursive: true });

  return false;
};

await takeLock();

try {
  const version = join(VERSIONS, new Date().toISOString().replaceAll(/[:.]/gu, "-"));

  await mkdir(version, { recursive: true });
  await cp(SOURCE, version, {
    // Une regle plutot qu'une liste de noms : le bundle absorbe les modules, et un renommage
    // ne doit pas republier la source en silence. Les CONTEXT.md sont de la documentation de
    // depot, pas des actifs : les publier exposerait la carte des modules, et empecherait l'elagage.
    filter: (from: string) =>
      extname(from) !== ".ts" &&
      basename(from) !== "CONTEXT.md" &&
      !TRANSFORMED.has(relative(SOURCE, from)),
    // Sans ça, chaque construction date à neuf des fichiers identiques. Leur ETag change,
    // et la revalidation « no-cache » du serveur ne rend jamais de 304.
    preserveTimestamps: true,
    recursive: true,
  });
  // Le filtre s'applique aussi aux dossiers, sans extension pour trancher : on elague apres
  // coup plutot que de les nommer, car un dossier qui porterait un actif a cote de ses
  // modules doit rester. L'elagage part des enfants, jamais de la racine, qui doit survivre meme vide pour l'ecriture de index.html qui suit.
  await pruneChildren(version);

  const plan = await planSheets(version);

  await buildIndex(version, plan);
  await build404(version, plan);
  await buildTexte(version);
  await buildContent(version);
  await rewritePages(version, await stampAssets(version));
  await swap(version);
  await prune();
} finally {
  await rm(LOCK, { force: true, recursive: true });
}
