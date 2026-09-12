// La page d'erreur est servie sur n'importe quelle adresse inconnue. Elle ne charge ni le
// contenu ni le point d'entrée : ce fichier est tout ce qu'elle exécute.
//
// Il est bloquant et en tête, parce que le thème doit être posé avant le premier rendu. Un
// script différé laisserait voir l'ambre nuit à qui a choisi l'ambre jour. Le reste attend
// le DOM.

import { OPTS_KEY, THEMES } from "./terminal/settings.ts";

// Ce que le stockage rend. Rien n'y est garanti : c'est une entrée extérieure, écrite par
// une autre page.
interface SavedOpts {
  anim?: unknown;
  theme?: unknown;
}

type Delay = ReturnType<typeof setTimeout>;

const BUBBLES = [
    "le slime cherche encore",
    "il fouille, sans résultat",
    "cette route n'a jamais existé",
  ],
  CHEERED = "ça va mieux",
  // Au-delà, le chemin casse la ligne sur un téléphone. La dernière place va au signe de
  // coupe, qui dit que ce n'est pas l'adresse entière.
  PATH_MAX = 52,
  CHEER_MS = 1400,
  // Le chemin de la racine ne mène jamais ici : l'afficher dirait que « / » est introuvable.
  UNKNOWN_PATH = "/route-inconnue",
  root = document.documentElement,
  pick = () => BUBBLES[Math.floor(Math.random() * BUBBLES.length)] ?? "",
  systemTheme = () => (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"),
  saved = () => {
    try {
      // SAFETY: la forme du stockage n'est pas garantie. L'affirmation ne promet rien :
      // SavedOpts ne déclare que des « unknown », et chaque clé est vérifiée ensuite.
      return JSON.parse(localStorage.getItem(OPTS_KEY) ?? "{}") as SavedOpts;
    } catch {
      // Un stockage illisible ou refusé ne doit pas empêcher la page de se dessiner.
      return {};
    }
  },
  // Un chemin mal encodé arrive ici plus souvent qu'ailleurs : c'est une adresse que
  // personne n'a écrite à la main. Il s'affiche alors tel quel.
  decode = (raw: string) => {
    try {
      return decodeURI(raw);
    } catch {
      return raw;
    }
  },
  shorten = (path: string) => (path.length > PATH_MAX ? `${path.slice(0, PATH_MAX - 1)}…` : path),
  // Sans mouvement, la piste de la mascotte est retirée. Un élément non rendu ne prend pas
  // le focus : l'inclure figerait les flèches sur lui, silencieusement.
  reachable = () =>
    [...document.querySelectorAll<HTMLElement>("[data-slime], [data-ctl]")].filter(
      (node) => node.offsetParent !== null,
    ),
  // Une seule sortie est mise en avant, et elle suit le pointeur comme le clavier. C'est la
  // sélection d'une liste, pas une décoration sur la première ligne.
  highlight = (exits: HTMLElement[], chosen: HTMLElement) => {
    for (const exit of exits) {
      exit.toggleAttribute("data-primary", exit === chosen);
    }
  },
  ready = () => {
    const path = document.querySelector("[data-path]"),
      bubble = document.querySelector("[data-bubble]"),
      mascot = document.querySelector<HTMLElement>("[data-slime]"),
      exits = [...document.querySelectorAll<HTMLElement>('[data-ctl="nav"]')];

    // Le balisage est figé. S'il change sans que ce fichier suive, la page reste lisible et
    // ses liens marchent : mieux vaut cela qu'une erreur sur une page d'erreur.
    if (!path || !bubble || !mascot) {
      return;
    }

    const asked = decode(location.pathname);

    path.textContent = shorten(asked === "/" ? UNKNOWN_PATH : asked);
    bubble.textContent = pick();

    let back: Delay | undefined = undefined;

    mascot.addEventListener("click", () => {
      clearTimeout(back);
      mascot.classList.replace("slime--alert", "slime--happy");
      bubble.textContent = CHEERED;
      back = setTimeout(() => {
        mascot.classList.replace("slime--happy", "slime--alert");
        bubble.textContent = pick();
      }, CHEER_MS);
    });

    for (const exit of exits) {
      exit.addEventListener("pointerenter", () => highlight(exits, exit));
      exit.addEventListener("focus", () => highlight(exits, exit));
    }

    // Les flèches parcourent les contrôles du volet, comme moveInPane sur la version
    // terminal : elles s'arrêtent aux deux bouts plutôt que de boucler.
    document.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
        return;
      }

      const controls = reachable(),
        active = document.activeElement,
        step = event.key === "ArrowDown" ? 1 : -1,
        at = active instanceof HTMLElement ? controls.indexOf(active) : -1,
        // Sans focus, la course part d'avant le premier ou d'après le dernier : la première
        // pression prend le contrôle le plus proche du sens demandé.
        from = step > 0 ? -1 : controls.length,
        next = Math.max(0, Math.min(controls.length - 1, (at === -1 ? from : at) + step)),
        target = controls[next];

      // Rien à atteindre : les flèches rendent la main plutôt que d'avaler la frappe.
      if (!target) {
        return;
      }

      event.preventDefault();
      target.focus();
    });
  },
  opts = saved();

// Un thème inconnu vaut un thème absent : la préférence du système tranche, comme sur la
// version terminal. Sans ce filtre, « data-theme » ne correspondrait à aucun bloc et la
// page perdrait ses couleurs.
root.dataset.theme = THEMES.some((entry) => entry.id === opts.theme)
  ? String(opts.theme)
  : systemTheme();

if (opts.anim === false) {
  root.dataset.anim = "false";
}

document.addEventListener("DOMContentLoaded", ready);
