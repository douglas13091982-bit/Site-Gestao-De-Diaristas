import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Sparkles, MapPin, ChevronDown } from "lucide-react";
import { useState } from "react";

const CITIES = ["Joinville", "Florianópolis", "Blumenau", "Curitiba", "São Paulo"];

export function Header() {
  const { user, signOut } = useAuth();
  const [city, setCity] = useState("Joinville");
  const [openCity, setOpenCity] = useState(false);
  return (
    <header className="sticky top-0 z-40 bg-background/85 backdrop-blur border-b border-border">
      <div className="max-w-7xl mx-auto h-16 px-6 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg shrink-0">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Sparkles className="h-5 w-5" />
          </span>
          <span className="text-foreground">Gersepa<span className="text-primary"> Solutions</span></span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <Link to="/" className="hover:text-primary transition">Início</Link>
          <Link to="/professionals" className="hover:text-primary transition">Diaristas</Link>
          <a href="#por-que" className="hover:text-primary transition">Sobre</a>
          <a href="#contato" className="hover:text-primary transition">Contato</a>
          <Link to="/auth" search={{ mode: "signup", role: "worker" } as never} className="hover:text-primary transition">Sou diarista</Link>
        </nav>
        <div className="flex items-center gap-2">
          <div className="relative hidden sm:block">
            <button
              type="button"
              onClick={() => setOpenCity((v) => !v)}
              onBlur={() => setTimeout(() => setOpenCity(false), 120)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 h-9 text-sm font-medium hover:border-primary/40 transition"
            >
              <MapPin className="h-3.5 w-3.5 text-primary" />
              {city}
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            {openCity && (
              <div className="absolute right-0 mt-1 w-44 rounded-lg border border-border bg-popover shadow-lg py-1 z-50">
                {CITIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onMouseDown={() => setCity(c)}
                    className="block w-full text-left px-3 py-1.5 text-sm hover:bg-secondary"
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>
          {user ? (
            <>
              <Link to="/dashboard"><Button variant="outline" size="sm">Painel</Button></Link>
              <Button variant="ghost" size="sm" onClick={() => signOut()}>Sair</Button>
            </>
          ) : (
            <>
              <Link to="/auth" className="text-sm font-medium text-muted-foreground hover:text-primary hidden sm:block">Entrar</Link>
              <Link to="/auth" search={{ mode: "signup" } as never}>
                <Button size="sm">Cadastrar</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
