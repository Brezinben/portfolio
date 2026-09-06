import { expect, test } from "@playwright/test";

const ALPINE = /src="(?<url>vendor\/alpine[^"]*\.js)"/u;
const POLICE = /url\(["']?(?<url>fonts\/jetbrains-mono[^"')]*\.woff2)["']?\)/u;

// La construction pose une empreinte du contenu dans le nom des actifs. Le test lit donc
// la référence dans la page servie : figer un nom le ferait échouer à chaque changement.
const referenced = async (request, pattern) => {
  const page = await request.get("/");
  const html = await page.text();
  const url = html.match(pattern)?.groups?.url;

  expect(url, `la page ne référence aucun actif qui corresponde à ${pattern}`).toBeDefined();

  return `/${url}`;
};

// Alpine et la police sont figés dans src/. Un CDN remettrait la requête tierce
// que le portage existe précisément pour supprimer.
test("Alpine est servi depuis src/ et non depuis un CDN", async ({ request }) => {
  const response = await request.get(await referenced(request, ALPINE));

  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("text/javascript");
  expect(response.headers()["content-encoding"]).toBe("gzip");
});

test("la police est servie depuis src/", async ({ request }) => {
  const response = await request.get(await referenced(request, POLICE));

  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toBe("font/woff2");
});

// Woff2 est déjà compressé : le recompresser coûterait du temps pour rien.
test("la police n'est pas recompressée", async ({ request }) => {
  const response = await request.get(await referenced(request, POLICE), {
    headers: { "accept-encoding": "gzip" },
  });

  expect(response.status()).toBe(200);
  expect(response.headers()["content-encoding"]).toBeUndefined();
});
