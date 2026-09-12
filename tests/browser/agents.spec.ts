import { expect, test } from "@playwright/test";

// La construction copie src/ dans l'artefact compact. Ces deux fichiers ne passent
// par aucune transformation, donc rien ne garantit leur présence hors de ce test.
test("le sitemap est servi depuis l'artefact compact", async ({ request }) => {
  const response = await request.get("/sitemap.xml");

  expect(response.status()).toBe(200);
  expect(await response.text()).toContain("<loc>https://me.brezinben.dpdns.org/</loc>");
});

test("robots.txt est servi et désigne le sitemap", async ({ request }) => {
  const response = await request.get("/robots.txt");

  expect(response.status()).toBe(200);
  expect(await response.text()).toContain("Sitemap: https://me.brezinben.dpdns.org/sitemap.xml");
});

test("llms.txt est servi en texte brut", async ({ request }) => {
  const response = await request.get("/llms.txt");

  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("text/plain");
  expect(await response.text()).toContain("## Quand ce site répond à votre question");
});

// L'index ne porte pas le contenu. L'agent qui suit le lien de fond doit le trouver servi.
test("le contenu complet est servi en texte brut", async ({ request }) => {
  const response = await request.get("/llms-full.txt");

  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("text/plain");
  expect(await response.text()).toContain("## Compétences techniques");
});
