# Refonte CSS : centraliser le style en classes

## Le problème

`src/index.html` porte **121 attributs `style=` statiques** (465 déclarations) et
**47 liaisons `:style`**. Le style vit dans le balisage. Une valeur répétée se corrige
en onze endroits. Le bloc `<style>` de 940 lignes coexiste avec ces attributs, et un
style en ligne bat toujours une règle de la feuille.

## L'historique, et pourquoi le chantier s'est arrêté

Un plan complet en sept lots a été produit le 6 septembre 2026. Il est reproduit en
annexe. Deux lots ont été exécutés :

- **Lot 0** — le filet : `tests/browser/styles.spec.ts`, 51 sélecteurs et 42 propriétés
  calculées sur trois thèmes. **Une session Claude concurrente a supprimé ce fichier.**
  Il n'apparaît dans aucun commit. Il est perdu, il faut le réécrire.
- **Lot 1** — la taxonomie des bordures : fait et commité. `CONTEXT.md` définit
  aujourd'hui *Zone* et *Intérieur*. Six `border-radius` de zone restent, plus le point
  du bandeau à 50 %.

Les lots 2 à 6 n'ont jamais commencé, faute de filet. Rien ne les bloque techniquement.

## L'ordre retenu

Benjamin a tranché : **extraire les classes d'abord, externaliser le fichier après.**
Les classes naissent donc dans le bloc `<style>` existant. La sortie vers `src/styles.css`
est un chantier distinct, une fois le balisage propre.

## Critère de succès

`bun run test:browser` vert après chaque lot, l'instantané de style compris. Le rendu
calculé ne bouge pas ; seul l'endroit où il est déclaré change.

## Ce qui reste à arbitrer

Le plan d'origine laissait deux questions ouvertes. La première est close : le lot 1 a
tranché `[data-ctl="opts"]` en carré. La seconde reste ouverte : faut-il aligner
`transition` et `:hover` entre `[data-ctl="nav"]` et `[data-ctl="tl"]` ? À poser au
lot 02.

## Termes à ajouter au glossaire

`CONTEXT.md` porte déjà *Zone* et *Intérieur*, venus du lot 1. Manquent encore :

- **Ton** (`tone`) — `TONES` existe dans `src/interpret.ts:13`, le glossaire l'ignore.
  Requis par le lot 04.
- **Frise / parcours / mission** — trois mots pour des choses proches. À trancher avant
  de nommer quoi que ce soit dans cette zone.

---

# Annexe : le plan d'origine

Produit le 6 septembre 2026, récupéré du transcript de session. Les lots 0 et 1 y sont
décrits à l'état où ils étaient alors.


# Diagnostic de bordure

## Ce qui dessine réellement l'état sélectionné

Deux boutons, même rôle, deux déclarations différentes.

**Entrée de parcours** — `src/index.html:780`, binding `:style` de `[data-ctl="tl"]` :
```
border:0;border-left:2px solid ${index === timelineAt ? 'var(--acc)' : 'transparent'};
background:${index === timelineAt ? 'var(--acc-soft)' : 'transparent'}
```
Aucun `border-radius`. C'est pourquoi « Kereis 2026 » s'affiche bien.

**Bouton de section** — `src/index.html:711` (sections) et `:734` (missions), binding `:style` de `[data-ctl="nav"]` :
```
border:0;border-left:2px solid ${item.id === section ? 'var(--acc)' : 'transparent'};
border-radius:var(--radius);
background:${item.id === section ? 'var(--acc-soft)' : 'transparent'}
```

**La cause est cette seule déclaration `border-radius:var(--radius)`.** Elle arrondit la boîte du bouton. Le remplissage `var(--acc-soft)` et la barre d'accent de 2 px sont tous deux découpés par ce rayon. C'est ce que Benjamin voit quand il clique.

Ce n'est pas le focus. Le clic souris ne déclenche pas `:focus-visible` — DECISIONS.md §22.2 documente ce choix. Au clic, aucun contour n'est dessiné du tout. Ce qu'il voit est l'état **sélectionné**, arrondi.

## Le focus est un second cas du même défaut, pas une cause

