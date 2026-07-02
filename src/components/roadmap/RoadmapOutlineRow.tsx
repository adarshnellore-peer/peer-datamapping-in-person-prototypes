import { useRef, type CSSProperties, type DragEvent, type MouseEvent, type PointerEvent, type ReactNode } from "react";
import { BlockOutputTypeIcon } from "./BlockOutputTypeIcon";
import { OutlineChevronButton } from "./OutlineChevronButton";

export const ROADMAP_OUTLINE_COLUMN_WIDTH = 220;

export const ROADMAP_OUTLINE_COLUMN_CLASS = "peer-outline-column";

export const ROADMAP_OUTLINE_HEAD_CLASS = "peer-outline-head";

export function RoadmapOutlineHeader({ title = "Outline" }: { title?: string }) {
  return <span className="peer-library-eyebrow">{title}</span>;
}

export function RoadmapOutlineRow({
  depth,
  isHeading,
  isActive = false,
  isSelected = false,
  number,
  title,
  hasChevron = false,
  isCollapsed,
  onToggleCollapse,
  onDragStart,
  onDragEnd,
  onReorderPointerDown,
  onRowClick,
  dragTitle,
  onNavigate,
  actions,
  compact = false,
  isDragging = false,
  outputType,
}: {
  depth: number;
  isHeading: boolean;
  isActive?: boolean;
  isSelected?: boolean;
  isDragging?: boolean;
  number?: string;
  title?: ReactNode;
  hasChevron?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onDragStart?: (event: DragEvent) => void;
  onDragEnd?: () => void;
  onReorderPointerDown?: (event: PointerEvent<HTMLElement>) => void;
  onRowClick?: (event: MouseEvent) => void;
  dragTitle?: string;
  onNavigate?: () => void;
  actions?: ReactNode;
  compact?: boolean;
  outputType?: string;
}) {
  const rowReorderOnly = !onDragStart && !!onReorderPointerDown;
  const rowDraggable = Boolean(onDragStart) || rowReorderOnly;
  const isInteractive = Boolean(onNavigate || onRowClick);

  const clickRef = useRef<{ x: number; y: number; moved: boolean } | null>(null);

  const handleTitlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    clickRef.current = { x: event.clientX, y: event.clientY, moved: false };
  };

  const handleTitlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const state = clickRef.current;
    if (!state || state.moved) return;
    if (Math.hypot(event.clientX - state.x, event.clientY - state.y) > 5) {
      state.moved = true;
    }
  };

  const handleTitleClick = (event: MouseEvent<HTMLButtonElement>) => {
    const state = clickRef.current;
    clickRef.current = null;
    if (state?.moved) return;
    event.stopPropagation();
    if (onRowClick) {
      onRowClick(event);
      return;
    }
    onNavigate?.();
  };

  const handleTitleDoubleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (onRowClick && onNavigate) onNavigate();
  };

  const handleRowPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!rowReorderOnly) return;
    if ((event.target as Element).closest("[data-ol-no-drag]")) return;
    onReorderPointerDown?.(event);
  };

  const handleRowDragStart = (event: DragEvent<HTMLDivElement>) => {
    if ((event.target as Element).closest("[data-ol-no-drag]")) {
      event.preventDefault();
      return;
    }
    onDragStart?.(event);
  };

  return (
    <div
      className={`peer-ol-item ${isHeading ? "peer-ol-item--heading" : "peer-ol-item--content"} ${
        compact ? "peer-ol-item--compact" : ""
      }`}
      style={{ "--ol-depth": depth } as CSSProperties}
      data-depth={depth}
    >
      <div
        className={[
          "group/ol-row",
          "peer-ol-row",
          isHeading ? "peer-ol-row--heading" : "peer-ol-row--content",
          compact ? "peer-ol-row--compact" : "",
          rowDraggable ? "peer-ol-row--draggable" : "",
          isInteractive ? "peer-ol-row--interactive" : "",
          isActive ? "is-active" : "",
          isSelected ? "is-selected" : "",
          isDragging ? "is-dragging" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        draggable={rowDraggable && Boolean(onDragStart)}
        onPointerDown={handleRowPointerDown}
        onDragStart={handleRowDragStart}
        onDragEnd={onDragEnd}
        title={
          rowReorderOnly
            ? "Drag to reorder"
            : dragTitle ?? (onDragStart ? "Drag to reorder or map to section" : undefined)
        }
      >
        <div className="peer-ol-chevron-slot" data-ol-no-drag>
          {hasChevron ? (
            <OutlineChevronButton
              isCollapsed={isCollapsed}
              onToggle={onToggleCollapse}
            />
          ) : null}
        </div>

        <span className="peer-ol-leading" aria-hidden>
          {!isHeading && outputType ? (
            <BlockOutputTypeIcon outputType={outputType} size="sm" />
          ) : null}
        </span>

        <button
          type="button"
          className="peer-ol-title-btn"
          draggable={false}
          data-ol-no-drag
          disabled={!isInteractive}
          onPointerDown={isInteractive ? handleTitlePointerDown : undefined}
          onPointerMove={isInteractive ? handleTitlePointerMove : undefined}
          onPointerCancel={() => {
            clickRef.current = null;
          }}
          onClick={isInteractive ? handleTitleClick : undefined}
          onDoubleClick={isInteractive ? handleTitleDoubleClick : undefined}
        >
          <span className="peer-ol-label">
            {number ? <span className="peer-ol-num">{number}</span> : null}
            <span
              className={`peer-ol-title ${
                isHeading ? "peer-ol-title--heading" : "peer-ol-title--content"
              }`}
            >
              {title}
            </span>
          </span>
        </button>

        <div className="peer-ol-actions" data-ol-no-drag>
          {actions}
        </div>
      </div>
    </div>
  );
}
