import { defineConfig } from "@playwright/test";

// Le port et la sortie sont réglables : plusieurs suites peuvent tourner côte à côte
// sans se disputer le port ni le dossier construit.
const PORT = Number(process.env.PORTFOLIO_PORT ?? 4173),
  DIST = process.env.PORTFOLIO_DIST ?? "dist.test",
  // La machine beta n'a que 7 Go de RAM. Au-delà de deux navigateurs, la session entière
  // plante, pas seulement les tests.
  WORKERS = Number(process.env.PORTFOLIO_WORKERS ?? 2);

// Les chemins se résolvent depuis .config/ : chacun remonte à la racine du dépôt.
export default defineConfig({
  fullyParallel: true,
  outputDir: "../test-results",
  reporter: process.env.CI ? "list" : [["html", { outputFolder: "../playwright-report" }]],
  retries: process.env.CI ? 2 : 0,
  testDir: "../tests/browser",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
  },
  webServer: {
    command: `bun run build && bun tests/helpers/static-server.ts ${PORT}`,
    cwd: "..",
    // Sur beta, Caddy sert dist/. Sans cette redirection, la suite y publierait l'arbre de
    // travail, que les tests passent ou non.
    env: { PORTFOLIO_DIST: DIST },
    // Réutiliser un serveur déjà là masque « port déjà utilisé » et fait passer les tests
    // contre un `src/` périmé, ou contre une autre application sur le même port.
    reuseExistingServer: false,
    url: `http://127.0.0.1:${PORT}/content.json`,
  },
  workers: WORKERS,
});
