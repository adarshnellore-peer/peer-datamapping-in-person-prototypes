import type { DragEvent } from "react";
import type { RoadmapSource } from "../../data/roadmap";
import type { ContentBlockData } from "../../types";
import { SourcePill } from "./SourcePill";

export type SourceListKind = "data" | "outline" | "all";

function sourcesForKind(sources: RoadmapSource[], kind: SourceListKind): RoadmapSource[] {
  if (kind === "all") return sources;
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

/**
 * The sources area for a single section. Renders each source as an inline
 * SourcePill (confirm / swap / usage), shared by V2's expanded rows and V3's
 * mapping pane.
 */
export function SectionMapper({
  block,
  blocks,
  tracedSourceId,
  onTrace,
  onUpdateSource,
  onRemoveSource,
  allowSourceTypeChange = false,
  rolePickerMode = "usage",
  kind = "all",
  mappedDrag,
  hideEmptyState = false,
  onNavigateOutlineRef,
}: {
  block: ContentBlockData;
  blocks?: import("../../types").DocumentBlock[];
  tracedSourceId: string | null;
  onTrace?: (sourceId: string) => void;
  onUpdateSource: (source: RoadmapSource) => void;
  onRemoveSource: (sourceId: string) => void;
  allowSourceTypeChange?: boolean;
  rolePickerMode?: "usage" | "format";
  /** Data sources vs outline-linked content / subcontent. */
  kind?: SourceListKind;
  /** Drag mapped pills within or across sections. */
  mappedDrag?: {
    onDragStart: (sourceId: string, event: DragEvent) => void;
    onDragEnd: () => void;
  };
  hideEmptyState?: boolean;
  onNavigateOutlineRef?: (source: RoadmapSource) => void;
}) {
  const traceOnFieldClick =
    Boolean(onTrace) && !allowSourceTypeChange && kind !== "outline";
  const sources = sourcesForKind(block.sources, kind);

  return (
    <div className={`peer-source-list ${kind === "data" ? "peer-source-list--data" : kind === "outline" ? "peer-source-list--outline" : ""}`}>
      {sources.map((source) => (
        <SourcePill
          key={source.id}
          source={source}
          variant="v2"
          allowSourceTypeChange={allowSourceTypeChange}
          rolePickerMode={rolePickerMode}
          traceOnFieldClick={traceOnFieldClick}
          artifactBlocks={blocks}
          isTraced={tracedSourceId === source.id}
          matrixDrag={
            mappedDrag
              ? {
                  onDragStart: (event) => mappedDrag.onDragStart(source.id, event),
                  onDragEnd: mappedDrag.onDragEnd,
                }
              : undefined
          }
          onChange={onUpdateSource}
          onTrace={
            kind === "outline" ? undefined : onTrace ? () => onTrace(source.id) : undefined
          }
          onNavigateOutlineRef={
            kind === "outline" && onNavigateOutlineRef
              ? () => onNavigateOutlineRef(source)
              : undefined
          }
          onRemove={() => onRemoveSource(source.id)}
        />
      ))}
      {sources.length === 0 && kind !== "all" && !hideEmptyState ? (
        <p className="py-2 text-center text-[12px] text-[var(--peer-text-caption)]">
          {kind === "data"
            ? "No data sources mapped to this section."
            : "No content or subcontent linked yet."}
        </p>
      ) : null}
    </div>
  );
}
