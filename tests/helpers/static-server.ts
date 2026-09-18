import type { IncomingMessage, ServerResponse } from "node:http";
import { extname, join, resolve, sep } from "node:path";
import { createGzip } from "node:zlib";
import { createReadStream } from "node:fs";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { stat } from "node:fs/promises";

const ROOT = resolve(
    fileURLToPath(new URL(`../../${process.env.PORTFOLIO_DIST ?? "dist"}/`, import.meta.url)),
  ),
  OK = 200,
  NOT_FOUND = 404,
  ERROR_PAGE = "404.html",
  TYPES = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".txt": "text/plain; charset=utf-8",
    ".woff2": "font/woff2",
  },
  // Le budget de poids se mesure après compression. Sans ces types compressés ici, le test
  // du budget mesurerait deux à quatre fois le poids réel et ne voudrait plus rien dire.
  COMPRESSIBLE = new Set([".css", ".html", ".js", ".json", ".svg", ".txt"]),
  // Une extension libre dans une table fermee : la table garde le type que l'inference
  // lui donne, et l'appelant recoit undefined quand l'extension n'y est pas.
  lookup = <V>(table: Readonly<Record<string, V>>, key: string): V | undefined => {
    return table[key];
  },
  resolveTarget = (rawUrl: string) => {
    let pathname = "";

    try {
      pathname = decodeURIComponent(new URL(rawUrl, "http://127.0.0.1").pathname);
    } catch {
      return undefined;
    }

    const target = resolve(join(ROOT, pathname === "/" ? "/index.html" : pathname));

    return target === ROOT || target.startsWith(ROOT + sep) ? target : undefined;
  },
  notFound = (response: ServerResponse) => {
    if (!response.headersSent) {
      response.writeHead(NOT_FOUND);
    }
    response.end("Not Found");
  },
  send = ({
    request,
    response,
    size,
    status,
    target,
  }: {
    request: IncomingMessage;
    response: ServerResponse;
    size: number;
    status: number;
    target: string;
  }) => {
    const type = lookup(TYPES, extname(target)) ?? "application/octet-stream",
      stream = createReadStream(target);

    // Stat() peut réussir là où open() échoue. Sans cet écouteur, l'erreur est non gérée
    // et tue le processus : le harnais tombe au milieu d'une série de tests.
    stream.on("error", () => {
      return notFound(response);
    });

    if (
      COMPRESSIBLE.has(extname(target)) &&
      /\bgzip\b/.test(request.headers["accept-encoding"] ?? "")
    ) {
      response.writeHead(status, {
        "content-encoding": "gzip",
        "content-type": type,
        vary: "accept-encoding",
      });
      stream.pipe(createGzip()).pipe(response);

      return;
    }

    response.writeHead(status, { "content-length": size, "content-type": type });
    stream.pipe(response);
  },
  // Un seul point d'envoi pour les deux passes : l'adresse demandee, puis la page
  // d'erreur. Il rend faux quand le fichier n'est pas la, sans rien ecrire.
  serve = async ({
    request,
    response,
    status,
    target,
  }: {
    request: IncomingMessage;
    response: ServerResponse;
    status: number;
    target: string;
  }) => {
    let info = undefined;

    try {
      info = await stat(target);
    } catch {
      return false;
    }

    if (!info.isFile()) {
      return false;
    }

    send({ request, response, size: info.size, status, target });

    return true;
  },
  server = createServer(async (request, response) => {
    // Node ne garantit pas l'URL sur une requete mal formee : sans chemin, rien a servir.
    const target = request.url === undefined ? undefined : resolveTarget(request.url);

    if (target !== undefined && (await serve({ request, response, status: OK, target }))) {
      return;
    }

    // Caddy rend la page d'erreur du site sur toute adresse inconnue, et file_server y
    // conserve le statut. Sans cette seconde passe, aucun test n'atteindrait cette page.
    if (await serve({ request, response, status: NOT_FOUND, target: join(ROOT, ERROR_PAGE) })) {
      return;
    }

    notFound(response);
  });

server.listen(Number(process.argv[2] ?? 4173), "127.0.0.1");
