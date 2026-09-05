import { extname, join, resolve, sep } from "node:path";
import { createGzip } from "node:zlib";
import { createReadStream } from "node:fs";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { stat } from "node:fs/promises";

const ROOT = resolve(fileURLToPath(new URL("../../dist/", import.meta.url)));

const OK = 200;
const NOT_FOUND = 404;

const TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
};

// Le budget de poids se mesure après compression. Sans ces types compressés ici, le test
// du budget mesurerait deux à quatre fois le poids réel et ne voudrait plus rien dire.
const COMPRESSIBLE = new Set([".css", ".html", ".js", ".json", ".svg", ".txt"]);

const resolveTarget = (rawUrl) => {
  let pathname = "";

  try {
    pathname = decodeURIComponent(new URL(rawUrl, "http://127.0.0.1").pathname);
  } catch {
    return undefined;
  }

  const target = resolve(join(ROOT, pathname === "/" ? "/index.html" : pathname));

  return target === ROOT || target.startsWith(ROOT + sep) ? target : undefined;
};

const notFound = (response) => {
  if (!response.headersSent) {
    response.writeHead(NOT_FOUND);
  }
  response.end("Not Found");
};

const send = ({ request, response, size, target }) => {
  const type = TYPES[extname(target)] ?? "application/octet-stream";
  const stream = createReadStream(target);

  // Stat() peut réussir là où open() échoue. Sans cet écouteur, l'erreur est non gérée
  // et tue le processus : le harnais tombe au milieu d'une série de tests.
  stream.on("error", () => notFound(response));

  if (
    COMPRESSIBLE.has(extname(target)) &&
    /\bgzip\b/.test(request.headers["accept-encoding"] ?? "")
  ) {
    response.writeHead(OK, {
      "content-encoding": "gzip",
      "content-type": type,
      vary: "accept-encoding",
    });
    stream.pipe(createGzip()).pipe(response);

    return;
  }

  response.writeHead(OK, { "content-length": size, "content-type": type });
  stream.pipe(response);
};

const server = createServer(async (request, response) => {
  const target = resolveTarget(request.url);

  if (!target) {
    notFound(response);

    return;
  }

  let info = undefined;

  try {
    info = await stat(target);
  } catch {
    notFound(response);

    return;
  }

  if (info.isFile()) {
    send({ request, response, size: info.size, target });
  } else {
    notFound(response);
  }
});

server.listen(Number(process.argv[2] ?? 4173), "127.0.0.1");
