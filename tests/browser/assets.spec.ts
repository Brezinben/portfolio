import { expect, test } from "@playwright/test";
import type { APIRequestContext } from "@playwright/test";

const ALPINE = /src="(?<url>vendor\/alpine[^"]*\.js)"/u,
  POLICE = /url\(["']?(?<url>assets\/fonts\/jetbrains-mono[^"')]*\.woff2)["']?\)/u,
  // La construction pose une empreinte du contenu dans le nom des actifs. Le test lit donc
  // la référence dans la page servie : figer un nom le ferait échouer à chaque changement.
  referenced = async (request: APIRequestContext, pattern: RegExp) => {
    const page = await request.get("/"),
      html = await page.text(),
      url = html.match(pattern)?.groups?.url;

    expect(url, `the page references no asset that matches ${pattern}`).toBeDefined();

    return `/${url}`;
  };

// Alpine et la police sont figés dans src/. Un CDN remettrait la requête tierce
// que le portage existe précisément pour supprimer.
test("should serve Alpine from src/ and not from a CDN", async ({ request }) => {
  const response = await request.get(await referenced(request, ALPINE));

  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("text/javascript");
  expect(response.headers()["content-encoding"]).toBe("gzip");
});

test("should serve the font from src/", async ({ request }) => {
  const response = await request.get(await referenced(request, POLICE));

  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toBe("font/woff2");
});

// Woff2 est déjà compressé : le recompresser coûterait du temps pour rien.
test("should not recompress the font", async ({ request }) => {
  const response = await request.get(await referenced(request, POLICE), {
    headers: { "accept-encoding": "gzip" },
  });

  expect(response.status()).toBe(200);
  expect(response.headers()["content-encoding"]).toBeUndefined();
});

const SITE = "https://me.brezinben.dpdns.org/",
  PAGES = ["/", "/texte.html"],
  // Le blanc devant le nom d'attribut écarte les liaisons Alpine, « :href » et « :src ».
  // Une liaison ne porte pas une adresse mais l'expression qui la fabrique, et la suivre
  // faisait demander « `#i-${row.icon}` » au serveur.
  LIEN = /(?:^|\s)(?:href|src)="(?<url>[^"]+)"/gu,
  // Les métadonnées de partage donnent une adresse absolue. Sans ce relevé, l'image de
  // partage échapperait au test.
  META = /content="(?<url>https:\/\/portfolio\.brezinben\.dpdns\.org\/[^"]*)"/gu,
  CSS = /url\(["']?(?<url>[^"')]+)["']?\)/gu,
  EMPREINTE = /\.[\da-f]{8}\./u,
  // La page mêle ses propres adresses, celles de la mesure d'audience et ses ancres. Seules
  // les siennes doivent répondre ici.
  chemin = (found: RegExpMatchArray) => {
    const url = found.groups?.url ?? "",
      site = url.startsWith(SITE) ? url.slice(SITE.length - 1) : url;

    return site.startsWith("#") || site.startsWith("//") || site.includes(":") ? [] : [site];
  },
  declared = (html: string) => [
    ...new Set(
      [...html.matchAll(LIEN), ...html.matchAll(META), ...html.matchAll(CSS)].flatMap(chemin),
    ),
  ],
  missing = async (request: APIRequestContext, page: string) => {
    const served = await request.get(page),
      adresses = declared(await served.text());

    // Un relevé qui ne reconnaît plus rien rendrait ce test vert sans rien vérifier.
    expect(
      adresses.filter((url) => EMPREINTE.test(url)),
      `${page} declares no fingerprinted asset: the scan no longer recognizes the page`,
    ).not.toEqual([]);

    const responses = await Promise.all(
      adresses.map(async (url) => {
        const asset = await request.get(url);

        return { status: asset.status(), url };
      }),
    );

    return responses.filter((each) => each.status !== 200).map((each) => `${page} → ${each.url}`);
  };

// Une adresse qui pointe dans le vide ne casse rien de visible : la page se charge, et
// l'actif manque en silence. Ce test suit les adresses de la page construite plutôt qu'une
// liste de noms, qu'un renommage a déjà rendue fausse deux fois.
test("should serve every address the pages declare", async ({ request }) => {
  const absentes = await Promise.all(PAGES.map((page) => missing(request, page)));

  expect(absentes.flat()).toEqual([]);
});
