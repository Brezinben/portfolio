// La page d'erreur est servie sur n'importe quelle adresse inconnue. Elle ne charge ni le
// contenu ni le point d'entrée : ce fichier est tout ce qu'elle exécute.
//
// Il est bloquant et en tête, parce que le thème doit être posé avant le premier rendu. Un
// script différé laisserait voir l'ambre nuit à qui a choisi l'ambre jour. Le reste attend
// le DOM.

import { OPTS_KEY, THEMES } from "./terminal/settings.ts";
import { addMark } from "./terminal/achievements/store.ts";

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
];
const CHEERED = "ça va mieux";
// Au-delà, le chemin casse la ligne sur un téléphone. La dernière place va au signe de
// coupe, qui dit que ce n'est pas l'adresse entière.
const PATH_MAX = 52;
const CHEER_MS = 1400;
// Le chemin de la racine ne mène jamais ici : l'afficher dirait que « / » est introuvable.
const UNKNOWN_PATH = "/route-inconnue";
const root = document.documentElement;
const pick = () => BUBBLES[Math.floor(Math.random() * BUBBLES.length)] ?? "";
const systemTheme = () => (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");

const saved = (): SavedOpts => {
  try {
    // SAFETY: la forme du stockage n'est pas garantie. L'affirmation ne promet rien :
    // SavedOpts ne déclare que des « unknown », et chaque clé est vérifiée ensuite.
    return JSON.parse(localStorage.getItem(OPTS_KEY) ?? "{}") as SavedOpts;
  } catch {
    // Un stockage illisible ou refusé ne doit pas empêcher la page de se dessiner.
    return {};
  }
};

// Un chemin mal encodé arrive ici plus souvent qu'ailleurs : c'est une adresse que
// personne n'a écrite à la main. Il s'affiche alors tel quel.
const decode = (raw: string) => {
  try {
    return decodeURI(raw);
  } catch {
    return raw;
  }
};

const shorten = (path: string) =>
  path.length > PATH_MAX ? `${path.slice(0, PATH_MAX - 1)}…` : path;

// Sans mouvement, la piste de la mascotte est retirée. Un élément non rendu ne prend pas
// le focus : l'inclure figerait les flèches sur lui, silencieusement.
const reachable = () =>
  [...document.querySelectorAll<HTMLElement>("[data-slime], [data-ctl]")].filter(
    (node) => node.offsetParent !== null,
  );

// Une seule sortie est mise en avant, et elle suit le pointeur comme le clavier. C'est la
// sélection d'une liste, pas une décoration sur la première ligne.
const highlight = (exits: HTMLElement[], chosen: HTMLElement) => {
  for (const exit of exits) {
    exit.toggleAttribute("data-primary", exit === chosen);
  }
};

const ready = () => {
  const path = document.querySelector("[data-path]");
  const bubble = document.querySelector("[data-bubble]");
  const mascot = document.querySelector<HTMLElement>("[data-slime]");
  const exits = [...document.querySelectorAll<HTMLElement>('[data-ctl="nav"]')];

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

    const controls = reachable();
    const active = document.activeElement;
    const step = event.key === "ArrowDown" ? 1 : -1;
    const at = active instanceof HTMLElement ? controls.indexOf(active) : -1;
    // Sans focus, la course part d'avant le premier ou d'après le dernier : la première
    // pression prend le contrôle le plus proche du sens demandé.
    const from = step > 0 ? -1 : controls.length;
    const next = Math.max(0, Math.min(controls.length - 1, (at === -1 ? from : at) + step));
    const target = controls[next];

    // Rien à atteindre : les flèches rendent la main plutôt que d'avaler la frappe.
    if (!target) {
      return;
    }

    event.preventDefault();
    target.focus();
  });
};

const opts = saved();

// Un thème inconnu vaut un thème absent : la préférence du système tranche, comme sur la
// version terminal. Sans ce filtre, « data-theme » ne correspondrait à aucun bloc et la
// page perdrait ses couleurs.
root.dataset.theme = THEMES.some((entry) => entry.id === opts.theme)
  ? String(opts.theme)
  : systemTheme();

if (opts.anim === false) {
  root.dataset.anim = "false";
}

// Arriver ici est un succès. La page ne sait ni les compter ni les annoncer : elle pose la
// clé, et la version terminal la trouve au chargement suivant.
addMark("not-found");

document.addEventListener("DOMContentLoaded", ready);
