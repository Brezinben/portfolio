import { expect, test } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { readFileSync } from "node:fs";
import { settled } from "../helpers/settled.ts";

const CONTENT = fileURLToPath(new URL("../../src/content.json", import.meta.url)),
  // SAFETY: content.json est un artefact du dépôt, versionné à côté de ce test, et son
  // schéma est tenu par tests/unit/content.test.ts. Seules deux clés des sections sont lues ici.
  { sections } = JSON.parse(readFileSync(CONTENT, "utf8")) as {
    sections: { cmd: string; id: string }[];
  },
  SCREENS = {
    desktop: { viewport: { height: 720, width: 1280 } },
    mobile: { hasTouch: true, isMobile: true, viewport: { height: 844, width: 390 } },
  };

// Les captures servent la revue d'une montée majeure de Dependabot : la CI les publie en
// commentaire de la PR (travail « screenshots » de .github/workflows/tests.yml).
for (const [screen, options] of Object.entries(SCREENS)) {
  test.describe(screen, () => {
    test.use(options);

    for (const [rank, { cmd, id }] of sections.entries()) {
      test(`should open the ${id} section cleanly on ${screen}`, async ({ page }, testInfo) => {
        const errors: string[] = [];

        page.on("pageerror", (error) => {
          return errors.push(error.message);
        });

        try {
          await page.goto(`/#${id}`);
          await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });
          await expect(page.locator('[data-pane="main"]')).toContainText(cmd);
          await settled(page);

          const { violations } = await new AxeBuilder({ page }).analyze();

          expect(
            violations.map((entry) => {
              return `${entry.id}: ${entry.nodes.length}`;
            }),
          ).toEqual([]);
          expect(errors, "no uncaught exception").toEqual([]);
        } finally {
          // Une capture prise après l'échec montre au relecteur ce qui a cassé.
          await page.screenshot({
            fullPage: true,
            path: join(
              testInfo.project.outputDir,
              "screenshots",
              `${rank + 1}-${id}-${screen}.png`,
            ),
          });
        }
      });
    }
  });
}
