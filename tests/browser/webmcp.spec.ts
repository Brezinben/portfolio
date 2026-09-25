import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

type ToolInput = Record<string, boolean | string>;

// Un faux « document.modelContext » garde les outils que la page déclare. Le test les
// appelle comme le ferait un agent, par un événement « agent-call » : la réponse et les noms
// se relisent sur la racine du document, sans global à typer. La racine se lit au moment de
// l'appel : le script d'amorce tourne avant qu'elle existe.
const withAgent = async (page: Page) => {
    await page.addInitScript(() => {
      const registered = new Map<string, (input: ToolInput) => string>();

      Object.defineProperty(document, "modelContext", {
        value: {
          registerTool: (tool: { execute: (input: ToolInput) => string; name: string }) => {
            registered.set(tool.name, tool.execute);
            document.documentElement.dataset.agentTools = [...registered.keys()]
              .toSorted()
              .join(" ");

            return Promise.resolve();
          },
        },
      });
      document.addEventListener("agent-call", (event) => {
        if (event instanceof CustomEvent) {
          const { input, name } = event.detail;

          document.documentElement.dataset.agentAnswer = registered.get(name)?.(input) ?? "";
        }
      });
    });
    await page.goto("/");
    await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });
    await expect(page.locator("html")).toHaveAttribute("data-agent-tools", /propose_idea/u);
  },
  call = async (page: Page, name: string, input: ToolInput) => {
    await page.evaluate(
      ([wanted, given]) => {
        document.dispatchEvent(
          new CustomEvent("agent-call", { detail: { input: given, name: wanted } }),
        );
      },
      [name, input] as const,
    );

    return page.locator("html").getAttribute("data-agent-answer");
  };

test("should declare one tool per intent once the content is loaded", async ({ page }) => {
  await withAgent(page);

  await expect(page.locator("html")).toHaveAttribute(
    "data-agent-tools",
    "get_contact open_section propose_idea read_tech_note search_portfolio set_display_option set_theme share_portfolio",
  );
});

// Une action passe par la ligne de commande : le visiteur voit ce que l'agent a fait.
test("should open a section the way the visitor would", async ({ page }) => {
  await withAgent(page);

  const answer = await call(page, "open_section", { section: "stack" });

  await expect(page.locator('[data-ctl="nav"][aria-current="true"]')).toContainText("stack");
  await expect(page.locator("[data-journal]")).toContainText("cd stack");
  expect(answer).toMatch(/^stack : ./u);
});

test("should change the theme", async ({ page }) => {
  await withAgent(page);
  await call(page, "set_theme", { theme: "noctis" });

  await expect(page.locator(".tm")).toHaveAttribute("data-theme", "noctis");
});

test("should answer a search without touching the page", async ({ page }) => {
  await withAgent(page);

  const answer = await call(page, "search_portfolio", { query: "stack" });

  expect(answer).toContain("bd stack");
  await expect(page.locator("[data-journal]")).not.toContainText("stack");
});

// Rien ne part avant le « oui » du visiteur, même quand un agent pose l'idée.
test("should leave the consent of an idea to the visitor", async ({ page }) => {
  const counted: string[] = [];

  await page.route("**/count.js", (route) => {
    return route.abort();
  });
  await page.route("**/count?**", (route) => {
    counted.push(route.request().url());

    return route.fulfill({ status: 200 });
  });
  await withAgent(page);

  const answer = await call(page, "propose_idea", { idea: "une section podcast" });

  expect(answer).toContain("confirmation du visiteur");
  await expect(page.getByLabel("Commande")).toHaveValue("oui");
  expect(counted).toEqual([]);
});

// Un navigateur sans WebMCP ne télécharge pas les outils.
test("should not fetch the tools without WebMCP", async ({ page }) => {
  const fetched: string[] = [];

  page.on("request", (request) => {
    if (request.url().includes("webmcp")) {
      fetched.push(request.url());
    }
  });
  await page.goto("/");
  await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });

  expect(fetched).toEqual([]);
});
