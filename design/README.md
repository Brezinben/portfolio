# Portfolio Benjamin David

Portfolio personnel de Benjamin David, développeur IA et Full Stack à Nantes.
Trois variantes du même contenu, une source de données commune.

Domaine cible : `https://portfolio.brezinben.dpdns.org/`

---

## Fichiers

| Fichier | Rôle |
|---|---|
| `Portfolio Benjamin David - Terminal.dc.html` | **Version principale.** Interface terminal à trois volets, pilotée au clavier. |
| `Portfolio Benjamin David.dc.html` | Version illustrée : page longue, animations SVG par mission, cartographie technique interactive. |
| `Portfolio Benjamin David - Texte.dc.html` | Version texte : une colonne, serif, aucune image, aucun script, aucune animation. |
| `content.json` | Contenu de la version terminal : sections, missions, frise, stack, fiches techno, blagues, partage, retour utilisateur. |
| `llms.txt` | Résumé structuré pour les crawlers d'IA (format standard). |
| `share.png` | Vignette de partage 1200×630 (capture du terminal), référencée en `og:image`. |
| `support.js` | Runtime des Design Components. Ne pas modifier. |

Chaque `.dc.html` s'ouvre directement dans un navigateur, sans build.

---

## Déploiement

Servir à la racine du domaine :

```
index.html          ← copie de « Portfolio Benjamin David - Terminal.dc.html »
content.json
share.png
support.js
llms.txt
Portfolio Benjamin David.dc.html
Portfolio Benjamin David - Texte.dc.html
```

`content.json` est chargé par `fetch` relatif — il doit être au même niveau que la page.
Sans lui, la page reste bloquée sur son écran de chargement (voir « États de démarrage »).

`share.png` doit être accessible à `https://portfolio.brezinben.dpdns.org/share.png`
pour que la vignette LinkedIn fonctionne.

---

## La version terminal

### Structure

Trois volets côte à côte, qui se replient en colonne sous 900 px :

- **Gauche** — bouton options, liste des six sections, liste des quatre missions.
- **Centre** — commande en cours de frappe, sortie de la section, journal des commandes, mascotte, ligne de saisie, barre d'état.
- **Droite** — volet de sortie contextuel : contenu différent pour chaque section (`git log`, `resolve`, budget de la page, `http`…).

### Sections

`whoami` · `parcours` · `stack` · `impact` · `formation` · `contact`

Quatre fiches de mission : `m-kereis` · `m-assist` · `m-run` · `m-transway`

Chaque section et chaque mission a son ancre (`#parcours`, `#m-kereis`) : lien direct partageable, bouton retour du navigateur fonctionnel.

### Rendus spécialisés

- `parcours` — frise navigable au clavier, entrée sélectionnée en gras avec barre d'accent, Entrée ouvre la fiche de mission.
- `stack` — arbre à trois niveaux ; chaque techno ouvre une fiche détaillée dans le volet de droite.
- `contact` — sortie `jq` colorée (clés en ambre, valeurs par type), avec `/send-mail` préchargé dans la saisie.

### Commandes

**Navigation** — `ls` · `cd <section>` · `<section>` directement

**Contenu** — `ask <question>` (recherche locale) · `ai` (état du modèle local Chrome) · `cv` · `email` · `send-mail` · `share [cible]` · `propose <idée>`

**Interface** — `theme` · `options` · `clear` · `reboot` · `shutdown`

**Easter eggs** — `joke` · `cowsay <texte>` · `sudo` · `coffee` · `vim` · `pet` · `slime expression <nom>` · `slime activity <nom>` · `slime evolve` · `slime drop` · `slime kill` · `matrix` · `benjamin`

`help` liste tout. Tab complète (préfixe commun, puis candidats), ↑ ↓ rappellent l'historique.

### Clavier

| Touche | Action |
|---|---|
| `←` `→` | changer de volet |
| `↑` `↓` | parcourir le volet courant |
| `j` `k` | changer de section |
| `/` | cibler la ligne de saisie |
| `Tab` | compléter la commande |
| `Échap` | vider la saisie, annuler une proposition |
| `Entrée` | valider, ouvrir une fiche |

