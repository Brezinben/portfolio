import { expect, test } from "@playwright/test";

test("should serve src/ and refuse what does not exist", async ({ request }) => {
  const missing = await request.get("/pas-de-fichier-ici.html");

  expect(missing.status()).toBe(404);
});

// Une séquence pourcent invalide faisait lever URIError hors du try, ce qui tuait le
// processus : le harnais tombait au milieu d'une série et tous les tests suivants avec.
test("should answer 404 on a badly encoded URL without killing the server", async ({ request }) => {
  const malformed = await request.get("/%E0%A4%A");

  expect(malformed.status()).toBe(404);

  const after = await request.get("/content.json");

  expect(after.status(), "the server must survive the badly encoded URL").toBe(200);
});

// Le budget de poids se mesure après compression. Si le harnais ne compresse pas, le
// chiffre mesuré n'a aucun rapport avec ce que le visiteur télécharge.
test("should compress what must be compressed", async ({ request }) => {
  const compressed = await request.get("/content.json", {
    headers: { "accept-encoding": "gzip" },
  });

  expect(compressed.headers()["content-encoding"]).toBe("gzip");
  expect(compressed.headers().vary).toContain("accept-encoding");
});
