import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  FileSearch,
  FileText,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { PillOptionPicker } from "../CollapsiblePillField";
import {
  SOURCE_ROLES,
  getReferenceKeysForDataSource,
  enrichDataSourceSource,
  type DataSourceRoadmapSource,
  type SourceRole,
} from "../../data/roadmap";
import type { DocumentBlock } from "../../types";
import { buildSourceTree, type DocNode, type Placement } from "./sourceTree";
import { CATEGORY_DOT, ROLE_BADGE, roleLabel, type VariantProps } from "./types";

/**
 * Mocked version-change demo: documents listed here render an "update
 * available" affordance so the version-propagation flow can be shown. No real
 * versioning data exists yet (confirm with team).
 */
const HAS_UPDATE: Record<string, string> = {
  "247HV101 Protocol Version 3": "v4",
};

type StatusFilter = "all" | "review" | "confirmed";

/** Section options for the "Add to section" picker: id + heading-aware label. */
function buildSectionOptions(blocks: DocumentBlock[]): { ids: string[]; label: Map<string, string> } {
  const ids: string[] = [];
  const label = new Map<string, string>();
  let heading: string | null = null;
  for (const block of blocks) {
    if (block.type === "heading") {
      heading = `${block.number ? block.number + " " : ""}${block.title}`;
    } else if (block.type === "content") {
      ids.push(block.id);
      label.set(block.id, heading ? `${heading} \u00b7 ${block.title}` : block.title);
    }
  }
  return { ids, label };
}

/**
 * V6 - Source view. The section-centric data inverted to a document-centric
 * view: Type group > Document > the sections it feeds. A left index rail makes
 * the (often 30-40+) documents navigable; each document card nests its sections
 * under a connector spine so the source -> section hierarchy reads clearly.
 */
