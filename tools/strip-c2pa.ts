// L'outil du designer ajoute a chaque PNG un chunk de provenance C2PA (« caBX ») de 5758
// octets, reecrit a chaque export. C'est plus que les pixels sur la plupart des feuilles, et
// le budget de poids compare des tailles de fichier : sans ce retrait, il ne mesure rien.
//
//     bun tools/strip-c2pa.ts src/assets/sprites/cube/*.png
//
// Ne garde que les chunks dont le rendu depend. Relancer sur un fichier deja propre ne
// change rien.

import { readFile, writeFile } from "node:fs/promises";

const KEPT = new Set(["IDAT", "IEND", "IHDR", "PLTE", "tRNS"]),
  SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  HEADER = 8,
  // Longueur sur 4 octets, type sur 4, puis les donnees, puis 4 octets de CRC.
  AROUND = 12,
  strip = (bytes: Buffer) => {
    if (!bytes.subarray(0, HEADER).equals(SIGNATURE)) {
      throw new Error("ce fichier n'est pas un PNG");
    }

    const kept: Buffer[] = [bytes.subarray(0, HEADER)];
    let at = HEADER,
      dropped = 0;

    while (at < bytes.length) {
      const length = bytes.readUInt32BE(at),
        type = bytes.subarray(at + 4, at + 8).toString("latin1"),
        whole = bytes.subarray(at, at + AROUND + length);

      if (KEPT.has(type)) {
        kept.push(whole);
      } else {
        dropped += whole.length;
      }

      at += AROUND + length;

      if (type === "IEND") {
        break;
      }
    }

    return { bytes: Buffer.concat(kept), dropped };
  },
  files = process.argv.slice(2);

if (files.length === 0) {
  throw new Error("aucun fichier : passez les PNG a nettoyer en arguments");
}

const dropped = await Promise.all(
    files.map(async (file) => {
      const stripped = strip(await readFile(file));

      if (stripped.dropped > 0) {
        await writeFile(file, stripped.bytes);
      }

      return stripped.dropped;
    }),
  ),
  total = dropped.reduce((sum, bytes) => sum + bytes, 0);

console.log(`${files.length} fichiers lus, ${Math.round(total / 102.4) / 10} Ko retires`);
