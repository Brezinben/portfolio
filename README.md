# Portfolio Benjamin David

Portfolio personnel servi en pages statiques. Le contenu vit dans `content.json`, chargé au
démarrage, pour être modifié sans redéploiement.

Domaine cible : `https://portfolio.brezinben.dpdns.org/`

## Arborescence

| Dossier | Rôle |
|---|---|
| `production/` | La source. Lisible, sans dépendance, servable telle quelle. |
| `dist/` | L'artefact compact, produit par `npm run build`. Hors de git. |
| `design/` | Le canvas Claude Design, **gelé**. Référence visuelle et de comportement, plus une source de code. |
| `docs/adr/` | Décisions d'architecture. |
| `.scratch/` | Spec et tickets. |

`CONTEXT.md` est le glossaire du projet et fait foi sur le vocabulaire.
`DECISIONS.md` est le journal de conception : il dit **pourquoi** le code est ainsi.

## Mise en route

```
mise install                      # node, oxlint, oxfmt
npm install                       # Playwright et les outils de construction
npx playwright install chromium   # le navigateur du seam page
```

Les versions des outils sont figées dans `.config/mise/config.toml`. `npm` fournit
Playwright et les deux outils de construction.

## Commandes

```
npm run build         # produit dist/ à partir de production/
npm run lint          # oxlint, via npx : voir la note ci-dessous
npm run format        # oxfmt, écriture en place
npm run format:check  # oxfmt, vérification seule
npm run test:unit     # seam interpréteur, sans navigateur
npm run test:browser  # seam page, navigateur réel
npm test              # les deux
```

Le script `lint` appelle `npx oxlint` et non `oxlint`. Les règles `@stylistic` sont un
greffon JavaScript, que le binaire autonome ne charge pas. Lancé directement, il ne signale
aucune erreur **et n'applique pas ces règles non plus**, sans le dire.

`npx oxlint --fix` corrige automatiquement la plupart des violations de style.

## Les deux seams de test

**L'interpréteur de commandes** se teste sans navigateur, avec `node:test`. Il est pur et
synchrone : il rend les lignes à afficher et des descripteurs d'effets, sans toucher au DOM.

**La page servie** se teste dans un navigateur réel, avec Playwright. Ce seam couvre le
démarrage, le clavier, le focus, l'accessibilité et le budget de poids.

Playwright sert `dist/` et lance la construction avant. Le seam exerce donc la page compacte, celle
que le visiteur reçoit, et non la source. Le seam interpréteur, lui, garde
`production/interpret.js`.

Le serveur de test compresse comme le ferait un serveur de production : le budget de poids
se mesure après compression, sinon le chiffre ne veut rien dire.

## Déploiement

Un conteneur Caddy monte `/mnt/portfolio/production` en lecture seule et le publie. Chaque
sauvegarde part donc en ligne dans la seconde.

`npm run build` produit `dist/`, la même page sous forme compacte. Le montage ne pointe pas
encore dessus. Voir `docs/adr/0002-un-artefact-compact-plutot-qu-un-dossier-servi-tel-quel.md`.

`content.json` doit rester à côté de la page. La page le charge par une URL relative.
