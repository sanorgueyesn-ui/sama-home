import "dotenv/config";
// Garde : ce test appelle les vraies actions (jetons, mot de passe) sur le premier utilisateur trouvé.
import "./lib/safe-env.mjs";
import { assertTestDatabaseMarker } from "./lib/db-marker.mjs";
import Module from "node:module";

// Aucun envoi réel : les voies d'envoi (relais HTTPS et SMTP) sont désactivées AVANT tout appel à l'action,
// quel que soit le contenu des fichiers d'environnement. src/lib/mail.ts renvoie alors un échec sûr
// (aucun e-mail expédié) ; ce test ne dépend pas de l'envoi.
delete process.env.GMAIL_RELAY_URL;
delete process.env.SMTP_PASS;

// Mot de passe FICTIF, propre à ce test : appliqué au premier compte local trouvé (base de test marquée uniquement).
const TEST_ONLY_NEW_PASSWORD = "TEST-ONLY-reset-password-1!";

// Les résultats des actions contiennent l'adresse saisie : seuls les champs de diagnostic sont affichés.
const summarize = (r: { step?: string; success?: boolean; accountNotFound?: boolean; error?: string }) => ({
  step: r.step,
  success: r.success,
  accountNotFound: r.accountNotFound,
  error: r.error,
});

// Mock server-only before any other imports
// @ts-ignore
const originalRequire = Module.prototype.require;
// @ts-ignore
Module.prototype.require = function (id: string) {
  if (id === "server-only") return {};
  // @ts-ignore
  return originalRequire.call(this, id);
};

async function run() {
  // Avant toute écriture (jetons, mot de passe) : la base doit porter le marqueur de base de test.
  await assertTestDatabaseMarker(process.env.DATABASE_URL, "test du flux mot de passe oublié");
  const { PrismaClient } = await import("../src/generated/prisma/client");
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const { requestPasswordReset, confirmPasswordReset } = await import("../src/app/actions/forgot-password");

  const connectionString = process.env.DATABASE_URL!;
  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  console.log("=== TEST DU FLUX MOT DE PASSE OUBLIÉ (SÉCURITÉ STRICTE) ===");

  // 1. Test compte inexistant
  console.log("\n1. Test avec un compte inexistant (inconnu_99999@test.com)...");
  const nonExistentFormData = new FormData();
  nonExistentFormData.append("identifier", "inconnu_99999@test.com");
  const nonExistentResult = await requestPasswordReset(undefined, nonExistentFormData);
  console.log("Résultat compte inexistant :", summarize(nonExistentResult));
  // Réponse publique unique (D2) : un compte inconnu reçoit la MÊME réponse qu'un compte existant
  // (étape CODE, message générique), sans erreur ni indication d'inexistence.
  if (nonExistentResult.step !== "CODE" || nonExistentResult.error || nonExistentResult.accountNotFound) {
    throw new Error("Échec : un compte inexistant doit recevoir la réponse publique générique (étape CODE, sans erreur).");
  }
  console.log("✅ Succès : le compte inexistant reçoit la même réponse générique (aucune énumération de comptes).");

  // 2. Test avec un compte existant
  const user = await prisma.user.findFirst({
    where: { email: { not: null } },
  });
  if (!user || !user.email) {
    throw new Error("Aucun utilisateur avec e-mail trouvé en base.");
  }
  console.log("\n2. Test avec le premier compte local disposant d'une adresse e-mail (identité non affichée)...");
  const existFormData = new FormData();
  existFormData.append("identifier", user.email);
  const existResult = await requestPasswordReset(undefined, existFormData);
  console.log("Résultat compte existant :", summarize(existResult));

  if (existResult.step !== "CODE") {
    throw new Error("Échec : attendu passage à l'étape CODE avec e-mail expédié ou prêt à être saisi.");
  }
  console.log("✅ Succès : passage à l'étape CODE avec succès.");

  // 3. Test de validation : créer un jeton de test dans la base et vérifier la saisie
  const testCode = "847291";
  await prisma.passwordResetToken.deleteMany({ where: { email: user.email.toLowerCase() } });
  await prisma.passwordResetToken.create({
    data: {
      email: user.email.toLowerCase(),
      code: testCode,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      attempts: 0,
    },
  });

  console.log("\n3. Test avec code invalide (000000)...");
  const wrongCodeFormData = new FormData();
  wrongCodeFormData.append("email", user.email);
  wrongCodeFormData.append("code", "000000");
  wrongCodeFormData.append("newPassword", TEST_ONLY_NEW_PASSWORD);
  wrongCodeFormData.append("confirmPassword", TEST_ONLY_NEW_PASSWORD);
  const wrongResult = await confirmPasswordReset(undefined, wrongCodeFormData);
  console.log("Résultat code invalide :", summarize(wrongResult));
  // Contrat actuel (D3) : un code faux produit le message générique unique, sans décompte d'essais.
  if (wrongResult.step !== "CODE" || wrongResult.success || !wrongResult.error?.startsWith("Code invalide ou expiré")) {
    throw new Error("Échec du test code invalide : le message générique « Code invalide ou expiré… » était attendu.");
  }
  console.log("✅ Succès : code invalide rejeté avec le message générique (aucun détail sur les essais).");

  // 4. Test code valide
  console.log(`\n4. Test avec le bon code généré (${testCode})...`);
  const correctFormData = new FormData();
  correctFormData.append("email", user.email);
  correctFormData.append("code", testCode);
  correctFormData.append("newPassword", TEST_ONLY_NEW_PASSWORD);
  correctFormData.append("confirmPassword", TEST_ONLY_NEW_PASSWORD);
  const successResult = await confirmPasswordReset(undefined, correctFormData);
  console.log("Résultat validation mot de passe :", summarize(successResult));
  if (successResult.step !== "SUCCESS" || !successResult.success) {
    throw new Error("Échec du test réinitialisation réussie.");
  }
  console.log("✅ Succès : mot de passe mis à jour et sessions révoquées !");

  console.log("\n🎉 TOUS LES TESTS SONT VALIDES AVEC SUCCÈS !");
  await prisma.$disconnect();
}

run().catch((err) => {
  console.error("❌ Erreur pendant le test :", err);
  process.exit(1);
});
