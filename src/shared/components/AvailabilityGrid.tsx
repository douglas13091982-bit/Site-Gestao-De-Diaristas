import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export type DayAvailability = {
  on: boolean;
  start: string; // "HH:MM"
  end: string;   // "HH:MM"
};

const WEEKDAYS: { idx: number; label: string }[] = [
  { idx: 0, label: "Domingo" },
  { idx: 1, label: "Segunda" },
  { idx: 2, label: "Terça" },
  { idx: 3, label: "Quarta" },
  { idx: 4, label: "Quinta" },
  { idx: 5, label: "Sexta" },
  { idx: 6, label: "Sábado" },
];

export type AvailabilityMap = Map<number, DayAvailability>;

export function createDefaultAvailability(): AvailabilityMap {
  return new Map(
    WEEKDAYS.map(({ idx }) => [
      idx,
      { on: idx >= 1 && idx <= 5, start: "08:00", end: "18:00" },
    ]),
  );
}

type Props = {
  value: AvailabilityMap;
  onChange: (next: AvailabilityMap) => void;
  disabled?: boolean;
};

export function AvailabilityGrid({ value, onChange, disabled }: Props) {
  function update(idx: number, patch: Partial<DayAvailability>) {
    const next = new Map(value);
    const current = next.get(idx) ?? { on: false, start: "08:00", end: "18:00" };
    next.set(idx, { ...current, ...patch });
    onChange(next);
  }

  return (
    <div className="space-y-2">
      {WEEKDAYS.map(({ idx, label }) => {
        const day = value.get(idx) ?? { on: false, start: "08:00", end: "18:00" };
        return (
          <div
            key={idx}
            className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card/60 px-3 py-2"
          >
            <div className="flex min-w-[8rem] items-center gap-2">
              <Switch
                checked={day.on}
                disabled={disabled}
                onCheckedChange={(v) => update(idx, { on: Boolean(v) })}
              />
              <span className="text-sm font-medium">{label}</span>
            </div>
            <Input
              type="time"
              className="w-28"
              value={day.start}
              disabled={disabled || !day.on}
              onChange={(e) => update(idx, { start: e.target.value })}
            />
            <span className="text-xs text-muted-foreground">até</span>
            <Input
              type="time"
              className="w-28"
              value={day.end}
              disabled={disabled || !day.on}
              onChange={(e) => update(idx, { end: e.target.value })}
            />
          </div>
        );
      })}
    </div>
  );
}