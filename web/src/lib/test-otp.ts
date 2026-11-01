import { evaluateEnvironment } from "./env-guard";

/**
 * Seul point de décision pour exposer un code OTP "de test" au navigateur.
 *
 * Module PUR (aucun import applicatif, aucune connexion) : la décision est
 * prise uniquement à partir de l'environnement passé en paramètre, côté
 * serveur. Le code n'est exposé que si TOUTES les conditions sont réunies :
 *  - `SAMA_ENV` vaut exactement "local" ;
 *  - `NODE_ENV` vaut exactement "development" (`NODE_ENV=development` seul ne
 *    suffit jamais : il faut aussi la garde de configuration locale) ;
 *  - la garde de cible locale est valide (`evaluateEnvironment` : base locale
 *    autorisée, base attendue, aucune redirection d'URL, etc.).
 * Tout le reste — variable absente, valeur inattendue, base distante,
 * production — refuse : aucun code n'est jamais renvoyé ni journalisé.
 */
type Env = Readonly<Record<string, string | undefined>>;

export function canExposeTestOtp(env: Env): boolean {
  return env.SAMA_ENV === "local" && env.NODE_ENV === "development" && evaluateEnvironment(env).ok;
}

export type OtpDispatchOutcome = {
  /** Vrai si l'inscription peut passer à l'étape de saisie du code. */
  delivered: boolean;
  /** Présent UNIQUEMENT si canExposeTestOtp(env) ; jamais en production. */
  testCode?: string;
};

/**
 * Résultat d'un envoi d'OTP.
 * - Production / configuration non locale : l'étape de saisie n'est autorisée
 *   que si l'e-mail est réellement parti ; le code n'est jamais renvoyé.
 * - Local explicitement autorisé : le parcours de test reste utilisable même
 *   si l'envoi échoue (relais et SMTP inertes), le code étant fourni pour le test.
 */
export function resolveOtpDispatch(params: { mailSent: boolean; code: string; env: Env }): OtpDispatchOutcome {
  const expose = canExposeTestOtp(params.env);
  return {
    delivered: params.mailSent || expose,
    ...(expose ? { testCode: params.code } : {}),
  };
}
