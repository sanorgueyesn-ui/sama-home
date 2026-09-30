import { z } from "zod";

export const LoginSchema = z.object({
  username: z.string().trim().min(1, "Identifiant requis."),
  password: z.string().min(1, "Mot de passe requis."),
  remember: z.boolean(),
});

export type LoginFormState =
  | {
      error: string;
    }
  | undefined;
