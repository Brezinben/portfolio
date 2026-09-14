// Le contrat coquille vers interpreteur : ce que la coquille sait et que l'interpreteur ne
// peut pas deviner. Ce fichier ne porte que des interfaces : il n'emet aucun code, et aucun
// de ses imports n'est une arete d'execution.

import type { Share } from "./share.ts";

// Ce que la coquille passe a l'interpreteur : la section ouverte, le contenu charge, et
// l'attente d'une reponse oui ou non.
export interface Entry {
  // Le resume que la recherche interroge. Il est ecrit a la main dans content.json : c'est
  // la seule prose du site qui repond a une question au lieu de decrire un ecran.
  ask?: string;
  cmd?: string;
  id: string;
  label: string;
}

// Ce que la completion a besoin de connaitre : les noms qu'elle peut proposer. Elle ne
// lit que les identifiants, pas les libelles.
export interface CompletionContext {
  // Un modele local installe et disponible. La coquille l'apprend d'un appel asynchrone au
  // demarrage, que l'interpreteur ne peut pas faire : il est pur et synchrone.
  model: boolean;
  details: { id: string }[];
  sections: { id: string }[];
  shareTargets: string[];
  themes: string[];
}

// Ce que la coquille passe a l'interpreteur. Tout est requis : la coquille ne l'appelle
// qu'une fois le contenu charge, et un champ manquant serait un defaut de chargement,
// pas un cas a traiter ici.
export interface Context extends CompletionContext {
  columns: number;
  // La mascotte est absente pendant son explosion et son voyage en train ; sans cette
  // information, l'interpreteur annoncerait des gestes que la coquille ne joue pas.
  // « away » : explosee ou en train. « busy » : change de forme. « asleep » : reseau coupe.
  mascot: "asleep" | "away" | "busy" | "here";
  details: Entry[];
  sections: Entry[];
  current: { cmd?: string; id?: string; label?: string };
  feedback: Record<string, string>;
  jokeIndex: number;
  jokes: string[];
  pending?: string | undefined;
  share: Share;
}
