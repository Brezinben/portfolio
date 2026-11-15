// Le contrat coquille vers interpréteur : ce que la coquille sait et que l'interpréteur ne
// peut pas deviner. Ce fichier ne porte que des interfaces : il n'émet aucun code, et aucun
// de ses imports n'est une arête d'exécution.

import type { Share } from "./share.ts";

// Ce que la coquille passe à l'interpréteur : la section ouverte, le contenu chargé, et
// l'attente d'une réponse oui ou non.
export interface Entry {
  // Le résumé que la recherche interroge. Il est écrit à la main dans content.json : c'est
  // la seule prose du site qui répond à une question au lieu de décrire un écran.
  ask?: string;
  cmd?: string;
  id: string;
  label: string;
}

// Ce que la complétion a besoin de connaître : les noms qu'elle peut proposer. Elle ne
// lit que les identifiants, pas les libelles.
export interface CompletionContext {
  // Un modèle local installé et disponible. La coquille l'apprend d'un appel asynchrone au
  // démarrage, que l'interpréteur ne peut pas faire : il est pur et synchrone.
  model: boolean;
  details: { id: string }[];
  sections: { id: string }[];
  shareTargets: string[];
  themes: string[];
}

// Ce que la coquille passe à l'interpréteur. Tout est requis : la coquille ne l'appelle
// qu'une fois le contenu chargé, et un champ manquant serait un défaut de chargement,
// pas un cas à traiter ici.
export interface Context extends CompletionContext {
  columns: number;
  // La mascotte est absente pendant son explosion et son voyage en train ; sans cette
  // information, l'interpréteur annoncerait des gestes que la coquille ne joue pas.
  // « away » : explosée ou en train. « busy » : change de forme. « asleep » : réseau coupé.
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
