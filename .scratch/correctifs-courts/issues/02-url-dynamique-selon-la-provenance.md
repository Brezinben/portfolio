# Rendre l'URL dynamique selon la provenance

Status: needs-info
Type: task

## Ce qu'on observe

`me.brezinben.dpdns.org` est écrit en dur à sept endroits :

| Fichier | Emplacement |
|---|---|
| `src/robots.txt` | `Sitemap:` |
| `src/sitemap.xml` | deux `<loc>` |
| `src/content.json` | `identity.website` |
| `src/content.json` | la commande d'exemple `curl -s me.brezinben.dpdns.org/contact` |
| `src/content.json` | deux fois dans les sorties de commande |

## Ce qui reste à préciser

Benjamin a écrit « en fonction de d'où on vient, dans le JSON dans le SIO et dans
l'interface (commandes, retour...) ». Trois questions avant d'écrire une ligne :

1. **Quels domaines ?** Un seul autre, ou une liste ? Le dépôt n'en connaît qu'un.
2. **Le SEO se résout à la construction ou à l'exécution ?** `sitemap.xml` et `robots.txt`
   sont des fichiers statiques. Un moteur les lit sans JavaScript. Une URL dynamique à
   l'exécution n'y est pas possible : il faut une variable de construction.
3. **L'interface se résout à l'exécution ?** `location.host` suffit pour les commandes et
   les sorties, mais `content.json` est éditable sans redéploiement — y mettre un jeton
   de substitution change son contrat.

Ma lecture : deux mécanismes distincts, et pas un seul. Une variable de construction pour
les trois fichiers de SEO, et `location.host` pour l'interface. À confirmer.

## Comments

**Benjamin** — Deux domaines : `https://me.brezinben.dpdns.org/` et
`https://benjamindavid.dpdns.org/`.

**Benjamin** — « il faut juste que ça soit cohérent avec ce qui est affiché partout dans
le site, du titre au JSON et dans le contenu. »

### Ce que cela tranche

La question 1 est close : deux domaines, pas une liste ouverte.

La question 3 se reformule. La demande n'est pas « lire `location.host` » mais **« aucune
adresse affichée ne doit contredire celle d'où la page vient »**. C'est plus large : le
titre, `content.json`, les sorties de commande et le SEO doivent dire la même chose.

Une moitié est déjà faite sans que le TODO le sache : `src/app.ts` pose
`this.share.url = location.origin + location.pathname` depuis le commit `2419a1b`. La
commande `/share link` copie donc déjà l'adresse de provenance.

La question 2 reste entière : `sitemap.xml` et `robots.txt` sont lus sans JavaScript. Ils
demandent une variable de construction, et **une construction par domaine**.
