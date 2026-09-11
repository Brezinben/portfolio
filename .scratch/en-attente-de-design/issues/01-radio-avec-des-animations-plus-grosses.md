# /radio avec des animations plus grosses

Status: needs-design
Type: task

Fusionne deux demandes : « Implémenter le /radio avec des animations plus grosses »
(TODO.md) et « Inspiration pour le /radio : https://terminaltrove.com/kew/ » (issue #2).

**La commande `/radio` n'existe pas.** Aucune trace dans `src/app.ts`, `src/interpret.ts`
ni `src/content.json`. C'est une création complète, pas un ajustement.

## Prompt à coller dans Claude Design

> Le portfolio terminal a besoin d'une commande `/radio`. Elle doit occuper le volet de
> sortie avec un visualiseur audio qui assume d'être plus gros et plus voyant que le
> reste de l'interface — c'est le seul endroit du site où l'animation a le droit de
> dominer.
>
> L'inspiration est `kew`, un lecteur musical en terminal : https://terminaltrove.com/kew/
> Regarde ce qu'il fait de son spectre et de sa liste de lecture.
>
> Contraintes :
> - Le visualiseur vit dans le volet de sortie, qui fait environ 230 px de large au
>   minimum et s'empile sous les autres volets en dessous de 900 px.
> - Il utilise `--acc`, `--acc-soft` et `--fg2` du thème courant. Il doit tenir sur les
>   huit thèmes, dont un thème clair.
> - Le réglage `anim` doit pouvoir le figer sur une image fixe lisible, sans le faire
>   disparaître.
> - Budget : 150 Ko compressés au premier chargement, 69 Ko déjà consommés. Pas d'image
>   nouvelle si une animation CSS suffit.
>
> Dis-moi aussi ce qui joue. Une vraie piste audio ? Un faux spectre décoratif ? La
> réponse change tout le reste : un vrai son demande un contrôle de volume, un état de
> lecture, et un consentement.

## Ce qu'il faut décider avant l'implémentation

La question du son est la plus lourde. Une piste audio réelle ajoute un fichier au
budget, un `AudioContext`, et une politique d'autoplay à respecter.

## Comments

**Benjamin** — « Le plus simple, dans un premier temps, j'aimerais reprendre le son de la
vidéo YouTube de Claude Radio. Sinon faire une musique directement dans le navigateur en
local. Pas un gros truc, mais histoire de toucher à l'API de création de son. »

### Ce que cela tranche

La question du son est répondue, et elle a deux réponses dans l'ordre.

1. **Une piste reprise de la vidéo Claude Radio.** Un fichier audio au budget. À 150 Ko de
   plafond et 69 Ko consommés, **une piste ne tient pas au premier chargement** : elle doit
   être chargée à la demande, quand `/radio` est tapée, jamais avant.
2. **Sinon, une musique générée par la Web Audio API.** Zéro octet au chargement, et le
   spectre du visualiseur devient réel au lieu d'être décoratif.

La seconde est la plus juste pour ce site, et Benjamin la nomme lui-même. La première pose
une question de droits qu'il faut vérifier avant de publier.

**Le prompt de design ci-dessus reste valable : la question qu'il pose est répondue.**
