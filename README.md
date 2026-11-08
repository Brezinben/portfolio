# Portfolio Benjamin David

Portfolio personnel servi en pages statiques. Le contenu vit dans `content.json`, chargé au
démarrage, pour être modifié sans redéploiement.

Domaine cible : `https://me.brezinben.dpdns.org/`

## Arborescence

| Dossier | Rôle |
|---|---|
| `src/` | La source. Lisible, sans dépendance, servable telle quelle. |
| `dist/` | L'artefact compact, produit par `bun run build`. Hors de git. |
| `docs/adr/` | Décisions d'architecture. |
| `.scratch/` | Spec et tickets. Local, hors de git. |

`CONTEXT.md` est le glossaire du projet et fait foi sur le vocabulaire.

## Mise en route

```
mise install                      # bun, node, hk et ses outils
bun install                       # Playwright et les outils de construction
bun x playwright install chromium # le navigateur du seam page
```

Les versions des outils sont figées dans `.config/mise.toml`. `bun` fournit
Playwright et les deux outils de construction.

## Commandes

```
bun run build         # produit dist/ à partir de src/
bun run check         # format, lint, types, code mort, secrets : les étapes de la CI
bun run lint          # oxlint seul
bun run format        # oxfmt, écriture en place
bun run test          # seam interpréteur, sans navigateur
bun run test:browser  # seam page, navigateur réel
```

hk lance format, lint et secrets après chaque édition de Claude, et y ajoute le code mort à
chaque commit. `bun run check` ajoute les types. La configuration est dans `.config/hk.pkl`.

`npx oxlint --fix` corrige automatiquement la plupart des violations de style.

## Les deux seams de test

**L'interpréteur de commandes** se teste sans navigateur, avec `node:test`. Il est pur et
synchrone : il rend les lignes à afficher et des descripteurs d'effets, sans toucher au DOM.

**La page servie** se teste dans un navigateur réel, avec Playwright. Ce seam couvre le
démarrage, le clavier, le focus, l'accessibilité et le budget de poids.

Playwright construit l'artefact dans `dist.test/`, puis le sert. Le seam exerce donc la page
compacte, celle que le visiteur reçoit, et non la source. Le seam interpréteur, lui, garde
`src/interpret.ts`.

Le serveur de test compresse comme le ferait un serveur de production : le budget de poids
se mesure après compression, sinon le chiffre ne veut rien dire.

## Déploiement

Sur l'hôte `beta`, un conteneur Caddy monte le dépôt en lecture seule et sert `dist/`.
Publier, c'est donc lancer `bun run build` sur `beta`. Ailleurs, la construction ne publie rien.

`dist` est un lien symbolique vers `.versions/dist/<horodatage>/`. La construction écrit la
version neuve à côté, puis remplace le lien en une seule opération. Le chemin servi désigne
donc toujours une version complète, même si la construction meurt.

La construction pose une empreinte du contenu dans le nom des actifs. `content.json`,
`llms.txt`, `robots.txt`, `sitemap.xml` et `apple-touch-icon.png` gardent le leur : ce sont
des adresses fixes par convention.

Les tests construisent dans `dist.test/` et ne publient rien. `PORTFOLIO_DIST` choisit la
sortie, `PORTFOLIO_PORT` le port.

`bun run test` ne lance que les tests unitaires. Les tests navigateur coûtent deux minutes
pour une page et trois fichiers : ils restent disponibles sous `bun run test:browser`, à
lancer quand le rendu change.

Écrire `bun run test`, et non `bun test`. Sans `run`, Bun lance son propre lanceur de tests,
qui ramasse aussi les fichiers de `tests/browser/`.

Playwright garde Node. Son lanceur démarre par un shebang `node`, et Bun n'y change rien.

Voir `docs/adr/0003-publier-par-bascule-d-un-lien-symbolique.md`.

`content.json` doit rester à côté de la page. La page le charge par une URL relative.
