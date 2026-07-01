import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronRight, Plus, Search, Trash2, X } from "lucide-react";
import { getSourceHeaderParts } from "../data/sourceHelpers";
import {
  buildTocFlatList,
  getHeadingSectionBlockIds,
  type TocFlatItem,
} from "../utils/documentBlocks";
import type { DocumentBlock, HeadingBlock } from "../types";
import type { RoadmapSource } from "../data/roadmap";
import {
  outlineRefDragPayload,
  setV2DragData,
  type OutlineRefPayload,
} from "../utils/v2DragPayload";
import { RoadmapOutlineRow } from "./roadmap/RoadmapOutlineRow";

function headingLabel(heading: HeadingBlock): string {
  return heading.number ? `${heading.number} ${heading.title}` : heading.title;
}

function outlineRefPayloadFromTocItem(item: TocFlatItem): OutlineRefPayload {
  if (item.kind === "heading") {
    return {
      kind: "outline-ref",
      sourceType: "CONTENT",
      label: headingLabel(item.heading),
      fromHeadingId: item.heading.id,
    };
  }
  return {
    kind: "outline-ref",
    sourceType: "SUBCONTENT",
    label: item.block.title,
    fromBlockId: item.block.id,
  };
}

function selectableIdsForTocItem(blocks: DocumentBlock[], item: TocFlatItem): string[] {
  if (item.kind === "heading") {
    return getHeadingSectionBlockIds(blocks, item.id);
  }
  return [item.id];
}

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase();
}

function matchesQuery(text: string, query: string): boolean {
  return text.toLowerCase().includes(query);
}

function sourceSearchText(source: RoadmapSource): string {
  const { tag, primary, secondary } = getSourceHeaderParts(source);
  return [tag, primary, secondary].filter(Boolean).join(" ");
}

function itemSearchText(item: TocFlatItem): string {
  if (item.kind === "heading") {
    return headingLabel(item.heading);
  }
  const sourceText = item.block.sources.map(sourceSearchText).join(" ");
  const numberPrefix = item.number ? `${item.number} ` : "";
  return `${numberPrefix}${item.block.title} ${sourceText}`;
}

function highlightMatch(text: string, query: string): ReactNode {
  const normalized = normalizeSearch(query);
  if (!normalized) return text;

  const lowerText = text.toLowerCase();
  const index = lowerText.indexOf(normalized);
  if (index === -1) return text;

  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded-sm bg-[#fedbda] px-0.5 text-inherit">
        {text.slice(index, index + normalized.length)}
      </mark>
      {text.slice(index + normalized.length)}
    </>
  );
}

function collectAncestorIds(items: TocFlatItem[], matchedIds: Set<string>): Set<string> {
  const expanded = new Set<string>();
  for (const item of items) {
    if (!matchedIds.has(item.id)) continue;
    for (const ancestorId of item.ancestorHeadingIds) {
      expanded.add(ancestorId);
    }
  }
  return expanded;
}

function TocRowActions({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover/toc-row:opacity-100 group-focus-within/toc-row:opacity-100 group-hover/outline-row:opacity-100 group-focus-within/outline-row:opacity-100">
      {children}
    </div>
  );
}

