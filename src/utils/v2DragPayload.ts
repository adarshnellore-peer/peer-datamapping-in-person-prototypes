export const V2_DRAG_MIME = "application/x-peer-v2-drag";

export type V2DragPayload =
  | { kind: "study-source"; studySourceId: string }
  | { kind: "toc"; sourceType: "SUBCONTENT" | "CONTENT"; label: string }
  | { kind: "mapped"; fromBlockId: string; sourceId: string; toIndex?: number };

export function setV2DragData(dataTransfer: DataTransfer, payload: V2DragPayload) {
  dataTransfer.setData(V2_DRAG_MIME, JSON.stringify(payload));
  dataTransfer.effectAllowed = payload.kind === "mapped" ? "move" : "copy";
}

export function readV2DragData(dataTransfer: DataTransfer): V2DragPayload | null {
  const raw = dataTransfer.getData(V2_DRAG_MIME);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as V2DragPayload;
  } catch {
    return null;
  }
}

export function hasV2DragType(dataTransfer: DataTransfer | null): boolean {
  return dataTransfer?.types.includes(V2_DRAG_MIME) ?? false;
}