export function SourceViewVariant({
  blocks,
  tracedSource,
  onTraceSource,
  onUpdateSource,
  onRemoveSource,
  onMapDataSource,
  onConfirmAllForDataSource,
}: VariantProps & {
  onMapDataSource: (blockId: string, dataSource: string, role?: SourceRole) => void;
  onConfirmAllForDataSource: (dataSource: string) => void;
}) {
  const tree = useMemo(() => buildSourceTree(blocks), [blocks]);
  const sectionOptions = useMemo(() => buildSectionOptions(blocks), [blocks]);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [activeDoc, setActiveDoc] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const docRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const totals = useMemo(() => {
    let docCount = 0;
    let proposed = 0;
    const sections = new Set<string>();
    for (const group of tree) {
      for (const doc of group.docs) {
        docCount += 1;
        proposed += doc.proposedCount;
        for (const p of doc.placements) sections.add(p.blockId);
      }
    }
    return { docCount, proposed, sectionCount: sections.size };
  }, [tree]);

  const matchPlacement = (p: Placement) => {
    if (statusFilter === "review") return p.source.status === "proposed";
    if (statusFilter === "confirmed") return p.source.status !== "proposed";
    return true;
  };

  // Apply search (document name) + status filter (placement level).
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tree
      .map((group) => ({
        ...group,
        docs: group.docs
          .filter((doc) => (q ? doc.dataSource.toLowerCase().includes(q) : true))
          .map((doc) => ({ doc, visible: doc.placements.filter(matchPlacement) }))
          .filter((entry) => entry.visible.length > 0),
      }))
      .filter((group) => group.docs.length > 0);
  }, [tree, query, statusFilter]);

  const visibleDocIds = useMemo(
    () => filtered.flatMap((group) => group.docs.map((d) => d.doc.dataSource)),
    [filtered],
  );

  const hasAnyData = tree.length > 0;
  const allCollapsed =
    visibleDocIds.length > 0 && visibleDocIds.every((id) => collapsed.has(id));

  // Scroll-spy: highlight the document nearest the top of the scroll area.
  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const top = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        const id = top?.target.getAttribute("data-doc");
        if (id) setActiveDoc(id);
      },
      { root, rootMargin: "0px 0px -65% 0px", threshold: 0 },
    );
    for (const el of Object.values(docRefs.current)) if (el) observer.observe(el);
    return () => observer.disconnect();
  }, [filtered]);

  const jumpTo = (dataSource: string) => {
    setCollapsed((prev) => {
      if (!prev.has(dataSource)) return prev;
      const next = new Set(prev);
      next.delete(dataSource);
      return next;
    });
    setActiveDoc(dataSource);
    requestAnimationFrame(() => {
      docRefs.current[dataSource]?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const toggleCollapse = (dataSource: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(dataSource)) next.delete(dataSource);
      else next.add(dataSource);
      return next;
    });

  const toggleCollapseAll = () =>
    setCollapsed(allCollapsed ? new Set() : new Set(visibleDocIds));

  return (
    <div className="flex h-full min-h-0">
      {/* Left: document index rail */}
      <aside className="hidden w-[250px] shrink-0 flex-col overflow-y-auto border-r border-[#d4ced3] bg-[#fafafa] md:flex">
        <div className="sticky top-0 z-10 border-b border-[#d4ced3] bg-[#fafafa] px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9e9e9e]">
            Documents
          </p>
          <p className="mt-0.5 text-[13px] font-medium text-[#302f2f]">
            {totals.docCount} sources · {totals.sectionCount} sections
          </p>
          {totals.proposed > 0 && (
            <p className="mt-0.5 text-[12px] text-[#9a6700]">{totals.proposed} need review</p>
          )}
        </div>
        <nav className="px-2 py-2">
          {filtered.length === 0 ? (
            <p className="px-2 py-3 text-[12px] text-[#9e9e9e]">No matches</p>
          ) : (
            filtered.map((group) => (
              <div key={group.category} className="mb-2">
                <p className="flex items-center gap-1.5 px-2 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-wide text-[#9e9e9e]">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      CATEGORY_DOT[group.category] ?? "bg-[#bdbdbd]"
                    }`}
                  />
                  {group.category}
                </p>
                {group.docs.map(({ doc }) => {
                  const isActive = activeDoc === doc.dataSource;
                  return (
                    <button
                      key={doc.dataSource}
                      type="button"
                      onClick={() => jumpTo(doc.dataSource)}
                      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors ${
                        isActive ? "bg-[#fedbda]" : "hover:bg-[#f0f0f0]"
                      }`}
                    >
                      <span className="min-w-0 flex-1 truncate text-[12.5px] text-[#302f2f]">
                        {doc.dataSource}
                      </span>
                      {doc.proposedCount > 0 && (
                        <span
                          title={`${doc.proposedCount} need review`}
                          className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#f0a020]"
                        />
                      )}
                      <span className="shrink-0 rounded-full bg-[#ececec] px-1.5 text-[11px] font-medium text-[#9e9e9e]">
                        {doc.placements.length}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </nav>
      </aside>

      {/* Right: document cards */}
      <main ref={scrollRef} className="min-w-0 flex-1 overflow-y-auto bg-white">
        <div className="mx-auto w-full max-w-[820px] px-4 py-6 sm:px-6">
          <p className="mb-4 text-[13px] text-[#9e9e9e]">
            Grouped by document. Each source appears once; the sections it feeds are nested
            below it, with page range and usage set per section.
          </p>

          {/* Toolbar */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1">
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
            <div className="flex overflow-hidden rounded-md border border-[#d4ced3]">
              {(
                [
                  { id: "all", label: "All" },
                  { id: "review", label: "Needs review" },
                  { id: "confirmed", label: "Confirmed" },
                ] as { id: StatusFilter; label: string }[]
              ).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={statusFilter === option.id}
                  onClick={() => setStatusFilter(option.id)}
                  className={`px-3 py-1.5 text-[13px] font-medium transition-colors ${
                    statusFilter === option.id
                      ? "bg-[#fedbda] text-[#302f2f]"
                      : "bg-white text-[#636161] hover:bg-[#fafafa]"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {visibleDocIds.length > 0 && (
              <button
                type="button"
                onClick={toggleCollapseAll}
                className="rounded-md border border-[#d4ced3] bg-white px-3 py-1.5 text-[13px] font-medium text-[#636161] hover:bg-[#fafafa]"
              >
                {allCollapsed ? "Expand all" : "Collapse all"}
              </button>
            )}
          </div>

          {!hasAnyData ? (
            <div className="rounded-lg border border-[#d4ced3] bg-white px-4 py-10 text-center text-[13px] text-[#9e9e9e]">
              No documents mapped yet.
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-lg border border-[#d4ced3] bg-white px-4 py-10 text-center text-[13px] text-[#9e9e9e]">
              No documents match the current filter.
            </div>
          ) : (
            filtered.map((group) => (
              <section key={group.category} className="mb-7 last:mb-0">
                {/* Type group label */}
                <div className="mb-2 flex items-center gap-2 px-0.5">
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                      CATEGORY_DOT[group.category] ?? "bg-[#bdbdbd]"
                    }`}
                  />
                  <h2 className="text-[12px] font-semibold uppercase tracking-wide text-[#757575]">
                    {group.category}
                  </h2>
                  <span className="text-[11px] text-[#b0b0b0]">
                    {group.docs.length} document{group.docs.length === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="space-y-3">
                  {group.docs.map(({ doc, visible }) => (
                    <DocCard
                      key={doc.dataSource}
                      cardRef={(el) => {
                        docRefs.current[doc.dataSource] = el;
                      }}
                      doc={doc}
                      visiblePlacements={visible}
                      collapsed={collapsed.has(doc.dataSource)}
                      onToggleCollapse={() => toggleCollapse(doc.dataSource)}
                      tracedSource={tracedSource}
                      sectionOptions={sectionOptions}
                      onTraceSource={onTraceSource}
                      onUpdateSource={onUpdateSource}
                      onRemoveSource={onRemoveSource}
                      onMapDataSource={onMapDataSource}
                      onConfirmAll={() => onConfirmAllForDataSource(doc.dataSource)}
                    />
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </main>
    </div>
  );
}

function DocCard({
  cardRef,
  doc,
  visiblePlacements,
  collapsed,
  onToggleCollapse,
  tracedSource,
  sectionOptions,
  onTraceSource,
  onUpdateSource,
  onRemoveSource,
  onMapDataSource,
  onConfirmAll,
}: {
  cardRef: (el: HTMLDivElement | null) => void;
  doc: DocNode;
  visiblePlacements: Placement[];
  collapsed: boolean;
  onToggleCollapse: () => void;
  tracedSource: VariantProps["tracedSource"];
  sectionOptions: { ids: string[]; label: Map<string, string> };
  onTraceSource?: (blockId: string, sourceId: string) => void;
  onUpdateSource: (blockId: string, source: DataSourceRoadmapSource) => void;
  onRemoveSource: (blockId: string, sourceId: string) => void;
  onMapDataSource: (blockId: string, dataSource: string, role?: SourceRole) => void;
  onConfirmAll: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const update = HAS_UPDATE[doc.dataSource];

  const previewDoc = () => {
    const first = doc.placements[0];
    if (first && onTraceSource) onTraceSource(first.blockId, first.source.id);
  };

  return (
    <div
      ref={cardRef}
      data-doc={doc.dataSource}
      className="scroll-mt-3 overflow-hidden rounded-lg border border-[#d4ced3] bg-white"
    >
      {/* Card header: the document (parent of the sections it feeds) */}
      <div
        className={`flex flex-wrap items-center gap-x-2 gap-y-2 px-3 py-3 ${
          collapsed ? "" : "border-b border-[#d4ced3]"
        }`}
      >
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand document" : "Collapse document"}
          className="shrink-0 rounded p-0.5 text-[#9e9e9e] hover:bg-[#f0f0f0] hover:text-[#302f2f]"
        >
          <ChevronDown
            size={16}
            className={`transition-transform ${collapsed ? "-rotate-90" : ""}`}
          />
        </button>
        <FileText size={15} className="shrink-0 text-[#9e9e9e]" />
        <button
          type="button"
          onClick={previewDoc}
          title="Preview source"
          className="min-w-0 flex-1 truncate text-left text-[14px] font-semibold text-[#302f2f] hover:text-[#ff4e49] hover:underline"
        >
          {doc.dataSource}
        </button>

        <div className="flex flex-wrap items-center gap-2 sm:ml-auto sm:shrink-0">
          <span className="text-[12px] text-[#9e9e9e]">
            {doc.placements.length} section{doc.placements.length === 1 ? "" : "s"}
          </span>
          {doc.proposedCount > 0 && (
            <span className="rounded-full bg-[#fff3cd] px-2 py-0.5 text-[11px] font-semibold text-[#9a6700]">
              {doc.proposedCount} need review
            </span>
          )}
          {doc.overrideCount > 0 && (
            <span
              title={`${doc.overrideCount} section(s) differ from the default usage${
                doc.defaultUsage ? ` (${roleLabel(doc.defaultUsage)})` : ""
              }`}
              className="rounded-full border border-[#e0d4ff] bg-[#f3eeff] px-2 py-0.5 text-[11px] font-medium text-[#6b4ed6]"
            >
              {doc.overrideCount} off-default
            </span>
          )}
        </div>
      </div>

      {!collapsed && (
        <>
          {/* Mocked version-change affordance */}
          {update && (
            <div className="flex items-center gap-2 border-b border-[#d4ced3] bg-[#eef3ff] px-4 py-2 text-[12px]">
              <RefreshCw size={13} className="shrink-0 text-[#2b5bd7]" />
              <span className="min-w-0 flex-1 text-[#2b5bd7]">
                Update available ({update}) — review {doc.placements.length} affected section
                {doc.placements.length === 1 ? "" : "s"}
              </span>
              <button
                type="button"
                onClick={previewDoc}
                className="shrink-0 rounded border border-[#bcd0ff] bg-white px-2 py-0.5 font-medium text-[#2b5bd7] hover:bg-[#e0ebff]"
              >
                Review
              </button>
            </div>
          )}

          {/* Card body: the sections this document feeds */}
          <div className="px-3 py-3 sm:px-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9e9e9e]">
                Feeds {doc.placements.length} section{doc.placements.length === 1 ? "" : "s"}
              </p>
              {doc.proposedCount > 0 && (
                <button
                  type="button"
                  onClick={onConfirmAll}
                  className="rounded-md border border-[#d4ced3] px-2 py-1 text-[12px] font-medium text-[#636161] hover:border-[#1a8a4a]/40 hover:bg-[#e6f6ec] hover:text-[#1a8a4a]"
                >
                  Confirm all
                </button>
              )}
            </div>

            {/* Nesting spine conveys these sections belong to the document above. */}
            <div className="ml-1.5 space-y-2 border-l-2 border-[#ededed] pl-3">
              {visiblePlacements.map((placement) => (
                <PlacementRow
                  key={placement.source.id}
                  placement={placement}
                  defaultUsage={doc.defaultUsage}
                  isTraced={
                    tracedSource?.blockId === placement.blockId &&
                    tracedSource?.sourceId === placement.source.id
                  }
                  onChange={(next) => onUpdateSource(placement.blockId, next)}
                  onTrace={
                    onTraceSource
                      ? () => onTraceSource(placement.blockId, placement.source.id)
                      : undefined
                  }
                  onRemove={() => onRemoveSource(placement.blockId, placement.source.id)}
                />
              ))}

              {adding ? (
                <div className="rounded-md border border-[#d4ced3] bg-[#fbfbfb] p-2.5">
                  <div className="mb-1.5 flex items-center justify-between">
                    <p className="text-[12px] font-medium text-[#636161]">Map to a section</p>
                    <button
                      type="button"
                      onClick={() => setAdding(false)}
                      aria-label="Cancel"
                      className="rounded p-0.5 text-[#9e9e9e] hover:bg-[#ececec] hover:text-[#302f2f]"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <PillOptionPicker
                    value=""
                    options={sectionOptions.ids}
                    getLabel={(id) => sectionOptions.label.get(id) ?? id}
                    searchThreshold={6}
                    searchPlaceholder="Search sections"
                    onSelect={(blockId) => {
                      onMapDataSource(blockId, doc.dataSource, doc.defaultUsage ?? undefined);
                      setAdding(false);
                    }}
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAdding(true)}
                  className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-[#d4ced3] py-2 text-[13px] font-medium text-[#636161] transition-colors hover:border-[#ff4e49]/40 hover:bg-[#fffafa] hover:text-[#302f2f]"
                >
                  <Plus size={14} /> Add to section
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

type ActiveField = "pages" | "usage" | null;

function PlacementRow({
  placement,
  defaultUsage,
  isTraced,
  onChange,
  onTrace,
  onRemove,
}: {
  placement: Placement;
  defaultUsage: SourceRole | null;
  isTraced: boolean;
  onChange: (next: DataSourceRoadmapSource) => void;
  onTrace?: () => void;
  onRemove: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<ActiveField>(null);
  const source = placement.source;
  const isProposed = source.status === "proposed";

  useEffect(() => {
    if (!active) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setActive(null);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [active]);

  const toggle = (field: ActiveField) =>
    setActive((current) => (current === field ? null : field));

  return (
    <div
      data-source-card=""
      ref={rootRef}
      className={`rounded-md border bg-white ${
        isTraced
          ? "border-[#ff4e49]"
          : isProposed
            ? "border-dashed border-[#c0b8be]"
            : "border-[#d4ced3]"
      }`}
    >
      <div className="flex items-center gap-1.5 px-2.5 py-2">
        {/* Section + heading context lead */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[13px] font-medium text-[#302f2f]">
              {placement.blockTitle}
            </span>
            {isProposed && (
              <span className="shrink-0 rounded bg-[#fff3cd] px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#9a6700]">
                Proposed
              </span>
            )}
          </div>
          {placement.headingLabel && (
            <span className="block truncate text-[11px] text-[#9e9e9e]">
              {placement.headingLabel}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => toggle("pages")}
          className={`shrink-0 max-w-[34%] truncate rounded border px-2 py-1 text-[12px] transition-colors ${
            active === "pages"
              ? "border-[#ff4e49] bg-[#fedbda] font-medium text-[#302f2f]"
              : "border-[#d4ced3] bg-white text-[#454545] hover:border-[#bdbdbd]"
          }`}
        >
          {source.referenceKey || "Pages…"}
        </button>

        {/* Usage tag + override marker */}
        <button
          type="button"
          onClick={() => toggle("usage")}
          title={
            placement.isOverride && defaultUsage
              ? `Off default: section uses ${
                  source.role ? roleLabel(source.role) : "—"
                }, default is ${roleLabel(defaultUsage)}`
              : "Set usage"
          }
          className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors ${
            active === "usage"
              ? "border-[#ff4e49] bg-[#fedbda] text-[#302f2f]"
              : source.role
                ? ROLE_BADGE[source.role]
                : "border-dashed border-[#c0b8be] bg-white text-[#9e9e9e]"
          }`}
        >
          {source.role ? roleLabel(source.role) : "Set usage"}
          {placement.isOverride && <span className="ml-1 text-[#6b4ed6]">*</span>}
        </button>

        {isProposed && (
          <button
            type="button"
            onClick={() => onChange({ ...source, status: "confirmed" })}
            aria-label="Confirm placement"
            title="Confirm placement"
            className="shrink-0 rounded p-1 text-[#1a8a4a] hover:bg-[#e6f6ec]"
          >
            <Check size={14} strokeWidth={2.25} />
          </button>
        )}
        {onTrace && (
          <button
            type="button"
            onClick={onTrace}
            aria-label="Trace to source"
            title="Trace to source"
            className="shrink-0 rounded p-1 text-[#9e9e9e] hover:bg-[#fedbda] hover:text-[#302f2f]"
          >
            <FileSearch size={14} strokeWidth={1.75} />
          </button>
        )}
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove this section mapping"
          title="Remove this section mapping (does not delete the document)"
          className="shrink-0 rounded p-1 text-[#9e9e9e] hover:bg-[#fff0f0] hover:text-[#ff4e49]"
        >
          <X size={14} strokeWidth={1.75} />
        </button>
      </div>

      {active && (
        <div className="border-t border-[#d4ced3] px-2.5 py-2.5">
          {active === "pages" && (
            <PillOptionPicker
              value={source.referenceKey}
              options={getReferenceKeysForDataSource(source.dataSource)}
              onSelect={(referenceKey) => {
                onChange(
                  enrichDataSourceSource({ ...source, referenceKey, sectionName: undefined }),
                );
                setActive(null);
              }}
            />
          )}
          {active === "usage" && (
            <div className="flex flex-wrap gap-1.5">
              {SOURCE_ROLES.map((option) => {
                const selected = source.role === option;
                return (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      onChange({ ...source, role: option });
                      setActive(null);
                    }}
                    className={`rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors ${
                      selected
                        ? ROLE_BADGE[option]
                        : "border-[#d4ced3] bg-white text-[#636161] hover:bg-[#fafafa]"
                    }`}
                  >
                    {roleLabel(option)}
                    {defaultUsage === option && (
                      <span className="ml-1 text-[10px] text-[#9e9e9e]">default</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
