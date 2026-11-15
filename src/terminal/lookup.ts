// Une clé libre dans une table fermée. La table garde le type que l'inférence lui donne,
// et l'appelant reçoit undefined quand la clé n'y est pas.
//
// « Object.hasOwn » écarte les clés héritées du prototype. Aucun appelant d'ici n'en passe,
// mais la copie de l'interpréteur garde déjà ce contrôle : deux fonctions de même nom aux
// garanties différentes finiraient par se croiser.
export const lookup = <V>(table: Readonly<Record<string, V>>, key: string): V | undefined => {
  return Object.hasOwn(table, key) ? table[key] : undefined;
};
