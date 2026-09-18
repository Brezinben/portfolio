import assert from "node:assert/strict";
import { dragState } from "../../src/terminal/mascot/drag.ts";
import { it } from "node:test";

// La piste du test : 100 px de haut, 400 de large. La marge de plaquage vaut 24 px, et
// elle ne joue que sur la verticale.
const TRACK = { bottom: 100, left: 0, right: 400, top: 0 },
  at = (x: number, y: number) => {
    return { clientX: x, clientY: y };
  },
  // Un pas nul : ni « dragLeft » ni « dragRight » ne peuvent gagner par accident.
  state = (x: number, y: number, step = 0) => {
    return dragState(at(x, y), TRACK, step);
  };

// Un coin se teste avant un bord. Sur une diagonale les deux lectures sont vraies au meme
// instant, et un coin place apres un mur ne serait jamais atteint.
it("should prefer the four corners over the four edges", () => {
  assert.equal(state(-10, -50), "splatCeilingLeft");
  assert.equal(state(410, -50), "splatCeilingRight");
  assert.equal(state(-10, 150), "splatFloorLeft");
  assert.equal(state(410, 150), "splatFloorRight");
});

// La marge n'existe que sur la verticale : la piste est trop longue pour qu'on en sorte
// par accident en largeur.
it("should apply the splat margin on the vertical axis only", () => {
  assert.equal(state(200, -20), "grab", "below the margin, nothing splats");
  assert.equal(state(200, -25), "splatCeiling", "beyond the margin, the ceiling");
  assert.equal(state(200, 120), "grab", "below the margin, nothing splats");
  assert.equal(state(200, 125), "splatFloor", "beyond the margin, the floor");

  assert.equal(state(-1, 50), "splatLeft", "one pixel is enough on the side");
  assert.equal(state(401, 50), "splatRight", "one pixel is enough on the side");
});

// Le sens se lit sur ce que la mascotte a parcouru, pas sur ce que le curseur a parcouru :
// plaquee, elle ne bouge plus, et sa feuille doit le dire.
it("should read the drag direction from the step, above a threshold", () => {
  assert.equal(state(200, 50, 3), "dragRight");
  assert.equal(state(200, 50, -3), "dragLeft");
  assert.equal(state(200, 50, 2), "grab", "at the exact threshold, the grab holds");
  assert.equal(state(200, 50, -2), "grab", "at the exact threshold, the grab holds");
});

// Le plaquage decide avant le sens : une mascotte retenue contre un bord suit encore le
// curseur en abscisse, mais sa feuille doit montrer l'ecrasement.
it("should prefer the splat over the drag direction", () => {
  assert.equal(state(-10, 50, 99), "splatLeft");
  assert.equal(state(410, 50, -99), "splatRight");
});
