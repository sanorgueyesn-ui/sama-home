import type { PROPERTY_TYPE_VALUES } from "@/lib/definitions";

const ROOM_ICON = (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6" />
    <path d="M3 18v2M21 18v2M3 12V9a2 2 0 0 1 2-2h4v5" />
  </svg>
);

const APARTMENT_ICON = (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="3" width="16" height="18" rx="1" />
    <path d="M8 8h1M15 8h1M8 12h1M15 12h1M8 16h1M15 16h1" />
  </svg>
);

export function PropertyPhoto({
  photo,
  type,
  className = "",
}: {
  photo: string | null;
  type: (typeof PROPERTY_TYPE_VALUES)[number];
  className?: string;
}) {
  if (photo) {
    // A plain <img>, not next/image: the URL is pasted by the manager and
    // can point to any host — see Phase 4 PHOTO section (no upload service,
    // no remotePatterns configuration to maintain for arbitrary domains).
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photo} alt="" className={`object-cover ${className}`} />;
  }

  return (
    <div
      className={`flex items-center justify-center bg-gradient-to-br from-navy to-[#1E4B70] text-white/80 ${className}`}
    >
      {type === "ROOM" ? ROOM_ICON : APARTMENT_ICON}
    </div>
  );
}
