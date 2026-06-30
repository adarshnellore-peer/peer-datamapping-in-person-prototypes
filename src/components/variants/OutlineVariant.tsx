import { useEffect, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import type { RoadmapSource } from "../../data/roadmap";
import type { ContentBlockData } from "../../types";
import { SectionMapper } from "./SectionMapper";
import { categorySummary, type VariantProps } from "./types";

export function OutlineVariant({
  blocks,
  tracedSource,
  onTraceSource,
  onUpdateSource,
  onRemoveSource,
  onAddSource,
  focusId,
}: VariantProps & { focusId?: string | null }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // When the TOC navigates to a section, expand it and scroll it into view.
  useEffect(() => {
    if (!focusId) return;
    const block = blocks.find((b) => b.id === focusId);
    if (!block || block.type !== "content") return;
    setExpanded((prev) => {
      if (prev.has(focusId)) return prev;
      const next = new Set(prev);
      next.add(focusId);
      return next;
    });
    rowRefs.current[focusId]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusId, blocks]);

  return (
    <div className="mx-auto w-full max-w-[760px] px-4 py-6">
      <p className="mb-4 text-[13px] text-[#9e9e9e]">
        Each section is a row. Scan every section's sources at a glance; click a row
        to expand and edit its mapping.
      </p>

      <div className="overflow-hidden rounded-lg border border-[#d4ced3] bg-white">
        {blocks.map((block) => {
          if (block.type === "heading") {
            const isH1 = block.level === 1;
            return (
              <div
                key={block.id}
                className={`border-b border-[#ececec] bg-[#fafafa] px-4 ${
                  isH1 ? "py-3" : "py-2"
                }`}
              >
                <span
                  className={`font-semibold text-[#333] ${
                    isH1
                      ? "text-[15px]"
                      : "text-[13px] uppercase tracking-wide text-[#757575]"
                  }`}
                >
                  {block.number && <span>{block.number} </span>}
                  {block.title}
                </span>
              </div>
            );
          }
          if (block.type === "pageBreak") return null;

          return (
            <OutlineRow
              key={block.id}
              rowRef={(el) => {
                rowRefs.current[block.id] = el;
              }}
              block={block}
              isExpanded={expanded.has(block.id)}
              onToggle={() => toggle(block.id)}
              tracedSourceId={
                tracedSource?.blockId === block.id ? tracedSource.sourceId : null
              }
              onTrace={
                onTraceSource ? (sourceId) => onTraceSource(block.id, sourceId) : undefined
              }
              onUpdateSource={(source) => onUpdateSource(block.id, source)}
              onRemoveSource={(sourceId) => onRemoveSource(block.id, sourceId)}
              onAddSource={() => onAddSource(block.id)}
            />
          );
        })}
      </div>
    </div>
  );
}

function OutlineRow({
  rowRef,
  block,
  isExpanded,
  onToggle,
  tracedSourceId,
  onTrace,
  onUpdateSource,
  onRemoveSource,
  onAddSource,
}: {
  rowRef?: (el: HTMLDivElement | null) => void;
  block: ContentBlockData;
  isExpanded: boolean;
  onToggle: () => void;
  tracedSourceId: string | null;
  onTrace?: (sourceId: string) => void;
  onUpdateSource: (source: RoadmapSource) => void;
  onRemoveSource: (sourceId: string) => void;
  onAddSource: () => void;
}) {
  const hasSources = block.sources.length > 0;

  return (
    <div ref={rowRef} className="border-b border-[#ececec] last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[#fafafa]"
      >
        <ChevronRight
          size={16}
          className={`shrink-0 text-[#9e9e9e] transition-transform ${
            isExpanded ? "rotate-90" : ""
          }`}
        />
        <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-[#302f2f]">
          {block.title}
        </span>

        {hasSources ? (
          <span className="shrink-0 text-[12px] text-[#9e9e9e]">
            {categorySummary(block.sources)}
          </span>
        ) : (
          <span className="shrink-0 rounded bg-[#fff3cd] px-1.5 py-0.5 text-[11px] font-medium text-[#9a6700]">
            No sources
          </span>
        )}
      </button>

      {isExpanded && (
        <div className="bg-[#fbfbfb] px-4 pb-4 pl-11 pt-1">
          <SectionMapper
            block={block}
            tracedSourceId={tracedSourceId}
            onTrace={onTrace}
            onUpdateSource={onUpdateSource}
            onRemoveSource={onRemoveSource}
            onAddSource={onAddSource}
          />
        </div>
      )}
    </div>
  );
}
