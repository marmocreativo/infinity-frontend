import type { LucideIcon } from 'lucide-react';

interface Props {
  main: LucideIcon;
  satellites: { icon: LucideIcon; color: string }[];
}

// Posiciones fijas alrededor del círculo central (en %), pensadas para 3 satélites
const spots = [
  { top: '8%', left: '70%' },
  { top: '66%', left: '82%' },
  { top: '70%', left: '8%' },
];

/** Ilustración del onboarding: tarjeta central con iconos orbitando, al estilo de las pantallas de bienvenida */
export default function OnboardingArt({ main: Main, satellites }: Props) {
  return (
    <div className="relative mx-auto w-full max-w-[300px] aspect-square">
      {/* Anillos */}
      <div className="absolute inset-0 rounded-full border border-border/60" />
      <div className="absolute inset-[14%] rounded-full border border-border/40" />
      <div className="absolute inset-[26%] rounded-full bg-primary/10 blur-xl" />

      {/* Tarjetas apiladas */}
      <div className="absolute inset-[24%] flex items-center justify-center">
        <div className="absolute w-[78%] h-[88%] -rotate-12 -translate-x-3 rounded-3xl bg-gradient-to-br from-lime-300/50 to-emerald-400/40" />
        <div className="absolute w-[78%] h-[88%] rotate-12 translate-x-3 rounded-3xl bg-gradient-to-br from-sky-300/50 to-indigo-400/40" />
        <div className="relative w-[84%] h-[94%] rounded-3xl bg-gradient-to-br from-fuchsia-500 via-purple-500 to-indigo-500 shadow-2xl flex items-center justify-center">
          <Main size={52} className="text-white" strokeWidth={1.6} />
        </div>
      </div>

      {/* Satélites */}
      {satellites.slice(0, spots.length).map(({ icon: Icon, color }, i) => (
        <span
          key={i}
          className="absolute w-9 h-9 -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center shadow-lg"
          style={{ ...spots[i], backgroundColor: color }}
        >
          <Icon size={16} className="text-white" />
        </span>
      ))}
    </div>
  );
}
