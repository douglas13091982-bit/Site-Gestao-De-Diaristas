import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { Share2, Calendar, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const searchSchema = z.object({
  title: z.string().optional(),
  text: z.string().optional(),
  url: z.string().optional(),
});

export const Route = createFileRoute("/compartilhar")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Compartilhar com Gersepa" },
      { name: "description", content: "Use conteúdo compartilhado para agendar uma diarista." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SharePage,
});

function SharePage() {
  const { title, text, url } = Route.useSearch();
  const shared = [title, text, url].filter(Boolean).join("\n");

  return (
    <div className="min-h-screen bg-bc-paper px-4 py-10">
      <div className="mx-auto max-w-xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-emerald-100 p-3">
            <Share2 className="h-6 w-6 text-emerald-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Conteúdo recebido</h1>
            <p className="text-sm text-slate-600">Use as informações para agendar mais rápido.</p>
          </div>
        </div>

        {shared ? (
          <Card className="space-y-2 p-4">
            {title && <p className="font-semibold text-slate-900">{title}</p>}
            {text && <p className="whitespace-pre-wrap text-sm text-slate-700">{text}</p>}
            {url && (
              <a href={url} className="break-all text-sm text-emerald-700 underline" target="_blank" rel="noreferrer">
                {url}
              </a>
            )}
          </Card>
        ) : (
          <Card className="p-4 text-sm text-slate-600">Nenhum conteúdo compartilhado recebido.</Card>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700">
            <Link to="/agendamento">
              <Calendar className="mr-2 h-4 w-4" />
              Agendar diarista
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/professionals">
              <MapPin className="mr-2 h-4 w-4" />
              Ver diaristas
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}