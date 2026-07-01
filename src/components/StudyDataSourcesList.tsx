import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type MouseEvent } from "react";
import { ChevronRight, GripVertical, Link2, Search, X } from "lucide-react";
import { parsePageRange, getReferenceDisplayName } from "../data/documentPreview";
import { getDocumentCategory } from "../data/roadmap";
import type { StudyDataSource } from "../data/studyDataSources";
import { STUDY_DATA_SOURCES } from "../data/studyDataSources";
import { setV2DragData, studySourceDragPayload } from "../utils/v2DragPayload";
import type { StudySourcePlacement } from "../utils/studySourcePlacements";

const CATEGORY_ORDER = ["Protocol", "SAP", "CSR", "Template", "Figures", "Listings", "Document"];

const CATEGORY_SWATCH: Record<string, string> = {
  Template: "#8b8b8b",
  Protocol: "#1a8a4a",
  SAP: "#e0a800",
  CSR: "#0a9e9a",
  Figures: "#ec4899",
  Listings: "#6366f1",
  Document: "#bdbdbd",
};

const HOVER_EXPAND_LEAVE_MS = 160;

type DocumentGroup = {
  key: string;
  documentLabel: string;
  root: StudyDataSource;
  sections: StudyDataSource[];
};

function categoryForSource(entry: StudyDataSource): string {
  if (entry.kind === "figure") return "Figures";
  if (entry.kind === "listing") return "Listings";
  return getDocumentCategory(entry.dataSource);
}

function groupByCategory(sources: StudyDataSource[]): { category: string; items: StudyDataSource[] }[] {
  const buckets = new Map<string, StudyDataSource[]>();

  for (const entry of sources) {
    const category = categoryForSource(entry);
    const items = buckets.get(category) ?? [];
    items.push(entry);
    buckets.set(category, items);
  }

  const ordered = CATEGORY_ORDER.filter((category) => buckets.has(category)).map((category) => ({
    category,
    items: buckets.get(category) ?? [],
  }));

  for (const [category, items] of buckets) {
    if (!CATEGORY_ORDER.includes(category)) {
      ordered.push({ category, items });
    }
  }

  return ordered;
}

function sectionLabelFor(entry: StudyDataSource): string {
  if (entry.kind === "figure" || entry.kind === "listing") return entry.name;
  return getReferenceDisplayName(entry.dataSource, entry.referenceKey);
}

function pageRefFor(entry: StudyDataSource): string | null {
  if (entry.kind === "figure" || entry.kind === "listing") return null;
  const { start, end } = parsePageRange(entry.referenceKey);
  if (start === end) return `p. ${start}`;
  return `pp. ${start}–${end}`;
}

function documentLabelFor(entry: StudyDataSource): string {
  const separator = entry.name.indexOf(" — ");
  if (separator !== -1) return entry.name.slice(0, separator);
  return entry.name;
}

function documentEntriesForGroup(group: DocumentGroup): StudyDataSource[] {
  return group.sections.length > 0 ? [group.root, ...group.sections] : [group.root];
}

function buildDefaultCollapsedKeys(sources: StudyDataSource[]): Set<string> {
  const keys = new Set<string>();
  const seen = new Set<string>();
  for (const entry of sources) {
    if (entry.kind !== "document") continue;
    const category = categoryForSource(entry);
    const key = `${category}:${entry.dataSource}`;
    if (seen.has(key)) continue;
    seen.add(key);
    keys.add(key);
  }
  return keys;
}

function groupDocuments(items: StudyDataSource[]): {
  documents: DocumentGroup[];
  standalone: StudyDataSource[];
} {
  const documents: DocumentGroup[] = [];
  const standalone: StudyDataSource[] = [];
  const byDataSource = new Map<string, StudyDataSource[]>();

  for (const entry of items) {
    if (entry.kind === "figure" || entry.kind === "listing") {
      standalone.push(entry);
      continue;
    }

    const group = byDataSource.get(entry.dataSource) ?? [];
    group.push(entry);
    byDataSource.set(entry.dataSource, group);
  }

  for (const [dataSource, groupItems] of byDataSource) {
    const [root, ...sections] = groupItems;
    if (!root) continue;
    documents.push({
      key: dataSource,
      documentLabel: documentLabelFor(root),
      root,
      sections,
    });
  }

  return { documents, standalone };
}

