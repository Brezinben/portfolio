# Recherche par IA locale

Status: needs-info
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