`src/index.html:645-648` :
```
.tm [data-ctl]:focus-visible { outline: 2px solid var(--acc); outline-offset: 2px }
```

Une seule règle, pour les deux boutons. Elle ne mentionne aucun rayon. Mais depuis CSS UI Level 4, les trois moteurs modernes dessinent l'`outline` en suivant le `border-radius` de l'élément. Sur `[data-ctl="tl"]`, rayon zéro, contour carré. Sur `[data-ctl="nav"]`, rayon 5 px, contour arrondi.

`box-shadow` se comporterait pareil. `outline-radius` n'existe dans aucun navigateur ; Firefox a retiré `-moz-outline-radius` en 88.

**Conséquence** : retirer `border-radius` du bouton de section corrige la sélection **et** le focus d'un seul geste. La règle de focus n'est pas à toucher.

## Le défaut est verrouillé par un test

`tests/browser/layout.spec.ts:137-153` :
```ts
["[data-ctl='opts']", "[data-pane='main']", "[data-pane='out']", "[data-ctl='nav']"]
…
expect(await rayons(), "y compris les contrôles").toEqual(["5px", "5px", "5px", "5px"]);
```

Le test affirme que `[data-ctl="nav"]` **doit** valoir `5px`, et son message dit « y compris les contrôles ». Je n'ai donc pas eu besoin de lancer un navigateur : la suite existante établit le fait, à l'envers.

## L'origine

`design/DECISIONS.md:98` et `:104`, canvas gelé :
&gt; Coins **carrés** partout. Le seul rayon toléré est `0`.
&gt; Focus : contour carré, jamais arrondi.

Le commentaire CSS de `src/index.html:612-618` a introduit `--radius: 5px` plus tard, et a écrit :
&gt; Elle couvre tout ce qui a un coin : volets, cartes, modale, **et les contrôles qui étaient carrés**.

Cette dernière proposition est la régression. Le rayon a débordé des zones vers les contrôles.

## Taxonomie proposée

Les 13 occurrences de `border-radius` du fichier se répartissent avec une symétrie parfaite : 6 zones, 6 contrôles, 1 exception.

**Zone** — conteneur encadré. Porte `border:1px solid var(--edge)`, `background:var(--panel)`, `border-radius:var(--radius)`. **Garde le rayon.**

| Ligne | Élément |
|---|---|
| 702 | carte des sections |
| 725 | carte des missions |
| 753 | `[data-pane="main"]` |
| 969 | `[data-pane="out"]` |
| 1016 | modale d'options |
| 1066 | cadre de démarrage |

**Aucune de ces six n'est focalisable.**

**Intérieur** — tout ce qui se dessine dans une zone. **Perd le rayon.**

| Ligne | Élément | Note |
|---|---|---|
| 711 | `[data-ctl="nav"]` sections | le défaut signalé |
| 734 | `[data-ctl="nav"]` missions | le défaut signalé |
| 1030 | `[data-ctl="opt"]` choix de thème | même défaut, non signalé |
| 1044 | `[data-toggle]` | même défaut ; sa barre d'accent gauche est arrondie aussi |
| 1056 | bouton `close` | même défaut |
| 698 | `[data-ctl="opts"]` | **à arbitrer, voir ci-dessous** |

Déjà carrés, et le restent : `[data-ctl="tl"]`, `[data-ctl="tech"]`, `[data-suggestion]`, la boîte de suggestions, le bouton `retry`, le lien « version texte », la pastille de compte, la pastille de thème, la bulle de la mascotte.

**L'exception** — `src/index.html:848`, `border-radius:50%` sur le point du bandeau. C'est un cercle, pas un coin. Déjà documentée dans le commentaire ligne 616-618. Elle reste.

## Le focus carré sur un élément arrondi

**Il n'y a pas d'incompatibilité, une fois la taxonomie appliquée.** Après le lot 1, tout élément focalisable de la page a un rayon nul. La règle `outline: 2px solid var(--acc)` dessine alors un contour carré partout, sans rien changer.

L'invariant s'énonce simplement, et il se teste :

&gt; **Focalisable ⇒ intérieur ⇒ carré.**

