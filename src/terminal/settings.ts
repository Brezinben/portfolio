// Les valeurs figees du terminal : durees, seuils, tables de reglage. Arretees apres
// iteration dans le canvas, elles ne doivent pas redevenir des reglages.
// Voir design/DECISIONS.md, section 23.

export const BOOT_MS = 2000;
export const FADE_MS = 620;
export const PANES = ["nav", "main", "out"];
export const VERTICAL = new Set(["ArrowDown", "ArrowUp"]);
export const OPTS_KEY = "bd-term-opts";
export const ACHIEVEMENTS_KEY = "bd-term-achievements";
// L'alerte de déblocage tient dix secondes. Le rythme du badge, lui, vit dans la feuille :
// aucun code ne le lit, et le déclarer ici en ferait une seconde vérité.
export const ALERT_MS = 10_000;
// La grille qui matérialise l'alerte, case par case. Vingt colonnes sur six rangs : le
// bandeau se construit au lieu d'apparaître.
export const ALERT_COLUMNS = 20;
export const ALERT_ROWS = 6;
// Les retards de la grille, mesurés à l'œil. La sortie s'étale davantage que l'entrée : à
// 470 ms, personne ne la voyait. Le grain empêche le front d'être une ligne droite, sans
// quoi l'effet redevient un balayage.
export const ALERT_IN_MS = 300;
export const ALERT_IN_GRAIN_MS = 170;
export const ALERT_OUT_MS = 460;
export const ALERT_OUT_GRAIN_MS = 190;
// L'enveloppe de la sortie, du premier retard à la dernière case éteinte. La coquille
// attend ce total avant de rendre la place ; la feuille porte la durée d'une case.
export const ALERT_OUT_TOTAL_MS = 810;
export const THEMES = [
  { id: "dark", label: "ambra" },
  { id: "light", label: "solis" },
  { id: "noctis", label: "noctis" },
  { id: "azureus", label: "azureus" },
  { id: "uva", label: "uva" },
  { id: "bordo", label: "bordo" },
  { id: "lux", label: "lux" },
  { id: "hibernus", label: "hibernus" },
];
// Les valeurs d'etat restent en anglais : c'est la langue d'un terminal.
// Les réglages qui se basculent. Nommer l'union permet d'indexer l'etat par la
// cle sans effacer son type.
export type ToggleKey = "anim" | "out" | "shortcuts";

export const TOGGLES: { key: ToggleKey; label: string; off: string; on: string }[] = [
  { key: "anim", label: "animations", off: "off", on: "on" },
  { key: "out", label: "output pane", off: "off", on: "on" },
  // Une commande vocale ou une frappe accidentelle déclenche aussi un raccourci. La bascule
  // coupe tous les raccourcis (WCAG 2.1.4).
  { key: "shortcuts", label: "shortcuts", off: "off", on: "on" },
];
export const TYPE_CPS = 52;
export const EXEC_MS = 20;
// La fenetre de contexte se compte en caracteres imprimes, pas en commandes : une
// section longue coute plus qu'un « ok ». Budget et plancher figes apres essai.
export const CTX_BUDGET = 2600;
export const CTX_FLOOR = 60;
export const CTX_CELLS = 10;
// Compacter prend du temps, et ca doit se voir. La barre se remplit d'une case toutes
// les 520 ms pendant que sa tete tourne a chaque battement : dix cases, cinq secondes.
export const COMPACT_MS = 5200;
export const COMPACT_TICK_MS = 130;
// Le demarrage dessine sa barre sur vingt-quatre cases, comme le canvas.
export const BOOT_CELLS = 24;
// Ce que la recherche globale montre, tous groupes confondus. Au-dela, la liste demande un
// defilement, et la selection quitte la vue au lieu de se lire d'un coup.
export const GLOBAL_LIMIT = 7;
// Le journal ne prend jamais la place du resultat : celui-ci garde ce plancher.
export const RESULT_MIN_PX = 120;
export const PANE_GAP_PX = 10;
// Largeur approximative d'un caractere de JetBrains Mono a 14 px.
export const CHAR_PX = 8.4;
// Le contenu est servi a cote de la page. Le depot est prive : la copie distante
// rendait 404 et ne servait plus qu'a retarder le demarrage.
export const CONTENT_URL = "content.json";
// La premiere question paie la mise en route du modele, qui tient rarement en cinq
// secondes. L'attente se voit a l'ecran, donc mieux vaut la laisser courir que rendre
// une reponse par defaut alors que le modele allait repondre.
export const ASK_MS = 15_000;
export const EMPTY = {
  cmd: "",
  id: "",
  lines: [],
  out: { lines: [], title: "" },
  suggest: "",
  view: "pairs",
};
