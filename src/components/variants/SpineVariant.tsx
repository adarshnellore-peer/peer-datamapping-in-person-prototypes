import { useRef } from "react";
import type { ContentBlockData } from "../../types";
import { BeatCard, headingLabelFor } from "./BeatCard";
import { mappingStatus, NODE_HEX, type VariantProps } from "./types";

/**
 * @deprecated V4 merged into V2. Kept as a thin wrapper for reference.
 */
export function SpineVariant({
  blocks,
  tracedSource,
  onTraceSource,
  onUpdateSource,
  onRemoveSource,
  onPromptChange,
}: Omit<VariantProps, "onAddSource"> & {
  onPromptChange?: (blockId: string, prompt: string) => void;
}) {
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const beats = blocks.filter((b): b is ContentBlockData => b.type === "content");
  const beatIndex = new Map(beats.map((b, i) => [b.id, i + 1]));
  let actSeq = 0;

  return (
    <div className="flex h-full min-h-0">
      <aside className="flex w-[250px] shrink-0 flex-col overflow-y-auto border-r border-[#d4ced3] bg-[#fafafa]">
        <div className="sticky top-0 z-10 border-b border-[#e8e8e8] bg-[#fafafa] px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9e9e9e]">
            Narrative arc
          </p>
          <p className="mt-0.5 text-[13px] font-medium text-[#302f2f]">
            {beats.length} key messages
          </p>
        </div>
        <div className="px-2 py-2">
          {blocks.map((block) => {
            if (block.type === "heading") {
              if (block.level !== 1) return null;
              return (
                <p
                  key={block.id}
                  className="px-2 pb-1 pt-3 text-[10.5px] font-semibold uppercase tracking-wide text-[#9e9e9e]"
                >
                  {block.number && <span>{block.number} </span>}
                  {block.title}
                </p>
              );
            }
            if (block.type !== "content") return null;
            const hex = NODE_HEX[mappingStatus(block.sources)];
            return (
              <button
                key={block.id}
                type="button"
                onClick={() =>
                  cardRefs.current[block.id]?.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                  })
                }
                className="flex w-full items-start gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-[#f0f0f0]"
              >
                <span
                  className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: hex }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] font-medium text-[#302f2f]">
                    {block.title}
                  </span>
                  <span className="text-[11px] text-[#9e9e9e]">
                    {block.sources.length} source
                    {block.sources.length === 1 ? "" : "s"}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto bg-white">
        <div className="mx-auto w-full max-w-[760px] px-8 py-7">
          <h1 className="text-[22px] font-semibold tracking-tight text-[#333]">
            Roadmap storyline
          </h1>
          <p className="mb-6 mt-1 text-[13px] text-[#9e9e9e]">
            Each section shows its mapped evidence up front — mark how load-bearing
            each source is.
          </p>

          {blocks.map((block) => {
            if (block.type === "heading") {
              if (block.level === 1) {
                actSeq += 1;
                return (
                  <div key={block.id} className="mb-4 mt-7 flex items-center gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#302f2f] text-[12px] font-bold text-white">
                      {actSeq}
                    </span>
                    <span className="text-[13px] font-semibold uppercase tracking-wide text-[#636161]">
                      {block.number && <span>{block.number} </span>}
                      {block.title}
                    </span>
                    <span className="h-px flex-1 bg-[#ececec]" />
                  </div>
                );
              }
              return (
                <p
                  key={block.id}
                  className="mb-2 mt-5 pl-11 text-[12px] font-semibold uppercase tracking-wide text-[#9e9e9e]"
                >
                  {block.number && <span>{block.number} </span>}
                  {block.title}
                </p>
              );
            }
            if (block.type !== "content") return null;
            return (
              <BeatCard
                key={block.id}
                cardRef={(el) => {
                  cardRefs.current[block.id] = el;
                }}
                block={block}
                index={beatIndex.get(block.id) ?? 0}
                contextLabel={headingLabelFor(blocks, block.id)}
                tracedSourceId={
                  tracedSource?.blockId === block.id ? tracedSource.sourceId : null
                }
                onTrace={
                  onTraceSource ? (sourceId) => onTraceSource(block.id, sourceId) : undefined
                }
                onUpdateSource={(source) => onUpdateSource(block.id, source)}
                onRemoveSource={(sourceId) => onRemoveSource(block.id, sourceId)}
                onPromptChange={
                  onPromptChange ? (prompt) => onPromptChange(block.id, prompt) : undefined
                }
              />
            );
          })}
        </div>
      </main>
    </div>
  );
}
