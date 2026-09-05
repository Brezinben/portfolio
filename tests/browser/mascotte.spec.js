import { expect, test } from "@playwright/test";

const boot = async (page) => {
  await page.goto("/");
  await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });

  return page.getByLabel("Commande");
};

const mascot = (page) => page.locator("[data-mascot]");

test("la mascotte est dessinée en ombres portées, sans aucune image", async ({ page }) => {
  await boot(page);

  await expect(mascot(page)).toBeVisible();
  await expect(page.locator("img")).toHaveCount(0);

  const shadow = await mascot(page).evaluate((node) => getComputedStyle(node).boxShadow);

  expect(shadow.length, "le sprite est une longue liste d'ombres").toBeGreaterThan(2000);
  expect(shadow).toContain("245, 184, 59");
});

test("la mascotte porte un nom accessible qui suit son humeur", async ({ page }) => {
  const cli = await boot(page);

  await expect(mascot(page)).toHaveAttribute("aria-label", /au repos/);

  await cli.fill("slime sad");
  await cli.press("Enter");

  await expect(mascot(page)).toHaveAttribute("aria-label", /triste/);
});

test("les sept humeurs sont pilotables", async ({ page }) => {
  const cli = await boot(page);

  const moods = [
    ["happy", "content"],
    ["laugh", "hilare"],
    ["sad", "triste"],
    ["scared", "apeuré"],
    ["sleep", "endormi"],
    ["alert", "surpris"],
  ];

  await moods.reduce(
    (chain, [mood, label]) =>
      chain
        .then(() => cli.fill(`slime ${mood}`))
        .then(() => cli.press("Enter"))
        .then(() =>
          expect(mascot(page), `humeur ${mood}`).toHaveAttribute("aria-label", new RegExp(label)),
        ),
    Promise.resolve(),
  );
});

test("une commande fait parler la mascotte", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("joke");
  await cli.press("Enter");

  await expect(page.locator("[data-bubble]")).toContainText("héhé");
});

// La position passe par le style, pas par l'état réactif : la faire transiter par Alpine
// ferait rerendre la page a chaque image.
test("la position est écrite directement dans le style", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("slime drop");
  await cli.press("Enter");

  await expect.poll(() => mascot(page).evaluate((node) => node.style.left)).toMatch(/px$/);
});

test("la couronne tombe après le bon nombre de clics et survit au rechargement", async ({
  page,
}) => {
  await boot(page);

  const target = new Date().getFullYear() - 2000;

  await expect(page.locator("[data-crown]")).toHaveCount(0);

  await Array.from({ length: target }).reduce(
    (chain) => chain.then(() => mascot(page).click({ force: true })),
    Promise.resolve(),
  );

  await expect(page.locator("[data-crown]")).toHaveCount(1);
  await expect(mascot(page)).toHaveAttribute("aria-label", /couronnée/);

  await page.reload();
  await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });

  await expect(
    page.locator("[data-crown]"),
    "la couronne est conservée sur l'appareil",
  ).toHaveCount(1);
});

test("la mascotte respire au repos", async ({ page }) => {
  await boot(page);

  await expect
    .poll(() => mascot(page).evaluate((node) => getComputedStyle(node).animationName))
    .toBe("bob");
});

// Le réglage « animations désactivées » doit aussi taire la mascotte.
test("animations désactivées, la mascotte ne bouge plus", async ({ page }) => {
  await boot(page);
  await page.getByRole("button", { name: "options" }).click();
  await page.getByRole("button", { name: /animations/ }).click();
  await page.getByRole("dialog").press("Escape");

  await expect
    .poll(() => mascot(page).evaluate((node) => getComputedStyle(node).animationName))
    .toBe("none");
});
