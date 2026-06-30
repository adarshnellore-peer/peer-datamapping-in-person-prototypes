import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ChevronRight,
  GripVertical,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { getSourceHeaderParts } from "../data/sourceHelpers";
import { buildTocFlatList, type TocFlatItem } from "../utils/documentBlocks";
import type { DocumentBlock, HeadingBlock } from "../types";
import type { RoadmapSource, SourceType } from "../data/roadmap";
import { setV2DragData } from "../utils/v2DragPayload";

function headingLabel(heading: HeadingBlock): string {
  return heading.number ? `${heading.number} ${heading.title}` : heading.title;
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
  return `${item.block.title} ${sourceText}`;
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
    <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover/toc-row:opacity-100 group-focus-within/toc-row:opacity-100">
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
  isDragging = false,
  isCollapsed,
  hasChildren,
  onToggleCollapse,
  onNavigate,
  onDragPointerDown,
  outlineMappingDrag = false,
  outlineDragLabel,
  onOutlineDragStart,
  label,
  actions,
}: {
  depth: number;
  isActive: boolean;
  isDragging?: boolean;
  isCollapsed?: boolean;
  hasChildren?: boolean;
  onToggleCollapse?: () => void;
  onNavigate: () => void;
  onDragPointerDown?: (event: React.PointerEvent<HTMLDivElement>) => void;
  outlineMappingDrag?: boolean;
  outlineDragLabel?: string;
  onOutlineDragStart?: (event: React.DragEvent<HTMLButtonElement>) => void;
  label: ReactNode;
  actions?: ReactNode;
}) {
  const indent = outlineMappingDrag ? 4 + depth * 10 : 6 + depth * 12;
  const isHeading = depth === 0;

  return (
    <div
      onPointerDown={onDragPointerDown}
      className={`group/toc-row flex min-h-[30px] items-start rounded-md pr-1 transition-colors ${
        onDragPointerDown ? "cursor-grab touch-none active:cursor-grabbing" : ""
      } ${isDragging ? "opacity-40" : ""} ${
        isActive
          ? "bg-[#fedbda]"
          : isHeading
            ? "hover:bg-black/[0.03]"
            : "border-l-2 border-transparent hover:border-[#d4ced3] hover:bg-white/80"
      }`}
      style={{ paddingLeft: `${indent}px` }}
    >
      {outlineMappingDrag ? (
        <button
          type="button"
          draggable
          onDragStart={onOutlineDragStart}
          title={`Drag to map ${outlineDragLabel ?? "outline"}`}
          aria-label={`Drag to map ${outlineDragLabel ?? "outline"}`}
          className="mr-0.5 mt-1 flex h-[22px] w-[16px] shrink-0 cursor-grab items-center justify-center rounded text-[#c4c4c4] hover:bg-black/[0.05] hover:text-[#757575] active:cursor-grabbing"
        >
          <GripVertical size={12} strokeWidth={2} />
        </button>
      ) : null}

      <button
        type="button"
        data-toc-no-drag
        aria-label={isCollapsed ? "Expand section" : "Collapse section"}
        onClick={(event) => {
          event.stopPropagation();
          onToggleCollapse?.();
        }}
        onPointerDown={(event) => event.stopPropagation()}
        className={`mr-0.5 mt-0.5 flex h-[22px] w-[18px] shrink-0 items-center justify-center rounded text-[#9e9e9e] transition-colors hover:bg-black/[0.06] hover:text-[#636161] ${
          hasChildren ? "visible" : "invisible pointer-events-none"
        }`}
      >
        <ChevronRight
          size={14}
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
        className={`min-w-0 flex-1 py-1.5 text-left leading-snug ${
          isHeading
            ? "text-[12px] font-semibold uppercase tracking-wide text-[#636161]"
            : depth === 1
              ? "text-[13px] font-medium text-[#302f2f]"
              : "text-[12px] font-normal text-[#636161]"
        } ${isActive ? "text-[#302f2f]" : ""}`}
      >
        {label}
      </span>

      {actions && (
        <div data-toc-no-drag onPointerDown={(event) => event.stopPropagation()}>
          <TocRowActions>{actions}</TocRowActions>
        </div>
      )}
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
    (blockId: string, event: React.PointerEvent<HTMLDivElement>) => {
      if (normalizedQuery) return;
      if ((event.target as Element).closest("[data-toc-no-drag]")) return;

      const row = event.currentTarget;
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

  const visibleItemsRef = useRef(visibleItems);
  visibleItemsRef.current = visibleItems;

  const renderLabel = (item: TocFlatItem): ReactNode => {
    if (item.kind === "heading") {
      const { heading } = item;
      if (heading.number) {
        return (
          <>
            <span className="mr-1 tabular-nums text-[#9e9e9e]">
              {highlightMatch(heading.number, searchQuery)}
            </span>
            {highlightMatch(heading.title, searchQuery)}
          </>
        );
      }
      return highlightMatch(heading.title, searchQuery);
    }
    return highlightMatch(item.block.title, searchQuery);
  };

  const renderOutlineDragStart = (item: TocFlatItem) => {
    if (!outlineMappingDrag) return undefined;
    return (event: React.DragEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      const sourceType: SourceType = item.kind === "heading" ? "SUBCONTENT" : "CONTENT";
      const label =
        item.kind === "heading" ? headingLabel(item.heading) : item.block.title;
      setV2DragData(event.dataTransfer, { kind: "toc", sourceType, label });
    };
  };

  const outlineDragMeta = (item: TocFlatItem) => {
    if (!outlineMappingDrag) return { label: undefined, badge: null as ReactNode };
    const isHeading = item.kind === "heading";
    return {
      label: isHeading ? "subcontent" : "content",
      badge: (
        <span
          className={`ml-1.5 shrink-0 rounded border px-1 py-px text-[9px] font-semibold uppercase tracking-wide ${
            isHeading
              ? "border-[#cbd5e1] bg-[#f1f5f9] text-[#475569]"
              : "border-[#a7f3d0] bg-[#ecfdf5] text-[#047857]"
          }`}
        >
          {isHeading ? "Sub" : "Sec"}
        </span>
      ),
    };
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#fafafa]">
      <div className="shrink-0 border-b border-[#ececec] px-2 py-2">
        {outlineMappingDrag && (
          <p className="mb-2 px-0.5 text-[10px] leading-snug text-[#9e9e9e]">
            <GripVertical size={10} className="mr-0.5 inline -mt-px" />
            Drag grip onto a section to map outline
          </p>
        )}
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

      <nav className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-3">
        {visibleItems.length === 0 ? (
          <p className="px-2 py-6 text-center text-[12px] text-[#9e9e9e]">
            {normalizedQuery ? "No matches" : "No sections yet"}
          </p>
        ) : (
          <ul className="space-y-0.5">
            {visibleItems.map((item, index) => {
              const isActive = activeId === item.id;
              const isDragging = tocDrag?.blockId === item.id;
              const showDropBefore =
                tocDrag !== null && tocDrag.dropFlatIndex === index && tocDrag.blockId !== item.id;

              const dragMeta = outlineDragMeta(item);
              const rowProps = {
                depth: item.depth,
                isActive,
                isDragging,
                onNavigate: () => onNavigate(item.id),
                onDragPointerDown:
                  outlineMappingDrag || normalizedQuery
                    ? undefined
                    : (event: React.PointerEvent<HTMLDivElement>) =>
                        handleRowPointerDown(item.id, event),
                outlineMappingDrag,
                outlineDragLabel: dragMeta.label,
                onOutlineDragStart: renderOutlineDragStart(item),
                label: (
                  <span className="flex min-w-0 items-center">
                    <span className="min-w-0 truncate">{renderLabel(item)}</span>
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
