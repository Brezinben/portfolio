import { expect, test } from "@playwright/test";
import { readFile, readdir } from "node:fs/promises";

const BUDGET_KO = 150,
  TEXTE_KO = 60,
  // Un plafond par forme, sur la source : il borne ce que la fusion aura a digerer et
  // signale une feuille qui grossit. Le slime est le seul qui parte au premier chargement.
  SPRITES_KO = { cube: 112, pingouin: 132, slime: 80 },
  FUSION_KO = 24,
  // Un hôte tiers qui n'envoie pas timing-allow-origin fait rapporter un transferSize nul au
  // navigateur. Le poids de ces ressources est invisible, pas nul. Les nommer ici empêche
  // qu'un nouveau tiers entre dans la page et échappe au budget sans que personne ne le voie.
  HORS_MESURE = new Set([
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
      // SAFETY: la specification garantit PerformanceNavigationTiming pour l'entree
      // « navigation » et PerformanceResourceTiming pour « resource ». C'est la
      // declaration de la lib DOM qui ne sait pas l'exprimer, pas le contrat qui manque.
      const [navigation] = performance.getEntriesByType(
          "navigation",
        ) as PerformanceNavigationTiming[],
        resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[],
        local = resources.filter((entry) => new URL(entry.name).origin === location.origin);

      return {
        détail: local.map((entry) => ({
          ko: Math.round(entry.transferSize / 102.4) / 10,
          url: entry.name.replace(location.origin, ""),
        })),
        tiers: resources
          .filter((entry) => new URL(entry.name).origin !== location.origin)
          .map((entry) => entry.name),
        total:
          (navigation?.transferSize ?? 0) +
          local.reduce((sum, entry) => sum + entry.transferSize, 0),
      };
    }),
    totalKo = Math.round(measured.total / 102.4) / 10;

  expect(totalKo, `détail : ${JSON.stringify(measured.détail)}`).toBeLessThanOrEqual(BUDGET_KO);

  // Une absence est normale : la mesure d'audience échoue en silence quand elle est bloquée.
  // Une présence inattendue ne l'est pas.
  const inconnus = measured.tiers.filter((url) => !HORS_MESURE.has(url));

  expect(inconnus, `tiers vus : ${JSON.stringify(measured.tiers)}`).toEqual([]);
});

// La construction fusionne les feuilles d'une forme en une seule image. Ce plafond porte sur
// la source, et non sur ce qui part sur le réseau.
for (const [forme, plafond] of Object.entries(SPRITES_KO)) {
  test(`les feuilles du ${forme} tiennent dans leur plafond`, async () => {
    const dossier = new URL(`../../src/assets/sprites/${forme}/`, import.meta.url),
      feuilles = await readdir(dossier),
      poids = await Promise.all(
        feuilles.map(async (nom) => {
          const octets = await readFile(new URL(nom, dossier));

          return octets.byteLength;
        }),
      ),
      total = poids.reduce((somme, octets) => somme + octets, 0);

    expect(Math.round(total / 102.4) / 10, `${feuilles.length} feuilles`).toBeLessThanOrEqual(
      plafond,
    );
  });
}

// Le premier rendu tire une image de mascotte, et une seule. Elle porte les neuf états,
// donc elle pèse dès le démarrage : le nombre de requêtes ne suffit plus à la surveiller,
// son poids compte autant.
test("le premier chargement ne tire qu'une image de mascotte", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });

  const images = await page.evaluate(() => {
    // SAFETY: la specification garantit PerformanceResourceTiming pour « resource ».
    const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];

    return resources
      .filter((entry) => new URL(entry.name).pathname.includes("-sheets"))
      .map((entry) => ({
        ko: Math.round(entry.transferSize / 102.4) / 10,
        url: new URL(entry.name).pathname,
      }));
  });

  expect(images).toHaveLength(1);
  expect(images[0]?.url).toContain("slime-sheets");
  expect(images[0]?.ko, `mesure : ${JSON.stringify(images)}`).toBeLessThanOrEqual(FUSION_KO);
});

// Le cube et le pingouin pesent plus que le slime, et presque personne ne tapera la
// commande. Leur feuille ne doit partir qu'a la demande.
test("les autres formes ne partent pas au premier chargement", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });

  const tirees = await page.evaluate(() => {
    // SAFETY: la specification garantit PerformanceResourceTiming pour « resource ».
    const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];

    return resources
      .map((entry) => new URL(entry.name).pathname)
      .filter((path) => path.includes("cube-sheets") || path.includes("pingouin-sheets"));
  });

  expect(tirees).toEqual([]);
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
      .filter((chemin) => chemin.includes("-sheets")),
  );

  expect(feuilles).toEqual([]);
});

// La version texte a son propre budget. Elle échappait à celui de la version terminal, qui
// ne mesure que « / », et elle tire depuis peu une police de 34 Ko : sans ce plafond, une
// seconde police ou une image entrerait dans la page de repli sans que personne ne le voie.
test("la version texte tient dans son budget de poids", async ({ page }) => {
  await page.goto("/texte.html");
  await page.evaluate(() => document.fonts.ready);

  const measured = await page.evaluate(() => {
      // SAFETY: la specification garantit PerformanceNavigationTiming pour l'entree
      // « navigation » et PerformanceResourceTiming pour « resource ».
      const [navigation] = performance.getEntriesByType(
          "navigation",
        ) as PerformanceNavigationTiming[],
        resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];

      return {
        détail: resources.map((entry) => ({
          ko: Math.round(entry.transferSize / 102.4) / 10,
          url: entry.name.replace(location.origin, ""),
        })),
        tiers: resources.filter((entry) => new URL(entry.name).origin !== location.origin).length,
        total:
          (navigation?.transferSize ?? 0) +
          resources.reduce((sum, entry) => sum + entry.transferSize, 0),
      };
    }),
    totalKo = Math.round(measured.total / 102.4) / 10;

  expect(totalKo, `détail : ${JSON.stringify(measured.détail)}`).toBeLessThanOrEqual(TEXTE_KO);

  // La page de repli ne sort vers aucun hôte tiers, mesure d'audience comprise.
  expect(measured.tiers).toBe(0);
});
