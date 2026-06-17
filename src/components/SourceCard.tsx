import { useState } from "react";
import { ChevronDown, Copy, X } from "lucide-react";
import { SourceCardPillFields } from "./SourceCardPillFields";
import { getSourceHeaderParts } from "../data/sourceHelpers";
import type { RoadmapSource } from "../data/roadmap";

export function DuplicateDeleteActions({
  onDuplicate,
  onRemove,
  duplicateLabel = "Duplicate",
  removeLabel = "Remove",
  className = "",
}: {
  onDuplicate: () => void;
  onRemove: () => void;
  duplicateLabel?: string;
  removeLabel?: string;
  className?: string;
}) {
  return (
    <div className={`flex shrink-0 items-center ${className}`}>
      <button
        type="button"
        aria-label={duplicateLabel}
        title={duplicateLabel}
        onClick={onDuplicate}
        className="rounded p-1 text-[#525252] hover:bg-black/5"
      >
        <Copy size={14} strokeWidth={1.75} />
      </button>
      <button
        type="button"
        aria-label={removeLabel}
        title={removeLabel}
        onClick={onRemove}
        className="rounded p-1 text-[#525252] hover:bg-[#fff0f0] hover:text-[#ff4e49]"
      >
        <X size={14} strokeWidth={1.75} />
      </button>
    </div>
  );
}

export function SourceCard({
  source,
  onChange,
  onDuplicate,
  onRemove,
}: {
  source: RoadmapSource;
  onChange: (source: RoadmapSource) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { tag, primary, secondary } = getSourceHeaderParts(source);

  return (
    <div className="overflow-hidden rounded-md border border-[#c8c8c8] bg-[#ececec]">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((open) => !open)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <ChevronDown
            size={15}
            strokeWidth={1.75}
            className={`shrink-0 text-[#525252] transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-semibold leading-snug text-[#1f1f1f]">
              {primary}
            </span>
            {(tag || secondary) && (
              <span className="mt-1 flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                {tag && (
                  <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-[#666]">
                    {tag}
                  </span>
                )}
                {secondary && (
                  <span className="min-w-0 truncate text-[13px] leading-snug text-[#454545]">
                    {secondary}
                  </span>
                )}
              </span>
            )}
          </span>
        </button>
        <DuplicateDeleteActions
          onDuplicate={onDuplicate}
          onRemove={onRemove}
          duplicateLabel="Duplicate source"
          removeLabel="Remove source"
        />
      </div>

      {expanded && (
        <div className="border-t border-[#c8c8c8] bg-white px-3 py-3">
          <SourceCardPillFields source={source} onChange={onChange} />
        </div>
      )}
    </div>
  );
}
