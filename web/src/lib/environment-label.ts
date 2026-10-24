import { evaluateEnvironment } from "./env-guard";

/**
 * Libellé d'environnement affiché dans la console de plateforme.
 *
 * Module PUR : décision prise côté serveur, uniquement à partir de l'environnement
 * passé en paramètre et de la garde existante (`evaluateEnvironment`). Il ne
 * renvoie JAMAIS d'hôte, de nom de base, de variable ni de secret : seulement un
 * libellé fixe. Ce n'est PAS une vérification de santé ni de disponibilité du
 * service : il indique uniquement dans quel environnement le serveur déclare tourner.
 *
 *  - production  : NODE_ENV=production et SAMA_ENV absent (jamais "local") ;
 *  - local       : NODE_ENV=development, SAMA_ENV=local et garde de cible locale valide ;
 *  - inconsistent: combinaison contradictoire (ex. production avec SAMA_ENV défini) ;
 *  - unknown     : tout le reste (configuration absente, partielle ou inattendue).
 */
export type EnvironmentKind = "production" | "local" | "inconsistent" | "unknown";

export type EnvironmentLabel = {
  kind: EnvironmentKind;
  label: string;
  /** Texte d'aide (infobulle) : jamais de valeur de configuration. */
  hint: string;
};

type Env = Readonly<Record<string, string | undefined>>;

export function getEnvironmentLabel(env: Env): EnvironmentLabel {
  const nodeEnv = env.NODE_ENV;
  const samaEnv = env.SAMA_ENV;
  const samaEnvUnset = samaEnv === undefined || samaEnv === "";

  if (nodeEnv === "production") {
    if (samaEnvUnset) {
      return {
        kind: "production",
        label: "Production",
        hint: "Environnement déclaré par la configuration du serveur. Ce badge n'indique pas l'état du service.",
      };
    }
    return {
      kind: "inconsistent",
      label: "Configuration incohérente",
      hint: "L'environnement de production est combiné à une variable d'environnement locale. À corriger.",
    };
  }

  if (nodeEnv === "development" && samaEnv === "local" && evaluateEnvironment(env).ok) {
    return {
      kind: "local",
      label: "Local — base de test",
      hint: "Environnement de développement local avec une base de test. Aucune donnée de production.",
    };
  }

  return {
    kind: "unknown",
    label: "Environnement non identifié",
    hint: "La configuration du serveur ne permet pas d'identifier l'environnement avec certitude.",
  };
}
