# Animations des réseaux sociaux

Status: needs-design
Type: task

`design/DECISIONS.md:465-474` définit la commande `/share` et ses cinq cibles :
`linkedin` (partage), `profil`, `github`, `mail`, `link` (copie). **Aucune animation
n'est spécifiée pour elles.**

## Prompt à coller dans Claude Design

> La commande `/share` du portfolio terminal affiche cinq cibles : LinkedIn (partage),
> profil, GitHub, mail, et copie du lien. Elles s'affichent aujourd'hui sans aucune
> animation. Je veux leur en donner une.
>
> Ce qu'il faut couvrir :
> - L'entrée des cinq cibles quand la sortie s'affiche. Elles arrivent ensemble ou en
>   cascade ?
> - Le survol et le focus de chacune.
> - **Le retour après action.** Copier un lien réussit ou échoue ; ouvrir LinkedIn part
>   ailleurs. Ces deux issues ne se ressemblent pas, et c'est l'animation qui le dit.
>
> Contraintes :
> - Les cibles vivent dans le volet de sortie. Coins carrés, elles prennent le focus.
> - `--acc`, `--acc-soft`, `--ok`, `--warn` du thème courant. Huit thèmes, dont un clair.
> - Le réglage `anim` les coupe toutes. L'état doit rester lisible sans mouvement.
> - Pas de bibliothèque d'animation. CSS seul, et Alpine pour l'état.
