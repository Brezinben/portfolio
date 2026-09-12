# Page 404 personnalisée et interactive

Status: done
Type: task

Vient de l'issue GitHub #2. Le dépôt n'a aucune page 404 : `dist/` sert `index.html`,
`texte.html` et les fichiers statiques.

## Prompt à coller dans Claude Design

> Le portfolio terminal a besoin d'une page 404. Elle doit se lire comme le reste du
> site : une interface terminal, pas une page d'erreur générique.
>
> L'idée de départ : une commande introuvable dans un shell. Le terminal répond
> `command not found`, et il propose. Mais ne t'arrête pas là si tu vois mieux.
>
> Ce qu'il faut couvrir :
> - Ce que la page affiche à l'arrivée.
> - Ce que la personne peut y faire. « Interactive » est le mot de la demande : une
>   simple page morte avec un lien ne suffit pas.
> - Le rôle de la mascotte. Elle a un état `lost`, un état `scared`, un état `sad`.
> - Le chemin de retour vers la page d'accueil.
>
> Contraintes :
> - Page autonome, servie sur n'importe quelle URL inconnue. Elle ne charge pas
>   forcément `content.json`.
> - Elle doit rester légère : c'est une page qu'on ne veut pas faire payer cher.
> - Huit thèmes. Le thème est retenu dans le stockage local — la page 404 doit le lire.

## Fait

`src/404.html` et `src/404.css`, portés de `design/export-404/`. Le sprite retenu est
`alert`. L'interaction s'arrête au clic sur la mascotte : voir `design/DECISIONS.md` §26.
Caddy renvoie les erreurs 404 vers cette page, statut conservé.
