import { defineConfig } from "@playwright/test";

const PORT = 4173;

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
    // Réutiliser un serveur déjà là masque « port déjà utilisé » et fait passer les tests
    // contre un `production/` périmé, ou contre une autre application sur le même port.
    reuseExistingServer: false,
    url: `http://127.0.0.1:${PORT}/content.json`,
  },
});
