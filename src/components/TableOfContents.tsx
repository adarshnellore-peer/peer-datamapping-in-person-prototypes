import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Search, X } from "lucide-react";
import { getSourceHeaderParts } from "../data/sourceHelpers";
import {
  buildTocFlatList,
  getHeadingSectionBlockIds,
  getTocItemLabel,
  getTocRowParts,
  outlineRefPayloadFromTocItem,
  type TocFlatItem,
} from "../utils/documentBlocks";
import type { DocumentBlock } from "../types";
import type { RoadmapSource } from "../data/roadmap";
import {
  outlineRefDragPayload,
  setV2DragData,
  type OutlineRefPayload,
} from "../utils/v2DragPayload";
import { RoadmapOutlineRow } from "./roadmap/RoadmapOutlineRow";
import { OutlineContentActions, OutlineHeadingActions } from "./roadmap/OutlineActionButton";

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
    return getTocItemLabel(item);
  }
  const sourceText = item.block.sources.map(sourceSearchText).join(" ");
  const { number, titleText } = getTocRowParts(item);
  const numberPrefix = number ? `${number} ` : "";
  return `${numberPrefix}${titleText} ${sourceText}`;
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
      <mark className="rounded-sm bg-[var(--peer-primary-tint)] px-0.5 text-inherit">
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

