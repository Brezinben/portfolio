# Écrire une règle antislop sur les commentaires

Status: needs-info
Type: task

## L'état

Quinze règles `anti-slop` sont activées dans `.oxlintrc.json`. **Aucune ne porte sur les
commentaires** — la seule qui les mentionne, `require-safety-comment-for-type-assertion`,
en *exige* un. Le paquet amont, `.agents/skills/install-anti-slop/assets/`, n'en propose
pas davantage. Il faut donc **écrire** une règle neuve.

## Ce que la règle devrait interdire

`CLAUDE.md` §4 énonce déjà l'intention. Ce qui est mécaniquement détectable :

| Motif | Détectable |
|---|---|
| Un commentaire qui décrit le changement : `// added X`, `// modified for Y` | oui, par expression régulière |
| Une bannière de section : `// ===== X =====`, `// --- X ---` | oui |
| Un `TODO` sans référence d'issue | oui |
| Un commentaire qui répète le nom de la ligne suivante | partiellement, par comparaison de jetons |
| Une docstring pour une signature qui se lit seule | non, sans jugement |
| La densité cible d'un commentaire pour 30 lignes | oui, mais c'est une métrique de fichier, pas une règle de nœud |

## Ce qui reste à décider

Une règle, ou plusieurs ? Je recommande trois règles étroites plutôt qu'une large :
`no-changelog-comments`, `no-section-banners`, `require-todo-reference`. Chacune se
justifie seule en relecture et se désactive seule.

Le dépôt lui-même doit passer la règle avant qu'elle soit posée en `error`. À mesurer sur
`src/app.ts` (80 Ko) et `src/interpret.ts` avant de trancher.