Dans la modale options : `←` `→` changent la valeur du réglage, `↑` `↓` passent d'un réglage à l'autre, `Tab` change de groupe, `Échap` ferme et rend le focus.

### La mascotte

Slime pixel dessiné en `box-shadow` (24 × 18 pixels de 2,6 px), sans image.

- Respire, cligne des yeux à intervalles irréguliers, arpente sa piste et se cogne aux parois.
- Réagit à la vitesse du curseur (déformation élastique).
- Se laisse attraper et déplacer à la souris.
- Sept humeurs : `idle` `happy` `laugh` `sad` `scared` `sleep` `alert` — pilotables par `slime <humeur>`.
- **Couronne** : après 26 clics (année courante − 2000), elle lui tombe sur la tête. Conservée sur l'appareil.

### Options (modale)

Thème (8 palettes), taille du texte (3 crans), animations, volet de sortie, densité des lignes.
Tout est conservé dans `localStorage` sous la clé `bd-term-opts`.

Thèmes : `dark` `light` `noctis` `azureus` `uva` `bordo` `lux` `hibernus`.
Le changement se propage en cercle depuis le point cliqué (View Transitions API).

### États de démarrage

1. **boot** — journal système pendant 2 s minimum, barre de progression.
2. **attente** — si `content.json` n'est pas encore là, le boot reste affiché.
3. **échec** — panique Go (`panic: content.json not found`, stack trace, cause), bouton `retry`, lien vers la version texte.
4. **fade** — fondu croisé de 620 ms, la mascotte tombe dans son bac.

### Redimensionnement

Le journal des commandes est redimensionnable au glisser (poignée `⋯`) entre 44 px et la place disponible. Hauteur conservée sur l'appareil, bornée à chaque redimensionnement de fenêtre.

---

## Modifier le contenu

Tout le contenu de la version terminal vit dans `content.json`. Le fichier est lu au chargement, aucun build n'est nécessaire.

```json
{
  "share":    { "url", "title", "text", "targets": [{ "id", "label", "kind", "url" }] },
  "feedback": { "tool", "event", "umamiHost", "websiteId", "fallbackEmail", "sent", "notSent" },
  "sections": [{ "id", "label", "sub", "cmd", "lines": [], "out": {}, "paragraphs": [] }],
  "details":  [{ "id", "label", "parent", "cmd", "lines": [], "out": {} }],
  "timeline": [{ "id", "years", "org", "role", "note", "detail" }],
  "stack":    [{ "id", "label", "note", "kids": [] }],
  "techNotes": { "<techno>": { "where", "what", "why" } },
  "jokes":    []
}
```

**Types de ligne** (`lines[]`) :

- `{ "m", "mc", "t", "tone" }` — puce, couleur de puce, texte, ton
- `{ "jq": ["indent", "clé", "valeur", "type"] }` — paire clé/valeur colorée
- `{ "jqOpen": ["indent", "clé"] }` — ouverture d'objet
- `{ "jqLine": ["indent", "texte"] }` — ponctuation brute
- `{ "pre": true }` — préformaté, espaces conservés (art ASCII)
- `{ "size", "w", "ls", "pad" }` — taille, graisse, interlettrage, retrait

**Tons disponibles** : `fg` `fg2` `acc` `ok` `warn`

`share.targets[].kind` vaut `intent` (page de partage), `open` (nouvel onglet) ou `copy` (presse-papiers).
Les jetons `{url}`, `{title}`, `{text}` sont substitués.

Les deux autres variantes ont leur contenu écrit en dur — elles doivent être mises à jour à la main.

---

## Mesure d'audience

Umami auto-hébergé, sans cookie ni identifiant.

```html
<script defer src="https://umami.brezinben.dpdns.org/script.js"
        data-website-id="0afaa975-9528-4eac-84a2-9452a9ee607c"></script>
```

### Plan de marquage

