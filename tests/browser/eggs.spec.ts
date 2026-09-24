import type { Locator, Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

const boot = async (page: Page) => {
    await page.goto("/");
    await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });

    return page.getByLabel("Commande");
  },
  run = async (cli: Locator, command: string) => {
    await cli.fill(command);
    await cli.press("Enter");
  };

test("should draw the cow in the journal with cowsay", async ({ page }) => {
  const cli = await boot(page);

  await run(cli, "/cowsay bonjour");

  await expect(page.locator("[data-journal]")).toContainText("^__^");
  await expect(page.locator("[data-journal]")).toContainText("bonjour");
});

// Les espaces multiples de l'art ASCII doivent survivre au rendu : c'est le piege que
// le drapeau preformaté resout dans le canvas.
test("should keep the multiple spaces of the ASCII art", async ({ page }) => {
  const cli = await boot(page);

  await run(cli, "/cowsay test");

  const spacing = await page
    .locator("[data-journal] span", { hasText: "^__^" })
    .first()
    .evaluate((node: HTMLElement) => {
      // « innerText » rend le texte tel qu'il est peint : les espaces fondues en disparaissent.
      // « textContent » garderait tout et passerait toujours.
      // oxlint-disable-next-line unicorn/prefer-dom-node-text-content
      return node.innerText;
    });

  expect(spacing, "the rendered text keeps its runs of spaces").toMatch(/ {2}/u);
});

test("should keep the ligatures off", async ({ page }) => {
  await boot(page);

  const settings = await page.locator("body").evaluate((node) => {
    return {
      features: getComputedStyle(node).fontFeatureSettings,
      ligatures: getComputedStyle(node).fontVariantLigatures,
    };
  });

  expect(`${settings.features} ${settings.ligatures}`).toMatch(/none|liga/);
});

test("should raise the context gauge on every command", async ({ page }) => {
  const cli = await boot(page),
    filled = () => {
      return page.locator("[data-gauge]").textContent();
    },
    before = await filled();

  await run(cli, "/sudo");
  await run(cli, "/sudo");
  await run(cli, "/sudo");
  await run(cli, "/sudo");

  expect(await filled()).not.toBe(before);
});

// La jauge monte de ce que la sortie a imprime : une commande bavarde coute plus qu'un
// easter egg de deux lignes.
test("should raise the gauge faster on a long output", async ({ page }) => {
  const cli = await boot(page),
    percent = async () => {
      const gauge = (await page.locator("[data-gauge]").textContent()) ?? "";

      return Number.parseInt(/(?<pct>\d+)%/u.exec(gauge)?.groups?.pct ?? "", 10);
    },
    start = await percent();

  await run(cli, "/sudo");

  const small = (await percent()) - start,
    before = await percent();

  await run(cli, "help");

  const large = (await percent()) - before;

  expect(large, "help prints much more than sudo").toBeGreaterThan(small);
});

// La compaction est une animation, pas un message : la barre d'etat ne se met pas a
// ecrire pendant que la fenetre se vide.
test("should announce the compaction with a bar and no word", async ({ page }) => {
  const cli = await boot(page),
    bar = page.locator("[data-compacting]");

  await Array.from({ length: 12 }).reduce<Promise<unknown>>((chain) => {
    return chain
      .then(() => {
        return bar.count();
      })
      .then((seen) => {
        return seen === 0 ? run(cli, "help") : undefined;
      });
  }, Promise.resolve());

  await expect(bar).toHaveCount(1);
  // La jauge entiere est decorative : le journal, lui, dit la compaction en toutes lettres.
  await expect(page.locator("[data-gauge]")).toHaveAttribute("aria-hidden", "true");

  const drawn = await bar.textContent();

  expect(drawn, "full cells, spinning head, empty cells").toMatch(/^⣿*[⣾⣽⣻⢿⡿⣟⣯⣷]?░*$/u);
});

// L'animation remplace la jauge pleine, elle ne s'ajoute pas a elle : deux barres cote
// a cote, l'utilisateur ne sait plus laquelle compte.
test("should keep only one bar on screen during the compaction", async ({ page }) => {
  const cli = await boot(page),
    bar = page.locator("[data-compacting]");

  await Array.from({ length: 12 }).reduce<Promise<unknown>>((chain) => {
    return chain
      .then(() => {
        return bar.count();
      })
      .then((seen) => {
        return seen === 0 ? run(cli, "help") : undefined;
      });
  }, Promise.resolve());

  await expect(bar).toHaveCount(1);

  const status = (await page.locator("[data-status]").textContent()) ?? "";

  expect(status.trim(), "nothing is added after the gauge").toMatch(/ctx \[.{10}\] \d+%$/u);
});

