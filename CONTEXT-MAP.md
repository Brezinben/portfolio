# Carte des contextes

Le dépôt porte deux contextes, et ce sont exactement les deux seams que `CONTEXT.md`
déclare : l'interpréteur de commandes, testé sans navigateur, et la page servie, testée
dans un navigateur réel.

| Contexte | Dossier | Glossaire | Testé par |
|---|---|---|---|
| Interpréteur | `src/interpret/` | [`src/interpret/CONTEXT.md`](src/interpret/CONTEXT.md) | `tests/unit/` |
| Coquille | `src/terminal/` | [`src/terminal/CONTEXT.md`](src/terminal/CONTEXT.md) | `tests/browser/` |

Le [`CONTEXT.md`](CONTEXT.md) racine reste le glossaire du produit : les zones, le
contenu, le comportement, les artefacts. Un terme qui parle de ce que le visiteur voit y
appartient. Un terme qui parle de la structure d'un contexte appartient au glossaire de
ce contexte.

`src/app.ts` n'appartient à aucun des deux : c'est le point d'entrée qui les relie. Il
compose les tranches de la coquille et appelle la façade de l'interpréteur.

La coquille traverse le seam ailleurs qu'au point d'entrée : `src/terminal/format.ts` met
en forme des lignes de contenu, et importe `contentLine` et `safeTone` de la façade. C'est
légitime — le passage se fait par la porte — mais ce n'est pas `app.ts` seul. Un import
direct vers `src/interpret/*`, lui, serait un défaut.

Les décisions d'architecture restent dans [`docs/adr/`](docs/adr/), à la racine. Elles
portent sur le dépôt entier, pas sur un contexte : l'ADR 0002 contraint la coquille par
le minifieur, l'ADR 0007 décrit le découpage des deux.
