import { useEffect, useId, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  X,
} from "lucide-react";
import {
  getDocumentPageCount,
  getDocumentPdfAsset,
  getDocumentPdfPageUrl,
  getInitialPageForSource,
  getPageRangeChips,
  getPreviewForSource,
  getSectionsForDocument,
  parsePageRange,
} from "../data/documentPreview";
import type { RoadmapSource } from "../data/roadmap";
import { enrichDataSourceSource } from "../data/roadmap";
import {
  findStudySourceById,
  findStudySourceForRoadmapSource,
  studySourceToRoadmapSource,
  type StudyDataSource,
} from "../data/studyDataSources";
import { getSourceSectionName } from "../data/sourceHelpers";
import { StudyDataSourcesList } from "./StudyDataSourcesList";

type PanelViewState = {
  currentPage: number;
  activeChip: string | null;
  zoom: number;
};

type PanelMode = "detail" | "list";
type DetailOrigin = "trace" | "list";

function getInitialViewState(source: RoadmapSource): PanelViewState {
  return {
    currentPage: getInitialPageForSource(source),
    activeChip:
      source.sourceType === "DATA_SOURCE"
        ? parsePageRange(source.referenceKey).chip
        : null,
    zoom: 1,
  };
}

function getDataSourceLabel(source: RoadmapSource): string | null {
  if (source.sourceType === "DATA_SOURCE") {
    return source.dataSource;
  }
  if (source.sourceType === "REFERENCE_SOURCE") {
    return source.referenceSource || "Reference source";
  }
  return source.content || null;
}

function referenceKeyForPage(
  sections: ReturnType<typeof getSectionsForDocument>,
  page: number,
): string | undefined {
  for (const section of sections) {
    const { start, end } = parsePageRange(section.referenceKey);
    if (page >= start && page <= end) return section.referenceKey;
  }
  return undefined;
}

