import { useState, type DragEvent } from "react";
import type { RoadmapSource, SourceFormatRole } from "../../data/roadmap";
import type { DocumentBlock } from "../../types";
import { InfoHintTooltip } from "../roadmap/InfoHintTooltip";
import {
  acceptsV2Drag,
  getActiveV2DragPayload,
  isOutlineDragPayload,
  isStudySourceDragPayload,
  outlineRefsFromPayload,
  readV2DragData,
  type OutlineRefPayload,
  type V2DragPayload,
} from "../../utils/v2DragPayload";
import { EvidenceChip } from "./EvidenceChip";
import { FORMAT_ROLE_HINT, isInDocReferenceSource } from "./types";

export type EvidenceSectionKind = "source" | "reference";

const DEFAULT_VISIBLE = {
  source: 6,
  reference: 8,
} as const;

const EMPTY_HINT: Record<EvidenceSectionKind, string> = {
  source: "+ Add Source",
  reference: "+ Add Reference",
};

export function EvidenceSection({
  kind,
  label,
  blockId,
  sources,
  blocks,
  tracedSourceId,
  maxVisible = DEFAULT_VISIBLE[kind],
  onTrace,
  onNavigateOutlineRef,
  onRemoveSource,
  onMoveMapped,
  onMapStudySource,
  onMapOutlineRef,
  mappedDrag,
}: {
  kind: EvidenceSectionKind;
  label: string;
  blockId: string;
  sources: RoadmapSource[];
  blocks?: DocumentBlock[];
  tracedSourceId: string | null;
  maxVisible?: number;
  onTrace?: (sourceId: string) => void;
  onNavigateOutlineRef?: (source: RoadmapSource) => void;
  onRemoveSource: (sourceId: string) => void;
  onMoveMapped?: (
    fromBlockId: string,
    sourceId: string,
    toBlockId: string,
    targetFormatRole: SourceFormatRole,
    toIndex?: number,
  ) => void;
  onMapStudySource?: (blockId: string, studySourceId: string, role: SourceFormatRole) => void;
  onMapOutlineRef?: (blockId: string, payload: OutlineRefPayload) => void;
  mappedDrag?: {
    onDragStart: (sourceId: string, event: DragEvent) => void;
    onDragEnd: () => void;
  };
}) {
  const [expanded, setExpanded] = useState(false);
  const [isDropTarget, setIsDropTarget] = useState(false);

  const visible = expanded ? sources : sources.slice(0, maxVisible);
  const overflow = expanded ? 0 : Math.max(0, sources.length - maxVisible);
  const targetFormatRole: SourceFormatRole = kind === "reference" ? "reference" : "source";

  const canAcceptPayload = (payload: V2DragPayload): boolean => {
    if (payload.kind === "mapped") {
      if (
        kind === "source" &&
        (payload.sourceType === "CONTENT" || payload.sourceType === "SUBCONTENT")
      ) {
        return false;
      }
      return true;
    }
    if (isOutlineDragPayload(payload)) {
      return kind === "reference";
    }
    if (isStudySourceDragPayload(payload)) {
      return true;
    }
    return false;
  };

  const applyPayload = (payload: V2DragPayload) => {
    if (payload.kind === "mapped") {
      onMoveMapped?.(
        payload.fromBlockId,
        payload.sourceId,
        blockId,
        payload.targetFormatRole ?? targetFormatRole,
      );
      return;
    }
    if (isOutlineDragPayload(payload) && onMapOutlineRef) {
      for (const ref of outlineRefsFromPayload(payload)) {
        if (ref.fromBlockId === blockId) continue;
        onMapOutlineRef(blockId, ref);
      }
      return;
    }
    if (isStudySourceDragPayload(payload) && onMapStudySource) {
      if (payload.kind === "study-source") {
        onMapStudySource(blockId, payload.studySourceId, targetFormatRole);
      } else if (payload.kind === "study-sources") {
        for (const studySourceId of payload.studySourceIds) {
          onMapStudySource(blockId, studySourceId, targetFormatRole);
        }
      }
    }
  };

  const handleDragOver = (event: DragEvent) => {
    const payload = getActiveV2DragPayload() ?? readV2DragData(event.dataTransfer);
    if (!payload && !acceptsV2Drag(event.dataTransfer)) return;
    if (payload && !canAcceptPayload(payload)) {
      event.dataTransfer.dropEffect = "none";
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = payload?.kind === "mapped" ? "move" : "copy";
    setIsDropTarget(true);
  };

  const handleDragLeave = (event: DragEvent) => {
    const next = event.relatedTarget as Node | null;
    if (next && event.currentTarget.contains(next)) return;
    setIsDropTarget(false);
  };

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDropTarget(false);
    const payload = readV2DragData(event.dataTransfer) ?? getActiveV2DragPayload();
    if (!payload || !canAcceptPayload(payload)) return;
    applyPayload(payload);
  };

  return (
    <section
      className={`peer-evidence-section peer-evidence-section--${kind} ${
        isDropTarget ? "is-drop-target" : ""
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="peer-evidence-section-head">
        <p className="peer-section-label peer-section-label--compact">{label}</p>
        <InfoHintTooltip hint={FORMAT_ROLE_HINT[kind]} />
      </div>
      <div
        className={`peer-evidence-chip-row ${
          sources.length === 0 ? "peer-evidence-chip-row--empty" : ""
        }`}
        aria-label={sources.length === 0 ? `Drop ${label.toLowerCase()} here` : undefined}
      >
        {sources.length === 0 ? (
          <span className="peer-evidence-empty-hint">{EMPTY_HINT[kind]}</span>
        ) : (
          <>
            {visible.map((source) => (
          <EvidenceChip
            key={source.id}
            source={source}
            blocks={blocks}
            isTraced={tracedSourceId === source.id}
            inDoc={isInDocReferenceSource(source)}
            onTrace={onTrace ? () => onTrace(source.id) : undefined}
            onNavigateOutlineRef={
              isInDocReferenceSource(source) && onNavigateOutlineRef
                ? () => onNavigateOutlineRef(source)
                : undefined
            }
            onRemove={() => onRemoveSource(source.id)}
            mappedDrag={
              mappedDrag
                ? {
                    onDragStart: (event) => mappedDrag.onDragStart(source.id, event),
                    onDragEnd: mappedDrag.onDragEnd,
                  }
                : undefined
            }
          />
        ))}
        {overflow > 0 ? (
          <button
            type="button"
            className="peer-evidence-chip-overflow"
            onClick={() => setExpanded(true)}
            title={`Show ${overflow} more`}
          >
            +{overflow}
          </button>
        ) : null}
        {expanded && sources.length > maxVisible ? (
          <button
            type="button"
            className="peer-evidence-chip-overflow peer-evidence-chip-overflow--less"
            onClick={() => setExpanded(false)}
          >
            Less
          </button>
        ) : null}
          </>
        )}
      </div>
    </section>
  );
}
