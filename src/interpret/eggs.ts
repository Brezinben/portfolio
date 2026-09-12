// Les easter eggs a reponse fixe. Les plus riches — slime, cowsay, joke, matrix — ont
// leur propre logique ailleurs : ceux-ci ne rendent que des lignes.

import { type Effect, say } from "./effects.ts";
import { type Line, failed, info, line, muted } from "./lines.ts";

// Un easter egg : son nom pour la mesure, ses lignes, et ce qu'il fait dire.
export interface Egg {
  egg: string;
  lines: Line[];
  say?: Effect;
}

export const EGGS = {
  benjamin: {
    egg: "nom",
    lines: [
      info(
        "Vélo de course, code propre, et une conviction : un service doit marcher pour tout le monde.",
      ),
      muted("Si vous lisez ceci, vous avez tapé mon nom dans un terminal. On devrait se parler."),
      line({ marker: "›", markerTone: "acc", text: "benjamin.david1@hotmail.fr", tone: "acc" }),
    ],
    say: say("salut", "happy"),
  },
  coffee: {
    egg: "coffee",
    lines: [
      line({
        marker: "418",
        markerTone: "warn",
        text: "I'm a teapot. Le café se fait hors du navigateur.",
      }),
    ],
  },
  sudo: {
    egg: "sudo",
    lines: [failed("benjamin n'est pas dans le fichier sudoers. Cet incident sera signalé.")],
    say: say("non.", "scared"),
  },
  vim: { egg: "vim", lines: [info("Piège classique. :q! ne fonctionne pas ici non plus.")] },
};
