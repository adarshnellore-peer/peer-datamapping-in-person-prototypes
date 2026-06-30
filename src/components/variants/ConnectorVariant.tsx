import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import type { SourceRole } from "../../data/roadmap";
import type { DocumentBlock } from "../../types";
import {
  buildConnectorGraph,
  type SectionNode,
  type SourceNode,
} from "./connectorGraph";
import { CATEGORY_DOT } from "./types";

type NodeKind = "section" | "source";
type Focus = { type: NodeKind; id: string } | null;

type EdgePath = {
  key: string;
  d: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  blockId: string;
  dataSource: string;
  hasProposed: boolean;
};

type ConnectState = {
  fromType: NodeKind;
  fromId: string;
  fromX: number;
  fromY: number;
  x: number;
  y: number;
  targetId: string | null;
  targetType: NodeKind | null;
};

/**
 * V7 - Connector map. A bipartite view: every section once on the left, every
 * document once on the right. Connectors are revealed on demand - hover or
 * select a node to see just its lines (a "Show all" toggle exposes the full web
 * when wanted). Drag a node's handle onto the other column to map; click a
 * connector to remove it.
 */
export function ConnectorVariant({
  blocks,
  onMapDataSource,
  onUnmapDataSource,
}: {
  blocks: DocumentBlock[];
  onMapDataSource: (blockId: string, dataSource: string, role?: SourceRole) => void;
  onUnmapDataSource: (blockId: string, dataSource: string) => void;
}) {
  const graph = useMemo(() => buildConnectorGraph(blocks), [blocks]);

  const [visibleCategories, setVisibleCategories] = useState<Set<string>>(
    () => new Set(graph.categories),
  );
  const [selected, setSelected] = useState<Focus>(null);
  const [hovered, setHovered] = useState<Focus>(null);
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [hoverEdge, setHoverEdge] = useState<string | null>(null);
  const [connect, setConnect] = useState<ConnectState | null>(null);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const secRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const srcRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const connectRef = useRef<ConnectState | null>(null);
  const [paths, setPaths] = useState<EdgePath[]>([]);

  const isConnecting = connect !== null;
  const active = !isConnecting ? selected ?? hovered : null;
  const activeSection = active?.type === "section" ? active.id : null;
  const activeSource = active?.type === "source" ? active.id : null;

  const q = query.trim().toLowerCase();

  const isSourceVisible = (name: string) => {
    if (!visibleCategories.has(graph.sourceCategory.get(name) ?? "Document")) return false;
    if (q && !name.toLowerCase().includes(q)) return false;
    return true;
  };

  // Measure node anchors and build bezier paths; redraw on layout/filter change.
  useLayoutEffect(() => {
    const wrap = wrapperRef.current;
    if (!wrap) return;

    const measure = () => {
      const wrect = wrap.getBoundingClientRect();
      const next: EdgePath[] = [];
      for (const edge of graph.edges) {
        if (!isSourceVisible(edge.dataSource)) continue;
        const sEl = secRefs.current[edge.blockId];
        const tEl = srcRefs.current[edge.dataSource];
        if (!sEl || !tEl) continue;
        const sr = sEl.getBoundingClientRect();
        const tr = tEl.getBoundingClientRect();
        const x1 = sr.right - wrect.left;
        const y1 = sr.top + sr.height / 2 - wrect.top;
        const x2 = tr.left - wrect.left;
        const y2 = tr.top + tr.height / 2 - wrect.top;
        const dx = Math.max(40, (x2 - x1) / 2);
        next.push({
          key: `${edge.blockId}|${edge.dataSource}`,
          d: `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`,
          x1,
          y1,
          x2,
          y2,
          blockId: edge.blockId,
          dataSource: edge.dataSource,
          hasProposed: edge.hasProposed,
        });
      }
      setPaths(next);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph, visibleCategories, query]);

  const edgeTouchesActive = (blockId: string, dataSource: string) => {
    if (!active) return false;
    if (activeSection) return blockId === activeSection;
    return dataSource === activeSource;
  };

  const sectionHighlighted = (id: string) => {
    if (!active) return false;
    if (activeSection) return id === activeSection;
    return graph.sourceToSections.get(activeSource!)?.has(id) ?? false;
  };

  const sourceHighlighted = (name: string) => {
    if (!active) return false;
    if (activeSource) return name === activeSource;
    return graph.sectionToSources.get(activeSection!)?.has(name) ?? false;
  };

  const activeDegree = useMemo(() => {
    if (!active) return 0;
    if (active.type === "section") return graph.sectionToSources.get(active.id)?.size ?? 0;
    return graph.sourceToSections.get(active.id)?.size ?? 0;
  }, [active, graph]);

  const toggleCategory = (category: string) =>
    setVisibleCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });

  const toggleSelect = (focus: NonNullable<Focus>) => {
    if (isConnecting) return;
    setSelected((prev) =>
      prev && prev.type === focus.type && prev.id === focus.id ? null : focus,
    );
  };

  const startConnect = (
    type: NodeKind,
    id: string,
    event: React.PointerEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    const wrap = wrapperRef.current;
    const nodeEl = (type === "section" ? secRefs : srcRefs).current[id];
    if (!wrap || !nodeEl) return;
    const wr = wrap.getBoundingClientRect();
    const nr = nodeEl.getBoundingClientRect();
    const fromX = (type === "section" ? nr.right : nr.left) - wr.left;
    const fromY = nr.top + nr.height / 2 - wr.top;

    const initial: ConnectState = {
      fromType: type,
      fromId: id,
      fromX,
      fromY,
      x: fromX,
      y: fromY,
      targetId: null,
      targetType: null,
    };
    connectRef.current = initial;
    setConnect(initial);

    const onMove = (ev: PointerEvent) => {
      const w = wrapperRef.current?.getBoundingClientRect();
      if (!w) return;
      const x = ev.clientX - w.left;
      const y = ev.clientY - w.top;
      let targetId: string | null = null;
      let targetType: NodeKind | null = null;
      const el = (document.elementFromPoint(ev.clientX, ev.clientY) as Element | null)?.closest(
        "[data-node-id]",
      );
      if (el) {
        const kind = el.getAttribute("data-node-kind") as NodeKind | null;
        const nodeId = el.getAttribute("data-node-id");
        if (kind && nodeId && kind !== type) {
          targetType = kind;
          targetId = nodeId;
        }
      }
      if (connectRef.current) {
        connectRef.current = { ...connectRef.current, x, y, targetId, targetType };
      }
      setConnect((c) => (c ? { ...c, x, y, targetId, targetType } : c));
    };

    const onUp = () => {
      const info = connectRef.current;
      if (info && info.targetId) {
        const blockId = info.fromType === "section" ? info.fromId : info.targetId;
        const dataSource = info.fromType === "section" ? info.targetId : info.fromId;
        const already = graph.sectionToSources.get(blockId)?.has(dataSource) ?? false;
        if (!already) onMapDataSource(blockId, dataSource);
      }
      connectRef.current = null;
      setConnect(null);
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
    };

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  };

  // Which connectors to actually draw: only the focused node's edges, unless
  // "Show all" is on. This is the core de-clutter: no hairball by default.
  const visiblePaths = useMemo(() => {
    if (showAll) {
      if (!active) return paths;
      const dim: EdgePath[] = [];
      const hot: EdgePath[] = [];
      for (const p of paths) {
        (edgeTouchesActive(p.blockId, p.dataSource) ? hot : dim).push(p);
      }
      return [...dim, ...hot];
    }
    if (!active) return [];
    return paths.filter((p) => edgeTouchesActive(p.blockId, p.dataSource));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paths, showAll, active]);

  const isHot = (p: EdgePath) => !showAll || edgeTouchesActive(p.blockId, p.dataSource);
  const showHint = !showAll && !active && !isConnecting;

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] text-[#9e9e9e]">
          Hover or select a node to trace its connections. Drag a node's dot onto the other
          column to map; click a connector to remove it.
        </p>
        <div className="flex items-center gap-2">
          {selected && (
            <span className="rounded-md bg-[#fedbda] px-2 py-1 text-[12px] font-medium text-[#302f2f]">
              {activeDegree} connection{activeDegree === 1 ? "" : "s"}
            </span>
          )}
          {selected && (
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="flex items-center gap-1 rounded-md border border-[#d4ced3] bg-white px-2 py-1 text-[12px] font-medium text-[#636161] hover:bg-[#fafafa]"
            >
              <X size={13} /> Clear
            </button>
          )}
          <button
            type="button"
            aria-pressed={showAll}
            onClick={() => setShowAll((v) => !v)}
            className={`rounded-md border px-2.5 py-1 text-[12px] font-medium transition-colors ${
              showAll
                ? "border-[#fe9591] bg-[#fedbda] text-[#302f2f]"
                : "border-[#d4ced3] bg-white text-[#636161] hover:bg-[#fafafa]"
            }`}
          >
            Show all connections
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px]">
          <Search
            size={14}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9e9e9e]"
          />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search sources"
            className="w-full rounded-md border border-[#d4ced3] bg-white py-1.5 pl-8 pr-2 text-[13px] text-[#302f2f] placeholder:text-[#9e9e9e] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff4e49]/30"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {graph.categories.map((category) => {
            const on = visibleCategories.has(category);
            return (
              <button
                key={category}
                type="button"
                aria-pressed={on}
                onClick={() => toggleCategory(category)}
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors ${
                  on
                    ? "border-[#d4ced3] bg-white text-[#454545]"
                    : "border-[#ececec] bg-[#f5f5f5] text-[#b0b0b0]"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    on ? CATEGORY_DOT[category] ?? "bg-[#bdbdbd]" : "bg-[#d4d4d4]"
                  }`}
                />
                {category}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bipartite canvas */}
      <div
        ref={wrapperRef}
        className={`relative flex gap-[120px] sm:gap-[160px] ${isConnecting ? "select-none" : ""}`}
        onClick={(event) => {
          if (event.target === event.currentTarget) setSelected(null);
        }}
      >
        {/* Connector layer */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full">
          {visiblePaths.map((p) => {
            const hot = isHot(p);
            const isHoverEdge = hoverEdge === p.key;
            return (
              <path
                key={p.key}
                d={p.d}
                fill="none"
                strokeLinecap="round"
                stroke={hot || isHoverEdge ? "#ff4e49" : "#c9c2c8"}
                strokeWidth={hot || isHoverEdge ? 2 : 1}
                strokeOpacity={hot || isHoverEdge ? 1 : 0.18}
                strokeDasharray={p.hasProposed ? "5 3" : undefined}
              />
            );
          })}

          {/* Endpoint dots anchor the focused connectors. */}
          {visiblePaths.map((p) =>
            isHot(p) ? (
              <g key={`dot-${p.key}`}>
                <circle cx={p.x1} cy={p.y1} r={3} fill="#ff4e49" />
                <circle cx={p.x2} cy={p.y2} r={3} fill="#ff4e49" />
              </g>
            ) : null,
          )}

          {/* Invisible wide hit paths for click-to-remove (visible edges only). */}
          {!isConnecting &&
            visiblePaths.map((p) => (
              <path
                key={`hit-${p.key}`}
                d={p.d}
                fill="none"
                stroke="transparent"
                strokeWidth={14}
                style={{ pointerEvents: "stroke", cursor: "pointer" }}
                onMouseEnter={() => setHoverEdge(p.key)}
                onMouseLeave={() => setHoverEdge((k) => (k === p.key ? null : k))}
                onClick={(event) => {
                  event.stopPropagation();
                  onUnmapDataSource(p.blockId, p.dataSource);
                  setHoverEdge(null);
                }}
              >
                <title>Click to remove this mapping</title>
              </path>
            ))}

          {/* Pending connector while dragging. */}
          {connect && (
            <path
              d={`M${connect.fromX},${connect.fromY} C${
                connect.fromX + (connect.x - connect.fromX) / 2
              },${connect.fromY} ${
                connect.x - (connect.x - connect.fromX) / 2
              },${connect.y} ${connect.x},${connect.y}`}
              fill="none"
              stroke="#ff4e49"
              strokeWidth={2}
              strokeLinecap="round"
              strokeDasharray="5 4"
            />
          )}
        </svg>

        {/* On-demand hint in the empty gap */}
        {showHint && (
          <div className="pointer-events-none absolute inset-y-0 left-1/2 flex -translate-x-1/2 items-center">
            <span className="rounded-full border border-[#ececec] bg-white/80 px-3 py-1 text-[12px] text-[#b0b0b0]">
              Hover a node to reveal its connections
            </span>
          </div>
        )}

        {/* Left: sections */}
        <div className="relative z-[1] min-w-0 flex-1 space-y-1">
          <ColumnHeader
            label="Sections"
            count={graph.leftItems.filter((i) => i.kind === "section").length}
          />
          {graph.leftItems.map((item) =>
            item.kind === "heading" ? (
              <p
                key={item.id}
                className="px-1 pb-0.5 pt-3 text-[11px] font-semibold uppercase tracking-wide text-[#9e9e9e] first:pt-1"
              >
                {item.label}
              </p>
            ) : (
              <SectionRow
                key={item.node.blockId}
                node={item.node}
                rowRef={(el) => {
                  secRefs.current[item.node.blockId] = el;
                }}
                connecting={isConnecting}
                dimmed={Boolean(active) && !sectionHighlighted(item.node.blockId)}
                highlighted={sectionHighlighted(item.node.blockId)}
                selected={activeSection === item.node.blockId}
                isTarget={connect?.targetType === "section" && connect.targetId === item.node.blockId}
                onEnter={() => !isConnecting && setHovered({ type: "section", id: item.node.blockId })}
                onLeave={() => !isConnecting && setHovered(null)}
                onClick={() => toggleSelect({ type: "section", id: item.node.blockId })}
                onConnectStart={(event) => startConnect("section", item.node.blockId, event)}
              />
            ),
          )}
        </div>

        {/* Right: sources */}
        <div className="relative z-[1] min-w-0 flex-1 space-y-1">
          <ColumnHeader
            label="Sources"
            count={graph.sourceGroups.reduce(
              (n, g) => n + g.sources.filter((s) => isSourceVisible(s.dataSource)).length,
              0,
            )}
          />
          {graph.sourceGroups.map((group) => {
            const visible = group.sources.filter((s) => isSourceVisible(s.dataSource));
            if (visible.length === 0) return null;
            return (
              <div key={group.category}>
                <p className="flex items-center gap-1.5 px-1 pb-0.5 pt-3 text-[11px] font-semibold uppercase tracking-wide text-[#9e9e9e]">
                  <span
                    className={`h-2 w-2 rounded-full ${CATEGORY_DOT[group.category] ?? "bg-[#bdbdbd]"}`}
                  />
                  {group.category}
                </p>
                {visible.map((node) => (
                  <SourceRow
                    key={node.dataSource}
                    node={node}
                    rowRef={(el) => {
                      srcRefs.current[node.dataSource] = el;
                    }}
                    connecting={isConnecting}
                    dimmed={Boolean(active) && !sourceHighlighted(node.dataSource)}
                    highlighted={sourceHighlighted(node.dataSource)}
                    selected={activeSource === node.dataSource}
                    isTarget={connect?.targetType === "source" && connect.targetId === node.dataSource}
                    onEnter={() => !isConnecting && setHovered({ type: "source", id: node.dataSource })}
                    onLeave={() => !isConnecting && setHovered(null)}
                    onClick={() => toggleSelect({ type: "source", id: node.dataSource })}
                    onConnectStart={(event) => startConnect("source", node.dataSource, event)}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ColumnHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className="mb-1 flex items-center justify-between border-b border-[#ececec] pb-1">
      <span className="text-[12px] font-semibold uppercase tracking-wide text-[#757575]">
        {label}
      </span>
      <span className="text-[11px] text-[#b0b0b0]">{count}</span>
    </div>
  );
}

function nodeClasses(
  highlighted: boolean,
  selected: boolean,
  dimmed: boolean,
  isTarget: boolean,
): string {
  if (isTarget) return "border-[#ff4e49] bg-[#fff5f5] ring-2 ring-[#ff4e49]/40";
  if (selected) return "border-[#ff4e49] bg-[#fedbda]";
  if (highlighted) return "border-[#fe9591] bg-[#fff5f5]";
  if (dimmed) return "border-[#ececec] bg-white opacity-40";
  return "border-[#d4ced3] bg-white hover:border-[#bdbdbd]";
}

function CountBadge({ n, proposed }: { n: number; proposed: number }) {
  return (
    <span className="flex shrink-0 items-center gap-1">
      {proposed > 0 && (
        <span title={`${proposed} need review`} className="h-1.5 w-1.5 rounded-full bg-[#f0a020]" />
      )}
      <span className="rounded-full bg-[#f3f3f3] px-1.5 py-0.5 text-[11px] font-medium text-[#9e9e9e]">
        {n}
      </span>
    </span>
  );
}

function ConnectHandle({
  side,
  connecting,
  onPointerDown,
}: {
  side: "left" | "right";
  connecting: boolean;
  onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      onPointerDown={onPointerDown}
      onClick={(event) => event.stopPropagation()}
      aria-label="Drag to connect"
      title="Drag to connect"
      style={{ touchAction: "none" }}
      className={`absolute top-1/2 z-10 h-3 w-3 -translate-y-1/2 cursor-crosshair rounded-full border-2 border-white bg-[#ff4e49] shadow transition-opacity ${
        side === "right" ? "-right-1.5" : "-left-1.5"
      } ${connecting ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
    />
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
  onEnter,
  onLeave,
  onClick,
  onConnectStart,
}: {
  node: SectionNode;
  rowRef: (el: HTMLDivElement | null) => void;
  connecting: boolean;
  dimmed: boolean;
  highlighted: boolean;
  selected: boolean;
  isTarget: boolean;
  onEnter: () => void;
  onLeave: () => void;
  onClick: () => void;
  onConnectStart: (event: React.PointerEvent<HTMLButtonElement>) => void;
}) {
  return (
    <div
      ref={rowRef}
      data-node-kind="section"
      data-node-id={node.blockId}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onClick={onClick}
      className={`group relative flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 transition-colors ${nodeClasses(
        highlighted,
        selected,
        dimmed,
        isTarget,
      )}`}
    >
      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[#302f2f]">
        {node.title}
      </span>
      <CountBadge n={node.sourceCount} proposed={node.proposedCount} />
      <ConnectHandle side="right" connecting={connecting} onPointerDown={onConnectStart} />
    </div>
  );
}

function SourceRow({
  node,
  rowRef,
  connecting,
  dimmed,
  highlighted,
  selected,
  isTarget,
  onEnter,
  onLeave,
  onClick,
  onConnectStart,
}: {
  node: SourceNode;
  rowRef: (el: HTMLDivElement | null) => void;
  connecting: boolean;
  dimmed: boolean;
  highlighted: boolean;
  selected: boolean;
  isTarget: boolean;
  onEnter: () => void;
  onLeave: () => void;
  onClick: () => void;
  onConnectStart: (event: React.PointerEvent<HTMLButtonElement>) => void;
}) {
  return (
    <div
      ref={rowRef}
      data-node-kind="source"
      data-node-id={node.dataSource}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onClick={onClick}
      className={`group relative mb-1 flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 transition-colors ${nodeClasses(
        highlighted,
        selected,
        dimmed,
        isTarget,
      )}`}
    >
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${CATEGORY_DOT[node.category] ?? "bg-[#bdbdbd]"}`}
      />
      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[#302f2f]">
        {node.dataSource}
      </span>
      <CountBadge n={node.sectionCount} proposed={node.proposedCount} />
      <ConnectHandle side="left" connecting={connecting} onPointerDown={onConnectStart} />
    </div>
  );
}
