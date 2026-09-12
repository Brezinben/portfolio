// La mascotte : ce qu'elle joue, ou elle se place, comment on la manipule.

import { type Shell, slice } from "../shell.ts";
import { SPRITE } from "./constants.ts";

export interface MascotApi {
  trackWidth(): number;
}

export const mascotSlice = () =>
  slice<MascotApi>({
    trackWidth(this: Shell) {
      const { track } = this.$refs;

      return track ? Math.max(0, track.clientWidth - SPRITE) : 0;
    },
  });
