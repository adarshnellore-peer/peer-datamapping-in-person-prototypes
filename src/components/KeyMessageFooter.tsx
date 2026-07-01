import { useEffect, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";

function promptPreview(value: string): string {
  const collapsed = value.replace(/\s+/g, " ").trim();
  return collapsed || "Add system instructions for this section…";
}

export function KeyMessageFooter({
  value,
  onChange,
  placement = "footer",
}: {
  value: string;
  onChange: (value: string) => void;
  placement?: "header" | "footer";
}) {
  const [expanded, setExpanded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasPrompt = value.replace(/\s+/g, " ").trim().length > 0;
  const preview = promptPreview(value);

  useEffect(() => {
    if (!expanded) return;
    textareaRef.current?.focus();
    const length = textareaRef.current?.value.length ?? 0;
    textareaRef.current?.setSelectionRange(length, length);
  }, [expanded]);

  return (
    <div
      className={
        placement === "header" ? "peer-card-prompt peer-card-prompt--header" : "peer-card-footer"
      }
    >
      {expanded ? (
        <div className="flex items-start gap-1.5">
          <button
            type="button"
            aria-expanded
            aria-label="Collapse key message"
            onClick={() => setExpanded(false)}
            className="mt-2.5 shrink-0 rounded p-0.5 text-[var(--peer-muted)] transition-colors hover:text-[var(--peer-text)]"
          >
            <ChevronRight size={14} className="rotate-90" aria-hidden />
          </button>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            rows={4}
            placeholder="Add system instructions for this section…"
            className="min-w-0 flex-1 resize-y rounded-md border border-[var(--peer-border)] bg-white px-3 py-2.5 text-[14px] leading-relaxed text-[var(--peer-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff4e49]/30"
          />
        </div>
      ) : (
        <button
          type="button"
          aria-expanded={false}
          onClick={() => setExpanded(true)}
          className="flex w-full min-w-0 items-center gap-1.5 text-left transition-colors hover:text-[var(--peer-text)]"
        >
          <ChevronRight
            size={14}
            className="shrink-0 text-[var(--peer-muted)]"
            aria-hidden
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
      )}
    </div>
  );
}
