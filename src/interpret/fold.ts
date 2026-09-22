// Le pliage d'un texte pour la comparaison : sans accents, sans casse. « Élève », « eleve »
// et « ELEVE » doivent se trouver l'un l'autre, ce qui est indispensable sur un corpus
// francophone.

export const fold = (text: string): string => {
  return text
    .normalize("NFD")
    .replaceAll(/\p{Diacritic}/gu, "")
    .toLowerCase();
};