export function DataSourcePanel({
  source,
  sectionTitle,
  initialPanelMode = "detail",
  embedded = false,
  onClose,
  onUpdateMappedSource,
}: {
  source: RoadmapSource;
  sectionTitle?: string | null;
  initialPanelMode?: PanelMode;
  /** When true, fill the parent column (V3 matrix) instead of fixed 360px dock. */
  embedded?: boolean;
  blockSources?: RoadmapSource[];
  activeSourceId?: string;
  onSourceChange?: (sourceId: string) => void;
  onClose: () => void;
  /** When tracing a mapped section source, sync section/page edits back to the roadmap. */
  onUpdateMappedSource?: (source: RoadmapSource) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [panelMode, setPanelMode] = useState<PanelMode>(initialPanelMode);
  const [detailOrigin, setDetailOrigin] = useState<DetailOrigin>("trace");
  const [previewSource, setPreviewSource] = useState<RoadmapSource>(source);
  const [activeStudySourceId, setActiveStudySourceId] = useState<string | undefined>(
    () =>
      source.sourceType === "DATA_SOURCE"
        ? findStudySourceForRoadmapSource(source)?.id
        : undefined,
  );
  const [viewState, setViewState] = useState<PanelViewState>(() =>
    getInitialViewState(source),
  );
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [studySearchQuery, setStudySearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    setPreviewSource(source);
    setPanelMode(initialPanelMode);
    setDetailOrigin(initialPanelMode === "list" ? "list" : "trace");
    setViewState(getInitialViewState(source));
    setDropdownOpen(false);
    setActiveStudySourceId(
      source.sourceType === "DATA_SOURCE"
        ? findStudySourceForRoadmapSource(source)?.id
        : undefined,
    );
  }, [source, initialPanelMode]);

  useEffect(() => {
    if (!dropdownOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [dropdownOpen]);

  const dataSource =
    previewSource.sourceType === "DATA_SOURCE" ? previewSource.dataSource : "";
  const dataSourceLabel = getDataSourceLabel(previewSource);
  const sections = dataSource ? getSectionsForDocument(dataSource) : [];
  const totalPages = dataSource ? getDocumentPageCount(dataSource) : 1;
  const preview = getPreviewForSource(previewSource, viewState.currentPage);
  const rangeChips = dataSource ? getPageRangeChips(dataSource) : [];
  const pdfAsset = dataSource ? getDocumentPdfAsset(dataSource) : null;
  const pdfPageUrl = dataSource
    ? getDocumentPdfPageUrl(dataSource, viewState.currentPage)
    : null;

  const applyReferenceKey = (referenceKey: string) => {
    if (previewSource.sourceType !== "DATA_SOURCE") return;
    const { start, chip } = parsePageRange(referenceKey);
    const next = enrichDataSourceSource({
      ...previewSource,
      referenceKey,
      sectionName: undefined,
    });
    setPreviewSource(next);
    setViewState((prev) => ({ ...prev, currentPage: start, activeChip: chip }));
    setDropdownOpen(false);
    const entry = findStudySourceForRoadmapSource(next);
    if (entry) setActiveStudySourceId(entry.id);
    if (detailOrigin === "trace") {
      onUpdateMappedSource?.(next);
    }
  };

  const selectSection = (referenceKey: string) => {
    applyReferenceKey(referenceKey);
  };

  const jumpToChip = (chip: string) => {
    const section = sections.find((s) => parsePageRange(s.referenceKey).chip === chip);
    if (section) {
      applyReferenceKey(section.referenceKey);
      return;
    }
    const start = Number.parseInt(chip.split("-")[0], 10);
    if (Number.isFinite(start)) {
      if (detailOrigin === "trace") {
        const key = referenceKeyForPage(sections, start);
        if (key) {
          applyReferenceKey(key);
          return;
        }
      }
      setViewState((prev) => ({ ...prev, currentPage: start, activeChip: chip }));
    }
  };

  const goToPage = (page: number) => {
    const clamped = Math.max(1, Math.min(totalPages, page));
    if (detailOrigin === "trace") {
      const key = referenceKeyForPage(sections, clamped);
      if (key) {
        applyReferenceKey(key);
        return;
      }
    }
    const section = sections.find((s) => {
      const { start, end } = parsePageRange(s.referenceKey);
      return clamped >= start && clamped <= end;
    });
    setViewState((prev) => ({
      ...prev,
      currentPage: clamped,
      activeChip: section ? parsePageRange(section.referenceKey).chip : prev.activeChip,
    }));
  };

  const openStudySourceDetail = (entry: StudyDataSource) => {
    const nextSource = studySourceToRoadmapSource(entry);
    setPreviewSource(nextSource);
    setActiveStudySourceId(entry.id);
    setViewState(getInitialViewState(nextSource));
    setDetailOrigin("list");
    setPanelMode("detail");
    setDropdownOpen(false);
  };

  /** Trace-from-section: return to the outer library. Browse-in-panel: return to list. */
  const exitDetailView = () => {
    if (detailOrigin === "trace") {
      onClose();
      return;
    }
    setPanelMode("list");
  };

  const handleBack = () => {
    if (panelMode === "detail") {
      exitDetailView();
      return;
    }
    onClose();
  };

  useEffect(() => {
    if (!isExpanded) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (panelMode === "detail") {
        if (detailOrigin === "trace") {
          onClose();
        } else {
          setPanelMode("list");
        }
        return;
      }
      setIsExpanded(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isExpanded, panelMode, detailOrigin, onClose]);

  const activeStudyEntry = activeStudySourceId
    ? findStudySourceById(activeStudySourceId)
    : undefined;

  const detailPrimaryTitle =
    detailOrigin === "trace" && sectionTitle
      ? sectionTitle
      : activeStudyEntry?.name ?? getSourceSectionName(previewSource);

  const detailSecondaryTitle = dataSourceLabel;

  const headerActions = (
    <div className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        onClick={() => setIsExpanded((expanded) => !expanded)}
        aria-label={isExpanded ? "Minimize datasource panel" : "Expand datasource panel"}
        className="rounded p-1 text-[#636161] hover:bg-[#f5f5f5]"
      >
        {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
      </button>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close datasource panel"
        className="rounded p-1 text-[#636161] hover:bg-[#f5f5f5]"
      >
        <X size={18} />
      </button>
    </div>
  );

  const panelBody =
    panelMode === "list" ? (
      <StudyDataSourcesList
        activeSourceId={activeStudySourceId}
        onSelect={openStudySourceDetail}
        compact={!isExpanded}
        query={studySearchQuery}
        onQueryChange={setStudySearchQuery}
      />
    ) : (
      <DataSourcePanelBody
        source={previewSource}
        sections={sections}
        rangeChips={rangeChips}
        preview={preview}
        pdfAsset={pdfAsset}
        pdfPageUrl={pdfPageUrl}
        totalPages={totalPages}
        viewState={viewState}
        setViewState={setViewState}
        dropdownOpen={dropdownOpen}
        setDropdownOpen={setDropdownOpen}
        dropdownRef={dropdownRef}
        listId={listId}
        selectSection={selectSection}
        jumpToChip={jumpToChip}
        goToPage={goToPage}
        expanded={isExpanded}
      />
    );

  const panelHeader =
    panelMode === "list" ? (
      <header className="flex shrink-0 items-center justify-end border-b border-[#d4ced3] px-3 py-2">
        {headerActions}
      </header>
    ) : (
      <header className="shrink-0 border-b border-[#d4ced3] px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="-ml-1 inline-flex items-center gap-1 rounded px-1 py-0.5 text-[13px] font-medium text-[#636161] hover:bg-[#f5f5f5] hover:text-[#302f2f]"
          >
            <ArrowLeft size={16} />
            Back
          </button>
          {headerActions}
        </div>
        {(detailPrimaryTitle || detailSecondaryTitle) && (
          <div className="mt-2 min-w-0">
            {detailPrimaryTitle && (
              <p className="text-[14px] font-semibold leading-snug break-words text-[#302f2f]">
                {detailPrimaryTitle}
              </p>
            )}
            {detailSecondaryTitle && (
              <p className="mt-0.5 text-[12px] leading-snug break-words text-[#636161]">
                {detailSecondaryTitle}
              </p>
            )}
          </div>
        )}
      </header>
    );

  if (isExpanded) {
    return (
      <div
        data-datasource-panel=""
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      >
        <button
          type="button"
          aria-label="Minimize datasource panel"
          className="absolute inset-0 bg-black/25 backdrop-blur-sm"
          onClick={() => setIsExpanded(false)}
        />
        <div className="relative flex h-[min(92vh,900px)] w-[min(96vw,1200px)] flex-col overflow-hidden rounded-xl border border-[#d4ced3] bg-white shadow-2xl">
          {panelHeader}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{panelBody}</div>
        </div>
      </div>
    );
  }

  const dockClassName = embedded
    ? "flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-white"
    : "fixed inset-y-0 right-0 z-40 flex w-[min(90vw,360px)] shrink-0 flex-col border-l border-[#d4ced3] bg-white shadow-lg md:relative md:z-0 md:w-[360px] md:shadow-none";

  return (
    <aside data-datasource-panel="" className={dockClassName}>
      {panelHeader}
      {panelBody}
    </aside>
  );
}

function DataSourcePanelBody({
  source,
  sections,
  rangeChips,
  preview,
  pdfAsset,
  pdfPageUrl,
  totalPages,
  viewState,
  setViewState,
  dropdownOpen,
  setDropdownOpen,
  dropdownRef,
  listId,
  selectSection,
  jumpToChip,
  goToPage,
  expanded,
}: {
  source: RoadmapSource;
  sections: ReturnType<typeof getSectionsForDocument>;
  rangeChips: string[];
  preview: ReturnType<typeof getPreviewForSource>;
  pdfAsset: ReturnType<typeof getDocumentPdfAsset>;
  pdfPageUrl: string | null;
  totalPages: number;
  viewState: PanelViewState;
  setViewState: React.Dispatch<React.SetStateAction<PanelViewState>>;
  dropdownOpen: boolean;
  setDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  listId: string;
  selectSection: (referenceKey: string) => void;
  jumpToChip: (chip: string) => void;
  goToPage: (page: number) => void;
  expanded: boolean;
}) {
  const { currentPage, activeChip, zoom } = viewState;
  const currentSectionName = getSourceSectionName(source);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {source.sourceType === "DATA_SOURCE" ? (
        <>
          <div className="shrink-0 space-y-3 border-b border-[#ececec] px-4 py-3">
            <div ref={dropdownRef} className="relative">
              <p className="mb-1.5 text-[12px] font-medium text-[#636161]">Document section</p>
              <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={dropdownOpen}
                aria-controls={listId}
                onClick={() => setDropdownOpen((open) => !open)}
                className="flex w-full items-center justify-between gap-2 rounded-md border border-[#d4ced3] bg-white px-3 py-2 text-left text-[13px] text-[#302f2f] hover:border-[#bdbdbd]"
              >
                <span className="break-words">{currentSectionName}</span>
                <ChevronDown size={14} className="shrink-0 text-[#757575]" />
              </button>
              {dropdownOpen && (
                <ul
                  id={listId}
                  role="listbox"
                  className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-md border border-[#d4ced3] bg-white py-1 shadow-lg"
                >
                  {sections.map((section) => (
                    <li key={section.id} role="option">
                      <button
                        type="button"
                        onClick={() => selectSection(section.referenceKey)}
                        className="block w-full px-3 py-2 text-left text-[13px] text-[#302f2f] hover:bg-[#fafafa]"
                      >
                        <span className="font-medium">{section.title}</span>
                        <span className="mt-0.5 block text-[11px] text-[#9e9e9e]">
                          {section.referenceKey}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {rangeChips.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {rangeChips.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => jumpToChip(chip)}
                    className={`rounded-md border px-2 py-1 text-[12px] font-medium transition-colors ${
                      activeChip === chip
                        ? "border-[#ff4e49] bg-[#fedbda] text-[#302f2f]"
                        : "border-[#d4ced3] bg-white text-[#636161] hover:bg-[#fafafa]"
                    }`}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-3">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                aria-label="Zoom out"
                onClick={() =>
                  setViewState((prev) => ({
                    ...prev,
                    zoom: Math.max(0.5, Math.round((prev.zoom - 0.1) * 10) / 10),
                  }))
                }
                className="flex h-7 w-7 items-center justify-center rounded border border-[#d4ced3] text-[#636161] hover:bg-[#fafafa]"
              >
                −
              </button>
              <input
                type="range"
                min={0.5}
                max={2}
                step={0.1}
                value={zoom}
                aria-label="Zoom level"
                onChange={(e) =>
                  setViewState((prev) => ({ ...prev, zoom: Number(e.target.value) }))
                }
                className="min-w-[80px] flex-1"
              />
              <button
                type="button"
                aria-label="Zoom in"
                onClick={() =>
                  setViewState((prev) => ({
                    ...prev,
                    zoom: Math.min(2, Math.round((prev.zoom + 0.1) * 10) / 10),
                  }))
                }
                className="flex h-7 w-7 items-center justify-center rounded border border-[#d4ced3] text-[#636161] hover:bg-[#fafafa]"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => setViewState((prev) => ({ ...prev, zoom: 1 }))}
                className="rounded border border-[#d4ced3] px-2 py-1 text-[12px] text-[#636161] hover:bg-[#fafafa]"
              >
                Reset
              </button>
              <span className="text-[12px] text-[#636161]">{Math.round(zoom * 100)}%</span>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden rounded-md border border-[#d4ced3]">
              {pdfAsset && pdfPageUrl ? (
                <PdfPageViewer pageUrl={pdfPageUrl} zoom={zoom} expanded={expanded} />
              ) : (
                <div className="flex h-full min-h-[200px] items-center justify-center bg-[#fafafa] p-6 text-center">
                  <p className="text-[13px] text-[#636161]">
                    No PDF preview available for this data source.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-3 flex shrink-0 items-center justify-between gap-2 border-t border-[#ececec] pt-3">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => goToPage(currentPage - 1)}
                className="flex items-center gap-1 rounded-md border border-[#d4ced3] px-2 py-1.5 text-[12px] text-[#636161] enabled:hover:bg-[#fafafa] disabled:opacity-40"
              >
                <ChevronLeft size={14} />
                Previous
              </button>
              <p className="text-[12px] text-[#636161]">
                Page {currentPage} of {totalPages}
              </p>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => goToPage(currentPage + 1)}
                className="flex items-center gap-1 rounded-md border border-[#d4ced3] px-2 py-1.5 text-[12px] text-[#636161] enabled:hover:bg-[#fafafa] disabled:opacity-40"
              >
                Next
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
          <p className="text-[14px] font-medium text-[#302f2f]">{preview.title}</p>
          <p className="mt-2 text-[13px] text-[#636161]">{preview.body}</p>
        </div>
      )}
    </div>
  );
}

function PdfPageViewer({
  pageUrl,
  zoom,
  expanded,
}: {
  pageUrl: string;
  zoom: number;
  expanded: boolean;
}) {
  return (
    <div className="h-full min-h-[360px] w-full overflow-auto bg-[#525252]">
      <div
        className="mx-auto origin-top p-2 transition-transform"
        style={{
          transform: `scale(${zoom})`,
          width: `${100 / zoom}%`,
        }}
      >
        <embed
          key={pageUrl}
          type="application/pdf"
          src={pageUrl}
          className={`block w-full min-w-0 bg-white ${
            expanded ? "h-[min(68vh,760px)]" : "h-[min(72vh,640px)]"
          }`}
        />
      </div>
    </div>
  );
}
