import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { readdir } from "node:fs/promises";
import { relative } from "node:path";
import { test } from "node:test";

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
  };

// Le bundle absorbe les modules : aucune source ne doit atteindre l'artefact. Une liste
// de noms ne le garantissait pas — un renommage a suffi pour publier 23 Ko de TypeScript.
test("l'artefact ne publie aucune source", async () => {
  const files = await walk(OUTPUT).catch(() => []);

  assert.notEqual(files.length, 0, "l'artefact doit avoir été construit avant ce test");

  const sources = files
    .filter((file) => file.endsWith(".ts") || file.endsWith(".map"))
    .map((file) => relative(OUTPUT, file));

  assert.deepEqual(sources, [], "une source a été copiée au lieu d'être fondue");
});
