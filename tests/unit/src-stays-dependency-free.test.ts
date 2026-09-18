import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { it } from "node:test";
import { readdir } from "node:fs/promises";
import { relative } from "node:path";

const PRODUCTION = fileURLToPath(new URL("../../src/", import.meta.url)),
  FORBIDDEN = new Set(["package.json", "package-lock.json", "node_modules", "dist", "build"]),
  findForbidden = async (directory: string): Promise<string[]> => {
    const entries = await readdir(directory, { withFileTypes: true }),
      found = entries
        .filter((entry) => {
          return FORBIDDEN.has(entry.name);
        })
        .map((entry) => {
          return relative(PRODUCTION, `${directory}/${entry.name}`);
        }),
      deeper = await Promise.all(
        entries
          .filter((entry) => {
            return entry.isDirectory() && !FORBIDDEN.has(entry.name);
          })
          .map((entry) => {
            return findForbidden(`${directory}/${entry.name}`);
          }),
      );

    return [...found, ...deeper.flat()];
  };

// Production/ reste la source, servable telle quelle sans npm. La construction produit
// dist/ et n'écrit jamais ici. Un manifeste de dépendances ou un node_modules signifierait
// que la construction a débordé, y compris sous src/vendor/ où Alpine est figé.
it("should keep src free of dependencies and build artefacts", async () => {
  assert.deepEqual(await findForbidden(PRODUCTION), []);
});
