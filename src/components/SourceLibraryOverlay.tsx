import { useState } from "react";
import { Plus, X } from "lucide-react";
import { getSectionsForDocument } from "../data/documentPreview";
import { DATA_SOURCES } from "../data/roadmap";

export function SourceLibraryOverlay({
  addToBlockLabel,
  onClose,
  onAddToSection,
}: {
  addToBlockLabel?: string;
  onClose: () => void;
  onAddToSection?: (dataSource: string) => void;
}) {
  const [selected, setSelected] = useState<string>(DATA_SOURCES[0]);
  const sections = getSectionsForDocument(selected);
  const addMode = Boolean(onAddToSection);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <button
        type="button"
        aria-label="Close library"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div className="relative flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-[#d4ced3] px-5 py-4">
          <div>
            <h2 className="text-[18px] font-medium text-[#302f2f]">Study data sources</h2>
            <p className="text-[13px] text-[#636161]">
              {DATA_SOURCES.length} documents · browse and preview
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-[#f5f5f5]">
            <X size={20} />
          </button>
        </header>

        <div className="flex min-h-0 flex-1">
          <ul className="w-64 shrink-0 overflow-y-auto border-r border-[#d4ced3] p-2">
            {DATA_SOURCES.map((name) => (
              <li key={name}>
                <button
                  type="button"
                  onClick={() => setSelected(name)}
                  className={`w-full rounded-md px-3 py-2.5 text-left text-[13px] ${
                    selected === name
                      ? "bg-[#fedbda] font-medium text-[#302f2f]"
                      : "text-[#636161] hover:bg-[#fafafa]"
                  }`}
                >
                  {name}
                </button>
              </li>
            ))}
          </ul>

          <div className="min-w-0 flex-1 overflow-y-auto p-5">
            <h3 className="text-[15px] font-medium text-[#302f2f]">{selected}</h3>
            <p className="mt-1 text-[13px] text-[#636161]">
              Preview of sections, figures, and listings in this document.
            </p>
            <div className="mt-4 space-y-2">
              {sections.map((section) => (
                <div
                  key={section.id}
                  className="rounded-md border border-[#d4ced3] bg-[#fafafa] px-4 py-3"
                >
                  <p className="text-[13px] font-medium text-[#302f2f]">{section.title}</p>
                  <p className="text-[11px] text-[#9e9e9e]">{section.referenceKey}</p>
                  <p className="mt-1 text-[12px] text-[#636161]">{section.preview}</p>
                </div>
              ))}
              {sections.length === 0 && (
                <p className="text-[13px] text-[#9e9e9e]">No preview available for this document.</p>
              )}
            </div>
          </div>
        </div>

        <footer className="flex items-center justify-between border-t border-[#d4ced3] px-5 py-4">
          <button type="button" className="peer-btn-outline inline-flex items-center gap-1">
            <Plus size={14} /> Upload new document
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="peer-btn-outline">
              Close
            </button>
            {addMode && (
              <button
                type="button"
                onClick={() => {
                  onAddToSection?.(selected);
                  onClose();
                }}
                className="peer-btn-primary"
              >
                {addToBlockLabel ?? "Add to section"}
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
