import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { ChevronRight, GripVertical, Search, X } from "lucide-react";
import { parsePageRange, getReferenceDisplayName } from "../data/documentPreview";
import { getDocumentCategory } from "../data/roadmap";
import type { StudyDataSource } from "../data/studyDataSources";
import { STUDY_DATA_SOURCES, isTlfStudySource } from "../data/studyDataSources";
import { setV2DragData, studySourceDragPayload } from "../utils/v2DragPayload";
import type { StudySourcePlacement } from "../utils/studySourcePlacements";

const CATEGORY_ORDER = ["Template", "CSR", "Figures", "Listings", "Document"];

import { libraryCategoryAccent } from "../data/categoryColors";
const HOVER_EXPAND_ENTER_MS = 140;
const HOVER_EXPAND_LEAVE_MS = 320;
const USAGE_MENU_WIDTH_PX = 224;
const USAGE_MENU_MAX_HEIGHT_PX = 320;
const USAGE_MENU_VIEWPORT_MARGIN_PX = 8;

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
  const parts = ["peer-library-row"];
  if (draggable) parts.push("cursor-grab touch-none active:cursor-grabbing");
  if (isSelected) parts.push("is-selected");
  else if (isActive) parts.push("is-active");
  return parts.join(" ");
}

function UnusedUsageBadge({ title = "Not mapped to any section" }: { title?: string }) {
  return (
    <span className="peer-usage-badge is-empty" title={title} aria-label={title}>
      0
    </span>
  );
}

function placementTocLabel(placement: StudySourcePlacement): string {
  return placement.blockNumber
    ? `${placement.blockNumber} ${placement.blockTitle}`
    : placement.blockTitle;
}

function UsageMenu({
  placements,
  onNavigateToPlacement,
}: {
  placements: StudySourcePlacement[];
  onNavigateToPlacement?: (placement: StudySourcePlacement) => void;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const count = placements.length;
  const label = `Click to view ${count} mapped section${count === 1 ? "" : "s"}`;

  const updateMenuPosition = useCallback(() => {
    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const margin = USAGE_MENU_VIEWPORT_MARGIN_PX;
    let left = rect.right - USAGE_MENU_WIDTH_PX;
    left = Math.max(margin, Math.min(left, window.innerWidth - USAGE_MENU_WIDTH_PX - margin));

    const spaceBelow = window.innerHeight - rect.bottom - margin;
    const spaceAbove = rect.top - margin;
    const openUp = spaceBelow < 180 && spaceAbove > spaceBelow;
    const maxHeight = Math.min(
      USAGE_MENU_MAX_HEIGHT_PX,
      openUp ? spaceAbove - 4 : spaceBelow - 4,
    );
    const top = openUp ? rect.top - maxHeight - 4 : rect.bottom + 4;

    setMenuStyle({
      top: Math.max(margin, top),
      left,
      width: USAGE_MENU_WIDTH_PX,
      maxHeight: Math.max(120, maxHeight),
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    updateMenuPosition();
    const onLayoutChange = () => updateMenuPosition();
    window.addEventListener("resize", onLayoutChange);
    window.addEventListener("scroll", onLayoutChange, true);
    return () => {
      window.removeEventListener("resize", onLayoutChange);
      window.removeEventListener("scroll", onLayoutChange, true);
    };
  }, [open, updateMenuPosition]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: Event) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  if (count === 0) return null;

  const menu =
    open &&
    createPortal(
      <div
        ref={menuRef}
        role="menu"
        aria-label={label}
        className="peer-usage-menu peer-usage-menu--portal"
        style={menuStyle}
      >
        <div className="peer-usage-menu-head">
          <span className="peer-library-eyebrow">Used in</span>
        </div>
        <div className="max-h-80 overflow-y-auto py-0.5">
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
              className="peer-usage-menu-item"
              title={placementTocLabel(placement)}
            >
              {placement.blockNumber ? (
                <span className="shrink-0 tabular-nums text-[11px] font-medium text-[var(--peer-text-caption)]">
                  {placement.blockNumber}
                </span>
              ) : null}
              <span className="min-w-0 flex-1 truncate text-[12px] font-medium leading-snug text-[var(--peer-text)]">
                {placement.blockTitle}
              </span>
            </button>
          ))}
        </div>
      </div>,
      document.body,
    );

  return (
    <div ref={triggerRef} className="relative ml-0.5 shrink-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={label}
        title={label}
        className={`peer-usage-badge is-clickable ${open ? "is-open" : ""}`}
      >
        <span>{count}</span>
      </button>
      {menu}
    </div>
  );
}

