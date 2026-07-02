import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import type { HeadingBlock } from "../../types";
import { BeatCard } from "./BeatCard";
import { type VariantProps } from "./types";
import {
  acceptsV2Drag,
  getActiveV2DragPayload,
  isOutlineDragPayload,
  isStudySourceDragPayload,
  outlineRefsFromPayload,
  readV2DragData,
  setV2DragData,
  type OutlineRefPayload,
  type V2DragPayload,
} from "../../utils/v2DragPayload";

function V2Heading({
  block,
  headingRef,
}: {
  block: HeadingBlock;
  headingRef?: (el: HTMLDivElement | null) => void;
}) {
  const isH1 = block.level === 1;
  const isH2 = block.level === 2;
  const isH3 = block.level === 3;
  const Tag = isH1 ? "h1" : isH2 ? "h2" : "h3";
  const wrapperClassName = isH1
    ? "mt-8 sm:mt-10"
    : isH2
      ? "mt-6 sm:mt-8"
      : isH3
        ? "mt-5 sm:mt-6"
        : "mt-4";
  const tagClassName = isH1
    ? "text-[24px] font-semibold leading-8 text-[var(--peer-heading)] sm:text-[28px] sm:leading-9"
    : isH2
      ? "text-[20px] font-semibold leading-7 text-[var(--peer-heading)] sm:text-[24px] sm:leading-8"
      : isH3
        ? "text-[18px] font-semibold leading-7 text-[var(--peer-heading)] sm:text-[20px]"
        : "text-[16px] font-semibold leading-6 text-[var(--peer-heading)]";

  return (
    <div ref={headingRef} className={`first:mt-0 ${wrapperClassName}`}>
      <Tag className={tagClassName}>
        {block.number && <span className="peer-doc-heading-num">{block.number} </span>}
        {block.title}
      </Tag>
    </div>
  );
}

/**
 * V2 — Evidence-first mapping board. V1-style section cards with source pills;
 * drag from the outline (left) or document library (right).
 */