| Événement | Propriétés | Ce que ça mesure |
|---|---|---|
| `section` | `id`, `label` | section consultée |
| `mission` | `id`, `label` | fiche de mission ouverte |
| `techno` | `nom` | fiche techno ouverte |
| `commande` | `cmd` | commande tapée |
| `commande_inconnue` | `cmd` | ce que les visiteurs cherchent sans trouver |
| `ask` | `requete`, `resultats` | recherches et taux de réponse |
| `easter_egg` | `nom` | joke, cowsay, sudo, coffee, vim, pet, matrix, slime, nom |
| `couronne` | `clics` | visiteurs allés jusqu'aux 26 clics |
| `slime_glisse` | — | mascotte attrapée (une fois par session) |
| `slime_choc` | — | mascotte cognée contre une paroi |
| `theme` | `id`, `label` | palette choisie |
| `option` | `nom`, `actif` | réglage modifié |
| `options_ouvertes` | — | ouverture de la modale |
| `journal_redimensionne` | `hauteur` | usage de la poignée |
| `contexte_plein` | — | jauge de contexte saturée |
| `partage` | `cible` | canal de partage utilisé |
| `proposition_consentement` | — | consentement demandé |
| `proposition_refusee` | — | consentement refusé |
| `proposition` | `message` | contenu de la proposition |
| `boot_termine` | `ms` | durée réelle du démarrage |
| `boot_echec` | `raison` | JSON non chargé |
| `ai_diagnostic` | — | commande `ai` lancée |

Le marquage passe par un helper silencieux : si Umami est absent, bloqué ou en erreur, rien ne casse.

### Commande `propose`

Consentement explicite en deux temps. La commande affiche ce qui part (le texte, rien d'autre), la destination, et ce qui ne part pas. Rien n'est envoyé avant un `oui`.

Trois chemins, dans l'ordre : `umami.track()` si le script est chargé → POST sur `/api/send` → `mailto:` en dernier recours.

**Réserve** : Umami est un outil de mesure. Le texte arrive dans les propriétés d'un événement, pas dans une boîte de réception — il faut aller le lire dans le tableau de bord.

---

## Accessibilité

- Contraste vérifié sur les huit thèmes, cibles de 44 px minimum.
- Navigation clavier complète, focus visibles partout, `aria-*` sur tous les contrôles.
- `prefers-reduced-motion` et `prefers-color-scheme` respectés.
- Barres de défilement masquées (esthétique terminal) mais remplacées par un indicateur `▾ plus bas` sur chaque volet — le défilement reste fonctionnel à la molette et au clavier.
- Aucune image, aucune vidéo, aucun cookie, une seule famille de police.

**Point ouvert** : sur le thème `light`, l'accent `#e6a000` donne environ 2,2:1 sur le fond clair. Correct pour les pastilles et les traits, insuffisant pour du texte. À corriger si le thème clair doit servir de défaut.

---

## Design

**Palette de départ** : `#F5B83B` (ambre) · `#242538` (nuit) · `#fff6f6` (blanc rosé)

**Police** : JetBrains Mono, ligatures désactivées (`liga`/`calt` à 0) — sans quoi les `----` de l'art ASCII se recomposent en traits continus.

**Contraintes d'écriture** : styles inline uniquement, sauf ce qui ne peut pas l'être (`@keyframes`, `@font-face`, réinitialisations, masquage des barres, `box-sizing`). Pas de classe CSS, pas de feuille de style de composants.

---

## Reste à faire

1. Contraste de l'accent sur le thème `light` (voir ci-dessus).
2. Liseré de focus au clic souris — le restreindre à `:focus-visible` pour qu'il n'apparaisse qu'au clavier.
3. Vérifier le pseudo GitHub : `github.com/brezinben` est une déduction depuis le domaine, présente dans `share` et dans la fiche contact.
4. Synchroniser la version texte et `llms.txt` : ni l'un ni l'autre ne mentionne Umami, et leurs formulations d'impact diffèrent de celles du terminal.
5. Déployer `share.png` à la racine du domaine.
6. Tester la commande `ai` avec un modèle local Chrome activé (`chrome://flags/#optimization-guide-on-device-model` et `#prompt-api-for-gemini-nano`).

---

## Contact

Benjamin David — benjamin.david1@hotmail.fr
LinkedIn : in/benjamin--david
