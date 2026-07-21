import { Link } from "@tanstack/react-router";

type Props = { error?: unknown; reset?: () => void; statusCode?: number };

export function GlobalErrorBoundary({ error, reset, statusCode = 500 }: Props) {
  const message =
    statusCode === 404
      ? "Página não encontrada."
      : error instanceof Error
        ? error.message
        : "Ocorreu um erro inesperado.";
  return (
    <div className="min-h-screen grid place-items-center bg-background text-foreground p-6">
      <div className="max-w-md text-center space-y-4">
        <p className="text-sm text-muted-foreground uppercase tracking-widest">Erro {statusCode}</p>
        <h1 className="text-3xl font-semibold">
          {statusCode === 404 ? "Não encontrado" : "Algo deu errado"}
        </h1>
        <p className="text-muted-foreground">{message}</p>
        <div className="flex gap-3 justify-center pt-2">
          {reset ? (
            <button
              onClick={reset}
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
            >
              Tentar novamente
            </button>
          ) : null}
          <Link to="/" className="px-4 py-2 rounded-md border border-border text-sm font-medium hover:bg-accent">
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}