import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { ChevronRight, Eye, GripVertical, Search, X } from "lucide-react";
import { parsePageRange, getReferenceDisplayName } from "../data/documentPreview";
import { getDocumentCategory } from "../data/roadmap";
import type { StudyDataSource } from "../data/studyDataSources";
import { STUDY_DATA_SOURCES } from "../data/studyDataSources";
import { setV2DragData } from "../utils/v2DragPayload";

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

function StatusDot({ processed }: { processed: boolean }) {
  return (
    <span
      className={`mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full ${
        processed ? "bg-[#2e7d32]" : "bg-[#bdbdbd]"
      }`}
      aria-label={processed ? "Processed" : "Uploaded"}
    />
  );
}

function startStudySourceDrag(entry: StudyDataSource, event: DragEvent) {
  setV2DragData(event.dataTransfer, { kind: "study-source", studySourceId: entry.id });
}

function UsageBadge({ count }: { count: number }) {
  return (
    <span
      className="shrink-0 rounded-full bg-[#e6f6ec] px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-[#1a8a4a]"
      title={`Mapped in ${count} section${count === 1 ? "" : "s"}`}
    >
      {count}×
    </span>
  );
}

function LibrarySectionRow({
  entry,
  isActive,
  onSelect,
  enableMappingDrag,
  usageCount,
  label,
  pageRef,
}: {
  entry: StudyDataSource;
  isActive: boolean;
  onSelect: () => void;
  enableMappingDrag: boolean;
  usageCount?: number;
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
        if (draggable) startStudySourceDrag(entry, event);
      }}
      onDragEnd={() => {
        window.setTimeout(() => {
          didDragRef.current = false;
        }, 0);
      }}
      className={`group/lib-row flex items-center gap-1 rounded-md py-0.5 pr-1 transition-colors ${
        draggable ? "cursor-grab touch-none active:cursor-grabbing" : ""
      } ${isActive ? "bg-[#fedbda]" : "hover:bg-[#f3f3f3]"}`}
    >
      {draggable ? (
        <GripVertical
          size={11}
          strokeWidth={2}
          className="pointer-events-none shrink-0 text-[#d0d0d0]"
          aria-hidden
        />
      ) : (
        <span className="w-[11px] shrink-0" aria-hidden />
      )}
      <button
        type="button"
        draggable={false}
        onClick={() => {
          if (didDragRef.current) return;
          onSelect();
        }}
        className="min-w-0 flex-1 truncate py-0.5 text-left"
      >
        <span className="text-[11px] font-medium text-[#302f2f]">{label}</span>
        {pageRef && (
          <span className="ml-1.5 text-[10px] font-normal text-[#9e9e9e]">{pageRef}</span>
        )}
      </button>
      {usageCount != null && usageCount > 0 && <UsageBadge count={usageCount} />}
      <button
        type="button"
        draggable={false}
        onClick={(event) => {
          event.stopPropagation();
          onSelect();
        }}
        aria-label={`Preview ${label}`}
        title="Trace to data"
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[#bdbdbd] opacity-0 transition-opacity hover:text-[#302f2f] group-hover/lib-row:opacity-100"
      >
        <Eye size={12} strokeWidth={1.75} />
      </button>
      <StatusDot processed={entry.status === "processed"} />
    </div>
  );
}

function defaultDragEntryForGroup(group: DocumentGroup): StudyDataSource {
  return group.root;
}

