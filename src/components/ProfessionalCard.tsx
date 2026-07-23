import { Link } from "@tanstack/react-router";
import { Star, Calendar, BadgeCheck, ChevronRight, Award } from "lucide-react";
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
    <div className="relative min-w-0 rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgb(12_35_64/0.04),0_10px_30px_-16px_rgb(12_35_64/0.15)] hover:shadow-[0_1px_2px_rgb(12_35_64/0.04),0_18px_42px_-14px_rgb(12_35_64/0.22)] transition-shadow overflow-hidden border border-[var(--bc-navy)]/5">
      {/* dotted mint pattern */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{ backgroundImage: "radial-gradient(circle, rgba(16,185,129,0.18) 1px, transparent 1.4px)", backgroundSize: "14px 14px" }}
      />

      <div className="relative flex items-start gap-3 min-w-0">
        <div className="relative shrink-0">
          {p.profile_photo ? (
            <img
              src={p.profile_photo}
              alt={p.full_name ?? "Diarista"}
              loading="lazy"
              className="h-14 w-14 rounded-2xl object-cover border border-[var(--bc-navy)]/10"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <div className="h-14 w-14 rounded-2xl grid place-items-center font-display font-extrabold text-lg text-white bg-gradient-to-br from-[var(--bc-teal)] to-[var(--bc-sky)]">
              {initial}
            </div>
          )}
          <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-amber-400 text-white grid place-items-center shadow-sm ring-2 ring-white">
            <Award className="h-3 w-3" />
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate font-display font-bold text-[15px] text-[var(--bc-navy)]">
              {p.full_name ?? "Diarista"}
            </h3>
            {p.is_verified && <BadgeCheck className="h-4 w-4 shrink-0 text-[var(--bc-teal)]" />}
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 font-semibold text-[var(--bc-navy)]">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              {rating}
            </span>
            <span className="text-[var(--bc-navy-2)]/70">{bookings}+ limpezas</span>
          </div>
          {p.experience && (
            <span className="mt-2 inline-flex items-center rounded-full bg-[var(--bc-mist)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--bc-navy)]">
              {p.experience}
            </span>
          )}
        </div>
      </div>

      {p.bio && (
        <p className="relative mt-3 text-sm text-[var(--bc-navy-2)]/85 line-clamp-3 leading-relaxed">
          {p.bio}
        </p>
      )}

      {specialties.length > 0 && (
        <div className="relative mt-3 flex flex-wrap gap-1.5">
          {specialties.map((s) => (
            <span key={s} className="rounded-full bg-[var(--bc-mist)] px-2.5 py-1 text-[11px] font-semibold text-[var(--bc-navy)]">
              {s}
            </span>
          ))}
        </div>
      )}

      <div className="relative mt-4 grid grid-cols-2 gap-2">
        <Link to="/professionals/$id" params={{ id: p.id }} className="min-w-0">
          <Button variant="outline" className="w-full h-11 rounded-xl border-[var(--bc-navy)]/15 text-[var(--bc-navy)] font-semibold gap-1 hover:bg-[var(--bc-mist)]">
            Ver Perfil <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
        <Link
          to="/agendamento"
          search={{ pro: p.id, city: p.city_slug ?? "joinville", dur: 4, type: "residential", rooms: 2, baths: 1 }}
          className="min-w-0"
        >
          <Button className="w-full h-11 rounded-xl gap-1.5 font-semibold text-white" style={{ background: "linear-gradient(90deg, var(--bc-teal) 0%, var(--bc-sky) 100%)" }}>
            <Calendar className="h-4 w-4" /> Agendar
          </Button>
        </Link>
      </div>
    </div>
  );
}