Si un jour un élément arrondi devait prendre le focus, les deux exigences deviendraient réellement incompatibles. Ni `outline` ni `box-shadow` ne savent ignorer le rayon. Le seul recours serait un `::after` en surcouche :
```
position:absolute; inset:-4px; border:2px solid var(--acc); border-radius:0
```
Je le déconseille. Il exige une classe, un hôte en `position:relative`, et il serait rogné par le `overflow:hidden` des cartes de gauche (lignes 702 et 725). Mieux vaut tenir l'invariant.

## L'arbitration à rendre à Benjamin

`[data-ctl="opts"]` — le bouton « options ». Il vit dans le volet gauche, hors des deux cartes, et il est habillé exactement comme une zone : bordure `--edge`, fond `--panel`, rayon. Mais il est focalisable.

Benjamin a listé « options » parmi les zones. Le mot peut désigner ce bouton ou la modale. **Je recommande : carré**, parce qu'il prend le focus, et que sa règle de focus est celle qu'il veut droite. À confirmer par lui, pas à trancher en silence.

## Deux divergences mineures, du même ordre

Elles ne sont pas des rayons, mais elles séparent les deux familles alors qu'elles devraient les rapprocher.

1. `[data-ctl="nav"]` porte `transition:background .18s,border-color .18s`. `[data-ctl="tl"]` n'en porte aucune. La sélection glisse d'un côté, claque de l'autre.
2. `.tm [data-ctl="nav"]:hover` existe (ligne 655). Aucune règle de survol pour `[data-ctl="tl"]`.

Le canvas dit « reprendre ce qui a été fait sur la partie parcours ». Si on suit cette phrase, le `transition` disparaît. À décider avec lui, dans le même lot.

---

# Recensement chiffré

Le brief annonce 168 statiques et 47 dynamiques. Le compte exact est **121 attributs `style=` statiques et 47 bindings `:style=`, soit 168 attributs en tout**.

## Côté statique — 121 attributs, 465 déclarations

| Mesure | Valeur |
|---|---|
| Attributs statiques | 121 |
| Déclarations portées | 465 |
| Valeurs distinctes | 91 |
| Valeurs répétées à l'identique | 11 motifs, couvrant 41 attributs |
| Attributs d'une seule déclaration | 31 |
| Attributs purement typographiques (couleur, marge, police) | 49 |

Les motifs répétés les plus rentables :

| Occurrences | Valeur |
|---|---|
| 10 | `color:var(--acc-text)` |
| 5 | `margin:0;color:var(--fg2)` |
| 5 | `color:var(--acc)` |
| 4 | `color:var(--ok)` |
| 3 | `display:grid;gap:8px` |
| 3 | `color:var(--fg2)` |
| 3 | `color:var(--edge)` |
| 2 | l'en-tête de zone, 6 déclarations |
| 2 | la liste de zone, 5 déclarations |
| 2 | le châssis de zone, 5 déclarations |
| 2 | `display:grid;gap:1px;min-width:0` |

## Côté dynamique — 47 bindings

| Sort | Nombre |
|---|---|
| Deviennent une classe ou une règle, sans binding résiduel | **36** |
| Gardent une part dynamique | **11** |
| dont réductibles à une propriété personnalisée | 3 |
| dont irréductibles, valeur possédée par le contenu ou mesurée | 8 |

Les 8 irréductibles, avec la raison :

| Binding | Valeur | Pourquoi elle reste |
|---|---|---|
| 20 | `padding-left:${line.pad}` | chaîne libre venue de `content.json` |
| 22 | `font-size / font-weight / letter-spacing` | trois chaînes libres venues de `content.json` |
| 23, 24 | géométrie du bandeau et `box-shadow` généré | le `box-shadow` est une liste de centaines de caractères, calculée |
| 26 | `height:${logHeight}px` | hauteur tirée par l'utilisateur, continue |
| 29, 30 | `left:${at}px` | position de la mascotte, réécrite à chaque `pointermove` |
| 38 | `grid-template-columns:${outKeyWidth}` | largeur mesurée par section |
| 43, 44 | `${entry.edge}` `${entry.bg}` `${entry.acc}` | palette d'un **autre** thème que celui appliqué |

