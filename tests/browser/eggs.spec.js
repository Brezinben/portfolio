import { expect, test } from "@playwright/test";

const boot = async (page) => {
  await page.goto("/");
  await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });

  return page.getByLabel("Commande");
};

const run = async (cli, command) => {
  await cli.fill(command);
  await cli.press("Enter");
};

test("cowsay dessine sa vache dans le journal", async ({ page }) => {
  const cli = await boot(page);

  await run(cli, "/cowsay bonjour");

  await expect(page.locator("[data-journal]")).toContainText("^__^");
  await expect(page.locator("[data-journal]")).toContainText("bonjour");
});

// Les espaces multiples de l'art ASCII doivent survivre au rendu : c'est le piege que
// le drapeau preformaté resout dans le canvas.
test("l'art ASCII garde ses espaces multiples", async ({ page }) => {
  const cli = await boot(page);

  await run(cli, "/cowsay test");

  const spacing = await page
    .locator("[data-journal] span", { hasText: "^__^" })
    .first()
    .evaluate((node) => getComputedStyle(node).whiteSpace);

  expect(spacing).toMatch(/pre/);
});

test("les ligatures restent désactivées", async ({ page }) => {
  await boot(page);

  const settings = await page.locator("body").evaluate((node) => ({
    features: getComputedStyle(node).fontFeatureSettings,
    ligatures: getComputedStyle(node).fontVariantLigatures,
  }));

  expect(`${settings.features} ${settings.ligatures}`).toMatch(/none|liga/);
});

test("un mode de tête change la vache", async ({ page }) => {
  const cli = await boot(page);

  await run(cli, "/cowsay -d mort");

  await expect(page.locator("[data-journal]")).toContainText("(xx)");
});

test("cowthink rend une bulle de pensée", async ({ page }) => {
  const cli = await boot(page);

  await run(cli, "/cowthink hmm");

  await expect(page.locator("[data-journal]")).toContainText("( hmm )");
});

test("la jauge de contexte monte à chaque commande", async ({ page }) => {
  const cli = await boot(page);

  const filled = () => page.locator("[data-gauge]").textContent();
  const before = await filled();

  await run(cli, "/wtf");
  await run(cli, "/wtf");
  await run(cli, "/wtf");
  await run(cli, "/wtf");

  expect(await filled()).not.toBe(before);
});

// La jauge monte de ce que la sortie a imprime : une commande bavarde coute plus qu'un
// easter egg de deux lignes.
test("la jauge monte plus vite sur une sortie longue", async ({ page }) => {
  const cli = await boot(page);
  const percent = async () => {
    const gauge = await page.locator("[data-gauge]").textContent();

    return Number.parseInt(gauge.match(/(?<pct>\d+)%/u).groups.pct, 10);
  };

  const start = await percent();

  await run(cli, "/wtf");

  const small = (await percent()) - start;
  const before = await percent();

  await run(cli, "help");

  const large = (await percent()) - before;

  expect(large, "help imprime bien plus que wtf").toBeGreaterThan(small);
});

// La compaction est une animation, pas un message : la barre d'etat ne se met pas a
// ecrire pendant que la fenetre se vide.
test("la compaction s'annonce par une barre, sans mot", async ({ page }) => {
  const cli = await boot(page);
  const bar = page.locator("[data-compacting]");

  await Array.from({ length: 12 }).reduce(
    (chain) =>
      chain.then(() => bar.count()).then((seen) => (seen === 0 ? run(cli, "help") : undefined)),
    Promise.resolve(),
  );

  await expect(bar).toHaveCount(1);
  // La jauge entiere est decorative : le journal, lui, dit la compaction en toutes lettres.
  await expect(page.locator("[data-gauge]")).toHaveAttribute("aria-hidden", "true");

  const drawn = await bar.textContent();

  expect(drawn, "cases pleines, tête qui tourne, cases vides").toMatch(/^⣿*[⣾⣽⣻⢿⡿⣟⣯⣷]?░*$/u);
});

// L'animation remplace la jauge pleine, elle ne s'ajoute pas a elle : deux barres cote
// a cote, l'utilisateur ne sait plus laquelle compte.
test("pendant la compaction, une seule barre reste à l'écran", async ({ page }) => {
  const cli = await boot(page);
  const bar = page.locator("[data-compacting]");

  await Array.from({ length: 12 }).reduce(
    (chain) =>
      chain.then(() => bar.count()).then((seen) => (seen === 0 ? run(cli, "help") : undefined)),
    Promise.resolve(),
  );

  await expect(bar).toHaveCount(1);

  const status = await page.locator("[data-status]").textContent();

  expect(status.trim(), "rien ne s'ajoute après la jauge").toMatch(/ctx \[.{10}\] \d+%$/u);
});