function RowUsageSlot({
  placements,
  usageCount,
  onNavigateToPlacement,
  showUnused = false,
}: {
  placements?: StudySourcePlacement[];
  usageCount?: number;
  onNavigateToPlacement?: (placement: StudySourcePlacement) => void;
  showUnused?: boolean;
}) {
  const mapped = placements ?? [];
  if (mapped.length > 0) {
    return (
      <UsageMenu placements={mapped} onNavigateToPlacement={onNavigateToPlacement} />
    );
  }
  if (showUnused && !usageCount) {
    return <UnusedUsageBadge />;
  }
  return <span className="w-2 shrink-0" aria-hidden />;
}

function SelectionCheckbox({
  checked,
  indeterminate = false,
  label,
  onToggle,
}: {
  checked: boolean;
  indeterminate?: boolean;
  label: string;
  onToggle: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <span
      className="flex shrink-0 items-center"
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <input
        ref={inputRef}
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
  showUsageIndicators = false,
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
  showUsageIndicators?: boolean;
  label: string;
  pageRef?: string | null;
}) {
  const didDragRef = useRef(false);
  const draggable = enableMappingDrag;

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
      className={`group/lib-row flex min-w-0 items-center gap-1.5 border-b border-[var(--peer-border-subtle)] py-1.5 pl-2.5 pr-3 last:border-b-0 ${rowSurfaceClass(
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
        className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden text-left"
      >
        <span className="min-w-0 truncate text-[11px] text-[var(--peer-text-secondary)]">
          {label}
        </span>
        {pageRef && (
          <span className="shrink-0 text-[10px] text-[var(--peer-text-caption)]">{pageRef}</span>
        )}
      </button>
      <RowUsageSlot
        placements={placements}
        usageCount={usageCount}
        onNavigateToPlacement={onNavigateToPlacement}
        showUnused={showUsageIndicators}
      />
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
  isIndeterminate = false,
  onSelect,
  onToggleSelected,
  onStudySourceDragStart,
  usageCount,
  placements,
  onNavigateToPlacement,
  showUsageIndicators = false,
}: {
  group: DocumentGroup;
  category: string;
  expanded: boolean;
  isActive: boolean;
  isSelected: boolean;
  isIndeterminate?: boolean;
  onSelect: (event: MouseEvent) => void;
  onToggleSelected: () => void;
  onStudySourceDragStart: (entry: StudyDataSource, event: DragEvent) => void;
  usageCount?: number;
  placements?: StudySourcePlacement[];
  onNavigateToPlacement?: (placement: StudySourcePlacement) => void;
  showUsageIndicators?: boolean;
}) {
  const didDragRef = useRef(false);
  const dragEntry = defaultDragEntryForGroup(group);
  const swatch = libraryCategoryAccent(category);
  const pageRef = pageRefFor(dragEntry);

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
      className={`group/lib-doc flex min-w-0 items-center gap-1.5 py-2 pl-3 pr-3 ${rowSurfaceClass(
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
        indeterminate={isIndeterminate}
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
        className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden text-left"
        title={pageRef ? `Default section: ${pageRef}` : undefined}
      >
        <span className="min-w-0 truncate text-[12px] font-semibold text-[var(--peer-text)]">
          {group.documentLabel}
        </span>
        {pageRef && (
          <span className="shrink-0 text-[10px] font-normal text-[var(--peer-text-caption)]">
            {pageRef}
          </span>
        )}
      </button>
      <RowUsageSlot
        placements={placements}
        usageCount={usageCount}
        onNavigateToPlacement={onNavigateToPlacement}
        showUnused={showUsageIndicators}
      />
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
  onToggleGroupSelected,
  onStudySourceDragStart,
  onHoverStart,
  onHoverEnd,
  onHoverSection,
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
  onSelectEntry: (source: StudyDataSource, event: MouseEvent, group?: DocumentGroup) => void;
  onToggleSelected: (source: StudyDataSource) => void;
  onToggleGroupSelected: (group: DocumentGroup) => void;
  onStudySourceDragStart: (entry: StudyDataSource, event: DragEvent) => void;
  onHoverStart?: () => void;
  onHoverEnd?: () => void;
  onHoverSection?: () => void;
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
  const showUsageIndicators = Boolean(placementsByStudySourceId);
  const groupEntryIds = entries.map((entry) => entry.id);
  const groupAllSelected =
    groupEntryIds.length > 0 && groupEntryIds.every((id) => selectedIds.has(id));
  const groupSomeSelected = groupEntryIds.some((id) => selectedIds.has(id));

  if (enableMappingDrag) {
    return (
      <div
        className="border-b border-[var(--peer-border-subtle)] last:border-b-0"
        onMouseEnter={onHoverStart}
        onMouseLeave={onHoverEnd}
      >
        <LibraryDocumentRow
          group={group}
          category={category}
          expanded={expanded}
          isActive={dragEntry.id === activeSourceId}
          isSelected={groupAllSelected}
          isIndeterminate={groupSomeSelected && !groupAllSelected}
          onSelect={(event) => onSelectEntry(dragEntry, event, group)}
          onToggleSelected={() => onToggleGroupSelected(group)}
          onStudySourceDragStart={onStudySourceDragStart}
          usageCount={groupUsageCount}
          placements={groupPlacements}
          onNavigateToPlacement={onNavigateToPlacement}
          showUsageIndicators={showUsageIndicators}
        />

        {hasSections && (
          <div
            className={`grid transition-[grid-template-rows] duration-200 ease-out ${
              expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
            }`}
          >
            <div className="min-h-0 overflow-hidden">
              <div
                id={`doc-sections-${collapseKey}`}
                className={`bg-[var(--peer-surface-raised)] pl-3 pr-1 ${
                  expanded ? "border-t border-[var(--peer-border-subtle)]" : ""
                }`}
                onMouseEnter={onHoverSection}
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
                  showUsageIndicators={showUsageIndicators}
                  label={sectionLabelFor(entry)}
                  pageRef={pageRefFor(entry)}
                />
              ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="border-b border-[var(--peer-border-subtle)] last:border-b-0">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={`doc-sections-${collapseKey}`}
        onClick={onToggleCollapse}
        className="flex w-full items-center gap-1.5 px-3 py-2 text-left transition-colors hover:bg-[var(--peer-surface-muted)]"
      >
        <ChevronRight
          size={13}
          strokeWidth={2}
          className={`shrink-0 text-[#bdbdbd] transition-transform ${expanded ? "rotate-90" : ""}`}
        />
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: libraryCategoryAccent(category) }}
          aria-hidden
        />
        <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-[var(--peer-text)]">
          {group.documentLabel}
        </span>
        <span className="shrink-0 text-[10px] font-medium tabular-nums text-[#9e9e9e]">
          {entries.length}
        </span>
      </button>

      {expanded && (
        <div id={`doc-sections-${collapseKey}`} className="border-t border-[var(--peer-border-subtle)] bg-[var(--peer-surface-raised)]">
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
              showUsageIndicators={showUsageIndicators}
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
  onHoverDocumentStart,
  onHoverDocumentEnd,
  onHoverDocumentSection,
  onSelectEntry,
  onToggleSelected,
  onToggleGroupSelected,
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
  onHoverDocumentStart: (key: string) => void;
  onHoverDocumentEnd: () => void;
  onHoverDocumentSection: (key: string) => void;
  onSelectEntry: (source: StudyDataSource, event: MouseEvent, group?: DocumentGroup) => void;
  onToggleSelected: (source: StudyDataSource) => void;
  onToggleGroupSelected: (group: DocumentGroup) => void;
  onStudySourceDragStart: (entry: StudyDataSource, event: DragEvent) => void;
  enableMappingDrag?: boolean;
  usageCountByStudySourceId?: Record<string, number>;
  placementsByStudySourceId?: Record<string, StudySourcePlacement[]>;
  onNavigateToPlacement?: (placement: StudySourcePlacement) => void;
}) {
  const { documents, standalone } = useMemo(() => groupDocuments(items), [items]);
  const swatch = libraryCategoryAccent(category);
  const showUsageIndicators = Boolean(placementsByStudySourceId);

  const docIsExpanded = (key: string, group: DocumentGroup) => {
    const hasActiveChild = documentEntriesForGroup(group).some((entry) => entry.id === activeSourceId);
    if (hasActiveChild) return true;
    if (enableMappingDrag && hoverDocKey === key) return true;
    return !collapsedDocs.has(key);
  };

  return (
    <section className="border-b border-[var(--peer-border)] last:border-b-0">
      <div className="peer-library-category-head">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: swatch }} />
        <h4 className="peer-library-eyebrow">{category}</h4>
        <span className="ml-auto text-[10px] font-medium tabular-nums text-[var(--peer-text-caption)]">
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
              onToggleGroupSelected={onToggleGroupSelected}
              onStudySourceDragStart={onStudySourceDragStart}
              onHoverStart={
                enableMappingDrag
                  ? () => onHoverDocumentStart(key)
                  : undefined
              }
              onHoverEnd={enableMappingDrag ? onHoverDocumentEnd : undefined}
              onHoverSection={
                enableMappingDrag ? () => onHoverDocumentSection(key) : undefined
              }
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
            showUsageIndicators={showUsageIndicators}
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
  tlfOnly = false,
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
  /** When true, only tables, listings, and figures are shown. */
  tlfOnly?: boolean;
}) {
  const [internalQuery, setInternalQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [collapsedDocs, setCollapsedDocs] = useState<Set<string>>(() =>
    buildDefaultCollapsedKeys(sources),
  );
  const [hoverDocKey, setHoverDocKey] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const hoverEnterTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hoverLeaveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hoverDocKeyRef = useRef<string | null>(null);
  const query = controlledQuery ?? internalQuery;
  const setQuery = onQueryChange ?? setInternalQuery;

  useEffect(() => {
    hoverDocKeyRef.current = hoverDocKey;
  }, [hoverDocKey]);

  useEffect(
    () => () => {
      if (hoverEnterTimerRef.current) clearTimeout(hoverEnterTimerRef.current);
      if (hoverLeaveTimerRef.current) clearTimeout(hoverLeaveTimerRef.current);
    },
    [],
  );

  const cancelHoverLeave = useCallback(() => {
    if (hoverLeaveTimerRef.current) {
      clearTimeout(hoverLeaveTimerRef.current);
      hoverLeaveTimerRef.current = undefined;
    }
  }, []);

  const handleHoverDocumentStart = useCallback(
    (key: string) => {
      if (!enableMappingDrag) return;
      cancelHoverLeave();
      if (hoverEnterTimerRef.current) clearTimeout(hoverEnterTimerRef.current);

      if (hoverDocKeyRef.current === key) return;

      const delay = hoverDocKeyRef.current !== null ? 0 : HOVER_EXPAND_ENTER_MS;
      hoverEnterTimerRef.current = setTimeout(() => {
        hoverEnterTimerRef.current = undefined;
        setHoverDocKey(key);
      }, delay);
    },
    [cancelHoverLeave, enableMappingDrag],
  );

  const handleHoverDocumentSection = useCallback(
    (key: string) => {
      if (!enableMappingDrag) return;
      cancelHoverLeave();
      if (hoverEnterTimerRef.current) {
        clearTimeout(hoverEnterTimerRef.current);
        hoverEnterTimerRef.current = undefined;
      }
      if (hoverDocKeyRef.current !== key) {
        setHoverDocKey(key);
      }
    },
    [cancelHoverLeave, enableMappingDrag],
  );

  const handleHoverDocumentEnd = useCallback(() => {
    if (!enableMappingDrag) return;
    if (hoverEnterTimerRef.current) {
      clearTimeout(hoverEnterTimerRef.current);
      hoverEnterTimerRef.current = undefined;
    }
    cancelHoverLeave();
    hoverLeaveTimerRef.current = setTimeout(() => {
      hoverLeaveTimerRef.current = undefined;
      setHoverDocKey(null);
    }, HOVER_EXPAND_LEAVE_MS);
  }, [cancelHoverLeave, enableMappingDrag]);

  const handleSelectEntry = useCallback(
    (entry: StudyDataSource, _event: MouseEvent, group?: DocumentGroup) => {
      onSelect(entry);
      if (!enableMappingDrag || !group) return;
      const ids = documentEntriesForGroup(group).map((item) => item.id);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const id of ids) next.add(id);
        return next;
      });
    },
    [enableMappingDrag, onSelect],
  );

  const handleToggleSelected = useCallback((entry: StudyDataSource) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(entry.id)) next.delete(entry.id);
      else next.add(entry.id);
      return next;
    });
  }, []);

  const handleToggleGroupSelected = useCallback((group: DocumentGroup) => {
    const ids = documentEntriesForGroup(group).map((entry) => entry.id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allSelected = ids.length > 0 && ids.every((id) => next.has(id));
      for (const id of ids) {
        if (allSelected) next.delete(id);
        else next.add(id);
      }
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
      if (tlfOnly && !isTlfStudySource(entry)) return false;
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
  }, [query, sources, categoryFilter, tlfOnly]);

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
    <div className="peer-library-shell">
      <div className="peer-library-header">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-[13px] font-semibold text-[var(--peer-text)]">
            Data Source
            <span className="ml-1.5 font-normal tabular-nums text-[var(--peer-icon-muted)]">
              ({filtered.length}
              {tlfOnly && filtered.length !== sources.length ? ` of ${sources.length}` : ""})
            </span>
          </h3>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close data source panel"
              className="-mr-1 rounded p-1 text-[var(--peer-muted)] hover:bg-[var(--peer-surface-muted)]"
            >
              <X size={18} />
            </button>
          )}
        </div>
        <label className="relative mb-2.5 block">
          <Search
            size={13}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--peer-icon-muted)]"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search…"
            className="peer-library-search"
          />
        </label>
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setCategoryFilter(null)}
            className={`peer-library-filter ${categoryFilter === null ? "is-active" : ""}`}
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
              className={`peer-library-filter ${
                categoryFilter === category ? "is-brand" : ""
              }`}
            >
              {category}
            </button>
          ))}
        </div>
        {enableMappingDrag && placementsByStudySourceId && (
          <p className="peer-library-usage-hint">
            Click a count to jump to where that source is mapped.
          </p>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {categories.length === 0 ? (
          <p className="px-3 py-8 text-center text-[12px] text-[var(--peer-text-caption)]">
            No matches.
          </p>
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
              onHoverDocumentStart={handleHoverDocumentStart}
              onHoverDocumentEnd={handleHoverDocumentEnd}
              onHoverDocumentSection={handleHoverDocumentSection}
              onSelectEntry={handleSelectEntry}
              onToggleSelected={handleToggleSelected}
              onToggleGroupSelected={handleToggleGroupSelected}
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
