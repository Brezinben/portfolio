# Le clavier piège le focus ou le perd

Status: ready-for-agent
Type: task

## Défauts bloquants (WCAG A et AA)

1. Tab et Shift+Tab ne sortent jamais de `#cli` : `@keydown.tab.prevent` en
   `src/index.html:469` avale la touche, même sans suggestion. CONTEXT.md dit le
   contraire : « Sans fantôme, `Tab` garde son rôle ». (2.1.2)
2. Sous mouvement réduit, Tab reste sur « hibernus » dans les options : le piège de
   `src/app.ts:1797-1811` vise un bouton `disabled`. (2.1.2)
3. En thème clair, le contour de focus en `var(--acc)` fait 1,9 à 2,1:1. Emplacements :
   `src/styles.css` 1641, 1956, 1978, 2052 ; `src/404.css` 328, 361 ; `src/texte.html`
   181. Axe ne mesure pas les contours. (1.4.11)
4. Les lignes de contact portent `tabindex="0"` et `cursor: pointer` sans action, avec un
   focus presque invisible (`styles.css:1674`). `#cli` a `outline: none` (`styles.css:993`).
5. Le focus tombe sur `<body>` dans trois cas : une alerte de succès qui expire
   (10 s, sans pause), `q` sur la radio, ↑ sur la poignée du journal. Pour la poignée,
   `onKey` traite aussi la touche que la poignée a déjà traitée. (2.2.1, 2.4.3)
6. ↑ et ↓ sur « Résultat » ou sur le journal ne défilent pas et font sauter le focus
   de volet : `moveInPane` lit `this.pane`, pas le volet de l'élément focalisé. (2.1.1)
7. Entrée sur « close » de la recherche globale exécute la trouvaille en cours
   (`global-search/slice.ts:84-87`). (3.2.2)
8. `#cli` n'a aucune sémantique combobox. Le champ global a déjà le bon motif
   (`index.html:828-832`). (4.1.2)
9. Rien n'annonce le résultat de `help`, « copié », « hors ligne » ni le nombre de
   trouvailles : chaque message arrive déjà rempli par `x-if`. (4.1.3)
10. `j`, `k` et les touches de la radio marchent sur toute la page, même avec une
    modale ouverte. (2.1.4)
11. Les modales ne rendent pas la page inerte. Ctrl+K ouvre un second dialogue
    par-dessus les options.

## Défauts secondaires

- Cinq Shift (pause de la parole dans NVDA) lancent le glitch sans `aria-busy`.
- 57 arrêts Tab dans la stack. `aria-pressed` passe à vrai au simple focus. La frise
  est un `listbox` avec un arrêt Tab par option.
- Les 29 succès sont des `<button>` sans action.
- Il n'y a aucun `h2`. `aria-label="Session"` contredit CONTEXT.md. La bulle de la 404
  n'est pas live.
- La transition de thème joue sous mouvement réduit. Sa version circulaire est morte
  (`styles.css:425-444`).

## Correction attendue

Chaque correctif a un test Playwright qui échoue avant et passe après. Les modales
passent en `<dialog>` avec `showModal()`. Les règles de focus vont dans CONTEXT.md.

## Comments

2026-09-24 : les modales restent des `div`. `inert` sur `main` et le pied de page, avec
une garde sur Ctrl+K, règle l'empilement et l'arrière-plan actif. Passer les trois modales
en `<dialog>` réécrivait leur style pour le même gain. L'en-tête hors du composant, avec le
lien d'évitement, reste hors de `inert`.
