import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronRight,
  FileSearch,
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
import { CATEGORY_DOT, ROLE_BADGE, effectiveSourceRole, roleLabel, type VariantProps } from "./types";

const HAS_UPDATE: Record<string, string> = {
  "247HV101 Protocol Version 3": "v4",
};

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
 * V6 — Source view. Document-centric file tree: category → document → section placements.
 */
export function SourceViewVariant({
  blocks,
  tracedSource,
  onTraceSource,
  onUpdateSource,
  onRemoveSource,
  onMapDataSource,
}: VariantProps & {
  onMapDataSource: (blockId: string, dataSource: string, role?: SourceRole) => void;
}) {
  const tree = useMemo(() => buildSourceTree(blocks), [blocks]);
  const sectionOptions = useMemo(() => buildSectionOptions(blocks), [blocks]);

  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tree
      .map((group) => ({
        ...group,
        docs: group.docs
          .filter((doc) => (q ? doc.dataSource.toLowerCase().includes(q) : true))
          .map((doc) => ({ doc, visible: doc.placements }))
          .filter((entry) => entry.visible.length > 0),
      }))
      .filter((group) => group.docs.length > 0);
  }, [tree, query]);

  const visibleDocIds = useMemo(
    () => filtered.flatMap((group) => group.docs.map((d) => d.doc.dataSource)),
    [filtered],
  );

  const hasAnyData = tree.length > 0;
  const allCollapsed =
    visibleDocIds.length > 0 && visibleDocIds.every((id) => collapsed.has(id));

  const toggleCollapse = (dataSource: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(dataSource)) next.delete(dataSource);
      else next.add(dataSource);
      return next;
    });

  const toggleCollapseAll = () =>
    setCollapsed(allCollapsed ? new Set() : new Set(visibleDocIds));

  const docCount = filtered.reduce((n, g) => n + g.docs.length, 0);

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#fafafa]">
      <header className="shrink-0 border-b border-[#e4e0e3] bg-white px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-[15px] font-semibold text-[#302f2f]">Sources</h1>
            <p className="text-[12px] text-[#9e9e9e]">
              {docCount} document{docCount === 1 ? "" : "s"} · grouped by type
            </p>
          </div>
          <div className="relative w-full min-w-[180px] sm:w-56">
            <Search
              size={14}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#bdbdbd]"
            />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter documents…"
              className="w-full rounded-md border border-[#e4e0e3] bg-[#fafafa] py-1.5 pl-8 pr-2 text-[13px] text-[#302f2f] placeholder:text-[#bdbdbd] focus:border-[#d4ced3] focus:bg-white focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-1">
            {visibleDocIds.length > 0 && (
              <button
                type="button"
                onClick={toggleCollapseAll}
                className="ml-1 rounded-md px-2.5 py-1 text-[12px] font-medium text-[#636161] hover:bg-[#f0f0f0]"
              >
                {allCollapsed ? "Expand all" : "Collapse all"}
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-4xl">
          {!hasAnyData ? (
            <p className="py-12 text-center text-[13px] text-[#9e9e9e]">No documents mapped yet.</p>
          ) : filtered.length === 0 ? (
            <p className="py-12 text-center text-[13px] text-[#9e9e9e]">
              No documents match the current filter.
            </p>
          ) : (
            <div className="rounded-lg border border-[#e4e0e3] bg-white py-1">
              {filtered.map((group, groupIndex) => (
                <section key={group.category} className={groupIndex > 0 ? "mt-1 border-t border-[#f0f0f0]" : ""}>
                  <div className="flex items-center gap-2 px-3 py-2">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${
                        CATEGORY_DOT[group.category] ?? "bg-[#bdbdbd]"
                      }`}
                    />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#9e9e9e]">
                      {group.category}
                    </span>
                    <span className="text-[11px] text-[#c8c8c8]">{group.docs.length}</span>
                  </div>

                  {group.docs.map(({ doc, visible }) => (
                    <TreeDocument
                      key={doc.dataSource}
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
                    />
                  ))}
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TreeDocument({
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
}: {
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
}) {
  const [adding, setAdding] = useState(false);
  const update = HAS_UPDATE[doc.dataSource];

  const previewDoc = () => {
    const first = doc.placements[0];
    if (first && onTraceSource) onTraceSource(first.blockId, first.source.id);
  };

  return (
    <div className="select-none">
      <div className="group/doc flex items-center gap-1 px-2 py-1 hover:bg-[#fafafa]">
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand" : "Collapse"}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-[#9e9e9e] hover:bg-[#f0f0f0] hover:text-[#302f2f]"
        >
          <ChevronRight
            size={14}
            className={`transition-transform ${collapsed ? "" : "rotate-90"}`}
          />
        </button>
        <button
          type="button"
          onClick={previewDoc}
          className="min-w-0 flex-1 truncate text-left text-[13px] font-medium text-[#302f2f] hover:text-[#ff4e49]"
        >
          {doc.dataSource}
        </button>
        <span className="shrink-0 text-[11px] tabular-nums text-[#bdbdbd]">
          {doc.placements.length}
        </span>
      </div>

      {!collapsed && (
        <div className="ml-3 border-l border-[#ececec] pb-1 pl-2">
          {update && (
            <div className="mb-1 flex items-center gap-2 rounded-md bg-[#f5f8ff] px-2.5 py-1.5 text-[11px] text-[#2b5bd7]">
              <RefreshCw size={12} className="shrink-0" />
              <span className="min-w-0 flex-1 truncate">Update available ({update})</span>
              <button
                type="button"
                onClick={previewDoc}
                className="shrink-0 font-medium hover:underline"
              >
                Review
              </button>
            </div>
          )}

          {visiblePlacements.map((placement) => (
            <PlacementLeaf
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
            <div className="my-1 rounded-md border border-[#e4e0e3] bg-[#fafafa] p-2">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[11px] font-medium text-[#636161]">Add to section</span>
                <button
                  type="button"
                  onClick={() => setAdding(false)}
                  aria-label="Cancel"
                  className="rounded p-0.5 text-[#9e9e9e] hover:text-[#302f2f]"
                >
                  <X size={13} />
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
              className="flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-[12px] text-[#9e9e9e] hover:bg-[#fafafa] hover:text-[#636161]"
            >
              <Plus size={13} />
              Add section
            </button>
          )}

        </div>
      )}
    </div>
  );
}

type ActiveField = "pages" | "usage" | null;

function PlacementLeaf({
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
  const usageRole = effectiveSourceRole(source);

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
      className={`group/leaf rounded-md px-2 py-1.5 hover:bg-[#fafafa] ${
        isTraced ? "bg-[#fff8f8] ring-1 ring-inset ring-[#fe9591]/40" : ""
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="w-3 shrink-0 text-[#d4d4d4]">└</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[13px] text-[#454545]">{placement.blockTitle}</span>
          </div>
          {placement.headingLabel && (
            <span className="block truncate text-[11px] text-[#bdbdbd]">{placement.headingLabel}</span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover/leaf:opacity-100">
          <button
            type="button"
            onClick={() => toggle("pages")}
            className={`max-w-[88px] truncate rounded px-1.5 py-0.5 text-[11px] ${
              active === "pages"
                ? "bg-[#fedbda] font-medium text-[#302f2f]"
                : "text-[#757575] hover:bg-[#f0f0f0]"
            }`}
          >
            {source.referenceKey || "pages"}
          </button>
          <button
            type="button"
            onClick={() => toggle("usage")}
            title={
              placement.isOverride && defaultUsage
                ? `Off default (${roleLabel(defaultUsage)})`
                : "Set usage"
            }
            className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
              active === "usage"
                ? "bg-[#fedbda] text-[#302f2f]"
                : usageRole
                  ? ROLE_BADGE[usageRole]
                  : "border border-dashed border-[#d4ced3] text-[#9e9e9e]"
            }`}
          >
            {usageRole ? roleLabel(usageRole) : "role"}
            {placement.isOverride && <span className="text-[#6b4ed6]">*</span>}
          </button>
          {onTrace && (
            <button
              type="button"
              onClick={onTrace}
              aria-label="Preview"
              className="rounded p-0.5 text-[#9e9e9e] hover:bg-[#fedbda] hover:text-[#302f2f]"
            >
              <FileSearch size={13} />
            </button>
          )}
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove"
            className="rounded p-0.5 text-[#c8c8c8] hover:bg-[#fff0f0] hover:text-[#ff4e49]"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {active && (
        <div className="ml-5 mt-2 border-l border-[#ececec] pl-3">
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
            <div className="flex flex-wrap gap-1">
              {SOURCE_ROLES.map((option) => {
                const selected = usageRole === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      onChange({ ...source, role: option });
                      setActive(null);
                    }}
                    className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                      selected
                        ? ROLE_BADGE[option]
                        : "border-[#e4e0e3] bg-white text-[#636161] hover:bg-[#fafafa]"
                    }`}
                  >
                    {roleLabel(option)}
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
