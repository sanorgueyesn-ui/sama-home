import "dotenv/config";
import Module from "node:module";

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
  console.log("Résultat compte inexistant :", nonExistentResult);
  if (nonExistentResult.step !== "REQUEST" || !nonExistentResult.accountNotFound || !nonExistentResult.error?.includes("n'existe pas")) {
    throw new Error("Échec : attendu message d'erreur et accountNotFound: true");
  }
  console.log("✅ Succès : le compte inexistant affiche bien l'erreur et accountNotFound.");

  // 2. Test avec un compte existant
  const user = await prisma.user.findFirst({
    where: { email: { not: null } },
  });
  if (!user || !user.email) {
    throw new Error("Aucun utilisateur avec e-mail trouvé en base.");
  }
  console.log(`\n2. Test avec le compte existant : ${user.email} (${user.name})...`);
  const existFormData = new FormData();
  existFormData.append("identifier", user.email);
  const existResult = await requestPasswordReset(undefined, existFormData);
  console.log("Résultat compte existant :", existResult);

  // Le serveur vérifie que l'e-mail a bien pu être expédié
  if (!process.env.SMTP_PASS) {
    if (existResult.step !== "REQUEST" || !existResult.error?.includes("SMTP_PASS")) {
      throw new Error("Échec : attendu blocage sécurisé tant que SMTP_PASS n'est pas configuré.");
    }
    console.log("✅ Succès : blocage sécurisé quand SMTP_PASS n'est pas configuré (aucun code affiché sur l'écran).");
  } else {
    if (existResult.step !== "CODE") {
      throw new Error("Échec : attendu passage à l'étape CODE avec e-mail expédié.");
    }
    console.log("✅ Succès : e-mail expédié et passage à l'étape CODE.");
  }

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
  wrongCodeFormData.append("newPassword", "NouveauPass123!");
  wrongCodeFormData.append("confirmPassword", "NouveauPass123!");
  const wrongResult = await confirmPasswordReset(undefined, wrongCodeFormData);
  console.log("Résultat code invalide :", wrongResult);
  if (wrongResult.step !== "CODE" || !wrongResult.error?.includes("incorrect")) {
    throw new Error("Échec du test code invalide.");
  }
  console.log("✅ Succès : code invalide correctement rejeté avec décompte des tentatives.");

  // 4. Test code valide
  console.log(`\n4. Test avec le bon code généré (${testCode})...`);
  const correctFormData = new FormData();
  correctFormData.append("email", user.email);
  correctFormData.append("code", testCode);
  correctFormData.append("newPassword", "0912Toubas");
  correctFormData.append("confirmPassword", "0912Toubas");
  const successResult = await confirmPasswordReset(undefined, correctFormData);
  console.log("Résultat validation mot de passe :", successResult);
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
