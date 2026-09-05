import { expect, test } from "@playwright/test";

// Alpine et la police sont figés dans production/. Un CDN remettrait la requête tierce
// que le portage existe précisément pour supprimer.
test("Alpine est servi depuis production/ et non depuis un CDN", async ({ request }) => {
  const response = await request.get("/vendor/alpine.js");

  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("text/javascript");
  expect(response.headers()["content-encoding"]).toBe("gzip");
});

test("la police est servie depuis production/", async ({ request }) => {
  const response = await request.get("/fonts/jetbrains-mono.woff2");

  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toBe("font/woff2");
});

// Woff2 est déjà compressé : le recompresser coûterait du temps pour rien.
test("la police n'est pas recompressée", async ({ request }) => {
  const response = await request.get("/fonts/jetbrains-mono.woff2", {
    headers: { "accept-encoding": "gzip" },
  });

  expect(response.headers()["content-encoding"]).toBeUndefined();
});
