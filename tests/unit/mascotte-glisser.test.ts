import assert from "node:assert/strict";
import { dragState } from "../../src/terminal/mascot/drag.ts";
import { test } from "node:test";

// La piste du test : 100 px de haut, 400 de large. La marge de plaquage vaut 24 px, et
// elle ne joue que sur la verticale.
const TRACK = { bottom: 100, left: 0, right: 400, top: 0 },
  at = (x: number, y: number) => ({ clientX: x, clientY: y }),
  // Un pas nul : ni « dragLeft » ni « dragRight » ne peuvent gagner par accident.
  state = (x: number, y: number, step = 0) => dragState(at(x, y), TRACK, step);

// Un coin se teste avant un bord. Sur une diagonale les deux lectures sont vraies au meme
// instant, et un coin place apres un mur ne serait jamais atteint.
test("les quatre coins gagnent sur les quatre bords", () => {
  assert.equal(state(-10, -50), "splatCeilingLeft");
  assert.equal(state(410, -50), "splatCeilingRight");
  assert.equal(state(-10, 150), "splatFloorLeft");
  assert.equal(state(410, 150), "splatFloorRight");
});

// La marge n'existe que sur la verticale : la piste est trop longue pour qu'on en sorte
// par accident en largeur.
test("la marge de plaquage ne joue que sur la verticale", () => {
  assert.equal(state(200, -20), "grab", "sous la marge, rien ne se plaque");
  assert.equal(state(200, -25), "splatCeiling", "au-dela, le plafond");
  assert.equal(state(200, 120), "grab", "sous la marge, rien ne se plaque");
  assert.equal(state(200, 125), "splatFloor", "au-dela, le sol");

  assert.equal(state(-1, 50), "splatLeft", "un pixel suffit sur le cote");
  assert.equal(state(401, 50), "splatRight", "un pixel suffit sur le cote");
});

// Le sens se lit sur ce que la mascotte a parcouru, pas sur ce que le curseur a parcouru :
// plaquee, elle ne bouge plus, et sa feuille doit le dire.
test("le sens du glisser vient du pas, et il a un seuil", () => {
  assert.equal(state(200, 50, 3), "dragRight");
  assert.equal(state(200, 50, -3), "dragLeft");
  assert.equal(state(200, 50, 2), "grab", "au seuil exact, la prise tient");
  assert.equal(state(200, 50, -2), "grab", "au seuil exact, la prise tient");
});

// Le plaquage decide avant le sens : une mascotte retenue contre un bord suit encore le
// curseur en abscisse, mais sa feuille doit montrer l'ecrasement.
test("le plaquage passe avant le sens du glisser", () => {
  assert.equal(state(-10, 50, 99), "splatLeft");
  assert.equal(state(410, 50, -99), "splatRight");
});
