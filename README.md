# Portfolio Benjamin David

Portfolio personnel servi en pages statiques. Le contenu vit dans `content.json`, chargé au
démarrage, pour être modifié sans redéploiement.

Domaine cible : `https://portfolio.brezinben.dpdns.org/`

## Arborescence

| Dossier | Rôle |
|---|---|
| `production/` | Ce qui est déployé. Aucune dépendance, aucune étape de construction. |
| `design/` | Le canvas Claude Design, **gelé**. Référence visuelle et de comportement, plus une source de code. |
| `docs/adr/` | Décisions d'architecture. |
| `.scratch/` | Spec et tickets. |

`CONTEXT.md` est le glossaire du projet et fait foi sur le vocabulaire.
`DECISIONS.md` est le journal de conception : il dit **pourquoi** le code est ainsi.

## Mise en route

```
mise install                      # node, oxlint, oxfmt
npm install                       # Playwright
npx playwright install chromium   # le navigateur du seam page
```

Les versions des outils sont figées dans `.config/mise/config.toml`. `npm` ne fournit que
Playwright.

## Commandes

```
npm run lint          # oxlint
npm run format        # oxfmt, écriture en place
npm run format:check  # oxfmt, vérification seule
npm run test:unit     # seam interpréteur, sans navigateur
npm run test:browser  # seam page, navigateur réel
npm test              # les deux
```

## Les deux seams de test

**L'interpréteur de commandes** se teste sans navigateur, avec `node:test`. Il est pur et
synchrone : il rend les lignes à afficher et des descripteurs d'effets, sans toucher au DOM.

**La page servie** se teste dans un navigateur réel, avec Playwright. Ce seam couvre le
démarrage, le clavier, le focus, l'accessibilité et le budget de poids.

Le serveur de test compresse comme le ferait un serveur de production : le budget de poids
se mesure après compression, sinon le chiffre ne veut rien dire.

## Déploiement

Copier le contenu de `production/` à la racine du domaine. `content.json` doit rester à côté
de la page : il est chargé par une URL relative.
