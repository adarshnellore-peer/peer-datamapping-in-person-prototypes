import { type DragEvent, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import type { ContentBlockData, DocumentBlock } from "../../types";
import { KeyMessageFooter } from "../KeyMessageFooter";
import { AddEvidenceDropZone } from "./AddEvidenceDropZone";
import { SectionMapper } from "./SectionMapper";
import { effectiveFormatRole, effectiveSourceRole } from "./types";

function sourceHasMappedEvidence(source: import("../../data/roadmap").RoadmapSource): boolean {
  switch (source.sourceType) {
    case "DATA_SOURCE":
      return Boolean(source.dataSource?.trim() || source.referenceKey?.trim());
    case "REFERENCE_SOURCE":
      return Boolean(source.referenceSource?.trim());
    case "CONTENT":
    case "SUBCONTENT":
      return Boolean(source.content?.trim());
    default:
      return true;
  }
}

function sourcesForEvidenceKind(
  sources: import("../../data/roadmap").RoadmapSource[],
  kind: "data" | "outline",
): import("../../data/roadmap").RoadmapSource[] {
  if (kind === "data") {
    return sources.filter(
      (source) =>
        source.sourceType === "DATA_SOURCE" || source.sourceType === "REFERENCE_SOURCE",
    );
  }
  return sources.filter(
    (source) => source.sourceType === "CONTENT" || source.sourceType === "SUBCONTENT",
  );
}

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
  blocks,
  tracedSourceId,
  onTrace,
  onUpdateSource,
  onRemoveSource,
  onPromptChange,
  rolePickerMode = "usage",
  isDropTarget = false,
  dropOverlay,
  showAddZone = false,
  onAddDrop,
  onEvidenceDragOver,
  onEvidenceDragLeave,
  onEvidenceDrop,
  onMappedDragStart,
  onMappedDragEnd,
  onNavigateOutlineRef,
}: {
  cardRef?: (el: HTMLDivElement | null) => void;
  block: ContentBlockData;
  blocks?: import("../../types").DocumentBlock[];
  /** @deprecated Timeline index — unused in V1-style layout */
  index?: number;
  /** @deprecated Parent heading — unused in V1-style layout */
  contextLabel?: string | null;
  tracedSourceId: string | null;
  onTrace?: (sourceId: string) => void;
  onUpdateSource: (source: import("../../data/roadmap").RoadmapSource) => void;
  onRemoveSource: (sourceId: string) => void;
  onPromptChange?: (prompt: string) => void;
  rolePickerMode?: "usage" | "format";
  isDropTarget?: boolean;
  dropOverlay?: ReactNode;
  showAddZone?: boolean;
  onAddDrop?: (dataTransfer: DataTransfer) => void;
  onEvidenceDragOver?: (event: DragEvent) => void;
  onEvidenceDragLeave?: (event: DragEvent) => void;
  onEvidenceDrop?: (event: DragEvent) => void;
  onMappedDragStart?: (sourceId: string, event: DragEvent) => void;
  onMappedDragEnd?: () => void;
  onNavigateOutlineRef?: (source: import("../../data/roadmap").RoadmapSource) => void;
}) {
  const sourceTagCount = block.sources.filter(
    (source) => effectiveFormatRole(source) === "source",
  ).length;
  const showGap =
    rolePickerMode === "format"
      ? block.sources.some(
          (source) =>
            source.sourceType === "DATA_SOURCE" || source.sourceType === "REFERENCE_SOURCE",
        ) &&
        sourceTagCount === 0
      : block.sources.some(
          (source) =>
            source.sourceType === "DATA_SOURCE" || source.sourceType === "REFERENCE_SOURCE",
        ) &&
        !block.sources.some((source) => effectiveSourceRole(source) === "primary");

  const mappedDrag =
    onMappedDragStart && onMappedDragEnd
      ? {
          onDragStart: (sourceId: string, event: DragEvent) =>
            onMappedDragStart(sourceId, event),
          onDragEnd: onMappedDragEnd,
        }
      : undefined;

  const dataSources = sourcesForEvidenceKind(block.sources, "data").filter(
    sourceHasMappedEvidence,
  );
  const outlineRefs = sourcesForEvidenceKind(block.sources, "outline").filter(
    sourceHasMappedEvidence,
  );
  const isEmptyEvidence = dataSources.length === 0 && outlineRefs.length === 0;

  const sectionMapperProps = {
    block,
    blocks,
    tracedSourceId,
    onTrace,
    onUpdateSource,
    onRemoveSource,
    rolePickerMode,
    mappedDrag,
    hideEmptyState: true as const,
  };

  return (
    <div
      ref={cardRef}
      className={`peer-card relative transition-colors ${isDropTarget ? "is-drop-target" : ""}`}
      onDragOver={onEvidenceDragOver}
      onDragLeave={onEvidenceDragLeave}
      onDrop={onEvidenceDrop}
    >
      <div className="peer-card-header">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
          <p className="min-w-0 flex-1 text-[13px] font-medium leading-snug text-[var(--peer-text-secondary)]">
            {block.title}
          </p>
        </div>
      </div>

      <div className="peer-card-body">
        <div
          className={`peer-card-evidence relative ${isEmptyEvidence ? "peer-card-evidence--empty" : ""}`}
        >
          {dropOverlay}

          {isEmptyEvidence && onAddDrop ? (
            <AddEvidenceDropZone onDrop={onAddDrop} solo />
          ) : (
            <>
              {dataSources.length > 0 ? (
                <section className="peer-evidence-section">
                  <p className="peer-section-label">Sources</p>
                  <div className="peer-card-sources">
                    <SectionMapper {...sectionMapperProps} kind="data" />
                  </div>
                </section>
              ) : null}

              {outlineRefs.length > 0 ? (
                <section className="peer-evidence-section">
                  <p className="peer-section-label">Content / subcontent</p>
                  <div className="peer-card-outline-refs">
                    <SectionMapper
                      {...sectionMapperProps}
                      kind="outline"
                      onNavigateOutlineRef={onNavigateOutlineRef}
                    />
                  </div>
                </section>
              ) : null}

              {showAddZone && onAddDrop ? <AddEvidenceDropZone onDrop={onAddDrop} /> : null}
            </>
          )}
        </div>
      </div>

      {showGap && (
        <div className="mx-3 mb-3 flex items-center gap-2 peer-warning-banner sm:mx-4">
          <AlertTriangle size={14} className="shrink-0" />
          {rolePickerMode === "format"
            ? "Consider marking a source as Source before filing."
            : "Consider marking a source as primary before filing."}
        </div>
      )}

      {onPromptChange && (
        <KeyMessageFooter value={block.prompt} onChange={onPromptChange} />
      )}
    </div>
  );
}
