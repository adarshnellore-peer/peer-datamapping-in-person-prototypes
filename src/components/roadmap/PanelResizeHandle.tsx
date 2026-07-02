import type { PointerEvent as ReactPointerEvent } from "react";

export function PanelResizeHandle({
  side,
  onResizeStart,
}: {
  side: "left" | "right";
  onResizeStart: (event: ReactPointerEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize panel"
      className={`peer-panel-resize-handle peer-panel-resize-handle--${side}`}
      onPointerDown={onResizeStart}
    />
  );
}
