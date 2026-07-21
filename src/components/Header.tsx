import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export function Header() {
  const { user, signOut } = useAuth();
  return (
    <header className="sticky top-0 z-40 bg-background/85 backdrop-blur border-b border-border">
      <div className="max-w-7xl mx-auto h-16 px-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Sparkles className="h-5 w-5" />
          </span>
          <span className="text-primary">BabyClean</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <Link to="/professionals" className="hover:text-primary transition">Encontrar diarista</Link>
          <a href="#como-funciona" className="hover:text-primary transition">Como funciona</a>
          <Link to="/auth" search={{ mode: "signup", role: "worker" } as never} className="hover:text-primary transition">Sou diarista</Link>
        </nav>
        <div className="flex items-center gap-2">
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
