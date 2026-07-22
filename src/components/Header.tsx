import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export function Header() {
  const { user, signOut, roles } = useAuth();
  const isWorker = roles.includes("professional");
  return (
    <header className="sticky top-0 z-40 bg-background/85 backdrop-blur border-b border-border">
      <div className="max-w-7xl mx-auto h-14 md:h-16 px-4 md:px-6 flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-2 font-bold shrink-0">
          <span className="inline-flex h-8 w-8 md:h-9 md:w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4 md:h-5 md:w-5" />
          </span>
          <span className="text-foreground text-base md:text-lg">Gersepa<span className="text-primary"> Solutions</span></span>
        </Link>
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-muted-foreground">
          <Link to="/" className="hover:text-primary transition">Início</Link>
          <Link to="/cidades" className="hover:text-primary transition">Cidades</Link>
          <Link to="/categorias" className="hover:text-primary transition">Categorias</Link>
          <Link to="/professionals" className="hover:text-primary transition">Diaristas</Link>
          <Link to="/agendamento-rapido" className="hover:text-primary transition">Agendar</Link>
          <Link to="/seja-diarista" className="text-primary font-semibold hover:underline">Seja Diarista</Link>
        </nav>
        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <>
              {isWorker ? (
                <Link to="/pro/leads"><Button variant="outline" size="sm">Área da diarista</Button></Link>
              ) : (
                <>
                  <Link to="/cliente/agendamentos"><Button variant="ghost" size="sm">Meus agendamentos</Button></Link>
                  <Link to="/cliente"><Button variant="outline" size="sm">Minha conta</Button></Link>
                </>
              )}
              <Button variant="ghost" size="sm" onClick={() => signOut()}>Sair</Button>
            </>
          ) : (
            <>
              <Link to="/auth" className="text-sm font-medium text-muted-foreground hover:text-primary">Entrar</Link>
              <Link to="/auth" search={{ mode: "signup" } as never}>
                <Button size="sm">Cadastrar</Button>
              </Link>
            </>
          )}
        </div>
        {/* Mobile: apenas link rápido para área do profissional; navegação principal fica na tab bar inferior */}
        <div className="md:hidden">
          {isWorker ? (
            <Link to="/pro/leads"><Button variant="outline" size="sm" className="h-8 px-3 text-xs">Área da diarista</Button></Link>
          ) : !user ? (
            <Link to="/seja-diarista"><Button variant="outline" size="sm" className="h-8 px-3 text-xs">Seja diarista</Button></Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