function TocActionButton({
  label,
  onClick,
  variant = "default",
  children,
}: {
  label: string;
  onClick: () => void;
  variant?: "default" | "danger";
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded transition-colors ${
        variant === "danger"
          ? "text-[#bdbdbd] hover:bg-[#fff0f0] hover:text-[#ff4e49]"
          : "text-[#bdbdbd] hover:bg-black/[0.06] hover:text-[#636161]"
      }`}
    >
      {children}
    </button>
  );
}

function TocRow({
  depth,
  isActive,
  isSelected = false,
  isIndeterminate = false,
  isDragging = false,
  isCollapsed,
  hasChildren,
  onToggleCollapse,
  onNavigate,
  onToggleSelected,
  onDragPointerDown,
  outlineMappingDrag = false,
  outlineDragLabel,
  onOutlineDragStart,
  onOutlineDragEnd,
  rowKind = "content",
  label,
  actions,
}: {
  depth: number;
  isActive: boolean;
  isSelected?: boolean;
  isIndeterminate?: boolean;
  isDragging?: boolean;
  isCollapsed?: boolean;
  hasChildren?: boolean;
  onToggleCollapse?: () => void;
  onNavigate: () => void;
  onToggleSelected?: () => void;
  onDragPointerDown?: (event: React.PointerEvent<HTMLElement>) => void;
  outlineMappingDrag?: boolean;
  outlineDragLabel?: string;
  onOutlineDragStart?: (event: React.DragEvent) => void;
  onOutlineDragEnd?: () => void;
  rowKind?: "heading" | "content";
  label: ReactNode;
  actions?: ReactNode;
}) {
  const indent = depth * (outlineMappingDrag ? 10 : 12);
  const isHeading = rowKind === "heading";
  const isDraggable = outlineMappingDrag ? !!onOutlineDragStart : !!onDragPointerDown;

  if (outlineMappingDrag) {
    return (
      <RoadmapOutlineRow
        depth={depth}
        isHeading={isHeading}
        isActive={isActive}
        isSelected={isSelected}
        isIndeterminate={isIndeterminate}
        isDragging={isDragging}
        label={label}
        title=""
        hasChevron={!!hasChildren}
        isCollapsed={isCollapsed}
        onToggleCollapse={onToggleCollapse}
        onDragStart={onOutlineDragStart}
        onDragEnd={onOutlineDragEnd}
        showSelectionCheckbox={!!onToggleSelected}
        onToggleSelected={onToggleSelected}
        dragTitle="Drag to reorder or map to section"
        onNavigate={onNavigate}
        actions={actions ? <TocRowActions>{actions}</TocRowActions> : undefined}
      />
    );
  }

  return (
    <div style={{ marginLeft: `${indent}px` }} className="py-0.5">
      <div
        draggable={outlineMappingDrag && !!onOutlineDragStart}
        onDragStart={onOutlineDragStart}
        onPointerDown={outlineMappingDrag ? undefined : onDragPointerDown}
        title={
          outlineMappingDrag
            ? `Drag to map ${outlineDragLabel ?? "outline"}`
            : isDraggable
              ? "Drag to reorder"
              : undefined
        }
        className={`group/toc-row flex min-h-[26px] items-start pr-0.5 transition-[background-color,border-color,opacity] peer-toc-card ${
          isDraggable ? "cursor-grab touch-none active:cursor-grabbing" : ""
        } ${isDragging ? "opacity-40" : ""} ${isActive ? "is-active" : ""}`}
      >
        <button
          type="button"
          data-toc-no-drag
          aria-label={isCollapsed ? "Expand section" : "Collapse section"}
          onClick={(event) => {
            event.stopPropagation();
            onToggleCollapse?.();
          }}
          onPointerDown={(event) => event.stopPropagation()}
          className={`mr-0.5 flex h-[18px] w-[16px] shrink-0 items-center justify-center rounded text-[#9e9e9e] transition-colors hover:bg-black/[0.06] hover:text-[#636161] ${
            hasChildren ? "visible" : "invisible pointer-events-none"
          }`}
        >
          <ChevronRight
            size={12}
            strokeWidth={2}
            className={`transition-transform ${isCollapsed ? "" : "rotate-90"}`}
          />
        </button>

        <span
          role="button"
          tabIndex={0}
          onClick={() => onNavigate()}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onNavigate();
            }
          }}
          className={`min-w-0 flex-1 text-left ${
            outlineMappingDrag
              ? isHeading
                ? "py-0.5 text-[12px] font-semibold leading-[1.3] text-[var(--peer-text)]"
                : "py-0.5 text-[12px] font-normal leading-[1.35] text-[var(--peer-muted)]"
              : isHeading
                ? "py-0.5 text-[12px] font-semibold uppercase tracking-wide text-[var(--peer-muted)]"
                : depth === 1
                  ? "py-0.5 text-[13px] font-medium text-[var(--peer-text)]"
                  : "py-0.5 text-[12px] font-normal text-[var(--peer-muted)]"
          } ${isActive ? "text-[var(--peer-text)]" : ""}`}
        >
          {label}
        </span>

        {actions && (
          <div data-toc-no-drag onPointerDown={(event) => event.stopPropagation()}>
            <TocRowActions>{actions}</TocRowActions>
          </div>
        )}
      </div>
    </div>
  );
}

export function TableOfContents({
  blocks,
  activeId,
  onNavigate,
  onMoveBlock,
  onAddHeadingAfter,
  onAddContentAfter,
  onDeleteHeading,
  onDeleteContent,
  outlineMappingDrag = false,
  hideAddActions = false,
}: {
  blocks: DocumentBlock[];
  activeId: string | null;
  onNavigate: (blockId: string) => void;
  onMoveBlock: (blockId: string, dropFlatIndex: number) => void;
  onAddHeadingAfter: (headingId: string) => void;
  onAddContentAfter: (contentId: string) => void;
  onDeleteHeading: (headingId: string) => void;
  onDeleteContent: (blockId: string) => void;
  /** V2: drag outline rows onto section mapping targets. */
  outlineMappingDrag?: boolean;
  hideAddActions?: boolean;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => new Set());
  const [tocDrag, setTocDrag] = useState<{
    blockId: string;
    dropFlatIndex: number;
  } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [tocMapDragId, setTocMapDragId] = useState<string | null>(null);
  const rowRefs = useRef<Record<string, HTMLLIElement | null>>({});

  const flatItems = useMemo(() => buildTocFlatList(blocks), [blocks]);

  const normalizedQuery = normalizeSearch(searchQuery);

  const matchedIds = useMemo(() => {
    if (!normalizedQuery) return null;
    const ids = new Set<string>();
    for (const item of flatItems) {
      if (matchesQuery(itemSearchText(item), normalizedQuery)) {
        ids.add(item.id);
      }
    }
    return ids;
  }, [flatItems, normalizedQuery]);

  const forceExpandedIds = useMemo(() => {
    if (!matchedIds) return null;
    return collectAncestorIds(flatItems, matchedIds);
  }, [flatItems, matchedIds]);

  useEffect(() => {
    if (!activeId) return;
    const activeItem = flatItems.find((item) => item.id === activeId);
    if (!activeItem) return;
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      for (const ancestorId of activeItem.ancestorHeadingIds) {
        next.delete(ancestorId);
      }
      return next;
    });
  }, [activeId, flatItems]);

  const visibleItems = useMemo(() => {
    return flatItems.filter((item) => {
      if (matchedIds && !matchedIds.has(item.id)) return false;

      for (const ancestorId of item.ancestorHeadingIds) {
        const isForceExpanded = forceExpandedIds?.has(ancestorId);
        if (!isForceExpanded && collapsedIds.has(ancestorId)) return false;
      }
      return true;
    });
  }, [flatItems, collapsedIds, matchedIds, forceExpandedIds]);

  useEffect(() => {
    if (!activeId) return;
    const frame = requestAnimationFrame(() => {
      rowRefs.current[activeId]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
    return () => cancelAnimationFrame(frame);
  }, [activeId, visibleItems]);

  const toggleCollapse = (headingId: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(headingId)) next.delete(headingId);
      else next.add(headingId);
      return next;
    });
  };

  const computeDropFlatIndex = useCallback((clientY: number, items: TocFlatItem[]) => {
    for (let i = 0; i < items.length; i++) {
      const el = rowRefs.current[items[i].id];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) return i;
    }
    return items.length;
  }, []);

  const handleRowPointerDown = useCallback(
    (blockId: string, event: React.PointerEvent<HTMLElement>) => {
      if (normalizedQuery) return;
      if ((event.target as Element).closest("[data-toc-no-drag]")) return;

      const row = rowRefs.current[blockId];
      if (!row) return;
      const startY = event.clientY;
      let dragging = false;
      let dropFlatIndex = 0;

      const onMove = (ev: PointerEvent) => {
        if (!dragging && Math.abs(ev.clientY - startY) > 4) {
          dragging = true;
          ev.preventDefault();
          row.setPointerCapture(ev.pointerId);
          dropFlatIndex = computeDropFlatIndex(ev.clientY, visibleItemsRef.current);
          setTocDrag({ blockId, dropFlatIndex });
        }
        if (dragging) {
          dropFlatIndex = computeDropFlatIndex(ev.clientY, visibleItemsRef.current);
          setTocDrag({ blockId, dropFlatIndex });
        }
      };

      const onUp = (ev: PointerEvent) => {
        if (dragging) {
          onMoveBlock(blockId, dropFlatIndex);
        }
        setTocDrag(null);
        if (row.hasPointerCapture(ev.pointerId)) {
          row.releasePointerCapture(ev.pointerId);
        }
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
      };

      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
    },
    [computeDropFlatIndex, normalizedQuery, onMoveBlock],
  );

  const toggleTocItemSelected = useCallback(
    (item: TocFlatItem) => {
      const ids = selectableIdsForTocItem(blocks, item);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        const allSelected = ids.length > 0 && ids.every((id) => next.has(id));
        for (const id of ids) {
          if (allSelected) next.delete(id);
          else next.add(id);
        }
        return next;
      });
    },
    [blocks],
  );

  const startOutlineDrag = useCallback(
    (item: TocFlatItem, event: React.DragEvent) => {
      event.stopPropagation();
      setTocMapDragId(item.id);
      const dragIds =
        selectedIds.has(item.id) && selectedIds.size > 0 ? [...selectedIds] : [item.id];
      const refs: OutlineRefPayload[] = [];
      for (const id of dragIds) {
        const tocItem = flatItems.find((entry) => entry.id === id);
        if (!tocItem) continue;
        refs.push(outlineRefPayloadFromTocItem(tocItem));
      }
      if (refs.length === 0) return;
      setV2DragData(event.dataTransfer, outlineRefDragPayload(refs));
    },
    [flatItems, selectedIds],
  );

  const handleOutlineDragEnd = useCallback(() => {
    setTocDrag(null);
    setTocMapDragId(null);
  }, []);

  const handleTocListDragOver = useCallback(
    (event: React.DragEvent) => {
      if (!outlineMappingDrag || !tocMapDragId) return;
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = "move";
      const dropFlatIndex = computeDropFlatIndex(event.clientY, visibleItemsRef.current);
      setTocDrag({ blockId: tocMapDragId, dropFlatIndex });
    },
    [computeDropFlatIndex, outlineMappingDrag, tocMapDragId],
  );

  const handleTocListDrop = useCallback(
    (event: React.DragEvent) => {
      if (!outlineMappingDrag || !tocMapDragId) return;
      const nav = event.currentTarget as HTMLElement;
      const rect = nav.getBoundingClientRect();
      const { clientX, clientY } = event;
      if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      const dropFlatIndex = computeDropFlatIndex(event.clientY, visibleItemsRef.current);
      onMoveBlock(tocMapDragId, dropFlatIndex);
      setTocDrag(null);
      setTocMapDragId(null);
    },
    [computeDropFlatIndex, onMoveBlock, outlineMappingDrag, tocMapDragId],
  );

  const visibleItemsRef = useRef(visibleItems);
  visibleItemsRef.current = visibleItems;

  const renderLabel = (item: TocFlatItem): ReactNode => {
    if (item.kind === "heading") {
      const { heading } = item;
      if (heading.number) {
        return (
          <>
            <span className="mr-1.5 tabular-nums text-[#9e9e9e]">
              {highlightMatch(heading.number, searchQuery)}
            </span>
            {highlightMatch(heading.title, searchQuery)}
          </>
        );
      }
      return highlightMatch(heading.title, searchQuery);
    }
    if (item.number) {
      return (
        <>
          <span className="mr-1.5 tabular-nums text-[#9e9e9e]">
            {highlightMatch(item.number, searchQuery)}
          </span>
          {highlightMatch(item.block.title, searchQuery)}
        </>
      );
    }
    return highlightMatch(item.block.title, searchQuery);
  };

  const renderOutlineDragStart = (item: TocFlatItem) => {
    if (!outlineMappingDrag) return undefined;
    return (event: React.DragEvent) => startOutlineDrag(item, event);
  };

  const outlineDragMeta = (item: TocFlatItem) => {
    if (!outlineMappingDrag) return { label: undefined, badge: null as ReactNode };
    const isHeading = item.kind === "heading";
    return {
      label: isHeading ? "content" : "subcontent",
      badge: null,
    };
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#fafafa]">
      <div className="shrink-0 border-b border-[#d4ced3] px-3 py-2.5">
        <div className="relative">
          <Search
            size={14}
            strokeWidth={2}
            className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[#9e9e9e]"
            aria-hidden
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search…"
            aria-label="Search outline"
            className="w-full rounded-md border-0 bg-black/[0.04] py-1.5 pl-7 pr-7 text-[13px] text-[#302f2f] placeholder:text-[#bdbdbd] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#d4ced3]"
          />
          {searchQuery && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setSearchQuery("")}
              className="absolute right-1 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-[#9e9e9e] hover:bg-black/[0.06] hover:text-[#636161]"
            >
              <X size={12} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      <nav
        className="min-h-0 flex-1 overflow-y-auto px-2.5 pb-3 pt-1"
        onDragOver={outlineMappingDrag ? handleTocListDragOver : undefined}
        onDrop={outlineMappingDrag ? handleTocListDrop : undefined}
      >
        {visibleItems.length === 0 ? (
          <p className="px-2 py-6 text-center text-[12px] text-[#9e9e9e]">
            {normalizedQuery ? "No matches" : "No sections yet"}
          </p>
        ) : (
          <ul>
            {visibleItems.map((item, index) => {
              const isActive = activeId === item.id;
              const isDragging =
                tocDrag?.blockId === item.id || tocMapDragId === item.id;
              const showDropBefore =
                tocDrag !== null && tocDrag.dropFlatIndex === index && tocDrag.blockId !== item.id;
              const isHeadingRow = item.kind === "heading";

              const dragMeta = outlineDragMeta(item);
              const outlineDragStart = renderOutlineDragStart(item);
              const selectableIds = outlineMappingDrag
                ? selectableIdsForTocItem(blocks, item)
                : [];
              const allSelected =
                selectableIds.length > 0 && selectableIds.every((id) => selectedIds.has(id));
              const someSelected = selectableIds.some((id) => selectedIds.has(id));
              const rowProps = {
                depth: item.depth,
                isActive,
                isSelected: outlineMappingDrag ? allSelected : false,
                isIndeterminate: outlineMappingDrag ? someSelected && !allSelected : false,
                isDragging,
                rowKind: isHeadingRow ? ("heading" as const) : ("content" as const),
                onNavigate: () => onNavigate(item.id),
                onToggleSelected: outlineMappingDrag
                  ? () => toggleTocItemSelected(item)
                  : undefined,
                onDragPointerDown:
                  normalizedQuery || outlineMappingDrag
                    ? undefined
                    : (event: React.PointerEvent<HTMLElement>) =>
                        handleRowPointerDown(item.id, event),
                outlineMappingDrag,
                outlineDragLabel: dragMeta.label,
                onOutlineDragStart: outlineDragStart,
                onOutlineDragEnd: outlineMappingDrag ? handleOutlineDragEnd : undefined,
                label: (
                  <span className="flex min-w-0 items-start">
                    <span
                      className={`min-w-0 ${
                        outlineMappingDrag ? "whitespace-normal break-words" : "truncate"
                      }`}
                    >
                      {renderLabel(item)}
                    </span>
                    {dragMeta.badge}
                  </span>
                ),
              };

              return (
                <li
                  key={item.id}
                  ref={(el) => {
                    rowRefs.current[item.id] = el;
                  }}
                  className="relative"
                >
                  {showDropBefore && (
                    <div
                      className="pointer-events-none absolute left-2 right-2 top-0 z-10 h-0.5 -translate-y-0.5 rounded-full bg-[#ff4e49]"
                      aria-hidden
                    />
                  )}
                  {item.kind === "heading" ? (
                    <TocRow
                      {...rowProps}
                      hasChildren={item.hasChildren}
                      isCollapsed={collapsedIds.has(item.id)}
                      onToggleCollapse={() => toggleCollapse(item.id)}
                      actions={
                        hideAddActions ? (
                          <TocActionButton
                            label="Delete heading"
                            variant="danger"
                            onClick={() => onDeleteHeading(item.id)}
                          >
                            <Trash2 size={12} strokeWidth={2} />
                          </TocActionButton>
                        ) : (
                          <>
                            <TocActionButton
                              label="Add heading"
                              onClick={() => onAddHeadingAfter(item.id)}
                            >
                              <Plus size={12} strokeWidth={2} />
                            </TocActionButton>
                            <TocActionButton
                              label="Delete heading"
                              variant="danger"
                              onClick={() => onDeleteHeading(item.id)}
                            >
                              <Trash2 size={12} strokeWidth={2} />
                            </TocActionButton>
                          </>
                        )
                      }
                    />
                  ) : (
                    <TocRow
                      {...rowProps}
                      actions={
                        hideAddActions ? (
                          <TocActionButton
                            label="Delete section"
                            variant="danger"
                            onClick={() => onDeleteContent(item.id)}
                          >
                            <Trash2 size={12} strokeWidth={2} />
                          </TocActionButton>
                        ) : (
                          <>
                            <TocActionButton
                              label="Add section below"
                              onClick={() => onAddContentAfter(item.id)}
                            >
                              <Plus size={12} strokeWidth={2} />
                            </TocActionButton>
                            <TocActionButton
                              label="Delete section"
                              variant="danger"
                              onClick={() => onDeleteContent(item.id)}
                            >
                              <Trash2 size={12} strokeWidth={2} />
                            </TocActionButton>
                          </>
                        )
                      }
                    />
                  )}
                </li>
              );
            })}
            {tocDrag && tocDrag.dropFlatIndex === visibleItems.length && (
              <li aria-hidden>
                <div className="mx-2 h-0.5 rounded-full bg-[#ff4e49]" />
              </li>
            )}
          </ul>
        )}
      </nav>
    </div>
  );
}