Le cas 43/44 mérite un mot. Une classe par thème serait techniquement possible : `[data-theme-choice="noctis"] { --swatch-bg:#052c33 }`. Elle dupliquerait la palette dans un second endroit, à côté des blocs `.tm[data-theme=…]`. Le CSS ne sait pas lire les variables d'un thème non appliqué. **Garder en ligne, et écrire pourquoi.**

## Le critère qui décide

Ce n'est pas « statique contre dynamique ». C'est **qui possède la valeur**.

&gt; **Un `:style` devient une classe quand son interpolation est un prédicat sur un ensemble fermé d'états, et que cet état est lisible par un sélecteur.**
&gt; **Il reste en ligne quand l'interpolation est une valeur possédée par `content.json` ou par une mesure.**

Trois conséquences pratiques.

**1. Les sept états de sélection sont déjà lisibles.** Chaque élément dont le `:style` encode « sélectionné » porte déjà l'attribut ARIA correspondant :

| Ligne | Élément | Attribut déjà présent |
|---|---|---|
| 709, 732 | `[data-ctl="nav"]` | `:aria-current` |
| 778 | `[data-ctl="tl"]` | `:aria-selected` |
| 823 | `[data-ctl="tech"]` | `:aria-pressed` |
| 926 | `[data-suggestion]` | `:aria-selected` |
| 1028 | `[data-ctl="opt"]` | `:aria-pressed` |
| 1042 | `[data-toggle]` | `:aria-pressed` |

Zéro état nouveau à inventer. Le CSS lit ce que l'accessibilité expose déjà. C'est le levier le plus rentable du chantier.

**2. Les booléens de racine paient leur place.** `anim` apparaît dans 13 bindings, `running` dans 4, `power` dans 2. Une liaison `:data-anim="anim"` sur `.tm` les remplace tous les treize.

**3. Le ton est un ensemble fermé, la typographie ne l'est pas.** `src/interpret.ts:13` déclare `TONES = ["acc","fg","fg2","ok","warn"]`, et `safeTone` ramène toute valeur inconnue à `fg`. Un `data-tone` est donc sûr, même si `content.json` écrit n'importe quoi. En revanche `raw.size`, `raw.w`, `raw.ls` et `raw.pad` traversent sans filtre. Les figer en classes transformerait une valeur éditable sans redéploiement en valeur bloquée par un déploiement — exactement ce que CONTEXT.md et l'ADR 0002 refusent.

C'est la formulation la plus utile du critère pour ce projet : **une classe ne doit jamais fermer ce que `content.json` a le droit d'ouvrir.**

Détail heureux : `token()` dans `interpret.ts:399` ne produit que `"400"` ou `"700"`. Le `font-weight:${tk.w}` du binding 25 est donc un booléen déguisé, et il passe en classe.

---

# Les lots

Chaque lot laisse la page fonctionnelle. Chaque lot se vérifie seul.

## Lot 0 — le filet

Aucun changement de rendu. Trois tests neufs, dont un qui doit échouer.

**T1 · « aucun élément focalisable n'a de coin arrondi » — doit échouer au départ.**
Parcourt `button, input, a[href], [tabindex="0"]` visibles. Lit `getComputedStyle(node).borderRadius`. Attend `0px` partout. Échoue aujourd'hui sur cinq à six éléments. C'est ce test qui décrit le défaut.

**T2 · « les zones portent le rayon, et une seule variable les mène ».**
Remplace `layout.spec.ts:137`. Liste les six zones, attend `5px`, pose `--radius:0`, attend `0px`. Retire `[data-ctl='nav']` de la liste et le message « y compris les contrôles ».

**T3 · « une section sélectionnée se dessine comme un parcours sélectionné ».**
Compare `borderLeftWidth`, `borderLeftColor`, `backgroundColor`, `borderRadius` entre `[data-ctl="nav"][aria-current="true"]` et `[data-ctl="tl"][aria-selected="true"]`. Exprime la demande dans les mots de Benjamin.

