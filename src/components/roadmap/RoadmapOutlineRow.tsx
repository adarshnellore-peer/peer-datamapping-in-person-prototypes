import { ChevronRight } from "lucide-react";
import type { DragEvent, ReactNode } from "react";

export const ROADMAP_OUTLINE_COLUMN_WIDTH = 300;

export const ROADMAP_OUTLINE_COLUMN_CLASS =
  "sticky left-0 z-10 w-[300px] min-w-[300px] border-b border-r border-[#d4ced3] bg-[#fafafa] px-2.5 py-0.5 align-top";

export const ROADMAP_OUTLINE_HEAD_CLASS =
  "sticky left-0 top-0 z-30 w-[300px] min-w-[300px] border-b border-r border-[#d4ced3] bg-[#fafafa] px-3 py-2 text-left";

export function RoadmapOutlineHeader({ title = "Outline" }: { title?: string }) {
  return (
    <span className="text-[11px] font-semibold uppercase tracking-wide text-[#757575]">
      {title}
    </span>
  );
}

export function roadmapOutlineLabelClass(isHeading: boolean): string {
  return isHeading
    ? "py-0.5 text-[12px] font-semibold leading-[1.3] text-[var(--peer-text)]"
    : "py-0.5 text-[12px] font-normal leading-[1.35] text-[var(--peer-muted)]";
}

export function RoadmapOutlineRow({
  depth,
  isHeading,
  isActive = false,
  label,
  number,
  title,
  draggable = false,
  hasChevron = false,
  isCollapsed,
  onToggleCollapse,
  onDragStart,
  onDragEnd,
  dragTitle,
  onNavigate,
  actions,
}: {
  depth: number;
  isHeading: boolean;
  isActive?: boolean;
  /** Pre-built label; overrides number/title when set. */
  label?: ReactNode;
  number?: string;
  title?: string;
  draggable?: boolean;
  hasChevron?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onDragStart?: (event: DragEvent) => void;
  onDragEnd?: () => void;
  dragTitle?: string;
  onNavigate?: () => void;
  actions?: ReactNode;
}) {
  const indent = depth * 10;
  const labelContent =
    label ??
    (number ? (
      <>
        <span className="mr-1.5 tabular-nums text-[#9e9e9e]">{number}</span>
        {title ?? ""}
      </>
    ) : (
      (title ?? "")
    ));

  return (
    <div style={{ marginLeft: `${indent}px` }} className="py-0.5">
      <div
        draggable={draggable}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        title={dragTitle}
        className={`group/outline-row flex min-h-[26px] items-start pr-0.5 transition-[background-color,border-color,opacity] peer-toc-card ${
          draggable ? "cursor-grab touch-none active:cursor-grabbing" : ""
        } ${isActive ? "is-active" : ""}`}
      >
        <button
          type="button"
          aria-label={isCollapsed ? "Expand section" : "Collapse section"}
          onClick={(event) => {
            event.stopPropagation();
            onToggleCollapse?.();
          }}
          onPointerDown={(event) => event.stopPropagation()}
          className={`mr-0.5 flex h-[18px] w-4 shrink-0 items-center justify-center rounded text-[#9e9e9e] transition-colors hover:bg-black/[0.06] hover:text-[#636161] ${
            hasChevron ? "visible" : "invisible pointer-events-none"
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
          onClick={onNavigate}
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
          )} ${isActive ? "text-[var(--peer-text)]" : ""}`}
        >
          {labelContent}
        </span>

        {actions && (
          <div className="shrink-0 opacity-0 transition-opacity group-hover/outline-row:opacity-100 group-focus-within/outline-row:opacity-100">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
