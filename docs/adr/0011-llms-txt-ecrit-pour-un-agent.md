# 11. Deux fichiers llms écrits pour un agent, mesurés par des questions

**Statut :** acceptée

## Le problème

`llms.txt` et `llms-full.txt` ont un seul lecteur : un agent qui répond à une question sur
Benjamin. Un agent lit tout, mais une phrase qui ne porte aucun fait lui coûte des tokens et
dilue ce qu'il cherche. Sans mesure, rien ne dit si les fichiers servent ce lecteur.

## La décision

**`llms.txt` est la fiche courte.** Elle répond seule aux questions que posent presque tous
les agents : qui, quel métier, disponible ou non, comment contacter, quels domaines. Pour le
reste, elle renvoie à `llms-full.txt`. Elle suit la grammaire de llmstxt.org, tenue par
`tests/unit/agents.test.ts`.

**`llms-full.txt` est la référence complète.** Elle porte tous les faits de `content.json`,
rangés pour la recherche : une puce par fait, des titres stables, le nom de l'organisation
et les dates sous chaque titre d'expérience. Les notes, les lieux, le contact et le cursus de
`content.json` s'y recopient mot pour mot : `agents.test.ts` le vérifie.

**Aucun des deux fichiers ne garde une phrase qui n'aide pas à répondre.** Ils disent ce que
le site ne fournit pas (pas d'API, pas de serveur MCP), parce qu'un agent le demande ; ils ne
le justifient pas.

**Une mesure garde le cadre.** `evals/llms/promptfooconfig.yaml` pose vingt-deux questions,
chacune une fois par fichier : un modèle répond avec ce seul fichier, un modèle juge la
réponse. `bun run eval:llms` la lance. Trois questions portent sur un fait absent (tarif,
télétravail, Kubernetes) : la bonne réponse est « le document ne le dit pas ». Une question
porte sur une négation : le site n'expose ni API ni serveur MCP.

La mesure appelle un modèle à chaque lancement. La CI ne la lance pas. On la lance après
toute réécriture de ces fichiers.
