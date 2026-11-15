// Une clé libre dans une table fermée. La table garde le type que l'inférence lui donne,
// et l'appelant reçoit undefined quand la clé n'y est pas.
export const lookup = <V>(table: Readonly<Record<string, V>>, key: string): V | undefined => {
  return Object.hasOwn(table, key) ? table[key] : undefined;
};
