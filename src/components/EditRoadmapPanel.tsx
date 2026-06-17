import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { PeerSelect } from "./PeerSelect";
import { SourceFields } from "./SourceFields";
import {
  createSourceForType,
  OUTPUT_TYPES,
  SOURCE_TYPES,
  withSourceType,
  type RoadmapSource,
  type SourceType,
} from "../data/roadmap";

export type EditRoadmapPanelProps = {
  prompt: string;
  outputType: string;
  sources: RoadmapSource[];
  onClose: () => void;
  onSave: (data: {
    prompt: string;
    outputType: string;
    sources: RoadmapSource[];
  }) => void;
  onDelete: () => void;
};

export function EditRoadmapPanel({
  prompt: initialPrompt,
  outputType: initialOutputType,
  sources: initialSources,
  onClose,
  onSave,
  onDelete,
}: EditRoadmapPanelProps) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [outputType, setOutputType] = useState(initialOutputType);
  const [sources, setSources] = useState<RoadmapSource[]>(initialSources);
  const [dirty, setDirty] = useState(false);
  const [pendingScrollId, setPendingScrollId] = useState<string | null>(null);
  const sourceRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    setPrompt(initialPrompt);
    setOutputType(initialOutputType);
    setSources(initialSources);
    setDirty(false);
  }, [initialPrompt, initialOutputType, initialSources]);

  const markDirty = () => setDirty(true);

  useEffect(() => {
    if (!pendingScrollId) return;
    const node = sourceRefs.current[pendingScrollId];
    node?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    setPendingScrollId(null);
  }, [pendingScrollId, sources]);

  const updateSource = (id: string, next: RoadmapSource) => {
    setSources((prev) => prev.map((source) => (source.id === id ? next : source)));
    markDirty();
  };

  const changeSourceType = (id: string, sourceType: SourceType) => {
    setSources((prev) =>
      prev.map((source) =>
        source.id === id ? withSourceType(source, sourceType) : source,
      ),
    );
    markDirty();
  };

  const removeSource = (id: string) => {
    setSources((prev) => prev.filter((source) => source.id !== id));
    markDirty();
  };

  const addSource = () => {
    const next = createSourceForType("DATA_SOURCE");
    setSources((prev) => [...prev, next]);
    setPendingScrollId(next.id);
    markDirty();
  };

  const handleSave = () => {
    onSave({ prompt, outputType, sources });
    setDirty(false);
  };

  return (
    <>
      <button
        type="button"
        aria-label="Close overlay"
        className="fixed inset-0 z-40 bg-black/20"
        onClick={onClose}
      />
      <aside className="fixed right-0 top-0 z-50 flex h-screen w-[420px] flex-col border-l border-[#d4ced3] bg-white shadow-[-4px_0_24px_rgba(0,0,0,0.12)]">
        <header className="flex items-center justify-between border-b border-[#d4ced3] px-5 py-4">
          <h2 className="text-[18px] font-medium text-[#1a1a1a]">Edit Roadmap</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="rounded p-1 text-[#757575] hover:bg-[#f5f5f5] hover:text-[#1a1a1a]"
          >
            <X size={20} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="mb-5">
            <label className="mb-1.5 block text-[13px] text-[#616161]">
              Prompt text<span className="text-[#ff4e49]"> *</span>
            </label>
            <textarea
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                markDirty();
              }}
              rows={8}
              className="w-full resize-y rounded border border-[#d4ced3] px-3 py-2.5 text-[14px] leading-relaxed text-[#1a1a1a] focus:border-[#bdbdbd] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff4e49]/30"
            />
          </div>

          <div className="mb-6">
            <PeerSelect
              label="Output Type"
              required
              value={outputType}
              options={OUTPUT_TYPES}
              onChange={(value) => {
                setOutputType(value);
                markDirty();
              }}
            />
          </div>

          <div className="mb-3 flex items-center justify-between">
            <span className="text-[14px] font-medium text-[#1a1a1a]">Sources</span>
            <button
              type="button"
              onClick={addSource}
              className="text-[14px] font-medium text-[#ff4e49] hover:underline"
            >
              + Add source
            </button>
          </div>

          <div className="space-y-4">
            {sources.map((source, index) => (
              <section
                key={source.id}
                ref={(node) => {
                  sourceRefs.current[source.id] = node;
                }}
                className="rounded border border-[#d4ced3] bg-[#fafafa]/50 p-4"
              >
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-[14px] font-medium text-[#1a1a1a]">
                    Source: {index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeSource(source.id)}
                    aria-label={`Delete source ${index + 1}`}
                    className="rounded p-1 text-[#ff4e49] hover:bg-[#fff5f5]"
                  >
                    <TrashIcon />
                  </button>
                </div>

                <div className="space-y-4">
                  <PeerSelect
                    label="Source type"
                    required
                    value={source.sourceType}
                    options={SOURCE_TYPES}
                    onChange={(value) =>
                      changeSourceType(source.id, value as SourceType)
                    }
                  />
                  <SourceFields
                    source={source}
                    onChange={(next) => updateSource(source.id, next)}
                  />
                </div>
              </section>
            ))}

            {sources.length === 0 && (
              <p className="text-[13px] text-[#9e9e9e]">No sources added.</p>
            )}
          </div>
        </div>

        <footer className="flex items-center justify-end gap-3 border-t border-[#d4ced3] px-5 py-4">
          <button
            type="button"
            onClick={onDelete}
            className="rounded border border-[#ff4e49] px-4 py-2 text-[14px] font-medium text-[#ff4e49] hover:bg-[#fff5f5]"
          >
            Delete Content
          </button>
          <button
            type="button"
            disabled={!dirty}
            onClick={handleSave}
            className="rounded bg-[#ff4e49] px-5 py-2 text-[14px] font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:bg-[#d4ced3] disabled:text-[#9e9e9e]"
          >
            Save
          </button>
        </footer>
      </aside>
    </>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DropdownMenu({
  trigger,
  children,
  align = "left",
}: {
  trigger: ReactNode;
  children: ReactNode;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <div onClick={() => setOpen((prev) => !prev)}>{trigger}</div>
      {open && (
        <div
          id={menuId}
          role="menu"
          className={`absolute top-[calc(100%+4px)] z-50 min-w-[220px] rounded-lg border border-[#d4ced3] bg-white py-1 shadow-lg ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          <div onClick={() => setOpen(false)}>{children}</div>
        </div>
      )}
    </div>
  );
}

export function MenuItem({
  icon,
  title,
  description,
  active,
  onClick,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[#fafafa] ${
        active ? "bg-[#fedbda]" : ""
      }`}
    >
      {icon && <span className="mt-0.5 shrink-0 text-[#757575]">{icon}</span>}
      <span>
        <span className="block text-[14px] font-medium text-[#1a1a1a]">{title}</span>
        {description && (
          <span className="mt-0.5 block text-[12px] text-[#757575]">{description}</span>
        )}
      </span>
    </button>
  );
}

export function Modal({
  title,
  children,
  onClose,
  footer,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-lg bg-white shadow-xl">
        <header className="flex items-center justify-between border-b border-[#d4ced3] px-5 py-4">
          <h3 className="text-[16px] font-medium">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[#757575] hover:bg-[#f5f5f5]"
          >
            <X size={18} />
          </button>
        </header>
        <div className="px-5 py-4">{children}</div>
        {footer && (
          <footer className="flex justify-end gap-2 border-t border-[#d4ced3] px-5 py-4">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}

export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 3000);
    return () => window.clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-[#1a1a1a] px-4 py-3 text-[14px] text-white shadow-lg">
      {message}
    </div>
  );
}
