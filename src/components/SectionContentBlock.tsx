import { useEffect, useRef, useState } from "react";
import { GripVertical, Pencil, Plus } from "lucide-react";
import { GenerateAsSelect } from "./OutputTypeToggle";
import { DuplicateDeleteActions, SourceCard } from "./SourceCard";
import type { ContentBlockData } from "../types";
import type { RoadmapSource } from "../data/roadmap";

function cleanPromptSegment(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\s+/g, " ")
    .replace(/^[^\w(["']+/, "")
    .trim();
}

function formatPromptForDisplay(prompt: string): string {
  const text = prompt.trim();
  if (!text) return "";

  const contextMatch = text.match(
    /\[CONTEXT FOR THE MODEL\]\s*([\s\S]*?)(?=\[REQUESTED TASK\]|$)/i,
  );
  const taskMatch = text.match(/\[REQUESTED TASK\]\s*([\s\S]*)/i);

  const parts: string[] = [];
  if (contextMatch?.[1]) parts.push(cleanPromptSegment(contextMatch[1]));
  if (taskMatch?.[1]) parts.push(cleanPromptSegment(taskMatch[1]));

  if (parts.length > 0) return parts.join("\n\n");

  return cleanPromptSegment(
    text
      .replace(/\[CONTEXT FOR THE MODEL\]\s*/gi, "")
      .replace(/\[REQUESTED TASK\]\s*/gi, ""),
  );
}

function ContextForAI({
  prompt,
  onChange,
}: {
  prompt: string;
  onChange: (prompt: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(prompt);
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const displayText = formatPromptForDisplay(prompt);

  useEffect(() => {
    if (!editing) setDraft(prompt);
  }, [prompt, editing]);

  useEffect(() => {
    if (!editing) return;

    textareaRef.current?.focus();
    textareaRef.current?.setSelectionRange(draft.length, draft.length);

    const handlePointerDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        if (draft !== prompt) onChange(draft);
        setEditing(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [editing, draft, prompt, onChange]);

  return (
    <div
      ref={containerRef}
      className="border-t border-[#ececec] bg-[#fafafa] px-3 py-3 sm:px-4"
    >
      <p className="mb-1.5 text-[12px] font-medium text-[#636161]">Context for AI</p>

      {editing ? (
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={8}
          className="w-full resize-y rounded-md border border-[#d4ced3] bg-white px-3 py-2.5 text-[14px] leading-relaxed text-[#302f2f] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff4e49]/30"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="group/preview relative block w-full rounded-md border border-[#e4e4e4] bg-white px-3 py-2 pr-9 text-left transition-colors hover:border-[#d4ced3] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff4e49]/30"
        >
          {displayText ? (
            <span className="line-clamp-2 whitespace-pre-line text-[14px] leading-relaxed text-[#4a4a4a]">
              {displayText}
            </span>
          ) : (
            <span className="text-[14px] leading-relaxed text-[#b0b0b0]">
              Add instructions for the model…
            </span>
          )}
          <Pencil
            size={14}
            strokeWidth={1.75}
            className="pointer-events-none absolute bottom-2 right-2 text-[#636161] opacity-70 transition-opacity sm:opacity-0 sm:group-hover/preview:opacity-100"
            aria-hidden
          />
        </button>
      )}
    </div>
  );
}

export function SectionContentBlock({
  block,
  onDragHandlePointerDown,
  onUpdateSource,
  onRemoveSource,
  onDuplicateSource,
  onAddSource,
  onPromptChange,
  onOutputTypeChange,
  onDuplicate,
  onDelete,
}: {
  block: ContentBlockData;
  onDragHandlePointerDown?: (event: React.PointerEvent<HTMLButtonElement>) => void;
  onUpdateSource: (source: RoadmapSource) => void;
  onRemoveSource: (sourceId: string) => void;
  onDuplicateSource: (sourceId: string) => void;
  onAddSource: () => void;
  onPromptChange: (prompt: string) => void;
  onOutputTypeChange: (outputType: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-[#d4ced3] bg-white">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2 border-b border-[#ececec] px-2 py-2.5 sm:pr-4">
        <button
          type="button"
          data-drag-handle
          aria-label="Drag to reorder section"
          title="Drag to reorder"
          onPointerDown={(event) => {
            event.stopPropagation();
            onDragHandlePointerDown?.(event);
          }}
          className="flex shrink-0 cursor-grab touch-manipulation items-center justify-center rounded p-1.5 text-[#9e9e9e] transition-colors hover:bg-[#f5f5f5] hover:text-[#636161] active:cursor-grabbing sm:p-1"
        >
          <GripVertical size={16} strokeWidth={1.75} />
        </button>
        <p className="min-w-0 flex-1 basis-[calc(100%-2.5rem)] text-[14px] font-medium leading-snug text-[#302f2f] sm:basis-auto sm:truncate">
          {block.title}
        </p>
        <div className="flex w-full flex-wrap items-center justify-between gap-2 sm:ml-auto sm:w-auto sm:flex-nowrap sm:shrink-0">
          <GenerateAsSelect value={block.outputType} onChange={onOutputTypeChange} />
          <div className="flex shrink-0 items-center border-l border-[#e4e4e4] pl-2 sm:pl-3">
            <DuplicateDeleteActions
              onDuplicate={onDuplicate}
              onRemove={onDelete}
              duplicateLabel="Duplicate section"
              removeLabel="Delete section"
            />
          </div>
        </div>
      </div>

      <div className="px-3 py-3 sm:px-4">
        <p className="mb-2 text-[12px] font-medium text-[#636161]">Sources</p>
        <div className="space-y-2">
        {block.sources.length === 0 ? (
          <p className="py-1 text-center text-[13px] text-[#9e9e9e]">
            No sources mapped to this section.
          </p>
        ) : (
          block.sources.map((source) => (
            <SourceCard
              key={source.id}
              source={source}
              onChange={onUpdateSource}
              onDuplicate={() => onDuplicateSource(source.id)}
              onRemove={() => onRemoveSource(source.id)}
            />
          ))
        )}
        <button
          type="button"
          onClick={onAddSource}
          className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-[#d4ced3] py-2 text-[13px] font-medium text-[#636161] transition-colors hover:border-[#ff4e49]/40 hover:bg-[#fffafa] hover:text-[#302f2f]"
        >
          <Plus size={14} /> Add source
        </button>
        </div>
      </div>

      <ContextForAI prompt={block.prompt} onChange={onPromptChange} />
    </div>
  );
}
