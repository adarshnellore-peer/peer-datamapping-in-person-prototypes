import { useState } from "react";
import { ChevronRight } from "lucide-react";

function promptPreview(value: string): string {
  const collapsed = value.replace(/\s+/g, " ").trim();
  return collapsed || "Add system instructions for this section…";
}

export function KeyMessageFooter({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasPrompt = value.replace(/\s+/g, " ").trim().length > 0;
  const preview = promptPreview(value);

  return (
    <div className="peer-card-footer">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full min-w-0 items-center gap-1.5 text-left transition-colors hover:text-[var(--peer-text)]"
      >
        <ChevronRight
          size={14}
          className={`shrink-0 text-[var(--peer-muted)] transition-transform ${expanded ? "rotate-90" : ""}`}
        />
        <span
          className={`min-w-0 flex-1 truncate text-[12px] leading-snug ${
            hasPrompt ? "text-[var(--peer-text)]" : "italic text-[var(--peer-muted)]"
          }`}
          title={hasPrompt ? preview : undefined}
        >
          {preview}
        </span>
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
