// La fenêtre de propositions : quel rang de la liste s'affiche en premier.
//
// Pure, donc testable sans navigateur. La coquille ne garde que l'appel et l'etat.

// La fenêtre ne bouge que lorsque la sélection en sort, et d'un cran seulement : la liste
// défile sous un choix qui reste à sa place. Le bouclage la ramène d'un bond, sinon la
// première proposition s'afficherait seule en bas d'une fenêtre vide.
export const windowTop = (top: number, at: number, size: number) => {
  return Math.min(Math.max(top, at - size + 1), at);
};
