import { expect, test } from "@playwright/test";

test("le serveur statique sert production/ et refuse ce qui n'existe pas", async ({ request }) => {
  const missing = await request.get("/pas-de-fichier-ici.html");

  expect(missing.status()).toBe(404);
});

test("content.json est servi et se parse", async ({ request }) => {
  const response = await request.get("/content.json");

  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("application/json");

  const content = await response.json();

  for (const key of ["profile", "share", "sections", "details", "timeline", "stack"]) {
    expect(content, `content.json doit porter la clé ${key}`).toHaveProperty(key);
  }
});

// Une séquence pourcent invalide faisait lever URIError hors du try, ce qui tuait le
// processus : le harnais tombait au milieu d'une série et tous les tests suivants avec.
test("une URL mal encodée renvoie 404 sans tuer le serveur", async ({ request }) => {
  const malformed = await request.get("/%E0%A4%A");

  expect(malformed.status()).toBe(404);

  const after = await request.get("/content.json");

  expect(after.status(), "le serveur doit survivre à l'URL mal encodée").toBe(200);
});

// Le budget de poids se mesure après compression. Si le harnais ne compresse pas, le
// chiffre mesuré n'a aucun rapport avec ce que le visiteur télécharge.
test("le serveur compresse ce qui doit l'être", async ({ request }) => {
  const compressed = await request.get("/content.json", {
    headers: { "accept-encoding": "gzip" },
  });

  expect(compressed.headers()["content-encoding"]).toBe("gzip");
  expect(compressed.headers().vary).toContain("accept-encoding");
});
