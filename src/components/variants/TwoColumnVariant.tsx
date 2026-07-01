import { useCallback, useEffect, useRef, useState } from "react";
import type { HeadingBlock } from "../../types";
import { BeatCard } from "./BeatCard";
import { type VariantProps } from "./types";
import {
  hasV2DragType,
  readV2DragData,
  type V2DragPayload,
} from "../../utils/v2DragPayload";

function V2Heading({ block }: { block: HeadingBlock }) {
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
    ? "text-[24px] font-semibold leading-8 text-[#333] sm:text-[28px] sm:leading-9"
    : isH2
      ? "text-[20px] font-semibold leading-7 text-[#333] sm:text-[24px] sm:leading-8"
      : isH3
        ? "text-[18px] font-semibold leading-7 text-[#333] sm:text-[20px]"
        : "text-[16px] font-semibold leading-6 text-[#333]";

  return (
    <div className={`first:mt-0 ${wrapperClassName}`}>
      <Tag className={tagClassName}>
        {block.number && <span>{block.number} </span>}
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
  onMapOutlineToSection,
  onMoveSource,
  onPromptChange,
  focusId,
}: Omit<VariantProps, "onAddSource"> & {
  onMapStudySource: (blockId: string, studySourceId: string) => void;
  onMapStudySources?: (blockId: string, studySourceIds: string[]) => void;
  onMapOutlineToSection: (
    blockId: string,
    sourceType: "SUBCONTENT" | "CONTENT",
    label: string,
  ) => void;
  onMoveSource?: (
    fromBlockId: string,
    sourceId: string,
    toBlockId: string,
    toIndex?: number,
  ) => void;
  onPromptChange?: (blockId: string, prompt: string) => void;
  focusId?: string | null;
}) {
  const [externalDrag, setExternalDrag] = useState(false);
  const [hoverBlockId, setHoverBlockId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const skipScrollRef = useRef(false);
  const lastScrolledFocusIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!focusId || skipScrollRef.current || externalDrag) return;
    if (focusId === lastScrolledFocusIdRef.current) return;
    lastScrolledFocusIdRef.current = focusId;
    cardRefs.current[focusId]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusId, externalDrag]);

  useEffect(() => {
    const onDragStart = (event: DragEvent) => {
      if (hasV2DragType(event.dataTransfer)) {
        setExternalDrag(true);
        skipScrollRef.current = true;
      }
    };
    const onDragEnd = () => {
      setExternalDrag(false);
      skipScrollRef.current = false;
      setHoverBlockId(null);
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
        case "toc":
          onMapOutlineToSection(toBlockId, payload.sourceType, payload.label);
          break;
        case "mapped":
          onMoveSource?.(payload.fromBlockId, payload.sourceId, toBlockId, payload.toIndex);
          break;
      }
    },
    [onMapOutlineToSection, onMapStudySource, onMapStudySources, onMoveSource],
  );

  const dropOnBlock = (blockId: string, dataTransfer: DataTransfer) => {
    const payload = readV2DragData(dataTransfer);
    if (payload) applyPayload(blockId, payload);
    setHoverBlockId(null);
    setExternalDrag(false);
    skipScrollRef.current = false;
  };

  const handleDragOver = (event: React.DragEvent, blockId: string) => {
    if (!hasV2DragType(event.dataTransfer) && !externalDrag) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
    if (hoverBlockId !== blockId) setHoverBlockId(blockId);
  };

  return (
    <div ref={scrollRef} className="h-full min-h-0 overflow-y-auto">
      <div className="px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="roadmap-blocks relative mx-auto w-full min-w-0 max-w-[680px] overflow-visible pb-12">
          {blocks.map((block) => {
            if (block.type === "heading") {
              return <V2Heading key={block.id} block={block} />;
            }
            if (block.type !== "content") return null;

            const isHover = hoverBlockId === block.id;
            const tracedSourceId =
              tracedSource?.blockId === block.id ? tracedSource.sourceId : null;

            return (
              <div
                key={block.id}
                className="mb-4 mt-2 min-w-0 first:mt-0"
                onDragOver={(event) => handleDragOver(event, block.id)}
                onDragLeave={() =>
                  setHoverBlockId((current) => (current === block.id ? null : current))
                }
                onDrop={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  dropOnBlock(block.id, event.dataTransfer);
                }}
              >
                <BeatCard
                  cardRef={(el) => {
                    cardRefs.current[block.id] = el;
                  }}
                  block={block}
                  tracedSourceId={tracedSourceId}
                  isDropTarget={isHover}
                  dropOverlay={
                    isHover && externalDrag ? (
                      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-lg border-2 border-dashed border-[var(--peer-primary)] bg-white/90">
                        <span className="text-[12px] font-medium text-[var(--peer-primary)]">
                          Release to map source
                        </span>
                      </div>
                    ) : null
                  }
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
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
