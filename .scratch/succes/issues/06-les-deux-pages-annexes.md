# Les deux pages annexes

Status: ready-for-agent
Type: task
Blocked by: 01

Deux succès se débloquent hors de la version terminal : `text-version` sur `texte.html`,
et `not-found` sur `404.html`. Les deux pages sont autonomes. Elles ne chargent ni
`content.json`, ni `app.ts`.

## Ce que chaque page fait

Elle écrit sa clé dans le tableau `bd-term-achievements`, sur la même origine. Rien
d'autre : pas de catalogue, pas de compteur, pas d'alerte. La version terminal lit la clé
au chargement suivant, et le badge s'agite.

Le code tient en quelques lignes : lire, ajouter si la clé manque, écrire. **Relire avant
d'écrire** — la version terminal peut être ouverte dans un autre onglet.

Un stockage refusé ne casse rien, et n'écrit rien en console.

## Les contraintes de chaque page

**`texte.html`** est le repli. Elle porte un seul script, en tête, qui pose `data-theme`.
La page reste entière sans lui. L'écriture rejoint ce script, et cette propriété ne doit
pas changer. Budget : 60 Ko, dont 34 Ko de police.

**`404.html`** est servie sur une adresse quelconque. `src/404.ts` fait déjà 148 lignes.
Budget : 50 Ko. Elle n'a droit à **aucun import dynamique** : un spécificateur relatif n'y
résoudrait pas, et la construction le vérifie — voir l'ADR 0008.

## Ce qui ne change pas

Les deux pages restent sans mesure d'audience et sans hôte tiers.
`tests/browser/budget.spec.ts` le vérifie sur les deux, et les deux plafonds ne bougent
pas.

## Critère d'acceptation

Ouvrir `texte.html`, puis revenir à la version terminal : le badge s'agite et le compteur
a monté d'un. Les deux budgets restent verts.
