import Image from "next/image";
import { T } from "@/components/i18n/i18n-provider";
import { getT } from "@/lib/i18n/server";

/**
 * Lockup logo composé en code (icône officielle + texte) — la maquette
 * ("connexion et inscription/Maquette responsive SAMA HOME élégant (1).png")
 * utilise un petit format horizontal (icône + texte + slogan) qui n'existe
 * pas comme fichier séparé parmi les ressources de marque fournies (celles-ci
 * sont des lockups carrés icône-au-dessus-texte, format différent) — seule
 * l'ICÔNE (jamais le texte, jamais redessinée) est réutilisée telle quelle
 * depuis public/brand/. Variante "icone-Bleu-nuit" sur fond clair,
 * "icone-Blanc-cassé" sur fond sombre — jamais la même sur les deux fonds.
 */
export async function AuthLogo({
  variant,
  withTagline = true,
}: {
  variant: "light" | "dark";
  withTagline?: boolean;
}) {
  const t = await getT();
  const iconSrc =
    variant === "dark"
      ? "/brand/Sama-Home-icone-Blanc-cassé.png"
      : "/brand/Sama-Home-icone-Bleu-nuit.png";

  return (
    <div className="flex items-center gap-2.5">
      <Image src={iconSrc} alt={t("SAMA HOME")} width={40} height={40} priority className="h-9 w-9 sm:h-10 sm:w-10" />
      <div>
        <p className="text-base font-extrabold leading-tight tracking-wide sm:text-lg">
          <span className="text-brand-orange">SAMA</span>{" "}
          <span className={variant === "dark" ? "text-white" : "text-fg"}>HOME</span>
        </p>
        {withTagline ? (
          <p className={`text-[10px] font-semibold tracking-wide ${variant === "dark" ? "text-white/60" : "text-fg/50"}`}>
            <T>Gestion de logements meublés</T>
          </p>
        ) : null}
      </div>
    </div>
  );
}
