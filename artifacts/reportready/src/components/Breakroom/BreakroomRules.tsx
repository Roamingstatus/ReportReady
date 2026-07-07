const RULES = [
  "No patient names",
  "No facility names",
  "No medical advice",
  "No bullying",
  "Keep it nurse-safe",
] as const;

export function BreakroomRules() {
  return (
    <aside className="breakroom-card p-4 sm:p-5" aria-label="Breakroom rules">
      <h2 className="breakroom-heading text-base">Breakroom Rules</h2>
      <p className="mt-1 text-xs text-[#6B6B6B]">
        A cozy spot for shift laughs, wins, rants, and real talk — safely.
      </p>
      <ul className="mt-4 space-y-2">
        {RULES.map((rule) => (
          <li
            key={rule}
            className="flex items-start gap-2 text-sm text-[#2B2B2B]"
          >
            <span className="mt-0.5 text-[#F2D13D]" aria-hidden>
              ▸
            </span>
            {rule}
          </li>
        ))}
      </ul>
    </aside>
  );
}
