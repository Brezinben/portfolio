# Mode impression propre et mode hors ligne

Status: resolved
Type: task

Deux lignes de l'issue GitHub #2, fusionnées : toutes deux se règlent dans la page servie,
sans design nouveau.

## Le mode impression

« Mode "impression" propre ». Le dépôt a déjà la bonne réponse sous la main :
`src/texte.html` est la version texte, une colonne, serif, aucune image, aucun script,
aucune animation. C'est une page à imprimer.

Deux chemins :
1. Une feuille `@media print` sur `index.html` qui cache les volets et déplie le contenu.
2. Rediriger l'impression vers `texte.html`, qui est déjà propre.

Je recommande le premier : le second surprend, et une personne qui imprime la page
terminal s'attend à imprimer ce qu'elle voit. Mais `texte.html` donne la cible visuelle.

Vérifier au passage que `texte.html` s'imprime bien lui aussi.

## Le mode hors ligne

« Offline mode avec indication claire ». Deux choses distinctes :

1. **Détecter la perte de réseau** — `navigator.onLine` et les événements `online` /
   `offline`. C'est peu de code.
2. **L'indication claire** — le volet de sortie a déjà un indicateur d'état, un point et
   un libellé, avec `--ok` et `--warn`. Il sert de précédent.

Le site est statique : une fois chargé, il fonctionne hors ligne, sauf pour les
commandes qui partent ailleurs (`/share`, les liens). **C'est cela que l'indication doit
dire** : pas « vous êtes hors ligne », mais « ces commandes-là ne marcheront pas ».

Un service worker rendrait le site rechargeable hors ligne. Ce n'est **pas** demandé, et
cela ajoute un cycle de vie de cache à gérer. Ne pas le faire sans décision explicite.

## Vérification

Un test qui imprime en PDF via Playwright et vérifie que les trois volets ne s'empilent
pas en pages vides. Un test qui simule `offline` via le contexte Playwright.


## Réponse

**Le ticket groupait mal.** L'impression est du travail de feuille de style, le hors ligne
est du comportement. Ils ne partagent ni fichier, ni test, ni base de branche.

Le hors ligne est fait ici. **L'impression part avec la refonte CSS**, parce qu'elle en
dépend : sur `main`, `index.html` porte encore 169 attributs de style en ligne, et
**aucune requête de média ne bat un style en ligne**. Une feuille d'impression y serait un
mur de `!important`, qui deviendraient du bruit dès la refonte fusionnée.

### Ce qui est fait

`navigator.onLine`, plus les événements `online` et `offline`. L'API ne promet pas
l'internet, seulement une interface active : elle dit « hors ligne » sans se tromper, et
« en ligne » avec optimisme. C'est le sens utile ici, puisque la page ne s'en sert que pour
refuser une commande vouée à l'échec.

L'indication suit la demande du ticket. Elle ne dit pas « vous êtes hors ligne », elle dit
**quelle commande ne marchera pas, et laquelle marche encore** :

| Commande | Sans réseau |
|---|---|
| `share linkedin`, `share profil`, `share github` | refusée, renvoie vers `share link` |
| `/propose` | refusée, renvoie vers `mail` |
| `/slime` | refusée, la mascotte dort |
| `share link`, `mail`, la navigation, les autres easter eggs | inchangées |

Un marqueur `hors ligne` en `--warn` entre dans la barre d'état, à côté de la branche.

### La mascotte dort

Le réseau coupé, la mascotte joue `sleep` en boucle et rien ne la réveille : ni la souris,
ni la frappe, ni un clic, ni un glisser. Elle reprend son repos au retour du réseau.

La coquille le dit à l'interpréteur par une quatrième valeur de `mascot`, `asleep`, à côté
de `away` et `busy`. Le refus vit donc dans le seam pur, comme les deux autres, et non dans
la coquille.

Deux gardes valent leur ligne. Le sommeil traverse `mascotPlay()`, qui refuse toute autre
feuille. Mais `wander()`, `grab()` et `poke()` agissent hors de ce point de passage : sans
leur propre refus, la mascotte glisserait encore sur sa piste, et le cinquième clic la
ferait exploser sans feuille à jouer.

`/pet` part avec ce lot. Il faisait doublon avec `/slime`, beaucoup plus complet. Ses deux
alias, `cat` et `mascotte`, pointent maintenant sur `/slime`. Le menu du slash passe de
onze entrées à dix, soit exactement ce qu'il affiche.

**Aucun service worker.** Le ticket le déconseille, et il ajouterait un cycle de vie de
cache à tenir pour un site qui tient déjà en mémoire une fois chargé.