function LibraryDocumentRow({
  group,
  category,
  collapsed,
  isActive,
  onToggleCollapse,
  onSelect,
  usageCount,
}: {
  group: DocumentGroup;
  category: string;
  collapsed: boolean;
  isActive: boolean;
  onToggleCollapse: () => void;
  onSelect: () => void;
  usageCount?: number;
}) {
  const didDragRef = useRef(false);
  const dragEntry = defaultDragEntryForGroup(group);
  const swatch = CATEGORY_SWATCH[category] ?? CATEGORY_SWATCH.Document;
  const entries = documentEntriesForGroup(group);
  const pageRef = pageRefFor(dragEntry);

  return (
    <div
      draggable
      onDragStart={(event) => {
        didDragRef.current = true;
        event.stopPropagation();
        startStudySourceDrag(dragEntry, event);
      }}
      onDragEnd={() => {
        window.setTimeout(() => {
          didDragRef.current = false;
        }, 0);
      }}
      className={`group/lib-doc flex items-center gap-1 rounded-md py-0.5 pr-1 transition-colors cursor-grab touch-none active:cursor-grabbing ${
        isActive ? "bg-[#fedbda]" : "hover:bg-[#f3f3f3]"
      }`}
    >
      <GripVertical
        size={11}
        strokeWidth={2}
        className="pointer-events-none shrink-0 text-[#d0d0d0]"
        aria-hidden
      />
      <button
        type="button"
        draggable={false}
        aria-expanded={!collapsed}
        onClick={(event) => {
          event.stopPropagation();
          onToggleCollapse();
        }}
        className="flex h-5 w-4 shrink-0 items-center justify-center rounded text-[#bdbdbd] hover:bg-black/[0.05] hover:text-[#636161]"
      >
        <ChevronRight
          size={13}
          strokeWidth={2}
          className={`transition-transform ${collapsed ? "" : "rotate-90"}`}
        />
      </button>
      <span
        className="h-2 w-2 shrink-0 rounded-sm"
        style={{ backgroundColor: swatch }}
        aria-hidden
      />
      <button
        type="button"
        draggable={false}
        onClick={() => {
          if (didDragRef.current) return;
          onSelect();
        }}
        className="min-w-0 flex-1 truncate py-0.5 text-left"
        title={pageRef ? `Default section: ${pageRef}` : undefined}
      >
        <span className="text-[12px] font-medium text-[#302f2f]">{group.documentLabel}</span>
        {pageRef && (
          <span className="ml-1.5 text-[10px] font-normal text-[#9e9e9e]">{pageRef}</span>
        )}
      </button>
      {usageCount != null && usageCount > 0 && <UsageBadge count={usageCount} />}
      <button
        type="button"
        draggable={false}
        onClick={(event) => {
          event.stopPropagation();
          onSelect();
        }}
        aria-label={`Preview ${group.documentLabel}`}
        title="Trace to data"
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[#bdbdbd] opacity-0 transition-opacity hover:text-[#302f2f] group-hover/lib-doc:opacity-100"
      >
        <Eye size={12} strokeWidth={1.75} />
      </button>
      <span className="shrink-0 text-[10px] tabular-nums text-[#bdbdbd]">{entries.length}</span>
      <StatusDot processed={dragEntry.status === "processed"} />
    </div>
  );
}

function DocumentGroupSection({
  group,
  category,
  activeSourceId,
  collapsed,
  onToggleCollapse,
  onSelect,
  enableMappingDrag = false,
  usageCountByStudySourceId,
}: {
  group: DocumentGroup;
  category: string;
  activeSourceId?: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onSelect: (source: StudyDataSource) => void;
  enableMappingDrag?: boolean;
  usageCountByStudySourceId?: Record<string, number>;
}) {
  const entries = documentEntriesForGroup(group);
  const collapseKey = `${category}:${group.key}`;
  const swatch = CATEGORY_SWATCH[category] ?? CATEGORY_SWATCH.Document;
  const dragEntry = defaultDragEntryForGroup(group);

  if (enableMappingDrag) {
    return (
      <div>
        <LibraryDocumentRow
          group={group}
          category={category}
          collapsed={collapsed}
          isActive={dragEntry.id === activeSourceId}
          onToggleCollapse={onToggleCollapse}
          onSelect={() => onSelect(dragEntry)}
          usageCount={usageCountByStudySourceId?.[dragEntry.id]}
        />

        {!collapsed && (
          <div id={`doc-sections-${collapseKey}`} className="ml-[18px] border-l border-[#ececec] pl-1.5">
            {entries.slice(1).map((entry) => (
              <LibrarySectionRow
                key={entry.id}
                entry={entry}
                isActive={entry.id === activeSourceId}
                onSelect={() => onSelect(entry)}
                enableMappingDrag={enableMappingDrag}
                usageCount={usageCountByStudySourceId?.[entry.id]}
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
    <div>
      <button
        type="button"
        aria-expanded={!collapsed}
        aria-controls={`doc-sections-${collapseKey}`}
        onClick={onToggleCollapse}
        className="flex w-full items-center gap-1.5 rounded-md py-1 pl-0.5 pr-1 text-left transition-colors hover:bg-[#f3f3f3]"
      >
        <ChevronRight
          size={13}
          strokeWidth={2}
          className={`shrink-0 text-[#bdbdbd] transition-transform ${collapsed ? "" : "rotate-90"}`}
        />
        <span
          className="h-2 w-2 shrink-0 rounded-sm"
          style={{ backgroundColor: swatch }}
          aria-hidden
        />
        <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-[#302f2f]">
          {group.documentLabel}
        </span>
        <span className="shrink-0 text-[10px] tabular-nums text-[#bdbdbd]">
          {entries.length}
        </span>
      </button>

      {!collapsed && (
        <div id={`doc-sections-${collapseKey}`} className="ml-[18px] border-l border-[#ececec] pl-1.5">
          {entries.map((entry) => (
            <LibrarySectionRow
              key={entry.id}
              entry={entry}
              isActive={entry.id === activeSourceId}
              onSelect={() => onSelect(entry)}
              enableMappingDrag={enableMappingDrag}
              usageCount={usageCountByStudySourceId?.[entry.id]}
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
  collapsedDocs,
  onToggleDocument,
  onSelect,
  enableMappingDrag = false,
  usageCountByStudySourceId,
}: {
  category: string;
  items: StudyDataSource[];
  activeSourceId?: string;
  collapsedDocs: Set<string>;
  onToggleDocument: (key: string) => void;
  onSelect: (source: StudyDataSource) => void;
  enableMappingDrag?: boolean;
  usageCountByStudySourceId?: Record<string, number>;
}) {
  const { documents, standalone } = useMemo(() => groupDocuments(items), [items]);

  return (
    <section className="px-3 pb-3">
      <div className="mb-1 flex items-baseline gap-1.5 px-0.5 pt-3 first:pt-1">
        <h4 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#9e9e9e]">
          {category}
        </h4>
        <span className="text-[10px] tabular-nums text-[#bdbdbd]">{items.length}</span>
      </div>

      <div className="space-y-0.5">
        {documents.map((group) => (
          <DocumentGroupSection
            key={group.key}
            group={group}
            category={category}
            activeSourceId={activeSourceId}
            collapsed={collapsedDocs.has(`${category}:${group.key}`)}
            onToggleCollapse={() => onToggleDocument(`${category}:${group.key}`)}
            onSelect={onSelect}
            enableMappingDrag={enableMappingDrag}
            usageCountByStudySourceId={usageCountByStudySourceId}
          />
        ))}

        {standalone.map((entry) => (
          <LibrarySectionRow
            key={entry.id}
            entry={entry}
            label={entry.name}
            isActive={entry.id === activeSourceId}
            onSelect={() => onSelect(entry)}
            enableMappingDrag={enableMappingDrag}
            usageCount={usageCountByStudySourceId?.[entry.id]}
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
  onClose?: () => void;
}) {
  const [internalQuery, setInternalQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [collapsedDocs, setCollapsedDocs] = useState<Set<string>>(() =>
    buildDefaultCollapsedKeys(sources),
  );
  const query = controlledQuery ?? internalQuery;
  const setQuery = onQueryChange ?? setInternalQuery;

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
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#fafafa]">
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
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto py-1">
        {categories.length === 0 ? (
          <p className="px-3 py-8 text-center text-[12px] text-[#8a8a8a]">No matches.</p>
        ) : (
          categories.map(({ category, items }) => (
            <CategorySection
              key={category}
              category={category}
              items={items}
              activeSourceId={activeSourceId}
              collapsedDocs={collapsedDocs}
              onToggleDocument={toggleDocument}
              onSelect={onSelect}
              enableMappingDrag={enableMappingDrag}
              usageCountByStudySourceId={usageCountByStudySourceId}
            />
          ))
        )}
      </div>
    </div>
  );
}