// Pleine, la jauge compacte avec un resume ironique, puis repart a zero.
test("la jauge pleine déclenche une compaction et se vide", async ({ page }) => {
  const cli = await boot(page);
  const warned = page.locator("[data-journal]", { hasText: "fenêtre de contexte pleine" });

  // Le nombre de commandes depend de ce qu'elles impriment : on tape jusqu'a saturation.
  await Array.from({ length: 12 }).reduce(
    (chain) =>
      chain.then(() => warned.count()).then((seen) => (seen === 0 ? run(cli, "help") : undefined)),
    Promise.resolve(),
  );

  await expect(page.locator("[data-journal]")).toContainText("fenêtre de contexte pleine");
  // La compaction dure cinq secondes : l'attente par défaut de Playwright serait trop courte.
  await expect(page.locator("[data-journal]")).toContainText("aime le vélo", {
    timeout: 10_000,
  });

  const gauge = await page.locator("[data-gauge]").textContent();
  const filled = gauge.split("█").length - 1;

  expect(filled, "la jauge repart de presque zéro").toBeLessThanOrEqual(1);
});

// Compacter prend du temps chez Claude Code, et ca doit se voir ici aussi : la barre se
// remplit case par case, elle ne s'affiche pas d'un bloc.
test("la barre de compaction se remplit case par case sur cinq secondes", async ({ page }) => {
  const cli = await boot(page);
  const bar = page.locator("[data-compacting]");

  await Array.from({ length: 12 }).reduce(
    (chain) =>
      chain.then(() => bar.count()).then((seen) => (seen === 0 ? run(cli, "help") : undefined)),
    Promise.resolve(),
  );

  const started = Date.now();
  const posees = async () => {
    const drawn = await bar.textContent().catch(() => "");

    return (drawn ?? "").replaceAll("░", "").length;
  };
  const first = await posees();

  await expect.poll(posees, { timeout: 8000 }).toBeGreaterThan(first);
  await expect(page.locator("[data-journal]")).toContainText("aime le vélo", {
    timeout: 10_000,
  });

  expect(Date.now() - started, "l'attente se voit").toBeGreaterThan(4000);
});

// La compaction se declenche pendant qu'on tape une commande : le regard est sur le volet
// de sortie, pas sur la barre d'etat. La barre doit se voir aux deux endroits.
test("la compaction se voit aussi dans le volet de sortie", async ({ page }) => {
  const cli = await boot(page);
  const bar = page.locator("[data-compacting]");

  await Array.from({ length: 12 }).reduce(
    (chain) =>
      chain.then(() => bar.count()).then((seen) => (seen === 0 ? run(cli, "help") : undefined)),
    Promise.resolve(),
  );

  const sortie = page.locator('[data-pane="out"] [data-compacting-out]');

  await expect(sortie).toHaveCount(1);
  await expect(sortie).toHaveAttribute("aria-hidden", "true");
  expect(await sortie.textContent()).toMatch(/^⣿*[⣾⣽⣻⢿⡿⣟⣯⣷]?░*$/u);
});

// Un redemarrage annule la compaction : sinon son resume s'ecrit dans un journal qu'on
// vient de vider, et sa barre s'affiche par-dessus l'ecran de demarrage.
test("un redémarrage annule la compaction en cours", async ({ page }) => {
  const cli = await boot(page);
  const bar = page.locator("[data-compacting]");

  await Array.from({ length: 12 }).reduce(
    (chain) =>
      chain.then(() => bar.count()).then((seen) => (seen === 0 ? run(cli, "help") : undefined)),
    Promise.resolve(),
  );

  await run(cli, "/reboot");
  await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 15_000 });
  await page.waitForTimeout(1500);

  await expect(bar, "plus de barre de compaction").toHaveCount(0);
  await expect(page.locator("[data-journal]"), "le journal reste vide").not.toContainText(
    "aime le vélo",
  );
});

test("shutdown éteint puis rejoue le démarrage", async ({ page }) => {
  const cli = await boot(page);

  await run(cli, "shutdown");

  await expect(page.locator("[data-boot]")).toHaveCount(1, { timeout: 10_000 });
  await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 15_000 });
  await expect(page.locator('[data-pane="main"]')).toContainText("bd whoami --verbose");
});

// Les yeux du mode cupide valent « $$ », qui est un motif de remplacement en JavaScript.
// Un build qui passe par String.replace avec un remplacement litteral les reduit a « $ ».
// Ce test s'execute sur l'artefact servi, la ou les tests unitaires lisent la source.
test("les yeux du mode cupide survivent au build", async ({ page }) => {
  const cli = await boot(page);

  await run(cli, "/cowsay -g argent");

  await expect(page.locator("[data-journal]")).toContainText("($$)");
});
