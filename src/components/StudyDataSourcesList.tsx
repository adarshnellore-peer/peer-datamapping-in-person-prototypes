import { useEffect, useMemo, useState, type DragEvent, type ReactNode } from "react";
import { ChevronRight, GripVertical, Search } from "lucide-react";
import { getDocumentCategory } from "../data/roadmap";
import type { StudyDataSource } from "../data/studyDataSources";
import { STUDY_DATA_SOURCES } from "../data/studyDataSources";
import { setV2DragData } from "../utils/v2DragPayload";

const CATEGORY_ORDER = ["Protocol", "SAP", "CSR", "Template", "Figures", "Listings", "Document"];

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
  const fromReference = entry.referenceKey.split(":")[0]?.trim();
  if (fromReference) return fromReference;

  const separator = entry.name.indexOf(" — ");
  if (separator !== -1) return entry.name.slice(separator + 3);
  return entry.name;
}

function documentLabelFor(entry: StudyDataSource): string {
  const separator = entry.name.indexOf(" — ");
  if (separator !== -1) return entry.name.slice(0, separator);
  return entry.name;
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

function DragGrip({
  entry,
  enableMappingDrag,
}: {
  entry: StudyDataSource;
  enableMappingDrag: boolean;
}) {
  if (!enableMappingDrag) return <span className="w-1 shrink-0" aria-hidden />;
  return (
    <button
      type="button"
      draggable
      onDragStart={(event) => {
        event.stopPropagation();
        startStudySourceDrag(entry, event);
      }}
      title="Drag onto a section"
      aria-label="Drag onto a section"
      className="mt-2.5 flex h-6 w-5 shrink-0 cursor-grab items-center justify-center rounded text-[#c4c4c4] hover:bg-[#f0f0f0] hover:text-[#757575] active:cursor-grabbing"
    >
      <GripVertical size={12} strokeWidth={2} />
    </button>
  );
}

function SourceRow({
  label,
  secondary,
  depth = 0,
  isActive,
  onSelect,
  processed,
  entry,
  enableMappingDrag = false,
}: {
  label: ReactNode;
  secondary?: ReactNode;
  depth?: 0 | 1;
  isActive: boolean;
  onSelect: () => void;
  processed: boolean;
  entry?: StudyDataSource;
  enableMappingDrag?: boolean;
}) {
  const padLeft = depth === 1 ? "pl-1" : "pl-0.5";

  return (
    <div className={`flex items-start ${padLeft}`}>
      {entry ? (
        <DragGrip entry={entry} enableMappingDrag={enableMappingDrag} />
      ) : (
        <span className="w-5 shrink-0" aria-hidden />
      )}
      <button
        type="button"
        onClick={onSelect}
        className={`flex min-w-0 flex-1 items-start gap-2.5 py-2.5 pr-3 text-left transition-colors ${
          isActive ? "bg-[#fedbda]" : "hover:bg-[#f5f5f5]"
        }`}
      >
        <span className="min-w-0 flex-1">
          <span
            className={`block text-[12px] leading-snug ${
              depth === 0
                ? isActive
                  ? "font-semibold text-[#302f2f]"
                  : "font-medium text-[#302f2f]"
                : isActive
                  ? "font-medium text-[#302f2f]"
                  : "font-normal text-[#636161]"
            }`}
          >
            {label}
          </span>
          {secondary && (
            <span className="mt-0.5 block text-[11px] leading-snug text-[#9e9e9e]">{secondary}</span>
          )}
        </span>
        <StatusDot processed={processed} />
      </button>
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
}: {
  group: DocumentGroup;
  category: string;
  activeSourceId?: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onSelect: (source: StudyDataSource) => void;
  enableMappingDrag?: boolean;
}) {
  const hasSections = group.sections.length > 0;
  const collapseKey = `${category}:${group.key}`;
  const rootActive = group.root.id === activeSourceId;

  return (
    <div className="overflow-hidden rounded-lg border border-[#e4e4e4] bg-white shadow-sm">
      <div
        className={`flex items-start gap-0.5 ${hasSections ? "border-b border-[#f0f0f0]" : ""} ${
          rootActive ? "bg-[#fedbda]" : ""
        }`}
      >
        {hasSections ? (
          <button
            type="button"
            aria-expanded={!collapsed}
            aria-controls={`doc-sections-${collapseKey}`}
            aria-label={collapsed ? "Expand sections" : "Collapse sections"}
            onClick={(event) => {
              event.stopPropagation();
              onToggleCollapse();
            }}
            className="mt-2.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[#bdbdbd] transition-colors hover:bg-black/[0.04] hover:text-[#636161]"
          >
            <ChevronRight
              size={14}
              strokeWidth={2}
              className={`transition-transform ${collapsed ? "" : "rotate-90"}`}
            />
          </button>
        ) : (
          <span className="w-7 shrink-0" aria-hidden />
        )}

        <DragGrip entry={group.root} enableMappingDrag={enableMappingDrag} />

        <button
          type="button"
          onClick={() => onSelect(group.root)}
          className="flex min-w-0 flex-1 items-start gap-2.5 py-2.5 pr-3 text-left hover:bg-[#fafafa]"
        >
          <span className="min-w-0 flex-1">
            <span
              className={`block text-[12px] leading-snug ${
                rootActive ? "font-semibold text-[#302f2f]" : "font-medium text-[#302f2f]"
              }`}
            >
              {group.documentLabel}
            </span>
            {hasSections && (
              <span className="mt-0.5 block text-[11px] leading-snug text-[#9e9e9e]">
                {group.sections.length} sections
              </span>
            )}
          </span>
          <StatusDot processed={group.root.status === "processed"} />
        </button>
      </div>

      {hasSections && !collapsed && (
        <ul id={`doc-sections-${collapseKey}`} className="divide-y divide-[#f5f5f5]">
          {group.sections.map((entry) => (
            <li key={entry.id}>
              <SourceRow
                depth={1}
                label={sectionLabelFor(entry)}
                isActive={entry.id === activeSourceId}
                onSelect={() => onSelect(entry)}
                processed={entry.status === "processed"}
                entry={entry}
                enableMappingDrag={enableMappingDrag}
              />
            </li>
          ))}
        </ul>
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
}: {
  category: string;
  items: StudyDataSource[];
  activeSourceId?: string;
  collapsedDocs: Set<string>;
  onToggleDocument: (key: string) => void;
  onSelect: (source: StudyDataSource) => void;
  enableMappingDrag?: boolean;
}) {
  const { documents, standalone } = useMemo(() => groupDocuments(items), [items]);

  return (
    <section className="px-3 pb-4">
      <div className="mb-2.5 flex items-baseline gap-2 border-t border-[#ececec] pt-4 first:border-t-0 first:pt-1">
        <h4 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#636161]">
          {category}
        </h4>
        <span className="rounded-full bg-[#f0f0f0] px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-[#9e9e9e]">
          {items.length}
        </span>
      </div>

      <div className="space-y-2.5">
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
          />
        ))}

        {standalone.length > 0 && (
          <div className="divide-y divide-[#e0e0e0] overflow-hidden rounded-lg border border-[#d8d8d8] bg-white">
            {standalone.map((entry) => (
              <SourceRow
                key={entry.id}
                label={entry.name}
                isActive={entry.id === activeSourceId}
                onSelect={() => onSelect(entry)}
                processed={entry.status === "processed"}
                entry={entry}
                enableMappingDrag={enableMappingDrag}
              />
            ))}
          </div>
        )}
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
}: {
  sources?: StudyDataSource[];
  activeSourceId?: string;
  onSelect: (source: StudyDataSource) => void;
  compact?: boolean;
  query?: string;
  onQueryChange?: (query: string) => void;
  /** V2: rows are draggable onto section drop zones. */
  enableMappingDrag?: boolean;
}) {
  const [internalQuery, setInternalQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [collapsedDocs, setCollapsedDocs] = useState<Set<string>>(() => new Set());
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
      <div className="shrink-0 border-b border-[#ececec] bg-white px-3 py-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-[13px] font-semibold text-[#302f2f]">
            Data sources
            <span className="ml-1.5 font-normal tabular-nums text-[#bdbdbd]">({sources.length})</span>
          </h3>
        </div>
        {enableMappingDrag && (
          <p className="mb-2 text-[10px] leading-snug text-[#9e9e9e]">
            <GripVertical size={10} className="mr-0.5 inline -mt-px" />
            Use grip to drag onto a section
          </p>
        )}
        <div className="mb-2.5 flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setCategoryFilter(null)}
            className={`rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors ${
              categoryFilter === null
                ? "border-[#302f2f] bg-[#302f2f] text-white"
                : "border-[#e0e0e0] bg-white text-[#636161] hover:border-[#c8c8c8]"
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
                  ? "border-[#2b5bd7] bg-[#eef3ff] text-[#2b5bd7]"
                  : "border-[#e0e0e0] bg-white text-[#636161] hover:border-[#c8c8c8]"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
        <label className="relative block">
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
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto py-2">
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
            />
          ))
        )}
      </div>
    </div>
  );
}
