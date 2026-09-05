import { expect, test } from "@playwright/test";

// Compose plutot qu'ecrit en clair : no-script-url interdit le litteral, alors qu'il est
// ici la charge utile du test.
const SCRIPT = ["java", "script:"].join("");

const HOSTILE = {
  feedback: { fallbackEmail: "a@b.c", tool: "Umami", umamiHost: "https://u.test" },
  jokes: ["x"],
  profile: { email: "a@b.c" },
  sections: [
    {
      cmd: "bd whoami",
      id: "whoami",
      label: "whoami",
      lines: [{ t: "charge utile", tone: "fg);background-image:url(https://evil.example/pixel" }],
      out: {
        lines: [["k", "v", "fg2);background-image:url(https://evil.example/dl", "fg"]],
        title: "s",
      },
      sub: "s",
    },
  ],
  share: {
    targets: [{ id: "piege", kind: "open", label: "piège", url: `${SCRIPT}globalThis.pwned = 1` }],
    text: "t",
    title: "t",
    url: "https://exemple.test/",
  },
};

const serve = (page, body) =>
  page.route("**/content.json", (route) =>
    route.fulfill({ body: JSON.stringify(body), contentType: "application/json" }),
  );

const boot = async (page) => {
  await page.goto("/");
  await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });
};

// Un ton venu du contenu est interpole dans un attribut style. Sans liste blanche, il
// ferme la declaration et fait sortir une requete vers un serveur tiers.
test("un ton hostile dans le contenu ne fait sortir aucune requête", async ({ page }) => {
  const leaked = [];

  page.on("request", (request) => {
    if (request.url().includes("evil.example")) {
      leaked.push(request.url());
    }
  });

  await serve(page, HOSTILE);
  await boot(page);
  await page.waitForTimeout(1500);

  expect(leaked, "le contenu ne doit pas pouvoir appeler un serveur tiers").toEqual([]);
  await expect(page.locator("[data-result]")).toContainText("charge utile");
});

// Une cible declaree dans le contenu ne doit pas pouvoir executer de script.
test("une cible de partage en javascript: n'est jamais ouverte", async ({ page }) => {
  await serve(page, HOSTILE);
  await boot(page);
  await page.evaluate(() => {
    globalThis.opened = "aucune";
    globalThis.open = (url) => {
      globalThis.opened = url;
    };
  });

  const cli = page.getByLabel("Commande");

  await cli.fill("share piege");
  await cli.press("Enter");
  await page.waitForTimeout(400);

  expect(await page.evaluate(() => globalThis.opened)).toBe("aucune");
  await expect(page.locator("[data-journal]")).toContainText("cible inconnue");
});

// Une sequence pourcent invalide ne doit pas tuer la commande.
test("une URL mal encodée ne lève aucune exception", async ({ page }) => {
  const errors = [];

  page.on("pageerror", (error) => errors.push(error.message));

  await serve(page, {
    ...HOSTILE,
    share: {
      ...HOSTILE.share,
      targets: [{ id: "casse", kind: "open", label: "c", url: "https://x.test/%E0%A4%A" }],
    },
  });
  await boot(page);

  const cli = page.getByLabel("Commande");

  await cli.fill("share casse");
  await cli.press("Enter");
  await page.waitForTimeout(400);

  expect(errors).toEqual([]);
});
