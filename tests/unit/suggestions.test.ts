import assert from "node:assert/strict";
import { it } from "node:test";
import { windowTop } from "../../src/terminal/suggest.ts";

// Dix propositions à l'écran, quinze dans la liste : la fenêtre est le seul moyen de
// joindre la onzieme. La tronquer, comme avant, la rendait intapable à la fleche.
const SIZE = 10;

// Tant que la sélection tient dans la fenêtre, la fenêtre ne bouge pas. Une liste qui
// défile à chaque flèche rend le choix impossible à suivre des yeux.
it("should hold the window still while the selection fits in it", () => {
  for (let at = 0; at < SIZE; at += 1) {
    assert.equal(windowTop(0, at, SIZE), 0, `at ${at}`);
  }
});

// Au onzième, la fenêtre avance d'un cran : la première proposition sort par le haut, et
// la onzième devient la dixième affichee.
it("should slide the window by one when the selection leaves it", () => {
  assert.equal(windowTop(0, SIZE, SIZE), 1);
  assert.equal(windowTop(1, SIZE + 1, SIZE), 2);
  assert.equal(windowTop(4, SIZE + 4, SIZE), 5);
});

// Le bouclage de la flèche basse ramène la sélection au debut. La fenêtre la suit d'un
// bond, sinon la première proposition s'afficherait seule en bas d'une fenêtre vide.
it("should snap the window back when the selection wraps to the first entry", () => {
  assert.equal(windowTop(5, 0, SIZE), 0);
});

// La flèche haute depuis le premier rang saute au dernier. La fenêtre doit cadrer la fin
// de la liste d'un seul coup, pas défiler de quatorze crans.
it("should snap the window to the end when the selection wraps to the last entry", () => {
  assert.equal(windowTop(0, 14, SIZE), 5);
});

// Une liste plus courte que la fenêtre n'a rien à faire glisser.
it("should never scroll a list shorter than the window", () => {
  for (let at = 0; at < 4; at += 1) {
    assert.equal(windowTop(0, at, SIZE), 0, `at ${at}`);
  }
});
