// La fenetre de propositions : quel rang de la liste s'affiche en premier.
//
// Pure, donc testable sans navigateur. La coquille ne garde que l'appel et l'etat.

// La fenetre ne bouge que lorsque la selection en sort, et d'un cran seulement : la liste
// defile sous un choix qui reste a sa place. Le bouclage la ramene d'un bond, sinon la
// premiere proposition s'afficherait seule en bas d'une fenetre vide.
export const windowTop = (top: number, at: number, size: number) => {
  return Math.min(Math.max(top, at - size + 1), at);
};
