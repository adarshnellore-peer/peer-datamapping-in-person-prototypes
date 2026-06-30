import { useRef, useState } from "react";
import { FileSearch, Plus, X } from "lucide-react";
import type { RoadmapSource, SourceRole } from "../../data/roadmap";
import { SOURCE_ROLES } from "../../data/roadmap";
import {
  getPageRange,
  getSourceName,
  getSourceTypeTag,
} from "../../data/sourceHelpers";
import type { ContentBlockData } from "../../types";
import {
  CATEGORY_DOT,
  MAPPING_BADGE,
  ROLE_ACCENT,
  ROLE_HINT,
  mappingStatus,
  roleLabel,
  type VariantProps,
} from "./types";

type Column = SourceRole | "unassigned";

type DragRef = { blockId: string; source: RoadmapSource } | null;

/**
 * V4 — Usage matrix. Rows are roadmap sections; columns are the usage roles
 * (Primary / Supporting / Context). Each source sits in the column for how it's
 * used; drag a source between columns to change its usage. A leading
 * "Needs usage" lane only appears when some sources have no role yet, so nothing
 * gets lost. Reuses the app's category dots, role colors, and trace panel.
 */
export function MatrixVariant({
  blocks,
  tracedSource,
  onTraceSource,
  onUpdateSource,
  onRemoveSource,
  onAddSourceWithRole,
}: VariantProps & {
  onAddSourceWithRole: (blockId: string, role: SourceRole) => void;
}) {
  const dragRef = useRef<DragRef>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const contentBlocks = blocks.filter(
    (b): b is ContentBlockData => b.type === "content",
  );

  const hasUnassigned = contentBlocks.some((b) =>
    b.sources.some((s) => !s.role),
  );
  const columns: Column[] = hasUnassigned
    ? ["unassigned", ...SOURCE_ROLES]
    : [...SOURCE_ROLES];

  const sourcesInColumn = (block: ContentBlockData, col: Column) =>
    block.sources.filter((s) => (s.role ?? "unassigned") === col);

  const roleTotals = (col: Column) =>
    contentBlocks.reduce((n, b) => n + sourcesInColumn(b, col).length, 0);

  const ready = contentBlocks.filter(
    (b) => mappingStatus(b.sources) === "ready",
  ).length;
  const needs = contentBlocks.filter((b) => {
    const s = mappingStatus(b.sources);
    return s === "empty" || s === "needsPrimary";
  }).length;

  const moveTo = (block: ContentBlockData, col: Column) => {
    const drag = dragRef.current;
    dragRef.current = null;
    setDropTarget(null);
    if (!drag || drag.blockId !== block.id) return;
    onUpdateSource(block.id, {
      ...drag.source,
      role: col === "unassigned" ? undefined : col,
    });
  };

  const colHead = (col: Column) => {
    if (col === "unassigned") {
      return {
        label: "Needs usage",
        hint: "No usage set \u2014 drag into a column.",
        text: "text-[#9a6700]",
        dotHex: "#d0a000",
      };
    }
    const accent = ROLE_ACCENT[col];
    return {
      label: roleLabel(col),
      hint: ROLE_HINT[col],
      text: accent.text,
      dotHex: accent.dotHex,
    };
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      {/* Toolbar with coverage stats */}
      <div className="flex shrink-0 flex-wrap items-center gap-4 border-b border-[#d4ced3] bg-white px-5 py-3">
        <div className="min-w-0">
          <div className="text-[14px] font-semibold text-[#302f2f]">
            Source mapping by usage
          </div>
          <div className="mt-0.5 text-[12px] text-[#9e9e9e]">
            Each row is a section. Drag a source between columns to change how
            it's used; click + to add one.
          </div>
        </div>
        <div className="ml-auto flex gap-2">
          <Stat value={contentBlocks.length} label="Sections" />
          <Stat value={ready} label="Ready" valueClass="text-[#1a8a4a]" />
          <Stat value={needs} label="Needs work" valueClass="text-[#b3261e]" />
        </div>
      </div>

      {/* Grid */}
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[920px] border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-30 w-[300px] border-b border-r border-[#e4e4e4] bg-[#fafafa] px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-[#9e9e9e]">
                Section
              </th>
              {columns.map((col) => {
                const h = colHead(col);
                return (
                  <th
                    key={col}
                    className="sticky top-0 z-20 border-b border-r border-[#e4e4e4] bg-[#fafafa] px-3 py-2 text-left align-top"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-sm"
                        style={{ background: h.dotHex }}
                        aria-hidden
                      />
                      <span className={`text-[12px] font-semibold ${h.text}`}>
                        {h.label}
                      </span>
                      <span className="ml-auto rounded-full border border-[#e4e4e4] bg-white px-1.5 text-[11px] font-semibold tabular-nums text-[#636161]">
                        {roleTotals(col)}
                      </span>
                    </div>
                    <div className="mt-0.5 pl-[18px] text-[11px] leading-tight text-[#9e9e9e]">
                      {h.hint}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {blocks.map((block) => {
              if (block.type === "heading") {
                return (
                  <tr key={block.id}>
                    <td
                      colSpan={columns.length + 1}
                      className="sticky left-0 z-10 border-b border-[#ececec] bg-[#f3f3f3] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#757575]"
                    >
                      {block.number && <span>{block.number} </span>}
                      {block.title}
                    </td>
                  </tr>
                );
              }
              if (block.type !== "content") return null;
              const status = MAPPING_BADGE[mappingStatus(block.sources)];
              return (
                <tr key={block.id} className="group">
                  <td className="sticky left-0 z-10 w-[300px] border-b border-r border-[#e4e4e4] bg-white px-4 py-3 align-top group-hover:bg-[#fcfcfc]">
                    <div className="text-[13.5px] font-semibold leading-snug text-[#302f2f]">
                      {block.title}
                    </div>
                    {block.prompt && (
                      <div className="mt-1 line-clamp-2 text-[12px] leading-snug text-[#757575]">
                        {block.prompt}
                      </div>
                    )}
                    <div className="mt-2">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${status.badge}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                        {status.label}
                      </span>
                    </div>
                  </td>
                  {columns.map((col) => {
                    const cellId = `${block.id}|${col}`;
                    const cellSources = sourcesInColumn(block, col);
                    const tint =
                      col === "unassigned" ? "bg-[#fbfbfb]" : ROLE_ACCENT[col].cellTint;
                    const isOver = dropTarget === cellId;
                    return (
                      <td
                        key={col}
                        className={`border-b border-r border-[#e4e4e4] align-top transition-colors ${tint} ${
                          isOver ? "outline outline-2 -outline-offset-2 outline-[#ff4e49]" : ""
                        }`}
                        onDragOver={(e) => {
                          if (dragRef.current?.blockId === block.id) {
                            e.preventDefault();
                            setDropTarget(cellId);
                          }
                        }}
                        onDragLeave={() =>
                          setDropTarget((v) => (v === cellId ? null : v))
                        }
                        onDrop={(e) => {
                          e.preventDefault();
                          moveTo(block, col);
                        }}
                      >
                        <div className="space-y-1.5 p-2">
                          {cellSources.map((source) => (
                            <MatrixPill
                              key={source.id}
                              source={source}
                              isTraced={
                                tracedSource?.blockId === block.id &&
                                tracedSource?.sourceId === source.id
                              }
                              onDragStart={() => {
                                dragRef.current = { blockId: block.id, source };
                              }}
                              onDragEnd={() => {
                                dragRef.current = null;
                                setDropTarget(null);
                              }}
                              onTrace={
                                onTraceSource
                                  ? () => onTraceSource(block.id, source.id)
                                  : undefined
                              }
                              onRemove={() => onRemoveSource(block.id, source.id)}
                            />
                          ))}
                          {col !== "unassigned" && (
                            <button
                              type="button"
                              onClick={() => onAddSourceWithRole(block.id, col)}
                              className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-transparent py-1 text-[12px] text-[#9e9e9e] opacity-0 transition-all hover:border-[#d4ced3] hover:bg-white hover:text-[#302f2f] group-hover:opacity-100"
                            >
                              <Plus size={13} /> add source
                            </button>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({
  value,
  label,
  valueClass = "text-[#302f2f]",
}: {
  value: number;
  label: string;
  valueClass?: string;
}) {
  return (
    <div className="min-w-[68px] rounded-md border border-[#e4e4e4] bg-white px-3 py-1.5">
      <div className={`text-[18px] font-semibold leading-none tabular-nums ${valueClass}`}>
        {value}
      </div>
      <div className="mt-1 text-[10.5px] text-[#9e9e9e]">{label}</div>
    </div>
  );
}

function MatrixPill({
  source,
  isTraced,
  onDragStart,
  onDragEnd,
  onTrace,
  onRemove,
}: {
  source: RoadmapSource;
  isTraced: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onTrace?: () => void;
  onRemove: () => void;
}) {
  const tag = getSourceTypeTag(source);
  const dot = CATEGORY_DOT[tag] ?? "bg-[#bdbdbd]";
  const pages = getPageRange(source);
  const isProposed = source.status === "proposed";

  return (
    <div
      data-source-card=""
      draggable
      onDragStart={(e) => {
        onDragStart();
        e.dataTransfer.effectAllowed = "move";
      }}
      onDragEnd={onDragEnd}
      title={`${getSourceName(source)} \u00b7 ${pages}`}
      className={`group/pill flex cursor-grab items-center gap-1.5 rounded-md border bg-white px-2 py-1 active:cursor-grabbing ${
        isTraced
          ? "border-[#ff4e49]"
          : isProposed
            ? "border-dashed border-[#c0b8be]"
            : "border-[#d4ced3]"
      }`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} aria-hidden />
      <span className="min-w-0 flex-1 truncate text-[12px] text-[#302f2f]">
        {getSourceName(source)}
      </span>
      {pages && pages !== "—" && (
        <span className="shrink-0 font-mono text-[10.5px] tabular-nums text-[#9e9e9e]">
          {pages}
        </span>
      )}
      {onTrace && (
        <button
          type="button"
          onClick={onTrace}
          aria-label="Trace to source"
          title="Trace to source"
          className="shrink-0 rounded p-0.5 text-[#bdbdbd] opacity-0 transition-opacity hover:bg-[#fedbda] hover:text-[#302f2f] group-hover/pill:opacity-100"
        >
          <FileSearch size={13} strokeWidth={1.75} />
        </button>
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove source"
        title="Remove source"
        className="shrink-0 rounded p-0.5 text-[#bdbdbd] opacity-0 transition-opacity hover:bg-[#fff0f0] hover:text-[#ff4e49] group-hover/pill:opacity-100"
      >
        <X size={13} strokeWidth={1.75} />
      </button>
    </div>
  );
}
