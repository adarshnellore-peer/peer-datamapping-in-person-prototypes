export const V2_DRAG_MIME = "application/x-peer-v2-drag";

let activeDragPayload: V2DragPayload | null = null;

if (typeof document !== "undefined") {
  document.addEventListener("dragend", () => {
    activeDragPayload = null;
  });
}

export function getActiveV2DragPayload(): V2DragPayload | null {
  return activeDragPayload;
}

export function isOutlineDragPayload(payload: V2DragPayload): boolean {
  return (
    payload.kind === "toc" ||
    payload.kind === "outline-ref" ||
    payload.kind === "outline-refs"
  );
}

export function isStudySourceDragPayload(payload: V2DragPayload): boolean {
  return payload.kind === "study-source" || payload.kind === "study-sources";
}

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
  | { kind: "study-sources"; studySourceIds: string[] }
  | { kind: "toc"; sourceType: "SUBCONTENT" | "CONTENT"; label: string }
  | OutlineRefPayload
  | { kind: "outline-refs"; refs: OutlineRefPayload[] }
  | { kind: "mapped"; fromBlockId: string; sourceId: string; toIndex?: number };

export function outlineRefDragPayload(refs: OutlineRefPayload[]): V2DragPayload {
  return refs.length === 1 ? refs[0]! : { kind: "outline-refs", refs };
}

export function outlineRefsFromPayload(payload: V2DragPayload): OutlineRefPayload[] {
  if (payload.kind === "outline-ref") return [payload];
  if (payload.kind === "outline-refs") return payload.refs;
  if (payload.kind === "toc") {
    return [
      {
        kind: "outline-ref",
        sourceType: payload.sourceType,
        label: payload.label,
      },
    ];
  }
  return [];
}

export function studySourceIdsFromPayload(payload: V2DragPayload): string[] | null {
  if (payload.kind === "study-source") return [payload.studySourceId];
  if (payload.kind === "study-sources") return payload.studySourceIds;
  return null;
}

export function studySourceDragPayload(studySourceIds: string[]): V2DragPayload {
  return studySourceIds.length === 1
    ? { kind: "study-source", studySourceId: studySourceIds[0]! }
    : { kind: "study-sources", studySourceIds };
}

export function setV2DragData(dataTransfer: DataTransfer, payload: V2DragPayload) {
  activeDragPayload = payload;
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

/** True when a library / outline / mapped pill drag is in flight. */
export function acceptsV2Drag(dataTransfer: DataTransfer | null): boolean {
  return Boolean(getActiveV2DragPayload()) || hasV2DragType(dataTransfer);
}
