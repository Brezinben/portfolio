import { defineConfig } from "@playwright/test";

// Le port et la sortie sont reglables : plusieurs suites peuvent tourner cote a cote
// sans se disputer le port ni le dossier construit.
const PORT = Number(process.env.PORTFOLIO_PORT ?? 4173);
const DIST = process.env.PORTFOLIO_DIST ?? "dist.test";

export default defineConfig({
  fullyParallel: true,
  reporter: process.env.CI ? "list" : "html",
  retries: process.env.CI ? 2 : 0,
  testDir: "./tests/browser",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npm run build && node tests/helpers/static-server.js ${PORT}`,
    // Caddy sert dist/. Sans cette redirection, lancer la suite publierait l'arbre de
    // travail en ligne, que les tests passent ou non.
    env: { PORTFOLIO_DIST: DIST },
    // Réutiliser un serveur déjà là masque « port déjà utilisé » et fait passer les tests
    // contre un `src/` périmé, ou contre une autre application sur le même port.
    reuseExistingServer: false,
    url: `http://127.0.0.1:${PORT}/content.json`,
  },
});
