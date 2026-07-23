import type { LoginRole } from "../service";

type Props = {
  value: LoginRole;
  onChange: (v: LoginRole) => void;
};

const OPTIONS: { value: LoginRole; label: string }[] = [
  { value: "client", label: "Sou cliente" },
  { value: "professional", label: "Sou diarista" },
];

export function RoleTabs({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-xl">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`py-2.5 rounded-lg text-sm font-semibold transition ${
            value === o.value ? "bg-background shadow" : "text-muted-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}