import { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, X } from "lucide-react";
import { getSectionsForDocument, type DocumentSection } from "../data/documentPreview";
import type { RoadmapSource } from "../data/roadmap";

export function PagePickerPanel({
  source,
  onClose,
  onSelectReferenceKey,
}: {
  source: RoadmapSource;
  onClose: () => void;
  onSelectReferenceKey: (referenceKey: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const selectedRef = useRef<HTMLButtonElement>(null);

  const dataSource =
    source.sourceType === "DATA_SOURCE" ? source.dataSource : "";
  const sections = getSectionsForDocument(dataSource);
  const currentKey =
    source.sourceType === "DATA_SOURCE" ? source.referenceKey : "";

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [currentKey]);

  if (source.sourceType !== "DATA_SOURCE") {
    return null;
  }

  const panel = (
    <>
      <header className="flex items-center justify-between border-b border-[#d4ced3] px-4 py-3">
        <div className="min-w-0">
          <h3 className="truncate text-[14px] font-medium text-[#302f2f]">
            {source.dataSource}
          </h3>
          <p className="text-[12px] text-[#636161]">Select pages for this source</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="rounded p-1.5 hover:bg-[#f5f5f5]"
            aria-label={expanded ? "Dock panel" : "Expand panel"}
          >
            {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <button type="button" onClick={onClose} className="rounded p-1.5 hover:bg-[#f5f5f5]">
            <X size={16} />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-3">
        <div className="space-y-1">
          {sections.map((section) => (
            <SectionRow
              key={section.id}
              section={section}
              selected={section.referenceKey === currentKey}
              buttonRef={section.referenceKey === currentKey ? selectedRef : undefined}
              onSelect={() => onSelectReferenceKey(section.referenceKey)}
            />
          ))}
        </div>
      </div>

      <footer className="border-t border-[#d4ced3] px-4 py-3">
        <p className="mb-2 text-[12px] text-[#636161]">
          Selected: <span className="font-medium text-[#302f2f]">{currentKey}</span>
        </p>
        <button type="button" onClick={onClose} className="peer-btn-primary w-full">
          Apply selection
        </button>
      </footer>
    </>
  );

  if (expanded) {
    return (
      <div className="fixed inset-0 z-50 flex">
        <button
          type="button"
          aria-label="Close preview"
          className="flex-1 bg-black/20"
          onClick={onClose}
        />
        <aside className="flex w-[min(720px,90vw)] flex-col bg-white shadow-xl">{panel}</aside>
      </div>
    );
  }

  return (
    <aside className="flex w-[340px] shrink-0 flex-col border-l border-[#d4ced3] bg-white">
      {panel}
    </aside>
  );
}

function SectionRow({
  section,
  selected,
  buttonRef,
  onSelect,
}: {
  section: DocumentSection;
  selected: boolean;
  buttonRef?: React.RefObject<HTMLButtonElement | null>;
  onSelect: () => void;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onSelect}
      className={`w-full rounded-md border px-3 py-2.5 text-left transition-colors ${
        selected
          ? "border-[#ff4e49] bg-[#fedbda]"
          : "border-transparent hover:border-[#d4ced3] hover:bg-[#fafafa]"
      }`}
    >
      <div className="flex items-center gap-2">
        <KindBadge kind={section.kind} />
        <span className="text-[13px] font-medium text-[#302f2f]">{section.title}</span>
      </div>
      <p className="mt-1 text-[11px] text-[#636161]">{section.referenceKey}</p>
      <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-[#9e9e9e]">
        {section.preview}
      </p>
    </button>
  );
}

function KindBadge({ kind }: { kind: DocumentSection["kind"] }) {
  const label =
    kind === "figure" ? "Fig" : kind === "listing" ? "List" : kind === "table" ? "Tbl" : "Sec";
  return (
    <span className="shrink-0 rounded bg-[#ececec] px-1.5 py-0.5 text-[10px] font-medium uppercase text-[#636161]">
      {label}
    </span>
  );
}
