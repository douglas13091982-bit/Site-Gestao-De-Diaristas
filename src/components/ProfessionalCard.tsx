import { Link } from "@tanstack/react-router";
import { Star, Calendar, BadgeCheck, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ProCardData = {
  id: string;
  full_name: string | null;
  profile_photo: string | null;
  city?: string | null;
  city_slug?: string | null;
  bio: string | null;
  rating: number | null;
  total_reviews: number | null;
  total_bookings?: number | null;
  is_verified?: boolean | null;
  specialties?: string[] | null;
  experience?: string | null;
};

export function ProfessionalCard({ p }: { p: ProCardData }) {
  const initial = (p.full_name ?? "?")[0]?.toUpperCase() ?? "?";
  const rating = Number(p.rating ?? 0).toFixed(1);
  const bookings = p.total_bookings ?? p.total_reviews ?? 0;
  const specialties = (p.specialties ?? []).filter(Boolean).slice(0, 3);

  return (
    <article className="group flex min-w-0 flex-col rounded-3xl border border-[var(--bc-navy)]/8 bg-white p-3 shadow-[var(--shadow-card)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]">
      <Link
        to="/professionals/$id"
        params={{ id: p.id }}
        className="relative block aspect-[4/4.2] overflow-hidden rounded-2xl bg-[var(--bc-mist)]"
        aria-label={`Ver perfil de ${p.full_name ?? "diarista"}`}
      >
        {p.profile_photo ? (
          <img
            src={p.profile_photo}
            alt={p.full_name ?? "Diarista"}
            loading="lazy"
            className="h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-[1.04]"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div
            className="grid h-full w-full place-items-center font-display text-7xl font-extrabold text-white"
            style={{ background: "var(--gradient-brand)" }}
          >
            {initial}
          </div>
        )}
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-sm font-bold text-[var(--bc-navy)] shadow-sm">
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> {rating}
        </span>
        {p.is_verified && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-[var(--bc-navy)]/80 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
            <BadgeCheck className="h-3.5 w-3.5 text-[var(--bc-teal-soft)]" /> Verificada
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col px-2 pb-1 pt-4">
        <h3 className="truncate font-display text-xl font-bold tracking-tight text-[var(--bc-navy)]">
          {p.full_name ?? "Diarista"}
        </h3>

        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold text-[var(--bc-navy-2)]">{bookings}+ limpezas</span>
          {p.experience && (
            <span className="truncate rounded-full bg-[var(--bc-mist)] px-2.5 py-0.5 text-xs font-semibold text-[var(--bc-navy)]">
              {p.experience}
            </span>
          )}
        </div>

        {p.bio && (
          <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-[var(--bc-navy-2)]/80">
            {p.bio}
          </p>
        )}

        {specialties.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {specialties.map((s) => (
              <span key={s} className="rounded-full border border-[var(--bc-navy)]/10 px-2.5 py-1 text-[11px] font-semibold text-[var(--bc-navy)]">
                {s}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto grid grid-cols-2 gap-2 pt-4">
          <Link to="/professionals/$id" params={{ id: p.id }} className="min-w-0">
            <Button variant="outline" className="h-11 w-full gap-1 rounded-xl border-[var(--bc-navy)]/15 font-semibold text-[var(--bc-navy)] hover:bg-[var(--bc-mist)]">
              Ver perfil <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link
            to="/agendamento"
            search={{ pro: p.id, city: p.city_slug ?? "joinville", dur: 4, type: "residential", rooms: 2, baths: 1 }}
            className="min-w-0"
          >
            <Button className="h-11 w-full gap-1.5 rounded-xl border-0 font-semibold text-white hover:brightness-105" style={{ background: "var(--gradient-cta)" }}>
              <Calendar className="h-4 w-4" /> Agendar
            </Button>
          </Link>
        </div>
      </div>
    </article>
  );
}