function startStudySourceDrag(studySourceIds: string[], event: DragEvent) {
  setV2DragData(event.dataTransfer, studySourceDragPayload(studySourceIds));
}

function rowSurfaceClass(isActive: boolean, isSelected: boolean, draggable: boolean): string {
  const parts = ["transition-colors"];
  if (draggable) parts.push("cursor-grab touch-none active:cursor-grabbing");
  if (isSelected) {
    parts.push("bg-[#eff6ff] ring-1 ring-inset ring-[#93c5fd]");
  } else if (isActive) {
    parts.push("bg-[#fff5f5]");
  } else {
    parts.push("hover:bg-[#f7f7f7]");
  }
  return parts.join(" ");
}

function rowMetric(
  usageCount: number | undefined,
  fallback?: number,
): { value: number; title: string } | null {
  if (usageCount != null && usageCount > 0) {
    return {
      value: usageCount,
      title: `Mapped in ${usageCount} section${usageCount === 1 ? "" : "s"}`,
    };
  }
  if (fallback != null && fallback > 0) {
    return {
      value: fallback,
      title: `${fallback} section${fallback === 1 ? "" : "s"}`,
    };
  }
  return null;
}

function RowMetric({
  metric,
  onClick,
}: {
  metric: { value: number; title: string } | null;
  onClick?: () => void;
}) {
  if (!metric) return <span className="w-5 shrink-0" aria-hidden />;
  if (onClick) {
    return (
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onClick();
        }}
        className="w-5 shrink-0 text-right text-[11px] font-medium tabular-nums text-[#9e9e9e] hover:text-[#ff4e49]"
        title={metric.title}
      >
        {metric.value}
      </button>
    );
  }
  return (
    <span
      className="w-5 shrink-0 text-right text-[11px] font-medium tabular-nums text-[#9e9e9e]"
      title={metric.title}
    >
      {metric.value}
    </span>
  );
}

