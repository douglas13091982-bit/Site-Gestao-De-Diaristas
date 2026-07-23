import type { ReactNode } from "react";

type Props = {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  size?: "sm" | "md";
};

export function ChipToggle({ active, onClick, children, size = "sm" }: Props) {
  const sizing = size === "md" ? "h-10 px-3 text-sm" : "px-3 py-1.5 text-xs";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border transition ${sizing} ${
        active
          ? "border-primary bg-primary/15 text-primary hover:bg-primary/20"
          : "border-border bg-muted/40 text-foreground/80 hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}

export function toggleInArray<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}