import { useRef, useState } from "react";
import { GripVertical, Info } from "lucide-react";
import { DataSourcePanel } from "../DataSourcePanel";
import { StudyDataSourcesList } from "../StudyDataSourcesList";
import type { StudyDataSource } from "../../data/studyDataSources";
import type { RoadmapSource, SourceRole } from "../../data/roadmap";
import type { HeadingBlock } from "../../types";
import { isHeadingInsertionSlot } from "../../utils/documentBlocks";
import {
  MATRIX_COLUMNS,
  isOutlineReferenceSource,
  matrixColumnForSource,
  roleForMatrixColumn,
  type MatrixColumnId,
  type VariantProps,
} from "./types";
import { SourcePill } from "./SourcePill";
import {
  hasV2DragType,
  LIBRARY_TRACE_BLOCK,
  readV2DragData,
  setV2DragData,
  studySourceIdsFromPayload,
  type OutlineRefPayload,
  type V2DragPayload,
} from "../../utils/v2DragPayload";

function sourceWithMatrixRole(source: RoadmapSource, role: SourceRole): RoadmapSource {
  return {
    ...source,
    role,
    isReference: role === "reference" ? true : undefined,
  };
}

function headingDragLabel(heading: HeadingBlock): string {
  return heading.number ? `${heading.number} ${heading.title}` : heading.title;
}

/**
 * V3 — Mode matrix + document library. Rows are roadmap sections; columns are
 * Primary narrative / Supporting evidence / Background reference. Drag from the library or
 * between columns to map and retag sources.
 */
