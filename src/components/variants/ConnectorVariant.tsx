import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Search, ChevronRight, X, Plus } from "lucide-react";
import { SOURCE_ROLES, type SourceRole } from "../../data/roadmap";
import type { DocumentBlock } from "../../types";
import type { OutlineRefPayload } from "../../utils/v2DragPayload";
import {
  buildConnectorGraph,
  outlineEdgeKey,
  type HeadingNode,
  type OutlineEdge,
  type ReferenceNode,
  type SectionNode,
  type SourceCatalogGroup,
  type SourceDocNode,
} from "./connectorGraph";
import {
  CATEGORY_DOT,
  ROLE_ACCENT,
  ROLE_BADGE,
  ROLE_BADGE_PICKER,
  roleLabel,
} from "./types";

type LeftNodeKind = "section" | "heading";
type NodeKind = LeftNodeKind | "reference";
type Focus = { type: NodeKind | "document"; id: string } | null;

type SourceEdgePath = {
  kind: "source";
  key: string;
  d: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  blockId: string;
  studySourceId: string;
  dataSource: string;
  sourceId: string;
  role?: SourceRole;
  hasProposed: boolean;
  refLabel: string;
};

type OutlineEdgePath = {
  kind: "outline";
  key: string;
  d: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  labelX: number;
  labelY: number;
  edge: OutlineEdge;
};

type EdgePath = SourceEdgePath | OutlineEdgePath;

const OUTLINE_STROKE = "#6366f1";
const OUTLINE_STROKE_HOVER = "#4338ca";

const ROLE_STROKE_HOVER: Record<SourceRole, string> = {
  primary: "#e64641",
  supporting: "#2b5bd7",
  context: "#636161",
  reference: "#5b21b6",
};

function pathEdgeRole(path: EdgePath): SourceRole {
  if (path.kind === "outline") return path.edge.role ?? "reference";
  return path.role ?? "primary";
}

function pathStroke(path: EdgePath, isHover: boolean): string {
  if (path.kind === "outline") {
    return isHover ? OUTLINE_STROKE_HOVER : OUTLINE_STROKE;
  }
  const role = pathEdgeRole(path);
  return isHover ? ROLE_STROKE_HOVER[role] : ROLE_ACCENT[role].dotHex;
}

type PendingConnect =
  | {
      kind: "source";
      blockId: string;
      studySourceId: string;
      origin: { type: "section" | "reference"; id: string };
      x: number;
      y: number;
    }
  | {
      kind: "outline";
      toBlockId: string;
      refKind: "section" | "heading";
      refId: string;
      origin: { type: "section" | "heading"; id: string };
      x: number;
      y: number;
    };

type PinnedLink =
  | { kind: "source"; blockId: string; sourceId: string }
  | { kind: "outline"; toBlockId: string; refKind: "section" | "heading"; refId: string };

type ActiveLink =
  | {
      kind: "source";
      blockId: string;
      studySourceId: string;
      sourceId: string;
      role?: SourceRole;
      refLabel: string;
    }
  | {
      kind: "outline";
      edge: OutlineEdge;
    };

type ConnectState = {
  fromType: NodeKind;
  fromId: string;
  fromAnchor: "left" | "right";
  fromX: number;
  fromY: number;
  x: number;
  y: number;
  targetId: string | null;
  targetType: NodeKind | null;
};

type EdgeMenuAlign = "start" | "center" | "end";

function edgeMenuAlign(anchorX: number, viewportWidth: number): EdgeMenuAlign {
  if (anchorX < 130) return "start";
  if (anchorX > viewportWidth - 130) return "end";
  return "center";
}

/** Row hover: show connectors immediately on enter. */
const ROW_HOVER_SHOW_MS = 0;
/** Row hover: grace period before hiding when the pointer leaves. */
const ROW_HOVER_HIDE_MS = 450;
/** Ignore row hover while columns are still settling after scroll. */
const ROW_HOVER_SCROLL_SUPPRESS_MS = 300;
/** Edge tag hover: show immediately; hide slightly slower than rows. */
const EDGE_HOVER_SHOW_MS = 0;
const EDGE_HOVER_HIDE_MS = 320;
/** After drag-connect, ignore stray clicks that would clear the new selection. */
const CONNECT_CLICK_SUPPRESS_MS = 600;

function isLeftKind(kind: NodeKind): kind is LeftNodeKind {
  return kind === "section" || kind === "heading";
}

/** Pointer is over a row, connect handle, edge hit zone, or role tag. */
function isConnectorHoverAnchor(el: Element | null): boolean {
  return Boolean(
    el?.closest(
      "[data-node-kind], [data-connector-edge-hit], [data-connector-edge-menu], [data-connector-connect-handle]",
    ),
  );
}

function focusFromElement(el: Element | null): Focus | null {
  const node = el?.closest("[data-node-kind][data-node-id]");
  if (!node) return null;
  const kind = node.getAttribute("data-node-kind");
  const id = node.getAttribute("data-node-id");
  if (!kind || !id) return null;
  if (
    kind === "section" ||
    kind === "heading" ||
    kind === "reference" ||
    kind === "document"
  ) {
    return { type: kind, id };
  }
  return null;
}

function leftNodeEl(
  kind: LeftNodeKind,
  id: string,
  secRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>,
  headRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>,
) {
  return kind === "section" ? secRefs.current[id] : headRefs.current[id];
}

function referenceEl(
  studySourceId: string,
  refRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>,
) {
  return refRefs.current[studySourceId];
}

function docEl(
  dataSource: string,
  docRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>,
) {
  return docRefs.current[dataSource];
}

function firstStudySourceForDocument(
  dataSource: string,
  catalog: SourceCatalogGroup[],
): string | null {
  for (const group of catalog) {
    for (const entry of group.entries) {
      if (entry.kind === "document" && entry.doc.dataSource === dataSource) {
        return entry.doc.references[0]?.studySourceId ?? null;
      }
    }
  }
  return null;
}

function connectEndpoint(
  nodeType: NodeKind | "document",
  nodeId: string,
  anchor: "left" | "right",
  viewport: DOMRect,
  secRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>,
  headRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>,
  refRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>,
): { x: number; y: number } | null {
  const el =
    nodeType === "reference"
      ? refRefs.current[nodeId]
      : nodeType === "section"
        ? secRefs.current[nodeId]
        : nodeType === "heading"
          ? headRefs.current[nodeId]
          : null;
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  const y = rect.top + rect.height / 2 - viewport.top;
  if (nodeType === "reference") {
    return { x: rect.left - viewport.left, y };
  }
  if (nodeType === "section" || nodeType === "heading") {
    const x = (anchor === "right" ? rect.right : rect.left) - viewport.left;
    return { x, y };
  }
  return null;
}

/** Which side of the target row to snap to for the active drag mode. */
function connectTargetAnchor(
  fromType: NodeKind,
  fromAnchor: "left" | "right",
  targetType: NodeKind,
): "left" | "right" {
  if (targetType === "reference") return "left";
  if (targetType === "section" || targetType === "heading") {
    if (fromAnchor === "left" && isLeftKind(fromType)) return "left";
    return "right";
  }
  return "left";
}

function resolveConnectTarget(
  fromType: NodeKind,
  fromId: string,
  fromAnchor: "left" | "right",
  el: Element,
  catalog: SourceCatalogGroup[],
): { targetType: NodeKind; targetId: string; expandDoc?: string } | null {
  const kind = el.getAttribute("data-node-kind");
  const nodeId = el.getAttribute("data-node-id");
  if (!kind || !nodeId) return null;

  // Outline links: left handle only — vertical refs within the outline column.
  if (fromAnchor === "left" && isLeftKind(fromType)) {
    if (kind !== "section" && kind !== "heading") return null;
    const targetType = kind as LeftNodeKind;
    if (fromType === targetType && fromId === nodeId) return null;
    return { targetType, targetId: nodeId };
  }

  // Source links: section right handle → library.
  if (fromType === "section" && fromAnchor === "right") {
    if (kind === "reference") {
      return { targetType: "reference", targetId: nodeId };
    }
    if (kind === "document") {
      const studySourceId = firstStudySourceForDocument(nodeId, catalog);
      if (!studySourceId) return null;
      return { targetType: "reference", targetId: studySourceId, expandDoc: nodeId };
    }
    return null;
  }

  // Source links: library → section (right edge).
  if (fromType === "reference" && kind === "section") {
    return { targetType: "section", targetId: nodeId };
  }

  return null;
}

function consumerEl(
  blockId: string,
  secRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>,
  headRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>,
) {
  return secRefs.current[blockId] ?? headRefs.current[blockId];
}

function clampConnectorPoint(
  x: number,
  y: number,
  width: number,
  height: number,
  margin = 12,
): { x: number; y: number } {
  return {
    x: Math.max(margin, Math.min(width - margin, x)),
    y: Math.max(margin, Math.min(height - margin, y)),
  };
}

