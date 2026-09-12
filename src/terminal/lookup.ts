// Une cle libre dans une table fermee : la table garde son type, l'appelant recoit
// undefined quand la cle n'y est pas.
export const lookup = <V>(table: Readonly<Record<string, V>>, key: string): V | undefined =>
  table[key];
