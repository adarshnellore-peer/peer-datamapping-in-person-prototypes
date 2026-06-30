import { useMemo, useState } from "react";
import { GripVertical, Search } from "lucide-react";
import {
  DATA_SOURCES,
  DATA_SOURCE_CATEGORIES,
  getDocumentCategory,
} from "../../data/roadmap";
import type { ContentBlockData, DocumentBlock } from "../../types";
import { SourcePill } from "./SourcePill";
import { CATEGORY_DOT, CATEGORY_ORDER, type VariantProps } from "./types";

type Drag =
  | { kind: "library"; dataSource: string }
  | { kind: "mapped"; fromBlockId: string; sourceId: string };

function firstContentId(blocks: DocumentBlock[]): string | null {
  return blocks.find((b) => b.type === "content")?.id ?? null;
}

/**
 * V3 - Two-column mapping board. Left = every section as a drop zone holding
 * its mapped sources; right = the full data-source library (grouped +
 * searchable, each doc draggable). Drag a document onto a section to map it.
 */
export function TwoColumnVariant({
  blocks,
  tracedSource,
  onTraceSource,
  onUpdateSource,
  onRemoveSource,
  onMapDataSource,
  onMoveSource,
}: VariantProps & {
  onMapDataSource: (blockId: string, dataSource: string) => void;
  onMoveSource?: (fromBlockId: string, sourceId: string, toBlockId: string) => void;
}) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const [hoverBlockId, setHoverBlockId] = useState<string | null>(null);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(() =>
    firstContentId(blocks),
  );
  const [query, setQuery] = useState("");

  const activeTitle = useMemo(() => {
    const block = blocks.find(
      (b): b is ContentBlockData => b.type === "content" && b.id === activeBlockId,
    );
    return block?.title ?? null;
  }, [blocks, activeBlockId]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = DATA_SOURCES.filter((name) =>
      q ? name.toLowerCase().includes(q) : true,
    );
    const order = [...CATEGORY_ORDER] as string[];
    return order
      .map((category) => ({
        category,
        items: filtered.filter((name) => getDocumentCategory(name) === category),
      }))
      .filter((group) => group.items.length > 0);
  }, [query]);

  const clearDrag = () => {
    setDrag(null);
    setHoverBlockId(null);
  };

  const dropOnSection = (blockId: string) => {
    if (!drag) return;
    if (drag.kind === "library") {
      onMapDataSource(blockId, drag.dataSource);
    } else if (drag.kind === "mapped" && onMoveSource) {
      onMoveSource(drag.fromBlockId, drag.sourceId, blockId);
    }
    clearDrag();
  };

  const addToActive = (dataSource: string) => {
    if (activeBlockId) onMapDataSource(activeBlockId, dataSource);
  };

  const isDragging = drag !== null;

  return (
    <div className="flex h-full min-h-0">
      {/* Left column: sections as drop zones */}
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto bg-white">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#e8e8e8] bg-white px-4 py-3">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-[#9e9e9e]">
            Sections
          </p>
          <span className="text-[11px] text-[#b0b0b0]">Drag documents in from the right</span>
        </div>
        <div className="space-y-1 px-3 py-3">
          {blocks.map((block) => {
            if (block.type === "heading") {
              return (
                <p
                  key={block.id}
                  className={`px-1 pb-1 pt-4 font-semibold text-[#757575] first:pt-1 ${
                    block.level === 1
                      ? "text-[12px] uppercase tracking-wide"
                      : "text-[12px]"
                  }`}
                >
                  {block.number && <span>{block.number} </span>}
                  {block.title}
                </p>
              );
            }
            if (block.type !== "content") return null;

            const isHover = hoverBlockId === block.id;
            const isActive = activeBlockId === block.id;
            const tracedSourceId =
              tracedSource?.blockId === block.id ? tracedSource.sourceId : null;

            return (
              <div
                key={block.id}
                onClick={() => setActiveBlockId(block.id)}
                onDragOver={(event) => {
                  if (!drag) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect =
                    drag.kind === "mapped" ? "move" : "copy";
                  if (hoverBlockId !== block.id) setHoverBlockId(block.id);
                }}
                onDragLeave={() =>
                  setHoverBlockId((current) => (current === block.id ? null : current))
                }
                onDrop={(event) => {
                  event.preventDefault();
                  dropOnSection(block.id);
                }}
                className={`rounded-md border px-3 py-2.5 transition-colors ${
                  isHover
                    ? "border-[#ff4e49] bg-[#fff5f5]"
                    : isActive
                      ? "border-[#fe9591] bg-white"
                      : isDragging
                        ? "border-dashed border-[#d4ced3] bg-white"
                        : "border-[#ececec] bg-white hover:border-[#d4ced3]"
                }`}
              >
                <div className="mb-1 flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[#302f2f]">
                    {block.title}
                  </span>
                  <span className="shrink-0 rounded-full bg-[#f3f3f3] px-1.5 py-0.5 text-[11px] font-medium text-[#9e9e9e]">
                    {block.sources.length}
                  </span>
                </div>

                {block.sources.length === 0 ? (
                  <p
                    className={`rounded-md border border-dashed py-2 text-center text-[12px] ${
                      isHover
                        ? "border-[#ff4e49] text-[#ff4e49]"
                        : "border-[#e4e4e4] text-[#b0b0b0]"
                    }`}
                  >
                    Drop a source here
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {block.sources.map((source) => (
                      <div key={source.id} className="flex items-start gap-1">
                        {onMoveSource && (
                          <button
                            type="button"
                            draggable
                            onDragStart={(event) => {
                              setDrag({
                                kind: "mapped",
                                fromBlockId: block.id,
                                sourceId: source.id,
                              });
                              event.dataTransfer.effectAllowed = "move";
                            }}
                            onDragEnd={clearDrag}
                            aria-label="Drag to move source to another section"
                            title="Drag to move to another section"
                            className="mt-2 shrink-0 cursor-grab text-[#c4c4c4] hover:text-[#9e9e9e] active:cursor-grabbing"
                          >
                            <GripVertical size={14} strokeWidth={1.75} />
                          </button>
                        )}
                        <div className="min-w-0 flex-1">
                          <SourcePill
                            source={source}
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
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Right column: data-source library */}
      <div className="flex w-[360px] shrink-0 flex-col overflow-hidden border-l border-[#d4ced3] bg-[#fafafa]">
        <div className="shrink-0 border-b border-[#e8e8e8] bg-[#fafafa] px-4 py-3">
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-[#9e9e9e]">
              Data sources
            </p>
            <span className="text-[11px] text-[#b0b0b0]">{DATA_SOURCES.length}</span>
          </div>
          <p className="mt-1 truncate text-[11px] text-[#b0b0b0]">
            {activeTitle ? (
              <>
                Click adds to: <span className="text-[#636161]">{activeTitle}</span>
              </>
            ) : (
              "Click a section to set the click-to-add target"
            )}
          </p>
          <div className="relative mt-2">
            <Search
              size={14}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9e9e9e]"
            />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search documents"
              className="w-full rounded-md border border-[#d4ced3] bg-white py-1.5 pl-8 pr-2 text-[13px] text-[#302f2f] placeholder:text-[#9e9e9e] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff4e49]/30"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          {groups.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-[#9e9e9e]">No documents match.</p>
          ) : (
            groups.map((group) => (
              <div key={group.category} className="mb-3 last:mb-0">
                <div className="mb-1 flex items-center gap-1.5 px-1">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      CATEGORY_DOT[group.category] ?? "bg-[#bdbdbd]"
                    }`}
                  />
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-[#9e9e9e]">
                    {group.category}
                  </span>
                  <span className="text-[11px] text-[#c4c4c4]">{group.items.length}</span>
                </div>
                <div className="space-y-1">
                  {group.items.map((name) => (
                    <button
                      key={name}
                      type="button"
                      draggable
                      onDragStart={(event) => {
                        setDrag({ kind: "library", dataSource: name });
                        event.dataTransfer.effectAllowed = "copy";
                      }}
                      onDragEnd={clearDrag}
                      onClick={() => addToActive(name)}
                      title={
                        activeTitle
                          ? `Drag onto a section, or click to add to "${activeTitle}"`
                          : "Drag onto a section to map it"
                      }
                      className="flex w-full cursor-grab items-center gap-2 rounded-md border border-[#e4e4e4] bg-white px-2.5 py-2 text-left text-[13px] text-[#454545] transition-colors hover:border-[#bdbdbd] hover:bg-[#fff5f5] active:cursor-grabbing"
                    >
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${
                          CATEGORY_DOT[DATA_SOURCE_CATEGORIES[name] ?? "Document"] ??
                          "bg-[#bdbdbd]"
                        }`}
                      />
                      <span className="truncate">{name}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
