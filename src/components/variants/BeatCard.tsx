import { useState, type ReactNode } from "react";
import { AlertTriangle, ChevronRight } from "lucide-react";
import type { ContentBlockData, DocumentBlock } from "../../types";
import { SectionMapper } from "./SectionMapper";

/** Nearest preceding heading label for a content block. */
export function headingLabelFor(blocks: DocumentBlock[], blockId: string): string | null {
  let current: string | null = null;
  for (const block of blocks) {
    if (block.type === "heading") {
      current = `${block.number ? block.number + " " : ""}${block.title}`;
    } else if (block.id === blockId) {
      return current;
    }
  }
  return null;
}

export function BeatCard({
  cardRef,
  block,
  tracedSourceId,
  onTrace,
  onUpdateSource,
  onRemoveSource,
  onPromptChange,
  isDropTarget = false,
  dropOverlay,
}: {
  cardRef?: (el: HTMLDivElement | null) => void;
  block: ContentBlockData;
  /** @deprecated Timeline index — unused in V1-style layout */
  index?: number;
  /** @deprecated Parent heading — unused in V1-style layout */
  contextLabel?: string | null;
  tracedSourceId: string | null;
  onTrace?: (sourceId: string) => void;
  onUpdateSource: (source: import("../../data/roadmap").RoadmapSource) => void;
  onRemoveSource: (sourceId: string) => void;
  onPromptChange?: (prompt: string) => void;
  isDropTarget?: boolean;
  dropOverlay?: ReactNode;
}) {
  const primaryCount = block.sources.filter((s) => s.role === "primary").length;
  const showGap = block.sources.length > 0 && primaryCount === 0;
  const [showMessage, setShowMessage] = useState(false);

  return (
    <div
      ref={cardRef}
      className={`peer-card relative transition-colors ${
        isDropTarget ? "border-[var(--peer-primary)] ring-2 ring-[#ff4e49]/15" : ""
      }`}
    >
      {dropOverlay}

      <div className="peer-card-header">
        <p className="text-[14px] font-medium leading-snug text-[var(--peer-text)]">{block.title}</p>
      </div>

      <div className="peer-card-body">
        <p className="peer-section-label">Sources</p>
        <SectionMapper
          block={block}
          tracedSourceId={tracedSourceId}
          onTrace={onTrace}
          onUpdateSource={onUpdateSource}
          onRemoveSource={onRemoveSource}
        />
      </div>

      {showGap && (
        <div className="mx-3 mb-3 flex items-center gap-2 rounded-md bg-[#fff8e6] px-3 py-2 text-[12px] text-[#9a6700] sm:mx-4">
          <AlertTriangle size={14} className="shrink-0" />
          Consider marking a source as primary before filing.
        </div>
      )}

      {onPromptChange && (
        <div className="peer-card-footer">
          <button
            type="button"
            aria-expanded={showMessage}
            onClick={() => setShowMessage((v) => !v)}
            className="flex items-center gap-1 text-[12px] font-medium text-[var(--peer-muted)] transition-colors hover:text-[var(--peer-text)]"
          >
            <ChevronRight
              size={14}
              className={`transition-transform ${showMessage ? "rotate-90" : ""}`}
            />
            Key message
          </button>
          {showMessage && (
            <textarea
              value={block.prompt}
              onChange={(event) => onPromptChange(event.target.value)}
              rows={4}
              placeholder="Add system instructions for this section…"
              className="mt-2 w-full resize-y rounded-md border border-[var(--peer-border)] bg-white px-3 py-2.5 text-[14px] leading-relaxed text-[var(--peer-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff4e49]/30"
            />
          )}
        </div>
      )}
    </div>
  );
}
