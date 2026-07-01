import { type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import type { ContentBlockData, DocumentBlock } from "../../types";
import { KeyMessageFooter } from "../KeyMessageFooter";
import { SectionMapper } from "./SectionMapper";
import { isInsertRole } from "./types";

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
  const insertCount = block.sources.filter((s) => isInsertRole(s.role)).length;
  const showGap = block.sources.length > 0 && insertCount === 0;

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
          Consider marking a source as text or table before filing.
        </div>
      )}

      {onPromptChange && (
        <KeyMessageFooter value={block.prompt} onChange={onPromptChange} />
      )}
    </div>
  );
}
