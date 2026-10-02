# Monitoring

## État réel

**ABSENT.** Aucun outil de monitoring (disponibilité, CPU, RAM, disque, erreurs HTTP/applicatives) n'est configuré à ce jour. Ceci est documenté comme un manque réel, pas comme une intention satisfaite — conformément à la règle du Bloc P/P.1 : « on pourra le faire » n'équivaut jamais à « c'est configuré ».

## Ce qui existe comme brique de base

- `GET /api/health` — vérifie la connectivité PostgreSQL réelle (`SELECT 1`), renvoie `{"status":"ok"}` (200) ou `{"status":"error"}` (503). Ne distingue pas un « serveur arrêté » (dans ce cas la requête elle-même échoue au niveau réseau, pas applicatif) — c'est une limite normale d'un health check HTTP, pas un défaut à corriger.

## À configurer (minimum raisonnable pour une première production)

| Besoin | Option(s) à évaluer chez l'hébergeur retenu |
|---|---|
| Disponibilité HTTP + health check | Un moniteur externe pointant périodiquement vers `GET /api/health` (ex. UptimeRobot, Better Stack, ou l'équivalent intégré à Railway/Hostinger) |
| Erreurs serveur (5xx, exceptions non gérées) | Dépend de l'hébergeur — Railway propose des logs consultables ; sur un VPS Hostinger, prévoir une agrégation de logs (voir ci-dessous) |
| PostgreSQL (connexions, requêtes lentes, espace) | Outils natifs PostgreSQL (`pg_stat_activity`) ou le monitoring intégré de l'hébergeur de base managée, si applicable |
| Espace disque | Monitoring natif du VPS/plateforme |

Rien de tout cela n'est actuellement branché — ce tableau est une liste de décisions à prendre, pas une configuration existante.

## Logs

Voir aussi [README.md](./README.md). Actuellement, les seuls logs sont la sortie console du processus Next.js lui-même (jamais de secret observé dans ces logs lors des audits des Blocs N à P.1). Aucune rotation, aucune agrégation, aucune persistance au-delà de la durée de vie du processus — dépend entièrement de ce que l'hébergeur retenu capture par défaut (Railway capture et persiste la sortie standard ; un VPS Hostinger nu ne le fait pas sans configuration explicite d'un gestionnaire de processus avec journalisation).

**À configurer** : rediriger/persister la sortie du processus chez l'hébergeur retenu, avant la première mise en production réelle.
