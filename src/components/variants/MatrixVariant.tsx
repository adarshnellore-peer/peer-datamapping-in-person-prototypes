import { useMemo, useRef, useState } from "react";
import { Info } from "lucide-react";
import { DataSourcePanel } from "../DataSourcePanel";
import { StudyDataSourcesList } from "../StudyDataSourcesList";
import {
  RoadmapOutlineHeader,
  RoadmapOutlineRow,
  ROADMAP_OUTLINE_COLUMN_CLASS,
  ROADMAP_OUTLINE_HEAD_CLASS,
} from "../roadmap/RoadmapOutlineRow";
import type { StudyDataSource } from "../../data/studyDataSources";
import type { RoadmapSource } from "../../data/roadmap";
import type { HeadingBlock } from "../../types";
import { buildTocFlatList, isHeadingInsertionSlot } from "../../utils/documentBlocks";
import {
  FORMAT_MATRIX_COLUMNS,
  formatRoleForFormatMatrixColumn,
  isOutlineReferenceSource,
  matrixColumnForFormatSource,
  matrixColumnForSource,
  MATRIX_COLUMNS,
  roleForMatrixColumn,
  type FormatMatrixColumnId,
  type MatrixColumnId,
  type MatrixTagRole,
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

function sourceWithColumnRole(source: RoadmapSource, role: MatrixTagRole): RoadmapSource {
  return {
    ...source,
    role,
    isReference: role === "reference" ? true : undefined,
  };
}

type MatrixColumnDef = {
  id: string;
  label: string;
  hint: string;
  dotHex: string;
  text: string;
  cellTint: string;
  cellAccent: string;
  primaryColumn?: boolean;
};

function matrixColumnsForMode(columnMode: "usage" | "format"): MatrixColumnDef[] {
  if (columnMode === "format") {
    return FORMAT_MATRIX_COLUMNS.map((col) => ({
      ...col,
      primaryColumn: col.id === "source",
    }));
  }
  return MATRIX_COLUMNS.map((col) => ({
    ...col,
    primaryColumn: col.id === "insert",
  }));
}

function columnForSource(source: RoadmapSource, columnMode: "usage" | "format"): string {
  return columnMode === "format"
    ? matrixColumnForFormatSource(source)
    : matrixColumnForSource(source);
}

function roleForColumn(colId: string, columnMode: "usage" | "format"): MatrixTagRole {
  if (columnMode === "format") {
    return formatRoleForFormatMatrixColumn(colId as FormatMatrixColumnId);
  }
  return roleForMatrixColumn(colId as MatrixColumnId);
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
  activeBlockId,
  columnMode = "usage",
  rolePickerMode = "usage",
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
  placementsByStudySourceId,
  onNavigateToPlacement,
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
  activeBlockId?: string | null;
  columnMode?: "usage" | "format";
  rolePickerMode?: "usage" | "format";
  onMapStudySourceWithRole: (
    blockId: string,
    studySourceId: string,
    role: MatrixTagRole,
  ) => void;
  onMapStudySourcesWithRole?: (
    blockId: string,
    studySourceIds: string[],
    role: MatrixTagRole,
  ) => void;
  onMapOutlineRefWithRole: (
    toBlockId: string,
    payload: OutlineRefPayload,
    role: MatrixTagRole,
  ) => void;
  onHeadingSlotDrop: (
    slotHeadingId: string,
    role: MatrixTagRole,
    payload: V2DragPayload,
  ) => void;
  onMoveSourceToMatrixCell: (
    fromBlockId: string,
    sourceId: string,
    toBlockId: string,
    role: MatrixTagRole,
  ) => void;
  usageCountByStudySourceId?: Record<string, number>;
  placementsByStudySourceId?: Record<string, import("../../utils/studySourcePlacements").StudySourcePlacement[]>;
  onNavigateToPlacement?: (placement: import("../../utils/studySourcePlacements").StudySourcePlacement) => void;
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
  const columns = useMemo(() => matrixColumnsForMode(columnMode), [columnMode]);
  const tableMinWidth = columnMode === "format" ? "min-w-[720px]" : "min-w-[960px]";

  const outlineByBlockId = useMemo(() => {
    const map = new Map<string, ReturnType<typeof buildTocFlatList>[number]>();
    for (const item of buildTocFlatList(blocks)) {
      map.set(item.id, item);
    }
    return map;
  }, [blocks]);

  const beginDrag = (event: React.DragEvent, payload: V2DragPayload) => {
    draggingRef.current = payload;
    setV2DragData(event.dataTransfer, payload);
  };

  const endDrag = () => {
    draggingRef.current = null;
    setDropTarget(null);
  };


  const sourcesInColumn = (sources: RoadmapSource[], colId: string) =>
    sources.filter((s) => columnForSource(s, columnMode) === colId);

  const roleTotals = (colId: string) =>
    blocks.reduce((n, b) => {
      if (b.type === "content") return n + sourcesInColumn(b.sources, colId).length;
      if (b.type === "heading") return n + sourcesInColumn(b.sources ?? [], colId).length;
      return n;
    }, 0);

  const dropMappedOnCell = (
    toBlockId: string,
    colId: string,
    fromBlockId: string,
    sourceId: string,
  ) => {
    const role = roleForColumn(colId, columnMode);
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
      onUpdateSource(toBlockId, sourceWithColumnRole(source, role));
    } else {
      onMoveSourceToMatrixCell(fromBlockId, sourceId, toBlockId, role);
    }
    setDropTarget(null);
  };

  const dropOnCell = (
    toBlockId: string,
    colId: string,
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
        onHeadingSlotDrop(options.headingSlotId, roleForColumn(colId, columnMode), payload);
      }
      setDropTarget(null);
      return;
    }

    if (payload?.kind === "mapped") {
      dropMappedOnCell(toBlockId, colId, payload.fromBlockId, payload.sourceId);
      return;
    }
    const studySourceIds = studySourceIdsFromPayload(payload);
    if (studySourceIds) {
      const role = roleForColumn(colId, columnMode);
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
      onMapOutlineRefWithRole(toBlockId, payload, roleForColumn(colId, columnMode));
    } else if (payload?.kind === "toc") {
      onMapOutlineRefWithRole(
        toBlockId,
        {
          kind: "outline-ref",
          sourceType: payload.sourceType,
          label: payload.label,
        },
        roleForColumn(colId, columnMode),
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
    columns.map((col) => {
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
                dragHandleAlwaysVisible={Boolean(col.primaryColumn)}
                rolePickerMode={rolePickerMode}
                artifactBlocks={blocks}
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
          <table className={`w-full ${tableMinWidth} border-separate border-spacing-0`}>
            <thead>
              <tr>
                <th className={ROADMAP_OUTLINE_HEAD_CLASS}>
                  <RoadmapOutlineHeader />
                </th>
                {columns.map((col) => (
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
                  const outline = outlineByBlockId.get(block.id);
                  const depth = outline?.kind === "heading" ? outline.depth : 0;
                  return (
                    <tr key={block.id} className="group/heading">
                      <td className={ROADMAP_OUTLINE_COLUMN_CLASS}>
                        <RoadmapOutlineRow
                          depth={depth}
                          isHeading
                          isActive={activeBlockId === block.id}
                          number={block.number}
                          title={block.title}
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
                          dragTitle="Drag content heading as evidence to another row"
                        />
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
                const outline = outlineByBlockId.get(block.id);
                const depth = outline?.kind === "content" ? outline.depth : 0;
                return (
                  <tr key={block.id} className="group">
                    <td className={ROADMAP_OUTLINE_COLUMN_CLASS}>
                      <RoadmapOutlineRow
                        depth={depth}
                        isHeading={false}
                        isActive={activeBlockId === block.id}
                        title={block.title}
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
                        dragTitle="Drag subcontent as evidence to another row"
                      />
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
              placementsByStudySourceId={placementsByStudySourceId}
              onNavigateToPlacement={onNavigateToPlacement}
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
