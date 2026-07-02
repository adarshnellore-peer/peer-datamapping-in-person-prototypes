import { useCallback, useEffect, useState, type PointerEvent as ReactPointerEvent } from "react";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function readStoredWidths(
  storageKey: string,
  columnIds: readonly string[],
  defaults: Record<string, number>,
  min: number,
  max: number,
): Record<string, number> {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return { ...defaults };
    const parsed = JSON.parse(raw) as Record<string, number>;
    const result = { ...defaults };
    for (const id of columnIds) {
      if (typeof parsed[id] === "number" && !Number.isNaN(parsed[id])) {
        result[id] = clamp(parsed[id], min, max);
      }
    }
    return result;
  } catch {
    return { ...defaults };
  }
}

export function useResizableColumnWidths(
  storageKey: string,
  columnIds: readonly string[],
  defaultWidths: Record<string, number>,
  min: number,
  max: number,
) {
  const [widths, setWidths] = useState<Record<string, number>>(() =>
    readStoredWidths(storageKey, columnIds, defaultWidths, min, max),
  );

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(widths));
    } catch {
      /* ignore quota errors */
    }
  }, [storageKey, widths]);

  const startResize = useCallback(
    (columnId: string, event: ReactPointerEvent<HTMLElement>) => {
      event.preventDefault();
      event.stopPropagation();

      const startX = event.clientX;
      const startWidth = widths[columnId] ?? defaultWidths[columnId] ?? min;

      const onMove = (moveEvent: PointerEvent) => {
        const delta = moveEvent.clientX - startX;
        setWidths((prev) => ({
          ...prev,
          [columnId]: clamp(startWidth + delta, min, max),
        }));
      };

      const onUp = () => {
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
    },
    [defaultWidths, max, min, widths],
  );

  return { widths, startResize };
}
