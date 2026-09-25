# 10. Des outils WebMCP impératifs, plutôt qu'un formulaire annoté

**Statut :** acceptée

## Le problème

WebMCP permet à une page de déclarer des outils à l'agent du navigateur. Un agent peut
alors ouvrir une section ou chercher dans le portfolio sans lire l'écran. L'API a deux
formes, et la page doit en choisir une.

Nous avons vérifié la documentation le 2026-09-25, sur developer.chrome.com et sur la
spécification du W3C. La surface actuelle est `document.modelContext.registerTool`. Les
premiers brouillons parlaient de `navigator.modelContext`, de `provideContext` et de
`requestUserInteraction` : ces noms n'existent plus. L'API demande Chrome 149, derrière
`chrome://flags/#enable-webmcp-testing` ou un jeton d'Origin Trial.

## Options considérées

**Déclarative.** Des attributs `toolname`, `tooldescription` et `toolparamdescription`
transforment un `<form>` en outil. La page n'a qu'un formulaire, la ligne de commande. Il en
sortirait un seul outil, « exécuter une commande » : un texte libre, sans schéma ni
énumération. L'agent devrait deviner le vocabulaire du terminal. La réponse demande de toute
façon du JavaScript, par `respondWith`.

**Impérative.** Un outil par intention, avec un schéma JSON. Les énumérations viennent du
contenu : sections, missions, thèmes, cibles de partage. Chaque outil rend un texte.

## La décision

L'API impérative, avec huit outils : `open_section`, `search_portfolio`, `read_tech_note`,
`get_contact`, `set_theme`, `set_display_option`, `share_portfolio` et `propose_idea`.

- Une action passe par la ligne de commande, comme une frappe du visiteur. Le répartiteur
  reste le point unique, et le journal montre au visiteur ce que l'agent a fait. Les outils
  de lecture lisent l'état sans rien taper. Une exception : `set_display_option` appelle
  `flip`, car le répartiteur n'a pas de commande de bascule.
- Le navigateur ne garantit pas de valider l'entrée contre le schéma. Chaque appel passe
  donc par `accepts` avant `execute`, et `propose_idea` refuse une idée qui commence par un
  tiret : elle lirait `-y`, le consentement tapé.
- `propose_idea` tape `/propose` sans `-y`. Rien ne part avant le « oui » du visiteur, et
  l'outil porte `consequentialHint`.
- Le module part dans un chunk à part (ADR 0008), chargé seulement si
  `"modelContext" in document`. Un navigateur sans WebMCP ne le télécharge pas.
- Le chunk n'importe que des types. `rankHits` et la liste des thèmes lui arrivent en
  paramètre, car une valeur prise au paquet principal lui ferait importer l'entrée.

Écartés : un outil « exécuter une commande », qui serait le déclaratif en moins bien ;
`ask`, parce que l'agent est déjà un modèle et que `open_section` lui rend le texte ; la
radio, parce que le son exige un geste du visiteur.

## Ce que cela coûte

- Le contrat de l'API est déclaré à la main dans `src/terminal/webmcp/tools.ts`, car aucun
  paquet installé ne le porte. Une évolution de la spécification demandera de le reprendre.
- La construction nomme maintenant chaque chunk paresseux d'après le dossier de son
  module : `radio.js`, `webmcp.js`. Le garde-fou « un seul nom de chunk » de l'ADR 0008
  tombe, comme il le prévoyait.
- Sans jeton d'Origin Trial, les outils ne marchent que derrière le flag. Le jeton demande
  une inscription du porteur sur la console Chrome.
