import { expect, test } from "@playwright/test";

// La construction copie src/ dans l'artefact compact. Ces deux fichiers ne passent
// par aucune transformation, donc rien ne garantit leur présence hors de ce test.
test("should serve the sitemap from the compact artifact", async ({ request }) => {
  const response = await request.get("/sitemap.xml");

  expect(response.status()).toBe(200);
  expect(await response.text()).toContain("<loc>https://me.brezinben.dpdns.org/</loc>");
});

test("should serve robots.txt and point to the sitemap", async ({ request }) => {
  const response = await request.get("/robots.txt");

  expect(response.status()).toBe(200);
  expect(await response.text()).toContain("Sitemap: https://me.brezinben.dpdns.org/sitemap.xml");
});

test("should serve llms.txt as plain text", async ({ request }) => {
  const response = await request.get("/llms.txt");

  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("text/plain");
  expect(await response.text()).toContain("## Quand ce site répond à votre question");
});

// L'index ne porte pas le contenu. L'agent qui suit le lien de fond doit le trouver servi.
test("should serve the full content as plain text", async ({ request }) => {
  const response = await request.get("/llms-full.txt");

  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("text/plain");
  expect(await response.text()).toContain("## Compétences techniques");
});
