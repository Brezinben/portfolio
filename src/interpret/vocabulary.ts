// Le vocabulaire : les noms que le dispatcher accepte, ceux que la completion propose, et
// l'aide qui les annonce. Aucun import : ce module est une feuille du graphe.
//
// « SLASH_ONLY » vit ici et non avec les easter eggs. Il porte « slime », « joke »,
// « propose » et « matrix », qui n'en sont pas : ce n'est pas le catalogue des eggs, c'est
// la liste des noms qui exigent le slash.

// La recherche porte deux noms, jamais les deux a la fois. Sans modele elle repond par
// recouvrement de mots ; avec un modele, c'est lui qui choisit le passage, et l'etincelle
// le dit. Une commande « ai » separee obligeait a demander si le modele etait la : le nom
// de la commande le montre maintenant.
export const ASK = "ask";
export const ASK_MODEL = "ask✨";
// L'etincelle occupe deux colonnes dans une police a chasse fixe. Sans ce comptage, la
// ligne d'aide qui la porte decalerait son tiret d'une colonne.
const displayWidth = (text: string) => text.length + (text.includes("✨") ? 1 : 0);
const askLine = (model: boolean) => {
  const shown = `${model ? ASK_MODEL : ASK} <question>`;

  return `${shown}${" ".repeat(Math.max(1, 34 - displayWidth(shown)))}— chercher dans le site`;
};

export const helpLines = (model: boolean) => [
  "ls · cd <section> · bd <section>  — naviguer",
  askLine(model),
  "theme <nom> · clear · options     — affichage",
  "cv · email · send-mail            — CV et contact",
  "share <cible>                     — LinkedIn, GitHub, lien",
  "/propose [-y] <idée>              — suggérer un ajout",
  "/joke · /cowsay                   — le reste",
  "/slime · /matrix · shutdown       — à vos risques",
];
export const KEYBOARD =
  "Clavier : / cible la saisie · j / k changent de section · Tab complète · ↑ ↓ rappellent l'historique.";

// Les easter eggs ne repondent qu'au prefixe slash, pour ne pas melanger une vraie
// commande et un raccourci du portfolio. L'ordre d'ecriture ne decide de rien : le
// vocabulaire se trie, et la fenetre de la completion glisse au-dela de dix propositions.
export const SLASH_ONLY = new Set([
  "slime",
  "joke",
  "cowsay",
  "propose",
  "benjamin",
  "matrix",
  "sudo",
  "vim",
  "coffee",
  "brezinben",
  "radio",
]);

export const ALIASES = {
  "?": "help",
  aide: "help",
  [ASK_MODEL]: ASK,
  brezinben: "benjamin",
  cat: "slime",
  cls: "clear",
  copy: "email",
  dir: "ls",
  emacs: "vim",
  exit: "shutdown",
  feedback: "propose",
  idee: "propose",
  mascotte: "slime",
  nano: "vim",
  partager: "share",
  poweroff: "shutdown",
  restart: "reboot",
  resume: "cv",
  sendmail: "send-mail",
  set: "options",
  write: "send-mail",
};

// Trois verbes naviguent vers leur argument, et eux seuls. Sans ce filtre, n'importe quel
// mot suivi d'un identifiant de section y menait : « share contact » partait naviguer au
// lieu de partager, et « /sudo stack » n'affichait jamais son texte.
export const NAVIGATORS = new Set(["bd", "cd", "open"]);
// Le vocabulaire ne propose que des commandes vivantes, et les easter eggs avec leur
// slash : sinon l'autocompletion propose ce que le dispatcher refuse.
const PLAIN = [
  "?",
  "aide",
  "bd",
  "cd",
  "clear",
  "cls",
  "cv",
  "dir",
  "email",
  "help",
  "ls",
  "open",
  "options",
  "reboot",
  "resume",
  "send-mail",
  "share",
  "shutdown",
  "sleep",
  "theme",
];
const VERBS = [...PLAIN, ...[...SLASH_ONLY].map((egg) => `/${egg}`)];

// Les deux noms de la recherche ne s'offrent jamais ensemble : le vocabulaire ne porte
// que celui qui correspond a l'etat du modele. Le tri decide de ce que la fenetre montre
// en premier, la ou la liste depasse desormais dix noms.
export const vocabulary = (model: boolean) => [model ? ASK_MODEL : ASK, ...VERBS].toSorted();
