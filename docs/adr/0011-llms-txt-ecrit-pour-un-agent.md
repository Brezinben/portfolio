# 11. Deux fichiers llms écrits pour un agent, mesurés par des questions

**Statut :** acceptée

## Le problème

`llms.txt` et `llms-full.txt` ont un seul lecteur : un agent qui répond à une question sur
Benjamin. Les premières versions étaient écrites pour un humain : une présentation, des
phrases de transition, des avertissements sur ce que le domaine n'héberge pas. Un agent lit
tout, mais une phrase qui ne porte aucun fait lui coûte des tokens et dilue ce qu'il cherche.

Aucune mesure ne disait si les fichiers servaient leur lecteur.

## La décision

**`llms.txt` est la fiche courte.** Elle répond seule aux questions que posent presque tous
les agents : qui, quel métier, disponible ou non, comment contacter, quels domaines. Pour le
reste, elle renvoie à `llms-full.txt`. Elle suit la grammaire de llmstxt.org, tenue par
`tests/unit/agents.test.ts`.

**`llms-full.txt` est la référence complète.** Elle porte tous les faits de `content.json`,
rangés pour la recherche : un fait par ligne, des titres stables, le nom de l'organisation
et les dates sur chaque ligne d'expérience. Un agent qui ne lit qu'un extrait doit y trouver
le fait avec son contexte.

**Aucun des deux fichiers ne garde une phrase qui n'aide pas à répondre.** Ils énoncent
d'abord ce que le site ne fournit pas (pas d'API, pas de serveur MCP) en une ligne, parce
qu'un agent le demande ; ils ne le justifient pas.

**Une mesure garde le cadre.** `evals/llms/promptfooconfig.yaml` pose vingt-deux questions à
un modèle qui lit un seul des deux fichiers, et un modèle juge la réponse. `bun run eval:llms`
la lance. Quatre questions portent sur un fait absent (tarif, télétravail, Kubernetes, API) :
la bonne réponse est « le document ne le dit pas ».

La mesure appelle un modèle à chaque lancement. La CI ne la lance pas. On la lance après
toute réécriture de ces fichiers.

## Ce que le test de cohérence garde

`agents.test.ts` exige que les trois copies disent les mêmes faits : les notes, les lieux,
le contact et le cursus de `content.json` se recopient mot pour mot dans `texte.html` et dans
`llms-full.txt`. Ce test reste tel quel. La réécriture change la forme autour de ces faits,
pas les faits.