export function TwoColumnVariant({
  blocks,
  tracedSource,
  onTraceSource,
  onUpdateSource,
  onRemoveSource,
  onMapStudySource,
  onMapStudySources,
  onMapOutlineRefToSection,
  onMoveSource,
  onMapStudySourceWithRole,
  onPromptChange,
  rolePickerMode = "usage",
  focusId,
  scrollTick = 0,
  onNavigateOutlineRef,
  tlfOnly = false,
}: Omit<VariantProps, "onAddSource"> & {
  onMapStudySource: (blockId: string, studySourceId: string) => void;
  onMapStudySources?: (blockId: string, studySourceIds: string[]) => void;
  onMapOutlineRefToSection: (blockId: string, payload: OutlineRefPayload) => void;
  onMoveSource?: (
    fromBlockId: string,
    sourceId: string,
    toBlockId: string,
    toIndex?: number,
    formatRole?: import("../../data/roadmap").SourceFormatRole,
  ) => void;
  onMapStudySourceWithRole?: (
    blockId: string,
    studySourceId: string,
    role: import("../../data/roadmap").SourceFormatRole,
  ) => void;
  onPromptChange?: (blockId: string, prompt: string) => void;
  rolePickerMode?: "usage" | "format";
  focusId?: string | null;
  /** Bumped on outline clicks so re-selecting the active row still scrolls. */
  scrollTick?: number;
  onNavigateOutlineRef?: (source: import("../../data/roadmap").RoadmapSource) => void;
  tlfOnly?: boolean;
}) {
  const [externalDrag, setExternalDrag] = useState(false);
  const [hoverTarget, setHoverTarget] = useState<{ blockId: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const blockRefs = useRef<Record<string, HTMLElement | null>>({});
  const skipScrollRef = useRef(false);

  useEffect(() => {
    if (!focusId || skipScrollRef.current || externalDrag) return;
    blockRefs.current[focusId]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusId, externalDrag, scrollTick]);

  useEffect(() => {
    const onDragStart = (event: globalThis.DragEvent) => {
      if (getActiveV2DragPayload() || acceptsV2Drag(event.dataTransfer)) {
        setExternalDrag(true);
        skipScrollRef.current = true;
      }
    };
    const onDragEnd = () => {
      setExternalDrag(false);
      skipScrollRef.current = false;
      setHoverTarget(null);
    };
    document.addEventListener("dragstart", onDragStart);
    document.addEventListener("dragend", onDragEnd);
    return () => {
      document.removeEventListener("dragstart", onDragStart);
      document.removeEventListener("dragend", onDragEnd);
    };
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (externalDrag) {
      el.style.overflow = "hidden";
      el.style.overscrollBehavior = "none";
    } else {
      el.style.overflow = "";
      el.style.overscrollBehavior = "";
    }
  }, [externalDrag]);

  const applyPayload = useCallback(
    (toBlockId: string, payload: V2DragPayload) => {
      if (isOutlineDragPayload(payload)) {
        for (const ref of outlineRefsFromPayload(payload)) {
          if (ref.fromBlockId === toBlockId) continue;
          onMapOutlineRefToSection(toBlockId, ref);
        }
        return;
      }

      if (isStudySourceDragPayload(payload)) {
        switch (payload.kind) {
          case "study-source":
            onMapStudySource(toBlockId, payload.studySourceId);
            break;
          case "study-sources":
            if (onMapStudySources) {
              onMapStudySources(toBlockId, payload.studySourceIds);
            } else {
              for (const studySourceId of payload.studySourceIds) {
                onMapStudySource(toBlockId, studySourceId);
              }
            }
            break;
        }
        return;
      }

      if (payload.kind === "mapped") {
        onMoveSource?.(payload.fromBlockId, payload.sourceId, toBlockId, payload.toIndex);
      }
    },
    [onMapOutlineRefToSection, onMapStudySource, onMapStudySources, onMoveSource],
  );

  const dropOnBlock = (blockId: string, dataTransfer: DataTransfer) => {
    const payload = readV2DragData(dataTransfer) ?? getActiveV2DragPayload();
    if (payload) applyPayload(blockId, payload);
    setHoverTarget(null);
    setExternalDrag(false);
    skipScrollRef.current = false;
  };

  const handleEvidenceDragOver = (event: DragEvent, blockId: string) => {
    if (!acceptsV2Drag(event.dataTransfer) && !externalDrag) return;
    const payload = getActiveV2DragPayload();
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = payload?.kind === "mapped" ? "move" : "copy";
    setHoverTarget((current) => (current?.blockId === blockId ? current : { blockId }));
  };

  const handleEvidenceDragLeave = (event: DragEvent, blockId: string) => {
    const next = event.relatedTarget as Node | null;
    if (next && event.currentTarget.contains(next)) return;
    setHoverTarget((current) => (current?.blockId === blockId ? null : current));
  };

  const handleBoardDragOver = (event: DragEvent) => {
    if (!acceptsV2Drag(event.dataTransfer) && !externalDrag) return;
    event.preventDefault();
  };

  const dropOverlay =
    externalDrag ? (
      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-lg border-2 border-dashed border-[var(--peer-primary)] bg-white/90">
        <span className="text-[12px] font-medium text-[var(--peer-primary)]">
          Release to add to section
        </span>
      </div>
    ) : null;

  return (
    <div
      ref={scrollRef}
      className="h-full min-h-0 overflow-y-auto bg-[var(--peer-bg)]"
      onDragOver={handleBoardDragOver}
    >
      <div className="px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="roadmap-blocks relative mx-auto w-full min-w-0 max-w-[680px] overflow-visible pb-12">
          {blocks.map((block) => {
            if (block.type === "heading") {
              return (
                <V2Heading
                  key={block.id}
                  block={block}
                  headingRef={(el) => {
                    blockRefs.current[block.id] = el;
                  }}
                />
              );
            }
            if (block.type !== "content") return null;

            const tracedSourceId =
              tracedSource?.blockId === block.id ? tracedSource.sourceId : null;
            const isDropTarget = hoverTarget?.blockId === block.id;

            return (
              <div key={block.id} className="mb-4 mt-2 min-w-0 first:mt-0">
                <BeatCard
                  cardRef={(el) => {
                    blockRefs.current[block.id] = el;
                  }}
                  block={block}
                  blocks={blocks}
                  tracedSourceId={tracedSourceId}
                  isDropTarget={isDropTarget}
                  dropOverlay={isDropTarget ? dropOverlay : null}
                  onTrace={
                    onTraceSource
                      ? (sourceId) => onTraceSource(block.id, sourceId)
                      : undefined
                  }
                  onUpdateSource={(source) => onUpdateSource(block.id, source)}
                  onRemoveSource={(sourceId) => onRemoveSource(block.id, sourceId)}
                  onPromptChange={
                    onPromptChange ? (prompt) => onPromptChange(block.id, prompt) : undefined
                  }
                  rolePickerMode={rolePickerMode}
                  // showAddZone
                  onAddDrop={(dataTransfer) => dropOnBlock(block.id, dataTransfer)}
                  onEvidenceDragOver={(event) => handleEvidenceDragOver(event, block.id)}
                  onEvidenceDragLeave={(event) => handleEvidenceDragLeave(event, block.id)}
                  onEvidenceDrop={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    dropOnBlock(block.id, event.dataTransfer);
                  }}
                  onMappedDragStart={
                    onMoveSource
                      ? (sourceId, event) => {
                          const source = block.sources.find((s) => s.id === sourceId);
                          setV2DragData(event.dataTransfer, {
                            kind: "mapped",
                            fromBlockId: block.id,
                            sourceId,
                            sourceType: source?.sourceType,
                          });
                        }
                      : undefined
                  }
                  onMappedDragEnd={() => {
                    setHoverTarget(null);
                    setExternalDrag(false);
                    skipScrollRef.current = false;
                  }}
                  onMoveMapped={
                    onMoveSource
                      ? (fromBlockId, sourceId, toBlockId, targetFormatRole) => {
                          onMoveSource(fromBlockId, sourceId, toBlockId, undefined, targetFormatRole);
                        }
                      : undefined
                  }
                  onMapStudySourceWithRole={onMapStudySourceWithRole}
                  onMapOutlineRef={onMapOutlineRefToSection}
                  onNavigateOutlineRef={onNavigateOutlineRef}
                  tlfOnly={tlfOnly}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
