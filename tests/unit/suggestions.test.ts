import assert from "node:assert/strict";
import { it } from "node:test";
import { windowTop } from "../../src/terminal/suggest.ts";

// Dix propositions a l'ecran, quinze dans la liste : la fenetre est le seul moyen de
// joindre la onzieme. La tronquer, comme avant, la rendait intapable a la fleche.
const SIZE = 10;

// Tant que la selection tient dans la fenetre, la fenetre ne bouge pas. Une liste qui
// defile a chaque fleche rend le choix impossible a suivre des yeux.
it("should hold the window still while the selection fits in it", () => {
  for (let at = 0; at < SIZE; at += 1) {
    assert.equal(windowTop(0, at, SIZE), 0, `at ${at}`);
  }
});

// Au onzieme, la fenetre avance d'un cran : la premiere proposition sort par le haut, et
// la onzieme devient la dixieme affichee.
it("should slide the window by one when the selection leaves it", () => {
  assert.equal(windowTop(0, SIZE, SIZE), 1);
  assert.equal(windowTop(1, SIZE + 1, SIZE), 2);
  assert.equal(windowTop(4, SIZE + 4, SIZE), 5);
});

// Le bouclage de la fleche basse ramene la selection au debut. La fenetre la suit d'un
// bond, sinon la premiere proposition s'afficherait seule en bas d'une fenetre vide.
it("should snap the window back when the selection wraps to the first entry", () => {
  assert.equal(windowTop(5, 0, SIZE), 0);
});

// La fleche haute depuis le premier rang saute au dernier. La fenetre doit cadrer la fin
// de la liste d'un seul coup, pas defiler de quatorze crans.
it("should snap the window to the end when the selection wraps to the last entry", () => {
  assert.equal(windowTop(0, 14, SIZE), 5);
});

// Une liste plus courte que la fenetre n'a rien a faire glisser.
it("should never scroll a list shorter than the window", () => {
  for (let at = 0; at < 4; at += 1) {
    assert.equal(windowTop(0, at, SIZE), 0, `at ${at}`);
  }
});
