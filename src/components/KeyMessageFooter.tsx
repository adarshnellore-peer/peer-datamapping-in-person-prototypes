import { useState } from "react";
import { ChevronRight } from "lucide-react";

export function KeyMessageFooter({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="peer-card-footer">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1 text-[12px] font-medium text-[var(--peer-muted)] transition-colors hover:text-[var(--peer-text)]"
      >
        <ChevronRight
          size={14}
          className={`transition-transform ${expanded ? "rotate-90" : ""}`}
        />
        Key message
      </button>
      {expanded && (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={4}
          placeholder="Add system instructions for this section…"
          className="mt-2 w-full resize-y rounded-md border border-[var(--peer-border)] bg-white px-3 py-2.5 text-[14px] leading-relaxed text-[var(--peer-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff4e49]/30"
        />
      )}
    </div>
  );
}
