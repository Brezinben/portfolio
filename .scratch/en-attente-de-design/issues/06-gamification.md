# Gamification

Status: needs-info
Type: task

L'issue GitHub #2 porte le mot seul : « Gamification ». Rien d'autre.

**Ce ticket n'est pas prêt pour du design.** Un designer à qui on donne ce mot inventera
une réponse, et ce sera la sienne, pas celle de Benjamin.

## Ce qu'il faut savoir avant

Le site porte déjà plusieurs éléments qui pourraient s'agréger en jeu : les easter eggs,
la commande `cowsay`, la jauge, la mascotte et ses états, l'autocomplétion. Un Konami
code et un mode développeur sont demandés par ailleurs (voir
`.scratch/fonctionnalites/issues/01-raccourcis-clavier.md`).

## La question à poser à Benjamin

Qu'est-ce que la gamification doit **obtenir** ? Trois réponses possibles, et elles ne
mènent pas au même site :

1. **Faire rester** — la personne explore plus longtemps. Découvertes, progression,
   compteur de commandes trouvées.
2. **Faire comprendre** — la personne retient le parcours. Le jeu enseigne le CV.
3. **Faire sourire** — rien à gagner, juste des récompenses gratuites qui se croisent
   par hasard.

La troisième est la plus proche de ce que le site fait déjà. Les deux premières
demandent un état persistant, donc du stockage local et une décision de vie privée.

## Comments

**Benjamin** — « Aujourd'hui très peu de commandes sont faites dans le terminal. Les gens
cliquent à droite à gauche et ne vont jamais plus loin. **Donc tout ce qu'on implémente
n'est presque jamais utilisé.** Je me dis qu'il faut rajouter un élément visuel en bas, vu
que c'est là où il y a de l'espace, au niveau de la description de chaque commande : un
petit pixel art de trophée associé au thème, avec le "zéro sur X". Et le slime vient dire à
chaque fois qu'il y a un nouveau succès. Par exemple au premier clic sur une nouvelle
mission : "je pars à la découverte". Comme ça l'utilisateur voit qu'il a débloqué un truc,
il a envie de savoir combien il y en a, il voit le petit trophée, et peut-être que ça va le
pousser à chercher un peu plus. Cherche des skills de gamification, peut-être que ça
t'aidera. »

**Benjamin** — « J'aimerais bien qu'à l'arrivée sur le site, on logue quelque chose dans la
console, un petit Benjamin David. »

```
__________                   __               .__         ________              .__    .___
\______   \ ____   ____     |__|____    _____ |__| ____   \______ \ _____ ___  _|__| __| _/
 |    |  _// __ \ /    \    |  \__  \  /     \|  |/    \   |    |  \\__  \\  \/ /  |/ __ |
 |    |   \  ___/|   |  \   |  |/ __ \|  Y Y  \  |   |  \  |    `   \/ __ \\   /|  / /_/ |
 |______  /\___  >___|  /\__|  (____  /__|_|  /__|___|  / /_______  (____  /\_/ |__\____ |
        \/     \/     \/\______|    \/      \/        \/          \/     \/             \/
```

### Ce que cela tranche

La question posée dans ce ticket est répondue, et la réponse n'était dans aucune des trois
options proposées. **Le but est de faire découvrir ce qui existe déjà.** Le site porte des
commandes, des easter eggs et une mascotte que personne n'atteint. La gamification est un
panneau indicateur, pas un jeu.

Cela change tout le dimensionnement. Ce n'est plus « trop flou pour être cadré » : c'est le
ticket le mieux spécifié des six.

### Ce qui est demandé, en pièces

1. **Un compteur `0/X`** avec un trophée en pixel art, en bas, près de la description des
   commandes.
2. **Une annonce par la mascotte** à chaque nouveau succès. Elle a déjà une bulle et des
   états.
3. **Un état persistant.** Le compteur ne vaut rien s'il repart de zéro à chaque visite.
   `localStorage` porte déjà `bd-term-opts`. **Une décision de vie privée est à prendre :
   la page ne pose aucun cookie aujourd'hui, et `partage.spec.ts` le vérifie.**
4. **Une bannière ASCII dans la console** à l'arrivée.

### Ce qui reste à décider, et qui est du design

- Le dessin du trophée, et sa déclinaison sur les huit thèmes.
- La liste des succès, et le `X` du `0/X`. C'est le cœur : un succès trop facile ne
  récompense rien, trop dur ne se découvre jamais.
- Ce que dit la mascotte, et si elle le dit dans sa bulle ou dans le journal.
