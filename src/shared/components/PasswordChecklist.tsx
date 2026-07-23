import { Check, X } from "lucide-react";
import { evaluatePassword } from "@/shared/lib/password-policy";

type Props = { value: string; className?: string };

export function PasswordChecklist({ value, className }: Props) {
  const { results } = evaluatePassword(value);
  return (
    <ul className={"space-y-1 text-xs " + (className ?? "")}>
      {results.map((r) => (
        <li
          key={r.key}
          className={
            "flex items-center gap-2 " +
            (r.ok ? "text-emerald-600" : "text-muted-foreground")
          }
        >
          {r.ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
          <span>{r.label}</span>
        </li>
      ))}
    </ul>
  );
}