export function TableOfContents({
  blocks,
  activeId,
  onNavigate,
  onMoveBlock,
  onAddHeadingAfter,
  onAddContentAfter,
  onDuplicateHeading,
  onDuplicateContent,
  onDeleteHeading,
  onDeleteContent,
  onRenameBlock,
  outlineMappingDrag = false,
  hideAddActions = false,
  collapsedHeadingIds: collapsedHeadingIdsProp,
  onCollapsedHeadingIdsChange,
}: {
  blocks: DocumentBlock[];
  activeId: string | null;
  onNavigate: (blockId: string) => void;
  onMoveBlock: (blockId: string, dropFlatIndex: number) => void;
  onAddHeadingAfter: (headingId: string) => void;
  onAddContentAfter: (contentId: string) => void;
  onDuplicateHeading: (headingId: string) => void;
  onDuplicateContent: (contentId: string) => void;
  onDeleteHeading: (headingId: string) => void;
  onDeleteContent: (blockId: string) => void;
  onRenameBlock?: (blockId: string, title: string) => void;
  /** V2: drag outline rows onto section mapping targets. */
  outlineMappingDrag?: boolean;
  hideAddActions?: boolean;
  /** Shared with matrix outline so expand/collapse stays in sync across views. */
  collapsedHeadingIds?: Set<string>;
  onCollapsedHeadingIdsChange?: React.Dispatch<React.SetStateAction<Set<string>>>;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [internalCollapsedIds, setInternalCollapsedIds] = useState<Set<string>>(() => new Set());
  const collapsedIds = collapsedHeadingIdsProp ?? internalCollapsedIds;
  const setCollapsedIds = onCollapsedHeadingIdsChange ?? setInternalCollapsedIds;
  const [tocDrag, setTocDrag] = useState<{
    blockId: string;
    dropFlatIndex: number;
  } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [tocMapDragId, setTocMapDragId] = useState<string | null>(null);
  const lastSelectedIndexRef = useRef<number | null>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Record<string, HTMLLIElement | null>>({});

  useEffect(() => {
    if (!outlineMappingDrag) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (shellRef.current?.contains(target)) return;
      setSelectedIds((prev) => (prev.size === 0 ? prev : new Set()));
      lastSelectedIndexRef.current = null;
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [outlineMappingDrag]);

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
      if ((event.target as Element).closest("[data-ol-no-drag]")) return;

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

  const handleTocItemClick = useCallback(
    (item: TocFlatItem, index: number, event: React.MouseEvent) => {
      const itemIds = selectableIdsForTocItem(blocks, item);

      if (event.shiftKey && lastSelectedIndexRef.current !== null) {
        const start = Math.min(lastSelectedIndexRef.current, index);
        const end = Math.max(lastSelectedIndexRef.current, index);
        const next = new Set<string>();
        for (let i = start; i <= end; i++) {
          const rowItem = visibleItemsRef.current[i];
          if (!rowItem) continue;
          for (const id of selectableIdsForTocItem(blocks, rowItem)) {
            next.add(id);
          }
        }
        setSelectedIds(next);
        return;
      }

      setSelectedIds(new Set(itemIds));
      lastSelectedIndexRef.current = index;
      onNavigate(item.id);
    },
    [blocks, onNavigate],
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

  const getTocItemParts = (
    item: TocFlatItem,
  ): { number?: string; titleText: string; titleDisplay: ReactNode } => {
    const { number, titleText } = getTocRowParts(item);
    return {
      number,
      titleText,
      titleDisplay: highlightMatch(titleText, searchQuery),
    };
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
    <div ref={shellRef} className="peer-outline-shell flex min-h-0 flex-1 flex-col">
      <div className="peer-outline-header shrink-0">
        <div className="relative">
          <Search
            size={14}
            strokeWidth={2}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--peer-icon-muted)]"
            aria-hidden
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search"
            aria-label="Search"
            className="peer-outline-search"
          />
          {searchQuery && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setSearchQuery("")}
              className="absolute right-1.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-[var(--peer-icon-muted)] hover:bg-black/[0.05] hover:text-[var(--peer-text-secondary)]"
            >
              <X size={12} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      <nav
        className="peer-outline-nav min-h-0 flex-1"
        onDragOver={outlineMappingDrag ? handleTocListDragOver : undefined}
        onDrop={outlineMappingDrag ? handleTocListDrop : undefined}
      >
        {visibleItems.length === 0 ? (
          <p className="px-2 py-6 text-center text-[12px] text-[var(--peer-text-caption)]">
            {normalizedQuery ? "No matches" : "No sections yet"}
          </p>
        ) : (
          <ul className="peer-outline-list">
            {visibleItems.map((item, index) => {
              const isActive = activeId === item.id;
              const isDragging =
                tocDrag?.blockId === item.id || tocMapDragId === item.id;
              const showDropBefore =
                tocDrag !== null && tocDrag.dropFlatIndex === index && tocDrag.blockId !== item.id;
              const isHeadingRow = item.kind === "heading";
              const { number, titleText, titleDisplay } = getTocItemParts(item);
              const dragMeta = outlineDragMeta(item);
              const outlineDragStart = renderOutlineDragStart(item);
              const selectableIds = outlineMappingDrag
                ? selectableIdsForTocItem(blocks, item)
                : [];
              const allSelected =
                selectableIds.length > 0 && selectableIds.every((id) => selectedIds.has(id));

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
                      className="pointer-events-none absolute left-2 right-2 top-0 z-10 h-0.5 -translate-y-0.5 rounded-full bg-[var(--peer-primary)]"
                      aria-hidden
                    />
                  )}
                  <RoadmapOutlineRow
                    depth={item.depth}
                    isHeading={isHeadingRow}
                    isActive={isActive}
                    isSelected={outlineMappingDrag ? allSelected : false}
                    isDragging={isDragging}
                    number={number}
                    titleText={titleText}
                    titleDisplay={titleDisplay}
                    titleSuffix={dragMeta.badge}
                    hasChevron={isHeadingRow ? item.hasChildren : false}
                    isCollapsed={isHeadingRow ? collapsedIds.has(item.id) : undefined}
                    onToggleCollapse={
                      isHeadingRow ? () => toggleCollapse(item.id) : undefined
                    }
                    onDragStart={outlineDragStart}
                    onReorderPointerDown={
                      normalizedQuery || outlineMappingDrag
                        ? undefined
                        : (event) => handleRowPointerDown(item.id, event)
                    }
                    onDragEnd={outlineMappingDrag ? handleOutlineDragEnd : undefined}
                    onRowClick={
                      outlineMappingDrag
                        ? (event) => handleTocItemClick(item, index, event)
                        : undefined
                    }
                    dragTitle={
                      outlineMappingDrag
                        ? "Drag to reorder or map to section"
                        : "Drag to reorder"
                    }
                    onNavigate={() => onNavigate(item.id)}
                    onRename={
                      onRenameBlock
                        ? (nextTitle) => onRenameBlock(item.id, nextTitle)
                        : undefined
                    }
                    outputType={!isHeadingRow ? item.block.outputType : undefined}
                    actions={
                      isHeadingRow ? (
                        <OutlineHeadingActions
                          showAdd={!hideAddActions}
                          onAdd={
                            hideAddActions ? undefined : () => onAddHeadingAfter(item.id)
                          }
                          onDuplicate={() => onDuplicateHeading(item.id)}
                          onDelete={() => onDeleteHeading(item.id)}
                        />
                      ) : (
                        <OutlineContentActions
                          showAdd={!hideAddActions}
                          onAdd={
                            hideAddActions ? undefined : () => onAddContentAfter(item.id)
                          }
                          onDuplicate={() => onDuplicateContent(item.id)}
                          onDelete={() => onDeleteContent(item.id)}
                        />
                      )
                    }
                  />
                </li>
              );
            })}
            {tocDrag && tocDrag.dropFlatIndex === visibleItems.length && (
              <li aria-hidden>
                <div className="mx-2 h-0.5 rounded-full bg-[var(--peer-primary)]" />
              </li>
            )}
          </ul>
        )}
      </nav>
    </div>
  );
}
