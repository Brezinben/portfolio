# Le texte publie des faits que l'auteur n'a pas dictés

Status: resolved
Type: task

La source est `docs/contenu/entretien.md`. Il faut la confirmation de l'auteur pour ces
faits :

- « ~20 min là où un humain passerait une journée » ;
- la section RUN chez digital4better ;
- les notes LDC et FPEE ;
- « en tram, en bus, à pied ou à vélo » ;
- Kereis pour Vue, Pinia et le pair-programming ;
- les lieux de Cypress et Laravel ;
- « MCP + SDD en production », alors que ce sont des preuves de concept.

## Autres défauts

- « aucune image » est faux, car le site sert des sprites PNG. « aucun tracker »
  contredit GoatCounter.
- `content.json`, `texte.html`, `llms-full.txt` et `llms.txt` ne disent plus la même
  chose depuis le commit #14.
- Fautes : « la » pour « là » (`src/interpret/mascot.ts:45`), « 1 non regardés »
  (`src/app.ts:1871`), « d'Application ». « spec-it » n'existe pas dans Spec Kit.
- Il reste des tournures « pas X mais Y », des aphorismes, des chutes et des cadratins.
- L'interface mêle l'anglais au français (« close », « value · setting »). Un
  tutoiement est isolé. La mascotte change de genre.
- Aucune espace insécable : le navigateur peut couper avant « : » ou dans « 3 000 ».

## Answer

Corrigé dans la PR #23.