**T4 · l'instantané de style calculé — à créer après le lot 1.**
Une trentaine de sélecteurs figés, un sous-ensemble de propriétés calculées, un `toMatchSnapshot`. Il transforme « 465 déclarations déplacées » en « le rendu calculé n'a pas bougé ». Sur trois thèmes au moins : `dark`, `light` (son `--acc-text` diffère) et un thème à `hue-rotate`.

Ne pas figer l'instantané avant le lot 1 : il gèlerait le défaut.

## Lot 1 — la bordure

Six déclarations. Aucun déplacement en classe.

Retirer `border-radius:var(--radius)` aux lignes 711, 734, 1030, 1044, 1056. Arbitrer 698. Corriger `layout.spec.ts` dans le même commit, sinon la suite est rouge.

Optionnel, à valider : aligner `transition` et `:hover` entre `nav` et `tl`.

T1, T2, T3 passent au vert. **Puis figer T4.**

Risque : nul côté construction, aucune règle `.slime` n'est touchée.

## Lot 2 — les états

Les sept éléments à `aria-*`. Déplacer **uniquement** les déclarations qui dépendent de l'état vers des règles `[aria-current="true"]`, `[aria-selected="true"]`, `[aria-pressed="true"]`. Le reste du binding devient un `style=` statique.

Supprime 14 bindings. Fusionne les deux blocs de 300 caractères strictement identiques des lignes 711 et 734 en une règle.

**Le piège du lot, et il est silencieux.** Un `style=` inline bat toujours un sélecteur d'attribut, quelle que soit sa spécificité. Si `border-left:2px solid transparent` reste dans l'attribut statique, la règle d'état ne s'appliquera jamais. La sélection disparaîtra sans erreur. Une relecture ne l'attrape pas ; T3 et T4 l'attrapent.

## Lot 3 — les animations

Poser `:data-anim="anim"` et `:data-power="power"` sur `.tm`. Remplacer les 13 `animation:${anim ? 'X' : 'none'}` par des règles statiques, plus :
```
.tm[data-anim="false"] * { animation: none !important }
```

Le précédent existe déjà, ligne 494, pour `prefers-reduced-motion`.

**Ne pas couper `transition`.** La règle de mouvement réduit coupe les deux ; celle-ci ne doit couper que l'animation, sinon les `x-transition` d'Alpine sur les suggestions changent de comportement à réglage `anim` désactivé. `autocomplete.spec.ts` le vérifie.

Le délai indexé du binding 32 devient `--at` en ligne, plus `animation-delay: calc(var(--at) * 24ms)` dans la règle.

## Lot 4 — les tons

`data-tone` sur les 11 porteurs de `var(--${…})`. Cinq règles. La correspondance `acc → var(--acc-text)` s'écrit **une fois** au lieu des six ternaires JavaScript identiques qui la répètent aujourd'hui.

Deux points de vigilance.

`sortie.spec.ts:146` sélectionne `span[style*="color"]` — un sélecteur sur la chaîne de l'attribut inline. Il casse, bruyamment, et se réécrit en `span[data-tone]`.

`item.dot` (bindings 3 et 7) vient de `app.js` et **ne passe pas par `safeTone`**. À vérifier avant, pas à corriger ici.

## Lot 5 — le châssis statique

Les 121 attributs statiques. Le plus gros volume, le plus mécanique. Zones (6), en-têtes de zone (3), listes de zone (2), les 49 attributs purement typographiques, les 11 motifs répétés.

**Le piège du lot : la cascade apparaît.** Aujourd'hui aucun conflit n'est possible, chaque élément porte son style. Après quarante règles, l'ordre du fichier décide. Une règle par élément, pas d'utilitaires qui se chevauchent.

## Lot 6 — savoir s'arrêter

Réduire les bindings restants à une propriété personnalisée **quand cela sert**.

À faire : le binding 38 devient `--out-key`.

**À ne pas faire :** les bindings 26 et 29/30. `layout.spec.ts:221` lit `node.style.height` sur `[data-journal]`, `mascotte.spec.ts:295` lit `node.style.left` sur la mascotte. Les convertir casse deux tests pour ajouter une indirection à une valeur réécrite à chaque `pointermove`. Les laisser, et écrire le POURQUOI en commentaire.

