// L'etat de la mascotte pendant un glisser : onze branches, decidees par la seule
// position du curseur face aux bords de la piste.
//
// Elle ne lit que ses arguments. Les deux formes ci-dessous ne gardent du pointeur et du
// rectangle que ce qu'elle regarde : un test n'a plus a fabriquer un PointerEvent.

import { DRAG_STEP, SPLAT_MARGIN } from "./constants.ts";

export interface PointerPoint {
  clientX: number;
  clientY: number;
}

export interface Edges {
  bottom: number;
  left: number;
  right: number;
  top: number;
}

// Le plaquage nait du curseur qui sort de la piste, et non d'une collision entre le
// sprite et un bord. Les quatre coins se testent avant les quatre murs : sur une
// diagonale les deux lectures sont vraies au meme instant, et un coin place apres un
// mur ne serait jamais atteint.
export const dragState = (event: PointerPoint, box: Edges, step: number): string => {
  const above = event.clientY < box.top - SPLAT_MARGIN,
    below = event.clientY > box.bottom + SPLAT_MARGIN,
    left = event.clientX < box.left,
    right = event.clientX > box.right;

  if (above && left) {
    return "splatCeilingLeft";
  }

  if (above && right) {
    return "splatCeilingRight";
  }

  if (below && left) {
    return "splatFloorLeft";
  }

  if (below && right) {
    return "splatFloorRight";
  }

  if (above) {
    return "splatCeiling";
  }

  if (below) {
    return "splatFloor";
  }

  if (left) {
    return "splatLeft";
  }

  if (right) {
    return "splatRight";
  }

  if (step > DRAG_STEP) {
    return "dragRight";
  }

  return step < -DRAG_STEP ? "dragLeft" : "grab";
};
