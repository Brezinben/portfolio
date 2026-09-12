// Les valeurs figees de la mascotte. Durees et seuils arretes apres iteration : ils ne
// doivent pas redevenir des reglages.

// Une case affichee fait 64 px, soit la hauteur de la piste.
export const SPRITE = 64;
// Trente-cinq feuilles de sprites remplacent le dessin en ombres portees. Les durees et
// les images vivent dans la feuille de style : le script ne choisit que l'etat.
// Neuf etats de vie, six expressions de commande, six activites, onze de manipulation,
// trois transitions de forme.
export const MASCOT_STATES = new Set([
  "evolveCube",
  "evolvePingouin",
  "devolve",
  "idle",
  "wink",
  "jump",
  "type",
  "load",
  "sleep",
  "morph",
  "boom",
  "reform",
  "alert",
  "happy",
  "laugh",
  "sad",
  "scared",
  "drop",
  "goal",
  "bike",
  "coffee",
  "lift",
  "juggle",
  "train",
  "grab",
  "dragLeft",
  "dragRight",
  "splatLeft",
  "splatRight",
  "splatFloor",
  "splatCeiling",
  "splatCeilingLeft",
  "splatCeilingRight",
  "splatFloorLeft",
  "splatFloorRight",
]);
export const MASCOT_REST = "idle";
// La chaine des formes. Chaque appel monte d'un cran, le troisieme referme le cycle. Une
// transition se joue depuis la feuille qui la porte : « evolveCube » vit dans celle du
// cube, « devolve » dans celle du pingouin. D'ou « sheet », qui n'est pas toujours
// « next ».
export const CHAIN = {
  cube: { next: "pingouin", sheet: "pingouin", state: "evolvePingouin" },
  pingouin: { next: "slime", sheet: "pingouin", state: "devolve" },
  slime: { next: "cube", sheet: "cube", state: "evolveCube" },
};
export const TRANSITIONS = new Set(["devolve", "evolveCube", "evolvePingouin"]);
// Sous ce pas la mascotte garderait sa prise plutot que de trembler entre deux feuilles.
export const DRAG_STEP = 2;
// Le plaquage se declenche quand le curseur sort de la piste. Or la piste a la hauteur du
// sprite : le curseur, pris quelque part dans ces 64 px, en sortirait par le haut ou par
// le bas en une trentaine de pixels. Un simple tremblement pendant un glisser horizontal
// ferait clignoter le sol et le plafond a la place des feuilles de deplacement. Cette
// marge n'existe que sur la verticale : en largeur, la piste est trop longue pour qu'on
// en sorte par accident.
export const SPLAT_MARGIN = 24;
// Au cinquieme clic le slime explose. Il reprend forme entre cinq et dix secondes plus
// tard : le hasard evite que l'attente devienne une horloge.
// Combien de temps un etat de passage tient avant de rendre le repos.
//
// Pour une passe unique, c'est la duree de sa feuille : le minuteur n'est qu'un filet
// derriere animationend, qu'une page en arriere-plan peut avaler.
//
// Pour « laugh », « sad » et « scared », qui bouclent, le minuteur est la SEULE sortie :
// une animation infinie n'emet jamais animationend. Deux a trois cycles, puis le repos.
// Retirer une de ces trois lignes laisse la mascotte tourner sans fin.
//
// « boom » n'y figure pas : l'explosion tient jusqu'a ce que le minuteur de reapparition
// la releve.
export const HOLD_MS = {
  alert: 960,
  bike: 2880,
  coffee: 1200,
  devolve: 1440,
  drop: 1440,
  evolveCube: 2400,
  evolvePingouin: 2400,
  goal: 1440,
  happy: 1200,
  juggle: 2880,
  jump: 1280,
  laugh: 4320,
  lift: 1440,
  morph: 2400,
  reform: 1600,
  sad: 5760,
  scared: 3000,
  train: 1440,
  wink: 1680,
};
// Le quai reste vide le temps qu'on remarque le depart, puis « drop » la ramene.
export const AWAY_MS = 3000;
export const BOOM_AT = 5;
export const REFORM_MIN_MS = 5000;
export const REFORM_SPREAD_MS = 5000;
// La frappe rend la main au repos peu apres la derniere touche. Chaque touche relance le
// compte a rebours : 400 ms coupaient l'animation au milieu d'une phrase, et la personne
// qui tape regarde ses mots, pas la mascotte. La veille attend dix secondes sans geste.
// Au repos, une chance sur vingt-cinq toutes les cinq secondes.
export const TYPE_REST_MS = 1400;
// La modale retient le regard, et une passe de mue dure deux secondes et demie. La mue
// rejoue donc tant que la modale est ouverte, puis court encore ce sursis apres.
export const MORPH_HOLD_MS = 600;
export const SLEEP_MS = 10_000;
export const TWITCH_MS = 5000;
export const TWITCH_ODDS = 0.04;
