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
  TRANSFORMED = new Set([CONTENT, "index.html", "texte.html"]),
  // Ces noms sont des contrats avec l'extérieur : iOS demande /apple-touch-icon.png sans
  // balise, la page charge content.json par une URL relative, et les robots lisent llms.txt.
  FIXED_NAMES = new Set([
    "apple-touch-icon.png",
    "content.json",
    "llms.txt",
    "robots.txt",
    "sitemap.xml",
  ]),
  STAMPED_EXTENSIONS = new Set([".css", ".js", ".pdf", ".png", ".svg", ".woff2"]),
  PAGES = ["index.html", "texte.html"],
  MODULE_TAG = '<script type="module" src="app.ts"></script>',
  // Une case de mascotte fait 32 px natifs et s'affiche à x2. Voir l'ADR 0004.
  FRAME = 32,
  SCALE = 2,
  BAND = FRAME * SCALE,
  // Le préfixe « slime- » est tenu par le budget, qui compte les images de mascotte sur ce
  // nom. Le changer rendrait ces tests silencieusement vrais.
  SHEETS = "assets/sprites/slime-sheets.png",
  // Le CSS de src/ nomme une feuille par état, dans l'ordre des bandes attendues. La
  // construction empile les feuilles dans cet ordre, puis remplace chaque paire par le
  // décalage de sa bande. La liste des feuilles et l'ordre des bandes sortent du même
  // balayage : ils ne peuvent pas diverger.
  SHEET_RULE =
    /(?<indent>[^\S\n]*)background-image: url\("assets\/sprites\/slime-[^"]+\.png"\);\n[^\S\n]*background-size: \d+px \d+px;\n/gu,
  SHEET_URL = /assets\/sprites\/slime-[^"]+\.png/gu,
  // La règle de base porte la position de départ. Elle reçoit l'image fusionnée, que les
  // neuf règles d'état ne déclarent plus.
  SLIME_RULE = /(?<indent>[^\S\n]*)background-position: 0 0;\n/u,
  // MinifyJS reste absent. Rolldown a déjà minifié le seul script en ligne du projet.
  // RemoveAttributeQuotes et removeOptionalTags rendent le balisage déroutant pour 0,3 Ko.
  MINIFY = { collapseWhitespace: true, minifyCSS: true, removeComments: true },
  // Le code d'erreur de Node ne figure pas dans le type Error : on le retrecit plutot que
  // de l'affirmer.
  //
  // Les deux regles desactivees ici demandent de parser l'entree a sa frontiere et de
  // brancher sur une valeur de domaine. Il n'y a pas de frontiere : TypeScript impose
  // « unknown » sur la liaison d'un catch, et c'est precisement ce rétrécissement-la qui
  // etablit le contrat. Une valeur de domaine exigerait de faire confiance a la forme de
  // l'erreur avant de l'avoir verifiee, donc d'ecrire moins sur que ce code.
  // oxlint-disable-next-line anti-slop/no-unknown-parameters
  errorCode = (error: unknown): string | undefined =>
    // oxlint-disable-next-line anti-slop/no-runtime-typeof
    error instanceof Error && "code" in error && typeof error.code === "string"
      ? error.code
      : undefined,
  bundle = async () => {
    const result = await build({
        input: join(SOURCE, "app.ts"),
        output: { format: "esm", minify: true },
        write: false,
      }),
      [chunk] = result.output;

    if (!chunk) {
      throw new Error("Rolldown n'a rien produit pour app.ts");
    }

    return chunk.code;
  },
  // Les neuf feuilles sont en 8 bits RGBA, non entrelacées : le cas le plus simple du
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
  neighbour = (pixels: Buffer, offset: number, inside: boolean) => {
    if (!inside) {
      return 0;
    }

    return pixels.readUInt8(offset);
  };

// Le voisinage qu'un filtre PNG consulte : le pixel de gauche, celui du dessus, et le coin
// entre les deux. Un voisin hors de l'image vaut zéro.
type Around = { above: number; corner: number; left: number };

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
          left = neighbour(pixels, target + back, back >= 0),
          above = neighbour(pixels, previous + index, row > 0),
          corner = neighbour(pixels, previous + back, back >= 0 && row > 0),
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
  // Une seule requête au lieu de neuf, et trois fois moins d'octets : un seul flux deflate
  // exploite la ressemblance entre les feuilles. src/ garde ses neuf fichiers, lisibles un
  // par un et servables tels quels ; seul l'artefact les fusionne.
  foldSheets = async (staging: string, page: string) => {
    const files = page.match(SHEET_URL) ?? [];

    if (files.length === 0) {
      throw new Error("index.html ne déclare plus de feuille de mascotte");
    }

    const merged = await mergeSheets(files);
    let band = 0;
    const folded = page.replace(SHEET_RULE, (_rule, indent: string) => {
      const offset = band * BAND;

      band += 1;

      return `${indent}background-position-y: ${-offset}px;\n`;
    });

    if (band !== files.length) {
      throw new Error(`${files.length} feuilles déclarées, mais ${band} règles reconnues`);
    }

    const based = folded.replace(
      SLIME_RULE,
      (_rule, indent: string) =>
        `${indent}background-image: url("${SHEETS}");\n` +
        `${indent}background-position: 0 0;\n` +
        `${indent}background-size: ${merged.width * SCALE}px ${merged.height * SCALE}px;\n`,
    );

    if (based === folded) {
      throw new Error("La règle .slime ne porte plus « background-position: 0 0 »");
    }

    await writeFile(join(staging, SHEETS), merged.bytes);
    await Promise.all(files.map((file) => rm(join(staging, file))));

    return based;
  },
  buildIndex = async (staging: string) => {
    const page = await readFile(join(SOURCE, "index.html"), "utf8");

    if (!page.includes(MODULE_TAG)) {
      throw new Error(`index.html ne porte plus ${MODULE_TAG}`);
    }

    const folded = await foldSheets(staging, page),
      bundled = await bundle(),
      // Une fonction de remplacement, car un remplacement littéral interprète les motifs en
      // dollar. Le code source porte « $$ » dans les yeux de cowsay.
      replaced = folded.replace(MODULE_TAG, () => `<script type="module">${bundled}</script>`);

    await writeFile(join(staging, "index.html"), await minify(replaced, MINIFY));
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

await takeLock();

try {
  const version = join(VERSIONS, new Date().toISOString().replaceAll(/[:.]/gu, "-"));

  await mkdir(version, { recursive: true });
  await cp(SOURCE, version, {
    // Une regle plutot qu'une liste de noms : le bundle absorbe les modules, et un
    // renommage ne doit pas republier la source en silence.
    filter: (from: string) => extname(from) !== ".ts" && !TRANSFORMED.has(relative(SOURCE, from)),
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
