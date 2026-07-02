import { ChevronRight } from "lucide-react";

export function OutlineChevronButton({
  isCollapsed,
  onToggle,
}: {
  isCollapsed?: boolean;
  onToggle?: () => void;
}) {
  return (
    <button
      type="button"
      data-ol-no-drag
      draggable={false}
      aria-label={isCollapsed ? "Expand section" : "Collapse section"}
      aria-expanded={!isCollapsed}
      onClick={(event) => {
        event.stopPropagation();
        onToggle?.();
      }}
      onPointerDown={(event) => event.stopPropagation()}
      className="peer-ol-chevron"
    >
      <ChevronRight
        size={12}
        strokeWidth={2}
        className={`peer-ol-chevron-icon ${isCollapsed ? "" : "is-open"}`}
        aria-hidden
      />
    </button>
  );
}