function PlacementMenu({
  placements,
  onNavigateToPlacement,
}: {
  placements: StudySourcePlacement[];
  onNavigateToPlacement?: (placement: StudySourcePlacement) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: Event) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  if (placements.length === 0) return null;

  const label = `Used in ${placements.length} section${placements.length === 1 ? "" : "s"}`;

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={label}
        title={label}
        className={`flex h-5 w-5 items-center justify-center rounded transition-colors ${
          open
            ? "bg-[#fff0f0] text-[#ff4e49]"
            : "text-[#c8c8c8] hover:bg-[#f5f5f5] hover:text-[#757575]"
        }`}
      >
        <Link2 size={11} strokeWidth={2} aria-hidden />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+4px)] z-50 w-52 overflow-hidden rounded-md border border-[#e4dfe3] bg-white shadow-[0_8px_24px_rgba(48,47,47,0.12)]"
        >
          <p className="border-b border-[#f0f0f0] px-2.5 py-1.5 text-[10px] font-medium text-[#9e9e9e]">
            {label}
          </p>
          <div className="max-h-44 overflow-y-auto py-0.5">
            {placements.map((placement) => (
              <button
                key={`${placement.blockId}:${placement.sourceId}`}
                type="button"
                role="menuitem"
                onClick={(event) => {
                  event.stopPropagation();
                  onNavigateToPlacement?.(placement);
                  setOpen(false);
                }}
                className="block w-full truncate px-2.5 py-1.5 text-left text-[11px] text-[#454545] transition-colors hover:bg-[#fafafa] hover:text-[#ff4e49]"
                title={placement.blockTitle}
              >
                {placement.blockTitle}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SelectionCheckbox({
  checked,
  label,
  onToggle,
}: {
  checked: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <span
      className="flex shrink-0 items-center"
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        aria-label={`Select ${label} for mapping`}
        className="h-3.5 w-3.5 cursor-pointer rounded border-[#c8c0c6] text-[#ff4e49] focus:ring-[#ff4e49]/25"
      />
    </span>
  );
}

function LibrarySectionRow({
  entry,
  isActive,
  isSelected,
  onSelect,
  onToggleSelected,
  onStudySourceDragStart,
  enableMappingDrag,
  usageCount,
  placements,
  onNavigateToPlacement,
  label,
  pageRef,
}: {
  entry: StudyDataSource;
  isActive: boolean;
  isSelected: boolean;
  onSelect: (event: MouseEvent) => void;
  onToggleSelected?: () => void;
  onStudySourceDragStart: (entry: StudyDataSource, event: DragEvent) => void;
  enableMappingDrag: boolean;
  usageCount?: number;
  placements?: StudySourcePlacement[];
  onNavigateToPlacement?: (placement: StudySourcePlacement) => void;
  label: string;
  pageRef?: string | null;
}) {
  const didDragRef = useRef(false);
  const draggable = enableMappingDrag;
  const metric = rowMetric(usageCount);

  return (
    <div
      draggable={draggable}
      onDragStart={(event) => {
        didDragRef.current = true;
        event.stopPropagation();
        if (draggable) onStudySourceDragStart(entry, event);
      }}
      onDragEnd={() => {
        window.setTimeout(() => {
          didDragRef.current = false;
        }, 0);
      }}
      className={`group/lib-row flex items-center gap-1.5 border-b border-[#f0f0f0] px-3 py-1.5 last:border-b-0 ${rowSurfaceClass(
        isActive,
        isSelected,
        draggable,
      )}`}
    >
      {draggable ? (
        <GripVertical
          size={12}
          strokeWidth={2}
          className="pointer-events-none shrink-0 text-[#d8d8d8]"
          aria-hidden
        />
      ) : (
        <span className="w-3 shrink-0" aria-hidden />
      )}
      {enableMappingDrag && onToggleSelected && (
        <SelectionCheckbox checked={isSelected} label={label} onToggle={onToggleSelected} />
      )}
      <button
        type="button"
        draggable={false}
        onClick={(event) => {
          if (didDragRef.current) return;
          onSelect(event);
        }}
        className="min-w-0 flex-1 truncate text-left"
      >
        <span className="text-[11px] text-[#454545]">{label}</span>
        {pageRef && <span className="ml-1.5 text-[10px] text-[#b0b0b0]">{pageRef}</span>}
      </button>
      {placements && placements.length > 0 && (
        <PlacementMenu
          placements={placements}
          onNavigateToPlacement={onNavigateToPlacement}
        />
      )}
      <RowMetric metric={metric} />
    </div>
  );
}

function defaultDragEntryForGroup(group: DocumentGroup): StudyDataSource {
  return group.root;
}

function LibraryDocumentRow({
  group,
  category,
  expanded,
  isActive,
  isSelected,
  onSelect,
  onToggleSelected,
  onStudySourceDragStart,
  usageCount,
  placements,
  onNavigateToPlacement,
}: {
  group: DocumentGroup;
  category: string;
  expanded: boolean;
  isActive: boolean;
  isSelected: boolean;
  onSelect: (event: MouseEvent) => void;
  onToggleSelected: () => void;
  onStudySourceDragStart: (entry: StudyDataSource, event: DragEvent) => void;
  usageCount?: number;
  placements?: StudySourcePlacement[];
  onNavigateToPlacement?: (placement: StudySourcePlacement) => void;
}) {
  const didDragRef = useRef(false);
  const dragEntry = defaultDragEntryForGroup(group);
  const swatch = CATEGORY_SWATCH[category] ?? CATEGORY_SWATCH.Document;
  const pageRef = pageRefFor(dragEntry);
  const metric = rowMetric(usageCount, group.sections.length);

  return (
    <div
      draggable
      onDragStart={(event) => {
        didDragRef.current = true;
        event.stopPropagation();
        onStudySourceDragStart(dragEntry, event);
      }}
      onDragEnd={() => {
        window.setTimeout(() => {
          didDragRef.current = false;
        }, 0);
      }}
      className={`group/lib-doc flex items-center gap-1.5 px-3 py-2 ${rowSurfaceClass(
        isActive,
        isSelected,
        true,
      )}`}
    >
      <GripVertical
        size={12}
        strokeWidth={2}
        className="pointer-events-none shrink-0 text-[#d8d8d8]"
        aria-hidden
      />
      <SelectionCheckbox
        checked={isSelected}
        label={group.documentLabel}
        onToggle={onToggleSelected}
      />
      <ChevronRight
        size={13}
        strokeWidth={2}
        className={`shrink-0 text-[#c8c8c8] transition-transform ${expanded ? "rotate-90" : ""}`}
        aria-hidden
      />
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: swatch }}
        aria-hidden
      />
      <button
        type="button"
        draggable={false}
        onClick={(event) => {
          if (didDragRef.current) return;
          onSelect(event);
        }}
        className="min-w-0 flex-1 truncate text-left"
        title={pageRef ? `Default section: ${pageRef}` : undefined}
      >
        <span className="text-[12px] font-semibold text-[#302f2f]">{group.documentLabel}</span>
        {pageRef && <span className="ml-1.5 text-[10px] font-normal text-[#b0b0b0]">{pageRef}</span>}
      </button>
      {placements && placements.length > 0 && (
        <PlacementMenu
          placements={placements}
          onNavigateToPlacement={onNavigateToPlacement}
        />
      )}
      <RowMetric metric={metric} />
    </div>
  );
}

function DocumentGroupSection({
  group,
  category,
  activeSourceId,
  selectedIds,
  expanded,
  onToggleCollapse,
  onSelectEntry,
  onToggleSelected,
  onStudySourceDragStart,
  onHoverStart,
  onHoverEnd,
  enableMappingDrag = false,
  usageCountByStudySourceId,
  placementsByStudySourceId,
  onNavigateToPlacement,
}: {
  group: DocumentGroup;
  category: string;
  activeSourceId?: string;
  selectedIds: Set<string>;
  expanded: boolean;
  onToggleCollapse: () => void;
  onSelectEntry: (source: StudyDataSource, event: MouseEvent) => void;
  onToggleSelected: (source: StudyDataSource) => void;
  onStudySourceDragStart: (entry: StudyDataSource, event: DragEvent) => void;
  onHoverStart?: () => void;
  onHoverEnd?: () => void;
  enableMappingDrag?: boolean;
  usageCountByStudySourceId?: Record<string, number>;
  placementsByStudySourceId?: Record<string, StudySourcePlacement[]>;
  onNavigateToPlacement?: (placement: StudySourcePlacement) => void;
}) {
  const entries = documentEntriesForGroup(group);
  const collapseKey = `${category}:${group.key}`;
  const dragEntry = defaultDragEntryForGroup(group);
  const hasSections = group.sections.length > 0;
  const groupPlacements = useMemo(() => {
    if (!placementsByStudySourceId) return [];
    const seen = new Set<string>();
    const merged: StudySourcePlacement[] = [];
    for (const entry of entries) {
      for (const placement of placementsByStudySourceId[entry.id] ?? []) {
        const key = `${placement.blockId}:${placement.sourceId}`;
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(placement);
      }
    }
    return merged;
  }, [entries, placementsByStudySourceId]);
  const groupUsageCount = useMemo(() => {
    if (!usageCountByStudySourceId) return undefined;
    let total = 0;
    for (const entry of entries) {
      total += usageCountByStudySourceId[entry.id] ?? 0;
    }
    return total > 0 ? total : undefined;
  }, [entries, usageCountByStudySourceId]);

  if (enableMappingDrag) {
    return (
      <div
        className="border-b border-[#e8e4ea] last:border-b-0"
        onMouseEnter={onHoverStart}
        onMouseLeave={onHoverEnd}
      >
        <LibraryDocumentRow
          group={group}
          category={category}
          expanded={expanded}
          isActive={dragEntry.id === activeSourceId}
          isSelected={selectedIds.has(dragEntry.id)}
          onSelect={(event) => onSelectEntry(dragEntry, event)}
          onToggleSelected={() => onToggleSelected(dragEntry)}
          onStudySourceDragStart={onStudySourceDragStart}
          usageCount={groupUsageCount}
          placements={groupPlacements}
          onNavigateToPlacement={onNavigateToPlacement}
        />

        {expanded && hasSections && (
          <div
            id={`doc-sections-${collapseKey}`}
            className="border-t border-[#ececec] bg-[#fcfcfc] pl-4"
          >
            {group.sections.map((entry) => (
              <LibrarySectionRow
                key={entry.id}
                entry={entry}
                isActive={entry.id === activeSourceId}
                isSelected={selectedIds.has(entry.id)}
                onSelect={(event) => onSelectEntry(entry, event)}
                onToggleSelected={() => onToggleSelected(entry)}
                onStudySourceDragStart={onStudySourceDragStart}
                enableMappingDrag={enableMappingDrag}
                usageCount={usageCountByStudySourceId?.[entry.id]}
                placements={placementsByStudySourceId?.[entry.id]}
                onNavigateToPlacement={onNavigateToPlacement}
                label={sectionLabelFor(entry)}
                pageRef={pageRefFor(entry)}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="border-b border-[#e8e4ea] last:border-b-0">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={`doc-sections-${collapseKey}`}
        onClick={onToggleCollapse}
        className="flex w-full items-center gap-1.5 px-3 py-2 text-left transition-colors hover:bg-[#f7f7f7]"
      >
        <ChevronRight
          size={13}
          strokeWidth={2}
          className={`shrink-0 text-[#bdbdbd] transition-transform ${expanded ? "rotate-90" : ""}`}
        />
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: CATEGORY_SWATCH[category] ?? CATEGORY_SWATCH.Document }}
          aria-hidden
        />
        <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-[#302f2f]">
          {group.documentLabel}
        </span>
        <RowMetric metric={rowMetric(undefined, entries.length)} />
      </button>

      {expanded && (
        <div id={`doc-sections-${collapseKey}`} className="border-t border-[#ececec] bg-[#fcfcfc]">
          {entries.map((entry) => (
            <LibrarySectionRow
              key={entry.id}
              entry={entry}
              isActive={entry.id === activeSourceId}
              isSelected={selectedIds.has(entry.id)}
              onSelect={(event) => onSelectEntry(entry, event)}
              onStudySourceDragStart={onStudySourceDragStart}
              enableMappingDrag={enableMappingDrag}
              usageCount={usageCountByStudySourceId?.[entry.id]}
              placements={placementsByStudySourceId?.[entry.id]}
              onNavigateToPlacement={onNavigateToPlacement}
              label={sectionLabelFor(entry)}
              pageRef={pageRefFor(entry)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CategorySection({
  category,
  items,
  activeSourceId,
  selectedIds,
  collapsedDocs,
  hoverDocKey,
  onToggleDocument,
  onHoverDocument,
  onSelectEntry,
  onToggleSelected,
  onStudySourceDragStart,
  enableMappingDrag = false,
  usageCountByStudySourceId,
  placementsByStudySourceId,
  onNavigateToPlacement,
}: {
  category: string;
  items: StudyDataSource[];
  activeSourceId?: string;
  selectedIds: Set<string>;
  collapsedDocs: Set<string>;
  hoverDocKey: string | null;
  onToggleDocument: (key: string) => void;
  onHoverDocument: (key: string | null) => void;
  onSelectEntry: (source: StudyDataSource, event: MouseEvent) => void;
  onToggleSelected: (source: StudyDataSource) => void;
  onStudySourceDragStart: (entry: StudyDataSource, event: DragEvent) => void;
  enableMappingDrag?: boolean;
  usageCountByStudySourceId?: Record<string, number>;
  placementsByStudySourceId?: Record<string, StudySourcePlacement[]>;
  onNavigateToPlacement?: (placement: StudySourcePlacement) => void;
}) {
  const { documents, standalone } = useMemo(() => groupDocuments(items), [items]);
  const swatch = CATEGORY_SWATCH[category] ?? CATEGORY_SWATCH.Document;
  const hoverLeaveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const docIsExpanded = (key: string, group: DocumentGroup) => {
    const hasActiveChild = documentEntriesForGroup(group).some((entry) => entry.id === activeSourceId);
    if (hasActiveChild) return true;
    if (enableMappingDrag && hoverDocKey === key) return true;
    return !collapsedDocs.has(key);
  };

  const scheduleHoverEnd = () => {
    if (!enableMappingDrag) return;
    if (hoverLeaveTimerRef.current) clearTimeout(hoverLeaveTimerRef.current);
    hoverLeaveTimerRef.current = setTimeout(() => onHoverDocument(null), HOVER_EXPAND_LEAVE_MS);
  };

  const cancelHoverEnd = () => {
    if (hoverLeaveTimerRef.current) clearTimeout(hoverLeaveTimerRef.current);
  };

  return (
    <section className="border-b border-[#d4ced3] last:border-b-0">
      <div className="flex items-center gap-2 border-b border-[#e8e4ea] bg-[#f3f3f3] px-3 py-2">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: swatch }} />
        <h4 className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#636161]">
          {category}
        </h4>
        <span className="ml-auto text-[10px] font-medium tabular-nums text-[#9e9e9e]">
          {items.length}
        </span>
      </div>

      <div>
        {documents.map((group) => {
          const key = `${category}:${group.key}`;
          return (
            <DocumentGroupSection
              key={group.key}
              group={group}
              category={category}
              activeSourceId={activeSourceId}
              selectedIds={selectedIds}
              expanded={docIsExpanded(key, group)}
              onToggleCollapse={() => onToggleDocument(key)}
              onSelectEntry={onSelectEntry}
              onToggleSelected={onToggleSelected}
              onStudySourceDragStart={onStudySourceDragStart}
              onHoverStart={
                enableMappingDrag
                  ? () => {
                      cancelHoverEnd();
                      onHoverDocument(key);
                    }
                  : undefined
              }
              onHoverEnd={enableMappingDrag ? scheduleHoverEnd : undefined}
              enableMappingDrag={enableMappingDrag}
              usageCountByStudySourceId={usageCountByStudySourceId}
              placementsByStudySourceId={placementsByStudySourceId}
              onNavigateToPlacement={onNavigateToPlacement}
            />
          );
        })}

        {standalone.map((entry) => (
          <LibrarySectionRow
            key={entry.id}
            entry={entry}
            label={entry.name}
            isActive={entry.id === activeSourceId}
            isSelected={selectedIds.has(entry.id)}
            onSelect={(event) => onSelectEntry(entry, event)}
            onToggleSelected={
              enableMappingDrag ? () => onToggleSelected(entry) : undefined
            }
            onStudySourceDragStart={onStudySourceDragStart}
            enableMappingDrag={enableMappingDrag}
            usageCount={usageCountByStudySourceId?.[entry.id]}
            placements={placementsByStudySourceId?.[entry.id]}
            onNavigateToPlacement={onNavigateToPlacement}
          />
        ))}
      </div>
    </section>
  );
}

export function StudyDataSourcesList({
  sources = STUDY_DATA_SOURCES,
  activeSourceId,
  onSelect,
  compact: _compact = false,
  query: controlledQuery,
  onQueryChange,
  enableMappingDrag = false,
  usageCountByStudySourceId,
  placementsByStudySourceId,
  onNavigateToPlacement,
  onClose,
}: {
  sources?: StudyDataSource[];
  activeSourceId?: string;
  onSelect: (source: StudyDataSource) => void;
  compact?: boolean;
  query?: string;
  onQueryChange?: (query: string) => void;
  /** V2: rows are draggable onto section drop zones. */
  enableMappingDrag?: boolean;
  usageCountByStudySourceId?: Record<string, number>;
  placementsByStudySourceId?: Record<string, StudySourcePlacement[]>;
  onNavigateToPlacement?: (placement: StudySourcePlacement) => void;
  onClose?: () => void;
}) {
  const [internalQuery, setInternalQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [collapsedDocs, setCollapsedDocs] = useState<Set<string>>(() =>
    buildDefaultCollapsedKeys(sources),
  );
  const [hoverDocKey, setHoverDocKey] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const query = controlledQuery ?? internalQuery;
  const setQuery = onQueryChange ?? setInternalQuery;

  const handleSelectEntry = useCallback(
    (entry: StudyDataSource, _event: MouseEvent) => {
      onSelect(entry);
    },
    [onSelect],
  );

  const handleToggleSelected = useCallback((entry: StudyDataSource) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(entry.id)) next.delete(entry.id);
      else next.add(entry.id);
      return next;
    });
  }, []);

  const handleStudySourceDragStart = useCallback(
    (entry: StudyDataSource, event: DragEvent) => {
      const ids =
        selectedIds.has(entry.id) && selectedIds.size > 0 ? [...selectedIds] : [entry.id];
      startStudySourceDrag(ids, event);
    },
    [selectedIds],
  );

  const availableCategories = useMemo(() => {
    const set = new Set(sources.map((entry) => categoryForSource(entry)));
    return CATEGORY_ORDER.filter((c) => set.has(c));
  }, [sources]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return sources.filter((entry) => {
      if (categoryFilter && categoryForSource(entry) !== categoryFilter) return false;
      if (!normalized) return true;
      return (
        entry.name.toLowerCase().includes(normalized) ||
        entry.uploadedFile.toLowerCase().includes(normalized) ||
        entry.dataSource.toLowerCase().includes(normalized) ||
        sectionLabelFor(entry).toLowerCase().includes(normalized) ||
        categoryForSource(entry).toLowerCase().includes(normalized)
      );
    });
  }, [query, sources, categoryFilter]);

  const categories = useMemo(() => groupByCategory(filtered), [filtered]);

  useEffect(() => {
    if (!query.trim()) return;
    setCollapsedDocs((prev) => {
      const next = new Set(prev);
      for (const { category, items } of categories) {
        for (const group of groupDocuments(items).documents) {
          next.delete(`${category}:${group.key}`);
        }
      }
      return next;
    });
  }, [query, categories]);

  useEffect(() => {
    if (!activeSourceId) return;
    const active = sources.find((entry) => entry.id === activeSourceId);
    if (!active || active.kind === "figure" || active.kind === "listing") return;

    const category = categoryForSource(active);
    setCollapsedDocs((prev) => {
      if (!prev.has(`${category}:${active.dataSource}`)) return prev;
      const next = new Set(prev);
      next.delete(`${category}:${active.dataSource}`);
      return next;
    });
  }, [activeSourceId, sources]);

  const toggleDocument = (key: string) => {
    setCollapsedDocs((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <div className="shrink-0 border-b border-[#d4ced3] bg-white px-3 py-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-[13px] font-semibold text-[#302f2f]">
            Data Source
            <span className="ml-1.5 font-normal tabular-nums text-[#bdbdbd]">({sources.length})</span>
          </h3>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close data source panel"
              className="-mr-1 rounded p-1 text-[#636161] hover:bg-[#f0f0f0]"
            >
              <X size={18} />
            </button>
          )}
        </div>
        <label className="relative mb-2.5 block">
          <Search
            size={13}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#bdbdbd]"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search…"
            className="w-full rounded-md border border-[#d4ced3] bg-[#fafafa] py-1.5 pl-8 pr-2.5 text-[12px] text-[#302f2f] placeholder:text-[#bdbdbd] focus:border-[#c8c0c6] focus:bg-white focus:outline-none focus-visible:ring-1 focus-visible:ring-[#ff4e49]/20"
          />
        </label>
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setCategoryFilter(null)}
            className={`rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors ${
              categoryFilter === null
                ? "border-[#302f2f] bg-[#302f2f] text-white"
                : "border-[#d4ced3] bg-white text-[#636161] hover:border-[#c8c0c6]"
            }`}
          >
            All
          </button>
          {availableCategories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() =>
                setCategoryFilter((current) => (current === category ? null : category))
              }
              className={`rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors ${
                categoryFilter === category
                  ? "border-[#ff4e49] bg-[#fedbda] text-[#302f2f]"
                  : "border-[#d4ced3] bg-white text-[#636161] hover:border-[#c8c0c6]"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
        {enableMappingDrag && (
          <p className="mt-2 text-[10px] leading-snug text-[#9e9e9e]">
            {selectedIds.size > 0
              ? `${selectedIds.size} selected — drag to map all`
              : "Check sources to select, then drag to map"}
          </p>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {categories.length === 0 ? (
          <p className="px-3 py-8 text-center text-[12px] text-[#8a8a8a]">No matches.</p>
        ) : (
          categories.map(({ category, items }) => (
            <CategorySection
              key={category}
              category={category}
              items={items}
              activeSourceId={activeSourceId}
              selectedIds={selectedIds}
              collapsedDocs={collapsedDocs}
              hoverDocKey={hoverDocKey}
              onToggleDocument={toggleDocument}
              onHoverDocument={setHoverDocKey}
              onSelectEntry={handleSelectEntry}
              onToggleSelected={handleToggleSelected}
              onStudySourceDragStart={handleStudySourceDragStart}
              enableMappingDrag={enableMappingDrag}
              usageCountByStudySourceId={usageCountByStudySourceId}
              placementsByStudySourceId={placementsByStudySourceId}
              onNavigateToPlacement={onNavigateToPlacement}
            />
          ))
        )}
      </div>
    </div>
  );
}
