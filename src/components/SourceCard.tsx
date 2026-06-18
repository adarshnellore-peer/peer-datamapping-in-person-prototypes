import { Copy, X } from "lucide-react";
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
        onClick={(event) => {
          event.stopPropagation();
          onDuplicate();
        }}
        className="rounded p-1.5 text-[#525252] hover:bg-black/5 sm:p-1"
      >
        <Copy size={14} strokeWidth={1.75} />
      </button>
      <button
        type="button"
        aria-label={removeLabel}
        title={removeLabel}
        onClick={(event) => {
          event.stopPropagation();
          onRemove();
        }}
        className="rounded p-1.5 text-[#525252] hover:bg-[#fff0f0] hover:text-[#ff4e49] sm:p-1"
      >
        <X size={14} strokeWidth={1.75} />
      </button>
    </div>
  );
}

export function SourceCard({
  source,
  isExpanded,
  isTraced,
  onCardClick,
  onChange,
  onDuplicate,
  onRemove,
}: {
  source: RoadmapSource;
  isExpanded: boolean;
  isTraced: boolean;
  onCardClick: () => void;
  onChange: (source: RoadmapSource) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const { tag, primary, secondary } = getSourceHeaderParts(source);

  return (
    <div
      data-source-card=""
      className={`overflow-hidden rounded-md border transition-colors ${
        isTraced ? "border-[#ff4e49]" : "border-[#c8c8c8]"
      }`}
    >
      <div
        className={`flex items-center gap-2 bg-[#ececec] px-3 py-2.5 transition-colors ${
          !isExpanded ? "cursor-pointer hover:bg-[#dedede]" : ""
        }`}
      >
        <button
          type="button"
          onClick={onCardClick}
          className={`flex min-w-0 flex-1 items-center gap-2 text-left ${
            !isExpanded ? "cursor-pointer" : ""
          }`}
        >
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

      {isExpanded && (
        <div className="border-t border-[#c8c8c8] bg-white px-3 py-3">
          <SourceCardPillFields source={source} onChange={onChange} />
        </div>
      )}
    </div>
  );
}
