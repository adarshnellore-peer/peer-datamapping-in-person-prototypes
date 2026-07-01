import { ChevronRight } from "lucide-react";
import { useRef, type DragEvent, type PointerEvent, type ReactNode } from "react";

export const ROADMAP_OUTLINE_COLUMN_WIDTH = 220;

export const ROADMAP_OUTLINE_COLUMN_CLASS = "peer-outline-column";

export const ROADMAP_OUTLINE_HEAD_CLASS = "peer-outline-head";

export function RoadmapOutlineHeader({ title = "Outline" }: { title?: string }) {
  return (
    <span className="peer-library-eyebrow">
      {title}
    </span>
  );
}

export function roadmapOutlineLabelClass(isHeading: boolean, compact = false): string {
  if (compact) {
    return isHeading
      ? "text-[11px] font-semibold leading-snug text-[var(--peer-text)]"
      : "text-[11px] font-normal leading-snug text-[var(--peer-muted)]";
  }
  return isHeading
    ? "py-0.5 text-[12px] font-semibold leading-[1.3] text-[var(--peer-text)]"
    : "py-0.5 text-[12px] font-normal leading-[1.35] text-[var(--peer-muted)]";
}

export function RoadmapOutlineRow({
  depth,
  isHeading,
  isActive = false,
  isSelected = false,
  isIndeterminate = false,
  label,
  number,
  title,
  hasChevron = false,
  isCollapsed,
  onToggleCollapse,
  onDragStart,
  onDragEnd,
  onReorderPointerDown,
  showSelectionCheckbox = false,
  onToggleSelected,
  dragTitle,
  onNavigate,
  actions,
  compact = false,
  isDragging = false,
}: {
  depth: number;
  isHeading: boolean;
  isActive?: boolean;
  isSelected?: boolean;
  isIndeterminate?: boolean;
  isDragging?: boolean;
  /** Pre-built label; overrides number/title when set. */
  label?: ReactNode;
  number?: string;
  title?: string;
  hasChevron?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onDragStart?: (event: DragEvent) => void;
  onDragEnd?: () => void;
  onReorderPointerDown?: (event: PointerEvent<HTMLElement>) => void;
  showSelectionCheckbox?: boolean;
  onToggleSelected?: () => void;
  dragTitle?: string;
  onNavigate?: () => void;
  actions?: ReactNode;
  compact?: boolean;
}) {
  const indent = depth * 10;
  const labelContent =
    label ??
    (number ? (
      <>
        <span className="mr-1 tabular-nums text-[var(--peer-text-caption)]">{number}</span>
        {title ?? ""}
      </>
    ) : (
      (title ?? "")
    ));

  const rowReorderOnly = !onDragStart && !!onReorderPointerDown;
  const rowDraggable = Boolean(onDragStart) || rowReorderOnly;
  const labelInteractionRef = useRef<{ x: number; y: number; suppressClick: boolean } | null>(
    null,
  );

  const handleLabelPointerDown = (event: PointerEvent<HTMLSpanElement>) => {
    labelInteractionRef.current = {
      x: event.clientX,
      y: event.clientY,
      suppressClick: false,
    };
  };

  const handleLabelPointerMove = (event: PointerEvent<HTMLSpanElement>) => {
    const state = labelInteractionRef.current;
    if (!state || state.suppressClick) return;
    const dx = event.clientX - state.x;
    const dy = event.clientY - state.y;
    if (Math.hypot(dx, dy) > 6) {
      state.suppressClick = true;
    }
  };

  const handleLabelClick = () => {
    const state = labelInteractionRef.current;
    labelInteractionRef.current = null;
    if (!onNavigate || state?.suppressClick) return;
    onNavigate();
  };

  return (
    <div style={{ marginLeft: `${indent}px` }} className={compact ? "peer-outline-row" : "py-0.5"}>
      <div
        draggable={rowDraggable}
        onPointerDown={
          rowReorderOnly
            ? (event) => {
                if ((event.target as Element).closest("[data-toc-no-drag]")) return;
                onReorderPointerDown?.(event);
              }
            : undefined
        }
        onDragStart={(event) => {
          if ((event.target as Element).closest("[data-toc-no-drag]")) {
            event.preventDefault();
            return;
          }
          onDragStart?.(event);
        }}
        onDragEnd={onDragEnd}
        title={
          rowReorderOnly
            ? "Drag to reorder"
            : dragTitle ?? (onDragStart ? "Drag to reorder or map to section" : undefined)
        }
        className={`group/outline-row flex select-none items-center pr-0.5 transition-[background-color,border-color,opacity] peer-toc-card ${
          compact ? "min-h-0" : "min-h-[26px]"
        } ${rowDraggable ? "cursor-grab active:cursor-grabbing" : ""} ${
          isActive ? "is-active" : ""
        } ${isSelected ? "is-selected" : ""} ${isDragging ? "opacity-40" : ""}`}
      >
        {showSelectionCheckbox && onToggleSelected ? (
          <span
            data-toc-no-drag
            draggable={false}
            className="mr-0.5 flex shrink-0 items-center"
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={isSelected}
              ref={(el) => {
                if (el) el.indeterminate = isIndeterminate;
              }}
              onChange={onToggleSelected}
              aria-label="Select for mapping"
              className="h-3.5 w-3.5 cursor-pointer rounded border-[#c8c0c6] text-[#ff4e49] focus:ring-[#ff4e49]/25"
            />
          </span>
        ) : null}
        <button
          type="button"
          draggable={false}
          data-toc-no-drag
          aria-label={isCollapsed ? "Expand section" : "Collapse section"}
          onClick={(event) => {
            event.stopPropagation();
            onToggleCollapse?.();
          }}
          onPointerDown={(event) => event.stopPropagation()}
          className={`${compact && !hasChevron ? "hidden" : "mr-0.5 flex h-[18px] w-4 shrink-0 items-center justify-center rounded text-[#9e9e9e] transition-colors hover:bg-black/[0.06] hover:text-[#636161]"} ${
            hasChevron ? "visible" : compact ? "hidden" : "invisible pointer-events-none"
          }`}
        >
          <ChevronRight
            size={12}
            strokeWidth={2}
            className={`transition-transform ${isCollapsed ? "" : "rotate-90"}`}
          />
        </button>

        <span
          role={onNavigate ? "button" : undefined}
          tabIndex={onNavigate ? 0 : undefined}
          onPointerDown={onNavigate ? handleLabelPointerDown : undefined}
          onPointerMove={onNavigate ? handleLabelPointerMove : undefined}
          onPointerCancel={() => {
            labelInteractionRef.current = null;
          }}
          onClick={handleLabelClick}
          onKeyDown={
            onNavigate
              ? (event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onNavigate();
                  }
                }
              : undefined
          }
          className={`min-w-0 flex-1 whitespace-normal break-words text-left ${roadmapOutlineLabelClass(
            isHeading,
            compact,
          )} ${isActive ? "text-[var(--peer-text)]" : ""}`}
        >
          {labelContent}
        </span>

        {actions && (
          <div
            data-toc-no-drag
            draggable={false}
            className="flex shrink-0 items-center"
            onPointerDown={(event) => event.stopPropagation()}
          >
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
