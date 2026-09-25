import type { Page } from "@playwright/test";

// Cet espion remplace window.open avant le chargement de la page. Le test lit les adresses
// demandées, et aucun onglet ne s'ouvre. La liste vit sur la racine du document : le test la
// relit comme un attribut, sans assertion de type.
export const spyOpen = async (page: Page) => {
    await page.addInitScript(() => {
      globalThis.open = (url) => {
        const root = document.documentElement;

        root.dataset.opened = [root.dataset.opened, String(url)].filter(Boolean).join("\n");

        // Le contrat de window.open rend « null » quand rien ne s'ouvre.
        // oxlint-disable-next-line unicorn/no-null
        return null;
      };
    });
  },
  opened = async (page: Page) => {
    const list = await page.locator("html").getAttribute("data-opened");

    return (list ?? "").split("\n").filter(Boolean);
  };
