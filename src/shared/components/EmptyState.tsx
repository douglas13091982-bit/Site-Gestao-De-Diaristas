import type { ReactNode } from "react";

type Props = {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
};

export function EmptyState({ title, description, icon, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center">
      {icon ? <div className="text-muted-foreground">{icon}</div> : null}
      <div className="space-y-1">
        <p className="font-semibold text-foreground">{title}</p>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}