## Lot interdit — la mascotte

`src/app.js:749-751` :
```js
node.className = "slime";
void node.offsetWidth;
node.className = `slime slime--${state}`;
```

L'affectation écrase l'attribut entier. Toute classe ajoutée sur `[data-mascot]` disparaît au premier changement d'état, après avoir tenu une fraction de seconde. La remise à `"slime"` est délibérée : elle force un reflow pour rejouer l'animation.

Ne pas toucher cet élément. Le débloquer suppose de passer à `classList.remove/add` dans `app.js`, où un autre agent travaille en ce moment.

---

# Nommage

CONTEXT.md tranche : « Les documents parlent français. Le code parle anglais. » Les classes sont du code. Les noms sont anglais. Le précédent est `.tm`, `.slime`, `.skip`, et le `--` de `.slime--idle`.

**Ma recommandation principale : ajouter le moins de noms possible.** La page porte déjà un vocabulaire de crochets — `data-ctl`, `data-pane`, `data-result`, `data-journal`, `data-suggestion`, `data-timeline`, `data-tree`, `data-status`, `data-gauge`, `data-boot`, `data-opts`, `data-technote`, `data-track`, `data-handle`. Les règles de survol et de focus existantes s'appuient déjà dessus, et les tests aussi.

Le partage qui se défend en relecture :

- **Une classe pour ce qu'une chose *est*** : `.zone`, `.zone__head`, `.zone__list`.
- **Un `data-*` pour ce qu'une chose *fait* ou pour son état** : `[data-ctl]`, `[aria-current]`, `[data-tone]`.

Cela coûte trois noms nouveaux au lieu de quarante, ne casse aucun sélecteur de test, et se lit aussi bien.

## Termes manquants au glossaire — à signaler, pas à inventer

1. **Zone** — le mot est de Benjamin, « bordures de zone ». CONTEXT.md nomme les trois volets mais n'a aucun nom collectif pour les cartes, la modale et le cadre de démarrage. **C'est le terme central de cette demande. Il doit entrer au glossaire avant qu'une classe le porte.**
2. **Bordure intérieure / élément intérieur** — l'autre moitié de la distinction. Absent.
3. **Ton (`tone`)** — `TONES` existe dans `interpret.ts` depuis toujours, le glossaire l'ignore. Requis par le lot 4.
4. **Frise / entrée de parcours** — le code dit `timeline` et `timelineAt`, Benjamin dit « parcours », le glossaire définit **Mission** comme « une expérience professionnelle, présentée en fiche depuis le volet gauche ». Trois mots, trois choses proches. Benjamin a décrit ce défaut en utilisant les trois. **À trancher avant de nommer quoi que ce soit dans cette zone.**
5. **Bascule (`toggle`)** et **modale d'options** — présents dans le code et dans DECISIONS.md, absents du glossaire.

---

# Risques

**1. Le contrat de construction, silencieux dans un seul cas.**
`tools/build.ts:63` : `SLIME_RULE = /background-position: 0 0;\n/u`. La regex **n'est pas ancrée sur `.slime`**. Elle prend la première occurrence du fichier. Introduire `background-position: 0 0` dans une règle placée avant `.slime` injecterait l'image fusionnée au mauvais endroit, et le garde-fou `based === folded` ne verrait rien. La mascotte disparaîtrait dans `dist/` seulement, jamais dans `src/`.
Détection : `mascotte.spec.ts:37-40` lit `backgroundImage`. Il l'attrape, mais seulement si on lance la suite navigateur.

**2. Les autres garde-fous du build sont bruyants, eux.**
`SHEET_RULE` exige le format exact `background-image: url("…");\n&lt;indent&gt;background-size: N px N px;\n`. Le compteur `band !== files.length` jette. `SHEET_URL` balaye **tout le fichier**, attributs `style=` compris : aucun `sprites/slime-*.png` ne doit apparaître ailleurs. Bonne nouvelle : `.oxfmtrc.json` exclut `src/**/*.html`, donc aucun formateur ne reflowera ces neuf règles.

