# Entretien de contenu

Réponses brutes de Benjamin David, recueillies pour alimenter `src/content.json`.
Le texte vient de la dictée. Il garde les mots d'origine, y compris les hésitations
et les noms mal transcrits, corrigés en note.

Rien ne s'écrit dans `content.json` sans se trouver ici d'abord.

## Cadrage

- **Lecteur** : un recruteur technique. Il décide d'un entretien.
- **Message, dans l'ordre** : il fait de l'IA en prod → il livre du full stack solide →
  il code pour des gens réels.
- **Périmètre public** : tout sauf les noms de produits internes des clients.
- **Règle** : aucun fait inventé. Ce qui n'est pas dit ne s'écrit pas.

## Résumé de CV

> Je construis des applications qui rendent les outils internes vraiment utilisables, par les
> humains comme par les agents. Je conçois, j'orchestre, je livre : je travaille en
> spec-driven development, la spécification avant le code, et les agents produisent dans les
> contraintes que je pose.
>
> Huit ans de production, d'abord côté réseau, aujourd'hui autour de l'IA. C'est ma veille qui
> m'a permis de faire évoluer mon métier. Il bouge trop vite pour se reposer sur ce qu'on
> savait l'an dernier, alors j'apprends en permanence.
>
> Je suis attaché au numérique responsable. L'accessibilité, la performance et la qualité du
> code font partie de mes valeurs, pas d'une checklist de fin de projet : je les pose comme
> contraintes de développement dès le départ.

Texte déjà écrit, donné tel quel par Benjamin, et préféré à ce qui était en ligne.

## Kereis · 2026 → …

> En fait, on m'a demandé de venir là-bas pour réaliser des PoC, des preuves de concept
> liées à l'IA, car ils ont un besoin de tester des choses, c'est-à-dire qu'ils ont comme
> philosophie de construire plutôt que d'acheter. Du coup ils veulent tester des choses,
> au lieu de payer une licence très chère où ils utiliseraient très peu la feature. Et
> ça peut être intéressant de le faire soi-même quoi. Et vu que l'IA avec du
> Specification-Driven Development, ça permet de donner un cadre à l'IA pour qu'elle
> développe, et bah ça, ça aide pas mal.
>
> Et du coup moi j'étais pris parce que j'ai été bêta-testeur sur GitHub Copilot à
> l'époque, et je fais beaucoup de veille sur l'IA, les nouvelles technologies, et du coup
> je peux leur apporter pas mal de choses. Du coup je leur ai partagé les différents
> outils que j'utilise, que je veux d'ailleurs mettre à jour là dans la partie stack.
>
> En termes d'IA, du coup j'utilise forcément Claude pour le SpecKit, c'est GitHub
> SpecKit. Après je vais utiliser herdr. Je vais après utiliser des outils plutôt pour
> faire de l'agentique, comme LiteLLM, Langfuse ou LangGraph. Ça c'est des outils qui
> permettent de rendre conditionnels certains prompts, d'améliorer la qualité de l'agent,
> de faire des agents personnalisés.
>
> Et en même temps, du coup, mon avantage c'est que je garde ma philosophie, c'est que je
> garde cette qualité du code. C'est-à-dire que les premières specs que je fais, moi,
> c'est le linter, le cadrage très fort du code, car je me dis qu'un humain peut toujours
> aller voir et doit comprendre ce qui est fait.
>
> Et donc ce que j'ai fait au départ, le premier projet, c'est que j'ai dû faire un plugin
> sur ChatGPT pour faire un simulateur de tarif d'assurance de prêt. Du coup l'utilisateur,
> ce qu'il fait, c'est qu'il vient parler de manière naturelle — on lui envoie une première
> question — et avec ces informations on lui propose un premier tarif, il peut en proposer
> d'autres. Et du coup pour ça on utilise derrière du MCP. J'ai mis en place un MCP pour
> ChatGPT, et ce qui est assez intéressant c'est la partie autorisation, qui est en fait
> un peu la partie la plus spécifique.
>
> Ensuite j'ai fait des améliorations, du coup, attaché à l'équipe Urbanisme. C'est juste
> que c'était le plus simple en fait : je suis dans le pôle de la DSI et il n'y a pas
> d'équipe dédiée à ce que je fais, donc on m'a mis dans l'Urbanisme. Mais rien à voir,
> c'est pas eux à qui je rends compte. Mais du coup je les ai quand même aidés sur leur
> produit. Leur produit c'est une instance de Backstage qui permet de cartographier tout
> le SI : les briques logicielles, les déploiements, les bases de données, qui est le PO,
> qui est le responsable technique, qui est le responsable métier, sur quel environnement
> cette brique est déployée. Donc vraiment une cartographie.
>
> Du coup moi ce que j'ai fait c'est que j'ai branché des sources de données : j'ai branché
> de l'AWS, du Zeenea, j'ai amélioré les infos de GitLab, justement la remontée
> d'environnement. J'ai implémenté le MCP pour que des agents puissent s'y connecter et
> accéder à toute la donnée qu'on propose. Ensuite, classiquement, j'ai fait de la montée
> de version.
>
> Et le troisième sujet, c'est une application de compte rendu. Là ce qui est intéressant,
> c'est que quelqu'un vient expliquer sa réunion, et du coup je fais du nettoyage de texte,
> c'est-à-dire que j'enlevais tous les filler words. Et ensuite je vais commencer à générer
> des comptes rendus, donc c'est là où je vais utiliser LiteLLM, où je vais utiliser
> Langfuse. Générer un e-mail de compte rendu, après faire le suivi, lui proposer de
> préparer sa prochaine réunion. Donc tout ça c'est du contenu généré par des agents, donc
> ça s'appelle du harness engineering.
>
> Ce qui est prévu là pour la suite, au moment où je te parle, c'est de brancher sur des
> CRM pour remonter l'information. On génère les dernières actualités des clients : là,
> typiquement, je vais juste faire une requête sur Google News et après j'en fais un digest
> pour que ce soit plus synthétique pour la personne qui utilise.

