// Une cle libre dans une table fermee. La table garde le type que l'inference lui donne,
// et l'appelant recoit undefined quand la cle n'y est pas.
export const lookup = <V>(table: Readonly<Record<string, V>>, key: string): V | undefined => {
  return Object.hasOwn(table, key) ? table[key] : undefined;
};
