import { Button } from "@/components/ui/button";

type Props = {
  highlighted: boolean;
  sending: boolean;
  onRequest: () => void;
};

export function PasswordSetupCard({ highlighted, sending, onRequest }: Props) {
  return (
    <div
      className={`rounded-xl border p-4 text-sm space-y-2 ${
        highlighted ? "border-primary bg-primary/5" : "border-border bg-muted/40"
      }`}
    >
      <p className="font-medium">
        {highlighted
          ? "Primeiro acesso ou esqueceu a senha?"
          : "Já é cadastrada e não sabe a senha?"}
      </p>
      <p className="text-muted-foreground text-xs">
        Enviaremos um link no seu e-mail para você criar uma nova senha e entrar.
      </p>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={onRequest}
        disabled={sending}
      >
        {sending ? "Enviando..." : "Criar / redefinir senha"}
      </Button>
    </div>
  );
}