import { useCallback, useRef, useState, type MutableRefObject } from "react";
import {
  ChevronDown,
  Copy,
  FileSearch,
  History,
  Info,
  Library,
  List,
  Moon,
  Pencil,
  Play,
  Plus,
  Settings,
  Sun,
  Wand2,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  MenuItem,
  Modal,
  Toast,
} from "./EditRoadmapPanel";
import { SectionContentBlock } from "./SectionContentBlock";
import { SourceLibraryOverlay } from "./SourceLibraryOverlay";
import { DOCUMENT_BLOCKS, getSourceLabel, TOC_ITEMS } from "../data/roadmapDocument";
import {
  DATA_SOURCES,
  createSourceForType,
  getReferenceKeysForDataSource,
  type RoadmapSource,
} from "../data/roadmap";
import { getDefaultSectionForDocument } from "../data/documentPreview";
import type { ContentBlockData, DocumentBlock, HeadingBlock, ViewMode } from "../types";

type ActivePanel =
  | { type: "share" }
  | { type: "nav" }
  | { type: "version" }
  | { type: "trace" }
  | null;

type LibraryMode = { type: "browse" } | { type: "add"; blockId: string };

function cloneBlock(block: ContentBlockData): ContentBlockData {
  return {
    ...block,
    id: crypto.randomUUID(),
    sources: block.sources.map((s) => ({ ...s, id: crypto.randomUUID() })),
  };
}

function createHeadingBlock(level: HeadingBlock["level"] = 3): HeadingBlock {
  return {
    id: crypto.randomUUID(),
    type: "heading",
    level,
    number: "",
    title: "New heading",
  };
}

function findInsertIndexAfterHeadingSection(
  blocks: DocumentBlock[],
  headingId: string,
): number | null {
  const headingIndex = blocks.findIndex((b) => b.id === headingId);
  if (headingIndex === -1) return null;

  const heading = blocks[headingIndex];
  if (heading.type !== "heading") return null;

  for (let i = headingIndex + 1; i < blocks.length; i++) {
    const block = blocks[i];
    if (block.type === "heading" && block.level <= heading.level) {
      return i;
    }
  }

  return blocks.length;
}

function createContentBlock(): ContentBlockData {
  return {
    id: crypto.randomUUID(),
    type: "content",
    title: "New section",
    previewText: "",
    prompt: "",
    outputType: "OUTPUT_TYPE_SUMMARY",
    sources: [],
  };
}

