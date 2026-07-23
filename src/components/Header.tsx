import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Sparkles, MapPin, ChevronDown } from "lucide-react";
import { UserMenu } from "@/components/UserMenu";

export function Header() {
  const { user } = useAuth();
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
          <Link to="/professionals" className="hover:text-primary transition">Diaristas</Link>
          <a href="/#sobre" className="hover:text-primary transition">Sobre</a>
          <a
            href="https://wa.me/5547999999999"
            target="_blank"
            rel="noreferrer"
            className="hover:text-primary transition"
          >
            Contato
          </a>
          <Link to="/seja-diarista" className="text-primary font-semibold hover:underline">Seja Diarista</Link>
        </nav>
        <div className="hidden md:flex items-center gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:border-primary/50 transition"
          >
            <MapPin className="h-3.5 w-3.5 text-primary" />
            Joinville
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          {user ? (
            <UserMenu />
          ) : (
            <>
              <Link to="/auth" className="text-sm font-medium text-muted-foreground hover:text-primary">Entrar</Link>
              <Link to="/auth" search={{ mode: "signup" } as never}>
                <Button size="sm">Cadastrar</Button>
              </Link>
            </>
          )}
        </div>
        {/* Mobile: navegação principal fica na tab bar inferior. */}
        <div className="md:hidden">
          {user ? (
            <UserMenu />
          ) : (
            <Link to="/seja-diarista"><Button variant="outline" size="sm" className="h-8 px-3 text-xs">Seja diarista</Button></Link>
          )}
        </div>
      </div>
    </header>
  );
}
