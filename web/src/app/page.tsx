import Image from "next/image";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <Image
        src="/brand/Sama-Home-icone-Bleu-nuit.png"
        alt="SAMA HOME"
        width={72}
        height={72}
        priority
        className="rounded-2xl shadow-sm"
      />
      <div>
        <h1 className="text-xl font-extrabold tracking-tight text-navy">
          SAMA HOME
        </h1>
        <p className="mt-1 text-sm font-medium text-navy/60">
          Fondations du projet en place — écrans à venir par phase.
        </p>
      </div>
    </div>
  );
}
