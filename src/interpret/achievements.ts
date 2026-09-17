// Le catalogue des succès. Une donnée pure : le seam de l'interpréteur la couvre sans
// navigateur.
//
// Une clé est stable et indépendante du libellé. Renommer un titre ne re-verrouille
// personne. L'ordre du tableau est le rang affiché, et rien d'autre.

import { lookup } from "./lookup.ts";

export interface Achievement {
  icon: string;
  key: string;
  title: string;
  trigger: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    icon: "compass",
    key: "first-section",
    title: "je pars à la découverte",
    trigger: "première section ouverte",
  },
  { icon: "map", key: "all-sections", title: "visite guidée", trigger: "toutes les sections vues" },
  { icon: "page", key: "text-version", title: "lecture au clair", trigger: "la version texte" },
  { icon: "broken", key: "not-found", title: "hors des sentiers", trigger: "la page introuvable" },
  {
    icon: "palette",
    key: "all-themes",
    title: "les huit ambiances",
    trigger: "les huit thèmes essayés",
  },
  {
    icon: "prompt",
    key: "first-command",
    title: "première commande",
    trigger: "une commande tapée, pas cliquée",
  },
  { icon: "book", key: "help", title: "le manuel", trigger: "help" },
  { icon: "list", key: "ls", title: "inventaire", trigger: "ls" },
  { icon: "tab", key: "tab", title: "les deux premières lettres", trigger: "Tab complète" },
  { icon: "history", key: "history", title: "déjà vu", trigger: "↑ rappelle l'historique" },
  { icon: "broom", key: "clear", title: "table rase", trigger: "clear" },
  { icon: "power", key: "shutdown", title: "extinction des feux", trigger: "shutdown" },
  { icon: "cow", key: "cowsay", title: "la vache parle", trigger: "/cowsay" },
  { icon: "smile", key: "joke", title: "rira bien", trigger: "/joke" },
  { icon: "shield", key: "sudo", title: "non.", trigger: "/sudo" },
  { icon: "teapot", key: "coffee", title: "je suis une théière", trigger: "/coffee" },
  { icon: "esc", key: "vim", title: ":q! ne marche pas ici", trigger: "/vim" },
  { icon: "matrix", key: "matrix", title: "réveille-toi", trigger: "/matrix" },
  { icon: "sign", key: "name", title: "mon nom dans un terminal", trigger: "/benjamin" },
  {
    icon: "heart",
    key: "expression",
    title: "elle apprécie modérément",
    trigger: "/slime expression · la caresser",
  },
  {
    icon: "dumbbell",
    key: "activities",
    title: "six occupations",
    trigger: "les six activités du slime",
  },
  { icon: "evolve", key: "evolve", title: "métamorphose", trigger: "/slime evolve" },
  { icon: "boom", key: "kill", title: "mauvaise idée", trigger: "/slime kill" },
  { icon: "zzz", key: "sleep", title: "bonne nuit", trigger: "sleep" },
  { icon: "envelope", key: "email", title: "adresse en poche", trigger: "email" },
  { icon: "bulb", key: "propose", title: "une idée en l'air", trigger: "/propose" },
  { icon: "share", key: "share", title: "bonne parole", trigger: "share" },
];

// Le dispatcher rend toujours « track("commande", { cmd }) », alias déjà résolus. La
// coquille y lit le nom canonique et demande ici ce qu'il débloque.
const BY_COMMAND = {
  benjamin: "name",
  clear: "clear",
  coffee: "coffee",
  cowsay: "cowsay",
  email: "email",
  help: "help",
  joke: "joke",
  ls: "ls",
  matrix: "matrix",
  propose: "propose",
  share: "share",
  shutdown: "shutdown",
  sleep: "sleep",
  sudo: "sudo",
  vim: "vim",
};

export const unlockedBy = (command: string) => lookup(BY_COMMAND, command);

// Les marques de progression partagent le tableau des clés acquises. Le préfixe les en
// distingue, et il permet de compter sans garder un second stockage.
export const ACTIVITY_MARK = "act:";
export const SECTION_MARK = "sec:";
export const THEME_MARK = "theme:";
// Combien de succès avaient été regardés à la dernière ouverture de la liste. Acquis et
// vu sont deux comptes distincts : les confondre supprime la relance du badge.
export const SEEN_MARK = "seen:";

const MARKS = [ACTIVITY_MARK, SECTION_MARK, SEEN_MARK, THEME_MARK];

// Combien de succès sont acquis. Les marques de progression partagent le tableau, donc le
// compte ne peut pas être sa longueur.
export const wonCount = (marks: string[]) =>
  ACHIEVEMENTS.filter((entry) => marks.includes(entry.key)).length;

// Combien avaient été regardés à la dernière ouverture. Une marque absente vaut zéro.
export const seenCount = (marks: string[]) =>
  Number(marks.find((mark) => mark.startsWith(SEEN_MARK))?.slice(SEEN_MARK.length) ?? 0);

// Le stockage est une entrée extérieure, et le catalogue bouge. Une clé retirée disparaît
// sans laisser d'orphelin, et une valeur qui n'est ni une clé ni une marque ne rentre pas.
export const keepKnown = (saved: string[]) =>
  saved.filter(
    (entry) =>
      ACHIEVEMENTS.some((found) => found.key === entry) ||
      MARKS.some((mark) => entry.startsWith(mark) && entry.length > mark.length),
  );
