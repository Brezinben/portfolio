// Cowsay, conforme a l'original : la bulle change de forme selon le nombre de lignes,
// et le retour a la ligne suit la largeur du volet.

import { lookup } from "./lookup.ts";

const FACES_COW = {
  "-b": { eyes: "==", tongue: "  " },
  "-d": { eyes: "xx", tongue: "U " },
  "-g": { eyes: "$$", tongue: "  " },
  "-p": { eyes: "@@", tongue: "  " },
  "-s": { eyes: "**", tongue: "U " },
  "-t": { eyes: "--", tongue: "  " },
  "-w": { eyes: "OO", tongue: "  " },
  "-y": { eyes: "..", tongue: "  " },
};

export const COW_MODES = Object.keys(FACES_COW);
const wrap = (text: string, columns: number): string[] => {
  const lines = [];
  let current = "";

  for (const word of text.split(" ")) {
    if (current === "") {
      current = word;
    } else if (`${current} ${word}`.length <= columns) {
      current += ` ${word}`;
    } else {
      lines.push(current);
      current = word;
    }
  }

  if (current !== "") {
    lines.push(current);
  }

  return lines.length === 0 ? [""] : lines;
};
const EDGES = { first: ["/", "\\"], last: ["\\", "/"], middle: ["|", "|"] };
const edgeFor = (index: number, count: number) => {
  if (index === 0) {
    return EDGES.first;
  }

  if (index === count - 1) {
    return EDGES.last;
  }

  return EDGES.middle;
};
const bubble = (lines: string[]): string[] => {
  const width = Math.max(
      ...lines.map((entry) => {
        return entry.length;
      }),
    ),
    top = ` ${"_".repeat(width + 2)}`,
    bottom = ` ${"-".repeat(width + 2)}`;

  if (lines.length === 1) {
    return [top, `< ${lines[0]} >`, bottom];
  }

  return [
    top,
    ...lines.map((entry, index) => {
      const [left, right] = edgeFor(index, lines.length);

      return `${left} ${entry.padEnd(width)} ${right}`;
    }),
    bottom,
  ];
};

export const cowsay = (
  text: string,
  { columns = 40, mode = "" }: { columns?: number; mode?: string } = {},
): string[] => {
  const face = lookup(FACES_COW, mode) ?? { eyes: "oo", tongue: "  " },
    body = wrap(text.trim() === "" ? "Moo." : text.trim(), Math.max(8, columns - 6));

  return [
    ...bubble(body),
    String.raw`        \   ^__^`,
    `         \\  (${face.eyes})\\_______`,
    "            (__)\\       )\\/\\",
    `             ${face.tongue} ||----w |`,
    "                ||     ||",
  ];
};

// Le nom interne dit la table, le nom public dit ce qu'elle sert : des modes de tete.
export { COW_MODES as COW_HEAD_MODES };