export function RoadmapPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("roadmap");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [blocks, setBlocks] = useState<DocumentBlock[]>(DOCUMENT_BLOCKS);
  const [tocOpen, setTocOpen] = useState(true);
  const [activeTocId, setActiveTocId] = useState<string | null>("h-1-3");
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [libraryMode, setLibraryMode] = useState<LibraryMode | null>(null);
  const blockRefs = useRef<Record<string, HTMLElement | null>>({});

  const scrollToBlock = useCallback((id: string) => {
    blockRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveTocId(id);
  }, []);

  const updatePrompt = (blockId: string, prompt: string) => {
    setBlocks((prev) =>
      prev.map((block) =>
        block.type === "content" && block.id === blockId
          ? { ...block, prompt }
          : block,
      ),
    );
  };

  const updateOutputType = (blockId: string, outputType: string) => {
    setBlocks((prev) =>
      prev.map((block) =>
        block.type === "content" && block.id === blockId
          ? { ...block, outputType }
          : block,
      ),
    );
  };

  const updateSourceInBlock = (blockId: string, source: RoadmapSource) => {
    setBlocks((prev) =>
      prev.map((block) =>
        block.type === "content" && block.id === blockId
          ? {
              ...block,
              sources: block.sources.map((s) => (s.id === source.id ? source : s)),
            }
          : block,
      ),
    );
  };

  const duplicateSourceInBlock = (blockId: string, sourceId: string) => {
    setBlocks((prev) =>
      prev.map((block) => {
        if (block.type !== "content" || block.id !== blockId) return block;
        const index = block.sources.findIndex((s) => s.id === sourceId);
        if (index === -1) return block;
        const copy: RoadmapSource = {
          ...block.sources[index],
          id: crypto.randomUUID(),
        };
        const sources = [...block.sources];
        sources.splice(index + 1, 0, copy);
        return { ...block, sources };
      }),
    );
  };

  const removeSourceFromBlock = (blockId: string, sourceId: string) => {
    setBlocks((prev) =>
      prev.map((block) =>
        block.type === "content" && block.id === blockId
          ? { ...block, sources: block.sources.filter((s) => s.id !== sourceId) }
          : block,
      ),
    );
  };

  const addSourceToBlock = (blockId: string, dataSource?: string) => {
    const ds = dataSource ?? DATA_SOURCES[0];
    const defaultSection = getDefaultSectionForDocument(ds);
    const referenceKey =
      defaultSection?.referenceKey ?? getReferenceKeysForDataSource(ds)[0] ?? "";
    const newSource = createSourceForType("DATA_SOURCE", {
      status: "proposed",
      dataSource: ds,
    });
    if (newSource.sourceType === "DATA_SOURCE") {
      newSource.referenceKey = referenceKey;
    }
    setBlocks((prev) =>
      prev.map((block) =>
        block.type === "content" && block.id === blockId
          ? { ...block, sources: [...block.sources, newSource] }
          : block,
      ),
    );
    setToast("Source added");
  };

  const deleteContentBlock = (blockId: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
    setToast("Content block deleted");
  };

  const duplicateBlock = (blockId: string) => {
    setBlocks((prev) => {
      const index = prev.findIndex((b) => b.id === blockId);
      if (index === -1) return prev;
      const block = prev[index];
      if (block.type !== "content") return prev;
      const next = [...prev];
      next.splice(index + 1, 0, cloneBlock(block));
      return next;
    });
    setToast("Content duplicated");
  };

  const insertBlockAfter = (afterBlockId: string, block: DocumentBlock) => {
    setBlocks((prev) => {
      const index = prev.findIndex((b) => b.id === afterBlockId);
      if (index === -1) return prev;
      const next = [...prev];
      next.splice(index + 1, 0, block);
      return next;
    });
    setToast("Block added");
  };

  const addHeadingAfter = (headingId: string, level?: HeadingBlock["level"]) => {
    setBlocks((prev) => {
      const insertAt = findInsertIndexAfterHeadingSection(prev, headingId);
      if (insertAt === null) return prev;
      const next = [...prev];
      next.splice(insertAt, 0, createHeadingBlock(level));
      return next;
    });
    setToast("Heading added");
  };

  const addContentAfter = (afterBlockId: string) => {
    insertBlockAfter(afterBlockId, createContentBlock());
  };

  return (
    <div className="flex h-screen flex-col bg-[#eeeeee]">
      {/* Header row */}
      <header className="shrink-0 border-b border-[#d4ced3] bg-white">
        <div className="flex h-[68px] items-center justify-between gap-4 px-4">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setActivePanel({ type: "nav" })}
              className="flex h-9 w-9 items-center justify-center rounded hover:bg-[#f5f5f5]"
              aria-label="Open navigation"
            >
              <img
                src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMyAxMkgyMU0zIDZIMjFNNyAxOEgyMSIgc3Ryb2tlPSIjNjM2MTYxIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjwvc3ZnPg=="
                alt=""
                className="h-6 w-6"
              />
            </button>
            <div className="min-w-0">
              <button
                type="button"
                className="block text-left text-[14px] font-normal leading-[18px] text-[#ff4e49] hover:underline"
              >
                Study ACM101 Demo (stg replica)
              </button>
              <div className="mt-0.5 flex items-center gap-1">
                <span className="text-[14px] font-medium leading-[22px] text-[#302f2f]">
                  TGN-2
                </span>
                <button type="button" aria-label="Document info" className="text-[#9e9e9e]">
                  <Info size={14} strokeWidth={1.75} />
                </button>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <DropdownMenu
              align="right"
              trigger={
                <button type="button" className="peer-btn-outline !h-9 !px-3">
                  <Wand2 size={16} strokeWidth={1.75} />
                  <ChevronDown size={14} className="text-[#636161]" />
                </button>
              }
            >
              <MenuItem
                icon={<Pencil size={18} strokeWidth={1.75} />}
                title="Document View"
                description="Edit and format content"
                active={viewMode === "document"}
                onClick={() => setViewMode("document")}
              />
              <MenuItem
                icon={<Wand2 size={18} strokeWidth={1.75} className="text-[#ff4e49]" />}
                title="Roadmap View"
                description="Track progress visually"
                active={viewMode === "roadmap"}
                onClick={() => setViewMode("roadmap")}
              />
            </DropdownMenu>

            <div className="mx-1 h-6 w-px bg-[#d4ced3]" />

            <button
              type="button"
              onClick={() => setActivePanel({ type: "share" })}
              className="peer-btn-outline"
            >
              Share
            </button>

            <DropdownMenu
              align="right"
              trigger={
                <button type="button" className="peer-btn-outline !h-9 !px-3">
                  <Play size={16} strokeWidth={1.75} />
                  <ChevronDown size={14} className="text-[#636161]" />
                </button>
              }
            >
              <MenuItem
                title="Run generation"
                description="Generate all pending sections"
                onClick={() => setToast("Generation started…")}
              />
              <MenuItem
                title="Preview output"
                description="Open document preview"
                onClick={() => setViewMode("document")}
              />
            </DropdownMenu>

            <div
              className="flex overflow-hidden rounded-md border border-[#d4ced3]"
              role="group"
              aria-label="Theme switcher"
            >
              <button
                type="button"
                onClick={() => setTheme("light")}
                aria-pressed={theme === "light"}
                className={`px-2 py-1 ${theme === "light" ? "border border-[#fe9591] bg-[#fedbda]" : "bg-white"}`}
                style={{ borderRadius: "6px 0 0 6px" }}
              >
                <Sun size={16} strokeWidth={1.75} color="#302f2f" />
              </button>
              <button
                type="button"
                onClick={() => setTheme("dark")}
                aria-pressed={theme === "dark"}
                className="border-x border-[#d4ced3] bg-white px-2 py-1"
              >
                <Moon size={16} strokeWidth={1.75} color="#302f2f" />
              </button>
              <button
                type="button"
                onClick={() => setToast("Settings opened")}
                className="bg-white px-2 py-1"
                style={{ borderRadius: "0 6px 6px 0" }}
              >
                <Settings size={16} strokeWidth={1.75} color="#302f2f" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setToast("Document update queued")}
              className="peer-btn-primary"
            >
              {viewMode === "roadmap" ? "Update Document" : "Download"}
            </button>
          </div>
        </div>
      </header>

      {/* Toolbar row */}
      <div className="relative flex h-10 shrink-0 items-center border-b border-[#d4ced3] bg-white px-4">
        <button
          type="button"
          onClick={() => setTocOpen((v) => !v)}
          aria-pressed={tocOpen}
          className={`flex h-8 w-8 items-center justify-center rounded-md border border-[#d4ced3] bg-white transition-colors ${
            tocOpen ? "border-[#fe9591] bg-[#fedbda]" : "hover:bg-[#fafafa]"
          }`}
          aria-label={tocOpen ? "Close table of contents" : "Open table of contents"}
          title={tocOpen ? "Close table of contents" : "Open table of contents"}
        >
          <List size={18} strokeWidth={1.75} />
        </button>

        <div className="pointer-events-none absolute left-1/2 flex -translate-x-1/2 items-center gap-2">
          <div className="pointer-events-auto flex h-8 items-center gap-2 rounded-md border border-[#d4ced3] bg-white px-3 text-[14px] text-[#9e9e9e]">
            <span>Heading 2</span>
            <ChevronDown size={14} />
          </div>
          <button
            type="button"
            className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded hover:bg-[#f5f5f5]"
            aria-label="Copy formatting"
          >
            <Copy size={16} strokeWidth={1.75} color="#636161" />
          </button>
        </div>

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => setLibraryMode({ type: "browse" })}
            className="relative flex h-8 w-8 items-center justify-center rounded hover:bg-[#f5f5f5]"
            aria-label={`Study library — ${DATA_SOURCES.length} documents`}
          >
            <Library size={18} strokeWidth={1.75} color="#636161" />
            <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[#ff4e49] px-0.5 text-[9px] font-medium leading-none text-white">
              {DATA_SOURCES.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() =>
              setActivePanel((p) => (p?.type === "version" ? null : { type: "version" }))
            }
            className="flex h-8 w-8 items-center justify-center rounded hover:bg-[#f5f5f5]"
            aria-label="Toggle version panel"
          >
            <History size={18} strokeWidth={1.75} color="#636161" />
          </button>
          <button
            type="button"
            onClick={() =>
              setActivePanel((p) => (p?.type === "trace" ? null : { type: "trace" }))
            }
            className="flex h-8 w-8 items-center justify-center rounded hover:bg-[#f5f5f5]"
            aria-label="Enter trace to datasource view"
          >
            <FileSearch size={18} strokeWidth={1.75} color="#636161" />
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {tocOpen && (
          <aside className="w-[204px] shrink-0 overflow-y-auto border-r border-[#d4ced3] bg-white">
            <nav className="py-2">
              {TOC_ITEMS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => scrollToBlock(item.id)}
                  className={`mx-2 block w-[calc(100%-16px)] rounded px-2 py-1.5 text-left text-[13px] leading-5 transition-colors ${
                    activeTocId === item.id
                      ? "bg-[#fedbda] font-medium text-[#302f2f]"
                      : "text-[#636161] hover:bg-[#fafafa]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </aside>
        )}

        <main className="min-w-0 flex-1 overflow-y-auto px-8 py-6">
          {viewMode === "roadmap" ? (
            <div className="roadmap-blocks relative mx-auto w-full max-w-[680px] overflow-visible pb-12">
              {blocks.map((block) => (
                <BlockRenderer
                  key={block.id}
                  block={block}
                  blockRefs={blockRefs}
                  onUpdateSource={(source) => updateSourceInBlock(block.id, source)}
                  onRemoveSource={(sourceId) => removeSourceFromBlock(block.id, sourceId)}
                  onDuplicateSource={(sourceId) => duplicateSourceInBlock(block.id, sourceId)}
                  onAddSource={() => setLibraryMode({ type: "add", blockId: block.id })}
                  onPromptChange={(prompt) => updatePrompt(block.id, prompt)}
                  onOutputTypeChange={(outputType) =>
                    updateOutputType(block.id, outputType)
                  }
                  onDuplicate={duplicateBlock}
                  onDelete={deleteContentBlock}
                  onAddHeadingAfter={addHeadingAfter}
                  onAddContentAfter={addContentAfter}
                />
              ))}
            </div>
          ) : (
            <DocumentView blocks={blocks} blockRefs={blockRefs} />
          )}
        </main>

        {activePanel?.type === "version" && <VersionPanel onClose={() => setActivePanel(null)} />}
        {activePanel?.type === "trace" && (
          <TracePanel blocks={blocks} onClose={() => setActivePanel(null)} />
        )}

      </div>

      {libraryMode?.type === "browse" && (
        <SourceLibraryOverlay onClose={() => setLibraryMode(null)} />
      )}
      {libraryMode?.type === "add" && (
        <SourceLibraryOverlay
          addToBlockLabel="Add to section"
          onClose={() => setLibraryMode(null)}
          onAddToSection={(dataSource) => addSourceToBlock(libraryMode.blockId, dataSource)}
        />
      )}

      {activePanel?.type === "share" && (
        <Modal
          title="Share document"
          onClose={() => setActivePanel(null)}
          footer={
            <>
              <button type="button" onClick={() => setActivePanel(null)} className="peer-btn-outline">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setToast("Invite sent");
                  setActivePanel(null);
                }}
                className="peer-btn-primary"
              >
                Send invite
              </button>
            </>
          }
        >
          <label className="mb-1.5 block text-[13px] text-[#636161]">Email</label>
          <input
            type="email"
            placeholder="colleague@company.com"
            className="w-full rounded-md border border-[#d4ced3] px-3 py-2 text-[14px]"
          />
        </Modal>
      )}


      {activePanel?.type === "nav" && (
        <div className="fixed inset-0 z-50 flex">
          <button
            type="button"
            aria-label="Close navigation"
            className="flex-1 bg-black/30"
            onClick={() => setActivePanel(null)}
          />
          <aside className="w-[280px] bg-white shadow-xl">
            <header className="flex items-center justify-between border-b border-[#d4ced3] px-4 py-4">
              <span className="text-[14px] font-semibold text-[#302f2f]">Dev test</span>
              <button type="button" onClick={() => setActivePanel(null)}>
                <X size={18} />
              </button>
            </header>
            <nav className="p-2">
              {["Home", "Style guides", "Studies", "Documents"].map((item) => (
                <button
                  key={item}
                  type="button"
                  className="block w-full rounded px-3 py-2.5 text-left text-[14px] hover:bg-[#fafafa]"
                >
                  {item}
                </button>
              ))}
            </nav>
            <div className="absolute bottom-0 left-0 right-0 border-t border-[#d4ced3] p-4">
              <p className="text-[14px] font-medium">Adarsh</p>
              <p className="text-[12px] text-[#636161]">adarsh.nellore@getpeer.ai</p>
            </div>
          </aside>
        </div>
      )}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}

function BlockRenderer({
  block,
  blockRefs,
  onUpdateSource,
  onRemoveSource,
  onDuplicateSource,
  onAddSource,
  onPromptChange,
  onOutputTypeChange,
  onDuplicate,
  onDelete,
  onAddHeadingAfter,
  onAddContentAfter,
}: {
  block: DocumentBlock;
  blockRefs: MutableRefObject<Record<string, HTMLElement | null>>;
  onUpdateSource: (source: RoadmapSource) => void;
  onRemoveSource: (sourceId: string) => void;
  onDuplicateSource: (sourceId: string) => void;
  onAddSource: () => void;
  onPromptChange: (prompt: string) => void;
  onOutputTypeChange: (outputType: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onAddHeadingAfter: (blockId: string, level?: HeadingBlock["level"]) => void;
  onAddContentAfter: (blockId: string) => void;
}) {
  if (block.type === "heading") {
    const isH1 = block.level === 1;
    const isH2 = block.level === 2;
    const isH3 = block.level === 3;
    const Tag = isH1 ? "h1" : isH2 ? "h2" : "h3";
    const className = isH1
      ? "mt-10 text-[28px] font-semibold leading-9 text-[#333] first:mt-0"
      : isH2
        ? "mt-8 text-[24px] font-semibold leading-8 text-[#333]"
        : isH3
          ? "mt-6 text-[20px] font-semibold leading-7 text-[#333]"
          : "mt-4 text-[16px] font-semibold leading-6 text-[#333]";

    return (
      <div
        ref={(el) => {
          blockRefs.current[block.id] = el;
        }}
        className="group relative overflow-visible"
      >
        <Tag className={className}>
          {block.number && <span>{block.number} </span>}
          {block.title}
        </Tag>
        <BlockAddButton
          label="Add heading after"
          className={isH1 || isH2 ? "top-1/2 -translate-y-1/2" : "top-3"}
          onClick={() => onAddHeadingAfter(block.id, block.level)}
        />
      </div>
    );
  }

  if (block.type === "pageBreak") {
    return (
      <div className="relative my-8">
        <div className="border-t border-dashed border-[#d4ced3]" />
        <span className="absolute right-0 top-1/2 -translate-y-1/2 bg-[#eeeeee] px-2 text-[10px] font-medium uppercase tracking-wider text-[#9e9e9e]">
          Page break
        </span>
      </div>
    );
  }

  return (
    <div
      ref={(el) => {
        blockRefs.current[block.id] = el;
      }}
      className="group relative mb-4 mt-2 overflow-visible"
    >
      <BlockAddButton
        label="Add content block after"
        className="top-4"
        onClick={() => onAddContentAfter(block.id)}
      />
      <SectionContentBlock
        block={block}
        onUpdateSource={onUpdateSource}
        onRemoveSource={onRemoveSource}
        onDuplicateSource={onDuplicateSource}
        onAddSource={onAddSource}
        onPromptChange={onPromptChange}
        onOutputTypeChange={onOutputTypeChange}
        onDuplicate={() => onDuplicate(block.id)}
        onDelete={() => onDelete(block.id)}
      />
    </div>
  );
}

function BlockAddButton({
  label,
  onClick,
  className = "",
}: {
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`absolute left-[calc(100%+10px)] z-10 flex h-7 w-7 items-center justify-center rounded-full border border-[#d4ced3] bg-white text-[#636161] opacity-0 shadow-sm transition-all hover:border-[#ff4e49]/50 hover:bg-[#fff5f5] hover:text-[#ff4e49] group-hover:opacity-100 focus-visible:opacity-100 ${className}`}
    >
      <Plus size={14} strokeWidth={2} />
    </button>
  );
}

function DocumentView({
  blocks,
  blockRefs,
}: {
  blocks: DocumentBlock[];
  blockRefs: MutableRefObject<Record<string, HTMLElement | null>>;
}) {
  return (
    <div className="mx-auto max-w-[800px] bg-white shadow-sm">
      <div className="space-y-6 p-12">
        {blocks.map((block) => {
          if (block.type === "pageBreak") {
            return <div key={block.id} className="border-t border-dashed border-[#ddd] pt-8" />;
          }
          if (block.type === "heading") {
            const Tag = block.level === 1 ? "h1" : block.level === 2 ? "h2" : "h3";
            return (
              <Tag
                key={block.id}
                ref={(el) => {
                  blockRefs.current[block.id] = el;
                }}
                className={
                  block.level === 1
                    ? "text-[24px] font-bold text-[#333]"
                    : block.level === 2
                      ? "text-[24px] font-semibold text-[#333]"
                      : "text-[20px] font-semibold text-[#333]"
                }
              >
                {block.number && `${block.number} `}
                {block.title}
              </Tag>
            );
          }
          return (
            <div
              key={block.id}
              ref={(el) => {
                blockRefs.current[block.id] = el;
              }}
              className="rounded border border-dashed border-[#e1e1e1] p-4 text-[14px] leading-relaxed text-[#636161]"
            >
              {block.previewText}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VersionPanel({ onClose }: { onClose: () => void }) {
  return (
    <aside className="w-[300px] shrink-0 overflow-y-auto border-l border-[#d4ced3] bg-white">
      <header className="flex items-center justify-between border-b border-[#d4ced3] px-4 py-3">
        <h3 className="text-[14px] font-medium">Version history</h3>
        <button type="button" onClick={onClose}>
          <X size={16} />
        </button>
      </header>
      <div className="space-y-2 p-4">
        {["Today, 11:24 AM", "Yesterday, 4:12 PM", "Jun 15, 2:30 PM"].map((label, i) => (
          <button
            key={label}
            type="button"
            className={`w-full rounded-md border px-3 py-2 text-left text-[13px] ${
              i === 0 ? "border-[#ff4e49] bg-[#fedbda]" : "border-[#d4ced3] hover:bg-[#fafafa]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </aside>
  );
}

function TracePanel({
  blocks,
  onClose,
}: {
  blocks: DocumentBlock[];
  onClose: () => void;
}) {
  const sources = blocks
    .filter((b): b is ContentBlockData => b.type === "content")
    .flatMap((b) => b.sources)
    .filter((s, i, arr) => arr.findIndex((x) => x.id === s.id) === i);

  return (
    <aside className="w-[320px] shrink-0 overflow-y-auto border-l border-[#d4ced3] bg-white">
      <header className="flex items-center justify-between border-b border-[#d4ced3] px-4 py-3">
        <h3 className="text-[14px] font-medium">Trace to datasource</h3>
        <button type="button" onClick={onClose}>
          <X size={16} />
        </button>
      </header>
      <div className="space-y-3 p-4">
        {sources.map((source) => (
          <div key={source.id} className="rounded-md border border-[#d4ced3] p-3 text-[13px]">
            <p className="font-medium">{getSourceLabel(source)}</p>
            {source.sourceType === "DATA_SOURCE" && (
              <p className="mt-1 text-[12px] text-[#636161]">
                {source.dataSource} · {source.referenceKey}
              </p>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}
