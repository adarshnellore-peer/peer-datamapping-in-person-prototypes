import { useEffect, useRef, useState } from "react";
import { GripVertical, Pencil } from "lucide-react";
import { GenerateAsSelect } from "./OutputTypeToggle";
import { DuplicateDeleteActions } from "./SourceCard";
import { KeyMessageFooter } from "./KeyMessageFooter";
import { SectionMapper } from "./variants/SectionMapper";
import type { ContentBlockData } from "../types";
import type { RoadmapSource } from "../data/roadmap";

function EditableTextSection({
  label,
  value,
  onChange,
  placeholder,
  formatDisplay,
  previewLines = 2,
  editingRows = 6,
  muted = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  formatDisplay?: (value: string) => string;
  previewLines?: 2 | 3 | 4;
  editingRows?: number;
  muted?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const displayText = formatDisplay ? formatDisplay(value) : value.trim();
  const lineClampClass =
    previewLines === 4
      ? "line-clamp-4"
      : previewLines === 3
        ? "line-clamp-3"
        : "line-clamp-2";

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    if (!editing) return;

    textareaRef.current?.focus();
    textareaRef.current?.setSelectionRange(draft.length, draft.length);

    const handlePointerDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        if (draft !== value) onChange(draft);
        setEditing(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [editing, draft, value, onChange]);

  return (
    <div ref={containerRef}>
      <p className="mb-1.5 text-[12px] font-medium text-[#636161]">{label}</p>

      {editing ? (
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={editingRows}
          className="w-full resize-y rounded-md border border-[#d4ced3] bg-white px-3 py-2.5 text-[14px] leading-relaxed text-[#302f2f] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff4e49]/30"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={`group/preview relative block w-full rounded-md border bg-white px-3 py-2 pr-9 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff4e49]/30 ${
            muted
              ? "border-[#e4e4e4] hover:border-[#d4ced3]"
              : "border-[#d4ced3] hover:border-[#bdbdbd]"
          }`}
        >
          {displayText ? (
            <span
              className={`${lineClampClass} whitespace-pre-line text-[14px] leading-relaxed text-[#4a4a4a]`}
            >
              {displayText}
            </span>
          ) : (
            <span className="text-[14px] leading-relaxed text-[#b0b0b0]">{placeholder}</span>
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
  tracedSourceId,
  onSourceCardClick,
  onDragHandlePointerDown,
  onUpdateSource,
  onRemoveSource,
  onPromptChange,
  onAdditionalContextChange,
  onOutputTypeChange,
  onDuplicate,
  onDelete,
}: {
  block: ContentBlockData;
  tracedSourceId: string | null;
  onSourceCardClick: (sourceId: string) => void;
  onDragHandlePointerDown?: (event: React.PointerEvent<HTMLButtonElement>) => void;
  onUpdateSource: (source: RoadmapSource) => void;
  onRemoveSource: (sourceId: string) => void;
  onPromptChange: (prompt: string) => void;
  onAdditionalContextChange: (additionalContext: string) => void;
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
        <SectionMapper
          block={block}
          tracedSourceId={tracedSourceId}
          onTrace={onSourceCardClick}
          onUpdateSource={onUpdateSource}
          onRemoveSource={onRemoveSource}
          allowSourceTypeChange
        />
      </div>

      <div className="border-t border-[#ececec] bg-[#fafafa] px-3 py-3 sm:px-4">
        <EditableTextSection
          label="Additional context"
          value={block.additionalContext ?? ""}
          onChange={onAdditionalContextChange}
          placeholder="Add optional context for this section…"
          previewLines={2}
          editingRows={5}
          muted
        />
      </div>

      <KeyMessageFooter value={block.prompt} onChange={onPromptChange} />
    </div>
  );
}