function roundPathCoord(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Inset from the left column edge where outline cross-refs run vertically. */
const OUTLINE_SPINE_INSET = 11;
/** Small inset so dots sit just inside the row border. */
const OUTLINE_ROW_ANCHOR_INSET = 3;

function buildOutlineEdgePath(
  ax: number,
  ay: number,
  bx: number,
  by: number,
): { d: string; labelX: number; labelY: number; x1: number; y1: number; x2: number; y2: number } {
  const x1 = roundPathCoord(ax);
  const y1 = roundPathCoord(ay);
  const x2 = roundPathCoord(bx);
  const y2 = roundPathCoord(by);
  const spineX = roundPathCoord(Math.min(x1, x2) - OUTLINE_SPINE_INSET);
  const labelX = spineX;
  const labelY = roundPathCoord((y1 + y2) / 2);

  if (Math.abs(y2 - y1) < 2) {
    const d = `M${x1},${y1} H${x2}`;
    return { d, labelX: roundPathCoord((x1 + x2) / 2), labelY: y1, x1, y1, x2, y2 };
  }

  const d = `M${x1},${y1} H${spineX} V${y2} H${x2}`;
  return { d, labelX, labelY, x1, y1, x2, y2 };
}

function pathsAreEqual(a: EdgePath[], b: EdgePath[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const left = a[i];
    const right = b[i];
    if (left.key !== right.key || left.d !== right.d) return false;
    if (left.kind !== right.kind) return false;
    if (left.kind === "source" && right.kind === "source") {
      if (
        left.role !== right.role ||
        left.hasProposed !== right.hasProposed ||
        left.refLabel !== right.refLabel
      ) {
        return false;
      }
    } else if (left.kind === "outline" && right.kind === "outline") {
      if (
        left.edge.role !== right.edge.role ||
        left.edge.hasProposed !== right.edge.hasProposed ||
        left.edge.refLabel !== right.edge.refLabel
      ) {
        return false;
      }
    }
  }
  return true;
}

function pendingConnectAnchor(
  pending: PendingConnect,
  viewport: HTMLDivElement,
  secRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>,
  headRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>,
  refRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>,
): { x: number; y: number } {
  const vrect = viewport.getBoundingClientRect();
  if (pending.kind === "source") {
    const sEl = secRefs.current[pending.blockId];
    const tEl = refRefs.current[pending.studySourceId];
    if (sEl && tEl) {
      const sr = sEl.getBoundingClientRect();
      const tr = tEl.getBoundingClientRect();
      return {
        x: (sr.right + tr.left) / 2 - vrect.left,
        y: (sr.top + sr.height / 2 + tr.top + tr.height / 2) / 2 - vrect.top,
      };
    }
  } else {
    const refEl = leftNodeEl(pending.refKind, pending.refId, secRefs, headRefs);
    const toEl = consumerEl(pending.toBlockId, secRefs, headRefs);
    if (refEl && toEl) {
      const rr = refEl.getBoundingClientRect();
      const cr = toEl.getBoundingClientRect();
      const x1 = rr.left - vrect.left + OUTLINE_ROW_ANCHOR_INSET;
      const y1 = rr.top + rr.height / 2 - vrect.top;
      const x2 = cr.left - vrect.left + OUTLINE_ROW_ANCHOR_INSET;
      const y2 = cr.top + cr.height / 2 - vrect.top;
      const built = buildOutlineEdgePath(x1, y1, x2, y2);
      return { x: built.labelX, y: built.labelY };
    }
  }
  return { x: pending.x, y: pending.y };
}

function buildPendingConnectPreview(
  pending: PendingConnect,
  viewport: HTMLDivElement,
  secRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>,
  headRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>,
  refRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>,
): { d: string; stroke: string } | null {
  const vrect = viewport.getBoundingClientRect();
  if (pending.kind === "source") {
    const sEl = secRefs.current[pending.blockId];
    const tEl = refRefs.current[pending.studySourceId];
    if (!sEl || !tEl) return null;
    const sr = sEl.getBoundingClientRect();
    const tr = tEl.getBoundingClientRect();
    const x1 = roundPathCoord(sr.right - vrect.left);
    const y1 = roundPathCoord(sr.top + sr.height / 2 - vrect.top);
    const x2 = roundPathCoord(tr.left - vrect.left);
    const y2 = roundPathCoord(tr.top + tr.height / 2 - vrect.top);
    const dx = Math.max(40, (x2 - x1) / 2);
    return {
      d: `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`,
      stroke: "#ff4e49",
    };
  }
  const refEl = leftNodeEl(pending.refKind, pending.refId, secRefs, headRefs);
  const toEl = consumerEl(pending.toBlockId, secRefs, headRefs);
  if (!refEl || !toEl) return null;
  const rr = refEl.getBoundingClientRect();
  const cr = toEl.getBoundingClientRect();
  const x1 = rr.left - vrect.left + OUTLINE_ROW_ANCHOR_INSET;
  const y1 = rr.top + rr.height / 2 - vrect.top;
  const x2 = cr.left - vrect.left + OUTLINE_ROW_ANCHOR_INSET;
  const y2 = cr.top + cr.height / 2 - vrect.top;
  const built = buildOutlineEdgePath(x1, y1, x2, y2);
  return { d: built.d, stroke: "#4338ca" };
}

function pinFromPath(
  path: EdgePath,
  setPinnedLink: React.Dispatch<React.SetStateAction<PinnedLink | null>>,
  setSelected: React.Dispatch<React.SetStateAction<Focus>>,
) {
  if (path.kind === "source") {
    setPinnedLink({ kind: "source", blockId: path.blockId, sourceId: path.sourceId });
    setSelected({ type: "reference", id: path.studySourceId });
    return;
  }
  setPinnedLink({
    kind: "outline",
    toBlockId: path.edge.toBlockId,
    refKind: path.edge.refKind,
    refId: path.edge.refId,
  });
  setSelected(
    path.edge.refKind === "section"
      ? { type: "section", id: path.edge.refId }
      : { type: "heading", id: path.edge.refId },
  );
}

function pathMatchesPinned(path: EdgePath, pinned: PinnedLink | null): boolean {
  if (!pinned) return false;
  if (pinned.kind === "source" && path.kind === "source") {
    return pinned.sourceId === path.sourceId;
  }
  if (pinned.kind === "outline" && path.kind === "outline") {
    return (
      pinned.toBlockId === path.edge.toBlockId &&
      pinned.refKind === path.edge.refKind &&
      pinned.refId === path.edge.refId
    );
  }
  return false;
}

/**
 * V5 — Connector map. Outline on the left (content headings + subcontent),
 * library documents on the right. Drag right handles to link outline rows to
 * each other, or to sources on the right.
 */
export function ConnectorVariant({
  blocks,
  tracedPlacement,
  onMapStudySource,
  onUnmapPlacement,
  onUpdatePlacementRole,
  onMapOutlineRef,
  onUnmapOutlineRef,
  onUpdateOutlineRefRole,
  onTracePlacement,
  onClearTrace,
}: {
  blocks: DocumentBlock[];
  tracedPlacement?: { blockId: string; sourceId: string } | null;
  onMapStudySource: (blockId: string, studySourceId: string, role: SourceRole) => string | void;
  onUnmapPlacement: (blockId: string, sourceId: string) => void;
  onUpdatePlacementRole: (blockId: string, sourceId: string, role: SourceRole) => void;
  onMapOutlineRef: (toBlockId: string, payload: OutlineRefPayload, role: SourceRole) => string | void;
  onUnmapOutlineRef: (toBlockId: string, sourceId: string) => void;
  onUpdateOutlineRefRole: (toBlockId: string, sourceId: string, role: SourceRole) => void;
  onTracePlacement: (blockId: string, sourceId: string) => void;
  onTraceStudySource: (studySourceId: string, preferredBlockId?: string) => void;
  onClearTrace?: () => void;
}) {
  const graph = useMemo(() => buildConnectorGraph(blocks), [blocks]);

  const tracedStudySourceId = useMemo(() => {
    if (!tracedPlacement) return null;
    const block = blocks.find((b) => b.id === tracedPlacement.blockId);
    if (!block || block.type !== "content") return null;
    const source = block.sources.find((s) => s.id === tracedPlacement.sourceId);
    if (!source || source.sourceType !== "DATA_SOURCE") return null;
    const edge = graph.edges.find((item) => item.sourceId === source.id);
    return edge?.studySourceId ?? null;
  }, [blocks, tracedPlacement, graph.edges]);

  const traceFocus = useMemo((): Focus => {
    if (tracedStudySourceId) {
      return { type: "reference", id: tracedStudySourceId };
    }
    if (!tracedPlacement) return null;
    const block = blocks.find((b) => b.id === tracedPlacement.blockId);
    if (block?.type === "content") {
      return { type: "section", id: tracedPlacement.blockId };
    }
    if (block?.type === "heading") {
      return { type: "heading", id: tracedPlacement.blockId };
    }
    return null;
  }, [tracedStudySourceId, tracedPlacement, blocks]);

  const [visibleCategories, setVisibleCategories] = useState<Set<string>>(
    () => new Set(graph.categories),
  );

  useEffect(() => {
    setVisibleCategories((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const category of graph.categories) {
        if (!next.has(category)) {
          next.add(category);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [graph.categories]);
  const [selected, setSelected] = useState<Focus>(null);
  const [hovered, setHovered] = useState<Focus>(null);
  const [outlineQuery, setOutlineQuery] = useState("");
  const [sourceQuery, setSourceQuery] = useState("");
  const [hoverEdge, setHoverEdge] = useState<string | null>(null);
  const [edgeMenuPathKey, setEdgeMenuPathKey] = useState<string | null>(null);
  const [pinnedLink, setPinnedLink] = useState<PinnedLink | null>(null);
  const [connect, setConnect] = useState<ConnectState | null>(null);
  const [pendingConnect, setPendingConnect] = useState<PendingConnect | null>(null);
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(() => new Set());

  const connectorViewportRef = useRef<HTMLDivElement>(null);
  const sectionsScrollRef = useRef<HTMLDivElement>(null);
  const sourcesScrollRef = useRef<HTMLDivElement>(null);
  const secRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const headRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const refRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const docRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const connectRef = useRef<ConnectState | null>(null);
  const suppressRowClickRef = useRef(false);
  const suppressHoverRef = useRef(false);
  const suppressHoverTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const rowHoverEnterTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const rowHoverLeaveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const edgeHoverEnterTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const edgeHoverLeaveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const selectedRef = useRef<Focus>(null);
  const isConnectingRef = useRef(false);
  const connectRafRef = useRef<number | null>(null);
  const connectDragExpandDocRef = useRef<string | null>(null);
  const suppressViewportClickRef = useRef(false);
  const suppressViewportClickTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hoveredRef = useRef<Focus>(null);
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const [paths, setPaths] = useState<EdgePath[]>([]);

  const isConnecting = connect !== null;
  selectedRef.current = selected;
  isConnectingRef.current = isConnecting;
  hoveredRef.current = hovered;
  const pathFocus = useMemo((): Focus => {
    if (connect) {
      return { type: connect.fromType, id: connect.fromId };
    }
    if (selected) return selected;
    return traceFocus ?? hovered;
  }, [connect, hovered, selected, traceFocus]);
  const highlight = !isConnecting ? selected ?? traceFocus ?? hovered : pathFocus;
  const pathFocusSection = pathFocus?.type === "section" ? pathFocus.id : null;
  const pathFocusHeading = pathFocus?.type === "heading" ? pathFocus.id : null;
  const pathFocusReference = pathFocus?.type === "reference" ? pathFocus.id : null;
  const pathFocusDocument = pathFocus?.type === "document" ? pathFocus.id : null;
  const highlightSection = highlight?.type === "section" ? highlight.id : null;
  const highlightReference = highlight?.type === "reference" ? highlight.id : null;
  const highlightDocument = highlight?.type === "document" ? highlight.id : null;
  const selectedSection = selected?.type === "section" ? selected.id : null;
  const selectedHeading = selected?.type === "heading" ? selected.id : null;
  const selectedReference = selected?.type === "reference" ? selected.id : null;
  const selectionLabel =
    selected?.type === "section" || selected?.type === "heading"
      ? "outline"
      : selected?.type === "reference"
        ? "source"
        : null;

  const outlineQ = outlineQuery.trim().toLowerCase();
  const sourceQ = sourceQuery.trim().toLowerCase();

  const isReferenceVisible = (ref: ReferenceNode) => {
    if (!visibleCategories.has(ref.category)) return false;
    if (!sourceQ) return true;
    return (
      ref.label.toLowerCase().includes(sourceQ) ||
      ref.dataSource.toLowerCase().includes(sourceQ) ||
      (ref.pageRef?.toLowerCase().includes(sourceQ) ?? false)
    );
  };

  const isDocVisible = (doc: SourceDocNode) => {
    if (!visibleCategories.has(doc.category)) return false;
    if (!sourceQ) return true;
    if (doc.label.toLowerCase().includes(sourceQ) || doc.dataSource.toLowerCase().includes(sourceQ)) {
      return true;
    }
    return doc.references.some((ref) => isReferenceVisible(ref));
  };

  const sectionMatchesQuery = (node: SectionNode) =>
    !outlineQ ||
    node.title.toLowerCase().includes(outlineQ) ||
    (node.headingLabel?.toLowerCase().includes(outlineQ) ?? false);

  const headingMatchesQuery = (node: HeadingNode) =>
    !outlineQ || node.label.toLowerCase().includes(outlineQ);

  const visibleStudySourceIds = useMemo(() => {
    const ids = new Set<string>();
    for (const group of graph.sourceCatalog) {
      for (const entry of group.entries) {
        if (entry.kind === "standalone") {
          if (isReferenceVisible(entry.ref)) ids.add(entry.ref.studySourceId);
          continue;
        }
        if (!isDocVisible(entry.doc)) continue;
        for (const ref of entry.doc.references) {
          if (isReferenceVisible(ref)) ids.add(ref.studySourceId);
        }
      }
    }
    return ids;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph.sourceCatalog, visibleCategories, sourceQ]);

  const visibleOutlineBlockIds = useMemo(() => {
    const ids = new Set<string>();
    const headingIdByLabel = new Map<string, string>();
    for (const item of graph.leftItems) {
      if (item.kind === "heading") {
        headingIdByLabel.set(item.node.label, item.node.headingId);
      }
    }
    for (const item of graph.leftItems) {
      if (item.kind === "heading" && headingMatchesQuery(item.node)) {
        ids.add(item.node.headingId);
      }
      if (item.kind === "section" && sectionMatchesQuery(item.node)) {
        ids.add(item.node.blockId);
        if (item.node.headingLabel) {
          const headingId = headingIdByLabel.get(item.node.headingLabel);
          if (headingId) ids.add(headingId);
        }
      }
    }
    return ids;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph.leftItems, outlineQ]);

  const expandedDocsEffective = useMemo(() => {
    const next = new Set(expandedDocs);
    if (sourceQ) {
      for (const group of graph.sourceCatalog) {
        for (const entry of group.entries) {
          if (entry.kind === "document" && isDocVisible(entry.doc)) {
            next.add(entry.doc.dataSource);
          }
        }
      }
    }
    if (hovered?.type === "document") next.add(hovered.id);
    if (selected?.type === "document") next.add(selected.id);
    const refsToExpand = new Set<string>();
    if (highlightReference) refsToExpand.add(highlightReference);
    if (hovered?.type === "reference") refsToExpand.add(hovered.id);
    if (selectedReference) refsToExpand.add(selectedReference);
    if (tracedStudySourceId) refsToExpand.add(tracedStudySourceId);
    for (const id of refsToExpand) {
      for (const edge of graph.edges) {
        if (edge.studySourceId === id) next.add(edge.dataSource);
      }
    }
    if (highlightSection) {
      for (const edge of graph.edges) {
        if (edge.blockId === highlightSection) next.add(edge.dataSource);
      }
    }
    if (selectedSection) {
      for (const edge of graph.edges) {
        if (edge.blockId === selectedSection) next.add(edge.dataSource);
      }
    }
    return next;
  }, [
    expandedDocs,
    sourceQ,
    graph.sourceCatalog,
    graph.edges,
    highlightReference,
    highlightSection,
    highlightDocument,
    hovered,
    selectedReference,
    selectedSection,
    selected,
    tracedStudySourceId,
  ]);

  const expandedDocsKey = useMemo(
    () => [...expandedDocsEffective].sort().join("|"),
    [expandedDocsEffective],
  );

  const cancelRowHoverTimers = useCallback(() => {
    if (rowHoverEnterTimerRef.current) clearTimeout(rowHoverEnterTimerRef.current);
    if (rowHoverLeaveTimerRef.current) clearTimeout(rowHoverLeaveTimerRef.current);
    rowHoverEnterTimerRef.current = undefined;
    rowHoverLeaveTimerRef.current = undefined;
  }, []);

  const cancelEdgeHoverTimers = useCallback(() => {
    if (edgeHoverEnterTimerRef.current) clearTimeout(edgeHoverEnterTimerRef.current);
    if (edgeHoverLeaveTimerRef.current) clearTimeout(edgeHoverLeaveTimerRef.current);
    edgeHoverEnterTimerRef.current = undefined;
    edgeHoverLeaveTimerRef.current = undefined;
  }, []);

  const scheduleRowHover = useCallback(
    (focus: NonNullable<Focus>) => {
      if (isConnectingRef.current || suppressHoverRef.current || selectedRef.current) return;
      cancelRowHoverTimers();
      if (ROW_HOVER_SHOW_MS <= 0) {
        setHovered(focus);
        return;
      }
      rowHoverEnterTimerRef.current = setTimeout(() => {
        if (isConnectingRef.current || suppressHoverRef.current || selectedRef.current) return;
        setHovered(focus);
      }, ROW_HOVER_SHOW_MS);
    },
    [cancelRowHoverTimers],
  );

  const pointerInsideViewport = useCallback((clientX: number, clientY: number) => {
    const viewport = connectorViewportRef.current;
    if (!viewport) return false;
    const rect = viewport.getBoundingClientRect();
    return (
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    );
  }, []);

  const syncHoverFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      if (isConnectingRef.current || suppressHoverRef.current || selectedRef.current) return;
      if (!pointerInsideViewport(clientX, clientY)) return;

      const under = document.elementFromPoint(clientX, clientY);
      const focus = focusFromElement(under);
      if (focus) {
        if (hoveredRef.current?.type !== focus.type || hoveredRef.current?.id !== focus.id) {
          setHovered(focus);
        }
        return;
      }
      if (isConnectorHoverAnchor(under)) return;
      // Pointer is in the connector canvas gap — keep the current row focus.
    },
    [pointerInsideViewport],
  );

  const scheduleViewportHoverClear = useCallback(() => {
    if (isConnectingRef.current || selectedRef.current) return;
    cancelRowHoverTimers();
    rowHoverLeaveTimerRef.current = setTimeout(() => {
      if (suppressHoverRef.current || selectedRef.current) return;
      const { x, y } = lastPointerRef.current;
      if (pointerInsideViewport(x, y)) {
        syncHoverFromPointer(x, y);
        if (hoveredRef.current) return;
      }
      setHovered(null);
    }, ROW_HOVER_HIDE_MS);
  }, [cancelRowHoverTimers, pointerInsideViewport, syncHoverFromPointer]);

  const scheduleClearRowHover = useCallback(
    (event?: React.MouseEvent) => {
      if (isConnectingRef.current || suppressHoverRef.current || selectedRef.current) return;
      const x = event?.clientX ?? lastPointerRef.current.x;
      const y = event?.clientY ?? lastPointerRef.current.y;
      if (event) {
        const next = event.relatedTarget;
        if (next instanceof Element && isConnectorHoverAnchor(next)) return;
        const under = document.elementFromPoint(x, y);
        if (isConnectorHoverAnchor(under)) return;
        const focus = focusFromElement(under);
        if (focus) {
          setHovered(focus);
          return;
        }
      }
      if (pointerInsideViewport(x, y)) return;
      scheduleViewportHoverClear();
    },
    [pointerInsideViewport, scheduleViewportHoverClear],
  );

  const handleViewportPointerMove = useCallback(
    (event: React.PointerEvent) => {
      lastPointerRef.current = { x: event.clientX, y: event.clientY };
      if (isConnecting) return;
      cancelRowHoverTimers();
      syncHoverFromPointer(event.clientX, event.clientY);
    },
    [isConnecting, cancelRowHoverTimers, syncHoverFromPointer],
  );

  const handleViewportPointerLeave = useCallback(
    (event: React.PointerEvent) => {
      if (selectedRef.current || isConnectingRef.current) return;
      const related = event.relatedTarget;
      if (related instanceof Node && connectorViewportRef.current?.contains(related)) return;
      scheduleViewportHoverClear();
    },
    [scheduleViewportHoverClear],
  );

  const scheduleEdgeHover = useCallback(
    (pathKey: string) => {
      cancelEdgeHoverTimers();
      cancelRowHoverTimers();
      if (EDGE_HOVER_SHOW_MS <= 0) {
        setHoverEdge(pathKey);
        return;
      }
      edgeHoverEnterTimerRef.current = setTimeout(() => {
        setHoverEdge(pathKey);
      }, EDGE_HOVER_SHOW_MS);
    },
    [cancelEdgeHoverTimers, cancelRowHoverTimers],
  );

  const scheduleClearEdgeHover = useCallback(
    (pathKey: string) => {
      cancelEdgeHoverTimers();
      edgeHoverLeaveTimerRef.current = setTimeout(() => {
        setHoverEdge((current) => (current === pathKey ? null : current));
      }, EDGE_HOVER_HIDE_MS);
    },
    [cancelEdgeHoverTimers],
  );

  useEffect(
    () => () => {
      cancelRowHoverTimers();
      cancelEdgeHoverTimers();
      if (connectRafRef.current !== null) cancelAnimationFrame(connectRafRef.current);
    },
    [cancelRowHoverTimers, cancelEdgeHoverTimers],
  );

  useEffect(() => {
    if (!selected) return;
    cancelRowHoverTimers();
    setHovered(null);
  }, [selected, cancelRowHoverTimers]);

  const suppressNextViewportClick = useCallback((durationMs = 300) => {
    suppressViewportClickRef.current = true;
    if (suppressViewportClickTimerRef.current) clearTimeout(suppressViewportClickTimerRef.current);
    suppressViewportClickTimerRef.current = setTimeout(() => {
      suppressViewportClickRef.current = false;
    }, durationMs);
  }, []);

  const markColumnScrolling = useCallback(() => {
    suppressHoverRef.current = true;
    suppressNextViewportClick();
    if (suppressHoverTimerRef.current) clearTimeout(suppressHoverTimerRef.current);
    suppressHoverTimerRef.current = setTimeout(() => {
      suppressHoverRef.current = false;
      const { x, y } = lastPointerRef.current;
      syncHoverFromPointer(x, y);
    }, ROW_HOVER_SCROLL_SUPPRESS_MS);
  }, [suppressNextViewportClick, syncHoverFromPointer]);

  const setRowHover = scheduleRowHover;

  useLayoutEffect(() => {
    const viewport = connectorViewportRef.current;
    const sectionsEl = sectionsScrollRef.current;
    const sourcesEl = sourcesScrollRef.current;
    if (!viewport) return;

    const measure = () => {
      const vrect = viewport.getBoundingClientRect();
      const next: EdgePath[] = [];

      for (const edge of graph.edges) {
        if (!visibleStudySourceIds.has(edge.studySourceId)) continue;
        if (!visibleOutlineBlockIds.has(edge.blockId)) continue;
        const sEl = secRefs.current[edge.blockId];
        const refNode = referenceEl(edge.studySourceId, refRefs);
        const docNode = docEl(edge.dataSource, docRefs);
        const useDocHeader =
          pathFocusDocument === edge.dataSource &&
          pathFocusReference === null &&
          !expandedDocsEffective.has(edge.dataSource);
        const tEl = useDocHeader ? docNode : refNode ?? docNode;
        if (!sEl || !tEl) continue;
        const sr = sEl.getBoundingClientRect();
        const tr = tEl.getBoundingClientRect();
        let x1 = sr.right - vrect.left;
        let y1 = sr.top + sr.height / 2 - vrect.top;
        let x2 = tr.left - vrect.left;
        let y2 = tr.top + tr.height / 2 - vrect.top;
        const c1 = clampConnectorPoint(x1, y1, vrect.width, vrect.height);
        const c2 = clampConnectorPoint(x2, y2, vrect.width, vrect.height);
        x1 = roundPathCoord(c1.x);
        y1 = roundPathCoord(c1.y);
        x2 = roundPathCoord(c2.x);
        y2 = roundPathCoord(c2.y);
        const dx = Math.max(40, (x2 - x1) / 2);
        next.push({
          kind: "source",
          key: `source|${edge.sourceId}`,
          d: `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`,
          x1,
          y1,
          x2,
          y2,
          blockId: edge.blockId,
          studySourceId: edge.studySourceId,
          dataSource: edge.dataSource,
          sourceId: edge.sourceId,
          role: edge.role,
          hasProposed: edge.hasProposed,
          refLabel: edge.refLabel,
        });
      }

      for (const edge of graph.outlineEdges) {
        if (!visibleOutlineBlockIds.has(edge.refId) || !visibleOutlineBlockIds.has(edge.toBlockId)) {
          continue;
        }
        const refEl = leftNodeEl(edge.refKind, edge.refId, secRefs, headRefs);
        const toEl = consumerEl(edge.toBlockId, secRefs, headRefs);
        if (!refEl || !toEl) continue;
        const rr = refEl.getBoundingClientRect();
        const cr = toEl.getBoundingClientRect();
        const x1 = rr.left - vrect.left + OUTLINE_ROW_ANCHOR_INSET;
        const y1 = rr.top + rr.height / 2 - vrect.top;
        const x2 = cr.left - vrect.left + OUTLINE_ROW_ANCHOR_INSET;
        const y2 = cr.top + cr.height / 2 - vrect.top;
        const c1 = clampConnectorPoint(x1, y1, vrect.width, vrect.height);
        const c2 = clampConnectorPoint(x2, y2, vrect.width, vrect.height);
        const built = buildOutlineEdgePath(c1.x, c1.y, c2.x, c2.y);
        next.push({
          kind: "outline",
          key: `outline|${outlineEdgeKey(edge)}`,
          d: built.d,
          x1: built.x1,
          y1: built.y1,
          x2: built.x2,
          y2: built.y2,
          labelX: built.labelX,
          labelY: built.labelY,
          edge,
        });
      }

      setPaths((prev) => (pathsAreEqual(prev, next) ? prev : next));

      const pending = connectRef.current;
      if (pending) {
        const nodeEl =
          pending.fromType === "reference"
            ? referenceEl(pending.fromId, refRefs)
            : leftNodeEl(pending.fromType as LeftNodeKind, pending.fromId, secRefs, headRefs);
        if (nodeEl) {
          const nr = nodeEl.getBoundingClientRect();
          const fromX = roundPathCoord(
            (pending.fromType === "reference" || pending.fromAnchor === "left"
              ? nr.left
              : nr.right) - vrect.left,
          );
          const fromY = roundPathCoord(nr.top + nr.height / 2 - vrect.top);
          connectRef.current = { ...pending, fromX, fromY };
          setConnect((c) =>
            c && (c.fromX !== fromX || c.fromY !== fromY) ? { ...c, fromX, fromY } : c,
          );
        }
      }
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(viewport);
    sectionsEl?.addEventListener("scroll", measure, { passive: true });
    sourcesEl?.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      sectionsEl?.removeEventListener("scroll", measure);
      sourcesEl?.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    graph,
    selected,
    expandedDocsKey,
    hovered,
    connect,
    visibleStudySourceIds,
    visibleOutlineBlockIds,
    pathFocusDocument,
    pathFocusReference,
    expandedDocsEffective,
  ]);

  useEffect(() => {
    const focus = traceFocus ?? selected;
    if (!focus) return;
    const el =
      focus.type === "section"
        ? secRefs.current[focus.id]
        : focus.type === "heading"
          ? headRefs.current[focus.id]
          : focus.type === "document"
            ? docRefs.current[focus.id]
            : refRefs.current[focus.id];
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    if (focus.type === "document") {
      const sections = graph.dataSourceToSections.get(focus.id);
      if (sections?.size) {
        const first = [...sections][0];
        secRefs.current[first]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [selected, traceFocus, expandedDocsKey, graph.dataSourceToSections]);

  const sourceEdgeTouchesPathFocus = (
    blockId: string,
    studySourceId: string,
    dataSource: string,
  ) => {
    if (!pathFocus) return false;
    if (pathFocusDocument) return dataSource === pathFocusDocument;
    if (pathFocusSection) return blockId === pathFocusSection;
    if (pathFocusHeading) return false;
    return studySourceId === pathFocusReference;
  };

  const outlineEdgeTouchesPathFocus = (edge: OutlineEdge) => {
    if (
      !pathFocus ||
      pathFocus.type === "reference" ||
      pathFocus.type === "document"
    ) {
      return false;
    }
    const focusId = pathFocus.id;
    if (pathFocus.type === "section") {
      return (
        edge.toBlockId === focusId ||
        (edge.refKind === "section" && edge.refId === focusId)
      );
    }
    return (
      edge.toBlockId === focusId ||
      (edge.refKind === "heading" && edge.refId === focusId)
    );
  };

  const outlineNodeHighlighted = (kind: LeftNodeKind, id: string) => {
    if (!highlight) return false;
    if (highlight.type === kind && highlight.id === id) return true;
    if (highlight.type === "reference") {
      return kind === "section" && (graph.studySourceToSections.get(highlight.id)?.has(id) ?? false);
    }
    if (highlight.type === "document") {
      return kind === "section" && (graph.dataSourceToSections.get(highlight.id)?.has(id) ?? false);
    }
    return graph.outlineEdges.some(
      (edge) =>
        (edge.toBlockId === highlight.id &&
          edge.refKind === kind &&
          edge.refId === id) ||
        (edge.toBlockId === id &&
          highlight.type === edge.refKind &&
          highlight.id === edge.refId),
    );
  };

  const referenceHighlighted = (studySourceId: string, dataSource?: string) => {
    if (!highlight) return false;
    if (highlightReference) return studySourceId === highlightReference;
    if (highlightDocument) {
      return dataSource === highlightDocument;
    }
    if (highlightSection) {
      return graph.sectionToStudySources.get(highlightSection)?.has(studySourceId) ?? false;
    }
    return false;
  };

  const referenceRowFocused = (studySourceId: string) =>
    highlight?.type === "reference" && highlight.id === studySourceId;

  const documentRowFocused = (dataSource: string) =>
    highlight?.type === "document" && highlight.id === dataSource;

  const documentHighlighted = (dataSource: string) => {
    if (highlightDocument === dataSource) return true;
    if (selected?.type === "document" && selected.id === dataSource) return true;
    if (highlightReference) {
      return graph.edges.some(
        (edge) => edge.studySourceId === highlightReference && edge.dataSource === dataSource,
      );
    }
    return false;
  };

  const pinSelect = useCallback(
    (focus: NonNullable<Focus>) => {
      if (isConnecting) return;
      if (suppressRowClickRef.current) {
        suppressRowClickRef.current = false;
        return;
      }
      setEdgeMenuPathKey(null);
      setPinnedLink(null);
      setSelected(focus);
      setHovered(null);
    },
    [isConnecting],
  );

  const clearSelection = useCallback(() => {
    if (connectRef.current) return;
    setSelected(null);
    setHovered(null);
    setPinnedLink(null);
    setEdgeMenuPathKey(null);
    setPendingConnect(null);
    onClearTrace?.();
  }, [onClearTrace]);

  const dismissOverlay = useCallback(() => {
    if (connectRef.current) return false;
    if (pendingConnect) {
      setPendingConnect(null);
      return true;
    }
    if (edgeMenuPathKey) {
      setEdgeMenuPathKey(null);
      return true;
    }
    return false;
  }, [pendingConnect, edgeMenuPathKey]);

  const shouldClearSelectionFromClick = useCallback((target: Element | null) => {
    if (!target) return false;
    if (target.closest("[data-node-id]")) return false;
    if (target.closest("[data-connector-edge-menu]")) return false;
    if (target.closest("[data-connector-edge-hit]")) return false;
    if (target.closest("[data-connector-connect-handle]")) return false;
    if (target.closest("[data-connector-no-deselect]")) return false;
    return true;
  }, []);

  const toggleDocExpanded = (dataSource: string) =>
    setExpandedDocs((prev) => {
      const next = new Set(prev);
      if (next.has(dataSource)) next.delete(dataSource);
      else next.add(dataSource);
      return next;
    });

  const toggleCategory = (category: string) =>
    setVisibleCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });

  const pinSelectDocument = (dataSource: string) => {
    if (isConnecting) return;
    setEdgeMenuPathKey(null);
    setPinnedLink(null);
    setSelected({ type: "document", id: dataSource });
    setHovered(null);
  };

  const startConnect = (
    type: NodeKind,
    id: string,
    event: React.PointerEvent<HTMLButtonElement>,
    fromAnchor: "left" | "right" = type === "reference" ? "left" : "right",
  ) => {
    event.preventDefault();
    event.stopPropagation();
    const handle = event.currentTarget;
    const viewport = connectorViewportRef.current;
    const nodeEl =
      type === "reference"
        ? referenceEl(id, refRefs)
        : leftNodeEl(type, id, secRefs, headRefs);
    if (!viewport || !nodeEl) return;

    cancelRowHoverTimers();
    cancelEdgeHoverTimers();
    setHovered(null);
    setEdgeMenuPathKey(null);
    connectDragExpandDocRef.current = null;
    setSelected({ type, id });

    const vr = viewport.getBoundingClientRect();
    const nr = nodeEl.getBoundingClientRect();
    const fromX =
      (type === "reference" || fromAnchor === "left" ? nr.left : nr.right) - vr.left;
    const fromY = nr.top + nr.height / 2 - vr.top;

    const initial: ConnectState = {
      fromType: type,
      fromId: id,
      fromAnchor,
      fromX,
      fromY,
      x: fromX,
      y: fromY,
      targetId: null,
      targetType: null,
    };
    connectRef.current = initial;
    setConnect(initial);

    try {
      handle.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture may fail in some browsers; drag still works via document listeners.
    }

    const flushConnect = () => {
      connectRafRef.current = null;
      const next = connectRef.current;
      if (next) setConnect({ ...next });
    };

    const scheduleConnectFlush = () => {
      if (connectRafRef.current !== null) return;
      connectRafRef.current = requestAnimationFrame(flushConnect);
    };

    const onMove = (ev: PointerEvent) => {
      const v = connectorViewportRef.current?.getBoundingClientRect();
      if (!v || !connectRef.current) return;

      let x = ev.clientX - v.left;
      let y = ev.clientY - v.top;
      let targetId: string | null = null;
      let targetType: NodeKind | null = null;

      const el = (document.elementFromPoint(ev.clientX, ev.clientY) as Element | null)?.closest(
        "[data-node-id]",
      );
      if (el) {
        const resolved = resolveConnectTarget(
          connectRef.current.fromType,
          connectRef.current.fromId,
          connectRef.current.fromAnchor,
          el,
          graph.sourceCatalog,
        );
        if (resolved) {
          targetType = resolved.targetType;
          targetId = resolved.targetId;
          if (
            resolved.expandDoc &&
            connectDragExpandDocRef.current !== resolved.expandDoc
          ) {
            connectDragExpandDocRef.current = resolved.expandDoc;
            setExpandedDocs((prev) => new Set(prev).add(resolved.expandDoc!));
          }
          const snap = connectEndpoint(
            resolved.targetType,
            resolved.targetId,
            connectTargetAnchor(
              connectRef.current.fromType,
              connectRef.current.fromAnchor,
              resolved.targetType,
            ),
            v,
            secRefs,
            headRefs,
            refRefs,
          );
          if (snap) {
            x = snap.x;
            y = snap.y;
          }
        }
      }

      connectRef.current = { ...connectRef.current, x, y, targetId, targetType };
      scheduleConnectFlush();
    };

    const finishConnect = (ev: PointerEvent) => {
      if (connectRafRef.current !== null) {
        cancelAnimationFrame(connectRafRef.current);
        connectRafRef.current = null;
      }
      try {
        if (handle.hasPointerCapture(ev.pointerId)) {
          handle.releasePointerCapture(ev.pointerId);
        }
      } catch {
        // ignore
      }

      const info = connectRef.current;
      let droppedOnTarget = false;
      if (info?.targetId && info.targetType) {
        const isOutlineDrop =
          info.fromAnchor === "left" &&
          isLeftKind(info.fromType) &&
          isLeftKind(info.targetType);
        if (isOutlineDrop) {
          const refKind: "section" | "heading" =
            info.fromType === "heading" ? "heading" : "section";
          const refId = info.fromId;
          const toBlockId = info.targetId;
          const refKey = `${refKind}|${refId}`;
          const isSelf = refId === toBlockId && info.fromType === info.targetType;
          const already = graph.blockToOutlineRefs.get(toBlockId)?.has(refKey) ?? false;
          if (!isSelf && !already) {
            setPendingConnect({
              kind: "outline",
              toBlockId,
              refKind,
              refId,
              origin:
                info.fromType === "heading"
                  ? { type: "heading", id: info.fromId }
                  : { type: "section", id: info.fromId },
              x: info.x,
              y: info.y,
            });
          }
          droppedOnTarget = true;
          setSelected(
            info.fromType === "heading"
              ? { type: "heading", id: info.fromId }
              : { type: "section", id: info.fromId },
          );
        } else if (
          (info.fromType === "section" &&
            info.fromAnchor === "right" &&
            info.targetType === "reference") ||
          (info.fromType === "reference" && info.targetType === "section")
        ) {
          const blockId = info.fromType === "section" ? info.fromId : info.targetId;
          const studySourceId = info.fromType === "section" ? info.targetId : info.fromId;
          const already = graph.sectionToStudySources.get(blockId)?.has(studySourceId) ?? false;
          if (!already) {
            setPendingConnect({
              kind: "source",
              blockId,
              studySourceId,
              origin:
                info.fromType === "section"
                  ? { type: "section", id: info.fromId }
                  : { type: "reference", id: info.fromId },
              x: info.x,
              y: info.y,
            });
          }
          droppedOnTarget = true;
          if (info.fromType === "reference") {
            setSelected({ type: "reference", id: info.fromId });
          } else {
            setSelected({ type: "section", id: info.fromId });
          }
        }
      }
      if (droppedOnTarget) {
        suppressRowClickRef.current = true;
        suppressNextViewportClick(CONNECT_CLICK_SUPPRESS_MS);
      } else {
        // No valid drop — keep origin selected so existing connectors stay visible.
        setSelected({ type: info?.fromType ?? type, id: info?.fromId ?? id });
      }
      connectDragExpandDocRef.current = null;
      connectRef.current = null;
      setConnect(null);
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", finishConnect);
      document.removeEventListener("pointercancel", finishConnect);
    };

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", finishConnect);
    document.addEventListener("pointercancel", finishConnect);
  };

  const visiblePaths = useMemo(() => {
    if (!pathFocus) return [];
    return paths.filter((path) =>
      path.kind === "source"
        ? sourceEdgeTouchesPathFocus(path.blockId, path.studySourceId, path.dataSource)
        : outlineEdgeTouchesPathFocus(path.edge),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paths, pathFocus]);

  const dimPeers = Boolean(selected) && visiblePaths.length > 0;

  const activeLink = useMemo((): ActiveLink | null => {
    if (pinnedLink?.kind === "source") {
      const edge = graph.edges.find((item) => item.sourceId === pinnedLink.sourceId);
      return edge
        ? {
            kind: "source",
            blockId: edge.blockId,
            studySourceId: edge.studySourceId,
            sourceId: edge.sourceId,
            role: edge.role,
            refLabel: edge.refLabel,
          }
        : null;
    }
    if (pinnedLink?.kind === "outline") {
      const edge = graph.outlineEdges.find(
        (item) =>
          item.toBlockId === pinnedLink.toBlockId &&
          item.refKind === pinnedLink.refKind &&
          item.refId === pinnedLink.refId,
      );
      return edge ? { kind: "outline", edge } : null;
    }
    if (highlightSection && highlightReference) {
      if (!graph.sectionToStudySources.get(highlightSection)?.has(highlightReference)) return null;
      const edge = graph.edges.find(
        (item) => item.blockId === highlightSection && item.studySourceId === highlightReference,
      );
      return edge
        ? {
            kind: "source",
            blockId: edge.blockId,
            studySourceId: edge.studySourceId,
            sourceId: edge.sourceId,
            role: edge.role,
            refLabel: edge.refLabel,
          }
        : null;
    }
    return null;
  }, [pinnedLink, highlightSection, highlightReference, graph]);

  const clearEdgeMenu = useCallback(() => {
    setPinnedLink(null);
    setHoverEdge(null);
    setEdgeMenuPathKey(null);
  }, []);

  const clearLinkSelection = useCallback(() => {
    clearEdgeMenu();
    setSelected(null);
    setHovered(null);
    onClearTrace?.();
  }, [clearEdgeMenu, onClearTrace]);

  const removePath = useCallback(
    (path: EdgePath) => {
      const losesLastSourceEdge =
        path.kind === "source" &&
        ((selected?.type === "section" &&
          selected.id === path.blockId &&
          graph.edges.filter(
            (edge) => edge.blockId === path.blockId && edge.sourceId !== path.sourceId,
          ).length === 0) ||
          (selected?.type === "reference" &&
            selected.id === path.studySourceId &&
            graph.edges.filter(
              (edge) =>
                edge.studySourceId === path.studySourceId && edge.sourceId !== path.sourceId,
            ).length === 0));

      if (path.kind === "source") {
        onUnmapPlacement(path.blockId, path.sourceId);
        if (
          tracedPlacement?.blockId === path.blockId &&
          tracedPlacement?.sourceId === path.sourceId
        ) {
          onClearTrace?.();
        }
      } else {
        onUnmapOutlineRef(path.edge.toBlockId, path.edge.sourceId);
      }
      clearEdgeMenu();
      if (losesLastSourceEdge) {
        setSelected(null);
        setHovered(null);
      }
    },
    [onUnmapPlacement, onUnmapOutlineRef, onClearTrace, tracedPlacement, clearEdgeMenu, graph.edges, selected],
  );

  const updatePathRole = useCallback(
    (path: EdgePath, role: SourceRole) => {
      if (path.kind === "source") {
        onUpdatePlacementRole(path.blockId, path.sourceId, role);
      } else {
        onUpdateOutlineRefRole(path.edge.toBlockId, path.edge.sourceId, role);
      }
      setEdgeMenuPathKey(null);
      setPinnedLink(null);
      suppressNextViewportClick(CONNECT_CLICK_SUPPRESS_MS);
    },
    [onUpdatePlacementRole, onUpdateOutlineRefRole, suppressNextViewportClick],
  );

  const removeActiveLink = useCallback(() => {
    if (!activeLink) return;
    if (activeLink.kind === "source") {
      onUnmapPlacement(activeLink.blockId, activeLink.sourceId);
    } else {
      onUnmapOutlineRef(activeLink.edge.toBlockId, activeLink.edge.sourceId);
    }
    clearLinkSelection();
  }, [activeLink, onUnmapPlacement, onUnmapOutlineRef, clearLinkSelection]);

  useEffect(() => {
    if (!activeLink) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement).tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        removeActiveLink();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeLink, removeActiveLink]);

  const selectFromPath = (path: EdgePath) => {
    pinFromPath(path, setPinnedLink, setSelected);
    setEdgeMenuPathKey((prev) => (prev === path.key ? null : path.key));
  };

  const leftGroups = useMemo(() => {
    const groups: {
      id: string;
      heading: HeadingNode | null;
      sections: SectionNode[];
    }[] = [];
    let current: {
      id: string;
      heading: HeadingNode | null;
      sections: SectionNode[];
    } | null = null;

    for (const item of graph.leftItems) {
      if (item.kind === "heading") {
        if (current) groups.push(current);
        current = { id: item.node.headingId, heading: item.node, sections: [] };
      } else {
        if (!current) {
          current = { id: item.node.blockId, heading: null, sections: [] };
        }
        current.sections.push(item.node);
      }
    }
    if (current) groups.push(current);
    return groups;
  }, [graph.leftItems]);

  const sourceRefCount = visibleStudySourceIds.size;

  const outlineCount = visibleOutlineBlockIds.size;

  const commitPendingConnect = (role: SourceRole) => {
    if (!pendingConnect) return;
    suppressNextViewportClick(CONNECT_CLICK_SUPPRESS_MS);
    setEdgeMenuPathKey(null);
    setPinnedLink(null);
    const { origin } = pendingConnect;
    const keepOriginSelected = () => {
      setSelected({ type: origin.type, id: origin.id });
      setHovered(null);
    };
    if (pendingConnect.kind === "source") {
      const { blockId, studySourceId } = pendingConnect;
      onMapStudySource(blockId, studySourceId, role);
      keepOriginSelected();
      for (const group of graph.sourceCatalog) {
        for (const entry of group.entries) {
          if (entry.kind === "document") {
            if (entry.doc.references.some((ref) => ref.studySourceId === studySourceId)) {
              setExpandedDocs((prev) => new Set(prev).add(entry.doc.dataSource));
            }
          }
        }
      }
    } else {
      const label =
        pendingConnect.refKind === "section"
          ? graph.leftItems.find(
              (i) => i.kind === "section" && i.node.blockId === pendingConnect.refId,
            )
          : graph.leftItems.find(
              (i) => i.kind === "heading" && i.node.headingId === pendingConnect.refId,
            );
      const refLabel =
        label?.kind === "section"
          ? label.node.title
          : label?.kind === "heading"
            ? label.node.label
            : "";
      const payload: OutlineRefPayload = {
        kind: "outline-ref",
        sourceType: pendingConnect.refKind === "section" ? "SUBCONTENT" : "CONTENT",
        label: refLabel,
        ...(pendingConnect.refKind === "section"
          ? { fromBlockId: pendingConnect.refId }
          : { fromHeadingId: pendingConnect.refId }),
      };
      onMapOutlineRef(pendingConnect.toBlockId, payload, role);
      keepOriginSelected();
    }
    setPendingConnect(null);
  };

  useEffect(() => {
    if (!pendingConnect) return;
    suppressNextViewportClick(CONNECT_CLICK_SUPPRESS_MS);
    setSelected({ type: pendingConnect.origin.type, id: pendingConnect.origin.id });
    setHovered(null);
  }, [pendingConnect, suppressNextViewportClick]);

  const blockTitle = useCallback(
    (blockId: string) => {
      const block = blocks.find((b) => b.id === blockId);
      if (!block || block.type === "pageBreak") return "";
      if (block.type === "heading") {
        return `${block.number ? `${block.number} ` : ""}${block.title}`;
      }
      return block.title;
    },
    [blocks],
  );

  return (
    <div
      className="connector-variant flex h-full min-h-0 w-full flex-col pt-2"
      data-connecting={isConnecting ? "true" : undefined}
    >
      {activeLink && (
        <div className="connector-toolbar mb-2 shrink-0 px-4 lg:px-4">
          <div className="flex w-full flex-wrap items-center gap-2 rounded-lg border border-[#ece8ea] bg-white px-3 py-2 shadow-sm">
            <span className="text-[12px] font-medium text-[#636161]">
              {activeLink.kind === "outline" ? "Outline link" : "Document link"}
            </span>
            {activeLink.kind === "outline" && (
              <span className="max-w-[240px] truncate text-[12px] text-[#454545]">
                {activeLink.edge.refLabel} → {blockTitle(activeLink.edge.toBlockId)}
              </span>
            )}
            {activeLink.kind === "source" && (
              <span className="max-w-[280px] truncate text-[12px] text-[#454545]">
                {activeLink.refLabel} → {blockTitle(activeLink.blockId)}
              </span>
            )}
            <ConnectorRolePicker
              role={activeLink.kind === "outline" ? activeLink.edge.role : activeLink.role}
              onSelectRole={(role) => {
                if (activeLink.kind === "outline") {
                  onUpdateOutlineRefRole(
                    activeLink.edge.toBlockId,
                    activeLink.edge.sourceId,
                    role,
                  );
                } else {
                  onUpdatePlacementRole(activeLink.blockId, activeLink.sourceId, role);
                }
              }}
            />
            <div className="ml-auto flex items-center gap-2">
              {activeLink.kind === "outline" && (
                <button
                  type="button"
                  onClick={() => {
                    const focus: Focus =
                      activeLink.edge.refKind === "section"
                        ? { type: "section", id: activeLink.edge.refId }
                        : { type: "heading", id: activeLink.edge.refId };
                    setSelected(focus);
                  }}
                  className="text-[12px] font-medium text-[#4f46e5] hover:underline"
                >
                  Go to reference
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (activeLink.kind === "outline") {
                    onTracePlacement(activeLink.edge.toBlockId, activeLink.edge.sourceId);
                  } else {
                    onTracePlacement(activeLink.blockId, activeLink.sourceId);
                  }
                }}
                className="text-[12px] font-medium text-[#2b5bd7] hover:underline"
              >
                Trace mapping
              </button>
              <button
                type="button"
                onClick={removeActiveLink}
                className="flex items-center gap-1 rounded-md border border-[#d4ced3] bg-white px-2 py-1 text-[12px] font-medium text-[#9a1c12] transition-colors hover:border-[#fe9591] hover:bg-[#fff5f5]"
              >
                <X size={13} strokeWidth={2} />
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        ref={connectorViewportRef}
        data-connector-viewport=""
        className={`connector-viewport relative min-h-0 flex-1 w-full overflow-visible ${
          isConnecting ? "select-none" : ""
        }`}
        onClick={(event) => {
          if (suppressViewportClickRef.current) return;
          const target = event.target as Element;
          if (!shouldClearSelectionFromClick(target)) return;
          if (dismissOverlay()) return;
          clearSelection();
        }}
        onPointerMove={handleViewportPointerMove}
        onPointerLeave={handleViewportPointerLeave}
      >
        <svg className="absolute inset-0 z-[2] h-full w-full overflow-hidden pointer-events-none">
          <g className="pointer-events-none">
            {visiblePaths.map((path) => {
              const isHover = hoverEdge === path.key || edgeMenuPathKey === path.key;
              const stroke = pathStroke(path, isHover);
              const proposed =
                path.kind === "source" ? path.hasProposed : path.edge.hasProposed;
              const isOutline = path.kind === "outline";
              return (
                <path
                  key={path.key}
                  d={path.d}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  stroke={stroke}
                  strokeWidth={isOutline ? (isHover ? 2 : 1.75) : isHover ? 2.5 : 2}
                  strokeOpacity={1}
                  strokeDasharray={proposed ? "5 3" : undefined}
                />
              );
            })}

            {visiblePaths.map((path) => {
              const dotFill = pathStroke(path, false);
              return (
                <g key={`dot-${path.key}`}>
                  <circle cx={path.x1} cy={path.y1} r={3} fill={dotFill} />
                  <circle cx={path.x2} cy={path.y2} r={3} fill={dotFill} />
                </g>
              );
            })}

            {connect && (() => {
              const outlineSnap =
                connect.fromAnchor === "left" &&
                connect.targetId &&
                connect.targetType &&
                isLeftKind(connect.fromType) &&
                isLeftKind(connect.targetType);
              if (outlineSnap) {
                const v = connectorViewportRef.current?.getBoundingClientRect();
                if (v) {
                  const fromPt = connectEndpoint(
                    connect.fromType,
                    connect.fromId,
                    "left",
                    v,
                    secRefs,
                    headRefs,
                    refRefs,
                  );
                  const toPt = connectEndpoint(
                    connect.targetType!,
                    connect.targetId!,
                    "left",
                    v,
                    secRefs,
                    headRefs,
                    refRefs,
                  );
                  if (fromPt && toPt) {
                    const built = buildOutlineEdgePath(
                      fromPt.x + OUTLINE_ROW_ANCHOR_INSET,
                      fromPt.y,
                      toPt.x + OUTLINE_ROW_ANCHOR_INSET,
                      toPt.y,
                    );
                    return (
                      <path
                        d={built.d}
                        fill="none"
                        stroke="#4338ca"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    );
                  }
                }
              }
              const outlineDrag =
                isLeftKind(connect.fromType) && connect.fromAnchor === "left";
              return (
                <path
                  d={`M${connect.fromX},${connect.fromY} C${
                    connect.fromX + Math.max(48, (connect.x - connect.fromX) / 2)
                  },${connect.fromY} ${
                    connect.x - Math.max(48, (connect.x - connect.fromX) / 2)
                  },${connect.y} ${connect.x},${connect.y}`}
                  fill="none"
                  stroke={
                    connect.targetId
                      ? outlineDrag
                        ? "#4338ca"
                        : "#e64641"
                      : outlineDrag
                        ? "#6366f1"
                        : "#ff4e49"
                  }
                  strokeWidth={connect.targetId ? 2.5 : 2}
                  strokeLinecap="round"
                  strokeDasharray={connect.targetId ? undefined : "6 4"}
                  strokeOpacity={connect.targetId ? 1 : 0.8}
                />
              );
            })()}

            {pendingConnect &&
              connectorViewportRef.current &&
              (() => {
                const preview = buildPendingConnectPreview(
                  pendingConnect,
                  connectorViewportRef.current,
                  secRefs,
                  headRefs,
                  refRefs,
                );
                if (!preview) return null;
                return (
                  <path
                    d={preview.d}
                    fill="none"
                    stroke={preview.stroke}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="5 3"
                    strokeOpacity={1}
                  />
                );
              })()}
          </g>

        </svg>

        <svg className="absolute inset-0 z-[3] h-full w-full overflow-visible pointer-events-none">
          {!isConnecting &&
            visiblePaths.map((path) => (
              <path
                key={`hit-${path.key}`}
                data-connector-edge-hit=""
                d={path.d}
                fill="none"
                stroke="transparent"
                strokeWidth={14}
                className="pointer-events-auto"
                style={{ cursor: "pointer" }}
                onMouseEnter={() => scheduleEdgeHover(path.key)}
                onMouseLeave={() => {
                  if (edgeMenuPathKey === path.key) return;
                  scheduleClearEdgeHover(path.key);
                }}
                onClick={(event) => {
                  event.stopPropagation();
                  selectFromPath(path);
                }}
              >
                <title>Click to manage this connection</title>
              </path>
            ))}
        </svg>

        {visiblePaths.map((path) => {
          const role = pathEdgeRole(path);
          const mx = path.kind === "outline" ? path.labelX : (path.x1 + path.x2) / 2;
          const my = path.kind === "outline" ? path.labelY : (path.y1 + path.y2) / 2;
          const menuAlign = edgeMenuAlign(
            mx,
            connectorViewportRef.current?.clientWidth ?? 1000,
          );
          return (
            <EdgeAnchorMenu
              key={`edge-menu-${path.key}`}
              anchorX={mx}
              anchorY={my}
              menuAlign={menuAlign}
              role={role}
              menuOpen={edgeMenuPathKey === path.key}
              elevated={
                edgeMenuPathKey === path.key ||
                hoverEdge === path.key ||
                pathMatchesPinned(path, pinnedLink)
              }
              onToggleMenu={() => {
                if (edgeMenuPathKey === path.key) {
                  setEdgeMenuPathKey(null);
                  return;
                }
                pinFromPath(path, setPinnedLink, setSelected);
                setEdgeMenuPathKey(path.key);
              }}
              onSelectRole={(nextRole) => updatePathRole(path, nextRole)}
              onRemove={() => removePath(path)}
            />
          );
        })}

        {pendingConnect && !edgeMenuPathKey && connectorViewportRef.current && (() => {
          const anchor = pendingConnectAnchor(
            pendingConnect,
            connectorViewportRef.current,
            secRefs,
            headRefs,
            refRefs,
          );
          return (
            <EdgeAnchorMenu
              anchorX={anchor.x}
              anchorY={anchor.y}
              menuAlign={edgeMenuAlign(
                anchor.x,
                connectorViewportRef.current.clientWidth,
              )}
              menuOpen
              elevated
              title={
                pendingConnect.kind === "outline" ? "Set outline role" : "Set source role"
              }
              onSelectRole={(role) => commitPendingConnect(role)}
            />
          );
        })()}

        <div className="connector-column connector-column--outline relative z-[1]">
          <div className="connector-column-shell">
            <div className="connector-column-chrome">
              <ColumnHeader
                label="Outline"
                count={outlineCount}
                selected={selectionLabel === "outline"}
              />
              <ColumnSearch
                value={outlineQuery}
                onChange={setOutlineQuery}
                placeholder="Search outline"
              />
            </div>
            <div
              ref={sectionsScrollRef}
              className="connector-column-scroll"
              onScroll={markColumnScrolling}
            >
              <div className="connector-column-body connector-column-content">
              {leftGroups.map((group) => {
                const headingVisible = group.heading ? headingMatchesQuery(group.heading) : false;
                const visibleSections = group.sections.filter(sectionMatchesQuery);
                if (!headingVisible && visibleSections.length === 0) return null;

                return (
                  <div key={group.id} className="connector-group">
                    <div className="connector-group-items">
                      {group.heading && headingVisible && (
                        <HeadingRow
                          node={group.heading}
                          rowRef={(el) => {
                            headRefs.current[group.heading!.headingId] = el;
                          }}
                          dimmed={
                            dimPeers &&
                            !outlineNodeHighlighted("heading", group.heading.headingId)
                          }
                          highlighted={outlineNodeHighlighted("heading", group.heading.headingId)}
                          selected={selectedHeading === group.heading.headingId}
                          isTraced={tracedPlacement?.blockId === group.heading.headingId}
                          isTarget={
                            connect?.targetType === "heading" &&
                            connect.targetId === group.heading.headingId
                          }
                          onEnter={() =>
                            setRowHover({ type: "heading", id: group.heading!.headingId })
                          }
                          onLeave={scheduleClearRowHover}
                          onClick={() =>
                            pinSelect({ type: "heading", id: group.heading!.headingId })
                          }
                        />
                      )}
                      {visibleSections.length > 0 && (
                        <div
                          className={
                            group.heading && headingVisible
                              ? "connector-group-items connector-group-items--sections"
                              : "connector-group-items"
                          }
                        >
                          {visibleSections.map((node) => (
                            <SectionRow
                              key={node.blockId}
                              node={node}
                              rowRef={(el) => {
                                secRefs.current[node.blockId] = el;
                              }}
                              connecting={isConnecting}
                              dimmed={dimPeers && !outlineNodeHighlighted("section", node.blockId)}
                              highlighted={outlineNodeHighlighted("section", node.blockId)}
                              selected={selectedSection === node.blockId}
                              isTraced={tracedPlacement?.blockId === node.blockId}
                              isTarget={
                                connect?.targetType === "section" &&
                                connect.targetId === node.blockId
                              }
                              isDragSource={
                                connect?.fromType === "section" &&
                                connect.fromId === node.blockId &&
                                connect.fromAnchor === "right"
                              }
                              isOutlineDragSource={
                                connect?.fromType === "section" &&
                                connect.fromId === node.blockId &&
                                connect.fromAnchor === "left"
                              }
                              onEnter={() => setRowHover({ type: "section", id: node.blockId })}
                              onLeave={scheduleClearRowHover}
                              onClick={() => pinSelect({ type: "section", id: node.blockId })}
                              onSourceConnectStart={(event) =>
                                startConnect("section", node.blockId, event, "right")
                              }
                              onOutlineConnectStart={(event) =>
                                startConnect("section", node.blockId, event, "left")
                              }
                            />
                          ))}
                        </div>
                      )}
                      {!group.heading && visibleSections.length === 0 && (
                        <p className="connector-group-empty">No outline rows</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          </div>
        </div>

        <div className="connector-column connector-column--sources relative z-[1]">
          <div className="connector-column-shell">
            <div className="connector-column-chrome">
              <ColumnHeader
                label="Sources"
                count={sourceRefCount}
                selected={selectionLabel === "source"}
              />
              <ColumnSearch
                value={sourceQuery}
                onChange={setSourceQuery}
                placeholder="Search sources"
              />
              <SourceCategoryFilters
                categories={graph.categories}
                visibleCategories={visibleCategories}
                onToggle={toggleCategory}
              />
            </div>
            <div
              ref={sourcesScrollRef}
              className="connector-column-scroll"
              onScroll={markColumnScrolling}
            >
              <div className="connector-column-body connector-column-content">
              {graph.sourceCatalog.map((group) => {
                const visibleEntries: (typeof group.entries)[number][] = [];
                for (const entry of group.entries) {
                  if (entry.kind === "standalone") {
                    if (isReferenceVisible(entry.ref)) visibleEntries.push(entry);
                    continue;
                  }
                  if (!isDocVisible(entry.doc)) continue;
                  const refs = entry.doc.references.filter((ref) => isReferenceVisible(ref));
                  if (refs.length > 0) {
                    visibleEntries.push({
                      kind: "document",
                      doc: { ...entry.doc, references: refs },
                    });
                  }
                }
                if (visibleEntries.length === 0) return null;

                return (
                  <div key={group.category} className="connector-group connector-group--category">
                    <p className="connector-group-label">
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${
                          CATEGORY_DOT[group.category] ?? "bg-[#bdbdbd]"
                        }`}
                      />
                      {group.category}
                    </p>
                    <div className="connector-group-items">
                      {visibleEntries.map((entry) => {
                        if (entry.kind === "standalone") {
                          return (
                            <ReferenceRow
                              key={entry.ref.studySourceId}
                              node={entry.ref}
                              rowRef={(el) => {
                                refRefs.current[entry.ref.studySourceId] = el;
                              }}
                              connecting={isConnecting}
                              dimmed={dimPeers && !referenceHighlighted(entry.ref.studySourceId)}
                              highlighted={referenceRowFocused(entry.ref.studySourceId)}
                              selected={selectedReference === entry.ref.studySourceId}
                              isTraced={tracedStudySourceId === entry.ref.studySourceId}
                              isTarget={
                                connect?.targetType === "reference" &&
                                connect.targetId === entry.ref.studySourceId
                              }
                              isDragSource={
                                connect?.fromType === "reference" &&
                                connect.fromId === entry.ref.studySourceId
                              }
                              onEnter={() =>
                                setRowHover({ type: "reference", id: entry.ref.studySourceId })
                              }
                              onLeave={scheduleClearRowHover}
                              onClick={() => pinSelect({ type: "reference", id: entry.ref.studySourceId })}
                              onConnectStart={(event) =>
                                startConnect("reference", entry.ref.studySourceId, event)
                              }
                            />
                          );
                        }

                        const expanded = expandedDocsEffective.has(entry.doc.dataSource);
                        const visibleRefs = entry.doc.references;
                        return (
                          <div key={entry.doc.dataSource} className="connector-source-doc">
                            <DocHeaderRow
                              doc={entry.doc}
                              expanded={expanded}
                              rowRef={(el) => {
                                docRefs.current[entry.doc.dataSource] = el;
                              }}
                              highlighted={documentRowFocused(entry.doc.dataSource)}
                              selected={selected?.type === "document" && selected.id === entry.doc.dataSource}
                              dimmed={dimPeers && !documentHighlighted(entry.doc.dataSource)}
                              onEnter={() =>
                                setRowHover({ type: "document", id: entry.doc.dataSource })
                              }
                              onLeave={scheduleClearRowHover}
                              onToggle={() => toggleDocExpanded(entry.doc.dataSource)}
                              onSelect={() => pinSelectDocument(entry.doc.dataSource)}
                            />
                            {expanded &&
                              visibleRefs.map((ref) => (
                                <ReferenceRow
                                  key={ref.studySourceId}
                                  node={ref}
                                  nested
                                  rowRef={(el) => {
                                    refRefs.current[ref.studySourceId] = el;
                                  }}
                                  connecting={isConnecting}
                                  dimmed={
                                    dimPeers &&
                                    !referenceHighlighted(ref.studySourceId, entry.doc.dataSource)
                                  }
                                  highlighted={referenceRowFocused(ref.studySourceId)}
                                  selected={selectedReference === ref.studySourceId}
                                  isTraced={tracedStudySourceId === ref.studySourceId}
                                  isTarget={
                                    connect?.targetType === "reference" &&
                                    connect.targetId === ref.studySourceId
                                  }
                                  isDragSource={
                                    connect?.fromType === "reference" &&
                                    connect.fromId === ref.studySourceId
                                  }
                                  onEnter={() =>
                                    setRowHover({ type: "reference", id: ref.studySourceId })
                                  }
                                  onLeave={scheduleClearRowHover}
                                  onClick={() => pinSelect({ type: "reference", id: ref.studySourceId })}
                                  onConnectStart={(event) =>
                                    startConnect("reference", ref.studySourceId, event)
                                  }
                                />
                              ))}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ColumnSearch({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative mb-1.5 shrink-0">
      <Search
        size={14}
        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9e9e9e]"
      />
      <input
        type="text"
        data-connector-no-deselect=""
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-[#d4ced3] bg-white py-1 pl-8 pr-2 text-[12px] text-[#302f2f] placeholder:text-[#9e9e9e] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff4e49]/30"
      />
    </div>
  );
}

function SourceCategoryFilters({
  categories,
  visibleCategories,
  onToggle,
}: {
  categories: string[];
  visibleCategories: Set<string>;
  onToggle: (category: string) => void;
}) {
  return (
    <div className="mb-1.5 flex shrink-0 flex-wrap items-center gap-1">
      {categories.map((category) => {
        const on = visibleCategories.has(category);
        return (
          <button
            key={category}
            type="button"
            data-connector-no-deselect=""
            aria-pressed={on}
            onClick={() => onToggle(category)}
            className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors ${
              on
                ? "border-[#d4ced3] bg-white text-[#454545]"
                : "border-[#d4ced3] bg-[#f5f5f5] text-[#b0b0b0]"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                on ? CATEGORY_DOT[category] ?? "bg-[#bdbdbd]" : "bg-[#d4d4d4]"
              }`}
            />
            {category}
          </button>
        );
      })}
    </div>
  );
}

function ColumnHeader({
  label,
  count,
  selected = false,
}: {
  label: string;
  count: number;
  selected?: boolean;
}) {
  return (
    <div className="connector-column-head">
      <span className="connector-column-head-label flex items-center gap-1.5">
        {label}
        {selected && (
          <span className="rounded bg-[#fff5f5] px-1.5 py-0.5 text-[10px] font-medium normal-case tracking-normal text-[#9a1c12] ring-1 ring-[#fe9591]/30">
            Selected
          </span>
        )}
      </span>
      <span className="connector-column-head-count">{count}</span>
    </div>
  );
}

function nodeClasses(
  highlighted: boolean,
  selected: boolean,
  dimmed: boolean,
  isTarget: boolean,
  isTraced: boolean,
  variant: "default" | "heading" = "default",
): string {
  const parts = [
    "connector-node",
    "relative",
    "flex",
    "cursor-pointer",
    "items-center",
    "rounded-md",
    "transition-colors",
  ];
  if (variant === "heading") parts.push("connector-node--heading");
  if (isTraced) parts.push("is-traced");
  else if (isTarget) parts.push("is-target");
  else if (selected) parts.push("is-selected");
  else if (highlighted) {
    parts.push(variant === "heading" ? "is-highlighted-outline" : "is-highlighted");
  } else if (dimmed) parts.push("is-dimmed");
  return parts.join(" ");
}

function EdgeAnchorMenu({
  anchorX,
  anchorY,
  role,
  menuOpen,
  menuAlign = "center",
  elevated = false,
  title,
  onToggleMenu,
  onSelectRole,
  onRemove,
}: {
  anchorX: number;
  anchorY: number;
  role?: SourceRole;
  menuOpen: boolean;
  menuAlign?: EdgeMenuAlign;
  elevated?: boolean;
  title?: string;
  onToggleMenu?: () => void;
  onSelectRole: (role: SourceRole) => void;
  onRemove?: () => void;
}) {
  const tagClass = role ? ROLE_BADGE[role] : "border-[#d4ced3] bg-white text-[#636161]";
  const anchorTransform =
    menuAlign === "start"
      ? "translate(0, -50%)"
      : menuAlign === "end"
        ? "translate(-100%, -50%)"
        : "translate(-50%, -50%)";
  const dropdownClass =
    menuAlign === "start"
      ? "left-0"
      : menuAlign === "end"
        ? "right-0"
        : "left-1/2 -translate-x-1/2";

  return (
    <div
      data-connector-edge-menu=""
      className={`pointer-events-none absolute ${elevated || menuOpen ? "z-[60]" : "z-[15]"}`}
      style={{ left: anchorX, top: anchorY, transform: anchorTransform }}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <div
        className={`pointer-events-auto flex items-stretch overflow-hidden rounded-full border shadow-sm ${tagClass}`}
      >
        {onToggleMenu ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onToggleMenu();
            }}
            className="px-1.5 py-0.5 text-[10px] font-semibold transition-colors hover:opacity-90"
            title="Change role"
          >
            {role ? roleLabel(role) : "Role"}
          </button>
        ) : (
          <span className="px-1.5 py-0.5 text-[10px] font-semibold">
            {role ? roleLabel(role) : "Role"}
          </span>
        )}
        {onRemove && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onRemove();
            }}
            onMouseDown={(event) => event.stopPropagation()}
            className="flex items-center border-l border-current/20 px-1 py-0.5 transition-colors hover:bg-black/5"
            title="Remove connection"
            aria-label="Remove connection"
          >
            <X size={11} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {menuOpen && (
        <div
          className={`pointer-events-auto absolute top-[calc(100%+8px)] z-[70] w-max rounded-lg border border-[#d4ced3] bg-white p-2.5 shadow-lg ${dropdownClass}`}
        >
          {title && <p className="mb-2 text-[11px] font-medium text-[#636161]">{title}</p>}
          <ConnectorRolePicker role={role} onSelectRole={onSelectRole} />
        </div>
      )}
    </div>
  );
}

function ConnectorRolePicker({
  role,
  onSelectRole,
}: {
  role?: SourceRole;
  onSelectRole: (role: SourceRole) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {SOURCE_ROLES.map((option) => {
        const selected = role === option;
        return (
          <button
            key={option}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onSelectRole(option);
            }}
            onMouseDown={(event) => event.stopPropagation()}
            className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold transition-colors ${
              selected
                ? ROLE_BADGE[option]
                : `${ROLE_BADGE_PICKER[option]} hover:border-opacity-60 hover:bg-opacity-70`
            }`}
          >
            {roleLabel(option)}
          </button>
        );
      })}
    </div>
  );
}

function CountBadge({ n, proposed }: { n: number; proposed: number }) {
  if (n === 0 && proposed === 0) return null;
  return (
    <span className="flex shrink-0 items-center gap-1">
      {proposed > 0 && (
        <span title={`${proposed} need review`} className="h-1.5 w-1.5 rounded-full bg-[#f0a020]" />
      )}
      <span className="rounded-full bg-[#f5f5f5] px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-[#9e9e9e]">
        {n}
      </span>
    </span>
  );
}

function ConnectHandle({
  side,
  connecting,
  handleVisible = false,
  isDragSource = false,
  tone = "source",
  onPointerDown,
}: {
  side: "left" | "right";
  connecting: boolean;
  handleVisible?: boolean;
  isDragSource?: boolean;
  tone?: "source" | "outline";
  onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => void;
}) {
  const outline = tone === "outline";
  const show = connecting || handleVisible || isDragSource;
  return (
    <button
      type="button"
      data-connector-connect-handle=""
      data-connector-connect-tone={outline ? "outline" : "source"}
      data-connector-no-deselect=""
      onPointerDown={(event) => {
        event.stopPropagation();
        onPointerDown(event);
      }}
      onClick={(event) => event.stopPropagation()}
      aria-label={outline ? "Drag to link outline rows" : "Drag to connect source"}
      title={outline ? "Drag + to link within outline" : "Drag + to connect source"}
      style={{ touchAction: "none" }}
      className={`connector-connect-handle absolute top-1/2 z-10 flex h-5 w-5 -translate-y-1/2 cursor-crosshair items-center justify-center rounded-full border-2 bg-white shadow transition-[opacity,transform,box-shadow] duration-150 ${
        outline
          ? "connector-connect-handle--outline border-indigo-500 border-dashed text-indigo-600"
          : "border-[#ff4e49] text-[#ff4e49]"
      } ${side === "right" ? "-right-2" : "-left-2"} ${
        show ? "scale-100 opacity-100" : "scale-90 opacity-0 group-hover:scale-100 group-hover:opacity-100"
      } ${handleVisible ? "connector-connect-handle--selected" : ""} ${
        isDragSource ? "connector-connect-handle--dragging" : ""
      }`}
    >
      <Plus size={12} strokeWidth={2.5} />
    </button>
  );
}

function HeadingRow({
  node,
  rowRef,
  dimmed,
  highlighted,
  selected,
  isTarget,
  isTraced,
  onEnter,
  onLeave,
  onClick,
}: {
  node: HeadingNode;
  rowRef: (el: HTMLDivElement | null) => void;
  dimmed: boolean;
  highlighted: boolean;
  selected: boolean;
  isTarget: boolean;
  isTraced: boolean;
  onEnter: () => void;
  onLeave: (event: React.MouseEvent) => void;
  onClick: () => void;
}) {
  return (
    <div
      ref={rowRef}
      data-node-kind="heading"
      data-node-id={node.headingId}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onClick={onClick}
      className={`group ${nodeClasses(
        highlighted,
        selected,
        dimmed,
        isTarget,
        isTraced,
        "heading",
      )}`}
    >
      <span className="connector-heading-label min-w-0 flex-1 truncate">
        {node.label}
      </span>
      <CountBadge n={node.outlineInCount} proposed={node.proposedCount} />
    </div>
  );
}

function SectionRow({
  node,
  rowRef,
  connecting,
  dimmed,
  highlighted,
  selected,
  isTarget,
  isTraced,
  isDragSource = false,
  isOutlineDragSource = false,
  onEnter,
  onLeave,
  onClick,
  onSourceConnectStart,
  onOutlineConnectStart,
}: {
  node: SectionNode;
  rowRef: (el: HTMLDivElement | null) => void;
  connecting: boolean;
  dimmed: boolean;
  highlighted: boolean;
  selected: boolean;
  isTarget: boolean;
  isTraced: boolean;
  isDragSource?: boolean;
  isOutlineDragSource?: boolean;
  onEnter: () => void;
  onLeave: (event: React.MouseEvent) => void;
  onClick: () => void;
  onSourceConnectStart: (event: React.PointerEvent<HTMLButtonElement>) => void;
  onOutlineConnectStart: (event: React.PointerEvent<HTMLButtonElement>) => void;
}) {
  const linkCount = node.sourceCount + node.outlineInCount;
  const handleVisible = selected || highlighted || isTarget;
  return (
    <div
      ref={rowRef}
      data-node-kind="section"
      data-node-id={node.blockId}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onClick={onClick}
      className={`group connector-node--section ${nodeClasses(
        highlighted,
        selected,
        dimmed,
        isTarget,
        isTraced,
      )}`}
    >
      <ConnectHandle
        side="left"
        connecting={connecting}
        tone="outline"
        handleVisible={handleVisible}
        isDragSource={isOutlineDragSource}
        onPointerDown={onOutlineConnectStart}
      />
      <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-[#302f2f]">
        {node.title}
      </span>
      <CountBadge n={linkCount} proposed={node.proposedCount} />
      <ConnectHandle
        side="right"
        connecting={connecting}
        handleVisible={handleVisible}
        isDragSource={isDragSource}
        onPointerDown={onSourceConnectStart}
      />
    </div>
  );
}

function DocHeaderRow({
  doc,
  expanded,
  rowRef,
  highlighted,
  selected = false,
  dimmed,
  onEnter,
  onLeave,
  onToggle,
  onSelect,
}: {
  doc: SourceDocNode;
  expanded: boolean;
  rowRef: (el: HTMLDivElement | null) => void;
  highlighted: boolean;
  selected?: boolean;
  dimmed: boolean;
  onEnter: () => void;
  onLeave: (event: React.MouseEvent) => void;
  onToggle: () => void;
  onSelect: () => void;
}) {
  return (
    <div
      ref={rowRef}
      data-node-kind="document"
      data-node-id={doc.dataSource}
      data-connector-no-deselect=""
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className={`connector-doc-header flex items-center rounded-md transition-colors ${
        highlighted || selected
          ? "bg-[#fff5f5] ring-1 ring-[#fe9591]/35"
          : "hover:bg-[#f5f5f5]"
      } ${dimmed ? "opacity-40" : ""}`}
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onToggle();
        }}
        className="flex shrink-0 items-center justify-center rounded p-0.5 hover:bg-black/5"
        aria-expanded={expanded}
        aria-label={expanded ? "Collapse document" : "Expand document"}
      >
        <ChevronRight
          size={13}
          className={`shrink-0 text-[#9e9e9e] transition-transform ${expanded ? "rotate-90" : ""}`}
        />
      </button>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onSelect();
        }}
        className="min-w-0 flex-1 truncate text-left text-[12px] font-semibold text-[#454545] hover:underline"
      >
        {doc.label}
      </button>
      <CountBadge n={doc.sectionCount} proposed={doc.proposedCount} />
      <span className="shrink-0 text-[10px] tabular-nums text-[#bdbdbd]">
        {doc.references.length}
      </span>
    </div>
  );
}

function ReferenceRow({
  node,
  rowRef,
  connecting,
  dimmed,
  highlighted,
  selected,
  isTarget,
  isTraced,
  isDragSource = false,
  nested = false,
  onEnter,
  onLeave,
  onClick,
  onConnectStart,
}: {
  node: ReferenceNode;
  rowRef: (el: HTMLDivElement | null) => void;
  connecting: boolean;
  dimmed: boolean;
  highlighted: boolean;
  selected: boolean;
  isTarget: boolean;
  isTraced: boolean;
  isDragSource?: boolean;
  nested?: boolean;
  onEnter: () => void;
  onLeave: (event: React.MouseEvent) => void;
  onClick: () => void;
  onConnectStart: (event: React.PointerEvent<HTMLButtonElement>) => void;
}) {
  return (
    <div
      ref={rowRef}
      data-node-kind="reference"
      data-node-id={node.studySourceId}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onClick={onClick}
      className={`group ${nested ? "connector-node--nested" : ""} ${nodeClasses(
        highlighted,
        selected,
        dimmed,
        isTarget,
        isTraced,
      )}`}
    >
      <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-[#302f2f]">
        {node.label}
        {node.pageRef && (
          <span className="ml-1.5 text-[10px] font-normal text-[#9e9e9e]">{node.pageRef}</span>
        )}
      </span>
      <CountBadge n={node.sectionCount} proposed={node.proposedCount} />
      <ConnectHandle
        side="left"
        connecting={connecting}
        handleVisible={selected || highlighted || isTarget}
        isDragSource={isDragSource}
        onPointerDown={onConnectStart}
      />
    </div>
  );
}
