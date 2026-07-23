import type { ReactNode } from "react";

type Props = {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  size?: "sm" | "md";
};

export function ChipToggle({ active, onClick, children, size = "sm" }: Props) {
  const sizing =
    size === "md"
      ? "min-h-10 px-3 py-2 text-sm text-center leading-tight"
      : "px-3 py-1.5 text-xs";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-full border transition whitespace-normal ${sizing} ${
        active
          ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
          : "border-primary/20 bg-primary/10 text-foreground/80 hover:bg-primary/20"
      }`}
    >
      {children}
    </button>
  );
}

export function toggleInArray<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}