import { defineConfig } from "@playwright/test";

const PORT = 4173;

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "list" : "html",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
  },
  webServer: {
    command: `node tests/helpers/static-server.js ${PORT}`,
    url: `http://127.0.0.1:${PORT}/content.json`,
    // Réutiliser un serveur déjà là masque « port déjà utilisé » et fait passer les tests
    // contre un `production/` périmé, ou contre une autre application sur le même port.
    reuseExistingServer: false,
  },
});
