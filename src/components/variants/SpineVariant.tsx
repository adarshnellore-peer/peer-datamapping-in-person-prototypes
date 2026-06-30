import { useRef } from "react";
import { AlertTriangle } from "lucide-react";
import type { ContentBlockData, DocumentBlock } from "../../types";
import { SectionMapper } from "./SectionMapper";
import { mappingStatus, type MappingState, type VariantProps } from "./types";

const NODE_HEX: Record<MappingState, string> = {
  ready: "#1a8a4a",
  review: "#2b5bd7",
  needsPrimary: "#e0a800",
  empty: "#d0a000",
};

/** Nearest preceding heading label for a content block. */
function headingLabelFor(blocks: DocumentBlock[], blockId: string): string | null {
  let current: string | null = null;
  for (const block of blocks) {
    if (block.type === "heading") {
      current = `${block.number ? block.number + " " : ""}${block.title}`;
    } else if (block.id === blockId) {
      return current;
    }
  }
  return null;
}

/**
 * V5 — Narrative spine. Reframes the roadmap as a story: each section is a
 * "key message" (claim) on a vertical timeline, with its sources shown as the
 * evidence behind it (tagged Primary / Supporting / Context via the shared
 * SourcePill). A left arc rail lists the messages grouped by heading (acts) for
 * fast navigation; claims drafted only from non-primary evidence get a nudge.
 */
export function SpineVariant({
  blocks,
  tracedSource,
  onTraceSource,
  onUpdateSource,
  onRemoveSource,
  onAddSource,
  onPromptChange,
}: VariantProps & {
  onPromptChange?: (blockId: string, prompt: string) => void;
}) {
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const beats = blocks.filter((b): b is ContentBlockData => b.type === "content");
  const beatIndex = new Map(beats.map((b, i) => [b.id, i + 1]));

  const scrollToBeat = (id: string) => {
    cardRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  let actSeq = 0;

  return (
    <div className="flex h-full min-h-0">
      {/* Left: narrative arc */}
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
                onClick={() => scrollToBeat(block.id)}
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

      {/* Center: the spine */}
      <main className="min-w-0 flex-1 overflow-y-auto bg-white">
        <div className="mx-auto w-full max-w-[760px] px-8 py-7">
          <h1 className="text-[22px] font-semibold tracking-tight text-[#333]">
            Roadmap storyline
          </h1>
          <p className="mb-6 mt-1 text-[13px] text-[#9e9e9e]">
            Read the document as a sequence of key messages. Each message draws on
            evidence you map below it; mark how load-bearing each source is.
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
                onAddSource={() => onAddSource(block.id)}
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

function BeatCard({
  cardRef,
  block,
  index,
  contextLabel,
  tracedSourceId,
  onTrace,
  onUpdateSource,
  onRemoveSource,
  onAddSource,
  onPromptChange,
}: {
  cardRef: (el: HTMLDivElement | null) => void;
  block: ContentBlockData;
  index: number;
  contextLabel: string | null;
  tracedSourceId: string | null;
  onTrace?: (sourceId: string) => void;
  onUpdateSource: (source: import("../../data/roadmap").RoadmapSource) => void;
  onRemoveSource: (sourceId: string) => void;
  onAddSource: () => void;
  onPromptChange?: (prompt: string) => void;
}) {
  const state = mappingStatus(block.sources);
  const hex = NODE_HEX[state];
  const primaryCount = block.sources.filter((s) => s.role === "primary").length;
  const showGap = block.sources.length > 0 && primaryCount === 0;

  return (
    <div className="flex gap-4">
      {/* rail */}
      <div className="flex w-7 shrink-0 flex-col items-center">
        <span
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12px] font-bold text-white"
          style={{ background: hex }}
        >
          {index}
        </span>
        <span className="my-1.5 w-0.5 flex-1 bg-[#ececec]" />
      </div>

      {/* card */}
      <div
        ref={cardRef}
        className="mb-3 min-w-0 flex-1 rounded-lg border border-[#e4e4e4] bg-white p-4 transition-colors"
      >
        <div className="flex items-baseline gap-2">
          {contextLabel && (
            <span className="truncate text-[12px] font-medium text-[#9e9e9e]">
              {contextLabel}
            </span>
          )}
          <span className="text-[14px] font-semibold text-[#302f2f]">{block.title}</span>
        </div>

        <p className="mb-1 mt-3 text-[10.5px] font-semibold uppercase tracking-wide text-[#9e9e9e]">
          Key message
        </p>
        {onPromptChange ? (
          <textarea
            value={block.prompt}
            onChange={(event) => onPromptChange(event.target.value)}
            rows={2}
            placeholder="State the claim this section makes…"
            className="w-full resize-y rounded-md border border-[#e4e4e4] bg-white px-3 py-2 text-[14px] font-medium leading-relaxed text-[#302f2f] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff4e49]/30"
          />
        ) : (
          <p className="text-[14px] font-medium leading-relaxed text-[#302f2f]">
            {block.prompt || "—"}
          </p>
        )}

        <div className="mb-2 mt-4 flex items-center gap-2">
          <span className="text-[10.5px] font-semibold uppercase tracking-wide text-[#9e9e9e]">
            Evidence
          </span>
          <span className="text-[11px] text-[#9e9e9e]">
            {block.sources.length} attached
            {primaryCount > 0 ? ` \u00b7 ${primaryCount} primary` : ""}
          </span>
        </div>

        <SectionMapper
          block={block}
          tracedSourceId={tracedSourceId}
          onTrace={onTrace}
          onUpdateSource={onUpdateSource}
          onRemoveSource={onRemoveSource}
          onAddSource={onAddSource}
        />

        {showGap && (
          <div className="mt-3 flex items-center gap-2 rounded-md bg-[#fff3cd] px-3 py-2 text-[12px] text-[#9a6700]">
            <AlertTriangle size={15} className="shrink-0" />
            This message leans on supporting evidence only — consider marking a
            source as primary before filing.
          </div>
        )}
      </div>
    </div>
  );
}
