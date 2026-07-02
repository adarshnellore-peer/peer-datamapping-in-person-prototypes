import { type DragEvent, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import type { RoadmapSource, SourceFormatRole } from "../../data/roadmap";
import { isTlfRoadmapSource } from "../../data/studyDataSources";
import type { ContentBlockData, DocumentBlock } from "../../types";
import type { OutlineRefPayload } from "../../utils/v2DragPayload";
import { KeyMessageFooter } from "../KeyMessageFooter";
// import { AddEvidenceDropZone } from "./AddEvidenceDropZone";
import { EvidenceSection } from "./EvidenceSection";
import {
  effectiveFormatRole,
  effectiveSourceRole,
  evidenceSectionForSource,
} from "./types";

function sourceHasMappedEvidence(source: RoadmapSource): boolean {
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
  /** @deprecated */
  index: _index,
  /** @deprecated */
  contextLabel: _contextLabel,
  tracedSourceId,
  onTrace,
  onUpdateSource: _onUpdateSource,
  onRemoveSource,
  onPromptChange,
  rolePickerMode = "usage",
  isDropTarget = false,
  dropOverlay,
  showAddZone: _showAddZone = false,
  onAddDrop: _onAddDrop,
  onEvidenceDragOver,
  onEvidenceDragLeave,
  onEvidenceDrop,
  onMappedDragStart,
  onMappedDragEnd,
  onMoveMapped,
  onMapStudySourceWithRole,
  onMapOutlineRef,
  onNavigateOutlineRef,
  tlfOnly = false,
}: {
  cardRef?: (el: HTMLDivElement | null) => void;
  block: ContentBlockData;
  blocks?: DocumentBlock[];
  /** @deprecated Timeline index — unused in compressed layout */
  index?: number;
  /** @deprecated Parent heading — unused in compressed layout */
  contextLabel?: string | null;
  tracedSourceId: string | null;
  onTrace?: (sourceId: string) => void;
  onUpdateSource: (source: RoadmapSource) => void;
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
  onMoveMapped?: (
    fromBlockId: string,
    sourceId: string,
    toBlockId: string,
    targetFormatRole: SourceFormatRole,
    toIndex?: number,
  ) => void;
  onMapStudySourceWithRole?: (
    blockId: string,
    studySourceId: string,
    role: SourceFormatRole,
  ) => void;
  onMapOutlineRef?: (blockId: string, payload: OutlineRefPayload) => void;
  onNavigateOutlineRef?: (source: RoadmapSource) => void;
  /** When true, only TLF-mapped sources are shown in the card. */
  tlfOnly?: boolean;
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

  const mappedSources = block.sources.filter(sourceHasMappedEvidence);
  const visibleSources = tlfOnly
    ? mappedSources.filter(isTlfRoadmapSource)
    : mappedSources;
  const dataSources = visibleSources.filter(
    (source) => evidenceSectionForSource(source, rolePickerMode) === "source",
  );
  const referenceSources = visibleSources.filter(
    (source) => evidenceSectionForSource(source, rolePickerMode) === "reference",
  );

  return (
    <div
      ref={cardRef}
      className={`peer-card peer-card--compressed relative transition-colors ${isDropTarget ? "is-drop-target" : ""}`}
      onDragOver={onEvidenceDragOver}
      onDragLeave={onEvidenceDragLeave}
      onDrop={onEvidenceDrop}
    >
      {onPromptChange ? (
        <KeyMessageFooter
          placement="header"
          value={block.prompt}
          onChange={onPromptChange}
          outputType={block.outputType}
          draftSources={dataSources}
        />
      ) : null}

      <div className="peer-beat-evidence peer-card-body peer-card-body--compressed">
        <div className="peer-card-evidence peer-card-evidence--compressed relative">
          {dropOverlay}

          <EvidenceSection
            kind="source"
            label="Sources"
            blockId={block.id}
            sources={dataSources}
            blocks={blocks}
            tracedSourceId={tracedSourceId}
            onTrace={onTrace}
            onRemoveSource={onRemoveSource}
            onMoveMapped={onMoveMapped}
            onMapStudySource={onMapStudySourceWithRole}
            mappedDrag={mappedDrag}
          />

          <EvidenceSection
            kind="reference"
            label="References"
            blockId={block.id}
            sources={referenceSources}
            blocks={blocks}
            tracedSourceId={tracedSourceId}
            onTrace={onTrace}
            onNavigateOutlineRef={onNavigateOutlineRef}
            onRemoveSource={onRemoveSource}
            onMoveMapped={onMoveMapped}
            onMapStudySource={onMapStudySourceWithRole}
            onMapOutlineRef={onMapOutlineRef}
            mappedDrag={mappedDrag}
          />

          {/* {showAddZone && onAddDrop ? <AddEvidenceDropZone onDrop={onAddDrop} /> : null} */}
          {/* {isEmptyEvidence && onAddDrop ? <AddEvidenceDropZone onDrop={onAddDrop} solo /> : null} */}
        </div>
      </div>

      {showGap && (
        <div className="mx-3 mb-2 flex items-center gap-2 peer-warning-banner sm:mx-4">
          <AlertTriangle size={14} className="shrink-0" />
          {rolePickerMode === "format"
            ? "Consider marking a source as Source before filing."
            : "Consider marking a source as primary before filing."}
        </div>
      )}

    </div>
  );
}
