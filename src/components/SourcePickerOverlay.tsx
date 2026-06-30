import { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import {
  buildSourcePickerCategories,
  type SourcePickerCategory,
} from "../data/sourcePickerCatalog";

export function SourcePickerOverlay({
  modeLabel,
  modeColor,
  existingStudySourceIds = [],
  onConfirm,
  onClose,
}: {
  modeLabel?: string;
  modeColor?: string;
  existingStudySourceIds?: string[];
  onConfirm: (studySourceIds: string[]) => void;
  onClose: () => void;
}) {
  const categories = useMemo(() => buildSourcePickerCategories(), []);
  const [activeCategoryId, setActiveCategoryId] = useState(
    () => categories[0]?.id ?? "",
  );
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<Set<string>>(() => new Set());

  const activeCategory: SourcePickerCategory | undefined = categories.find(
    (c) => c.id === activeCategoryId,
  );

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!activeCategory) return [];
    if (!normalizedQuery) return activeCategory.artifacts;
    return activeCategory.artifacts.filter(
      (item) =>
        item.label.toLowerCase().includes(normalizedQuery) ||
        item.ref.toLowerCase().includes(normalizedQuery),
    );
  }, [activeCategory, normalizedQuery]);

  const existing = useMemo(() => new Set(existingStudySourceIds), [existingStudySourceIds]);

  const toggle = (studySourceId: string) => {
    if (existing.has(studySourceId)) return;
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(studySourceId)) next.delete(studySourceId);
      else next.add(studySourceId);
      return next;
    });
  };

  const confirmLabel = modeLabel
    ? `Add as ${modeLabel}`
    : picked.size === 1
      ? "Add source"
      : `Add ${picked.size} sources`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close add source picker"
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />
      <div
        className="relative flex max-h-[min(400px,85vh)] w-full max-w-[440px] flex-col overflow-hidden rounded-xl border border-[#d4ced3] bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="source-picker-title"
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[#d4ced3] px-4 py-3">
          <h2 id="source-picker-title" className="text-[14px] font-semibold text-[#302f2f]">
            Add source
          </h2>
          {modeLabel && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full border border-[#d4ced3] px-2 py-0.5 text-[11px] font-medium text-[#302f2f]"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: modeColor ?? "#1a8a4a" }}
                aria-hidden
              />
              {modeLabel}
            </span>
          )}
        </header>

        <div className="shrink-0 border-b border-[#d4ced3] px-3 py-2">
          <label className="relative block">
            <Search
              size={14}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#bdbdbd]"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search outputs by number or name — e.g. 14.3.1 or AE…"
              className="w-full rounded-lg border border-[#d4ced3] bg-[#fafafa] py-2 pl-8 pr-3 text-[12px] text-[#302f2f] placeholder:text-[#bdbdbd] focus:border-[#c8c0c6] focus:bg-white focus:outline-none"
              autoFocus
            />
          </label>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-[150px_1fr]">
          <nav className="overflow-y-auto border-r border-[#d4ced3] bg-[#f5f2f4] p-1.5">
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => {
                  setActiveCategoryId(category.id);
                  setQuery("");
                }}
                className={`mb-0.5 flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition-colors ${
                  activeCategoryId === category.id
                    ? "bg-white shadow-sm"
                    : "hover:bg-white/70"
                }`}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={{ backgroundColor: category.color }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-[#302f2f]">
                  {category.label}
                </span>
                <span className="shrink-0 text-[10px] tabular-nums text-[#9e9e9e]">
                  {category.artifacts.length}
                </span>
              </button>
            ))}
          </nav>

          <div className="min-h-0 overflow-y-auto p-1.5">
            {filtered.length === 0 ? (
              <p className="px-2 py-6 text-center text-[12px] text-[#9e9e9e]">
                {normalizedQuery ? "No matching outputs." : "No sections in this category."}
              </p>
            ) : (
              <ul className="space-y-0.5">
                {filtered.map((item) => {
                  const isPicked = picked.has(item.studySourceId);
                  const isAdded = existing.has(item.studySourceId);
                  return (
                    <li key={item.studySourceId}>
                      <button
                        type="button"
                        disabled={isAdded}
                        onClick={() => toggle(item.studySourceId)}
                        className={`flex w-full items-start gap-2.5 rounded-md px-2 py-2 text-left transition-colors ${
                          isAdded
                            ? "cursor-not-allowed opacity-50"
                            : isPicked
                              ? "bg-[#fedbda]"
                              : "hover:bg-[#f5f2f4]"
                        }`}
                      >
                        <span
                          className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                            isAdded
                              ? "border-[#d4ced3] bg-[#f0f0f0]"
                              : isPicked
                                ? "border-[#ff4e49] bg-[#ff4e49] text-white"
                                : "border-[#c8c0c6] bg-white"
                          }`}
                          aria-hidden
                        >
                          {(isPicked || isAdded) && <Check size={10} strokeWidth={3} />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-mono text-[10px] tabular-nums text-[#9e9e9e]">
                            {item.ref}
                          </span>
                          <span className="mt-0.5 block text-[12px] leading-snug text-[#302f2f]">
                            {item.label}
                          </span>
                          {isAdded && (
                            <span className="mt-0.5 block text-[10px] text-[#9e9e9e]">
                              Already added
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-[#d4ced3] px-4 py-3">
          <span className="text-[12px] tabular-nums text-[#636161]">
            {picked.size} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-1.5 text-[12px] font-medium text-[#636161] hover:bg-[#f5f2f4]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={picked.size === 0}
              onClick={() => onConfirm(Array.from(picked))}
              className="rounded-lg bg-[#ff4e49] px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-[#e64641] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {confirmLabel}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
