// La corruption d'un texte : ce qui remplace quoi, et avec quelle intensite.
//
// Elle ne lit que ses arguments et ne touche à aucun noeud. La tranche garde le DOM, les
// minuteurs et le texte d'origine ; ce module ne rend que des chaines.

import { lookup } from "../lookup.ts";

// UTF-8 relu en latin-1 : la faute d'encodage la plus reconnaissable, et la seule qui se
// lise comme une panne plutôt que comme du bruit. Les accents français y passent tous,
// sinon la corruption saute justement les caractères qui la rendent credible.
export const MOJIBAKE = {
  "«": "Â«",
  "°": "Â°",
  "·": "Â·",
  "»": "Â»",
  À: "Ã€",
  Ç: "Ã‡",
  É: "Ã‰",
  à: "Ã ",
  â: "Ã¢",
  ç: "Ã§",
  è: "Ã¨",
  é: "Ã©",
  ê: "Ãª",
  ë: "Ã«",
  î: "Ã®",
  ï: "Ã¯",
  ô: "Ã´",
  ö: "Ã¶",
  ù: "Ã¹",
  û: "Ã»",
  ü: "Ã¼",
  "–": "â€“",
  "—": "â€”",
  "’": "â€™",
  "›": "â€º",
  "€": "â‚¬",
  "█": "â–ˆ",
  "░": "â–‘",
  "▓": "â–“",
  "✓": "âœ“",
  "✳": "âœ³",
};

const POOL = "ĄßĆÐЄҒĢĦƗĴЌŁӍИФ¶ҚЯŞŦЦVЩЖ¥ƵǂǃΔΣΞ∎▓▒░#@&§¤ï¿½�01101";

export const RAIN = "アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789";

// Une passe sur trois cent quarante : la corruption doit rester lisible comme un texte
// casse, pas comme un mur de glyphes. Le mojibake passe presque toujours, parce qu'il
// porte le sens de la panne ; le reste suit la chaleur du moment.
const MOJIBAKE_ODDS = 0.82;
const HEAT_FLOOR = 0.02;
const HEAT_START = 0.26;
const HEAT_DECAY = 0.2;
const WAVE_FLOOR = 0.45;
// Treize radians sur la durée, soit deux vagues : assez pour que l'intensité respire,
// assez peu pour qu'on voie le texte redevenir lisible entre les deux.
const WAVE_SPAN = 13;
const HALF = 0.5;

export const pick = (glyphs: string) => {
  return glyphs[Math.floor(Math.random() * glyphs.length)] ?? "";
};

// L'intensité décroît par vagues : très cassée au début, presque lisible à la fin. Une
// décroissance droite se lisait comme un fondu, et le texte n'avait plus l'air en panne.
export const heatAt = (progress: number) => {
  const wave = HALF + HALF * Math.sin(progress * WAVE_SPAN);

  return Math.max(HEAT_FLOOR, (HEAT_START - HEAT_DECAY * progress) * (WAVE_FLOOR + wave));
};

// Les espaces ne sont jamais touchés : les mots gardent leurs coupures, et le texte reste
// lisible comme un texte casse. La largeur, elle, bouge : le mojibake rend deux octets là
// où il en lit un.
export const corrupt = (text: string, heat: number) => {
  let out = "";

  for (const character of text) {
    const moji = lookup(MOJIBAKE, character);

    if (moji !== undefined && Math.random() < MOJIBAKE_ODDS) {
      out += moji;
    } else if (character !== " " && Math.random() < heat) {
      out += pick(POOL);
    } else {
      out += character;
    }
  }

  return out;
};