export function MatrixVariant({
  blocks,
  tracedSource,
  onTraceSource,
  onUpdateSource,
  onRemoveSource,
  onMapStudySourceWithRole,
  onMapStudySourcesWithRole,
  onMapOutlineRefWithRole,
  onHeadingSlotDrop,
  onMoveSourceToMatrixCell,
  usageCountByStudySourceId,
  onStudySourceSelect,
  traceSource,
  traceSectionTitle,
  traceBlockSources,
  traceSourceId,
  tracePanelMode = "detail",
  onTraceSourceChange,
  onCloseTrace,
  onUpdateMappedSource,
}: VariantProps & {
  onMapStudySourceWithRole: (
    blockId: string,
    studySourceId: string,
    role: SourceRole,
  ) => void;
  onMapStudySourcesWithRole?: (
    blockId: string,
    studySourceIds: string[],
    role: SourceRole,
  ) => void;
  onMapOutlineRefWithRole: (
    toBlockId: string,
    payload: OutlineRefPayload,
    role: SourceRole,
  ) => void;
  onHeadingSlotDrop: (
    slotHeadingId: string,
    role: SourceRole,
    payload: V2DragPayload,
  ) => void;
  onMoveSourceToMatrixCell: (
    fromBlockId: string,
    sourceId: string,
    toBlockId: string,
    role: SourceRole,
  ) => void;
  usageCountByStudySourceId?: Record<string, number>;
  onStudySourceSelect?: (entry: StudyDataSource) => void;
  traceSource?: RoadmapSource | null;
  traceSectionTitle?: string | null;
  traceBlockSources?: RoadmapSource[];
  traceSourceId?: string | null;
  tracePanelMode?: "detail" | "list";
  onTraceSourceChange?: (sourceId: string) => void;
  onCloseTrace?: () => void;
  onUpdateMappedSource?: (source: RoadmapSource) => void;
}) {
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const draggingRef = useRef<V2DragPayload | null>(null);

  const beginDrag = (event: React.DragEvent, payload: V2DragPayload) => {
    draggingRef.current = payload;
    setV2DragData(event.dataTransfer, payload);
  };

  const endDrag = () => {
    draggingRef.current = null;
    setDropTarget(null);
  };


  const sourcesInColumn = (sources: RoadmapSource[], col: MatrixColumnId) =>
    sources.filter((s) => matrixColumnForSource(s) === col);

  const roleTotals = (col: MatrixColumnId) =>
    blocks.reduce((n, b) => {
      if (b.type === "content") return n + sourcesInColumn(b.sources, col).length;
      if (b.type === "heading") return n + sourcesInColumn(b.sources ?? [], col).length;
      return n;
    }, 0);

  const dropMappedOnCell = (
    toBlockId: string,
    col: MatrixColumnId,
    fromBlockId: string,
    sourceId: string,
  ) => {
    const role = roleForMatrixColumn(col);
    if (fromBlockId === toBlockId) {
      const block = blocks.find((b) => b.id === toBlockId);
      const sources =
        block?.type === "content"
          ? block.sources
          : block?.type === "heading"
            ? (block.sources ?? [])
            : [];
      const source = sources.find((s) => s.id === sourceId);
      if (!source) return;
      onUpdateSource(toBlockId, sourceWithMatrixRole(source, role));
    } else {
      onMoveSourceToMatrixCell(fromBlockId, sourceId, toBlockId, role);
    }
    setDropTarget(null);
  };

  const dropOnCell = (
    toBlockId: string,
    col: MatrixColumnId,
    dataTransfer: DataTransfer,
    options?: {
      rejectOutlineRef?: (payload: OutlineRefPayload) => boolean;
      headingSlotId?: string;
    },
  ) => {
    const payload = readV2DragData(dataTransfer);
    if (!payload) return;

    if (options?.headingSlotId) {
      const studySourceIds = studySourceIdsFromPayload(payload);
      if (studySourceIds || payload.kind === "mapped") {
        onHeadingSlotDrop(options.headingSlotId, roleForMatrixColumn(col), payload);
      }
      setDropTarget(null);
      return;
    }

    if (payload?.kind === "mapped") {
      dropMappedOnCell(toBlockId, col, payload.fromBlockId, payload.sourceId);
      return;
    }
    const studySourceIds = studySourceIdsFromPayload(payload);
    if (studySourceIds) {
      const role = roleForMatrixColumn(col);
      if (studySourceIds.length === 1) {
        onMapStudySourceWithRole(toBlockId, studySourceIds[0]!, role);
      } else if (onMapStudySourcesWithRole) {
        onMapStudySourcesWithRole(toBlockId, studySourceIds, role);
      } else {
        for (const studySourceId of studySourceIds) {
          onMapStudySourceWithRole(toBlockId, studySourceId, role);
        }
      }
    } else if (payload?.kind === "outline-ref") {
      if (options?.rejectOutlineRef?.(payload)) {
        setDropTarget(null);
        return;
      }
      onMapOutlineRefWithRole(toBlockId, payload, roleForMatrixColumn(col));
    } else if (payload?.kind === "toc") {
      onMapOutlineRefWithRole(
        toBlockId,
        {
          kind: "outline-ref",
          sourceType: payload.sourceType,
          label: payload.label,
        },
        roleForMatrixColumn(col),
      );
    }
    setDropTarget(null);
  };

  const handleCellDragOver = (cellId: string, event: React.DragEvent) => {
    if (!hasV2DragType(event.dataTransfer) && !draggingRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect =
      draggingRef.current?.kind === "mapped" ? "move" : "copy";
    setDropTarget(cellId);
  };

  const renderMatrixCells = (
    rowId: string,
    rowSources: RoadmapSource[],
    options?: {
      rejectOutlineRef?: (payload: OutlineRefPayload) => boolean;
      headingSlotId?: string;
      dropDisabled?: boolean;
    },
  ) =>
    MATRIX_COLUMNS.map((col) => {
      const cellId = `${rowId}|${col.id}`;
      const cellSources = sourcesInColumn(rowSources, col.id);
      const isOver = !options?.dropDisabled && dropTarget === cellId;
      const cellDropHandlers = options?.dropDisabled
        ? undefined
        : {
            onDragOver: (e: React.DragEvent) => handleCellDragOver(cellId, e),
            onDrop: (e: React.DragEvent) => {
              e.preventDefault();
              e.stopPropagation();
              dropOnCell(rowId, col.id, e.dataTransfer, {
                rejectOutlineRef: options?.rejectOutlineRef,
                headingSlotId: options?.headingSlotId,
              });
            },
          };
      return (
        <td
          key={col.id}
          className={`group/cell border-b border-r border-[#d4ced3] align-top transition-colors ${col.cellTint} ${
            isOver ? "outline outline-2 -outline-offset-2 outline-[#ff4e49]" : ""
          } ${options?.dropDisabled ? "opacity-90" : ""}`}
          {...(cellDropHandlers
            ? {
                onDragOver: cellDropHandlers.onDragOver,
                onDragLeave: () => setDropTarget((v) => (v === cellId ? null : v)),
                onDrop: cellDropHandlers.onDrop,
              }
            : {})}
        >
          <div
            className="min-h-[2.5rem] space-y-1.5 p-2"
            {...(cellDropHandlers ?? {})}
          >
            {cellSources.map((source) => (
              <SourcePill
                key={source.id}
                source={source}
                variant="v2"
                layout="matrix"
                compact
                traceOnFieldClick={Boolean(
                  onTraceSource && !isOutlineReferenceSource(source),
                )}
                dragHandleAlwaysVisible={col.id === "insert"}
                matrixCellDrop={cellDropHandlers}
                matrixDrag={{
                  onDragStart: (event) => {
                    beginDrag(event, {
                      kind: "mapped",
                      fromBlockId: rowId,
                      sourceId: source.id,
                    });
                  },
                  onDragEnd: endDrag,
                }}
                isTraced={
                  tracedSource?.blockId === rowId && tracedSource?.sourceId === source.id
                }
                onChange={(next) => onUpdateSource(rowId, next)}
                onTrace={
                  onTraceSource && !isOutlineReferenceSource(source)
                    ? () => onTraceSource(rowId, source.id)
                    : undefined
                }
                onRemove={() => onRemoveSource(rowId, source.id)}
              />
            ))}
          </div>
        </td>
      );
    });

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="flex min-h-0 flex-1">
        <div className="min-h-0 min-w-0 flex-1 overflow-auto">
          <table className="w-full min-w-[960px] border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="sticky left-0 top-0 z-30 w-[220px] border-b border-r border-[#d4ced3] bg-[#fafafa] px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-[#9e9e9e]">
                  Roadmap block
                </th>
                {MATRIX_COLUMNS.map((col) => (
                  <th
                    key={col.id}
                    className={`sticky top-0 z-20 min-w-[220px] border-b border-r border-[#d4ced3] px-2.5 py-1.5 text-left align-top ${col.cellTint} ${col.cellAccent}`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-sm"
                        style={{ background: col.dotHex }}
                        aria-hidden
                      />
                      <span className={`text-[11px] font-semibold ${col.text}`}>
                        {col.label}
                      </span>
                      <ColumnHintTooltip hint={col.hint} />
                      <span className="ml-auto rounded-full border border-[#d4ced3] bg-white px-1.5 text-[11px] font-semibold tabular-nums text-[#636161]">
                        {roleTotals(col.id)}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {blocks.map((block) => {
                if (block.type === "heading") {
                  const isInsertionSlot = isHeadingInsertionSlot(blocks, block.id);
                  return (
                    <tr key={block.id} className="group/heading">
                      <td className="sticky left-0 z-10 border-b border-r border-[#d4ced3] bg-[#ececec] px-2 py-1 align-top">
                        <div
                          draggable
                          onDragStart={(event) => {
                            beginDrag(event, {
                              kind: "outline-ref",
                              sourceType: "CONTENT",
                              label: headingDragLabel(block),
                              fromHeadingId: block.id,
                            });
                          }}
                          onDragEnd={endDrag}
                          title="Drag content heading as evidence to another row"
                          className="flex cursor-grab items-center gap-1 touch-none active:cursor-grabbing"
                        >
                          <GripVertical
                            size={12}
                            strokeWidth={1.75}
                            className="shrink-0 text-[#bdbdbd]"
                            aria-hidden
                          />
                          <span className="text-[11px] font-semibold leading-snug text-[#5c5c5c]">
                            {block.number && <span>{block.number} </span>}
                            {block.title}
                          </span>
                        </div>
                      </td>
                      {renderMatrixCells(block.id, block.sources ?? [], {
                        rejectOutlineRef: (payload) =>
                          payload.sourceType === "CONTENT" && payload.fromHeadingId === block.id,
                        headingSlotId: isInsertionSlot ? block.id : undefined,
                        dropDisabled: !isInsertionSlot,
                      })}
                    </tr>
                  );
                }
                if (block.type !== "content") return null;
                return (
                  <tr key={block.id} className="group">
                    <td className="sticky left-0 z-10 w-[220px] border-b border-r border-[#d4ced3] bg-[#f3f3f3] px-2 py-2 align-top group-hover:bg-[#ececec]">
                      <div
                        draggable
                        onDragStart={(event) => {
                          beginDrag(event, {
                            kind: "outline-ref",
                            sourceType: "SUBCONTENT",
                            label: block.title,
                            fromBlockId: block.id,
                          });
                        }}
                        onDragEnd={endDrag}
                        title="Drag subcontent as evidence to another row"
                        className="flex cursor-grab items-start gap-1 touch-none active:cursor-grabbing"
                      >
                        <GripVertical
                          size={12}
                          strokeWidth={1.75}
                          className="mt-0.5 shrink-0 text-[#bdbdbd]"
                          aria-hidden
                        />
                        <span className="text-[12px] font-semibold leading-snug text-[#302f2f]">
                          {block.title}
                        </span>
                      </div>
                    </td>
                    {renderMatrixCells(block.id, block.sources, {
                      rejectOutlineRef: (payload) => payload.fromBlockId === block.id,
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <aside
          data-datasource-panel=""
          className="flex h-full min-h-0 w-[360px] shrink-0 flex-col overflow-hidden border-l border-[#d4ced3] bg-[#fafafa]"
        >
          {traceSource && onCloseTrace ? (
            <DataSourcePanel
              embedded
              source={traceSource}
              sectionTitle={traceSectionTitle}
              initialPanelMode={tracePanelMode}
              blockSources={traceBlockSources}
              activeSourceId={traceSourceId ?? undefined}
              onSourceChange={onTraceSourceChange}
              onUpdateMappedSource={onUpdateMappedSource}
              onClose={onCloseTrace}
            />
          ) : (
            <StudyDataSourcesList
              enableMappingDrag
              usageCountByStudySourceId={usageCountByStudySourceId}
              onSelect={onStudySourceSelect ?? (() => {})}
              activeSourceId={
                tracedSource?.blockId === LIBRARY_TRACE_BLOCK
                  ? tracedSource.sourceId
                  : undefined
              }
            />
          )}
        </aside>
      </div>
    </div>
  );
}

function ColumnHintTooltip({ hint }: { hint: string }) {
  return (
    <span className="group/hint relative inline-flex shrink-0">
      <button
        type="button"
        aria-label={hint}
        className="flex h-4 w-4 items-center justify-center rounded text-[#bdbdbd] transition-colors hover:bg-black/[0.05] hover:text-[#636161] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff4e49]/30"
      >
        <Info size={12} strokeWidth={2} aria-hidden />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-[calc(100%+6px)] z-50 hidden w-56 -translate-x-1/2 rounded-md border border-[#d4ced3] bg-white px-2.5 py-2 text-[11px] leading-snug text-[#636161] shadow-[0_4px_12px_rgba(48,47,47,0.12)] group-hover/hint:block group-focus-within/hint:block"
      >
        {hint}
      </span>
    </span>
  );
}
