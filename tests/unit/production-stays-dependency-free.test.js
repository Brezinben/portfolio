import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { readdir } from "node:fs/promises";
import { relative } from "node:path";
import { test } from "node:test";

const PRODUCTION = fileURLToPath(new URL("../../production/", import.meta.url));

const FORBIDDEN = new Set(["package.json", "package-lock.json", "node_modules", "dist", "build"]);

const findForbidden = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const found = entries
    .filter((entry) => FORBIDDEN.has(entry.name))
    .map((entry) => relative(PRODUCTION, `${directory}/${entry.name}`));

  const deeper = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory() && !FORBIDDEN.has(entry.name))
      .map((entry) => findForbidden(`${directory}/${entry.name}`)),
  );

  return [...found, ...deeper.flat()];
};

// Production/ reste la source, servable telle quelle sans npm. La construction produit
// dist/ et n'écrit jamais ici. Un manifeste de dépendances ou un node_modules signifierait
// que la construction a débordé, y compris sous production/vendor/ où Alpine est figé.
test("production/ ne contient aucune dépendance ni artefact de construction", async () => {
  assert.deepEqual(await findForbidden(PRODUCTION), []);
});