// La jauge mesure ce qu'une commande a produit. Un clic dans le volet gauche ouvre la même
// section, et il ne coûte rien : sinon un visiteur qui n'a rien tapé la remplissait en
// parcourant les onglets, et elle cessait de dire ce qu'elle mesure.
test("should leave the gauge empty when the panes are only clicked", async ({ page }) => {
  const cli = await boot(page),
    gauge = () => {
      return page.locator("[data-gauge]").evaluate((node) => {
        return (node.textContent ?? "").split("█").length - 1;
      });
    };

  const nav = page.locator('[data-ctl="nav"]'),
    entries = await nav.count();

  // Les six sections et les quatre missions, une par une : les ouvrir en parallèle ne
  // navigue pas. La première est déjà ouverte au démarrage.
  for (let at = 1; at < entries; at += 1) {
    // eslint-disable-next-line no-await-in-loop
    await nav.nth(at).click();
  }

  expect(await gauge(), "clicking costs nothing").toBe(0);

  await run(cli, "help");

  expect(await gauge(), "a typed command costs").toBeGreaterThan(0);
});

// Pleine, la jauge compacte avec un resume ironique, puis repart a zero.
test("should start a compaction and empty itself when the gauge is full", async ({ page }) => {
  const cli = await boot(page),
    warned = page.locator("[data-journal]", { hasText: "fenêtre de contexte pleine" });

  // Le nombre de commandes depend de ce qu'elles impriment : on tape jusqu'a saturation.
  await Array.from({ length: 12 }).reduce<Promise<unknown>>((chain) => {
    return chain
      .then(() => {
        return warned.count();
      })
      .then((seen) => {
        return seen === 0 ? run(cli, "help") : undefined;
      });
  }, Promise.resolve());

  await expect(page.locator("[data-journal]")).toContainText("fenêtre de contexte pleine");
  // La compaction dure cinq secondes : l'attente par défaut de Playwright serait trop courte.
  await expect(page.locator("[data-journal]")).toContainText("aime le vélo", {
    timeout: 10_000,
  });

  const gauge = (await page.locator("[data-gauge]").textContent()) ?? "",
    filled = gauge.split("█").length - 1;

  expect(filled, "the gauge restarts from almost zero").toBeLessThanOrEqual(1);
});

// Compacter prend du temps chez Claude Code, et ca doit se voir ici aussi : la barre se
// remplit case par case, elle ne s'affiche pas d'un bloc.
test("should fill the compaction bar cell by cell over five seconds", async ({ page }) => {
  const cli = await boot(page),
    bar = page.locator("[data-compacting]");

  await Array.from({ length: 12 }).reduce<Promise<unknown>>((chain) => {
    return chain
      .then(() => {
        return bar.count();
      })
      .then((seen) => {
        return seen === 0 ? run(cli, "help") : undefined;
      });
  }, Promise.resolve());

  const started = Date.now(),
    posees = async () => {
      const drawn = await bar.textContent().catch(() => {
        return "";
      });

      return (drawn ?? "").replaceAll("░", "").length;
    },
    first = await posees();

  await expect.poll(posees, { timeout: 8000 }).toBeGreaterThan(first);
  await expect(page.locator("[data-journal]")).toContainText("aime le vélo", {
    timeout: 10_000,
  });

  expect(Date.now() - started, "the wait is visible").toBeGreaterThan(4000);
});

// Le volet de sortie garde un caractere pour dire l'attente, jamais une barre : la barre
// de compaction vit dans la barre d'etat, et nulle part ailleurs.
test("should show no compaction bar in the output pane", async ({ page }) => {
  const cli = await boot(page),
    bar = page.locator("[data-compacting]");

  await Array.from({ length: 12 }).reduce<Promise<unknown>>((chain) => {
    return chain
      .then(() => {
        return bar.count();
      })
      .then((seen) => {
        return seen === 0 ? run(cli, "help") : undefined;
      });
  }, Promise.resolve());

  await expect(bar).toHaveCount(1);
  await expect(page.locator('[data-pane="out"] [data-compacting-out]')).toHaveCount(0);
  await expect(page.locator('[data-pane="out"]')).not.toContainText("⣿");
});

