/**
 * Formes abstraites discrètes dans les couleurs de marque — visibles
 * uniquement en dessous de `lg:` (tablette/mobile, jamais sur le panneau
 * desktop qui a la vraie photo). Purement décoratif (aria-hidden), jamais
 * de contenu, jamais de ressource externe.
 */
export function DecorativeBlobs() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden lg:hidden">
      <div className="absolute -left-16 -top-16 h-56 w-56 rounded-full bg-navy/10 blur-2xl" />
      <div className="absolute -right-10 top-24 h-40 w-40 rounded-full bg-brand-orange/15 blur-2xl" />
      <div className="absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-coral/10 blur-2xl" />
      <div className="absolute -bottom-10 right-0 h-32 w-32 rounded-full bg-navy/10 blur-xl" />
    </div>
  );
}
