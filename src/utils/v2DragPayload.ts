export const V2_DRAG_MIME = "application/x-peer-v2-drag";

/** Synthetic block id when tracing directly from the document library. */
export const LIBRARY_TRACE_BLOCK = "__library__";

export type OutlineRefPayload = {
  kind: "outline-ref";
  /** CONTENT = heading; SUBCONTENT = section within a heading. */
  sourceType: "SUBCONTENT" | "CONTENT";
  label: string;
  fromBlockId?: string;
  fromHeadingId?: string;
};

export type V2DragPayload =
  | { kind: "study-source"; studySourceId: string }
  | { kind: "toc"; sourceType: "SUBCONTENT" | "CONTENT"; label: string }
  | OutlineRefPayload
  | { kind: "mapped"; fromBlockId: string; sourceId: string; toIndex?: number };

export function setV2DragData(dataTransfer: DataTransfer, payload: V2DragPayload) {
  const json = JSON.stringify(payload);
  dataTransfer.setData(V2_DRAG_MIME, json);
  // Fallback for browsers that omit custom MIME types during dragover.
  dataTransfer.setData("text/plain", `peer-v2:${json}`);
  dataTransfer.effectAllowed = "copyMove";
}

export function readV2DragData(dataTransfer: DataTransfer): V2DragPayload | null {
  let raw = dataTransfer.getData(V2_DRAG_MIME);
  if (!raw) {
    const plain = dataTransfer.getData("text/plain");
    if (plain.startsWith("peer-v2:")) raw = plain.slice("peer-v2:".length);
  }
  if (!raw) return null;
  try {
    return JSON.parse(raw) as V2DragPayload;
  } catch {
    return null;
  }
}

export function hasV2DragType(dataTransfer: DataTransfer | null): boolean {
  if (!dataTransfer) return false;
  return (
    dataTransfer.types.includes(V2_DRAG_MIME) ||
    dataTransfer.types.includes("text/plain")
  );
}