// L'ecran de demarrage prend la forme de la compaction : cases pleines, tete qui tourne,
// cases vides. Meme taille, meme place, memes durees qu'avant.
test("should draw the boot bar with dots", async ({ page }) => {
  // Le demarrage dure deux secondes au minimum : la barre est a l'ecran sans qu'on ait a
  // retarder quoi que ce soit.
  await page.goto("/");

  const barre = page.locator("[data-boot-bar]");

  await expect(barre).toBeVisible();
  await expect(barre).toHaveAttribute("aria-hidden", "true");
  expect((await barre.textContent()) ?? "").toMatch(/^\[⣿*[⣾⣽⣻⢿⡿⣟⣯⣷]?░*\]$/u);
});

// Un redemarrage annule la compaction : sinon son resume s'ecrit dans un journal qu'on
// vient de vider, et sa barre s'affiche par-dessus l'ecran de demarrage.
test("should cancel the running compaction on a reboot", async ({ page }) => {
  const cli = await boot(page),
    bar = page.locator("[data-compacting]");

  await Array.from({ length: 12 }).reduce<Promise<unknown>>((chain) => {
    return chain
      .then(() => {
        return bar.count();
      })
      .then((seen) => {
        return seen === 0 ? run(cli, "help") : undefined;
      });
  }, Promise.resolve());

  await run(cli, "/reboot");
  await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 15_000 });
  await page.waitForTimeout(1500);

  await expect(bar, "no more compaction bar").toHaveCount(0);
  await expect(page.locator("[data-journal]"), "the journal stays empty").not.toContainText(
    "aime le vélo",
  );
});

test("should shut down then replay the boot with shutdown", async ({ page }) => {
  const cli = await boot(page);

  await run(cli, "shutdown");

  await expect(page.locator("[data-boot]")).toHaveCount(1, { timeout: 10_000 });
  await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 15_000 });
  await expect(page.locator('[data-pane="main"]')).toContainText("bd whoami --verbose");
});

// Les yeux du mode cupide valent « $$ », qui est un motif de remplacement en JavaScript.
// Un build qui passe par String.replace avec un remplacement litteral les reduit a « $ ».
// Ce test s'execute sur l'artefact servi, la ou les tests unitaires lisent la source.
test("should keep the eyes of the greedy mode through the build", async ({ request }) => {
  const page = await request.get("/"),
    servi = await page.text();

  // Le minifieur choisit ses guillemets : on cherche la paire de dollars, pas sa mise en forme.
  expect(servi, "the double dollar must not be reduced to one").toMatch(/eyes:.\$\$./u);
});

// Le glitch : cinq secondes d'affichage corrompu. Le calque en est la seule trace stable,
// puisque le texte, lui, change a chaque passe.
const layer = (page: Page) => {
    return page.locator("[data-glitch-layer]");
  },
  pressShift = async (page: Page, times: number) => {
    await Array.from({ length: times }).reduce<Promise<unknown>>((chain) => {
      return chain.then(() => {
        return page.keyboard.press("Shift");
      });
    }, Promise.resolve());
  };

test("should corrupt the display after five taps on Shift", async ({ page }) => {
  await boot(page);
  await page.locator("[data-journal]").focus();

  await pressShift(page, 5);

  await expect(layer(page)).toHaveCount(1);
  await expect(page.locator("[data-panes]")).toHaveAttribute("data-glitch", "shift");
  await expect(layer(page)).toHaveCount(0, { timeout: 10_000 });
});

// La jauge n'entre qu'au deuxieme appui : au premier elle trahirait l'easter egg a
// quiconque effleure la touche.
test("should show the shift gauge only from the second tap", async ({ page }) => {
  await boot(page);
  await page.locator("[data-journal]").focus();

  await pressShift(page, 1);
  await expect(page.locator("[data-shift]")).toHaveCount(0);

  await pressShift(page, 1);
  await expect(page.locator("[data-shift]")).toContainText("2/5");
});

// Une majuscule tapee dans la commande ne doit jamais declencher l'egg : sans ce
// garde-fou, ecrire « Benjamin » corrompait la page.
test("should ignore the Shift taps typed in the command line", async ({ page }) => {
  const cli = await boot(page);

  await cli.focus();
  await pressShift(page, 6);

  await expect(page.locator("[data-glitch-layer]")).toHaveCount(0);
  await expect(page.locator("[data-shift]")).toHaveCount(0);
});

