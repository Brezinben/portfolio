# Lot 6 — savoir s'arrêter

Status: ready-for-agent
Type: task
Blocked by: 05

Huit liaisons restent, et elles doivent rester. Ce ticket fait la seule qui vaut la
peine, et écrit le POURQUOI des refus.

## À faire

`grid-template-columns:${outKeyWidth}` devient `--out-key`.

## À ne pas faire, et à commenter

| Liaison | Raison |
|---|---|
| `height:${logHeight}px` | `tests/browser/layout.spec.ts:221` lit `node.style.height`. Valeur tirée par l'utilisateur, continue. |
| `left:${at}px` mascotte | `tests/browser/mascotte.spec.ts:295` lit `node.style.left`. Réécrite à chaque `pointermove`. |
| `padding-left:${line.pad}` | Chaîne libre venue de `content.json`. |
| `font-size` / `font-weight` / `letter-spacing` | Chaînes libres venues de `content.json`. |
| Géométrie du bandeau, `box-shadow` généré | Liste de centaines de caractères, calculée. |
| `${entry.edge}` `${entry.bg}` `${entry.acc}` | Palette d'un **autre** thème que celui appliqué. Le CSS ne sait pas lire les variables d'un thème non appliqué. |

## Le critère, à écrire dans le commentaire

> Une classe ne doit jamais fermer ce que `content.json` a le droit d'ouvrir.

`raw.size`, `raw.w`, `raw.ls` et `raw.pad` traversent sans filtre. Les figer en classes
transformerait une valeur éditable sans redéploiement en valeur bloquée par un
déploiement — ce que `CONTEXT.md` et l'ADR 0002 refusent.

## Vérification

`bun run test:browser` vert.
