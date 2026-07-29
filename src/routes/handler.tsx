import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

const searchSchema = z.object({
  type: z.string().optional(),
});

export const Route = createFileRoute("/handler")({
  validateSearch: searchSchema,
  beforeLoad: ({ search }) => {
    const raw = search.type ?? "";
    // Aceita web+gersepa://booking/123 ou web+gersepa://pro
    const stripped = raw.replace(/^web\+gersepa:\/?\/?/, "").replace(/^\/+/, "");
    const [section, ...rest] = stripped.split("/");
    const routes: Record<string, string> = {
      booking: `/cliente/agendamentos${rest[0] ? `/${rest[0]}` : ""}`,
      pro: "/pro",
      cliente: "/cliente",
      agendar: "/agendamento",
      diaristas: "/professionals",
    };
    throw redirect({ to: routes[section] ?? "/", replace: true });
  },
});