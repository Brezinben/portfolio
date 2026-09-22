// Un corpus francophone se cherche sans accents et sans casse.

export const fold = (text: string): string => {
  return text
    .normalize("NFD")
    .replaceAll(/\p{Diacritic}/gu, "")
    .toLowerCase();
};
