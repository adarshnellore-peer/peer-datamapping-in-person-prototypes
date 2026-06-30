import { useCallback, useEffect, useRef, useState } from "react";
import { GripVertical } from "lucide-react";
import { SourcePill } from "./SourcePill";
import { type VariantProps } from "./types";
import {
  hasV2DragType,
  readV2DragData,
  setV2DragData,
  type V2DragPayload,
} from "../../utils/v2DragPayload";

type MappedDrag = { kind: "mapped"; fromBlockId: string; sourceId: string };

/**
 * V2 - Section mapping board. Drag study documents from the Data sources panel
 * (right) or outline rows from the TOC (left) onto section drop zones.
 */
export function TwoColumnVariant({
  blocks,
  tracedSource,
  onTraceSource,
  onUpdateSource,
  onRemoveSource,
  onMapStudySource,
  onMapOutlineToSection,
  onMoveSource,
  focusId,
}: Omit<VariantProps, "onAddSource"> & {
  onMapStudySource: (blockId: string, studySourceId: string) => void;
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
  focusId?: string | null;
}) {
  const [mappedDrag, setMappedDrag] = useState<MappedDrag | null>(null);
  const [externalDrag, setExternalDrag] = useState(false);
  const [hoverBlockId, setHoverBlockId] = useState<string | null>(null);
  const [hoverInsert, setHoverInsert] = useState<{
    blockId: string;
    index: number;
  } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Record<string, HTMLElement | null>>({});
  const skipScrollRef = useRef(false);

  const isDragging = mappedDrag !== null || externalDrag;

  useEffect(() => {
    if (!focusId || skipScrollRef.current || isDragging) return;
    const block = blocks.find((b) => b.id === focusId);
    if (!block) return;
    rowRefs.current[focusId]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusId, blocks, isDragging]);

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
    if (isDragging) {
      el.style.overflow = "hidden";
      el.style.overscrollBehavior = "none";
    } else {
      el.style.overflow = "";
      el.style.overscrollBehavior = "";
    }
  }, [isDragging]);

  const clearDrag = useCallback(() => {
    setMappedDrag(null);
    setHoverBlockId(null);
    setHoverInsert(null);
    setExternalDrag(false);
    skipScrollRef.current = false;
  }, []);

  const applyPayload = useCallback(
    (toBlockId: string, payload: V2DragPayload, toIndex?: number) => {
      switch (payload.kind) {
        case "study-source":
          onMapStudySource(toBlockId, payload.studySourceId);
          break;
        case "toc":
          onMapOutlineToSection(toBlockId, payload.sourceType, payload.label);
          break;
        case "mapped":
          onMoveSource?.(payload.fromBlockId, payload.sourceId, toBlockId, toIndex);
          break;
      }
    },
    [onMapOutlineToSection, onMapStudySource, onMoveSource],
  );

  const dropAt = (blockId: string, dataTransfer: DataTransfer, toIndex?: number) => {
    const payload = readV2DragData(dataTransfer);
    if (payload) {
      applyPayload(blockId, payload, toIndex);
      clearDrag();
      return;
    }
    if (mappedDrag) {
      applyPayload(blockId, mappedDrag, toIndex);
      clearDrag();
    }
  };

  const handleSectionDragOver = (event: React.DragEvent, blockId: string) => {
    if (!isDragging && !hasV2DragType(event.dataTransfer)) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = mappedDrag ? "move" : "copy";
    if (hoverBlockId !== blockId) setHoverBlockId(blockId);
  };

  const handleInsertDragOver = (
    event: React.DragEvent,
    blockId: string,
    index: number,
  ) => {
    if (!isDragging && !hasV2DragType(event.dataTransfer)) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";
    setHoverBlockId(blockId);
    setHoverInsert({ blockId, index });
  };

  return (
    <div className="flex h-full min-h-0">
      <div
        ref={scrollRef}
        className="flex min-w-0 flex-1 flex-col overflow-y-auto bg-[#e8e8e8]"
      >
        <div className="sticky top-0 z-10 border-b border-[#d8d8d8] bg-[#e8e8e8]/95 px-4 py-3 backdrop-blur-sm">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-[#757575]">
            Sections
          </p>
          <p className="mt-0.5 text-[11px] text-[#8a8a8a]">
            Drag onto a section — click a mapped row to preview in Data sources
          </p>
        </div>
        <div className="space-y-4 px-4 py-4">
          {blocks.map((block) => {
            if (block.type === "heading") {
              return (
                <p
                  key={block.id}
                  ref={(el) => {
                    rowRefs.current[block.id] = el;
                  }}
                  className={`px-1 pb-0.5 pt-4 font-semibold text-[#5c5c5c] first:pt-1 ${
                    block.level === 1
                      ? "text-[12px] uppercase tracking-wide"
                      : "text-[12px]"
                  } ${focusId === block.id ? "text-[#ff4e49]" : ""}`}
                >
                  {block.number && <span>{block.number} </span>}
                  {block.title}
                </p>
              );
            }
            if (block.type !== "content") return null;

            const isHover = hoverBlockId === block.id;
            const isTocFocus = focusId === block.id;
            const tracedSourceId =
              tracedSource?.blockId === block.id ? tracedSource.sourceId : null;

            return (
              <div
                key={block.id}
                ref={(el) => {
                  rowRefs.current[block.id] = el;
                }}
                onDragOver={(event) => handleSectionDragOver(event, block.id)}
                onDragLeave={() => {
                  setHoverBlockId((current) => (current === block.id ? null : current));
                  setHoverInsert((current) =>
                    current?.blockId === block.id ? null : current,
                  );
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  dropAt(block.id, event.dataTransfer);
                }}
                className={`rounded-md border px-2 py-2 transition-colors ${
                  isHover
                    ? "border-[#ff4e49]/40 bg-[#f4f4f4] ring-2 ring-[#ff4e49]/20"
                    : isTocFocus
                      ? "border-[#ff4e49]/20 bg-[#f2f2f2]"
                      : "border-[#dcdcdc] bg-[#efefef]"
                }`}
              >
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[#302f2f]">
                    {block.title}
                  </span>
                  {block.sources.length > 0 && (
                    <span className="shrink-0 text-[11px] tabular-nums text-[#8a8a8a]">
                      {block.sources.length}
                    </span>
                  )}
                </div>

                {block.sources.length === 0 ? (
                  isDragging ? (
                    <p
                      className={`rounded-md border border-dashed py-2 text-center text-[12px] ${
                        isHover
                          ? "border-[#ff4e49] text-[#ff4e49]"
                          : "border-[#c8c8c8] text-[#9e9e9e]"
                      }`}
                    >
                      Release to map source
                    </p>
                  ) : null
                ) : (
                  <div className="space-y-0">
                    {block.sources.map((source, index) => {
                      const showLine =
                        hoverInsert?.blockId === block.id &&
                        hoverInsert.index === index;
                      return (
                        <div key={source.id}>
                          <div
                            onDragOver={(event) =>
                              handleInsertDragOver(event, block.id, index)
                            }
                            onDrop={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              dropAt(block.id, event.dataTransfer, index);
                            }}
                            className={`relative h-1 transition-all ${
                              showLine ? "h-1.5" : ""
                            }`}
                          >
                            {showLine && (
                              <div className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-[#ff4e49]" />
                            )}
                          </div>
                          <div className="flex items-start gap-1">
                            {onMoveSource && (
                              <button
                                type="button"
                                draggable
                                onDragStart={(event) => {
                                  const mapped: MappedDrag = {
                                    kind: "mapped",
                                    fromBlockId: block.id,
                                    sourceId: source.id,
                                  };
                                  setMappedDrag(mapped);
                                  setV2DragData(event.dataTransfer, {
                                    ...mapped,
                                    kind: "mapped",
                                  });
                                  event.dataTransfer.effectAllowed = "move";
                                  skipScrollRef.current = true;
                                }}
                                onDragEnd={clearDrag}
                                aria-label="Drag to reorder or move"
                                title="Drag to reorder or move"
                                className="mt-2.5 shrink-0 cursor-grab rounded p-0.5 text-[#a0a0a0] hover:bg-[#e0e0e0] hover:text-[#757575] active:cursor-grabbing"
                              >
                                <GripVertical size={14} strokeWidth={1.75} />
                              </button>
                            )}
                            <div className="min-w-0 flex-1 py-0.5">
                              <SourcePill
                                source={source}
                                variant="v2"
                                isTraced={tracedSourceId === source.id}
                                onChange={(next) => onUpdateSource(block.id, next)}
                                onTrace={
                                  onTraceSource
                                    ? () => onTraceSource(block.id, source.id)
                                    : undefined
                                }
                                onRemove={() => onRemoveSource(block.id, source.id)}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div
                      onDragOver={(event) =>
                        handleInsertDragOver(event, block.id, block.sources.length)
                      }
                      onDrop={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        dropAt(block.id, event.dataTransfer, block.sources.length);
                      }}
                      className={`relative h-1 ${
                        hoverInsert?.blockId === block.id &&
                        hoverInsert.index === block.sources.length
                          ? "h-1.5"
                          : ""
                      }`}
                    >
                      {hoverInsert?.blockId === block.id &&
                        hoverInsert.index === block.sources.length && (
                          <div className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-[#ff4e49]" />
                        )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
