import { expect, test } from "@playwright/test";
import { readFile, readdir } from "node:fs/promises";

const BUDGET_KO = 150;
const SPRITES_KO = 22;

// Un hôte tiers qui n'envoie pas timing-allow-origin fait rapporter un transferSize nul au
// navigateur. Le poids de ces ressources est invisible, pas nul. Les nommer ici empêche
// qu'un nouveau tiers entre dans la page et échappe au budget sans que personne ne le voie.
const HORS_MESURE = new Set([
  "https://umami.brezinben.dpdns.org/api/heartbeat",
  "https://umami.brezinben.dpdns.org/api/send",
  "https://umami.brezinben.dpdns.org/script.js",
]);

// Le budget est un test, pas un commentaire. Il se mesure sur ce qui traverse réellement
// le réseau, compression comprise, et non sur la taille des fichiers sur le disque.
//
// Le contenu entre dans le budget depuis que la page ne le charge plus depuis GitHub. Il
// part avec l'artefact et il pèse sur le premier chargement, donc il compte.
test("le premier chargement tient dans le budget de poids", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("img", { name: "Benjamin" })).toBeVisible({ timeout: 10_000 });
  await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });

  const measured = await page.evaluate(() => {
    const [navigation] = performance.getEntriesByType("navigation");
    const resources = performance.getEntriesByType("resource");
    const local = resources.filter((entry) => new URL(entry.name).origin === location.origin);

    return {
      détail: local.map((entry) => ({
        ko: Math.round(entry.transferSize / 102.4) / 10,
        url: entry.name.replace(location.origin, ""),
      })),
      tiers: resources
        .filter((entry) => new URL(entry.name).origin !== location.origin)
        .map((entry) => entry.name),
      total: navigation.transferSize + local.reduce((sum, entry) => sum + entry.transferSize, 0),
    };
  });

  const totalKo = Math.round(measured.total / 102.4) / 10;

  expect(totalKo, `détail : ${JSON.stringify(measured.détail)}`).toBeLessThanOrEqual(BUDGET_KO);

  // Une absence est normale : la mesure d'audience échoue en silence quand elle est bloquée.
  // Une présence inattendue ne l'est pas.
  const inconnus = measured.tiers.filter((url) => !HORS_MESURE.has(url));

  expect(inconnus, `tiers vus : ${JSON.stringify(measured.tiers)}`).toEqual([]);
});

// La mascotte tire sa feuille de repos au démarrage, et les huit autres à leur premier
// déclenchement. Un plafond sur le dossier entier, sinon les feuilles grossiraient sans
// que rien ne le signale : aucune ne pèse sur le premier chargement.
test("les feuilles de la mascotte tiennent dans leur plafond", async () => {
  const dossier = new URL("../../src/sprites/", import.meta.url);
  const feuilles = await readdir(dossier);
  const poids = await Promise.all(
    feuilles.map(async (nom) => {
      const octets = await readFile(new URL(nom, dossier));

      return octets.byteLength;
    }),
  );

  const total = poids.reduce((somme, octets) => somme + octets, 0);

  expect(Math.round(total / 102.4) / 10, `${feuilles.length} feuilles`).toBeLessThanOrEqual(
    SPRITES_KO,
  );
});

// Le premier rendu ne doit tirer que la feuille de repos. Sans ce test, une feuille de plus
// entrerait dans le premier chargement sans que personne ne le remarque.
test("le premier chargement ne tire qu'une feuille de mascotte", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });

  const feuilles = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .map((entry) => new URL(entry.name).pathname)
      .filter((chemin) => chemin.includes("/slime-")),
  );

  expect(feuilles).toHaveLength(1);
  expect(feuilles[0]).toContain("slime-idle");
});

// Le mouvement réduit retire la mascotte. Aucune feuille ne doit donc partir : c'est tout
// l'intérêt de la retirer plutôt que de la figer.
test("le mouvement réduit ne charge aucune feuille", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });

  const feuilles = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .map((entry) => new URL(entry.name).pathname)
      .filter((chemin) => chemin.includes("/slime-")),
  );

  expect(feuilles).toEqual([]);
});