Précisions demandées ensuite :

- Le nom du produit interne de cartographie ne se publie pas. On écrit
  « une cartographie du SI sous Backstage ».
- Outil transcrit « HERD » = **herdr**. Multiplexeur de terminal en Rust, qui suit
  l'état de plusieurs agents de code en parallèle.
- Source transcrite « Sinéa » = **Zeenea**. Catalogue de données.
- Sur le nom dans la stack : « Maintenant j'utilise Claude Code, Claude Design, donc je
  pense que tu peux mettre les outils Anthropic. Je veux dire que j'utilise tous les
  outils que je peux utiliser. » → une seule entrée `Claude`.
- « Harness engineering » entre dans la stack IA.
- Ce qu'un recruteur doit retenir : **il cadre l'IA au lieu de la subir.**

## SNCF Gares & Connexions · Assist'enGare · 2024 → 2026

> Pour Assist'enGare, je suis arrivé là-bas car j'aime bien la SNCF, et c'était une mission
> qui avait du sens : aider les personnes en situation de handicap, c'est important, ça
> nous reliait au réel.
>
> Qu'est-ce que j'ai fait là-bas ? J'ai développé des briques pour valider automatiquement
> des dossiers d'assistance. Qu'est-ce que j'ai fait d'autre ? De la montée de version, de
> la conception technique, j'ai aidé les autres à monter en compétence. J'ai remis en ordre
> le projet en termes de qualité de code, parce qu'il n'y avait pas trop de… le code était
> plutôt bon, mais il manquait de règles : rien n'empêchait de faire du mauvais code.
>
> Et ensuite c'était refaire, du coup côté front, la partie RGAA — comme tu le disais, on a
> subi plusieurs audits.
>
> Ensuite, toute la complexité c'est que notre brique doit échanger des informations avec
> tous les autres systèmes de la SNCF. Donc c'est immense, c'est une très grosse entité de
> la SNCF, du coup il y avait beaucoup de choses. En gros on devait prendre tout le
> spécifique et le rendre générique, notamment avec les notifications ActiveMQ. On a dû
> réécrire : nous on passait par de l'AMQP, on a dû passer sur le STOMP, qui est le
> sous-protocole. Et du coup j'ai chopé une bonne expertise sur le MQ.
>
> En gros la brique principale reçoit une notification, transforme l'entité métier en
> fonction, et la renvoie dynamiquement à la bonne brique. Et si une nouvelle notification…
> imaginons si c'était Trenitalia qui nous contactait, il faut communiquer qu'à Trenitalia.
> Mais si l'utilisateur a pris ce qu'on appelle un bi-segment, avec une demande d'assistance
> pour SNCF et une demande d'assistance pour Trenitalia, il faut tronquer en fait. Donc
> c'était assez complexe, donc ça c'était plutôt bien à faire.
>
> Et on a eu beaucoup de bande passante, c'est-à-dire que c'est très gros, donc on a
> beaucoup de demandes, donc il fallait que le code soit robuste, scalable, parce qu'on
> pouvait modifier le nombre d'instances, avoir de l'observabilité avec Datadog, faire du
> monitoring, du suivi d'informations.
>
> Et ensuite c'est un projet qu'on a fait évoluer pour qu'on l'intègre dans l'ère de l'IA,
> c'est-à-dire qu'on l'a fait évoluer en listant les bonnes pratiques, pour qu'il soit
> maintenable plus facilement.
>
> Et j'ai également aidé les autres équipes de mon pôle pour faire des migrations
> JavaScript vers TypeScript, pour rendre leur code plus maintenable, les conseiller aux
> besoins.

