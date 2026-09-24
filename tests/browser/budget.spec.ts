import { expect, test } from "@playwright/test";

const BUDGET_KO = 150,
  TEXTE_KO = 60,
  ERROR_KO = 50,
  FUSION_KO = 24,
  // Un hôte tiers qui n'envoie pas timing-allow-origin fait rapporter un transferSize nul au
  // navigateur. Le poids de ces ressources est invisible, pas nul. Les nommer ici empêche
  // qu'un nouveau tiers entre dans la page et échappe au budget sans que personne ne le voie.
  HORS_MESURE = new Set([
    "https://analytics.brezinben.dpdns.org/count",
    "https://analytics.brezinben.dpdns.org/count.js",
  ]);

// Le budget est un test, pas un commentaire : il se mesure sur ce qui traverse
// réellement le réseau, compression comprise, jamais sur la taille des fichiers sur
// disque. Le contenu compte aussi : il pèse sur le premier chargement depuis que la page ne le charge plus depuis GitHub.
test("should keep the first load inside the weight budget", async ({ page }) => {
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
        local = resources.filter((entry) => {
          return new URL(entry.name).origin === location.origin;
        });

      return {
        détail: local.map((entry) => {
          return {
            ko: Math.round(entry.transferSize / 102.4) / 10,
            url: entry.name.replace(location.origin, ""),
          };
        }),
        tiers: resources
          .filter((entry) => {
            return new URL(entry.name).origin !== location.origin;
          })
          .map((entry) => {
            return entry.name;
          }),
        total:
          (navigation?.transferSize ?? 0) +
          local.reduce((sum, entry) => {
            return sum + entry.transferSize;
          }, 0),
      };
    }),
    totalKo = Math.round(measured.total / 102.4) / 10;

  expect(totalKo, `detail: ${JSON.stringify(measured.détail)}`).toBeLessThanOrEqual(BUDGET_KO);

  // Une absence est normale : la mesure d'audience échoue en silence quand elle est bloquée.
  // Une présence inattendue ne l'est pas.
  const inconnus = measured.tiers.filter((url) => {
    return !HORS_MESURE.has(url);
  });

  expect(inconnus, `third parties seen: ${JSON.stringify(measured.tiers)}`).toEqual([]);
});

// Le premier rendu tire une image de mascotte, et une seule. Elle porte les neuf états,
// donc elle pèse dès le démarrage : le nombre de requêtes ne suffit plus à la surveiller,
// son poids compte autant.
test("should pull only one mascot image on the first load", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });

  const images = await page.evaluate(() => {
    // SAFETY: la specification garantit PerformanceResourceTiming pour « resource ».
    const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];

    return resources
      .filter((entry) => {
        return new URL(entry.name).pathname.includes("-sheets");
      })
      .map((entry) => {
        return {
          ko: Math.round(entry.transferSize / 102.4) / 10,
          url: new URL(entry.name).pathname,
        };
      });
  });

  expect(images).toHaveLength(1);
  expect(images[0]?.url).toContain("slime-sheets");
  expect(images[0]?.ko, `measure: ${JSON.stringify(images)}`).toBeLessThanOrEqual(FUSION_KO);
});

// Le cube et le pingouin pesent plus que le slime, et presque personne ne tapera la
// commande. Leur feuille ne doit partir qu'a la demande.
test("should not send the other shapes on the first load", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });

  const tirees = await page.evaluate(() => {
    // SAFETY: la specification garantit PerformanceResourceTiming pour « resource ».
    const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];

    return resources
      .map((entry) => {
        return new URL(entry.name).pathname;
      })
      .filter((path) => {
        return path.includes("cube-sheets") || path.includes("pingouin-sheets");
      });
  });

  expect(tirees).toEqual([]);
});

// Le mouvement réduit retire la mascotte. Aucune feuille ne doit donc partir : c'est tout
// l'intérêt de la retirer plutôt que de la figer.
test("should load no sheet when reduced motion is on", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });

  const feuilles = await page.evaluate(() => {
    return performance
      .getEntriesByType("resource")
      .map((entry) => {
        return new URL(entry.name).pathname;
      })
      .filter((chemin) => {
        return chemin.includes("-sheets");
      });
  });

  expect(feuilles).toEqual([]);
});

// La version texte a son propre budget. Elle échappait à celui de la version terminal, qui
// ne mesure que « / », et elle tire depuis peu une police de 34 Ko : sans ce plafond, une
// seconde police ou une image entrerait dans la page de repli sans que personne ne le voie.
test("should keep the text version inside its weight budget", async ({ page }) => {
  await page.goto("/texte.html");
  await page.evaluate(() => {
    return document.fonts.ready;
  });

  const measured = await page.evaluate(() => {
      // SAFETY: la specification garantit PerformanceNavigationTiming pour l'entree
      // « navigation » et PerformanceResourceTiming pour « resource ».
      const [navigation] = performance.getEntriesByType(
          "navigation",
        ) as PerformanceNavigationTiming[],
        resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];

      return {
        détail: resources.map((entry) => {
          return {
            ko: Math.round(entry.transferSize / 102.4) / 10,
            url: entry.name.replace(location.origin, ""),
          };
        }),
        tiers: resources.filter((entry) => {
          return new URL(entry.name).origin !== location.origin;
        }).length,
        total:
          (navigation?.transferSize ?? 0) +
          resources.reduce((sum, entry) => {
            return sum + entry.transferSize;
          }, 0),
      };
    }),
    totalKo = Math.round(measured.total / 102.4) / 10;

  expect(totalKo, `detail: ${JSON.stringify(measured.détail)}`).toBeLessThanOrEqual(TEXTE_KO);

  // La page de repli ne sort vers aucun hôte tiers, mesure d'audience comprise.
  expect(measured.tiers).toBe(0);
});

// La page d'erreur est servie sur toute adresse inconnue : c'est la page que l'on paie le
// plus souvent sans l'avoir voulu. Elle tire la police et la feuille de la mascotte, toutes
// deux deja en cache depuis le reste du site. Ce plafond garde la mesure a froid.
test("should keep the error page inside its weight budget", async ({ page }) => {
  await page.goto("/une/route/qui-n-existe-pas");
  await page.evaluate(() => {
    return document.fonts.ready;
  });

  const measured = await page.evaluate(() => {
      // SAFETY: la specification garantit PerformanceNavigationTiming pour l'entree
      // « navigation » et PerformanceResourceTiming pour « resource ».
      const [navigation] = performance.getEntriesByType(
          "navigation",
        ) as PerformanceNavigationTiming[],
        resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];

      return {
        detail: resources.map((entry) => {
          return {
            ko: Math.round(entry.transferSize / 102.4) / 10,
            url: entry.name.replace(location.origin, ""),
          };
        }),
        tiers: resources.filter((entry) => {
          return new URL(entry.name).origin !== location.origin;
        }).length,
        total:
          (navigation?.transferSize ?? 0) +
          resources.reduce((sum, entry) => {
            return sum + entry.transferSize;
          }, 0),
      };
    }),
    totalKo = Math.round(measured.total / 102.4) / 10;

  expect(totalKo, `detail: ${JSON.stringify(measured.detail)}`).toBeLessThanOrEqual(ERROR_KO);

  // Ni contenu, ni point d'entree, ni mesure d'audience : la page se suffit.
  expect(measured.tiers).toBe(0);
});
