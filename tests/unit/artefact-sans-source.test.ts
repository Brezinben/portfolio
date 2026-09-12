import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { it } from "node:test";
import { readdir } from "node:fs/promises";
import { relative } from "node:path";

const OUTPUT = fileURLToPath(
    new URL(`../../${process.env["PORTFOLIO_DIST"] ?? "dist.test"}/`, import.meta.url),
  ),
  walk = async (directory: string): Promise<string[]> => {
    const entries = await readdir(directory, { withFileTypes: true }),
      found = await Promise.all(
        entries.map(async (entry) => {
          const full = `${directory}/${entry.name}`;

          return entry.isDirectory() ? walk(full) : [full];
        }),
      );

    return found.flat();
  },
  // Un dossier vide n'apparait pas dans walk(), qui ne rend que des fichiers.
  emptyDirs = async (directory: string): Promise<string[]> => {
    const entries = await readdir(directory, { withFileTypes: true }),
      found = await Promise.all(
        entries
          .filter((entry) => entry.isDirectory())
          .map(async (entry) => {
            const full = `${directory}/${entry.name}`,
              inside = await readdir(full);

            return inside.length === 0 ? [full] : await emptyDirs(full);
          }),
      );

    return found.flat();
  };

// Le bundle absorbe les modules : aucune source ne doit atteindre l'artefact. Une liste
// de noms ne le garantissait pas — un renommage a suffi pour publier 23 Ko de TypeScript.
it("l'artefact ne publie aucune source", async () => {
  const files = await walk(OUTPUT).catch(() => []);

  assert.notEqual(files.length, 0, "l'artefact doit avoir été construit avant ce test");

  const sources = files
    .filter((file) => file.endsWith(".ts") || file.endsWith(".map"))
    .map((file) => relative(OUTPUT, file));

  assert.deepEqual(sources, [], "une source a été copiée au lieu d'être fondue");
});

// Le filtre de copie s'applique aussi aux dossiers, et un dossier n'a pas d'extension : un
// dossier qui ne porte que du TypeScript etait cree puis vide de ses enfants, et publie
// vide. Le test des sources ne le voyait pas, puisqu'il ne liste que des fichiers.
it("l'artefact ne publie aucun dossier vide", async () => {
  const files = await walk(OUTPUT).catch(() => []);

  assert.notEqual(files.length, 0, "l'artefact doit avoir été construit avant ce test");

  const found = await emptyDirs(OUTPUT),
    empty = found.map((directory) => relative(OUTPUT, directory));

  assert.deepEqual(empty, [], "un dossier de source a été créé puis vidé");
});
