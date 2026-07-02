import { useEffect, useRef, useState } from "react";
import { Pencil } from "lucide-react";
import type { RoadmapSource } from "../data/roadmap";
import { BlockOutputTypeIcon } from "./roadmap/BlockOutputTypeIcon";
import { generateBlockSummary } from "../utils/blockSummary";

export function KeyMessageFooter({
  value,
  onChange,
  placement = "footer",
  outputType,
  draftSources = [],
  hideTypeIcon = false,
}: {
  value: string;
  onChange: (value: string) => void;
  placement?: "header" | "footer";
  outputType?: string;
  /** Mapped drafting sources — used to anchor the summary in real document sections. */
  draftSources?: RoadmapSource[];
  hideTypeIcon?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasPrompt = value.replace(/\s+/g, " ").trim().length > 0;
  const summary = generateBlockSummary(value, outputType, draftSources);

  useEffect(() => {
    if (!expanded) return;
    textareaRef.current?.focus();
    const length = textareaRef.current?.value.length ?? 0;
    textareaRef.current?.setSelectionRange(length, length);
  }, [expanded]);

  const descriptionControl = expanded ? (
    <div className="peer-key-message-row flex min-w-0 items-start gap-2">
      {!hideTypeIcon && outputType ? (
        <BlockOutputTypeIcon outputType={outputType} size="sm" className="mt-2 shrink-0" />
      ) : null}
      <div className="peer-key-message-editor min-w-0 flex-1">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setExpanded(false);
          }}
          onBlur={() => setExpanded(false)}
          rows={4}
          placeholder="Add system instructions for this section…"
          className="peer-key-message-textarea"
          aria-label="Section instructions"
        />
      </div>
    </div>
  ) : (
    <div className="peer-key-message-row flex min-w-0 items-center gap-2">
      {!hideTypeIcon && outputType ? (
        <BlockOutputTypeIcon outputType={outputType} size="sm" className="shrink-0" />
      ) : null}
      <button
        type="button"
        aria-expanded={false}
        aria-label={hasPrompt ? "Edit generation instructions" : "Add generation instructions"}
        onClick={() => setExpanded(true)}
        className="peer-key-message-chip group/chip min-w-0 flex-1"
        title={hasPrompt ? value.replace(/\s+/g, " ").trim() : undefined}
      >
        <span
          className={`peer-key-message-summary min-w-0 flex-1 truncate ${
            hasPrompt ? "" : "is-placeholder"
          }`}
        >
          {summary}
        </span>
        <Pencil
          size={12}
          strokeWidth={2}
          className="shrink-0 text-[var(--peer-key-message-icon)] opacity-50 transition-opacity group-hover/chip:opacity-90"
          aria-hidden
        />
      </button>
    </div>
  );

  return (
    <div
      className={
        placement === "header"
          ? "peer-beat-summary peer-card-prompt--header"
          : "peer-card-footer"
      }
    >
      {descriptionControl}
    </div>
  );
}
