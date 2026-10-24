import { defineConfig } from "prisma/config";
import { assertDeployTarget } from "../../src/lib/env-guard";

// PROCÉDURE DE DÉPLOIEMENT DE PRODUCTION — distincte de prisma7.config.ts.
//
// Ce fichier n'est JAMAIS découvert automatiquement : il faut le désigner
// explicitement, par exemple depuis l'hébergeur ou une session dédiée :
//   npx prisma migrate deploy --config scripts/deploy/prisma-deploy.config.ts
//
// Il NE lit PAS `.env` (aucun dotenv) : DATABASE_URL (et DIRECT_URL) doivent
// venir de l'environnement du processus, posé volontairement pour cette
// opération. Il n'assouplit pas la garde de développement ; il exige au
// contraire :
//   - SAMA_DEPLOY_TARGET_HOST = hôte EXACT de DATABASE_URL (confirmation de la cible) ;
//   - une cible distante (une cible locale est refusée) ;
//   - aucun paramètre d'URL pouvant rediriger la connexion ;
//   - SAMA_ENV différent de "local".
// Toujours précédé d'une sauvegarde fraîche (docs/production/DEPLOY.md).
assertDeployTarget(process.env, "prisma (déploiement)");

export default defineConfig({
  schema: "../../prisma/schema.prisma",
  migrations: {
    path: "../../prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
