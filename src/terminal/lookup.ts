// Une cle libre dans une table fermee. La table garde le type que l'inference lui donne,
// et l'appelant recoit undefined quand la cle n'y est pas.
//
// « Object.hasOwn » ecarte les cles heritees du prototype. Aucun appelant d'ici n'en passe,
// mais la copie de l'interpreteur garde deja ce controle : deux fonctions de meme nom aux
// garanties differentes finiraient par se croiser.
export const lookup = <V>(table: Readonly<Record<string, V>>, key: string): V | undefined =>
  Object.hasOwn(table, key) ? table[key] : undefined;
