# Recherche par IA locale

Status: resolved
Type: task

Vient de l'issue GitHub #2 : « Implémenter la recherche avec l'ia locale (si disponible) ».

**Je recommande de reporter ce ticket.** Il est le plus gros de la liste et le plus
incertain, et il dépend d'une chose qui n'existe pas encore : la palette de recherche du
ticket `01-raccourcis-clavier`. Chercher sans champ de recherche n'a pas d'objet.

## Ce que « l'IA locale » peut vouloir dire

1. **L'API `Prompt` de Chrome** — un modèle embarqué dans le navigateur, derrière
   `window.ai`. Disponible dans Chrome seulement, derrière un drapeau ou un essai
   d'origine selon la version. Le « si disponible » de la demande va dans ce sens.
2. **Un petit modèle chargé dans la page** — WebLLM, Transformers.js. Des dizaines de
   mégaoctets. **Incompatible avec le budget de 150 Ko**, sauf chargement à la demande
   et assumé.
3. **Une recherche sémantique sans modèle** — des vecteurs calculés à la construction,
   embarqués dans un fichier. Quelques dizaines de kilooctets. Ce n'est pas « de l'IA »
   à l'exécution, mais cela donne le résultat attendu.

## Les questions à poser à Benjamin

- Laquelle des trois ? La troisième est la seule qui tienne le budget sans condition.
- Que fait le site quand l'IA n'est **pas** disponible ? C'est le cas majoritaire. Le
  repli doit être la vraie fonctionnalité, et l'IA le bonus.


## Réponse

**Je recommandais de reporter ce ticket. J'avais tort sur un point, et il change tout : le
corpus existe déjà.** Chaque section et chaque mission de `content.json` porte un champ
`ask`, une prose dense écrite à la main. Dix passages. Et `src/interpret.ts` déclarait déjà
les effets `ask` et `probeAI`, différés « à d'autres tickets » — celui-ci.

Il ne manquait ni les données, ni le point d'entrée.

## Ce que la recherche sur l'API Prompt a donné

Sources : la proposition W3C `webmachinelearning/prompt-api`, et MDN.

| Fait | Conséquence |
|---|---|
| MDN : « limited availability », pas Baseline | Chrome seulement. **Le repli est le cas normal.** |
| Contexte sécurisé exigé (HTTPS) | Rien à faire, le site est en HTTPS. |
| `LanguageModel.availability()` rend quatre états | `available`, `downloadable`, `downloading`, `unavailable`. **Trois ne sont pas des pannes.** |
| `responseConstraint` accepte un schéma JSON | Le modèle peut être contraint à un `enum`. C'est le levier. |

Mesuré au passage : **le Chromium de Playwright porte l'API et annonce `downloadable`** —
l'API existe, le modèle n'est pas installé. C'est très probablement le cas majoritaire chez
les visiteurs, et il mérite son propre message.

## Les trois options du ticket, tranchées

1. **API Prompt de Chrome** — retenue, comme bonus.
2. **Un petit modèle chargé dans la page** — écartée. Des dizaines de mégaoctets contre un
   plafond de 150 Ko.
3. **Vecteurs calculés à la construction** — écartée, mais pas pour son coût. **Elle est
   inutile ici** : dix passages ne demandent pas d'index. Un recouvrement de mots suffit,
   et il tient en trente lignes.

## La décision qui compte

> **Le modèle ne produit jamais de texte. Il choisit un identifiant dans une liste fermée,
> et la page affiche le passage que cet identifiant désigne.**

`responseConstraint: { enum: candidats }` le lui impose. Le gain est réel — une recherche
par mots rate « comment tu bosses » face à un passage qui parle de méthode sans reprendre le
mot, là où un modèle le voit. La surface d'invention, elle, est nulle : un identifiant hors
liste ne désigne rien, et rien ne s'affiche. Un test le vérifie.

Le laisser rédiger à la place de Benjamin n'apporterait rien qu'une invention possible sur
son propre parcours.

## Ce qui reste hors de ce ticket

La palette de recherche `meta + K` n'existe toujours pas. `ask` se tape, comme les autres
commandes. La palette relève de
`.scratch/fonctionnalites/issues/01-raccourcis-clavier.md`, et elle branchera la même
recherche.