test("should add the katakana rain on matrix", async ({ page }) => {
  const cli = await boot(page);

  await run(cli, "/matrix");

  await expect(page.locator("[data-panes]")).toHaveAttribute("data-glitch", "matrix");
  await expect(page.locator("[data-glitch-column]").first()).toBeVisible();
});

// Le refus de sudo doit se lire avant que l'ecran parte. Le compte se lit sans attendre :
// une assertion qui reessaie passerait aussi bien si la panne partait tout de suite.
test("should let the sudo refusal be read before the glitch", async ({ page }) => {
  const cli = await boot(page);

  await run(cli, "/sudo");
  await expect(page.locator("[data-journal]")).toContainText("sudoers");

  expect(await layer(page).count(), "the glitch must wait for the refusal to be read").toBe(0);
  await expect(layer(page)).toHaveCount(1, { timeout: 5000 });
});

// La permutation des couleurs passe par une variable, parce que le conteneur des volets
// porte un style en ligne qui bat la feuille. Elle est partie une fois sans que rien ne le
// signale : ce test lit l'animation reellement calculee.
test("should really run the theme permutation on the panes", async ({ page }) => {
  const cli = await boot(page);

  await run(cli, "/matrix");

  await expect
    .poll(() => {
      return page.locator("[data-panes]").evaluate((node) => {
        return node.getAnimations().length;
      });
    })
    .toBeGreaterThan(0);
});

// Une touche maintenue se repete. Sans garde, garder Shift enfonce armait l'egg tout seul,
// et « il ne se declenche jamais tout seul » cessait d'etre vrai.
test("should not arm the glitch when Shift is held down", async ({ page }) => {
  await boot(page);
  await page.locator("[data-journal]").focus();

  await page.keyboard.down("Shift");
  await page.waitForTimeout(1200);
  await page.keyboard.up("Shift");

  expect(await layer(page).count(), "holding Shift must not corrupt the display").toBe(0);
});

// Une panne chasse la precedente, minuteur compris : sans cela le glitch de sudo repartait
// au milieu de celui de matrix, et emportait la pluie avec lui.
test("should drop the pending sudo glitch when another one starts", async ({ page }) => {
  const cli = await boot(page);

  await run(cli, "/sudo");
  await run(cli, "/matrix");
  await expect(page.locator("[data-panes]")).toHaveAttribute("data-glitch", "matrix");

  await page.waitForTimeout(1500);

  await expect(page.locator("[data-panes]")).toHaveAttribute("data-glitch", "matrix");
  await expect(page.locator("[data-glitch-column]").first()).toBeVisible();
});

// Le texte d'origine est mis en cache, et rendu tel quel a la fin : cinq secondes de
// panne ne doivent pas coûter une lettre.
test("should give the pane its text back once the glitch is over", async ({ page }) => {
  const cli = await boot(page),
    pane = page.locator('[data-pane="nav"]'),
    before = await pane.textContent();

  await run(cli, "/matrix");
  await expect(layer(page)).toHaveCount(1);
  await expect(layer(page)).toHaveCount(0, { timeout: 10_000 });

  await expect(pane).toHaveText(before ?? "");
});

// Le mouvement reduit court-circuite tout : un lecteur d'ecran relirait sinon cinq
// secondes de charabia sans avoir rien demande.
test("should corrupt nothing when reduced motion is on", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });

  const cli = await boot(page),
    pane = page.locator('[data-pane="nav"]'),
    before = await pane.textContent();

  await run(cli, "/matrix");
  await page.waitForTimeout(500);

  await expect(page.locator("[data-glitch-layer]")).toHaveCount(0);
  await expect(pane).toHaveText(before ?? "");
});

// « role="status" » porte la meme semantique qu'« aria-live ». Le texte est echantillonne
// au rythme du glitch : une assertion qui reessaie passerait aussi bien une fois la panne
// finie.
test("should spare the live region marked with a role", async ({ page }) => {
  const cli = await boot(page),
    live = page.locator("[data-ach-live]");

  await run(cli, "/sudo");
  await expect(live).toContainText("succès débloqué");

  const said = await live.textContent();

  await expect(layer(page)).toHaveCount(1);

  const seen = await Array.from({ length: 20 }).reduce<Promise<Set<string>>>(async (chain) => {
    const texts = await chain;

    texts.add((await live.textContent()) ?? "");
    await page.waitForTimeout(70);

    return texts;
  }, Promise.resolve(new Set<string>()));

  expect([...seen], "the live region must not change during the glitch").toEqual([said]);
});
