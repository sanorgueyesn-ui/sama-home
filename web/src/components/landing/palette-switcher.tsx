// Conteneur de la landing : porte la direction du texte (FR/EN en LTR, AR en RTL) et la palette
// d'accent. La palette par défaut est l'ambre de la marque ; les palettes `blue`, `emerald` et
// `ruby` restent définies dans landing.css si l'on veut un jour en proposer le choix.

export type Palette = "default" | "blue" | "emerald" | "ruby";

export function PaletteScope({
  dir,
  className,
  palette = "default",
  children,
}: {
  dir: string;
  className?: string;
  palette?: Palette;
  children: React.ReactNode;
}) {
  return (
    <div dir={dir} data-palette={palette} className={className}>
      {children}
    </div>
  );
}