Sur l'accessibilité :

> Vu que c'était la partie exposée de notre service au grand public, sur un très grand
> site, c'était là où les gens pouvaient voir vraiment notre travail. Donc on pouvait faire
> des choses utiles sur une très grosse échelle.
>
> Typiquement, côté front, on a rajouté les règles axe, et pareil les règles de lintage,
> les bonnes pratiques. Mais en plus on avait toute la partie lecteur d'écran, donc on avait
> NVDA, TalkBack. La partie accessibilité sur les navigateurs. On pouvait rajouter des
> choses qui aidaient tous les utilisateurs, qui n'étaient pas RGAA on va dire : copier-coller
> automatiquement des éléments, bien vocaliser des marques, tout ce genre de choses.

Sur la pile :

> Côté front, c'était du React, avec les différents outils qui vont avec : pour le routing,
> on avait MUI. Ensuite côté back, effectivement, c'était du NestJS avec du PostgreSQL. Moi
> je suis beaucoup sur l'outillage : on avait fait de la migration d'ESLint vers Oxlint, et
> oxfmt à la place de Prettier. Ensuite ça tournait sur du Node.js, hébergé sur de l'AWS.
> J'étais amené à gérer les déploiements, on faisait ça sur Jenkins, et c'était hébergé sur
> GitLab. On avait une instance Atlassian pour la partie doc et ticketing, donc Jira et
> Confluence. Et du coup notre brique communiquait aussi avec Salesforce pour les échanges,
> mais ça, c'est pas important.

Corrections d'attribution qui en découlent :

- **Cypress** ne servait pas sur Assist'enGare, mais sur l'autre projet du pôle.
- **GitLab CI** reste : les intégrations existaient, en tandem avec Jenkins.
- **Vue.js** à la SNCF : c'était l'autre projet, côté agent et non grand public. Benjamin
  est intervenu pour les aider sur la migration Vue 2 vers Vue 3, qu'il avait déjà faite.

Chiffres publiables :

- **96 %** de conformité moyenne au RGAA 4.1, d'après la déclaration d'accessibilité
  publique d'Assist'enGare.
- **~3 000 dossiers par jour**, environ dix notifications par dossier, davantage pendant
  les vacances.

Ce qu'un recruteur doit retenir : **l'accessibilité tenue sous audit.**

## Transway · 2021 → 2023

> Donc Transway, c'était la première mission hors alternance. Je suis arrivé là-bas pour
> travailler sur le produit qui techniquement s'appelle V2, et son nom c'était Ireby Pro.
> Donc c'était pour faire du FMD, forfait mobilité durable. Et du coup c'était un
> formulaire où on venait déclarer ses différents trajets. C'était fait avec du Laravel et
> du Vue.
>
> Ensuite je suis passé sur V3, donc là c'est juste une suite qui s'appelle également
> Ireby. Le premier était à destination des entreprises, et là c'était à destination des
> collectivités. Tu peux regarder sur ireby.fr, ça explique ce qu'ils font.
>
> Et là du coup on avait des branchements à faire avec les systèmes informatiques des
> différents partenaires. Par exemple on avait TCL pour le transport à Lyon, il me semble,
> ou la STAR pour Rennes.
>
> Il y avait une partie de migration entre V1 et V3. Du coup là en l'occurrence, c'est moi
> qui l'ai fait. C'est un script qui venait migrer de la donnée avec de la transformation
> de données : il fallait migrer des users, des offres, les images, différents services.
> Ça c'était ma partie.
>
> Puis après, tous les jours on avait des crons qui faisaient l'ajout de points. Parce que
> V3 c'est une brique de fidélité où les utilisateurs se connectent et pouvaient gagner des
> points en se déplaçant, via le tram ou le bus de la commune du client. Et avec ces
> points-là ils pouvaient acheter des offres sur notre boutique. Du coup tous les jours on
> avait un système de points qui venaient récompenser l'utilisateur.
>
> Ensuite on avait un troisième projet où là je n'ai pas trop travaillé, parce que je suis
> arrivé plus tard : c'était WeFlo. C'est une application mobile qui était branchée avec la
> V3, donc qui avait quand même une partie interconnexion. Mais je crois que ça a évolué
> depuis.
>
> Et j'étais passé Tech Lead pour justement uniformiser la qualité du code, avoir la main
> sur les choix techniques qui sont faits.
>
> En termes de techno : V2 c'était du Laravel, du Vue.js et du PHP derrière. Et V3 c'était
> du NestJS avec du Vue 3 — on a fait une migration. Il y avait toute une partie
> configuration de l'interface de l'utilisateur : on crée depuis l'admin, on pouvait
> configurer la vue du client, et la page elle était générique. On avait fait des
> renforcements de sécurité suite à des audits, des migrations de Node par exemple.