**3. La spécificité inline, lot 2.**
Un `style=` résiduel bat toute règle d'état. La sélection disparaît ou se fige. **Aucun message d'erreur.** T3 et l'instantané sont les seuls filets.

**4. `app.js:749` écrase `className`.**
Détaillé plus haut. Interdire l'élément `[data-mascot]` dans ce chantier.

**5. La minification CSS déplace le périmètre du risque.**
`MINIFY = { minifyCSS: true }` s'applique au bloc `&lt;style&gt;`, jamais aux attributs `style=`. Déplacer 465 déclarations les fait **entrer** dans le champ du minifieur, qui peut fusionner et réordonner. Un rendu correct dans `src/index.html` ne prouve plus le rendu servi.
**Ne jamais valider ce chantier en ouvrant `src/index.html` seul.** Le seam navigateur sert `dist/`, il vise déjà la bonne cible.

**6. Les huit thèmes.**
Un instantané pris sur `dark` ne prouve rien pour les sept autres. Les valeurs déplacées sont toutes en `var(--…)`, donc le risque est faible, mais `light` a un `--acc-text` distinct et quatre thèmes appliquent un `hue-rotate` à la mascotte.

**7. Le budget : aucun risque, chiffres à l'appui.**
Premier chargement mesuré à ~69 Ko compressés, pour un plafond de 150 Ko. `dist/index.html` fait 19,7 Ko gzippés. Trois kilo-octets de feuille de style en plus ne se voient pas après compression, et le balisage maigrit d'autant. `budget.spec.ts` reste le garde-fou, à lancer une fois en fin de chantier.

**8. Le rognage du contour de focus.**
Les cartes de gauche portent `overflow:hidden`. Le `&lt;ul&gt;` intérieur a `padding:5px`. Un contour de 2 px avec `outline-offset:2px` dépasse de 4 px. Il tient d'un pixel. **Ne pas réduire ce `padding:5px`.**

**9. `dist/` est la racine servie.**
Ne jamais lancer `bun run build` seul. `playwright test` construit dans `dist.test/` via `PORTFOLIO_DIST`. Toute vérification passe par `bun run test:browser`.

**10. La bascule de publication.**
L'ADR 0003 garantit qu'une construction ne publie qu'une version complète. Complète, mais pas forcément juste. Le filet est la suite navigateur, pas la construction.

**11. Les quatre couplages des tests à la représentation inline.**
Ce sont les seuls, je les ai cherchés exhaustivement :

| Fichier | Ligne | Couplage | Lot concerné |
|---|---|---|---|
| `layout.spec.ts` | 147 | affirme `[data-ctl='nav']` à `5px` | lot 1, obligatoire |
| `sortie.spec.ts` | 146 | sélecteur `span[style*="color"]` | lot 4, échec bruyant |
| `layout.spec.ts` | 221 | lit `node.style.height` | lot 6, raison de ne pas le faire |
| `mascotte.spec.ts` | 295 | lit `node.style.left` | lot 6, raison de ne pas le faire |

**12. Un trou d'accessibilité repéré au passage, hors périmètre.**
`.tm [data-ctl]:focus-visible` ne couvre que les `[data-ctl]`. Or `[data-journal]`, `[data-handle]` et la région de sortie ont `tabindex="0"` sans `data-ctl` : ils tombent sur le contour par défaut du navigateur. Et `input#cli` porte `outline:none` en ligne, sans remplacement. `a11y.spec.ts` compte les éléments atteignables, il ne vérifie aucun contour. À signaler à Benjamin, à traiter ailleurs.

---

# Ordre d'exécution recommandé

1. Arbitrer `[data-ctl="opts"]` et le sort de `transition` / `:hover` avec Benjamin.
2. Ajouter **Zone** et **Ton** à CONTEXT.md, trancher mission/frise/parcours.
3. Lot 0, tests T1 à T3 au rouge.
4. Lot 1, six déclarations, T1 à T3 au vert, `bun run test:browser`.
5. Figer T4 sur l'état corrigé.
6. Lots 2 à 5, un commit par lot, T4 vert à chaque fois.
7. Lot 6 réduit à `--out-key`, et le commentaire qui explique les trois refus.