Sources publiques données par Benjamin : <https://ireby.fr/> et
<https://www.transway.fr/produits>.

Le catalogue Transway de 2026 nomme les produits **WeFlo l'appli**, **WeFlo Pro**,
**IREBY — Incitation et Fidélité**, **IREBY.SHOP**, **Covoit.net** et **QRCode-NFC**.
La marque a bougé depuis 2023 : ce que Benjamin appelle « Ireby Pro » pour les
entreprises correspond au produit aujourd'hui nommé WeFlo Pro. À trancher avant
publication.

Tranché : on emploie les noms du catalogue d'aujourd'hui, pour qu'un lecteur retrouve
les produits en ligne. V2 devient WeFlo Pro, V3 devient IREBY, le mobile devient WeFlo.

Chiffres publiables :

- **4 à 6 développeurs** encadrés comme lead technique.
- **Plus de 300 000 utilisateurs** migrés de la V1 vers la V3, avec leurs offres et
  leurs images.

Ce que le rôle de lead a changé, d'après Benjamin : **l'encadrement des développeurs.**
Pas la migration Vue 2 vers Vue 3 ni les renforcements de sécurité, qui restent du
travail de développement.

## digital4better · équipe RUN · 2023 → 2024

> Du coup pour fruggr, je suis arrivé là-bas et j'ai d'abord intégré l'équipe. Alors déjà,
> c'est pas l'entreprise : c'est digital4better, avec un 4 pour le « for ».
>
> Ensuite du coup j'ai rejoint l'équipe RUN, où je me suis occupé de plusieurs projets.
> Des projets qui s'appelaient Body Nature, Dorval, PiLeJe, Servier. Et du coup je
> m'occupais de la maintenance, des montées de version. Pour Body Nature, ça pouvait être
> des évolutions. J'étais en échange avec l'équipe produit, c'est avec eux que je
> travaillais le plus.
>
> Et ensuite du coup j'étais envoyé à la SNCF. Mais je dirais pas que j'étais chez fruggr,
> je dirais plus que j'étais chez digital4better, donc tu peux modifier le contenu.
> Hésite pas à me poser des questions sur ce que j'ai pu faire côté service.

Sources publiques données par Benjamin : <https://digital4better.com/>,
<https://www.pileje-factory.com/fr>, <https://body-nature.com/>,
<https://www.dorval-am.com/>.

**Correction structurante :** l'employeur est digital4better. `fruggr` est leur produit
de mesure d'impact, pas la société. Toutes les mentions « via fruggr » du portfolio
sont à revoir, y compris sur Kereis et la SNCF.

## Réponses du 2026-09-24

Réponses de Benjamin aux questions de fidélité de la revue critique
(`.scratch/revue-critique/issues/04-texte-fidele.md`).

- **Revue de spec par l'IA** : pas de durée chiffrée. Le « ~20 min » part.
- **RUN chez digital4better** : supervision, Ansible et optimisation CI/CD sont vrais.
- **LDC Services et FPEE Industries** : un seul fait sûr, l'alternance en parallèle du
  BTS SIO SISR. Rien d'autre tant que la dictée manque.
- **IREBY** : le tram, le bus, la marche et le vélo sont vrais.
- **Vue.js et Pinia** : chez Transway, pas chez Kereis.
- **Pair-programming** : chez Kereis.
- **Cypress** : chez Transway. Aucune mission n'a de parcours de réservation.
- **Kereis en 2026** : des preuves de concept, pas de production.
- **Mascotte** : « le slime » dans les messages, « la mascotte » dans les réglages. Le
  terminal vouvoie, le slime aussi.
- **Rôle chez Transway** : « Full Stack, puis tech lead ».
- **Titre du site** : « Benjamin David · Développeur IA & Full Stack ».
- **Libellés de l'interface** : ils restent en anglais, comme un terminal. Ils portent
  `lang="en"`.

## LDC Services · 2020 → 2021

À recueillir. Aucune fiche mission aujourd'hui.

## FPEE Industries · 2018 → 2020

À recueillir. Aucune fiche mission aujourd'hui.

## Reste à faire

- Les sections `parcours` et `stack` n'ont aucune ligne dans le volet central.
- Reporter tout le contenu révisé dans `src/texte.html` et `src/llms.txt`. Ces deux
  artefacts écrivent les mêmes faits en dur et portent encore « via fruggr »,
  « équipe Urbanisme » et les anciennes fiches mission.
- Passer le `humanizer` sur tout le texte écrit, en dernier.