### Critical Files for Implementation
- /home/benjamin/beta/portfolio/src/index.html
- /home/benjamin/beta/portfolio/tests/browser/layout.spec.ts
- /home/benjamin/beta/portfolio/tools/build.ts
- /home/benjamin/beta/portfolio/CONTEXT.md
- /home/benjamin/beta/portfolio/tests/browser/sortie.spec.ts
---

# Ce que la revue a trouvé

Une revue adverse a parcouru la branche et diffé le DOM calculé entre les deux révisions,
sur sept états d'interface. Elle a produit quinze constats. Tous vérifiés, tous vrais.

## Trois règles visaient plus large que leur cible

| Règle | Ce qu'elle attrapait en plus |
|---|---|
| `.tm a[href="texte.html"]` | Le lien du pied de page, qui n'a jamais porté de cadre. Le pied passait de 20 px à 44 px, et les trois volets perdaient 24 px de hauteur. |
| `.tm [data-pane="main"] > [aria-hidden="true"]` | L'indice « plus bas », qui sortait du flux et couvrait le volet à demi-opacité. Il faussait aussi le recensement de `logRoom()`. |
| `.tm[data-anim="false"] *` | Les sept lignes du démarrage. |

Les deux premières sont désormais portées par une prise propre, `[data-boot]` et
`[data-decor]`.

## Ma justification de la coupure d'animation était fausse

J'avais écrit que couper toutes les animations amenait la page là où
`prefers-reduced-motion` l'amenait déjà. **C'est faux.** Sous mouvement réduit, `app.ts`
met `BOOT_MS` et `FADE_MS` à zéro : il n'y a pas d'écran de démarrage à figer. Le réglage,
lui, laisse les minuteries entières — la coupure donnait un écran dessiné, figé trois
secondes, puis disparu en une image.

La coupure épargne le démarrage.

## Trois effacements de `display` par Alpine, pas un

`x-show` appelle `style.removeProperty("display")` à chaque affichage. J'en avais documenté
un, le volet de sortie, et affirmé que la géométrie ne bougeait pas. Il y en avait trois :

| Élément | Effet |
|---|---|
| `[data-pane="out"]` | `block` → `flex` |
| `<dl>` de la sortie | `block` → `grid`, son `gap:6px` inerte s'applique, la liste grandit de 36 px |
| `[data-handle]` | `block` → `flex`, `justify-content:center` s'applique, la poignée passe de gauche au centre |

Les trois sont l'intention d'origine qui reprend effet. Les trois sont mesurés et couverts.

## Deux survols dormaient, et l'un abîmait le contraste

Un style en ligne battait `.tm [data-ctl="opts"]:hover`. La règle vit depuis que le style a
quitté le balisage, et elle peignait le texte en ambre décoratif : **2,1:1 en thème clair**.
Elle prend l'ambre textuel, 5,2:1. Le cadre garde l'ambre décoratif, qui n'est pas du texte.

## Le glossaire définissait déjà **Ton**

Ma prémisse au lot 4 était fausse, et le message de commit la répétait. `CONTEXT.md`
portait l'entrée depuis toujours. Le doublon est retiré, et le seul fait qu'il ajoutait —
`acc` désigne l'ambre textuel — rejoint l'entrée d'origine.

## Le filet ne couvrait pas ce qu'il devait

Il manquait `animation-delay` et `grid-template-columns`, les deux propriétés que `--at` et
`--out-key` alimentent : on pouvait les casser sans qu'un instantané bouge. La modale se
mesurait réglage d'animation éteint, donc son `popIn` n'était jamais vérifié.

**Le filet compte désormais 27 tests.** Il a été pris sur la révision de base, puis
confronté à la branche : onze écarts, cinq causes, toutes ci-dessus.

## Le reste

`:data-power` n'était lu par personne. `--out-key` se recalculait une fois par ligne, en
O(N²), pour une valeur unique par section : il vit sur la liste. L'état sélectionné était
écrit trois fois à l'identique, et les trois boutons de la modale aussi. Deux commentaires
affirmaient un invariant que la branche détruit. 109 lignes avaient été réindentées par
accident, dont des métadonnées de `<head>` sans rapport.
