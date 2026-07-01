import { useCallback, useEffect, useMemo, useRef, useState, Fragment, type MutableRefObject } from "react";
import {
  ChevronDown,
  Copy,
  FileSearch,
  History,
  Info,
  List,
  Moon,
  PanelLeft,
  PanelLeftClose,
  // Pencil,
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
import { DataSourcePanel } from "./DataSourcePanel";
import { StudyDataSourcesList } from "./StudyDataSourcesList";
import { TableOfContents } from "./TableOfContents";
import { VariantSwitcher, type VariantId } from "./VariantSwitcher";
import {
  MappingSubviewControl,
  MappingVariant,
  usesMatrixLayout,
  usesMappingToc,
  usesStorylineLayout,
  type MappingSubview,
} from "./variants/MappingVariant";
import { TwoColumnVariant } from "./variants/TwoColumnVariant";
import { SourceViewVariant } from "./variants/SourceViewVariant";
import { ConnectorVariant } from "./variants/ConnectorVariant";
import {
  collectStudySourcePlacements,
  findStudySourcePlacement,
  type StudySourcePlacement,
} from "../utils/studySourcePlacements";
import { MatrixVariant } from "./variants/MatrixVariant";
import { MATRIX_COLUMNS, outlineRefTocTargetId, type MatrixTagRole } from "./variants/types";
import { SourcePickerOverlay } from "./SourcePickerOverlay";
// import { SourceLibraryOverlay } from "./SourceLibraryOverlay";
import { DOCUMENT_BLOCKS } from "../data/roadmapDocument";
import type { OutlineRefPayload } from "../utils/v2DragPayload";
import {
  buildOutlineRefSource,
  extractBundledSources,
  extractOutlineContext,
  generateOutlineRefDescriptor,
} from "../utils/outlineRefEnrichment";
import {
  appendReferenceKeyToDataSource,
  consolidateContentBlockSourcesIfNeeded,
  consolidateDocumentBlocks,
  dataSourceConsolidationKey,
  getDataSourceReferenceKeys,
  normalizeDataSourceReferenceKeys,
} from "../utils/dataSourceReferences";
import { createSourceForType, type DataSourceRoadmapSource, type RoadmapSource, type SourceFormatRole, type SourceRole } from "../data/roadmap";
import { findStudySourceById, findStudySourceForRoadmapSource, studySourceToRoadmapSource, defaultFormatRoleForStudySource, STUDY_DATA_SOURCES, type StudyDataSource } from "../data/studyDataSources";
// import { getDefaultSectionForDocument } from "../data/documentPreview";
import type { ContentBlockData, DocumentBlock, HeadingBlock, ViewMode } from "../types";
import {
  bumpSubsequentHeadingNumbers,
  deleteHeadingSection,
  findInsertIndexAfterHeadingSection,
  getHeadingSectionBlockIds,
  isHeadingInsertionSlot,
  moveDocumentBlockFromTocDrop,
  nextSiblingHeadingNumber,
} from "../utils/documentBlocks";
import { LIBRARY_TRACE_BLOCK, type V2DragPayload } from "../utils/v2DragPayload";

type ActivePanel =
  | { type: "share" }
  | { type: "nav" }
  | { type: "version" }
  | null;

type TraceState = {
  blockId: string;
  sourceId: string;
  view: "list" | "detail" | "navigate";
} | null;

type ExpandedSourceState = {
  blockId: string;
  sourceId: string;
} | null;

type SourcePickerState = {
  blockId: string;
  role?: SourceRole;
  modeLabel?: string;
  modeColor?: string;
} | null;

function findFirstMappedSource(
  blocks: DocumentBlock[],
): { blockId: string; sourceId: string } | null {
  for (const block of blocks) {
    if (block.type === "content" && block.sources.length > 0) {
      return { blockId: block.id, sourceId: block.sources[0].id };
    }
  }
  return null;
}

function sourcesForBlock(block: DocumentBlock | undefined): RoadmapSource[] {
  if (!block) return [];
  if (block.type === "content") return block.sources;
  if (block.type === "heading") return block.sources ?? [];
  return [];
}

function findSourceInBlocks(
  blocks: DocumentBlock[],
  trace: { blockId: string; sourceId: string },
): RoadmapSource | null {
  const block = blocks.find((b) => b.id === trace.blockId);
  return sourcesForBlock(block).find((s) => s.id === trace.sourceId) ?? null;
}

function findBlockSources(
  blocks: DocumentBlock[],
  blockId: string,
): RoadmapSource[] {
  const block = blocks.find((b) => b.id === blockId);
  return sourcesForBlock(block);
}

function findBlockTitle(blocks: DocumentBlock[], blockId: string): string | null {
  const block = blocks.find((b) => b.id === blockId);
  if (!block) return null;
  if (block.type === "content") return block.title;
  if (block.type === "heading") {
    return block.number ? `${block.number} ${block.title}` : block.title;
  }
  return null;
}

// type LibraryMode = { type: "browse" } | { type: "add"; blockId: string };

function createHeadingBlock(
  level: HeadingBlock["level"] = 2,
  number = "",
): HeadingBlock {
  return {
    id: crypto.randomUUID(),
    type: "heading",
    level,
    number,
    title: "New heading",
  };
}

function createContentBlock(): ContentBlockData {
  return {
    id: crypto.randomUUID(),
    type: "content",
    title: "New section",
    previewText: "",
    prompt: "",
    additionalContext: "",
    outputType: "OUTPUT_TYPE_SUMMARY",
    sources: [],
  };
}

const ROADMAP_BLOCKS_STORAGE_KEY = "peer-roadmap-blocks-v1";

function findMatchingDataSourceIndex(
  sources: RoadmapSource[],
  incoming: DataSourceRoadmapSource,
): number {
  const incomingKey = dataSourceConsolidationKey(incoming);
  return sources.findIndex(
    (source) =>
      source.sourceType === "DATA_SOURCE" &&
      dataSourceConsolidationKey(source) === incomingKey,
  );
}

function loadRoadmapBlocks(): DocumentBlock[] {
  try {
    const raw = localStorage.getItem(ROADMAP_BLOCKS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed) && parsed.length > 0) {
        return consolidateDocumentBlocks(parsed as DocumentBlock[]);
      }
    }
  } catch {
    // Ignore corrupt storage and fall back to seed document.
  }
  return structuredClone(DOCUMENT_BLOCKS);
}

export function RoadmapPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("roadmap");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [blocks, setBlocks] = useState<DocumentBlock[]>(loadRoadmapBlocks);
  const [variant, setVariant] = useState<VariantId>("baseline");
  const [tocOpen, setTocOpen] = useState(true);
  const [activeTocId, setActiveTocId] = useState<string | null>("c-1-3");
  const [tocScrollTick, setTocScrollTick] = useState(0);
  const [matrixScrollTick, setMatrixScrollTick] = useState(0);
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [traceState, setTraceState] = useState<TraceState>(null);
  const [libraryTraceSource, setLibraryTraceSource] = useState<RoadmapSource | null>(null);
  const [v2DataPanelOpen, setV2DataPanelOpen] = useState(true);
  const [mappingSubview, setMappingSubview] = useState<MappingSubview>("storyline");
  const [tlfOnly, setTlfOnly] = useState(false);
  const [expandedSource, setExpandedSource] = useState<ExpandedSourceState>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [sourcePicker, setSourcePicker] = useState<SourcePickerState>(null);
  // const [libraryMode, setLibraryMode] = useState<LibraryMode | null>(null);
  const blockRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    try {
      localStorage.setItem(ROADMAP_BLOCKS_STORAGE_KEY, JSON.stringify(blocks));
    } catch {
      // Ignore quota / private-mode errors.
    }
  }, [blocks]);

  const scrollToBlock = useCallback((id: string) => {
    blockRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveTocId(id);
    if (window.innerWidth < 768) setTocOpen(false);
  }, []);

  // TOC clicks scroll to the target block. V1 uses document block refs; V2
  // scrolls the mapping board's section column via focusId.
  const storylineLayout = usesStorylineLayout(variant, mappingSubview);
  const matrixLayout = usesMatrixLayout(variant, mappingSubview);
  const showGlobalToc = usesMappingToc(variant, mappingSubview);
  /** V2 / V6 storyline: drag heading rows onto mapping targets. */
  const tocUsesOutlineMappingDrag = storylineLayout;
  /** V2 only: hide V1 add/delete hover actions on outline rows. */
  const tocHideAddActions = variant === "twoColumn";

  const handleTocNavigate = useCallback(
    (id: string, options?: { scrollCenter?: boolean }) => {
      if (storylineLayout) {
        setActiveTocId(id);
        if (options?.scrollCenter !== false) {
          setTocScrollTick((tick) => tick + 1);
        }
        if (window.innerWidth < 768) setTocOpen(false);
        return;
      }
      scrollToBlock(id);
    },
    [storylineLayout, scrollToBlock],
  );

  const moveBlockFromToc = useCallback((blockId: string, dropFlatIndex: number) => {
    setBlocks((prev) => moveDocumentBlockFromTocDrop(prev, blockId, dropFlatIndex));
  }, []);

  const navigateMatrixBlock = useCallback((id: string) => {
    setActiveTocId(id);
    setMatrixScrollTick((tick) => tick + 1);
  }, []);

  useEffect(() => {
    if (window.innerWidth < 768) setTocOpen(false);
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

  const updateAdditionalContext = (blockId: string, additionalContext: string) => {
    setBlocks((prev) =>
      prev.map((block) =>
        block.type === "content" && block.id === blockId
          ? { ...block, additionalContext }
          : block,
      ),
    );
  };

  const updateSourceInBlock = (blockId: string, source: RoadmapSource) => {
    setBlocks((prev) =>
      prev.map((block) => {
        if (block.id !== blockId) return block;
        if (block.type === "content") {
          return {
            ...block,
            sources: block.sources.map((s) => (s.id === source.id ? source : s)),
          };
        }
        if (block.type === "heading") {
          return {
            ...block,
            sources: (block.sources ?? []).map((s) => (s.id === source.id ? source : s)),
          };
        }
        return block;
      }),
    );
  };

  const removeSourceFromBlock = (blockId: string, sourceId: string) => {
    setBlocks((prev) =>
      prev.map((block) => {
        if (block.id !== blockId) return block;
        if (block.type === "content") {
          return { ...block, sources: block.sources.filter((s) => s.id !== sourceId) };
        }
        if (block.type === "heading") {
          return {
            ...block,
            sources: (block.sources ?? []).filter((s) => s.id !== sourceId),
          };
        }
        return block;
      }),
    );
    setTraceState((prev) =>
      prev?.blockId === blockId && prev.sourceId === sourceId ? null : prev,
    );
    setExpandedSource((prev) =>
      prev?.blockId === blockId && prev.sourceId === sourceId ? null : prev,
    );
  };

  // Open the artifact picker (V2 storyline + V3 matrix).
  const openSourcePicker = useCallback((blockId: string, role?: SourceRole) => {
    const column = role ? MATRIX_COLUMNS.find((c) => c.role === role) : undefined;
    setSourcePicker({
      blockId,
      role,
      modeLabel: column?.label,
      modeColor: column?.dotHex,
    });
  }, []);

  const confirmSourcePicker = useCallback(
    (studySourceIds: string[]) => {
      if (!sourcePicker || studySourceIds.length === 0) return;
      const { blockId, role } = sourcePicker;
      setBlocks((prev) =>
        prev.map((block) => {
          if (block.type !== "content" || block.id !== blockId) return block;
          const sources = [...block.sources];
          for (const studySourceId of studySourceIds) {
            const entry = findStudySourceById(studySourceId);
            if (!entry) continue;
            const existingIdx = sources.findIndex(
              (s) =>
                s.sourceType === "DATA_SOURCE" &&
                s.dataSource === entry.dataSource &&
                s.referenceKey === entry.referenceKey,
            );
            const created = {
              ...studySourceToRoadmapSource(entry),
              id: existingIdx >= 0 ? sources[existingIdx].id : crypto.randomUUID(),
              ...(role ? { role } : {}),
            };
            if (existingIdx >= 0) sources[existingIdx] = created;
            else sources.push(created);
          }
          return { ...block, sources };
        }),
      );
      setSourcePicker(null);
      setToast(
        studySourceIds.length === 1
          ? "Source added"
          : `${studySourceIds.length} sources added`,
      );
    },
    [sourcePicker],
  );

  const addSourceToSection = useCallback(
    (blockId: string) => openSourcePicker(blockId),
    [openSourcePicker],
  );

  // V2 board: drag study-library rows onto a section (document + pages pre-filled).
  const mapStudySourceToSection = (blockId: string, studySourceId: string) => {
    const entry = findStudySourceById(studySourceId);
    if (!entry) return;
    const incoming = normalizeDataSourceReferenceKeys({
      ...studySourceToRoadmapSource(entry),
      id: crypto.randomUUID(),
    });

    setBlocks((prev) =>
      prev.map((block) => {
        if (block.type !== "content" || block.id !== blockId) return block;

        const existingIndex = findMatchingDataSourceIndex(block.sources, incoming);
        if (existingIndex === -1) {
          return { ...block, sources: [...block.sources, incoming] };
        }

        const existing = block.sources[existingIndex] as DataSourceRoadmapSource;
        const merged = appendReferenceKeyToDataSource(existing, incoming.referenceKey);
        const nextSources = [...block.sources];
        nextSources[existingIndex] = { ...merged, id: existing.id };
        return { ...block, sources: nextSources };
      }),
    );
    setToast("Source mapped");
  };

  const mapStudySourcesToSection = useCallback((blockId: string, studySourceIds: string[]) => {
    if (studySourceIds.length === 0) return;
    let added = 0;
    setBlocks((prev) =>
      prev.map((block) => {
        if (block.type !== "content" || block.id !== blockId) return block;
        const nextSources = [...block.sources];
        for (const studySourceId of studySourceIds) {
          const entry = findStudySourceById(studySourceId);
          if (!entry) continue;
          const incoming = normalizeDataSourceReferenceKeys({
            ...studySourceToRoadmapSource(entry),
            id: crypto.randomUUID(),
          });

          const existingIndex = findMatchingDataSourceIndex(nextSources, incoming);
          if (existingIndex === -1) {
            nextSources.push(incoming);
            added += 1;
            continue;
          }

          const existing = nextSources[existingIndex] as DataSourceRoadmapSource;
          const before = getDataSourceReferenceKeys(existing).length;
          const merged = appendReferenceKeyToDataSource(existing, incoming.referenceKey);
          if (getDataSourceReferenceKeys(merged).length > before) {
            added += 1;
          }
          nextSources[existingIndex] = { ...merged, id: existing.id };
        }
        if (added === 0) return block;
        return { ...block, sources: nextSources };
      }),
    );
    if (added > 0) {
      setToast(added === 1 ? "Source mapped" : `${added} sources mapped`);
    }
  }, []);

  const mapStudySourceToStorylineSection = useCallback((blockId: string, studySourceId: string) => {
    const entry = findStudySourceById(studySourceId);
    if (!entry) return;
    const role = defaultFormatRoleForStudySource(entry);
    const incoming = normalizeDataSourceReferenceKeys({
      ...studySourceToRoadmapSource(entry),
      role,
    });

    setBlocks((prev) =>
      prev.map((block) => {
        if (block.type !== "content" || block.id !== blockId) return block;

        const existingIndex = findMatchingDataSourceIndex(block.sources, incoming);

        if (existingIndex === -1) {
          return {
            ...block,
            sources: [...block.sources, { ...incoming, id: crypto.randomUUID() }],
          };
        }

        const existing = block.sources[existingIndex] as DataSourceRoadmapSource;
        const merged = appendReferenceKeyToDataSource(existing, incoming.referenceKey);
        const nextSources = [...block.sources];
        nextSources[existingIndex] = { ...merged, id: existing.id, role };
        return { ...block, sources: nextSources };
      }),
    );
    setToast("Source mapped");
  }, []);

  const mapStudySourcesToStorylineSection = useCallback((blockId: string, studySourceIds: string[]) => {
    if (studySourceIds.length === 0) return;
    let added = 0;
    setBlocks((prev) =>
      prev.map((block) => {
        if (block.type !== "content" || block.id !== blockId) return block;
        let nextSources = [...block.sources];

        for (const studySourceId of studySourceIds) {
          const entry = findStudySourceById(studySourceId);
          if (!entry) continue;
          const role = defaultFormatRoleForStudySource(entry);
          const incoming = normalizeDataSourceReferenceKeys({
            ...studySourceToRoadmapSource(entry),
            role,
          });

          const existingIndex = findMatchingDataSourceIndex(nextSources, incoming);

          if (existingIndex === -1) {
            nextSources.push({ ...incoming, id: crypto.randomUUID() });
            added += 1;
            continue;
          }

          const existing = nextSources[existingIndex] as DataSourceRoadmapSource;
          const before = getDataSourceReferenceKeys(existing).length;
          const merged = appendReferenceKeyToDataSource(existing, incoming.referenceKey);
          if (getDataSourceReferenceKeys(merged).length > before) {
            added += 1;
          }
          nextSources[existingIndex] = { ...merged, id: existing.id, role };
        }

        if (added === 0) return block;
        return { ...block, sources: nextSources };
      }),
    );
    if (added > 0) {
      setToast(added === 1 ? "Source mapped" : `${added} sections mapped`);
    }
  }, []);

  const mapStudySourceToSectionWithFormatRole = useCallback(
    (blockId: string, studySourceId: string, role: MatrixTagRole): string | undefined => {
      const formatRole: SourceFormatRole = role === "reference" ? "reference" : "source";
      const entry = findStudySourceById(studySourceId);
      if (!entry) return undefined;
      const incoming = normalizeDataSourceReferenceKeys({
        ...studySourceToRoadmapSource(entry),
        role: formatRole,
      });

      let createdId: string | undefined;
      setBlocks((prev) =>
        prev.map((block) => {
          if (block.id !== blockId) return block;
          if (block.type !== "content" && block.type !== "heading") return block;
          const sources = block.type === "content" ? block.sources : (block.sources ?? []);

          const existingIndex = findMatchingDataSourceIndex(sources, incoming);

          if (existingIndex === -1) {
            createdId = crypto.randomUUID();
            const nextSources = [...sources, { ...incoming, id: createdId }];
            return block.type === "content"
              ? { ...block, sources: nextSources }
              : { ...block, sources: nextSources };
          }

          const existing = sources[existingIndex] as DataSourceRoadmapSource;
          const merged = appendReferenceKeyToDataSource(existing, incoming.referenceKey);
          createdId = existing.id;
          const nextSources = [...sources];
          nextSources[existingIndex] = { ...merged, id: existing.id, role: formatRole };
          return block.type === "content"
            ? { ...block, sources: nextSources }
            : { ...block, sources: nextSources };
        }),
      );
      setToast("Source mapped");
      return createdId;
    },
    [],
  );

  const mapStudySourcesToSectionWithFormatRole = useCallback(
    (blockId: string, studySourceIds: string[], role: MatrixTagRole) => {
      const formatRole: SourceFormatRole = role === "reference" ? "reference" : "source";
      if (studySourceIds.length === 0) return;
      let added = 0;
      setBlocks((prev) =>
        prev.map((block) => {
          if (block.id !== blockId) return block;
          if (block.type !== "content" && block.type !== "heading") return block;
          let nextSources = block.type === "content" ? [...block.sources] : [...(block.sources ?? [])];

          for (const studySourceId of studySourceIds) {
            const entry = findStudySourceById(studySourceId);
            if (!entry) continue;
            const incoming = normalizeDataSourceReferenceKeys({
              ...studySourceToRoadmapSource(entry),
              role: formatRole,
            });

            const existingIndex = findMatchingDataSourceIndex(nextSources, incoming);

            if (existingIndex === -1) {
              nextSources.push({ ...incoming, id: crypto.randomUUID() });
              added += 1;
              continue;
            }

            const existing = nextSources[existingIndex] as DataSourceRoadmapSource;
            const before = getDataSourceReferenceKeys(existing).length;
            const merged = appendReferenceKeyToDataSource(existing, incoming.referenceKey);
            if (getDataSourceReferenceKeys(merged).length > before) {
              added += 1;
            }
            nextSources[existingIndex] = { ...merged, id: existing.id, role: formatRole };
          }

          if (added === 0) return block;
          return block.type === "content"
            ? { ...block, sources: nextSources }
            : { ...block, sources: nextSources };
        }),
      );
      if (added > 0) {
        setToast(added === 1 ? "Source mapped" : `${added} sections mapped`);
      }
    },
    [],
  );

  const mapStudySourceToSectionWithRole = (
    blockId: string,
    studySourceId: string,
    role: MatrixTagRole,
  ): string | undefined => {
    const usageRole: SourceRole = role === "source" ? "primary" : (role as SourceRole);
    const entry = findStudySourceById(studySourceId);
    if (!entry) return undefined;
    const incoming = normalizeDataSourceReferenceKeys({
      ...studySourceToRoadmapSource(entry),
      id: crypto.randomUUID(),
      role: usageRole,
    });

    let createdId: string | undefined;
    setBlocks((prev) =>
      prev.map((block) => {
        if (block.id !== blockId) return block;
        if (block.type !== "content" && block.type !== "heading") return block;
        const sources = block.type === "content" ? block.sources : (block.sources ?? []);
        const existingIndex = findMatchingDataSourceIndex(sources, incoming);

        if (existingIndex === -1) {
          createdId = incoming.id;
          const nextSources = [...sources, incoming];
          return block.type === "content"
            ? { ...block, sources: nextSources }
            : { ...block, sources: nextSources };
        }

        const existing = sources[existingIndex] as DataSourceRoadmapSource;
        const merged = appendReferenceKeyToDataSource(existing, incoming.referenceKey);
        createdId = existing.id;
        const nextSources = [...sources];
        nextSources[existingIndex] = { ...merged, id: existing.id, role: usageRole };
        return block.type === "content"
          ? { ...block, sources: nextSources }
          : { ...block, sources: nextSources };
      }),
    );
    setToast("Source mapped");
    return createdId;
  };

  const mapStudySourcesToSectionWithRole = (
    blockId: string,
    studySourceIds: string[],
    role: MatrixTagRole,
  ) => {
    const usageRole: SourceRole = role === "source" ? "primary" : (role as SourceRole);
    if (studySourceIds.length === 0) return;
    let added = 0;
    setBlocks((prev) =>
      prev.map((block) => {
        if (block.id !== blockId) return block;
        if (block.type !== "content" && block.type !== "heading") return block;
        const sources = block.type === "content" ? block.sources : (block.sources ?? []);
        const nextSources = [...sources];
        for (const studySourceId of studySourceIds) {
          const entry = findStudySourceById(studySourceId);
          if (!entry) continue;
          const incoming = normalizeDataSourceReferenceKeys({
            ...studySourceToRoadmapSource(entry),
            id: crypto.randomUUID(),
            role: usageRole,
          });

          const existingIndex = findMatchingDataSourceIndex(nextSources, incoming);
          if (existingIndex === -1) {
            nextSources.push(incoming);
            added += 1;
            continue;
          }

          const existing = nextSources[existingIndex] as DataSourceRoadmapSource;
          const before = getDataSourceReferenceKeys(existing).length;
          const merged = appendReferenceKeyToDataSource(existing, incoming.referenceKey);
          if (getDataSourceReferenceKeys(merged).length > before) {
            added += 1;
          }
          nextSources[existingIndex] = { ...merged, id: existing.id, role: usageRole };
        }
        if (added === 0) return block;
        return block.type === "content"
          ? { ...block, sources: nextSources }
          : { ...block, sources: nextSources };
      }),
    );
    if (added > 0) {
      setToast(added === 1 ? "Source mapped" : `${added} sections mapped`);
    }
  };

  const scheduleOutlineRefDescriptor = useCallback(
    (
      targetBlockId: string,
      sourceId: string,
      outlineContext: string,
      payload: OutlineRefPayload,
      documentBlocks: DocumentBlock[],
    ) => {
      void generateOutlineRefDescriptor(outlineContext, payload, documentBlocks).then(
        (aiDescriptor) => {
          setBlocks((prev) =>
            prev.map((block) => {
              if (block.id !== targetBlockId) return block;
              if (block.type !== "content" && block.type !== "heading") return block;
              const sources = block.type === "content" ? block.sources : (block.sources ?? []);
              const nextSources = sources.map((source) =>
                source.id === sourceId &&
                (source.sourceType === "CONTENT" || source.sourceType === "SUBCONTENT")
                  ? { ...source, aiDescriptor, status: "confirmed" as const }
                  : source,
              );
              return block.type === "content"
                ? { ...block, sources: nextSources }
                : { ...block, sources: nextSources };
            }),
          );
        },
      );
    },
    [],
  );

  const mapOutlineRefToSectionWithRole = useCallback(
    (toBlockId: string, payload: OutlineRefPayload, role: MatrixTagRole): string | undefined => {
      if (payload.fromBlockId === toBlockId) return undefined;

      let createdId: string | undefined;
      let snapshot: DocumentBlock[] = [];

      setBlocks((prev) => {
        snapshot = prev;
        const outlineContext = extractOutlineContext(prev, payload);
        const bundledSources = extractBundledSources(prev, payload);
        const sourceId = crypto.randomUUID();
        createdId = sourceId;
        const created = buildOutlineRefSource(payload, outlineContext, {
          id: sourceId,
          role,
          bundledSources,
        });

        return prev.map((block) => {
          if (block.id !== toBlockId) return block;
          if (block.type !== "content" && block.type !== "heading") return block;
          const sources = block.type === "content" ? block.sources : (block.sources ?? []);
          return { ...block, sources: [...sources, created] };
        });
      });

      if (!createdId) return undefined;

      const outlineContext = extractOutlineContext(snapshot, payload);
      scheduleOutlineRefDescriptor(toBlockId, createdId, outlineContext, payload, snapshot);
      setToast(
        payload.sourceType === "SUBCONTENT"
          ? "Subcontent linked as evidence"
          : "Content linked as evidence",
      );
      return createdId;
    },
    [scheduleOutlineRefDescriptor],
  );

  const matrixDropOnHeadingSlot = useCallback(
    (slotHeadingId: string, role: MatrixTagRole, payload: V2DragPayload) => {
      setBlocks((prev) => {
        if (!isHeadingInsertionSlot(prev, slotHeadingId)) return prev;

        const headingIndex = prev.findIndex((b) => b.id === slotHeadingId);
        const insertAt = findInsertIndexAfterHeadingSection(prev, slotHeadingId);
        if (insertAt === null || headingIndex === -1) return prev;

        const slotHeading = prev[headingIndex];
        if (slotHeading.type !== "heading") return prev;

        const siblingLevel = slotHeading.level;
        const newNumber = nextSiblingHeadingNumber(prev, headingIndex);
        let newHeading: HeadingBlock = createHeadingBlock(siblingLevel, newNumber);
        let working = prev;

        if (payload.kind === "study-source") {
          const entry = findStudySourceById(payload.studySourceId);
          if (!entry) return prev;
          newHeading = {
            ...newHeading,
            sources: [
              {
                ...studySourceToRoadmapSource(entry),
                id: crypto.randomUUID(),
                role,
                isReference: role === "reference" ? true : undefined,
              },
            ],
          };
        } else if (payload.kind === "study-sources") {
          const mapped = payload.studySourceIds.flatMap((studySourceId) => {
            const entry = findStudySourceById(studySourceId);
            if (!entry) return [];
            return [
              {
                ...studySourceToRoadmapSource(entry),
                id: crypto.randomUUID(),
                role,
                isReference: role === "reference" ? true : undefined,
              },
            ];
          });
          if (mapped.length === 0) return prev;
          newHeading = { ...newHeading, sources: mapped };
        } else if (payload.kind === "mapped") {
          let movedSource: RoadmapSource | null = null;
          working = prev.map((block) => {
            if (block.id !== payload.fromBlockId) return block;
            if (block.type !== "content" && block.type !== "heading") return block;
            const sources = block.type === "content" ? block.sources : (block.sources ?? []);
            const found = sources.find((s) => s.id === payload.sourceId);
            if (!found) return block;
            movedSource = found;
            const nextSources = sources.filter((s) => s.id !== payload.sourceId);
            return block.type === "content"
              ? { ...block, sources: nextSources }
              : { ...block, sources: nextSources };
          });
          if (!movedSource) return prev;
          const placed: RoadmapSource = {
            ...(movedSource as RoadmapSource),
            role,
            isReference: role === "reference" ? true : undefined,
          };
          newHeading = {
            ...newHeading,
            sources: [placed],
          };
        } else {
          return prev;
        }

        const next = [...working];
        next.splice(insertAt, 0, newHeading);
        return bumpSubsequentHeadingNumbers(next, insertAt, siblingLevel, newNumber);
      });
      setToast("Heading added");
    },
    [],
  );

  // V2 board: drag an outline row (TOC) onto a section as subcontent or content.
  const mapOutlineRefToSection = useCallback(
    (blockId: string, payload: OutlineRefPayload) => {
      if (payload.sourceType === "SUBCONTENT" && payload.fromBlockId === blockId) return;

      let added = false;
      let createdId: string | undefined;
      let snapshot: DocumentBlock[] = [];

      setBlocks((prev) => {
        snapshot = prev;
        return prev.map((block) => {
          if (block.type !== "content" || block.id !== blockId) return block;
          const duplicate = block.sources.some((source) =>
            payload.sourceType === "SUBCONTENT"
              ? source.sourceType === "SUBCONTENT" &&
                source.referencedBlockId === payload.fromBlockId
              : source.sourceType === "CONTENT" &&
                source.referencedHeadingId === payload.fromHeadingId,
          );
          if (duplicate) return block;

          const outlineContext = extractOutlineContext(prev, payload);
          const bundledSources = extractBundledSources(prev, payload);
          const sourceId = crypto.randomUUID();
          createdId = sourceId;
          const created = buildOutlineRefSource(payload, outlineContext, {
            id: sourceId,
            bundledSources,
          });
          added = true;
          return { ...block, sources: [...block.sources, created] };
        });
      });

      if (!added || !createdId) return;

      const outlineContext = extractOutlineContext(snapshot, payload);
      scheduleOutlineRefDescriptor(blockId, createdId, outlineContext, payload, snapshot);
      setToast(
        payload.sourceType === "SUBCONTENT"
          ? "Subcontent linked to section"
          : "Content linked to section",
      );
    },
    [scheduleOutlineRefDescriptor],
  );

  // V2 board / V6 source view: map a specific library document onto a section,
  // optionally pre-filling its usage role (V6 "Add to section").
  const mapDataSourceToSection = (
    blockId: string,
    dataSource: string,
    role?: RoadmapSource["role"],
  ) => {
    setBlocks((prev) =>
      prev.map((block) => {
        if (block.type !== "content" || block.id !== blockId) return block;
        const created = createSourceForType("DATA_SOURCE", { dataSource });
        return {
          ...block,
          sources: [...block.sources, role ? { ...created, role } : created],
        };
      }),
    );
    setToast("Source mapped");
  };

  const unmapOutlineRef = (toBlockId: string, sourceId: string) => {
    setBlocks((prev) =>
      prev.map((block) => {
        if (block.id !== toBlockId) return block;
        if (block.type === "content") {
          return { ...block, sources: block.sources.filter((s) => s.id !== sourceId) };
        }
        if (block.type === "heading") {
          return {
            ...block,
            sources: (block.sources ?? []).filter((s) => s.id !== sourceId),
          };
        }
        return block;
      }),
    );
    setTraceState((prev) => (prev?.sourceId === sourceId ? null : prev));
    setToast("Outline link removed");
  };

  const updateOutlineRefRole = (
    toBlockId: string,
    sourceId: string,
    role: SourceRole,
  ) => {
    setBlocks((prev) =>
      prev.map((block) => {
        if (block.id !== toBlockId) return block;
        const mapSources = (sources: RoadmapSource[]) =>
          sources.map((source) =>
            source.id === sourceId
              ? {
                  ...source,
                  role,
                  isReference: role === "reference" ? true : undefined,
                }
              : source,
          );
        if (block.type === "content") {
          return { ...block, sources: mapSources(block.sources) };
        }
        if (block.type === "heading") {
          return { ...block, sources: mapSources(block.sources ?? []) };
        }
        return block;
      }),
    );
    setToast("Role updated");
  };

  // V2 board: move or reorder a mapped source within / across sections.
  const moveSourceToSection = (
    fromBlockId: string,
    sourceId: string,
    toBlockId: string,
    toIndex?: number,
    formatRole?: SourceFormatRole,
  ) => {
    setBlocks((prev) => {
      let moved: RoadmapSource | null = null;
      for (const block of prev) {
        if (block.type !== "content" || block.id !== fromBlockId) continue;
        moved = block.sources.find((s) => s.id === sourceId) ?? null;
        break;
      }
      if (!moved) return prev;
      if (
        formatRole === "source" &&
        (moved.sourceType === "CONTENT" || moved.sourceType === "SUBCONTENT")
      ) {
        return prev;
      }

      if (
        formatRole &&
        (moved.sourceType === "DATA_SOURCE" || moved.sourceType === "REFERENCE_SOURCE")
      ) {
        moved = {
          ...moved,
          role: formatRole,
          isReference: formatRole === "reference" ? true : undefined,
        };
      }

      const stripped = prev.map((block) => {
        if (block.type !== "content") return block;
        const found = block.sources.find((s) => s.id === sourceId);
        if (!found) return block;
        return { ...block, sources: block.sources.filter((s) => s.id !== sourceId) };
      });

      return stripped.map((block) => {
        if (block.type !== "content" || block.id !== toBlockId) return block;
        const sources = [...block.sources];
        const insertAt = toIndex ?? sources.length;
        sources.splice(insertAt, 0, moved!);
        return { ...block, sources };
      });
    });
    setTraceState((prev) =>
      prev?.sourceId === sourceId ? { ...prev, blockId: toBlockId } : prev,
    );
    if (formatRole && fromBlockId === toBlockId) {
      setToast("Role updated");
      return;
    }
    setToast(fromBlockId === toBlockId ? "Source reordered" : "Source moved");
  };

  const moveSourceToMatrixCell = (
    fromBlockId: string,
    sourceId: string,
    toBlockId: string,
    role: MatrixTagRole,
  ) => {
    setBlocks((prev) => {
      let moved: RoadmapSource | null = null;
      const stripped = prev.map((block) => {
        if (block.type !== "content" && block.type !== "heading") return block;
        const sources = sourcesForBlock(block);
        const found = sources.find((s) => s.id === sourceId);
        if (!found) return block;
        moved = {
          ...found,
          role,
          isReference: role === "reference" ? true : undefined,
        };
        const nextSources = sources.filter((s) => s.id !== sourceId);
        if (block.type === "content") return { ...block, sources: nextSources };
        return { ...block, sources: nextSources };
      });
      if (!moved) return prev;

      return stripped.map((block) => {
        if (block.id !== toBlockId) return block;
        if (block.type === "content") {
          return { ...block, sources: [...block.sources, moved!] };
        }
        if (block.type === "heading") {
          return { ...block, sources: [...(block.sources ?? []), moved!] };
        }
        return block;
      });
    });
    setTraceState((prev) =>
      prev?.sourceId === sourceId ? { ...prev, blockId: toBlockId } : prev,
    );
    setToast(fromBlockId === toBlockId ? "Role updated" : "Source moved");
  };

  /* PROTOTYPE_DISABLED: study library add flow
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
  */

  const deleteContentBlock = (blockId: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
    setTraceState((prev) => (prev?.blockId === blockId ? null : prev));
    setExpandedSource((prev) => (prev?.blockId === blockId ? null : prev));
    setActiveTocId((prev) => (prev === blockId ? null : prev));
    setToast("Section deleted");
  };

  const deleteHeading = (headingId: string) => {
    const removedIds = new Set(getHeadingSectionBlockIds(blocks, headingId));
    setBlocks((prev) => deleteHeadingSection(prev, headingId));
    setTraceState((prev) => (prev && removedIds.has(prev.blockId) ? null : prev));
    setExpandedSource((prev) => (prev && removedIds.has(prev.blockId) ? null : prev));
    setActiveTocId((prev) => (prev && removedIds.has(prev) ? null : prev));
    setToast("Heading deleted");
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
      const headingIndex = prev.findIndex((b) => b.id === headingId);
      const insertAt = findInsertIndexAfterHeadingSection(prev, headingId);
      if (insertAt === null || headingIndex === -1) return prev;

      const heading = prev[headingIndex];
      if (heading.type !== "heading") return prev;

      const siblingLevel = level ?? heading.level;
      const newNumber = nextSiblingHeadingNumber(prev, headingIndex);
      const newHeading = createHeadingBlock(siblingLevel, newNumber);

      const next = [...prev];
      next.splice(insertAt, 0, newHeading);
      return bumpSubsequentHeadingNumbers(next, insertAt, siblingLevel, newNumber);
    });
    setToast("Heading added");
  };

  const addContentAfter = (afterBlockId: string) => {
    insertBlockAfter(afterBlockId, createContentBlock());
  };

  const closeTrace = useCallback(() => {
    setTraceState(null);
    setExpandedSource(null);
    setLibraryTraceSource(null);
    setV2DataPanelOpen(true);
  }, []);

  const navigateOutlineRef = useCallback(
    (source: import("../data/roadmap").RoadmapSource) => {
      const targetId = outlineRefTocTargetId(source, blocks);
      if (!targetId) return;
      closeTrace();
      setTocOpen(true);
      handleTocNavigate(targetId, { scrollCenter: false });
    },
    [blocks, closeTrace, handleTocNavigate],
  );

  const openTrace = useCallback(
    (blockId: string, sourceId: string) => {
      setLibraryTraceSource(null);
      setActivePanel((panel) => (panel?.type === "version" ? null : panel));
      setTraceState({ blockId, sourceId, view: "detail" });
      setExpandedSource({ blockId, sourceId });
      setV2DataPanelOpen(false);
      if (window.innerWidth < 768) setTocOpen(false);
    },
    [],
  );

  const openStudySourceTrace = useCallback((entry: StudyDataSource) => {
    setLibraryTraceSource(studySourceToRoadmapSource(entry));
    setActivePanel((panel) => (panel?.type === "version" ? null : panel));
    setTraceState({
      blockId: LIBRARY_TRACE_BLOCK,
      sourceId: entry.id,
      view: "detail",
    });
    setExpandedSource(null);
    setV2DataPanelOpen(false);
    if (window.innerWidth < 768) setTocOpen(false);
  }, []);

  const navigateToPlacement = useCallback(
    (placement: StudySourcePlacement) => {
      setLibraryTraceSource(null);
      setActivePanel((panel) => (panel?.type === "version" ? null : panel));
      setActiveTocId(placement.blockId);

      if (matrixLayout) {
        setTraceState({
          blockId: placement.blockId,
          sourceId: placement.sourceId,
          view: "navigate",
        });
        setExpandedSource(null);
        setMatrixScrollTick((tick) => tick + 1);
        if (window.innerWidth < 768) setTocOpen(false);
        return;
      }

      setTraceState({
        blockId: placement.blockId,
        sourceId: placement.sourceId,
        view: "detail",
      });
      setExpandedSource({ blockId: placement.blockId, sourceId: placement.sourceId });

      if (storylineLayout) {
        setTocScrollTick((tick) => tick + 1);
        if (window.innerWidth < 768) setTocOpen(false);
        return;
      }

      scrollToBlock(placement.blockId);
    },
    [matrixLayout, storylineLayout, scrollToBlock],
  );

  const openConnectorSourceTrace = useCallback(
    (studySourceId: string, preferredBlockId?: string) => {
      const placement = findStudySourcePlacement(blocks, studySourceId, preferredBlockId);
      if (placement) {
        openTrace(placement.blockId, placement.sourceId);
        return;
      }
      const studyEntry = findStudySourceById(studySourceId);
      if (studyEntry) openStudySourceTrace(studyEntry);
    },
    [blocks, openTrace, openStudySourceTrace],
  );

  const updatePlacementRoleInSection = (
    blockId: string,
    sourceId: string,
    role: SourceRole,
  ) => {
    setBlocks((prev) =>
      prev.map((block) => {
        if (block.id !== blockId || block.type !== "content") return block;
        return {
          ...block,
          sources: block.sources.map((source) =>
            source.id === sourceId
              ? {
                  ...source,
                  role,
                  isReference: role === "reference" ? true : undefined,
                }
              : source,
          ),
        };
      }),
    );
    setToast("Role updated");
  };

  const handleSourceCardClick = useCallback(
    (blockId: string, sourceId: string) => {
      openTrace(blockId, sourceId);
    },
    [openTrace],
  );

  useEffect(() => {
    if (!expandedSource) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-source-card]")) return;
      if (target.closest("[data-datasource-panel]")) return;

      setExpandedSource(null);
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [expandedSource]);

  const toggleTracePanel = useCallback(() => {
    if (storylineLayout) {
      if (traceState?.view === "detail") {
        setTraceState(null);
        setExpandedSource(null);
        setV2DataPanelOpen(true);
        return;
      }
      if (traceState) {
        setTraceState(null);
        setExpandedSource(null);
        setV2DataPanelOpen(true);
        return;
      }
      setV2DataPanelOpen((open) => !open);
      if (window.innerWidth < 768) setTocOpen(false);
      return;
    }
    if (matrixLayout) {
      if (traceState) {
        setTraceState(null);
        setLibraryTraceSource(null);
        setExpandedSource(null);
      }
      return;
    }
    if (variant === "connectors") {
      if (traceState) {
        setTraceState(null);
        setExpandedSource(null);
        setLibraryTraceSource(null);
      }
      return;
    }
    if (traceState) {
      setTraceState(null);
      setExpandedSource(null);
      return;
    }
    const target = findFirstMappedSource(blocks);
    if (!target) {
      setToast("No sources mapped to trace");
      return;
    }
    setActivePanel((panel) => (panel?.type === "version" ? null : panel));
    setTraceState({ ...target, view: "list" });
    setExpandedSource(target);
    if (window.innerWidth < 768) setTocOpen(false);
  }, [blocks, traceState, variant, storylineLayout, matrixLayout]);

  useEffect(() => {
    if (storylineLayout) setV2DataPanelOpen(true);
  }, [storylineLayout]);

  const tracedSource = useMemo(() => {
    if (!traceState) return null;
    if (traceState.blockId === LIBRARY_TRACE_BLOCK && libraryTraceSource) {
      return libraryTraceSource;
    }
    return findSourceInBlocks(blocks, traceState);
  }, [traceState, blocks, libraryTraceSource]);
  const tracedBlockSources =
    traceState && traceState.blockId !== LIBRARY_TRACE_BLOCK
      ? findBlockSources(blocks, traceState.blockId)
      : [];
  const tracedSectionTitle =
    traceState && traceState.blockId !== LIBRARY_TRACE_BLOCK
      ? findBlockTitle(blocks, traceState.blockId)
      : null;

  const contentBlockIds = useMemo(
    () => blocks.filter((b) => b.type === "content").map((b) => b.id),
    [blocks],
  );

  useEffect(() => {
    if (variant !== "mapping") return;
    setBlocks((prev) => {
      let anyChanged = false;
      const next = prev.map((block) => {
        if (block.type === "content") {
          const { sources, changed } = consolidateContentBlockSourcesIfNeeded(block.sources);
          if (!changed) return block;
          anyChanged = true;
          return { ...block, sources };
        }
        if (block.type === "heading" && block.sources?.length) {
          const { sources, changed } = consolidateContentBlockSourcesIfNeeded(block.sources);
          if (!changed) return block;
          anyChanged = true;
          return { ...block, sources };
        }
        return block;
      });
      return anyChanged ? next : prev;
    });
  }, [variant]);

  const usageCountByStudySourceId = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const block of blocks) {
      if (block.type !== "content" && block.type !== "heading") continue;
      const sources = block.type === "content" ? block.sources : (block.sources ?? []);
      for (const source of sources) {
        if (source.sourceType !== "DATA_SOURCE") continue;
        const referenceKeys = getDataSourceReferenceKeys(source);
        for (const entry of STUDY_DATA_SOURCES) {
          if (
            entry.dataSource === source.dataSource &&
            referenceKeys.includes(entry.referenceKey)
          ) {
            counts[entry.id] = (counts[entry.id] ?? 0) + 1;
          }
        }
      }
    }
    return counts;
  }, [blocks]);

  const placementsByStudySourceId = useMemo(
    () => collectStudySourcePlacements(blocks),
    [blocks],
  );

  const handleStudySourceSelect = useCallback(
    (entry: StudyDataSource) => {
      const placements = placementsByStudySourceId[entry.id];
      if (placements?.length) {
        navigateToPlacement(placements[0]);
        return;
      }
      openStudySourceTrace(entry);
    },
    [placementsByStudySourceId, navigateToPlacement, openStudySourceTrace],
  );

  const pickerExistingStudySourceIds = useMemo(() => {
    if (!sourcePicker) return [];
    const block = blocks.find((b) => b.id === sourcePicker.blockId);
    if (!block || block.type !== "content") return [];
    const ids: string[] = [];
    for (const source of block.sources) {
      if (source.sourceType !== "DATA_SOURCE") continue;
      const entry = findStudySourceForRoadmapSource(source);
      if (entry) ids.push(entry.id);
    }
    return ids;
  }, [sourcePicker, blocks]);

  useEffect(() => {
    if (!storylineLayout) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement).tagName?.toLowerCase();
      if (tag === "textarea" || tag === "input") return;
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "j" && event.key !== "k") {
        return;
      }
      event.preventDefault();
      const currentIdx = contentBlockIds.indexOf(activeTocId ?? "");
      const delta = event.key === "ArrowDown" || event.key === "j" ? 1 : -1;
      const nextIdx = Math.max(
        0,
        Math.min(contentBlockIds.length - 1, currentIdx === -1 ? 0 : currentIdx + delta),
      );
      setActiveTocId(contentBlockIds[nextIdx] ?? null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [storylineLayout, contentBlockIds, activeTocId]);

  const handleVariantChange = useCallback((id: VariantId) => {
    setVariant(id);
    if (id === "twoColumn" || id === "mapping") {
      setV2DataPanelOpen(true);
      if (id === "mapping") {
        setMappingSubview("storyline");
        setTocOpen(true);
      }
    }
    if (id === "matrix") {
      setLibraryTraceSource(null);
    }
  }, []);

  const handleMappingSubviewChange = useCallback((view: MappingSubview) => {
    setMappingSubview(view);
    if (view === "storyline") {
      setV2DataPanelOpen(true);
      setTocOpen(true);
    } else {
      setTocOpen(false);
      setTraceState(null);
      setExpandedSource(null);
      setLibraryTraceSource(null);
    }
  }, []);

  const handleTracedSourceChange = useCallback((sourceId: string) => {
    setTraceState((prev) => {
      if (!prev) return null;
      if (prev.blockId === LIBRARY_TRACE_BLOCK) {
        const entry = findStudySourceById(sourceId);
        if (entry) setLibraryTraceSource(studySourceToRoadmapSource(entry));
      }
      return { ...prev, sourceId };
    });
    setExpandedSource((prev) => (prev ? { ...prev, sourceId } : null));
  }, []);

  const handleTracedMappedSourceUpdate = useCallback(
    (updated: RoadmapSource) => {
      if (!traceState || traceState.blockId === LIBRARY_TRACE_BLOCK) return;
      updateSourceInBlock(traceState.blockId, updated);
    },
    [traceState],
  );

  return (
    <div className="flex h-dvh flex-col bg-[#eeeeee]">
      {/* Header row */}
      <header className="shrink-0 border-b border-[#d4ced3] bg-white">
        <div className="flex min-h-[56px] flex-wrap items-center justify-between gap-2 px-3 py-2 sm:min-h-[68px] sm:gap-4 sm:px-4 sm:py-0">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
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
                className="block max-w-[min(100%,14rem)] truncate text-left text-[13px] font-normal leading-[18px] text-[#ff4e49] hover:underline sm:max-w-none sm:text-[14px]"
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

          <div className="flex w-full shrink-0 flex-wrap items-center justify-end gap-1.5 sm:w-auto sm:gap-2">
            <DropdownMenu
              align="right"
              trigger={
                <button type="button" className="peer-btn-outline !h-9 !px-3">
                  <Wand2 size={16} strokeWidth={1.75} />
                  <ChevronDown size={14} className="hidden text-[#636161] sm:inline" />
                </button>
              }
            >
              {/* PROTOTYPE_DISABLED: document view
              <MenuItem
                icon={<Pencil size={18} strokeWidth={1.75} />}
                title="Document View"
                description="Edit and format content"
                active={viewMode === "document"}
                onClick={() => setViewMode("document")}
              />
              */}
              <MenuItem
                icon={<Wand2 size={18} strokeWidth={1.75} className="text-[#ff4e49]" />}
                title="Roadmap View"
                description="Track progress visually"
                active={viewMode === "roadmap"}
                onClick={() => setViewMode("roadmap")}
              />
            </DropdownMenu>

            <div className="mx-1 hidden h-6 w-px bg-[#d4ced3] sm:block" />

            <button
              type="button"
              onClick={() => setActivePanel({ type: "share" })}
              className="peer-btn-outline hidden sm:inline-flex"
            >
              Share
            </button>

            <DropdownMenu
              align="right"
              trigger={
                <button type="button" className="peer-btn-outline !h-9 !px-3">
                  <Play size={16} strokeWidth={1.75} />
                  <ChevronDown size={14} className="hidden text-[#636161] sm:inline" />
                </button>
              }
            >
              <MenuItem
                title="Run generation"
                description="Generate all pending sections"
                onClick={() => setToast("Generation started…")}
              />
              {/* PROTOTYPE_DISABLED: document preview
              <MenuItem
                title="Preview output"
                description="Open document preview"
                onClick={() => setViewMode("document")}
              />
              */}
            </DropdownMenu>

            <div
              className="hidden overflow-hidden rounded-md border border-[#d4ced3] md:flex"
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
              className="peer-btn-primary !px-3 text-[13px] sm:!px-4 sm:text-[14px]"
            >
              <span className="sm:hidden">Update</span>
              <span className="hidden sm:inline">Update Document</span>
            </button>
          </div>
        </div>
      </header>

      {/* Toolbar row */}
      <div className="relative flex h-10 shrink-0 items-center border-b border-[#d4ced3] bg-white px-3 sm:px-4">
        {showGlobalToc && (
          <button
            type="button"
            onClick={() => setTocOpen((v) => !v)}
            aria-pressed={tocOpen}
            className={`mr-2 flex h-8 w-8 items-center justify-center rounded-md border border-[#d4ced3] bg-white transition-colors ${
              tocOpen ? "border-[#fe9591] bg-[#fedbda]" : "hover:bg-[#fafafa]"
            }`}
            aria-label={tocOpen ? "Close table of contents" : "Open table of contents"}
            title={tocOpen ? "Close table of contents" : "Open table of contents"}
          >
            <List size={18} strokeWidth={1.75} />
          </button>
        )}

        <div className="flex items-center gap-2">
          <VariantSwitcher variant={variant} onChange={handleVariantChange} />
          {variant === "mapping" && (
            <>
              <div className="hidden h-5 w-px bg-[var(--peer-border)] sm:block" aria-hidden />
              <MappingSubviewControl
                inline
                view={mappingSubview}
                onChange={handleMappingSubviewChange}
              />
              <label className="peer-tlf-filter ml-1 flex cursor-pointer items-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-[12px] text-[#636161] transition-colors hover:bg-[#fafafa]">
                <input
                  type="checkbox"
                  checked={tlfOnly}
                  onChange={(event) => setTlfOnly(event.target.checked)}
                  className="peer-tlf-filter-input h-3.5 w-3.5 rounded border-[#d4ced3] text-[#ff4e49] focus:ring-[#ff4e49]/30"
                />
                <span>TLFs only</span>
              </label>
            </>
          )}
        </div>

        {variant === "baseline" && (
          <div className="pointer-events-none absolute left-1/2 hidden -translate-x-1/2 items-center gap-2 md:flex">
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
        )}

        <div className="ml-auto flex items-center gap-1">
          {/* PROTOTYPE_DISABLED: study library
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
          */}
          <button
            type="button"
            onClick={() => {
              setTraceState(null);
              setExpandedSource(null);
              setActivePanel((p) => (p?.type === "version" ? null : { type: "version" }));
            }}
            className="flex h-8 w-8 items-center justify-center rounded hover:bg-[#f5f5f5]"
            aria-label="Toggle version panel"
          >
            <History size={18} strokeWidth={1.75} color="#636161" />
          </button>
          <button
            type="button"
            data-trace-toggle=""
            onClick={toggleTracePanel}
            aria-pressed={
              storylineLayout ? v2DataPanelOpen || traceState !== null : traceState !== null
            }
            aria-label={
              storylineLayout
                ? v2DataPanelOpen || traceState
                  ? "Hide data sources panel"
                  : "Show data sources panel"
                : traceState
                  ? "Exit trace to datasource view"
                  : "Enter trace to datasource view"
            }
            className={`flex h-8 w-8 items-center justify-center rounded hover:bg-[#f5f5f5] ${
              (storylineLayout ? v2DataPanelOpen || traceState : traceState)
                ? "bg-[#fedbda]"
                : ""
            }`}
          >
            <FileSearch size={18} strokeWidth={1.75} color="#636161" />
          </button>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1">
        {tocOpen && showGlobalToc && (
          <button
            type="button"
            aria-label="Close table of contents"
            className="fixed inset-0 z-30 bg-black/20 md:hidden"
            onClick={() => setTocOpen(false)}
          />
        )}
        {showGlobalToc && tocOpen && (
          <aside className="fixed inset-y-0 left-0 z-40 flex w-[min(92vw,320px)] shrink-0 flex-col border-r border-[#d4ced3] bg-[#fafafa] shadow-lg md:relative md:z-0 md:w-[300px] md:shadow-none">
            <div className="flex shrink-0 flex-col border-b border-[#d4ced3] px-3 py-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-[#757575]">
                  Outline
                </span>
                <button
                  type="button"
                  onClick={() => setTocOpen(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-[#9e9e9e] hover:bg-[#dcdcdc] hover:text-[#302f2f]"
                  aria-label="Collapse outline"
                  title="Collapse outline"
                >
                  <PanelLeftClose size={16} strokeWidth={1.75} />
                </button>
              </div>
            </div>
            <TableOfContents
              blocks={blocks}
              activeId={activeTocId}
              onNavigate={handleTocNavigate}
              onMoveBlock={moveBlockFromToc}
              onAddHeadingAfter={addHeadingAfter}
              onAddContentAfter={addContentAfter}
              onDeleteHeading={deleteHeading}
              onDeleteContent={deleteContentBlock}
              outlineMappingDrag={tocUsesOutlineMappingDrag}
              hideAddActions={tocHideAddActions}
            />
          </aside>
        )}
        {showGlobalToc && !tocOpen && (
          <div className="hidden shrink-0 border-r border-[#e8e8e8] bg-[#fafafa] md:flex md:w-9 md:flex-col md:items-center md:pt-2">
            <button
              type="button"
              onClick={() => setTocOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-md text-[#9e9e9e] hover:bg-[#f0f0f0] hover:text-[#302f2f]"
              aria-label="Expand outline"
              title="Expand outline"
            >
              <PanelLeft size={18} strokeWidth={1.75} />
            </button>
          </div>
        )}

        <main
          className={`min-w-0 flex-1 ${
            matrixLayout || variant === "connectors"
              ? "flex min-h-0 flex-col overflow-hidden"
              : variant === "baseline"
                ? "overflow-x-hidden overflow-y-auto"
                : "overflow-x-hidden overflow-y-hidden"
          }`}
        >
          {variant === "baseline" && (
            <div className="px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
              <div className="roadmap-blocks relative mx-auto w-full min-w-0 max-w-[680px] overflow-visible pb-12">
                {blocks.map((block) => (
                  <Fragment key={block.id}>
                    <BlockRenderer
                      block={block}
                      blocks={blocks}
                      blockRefs={blockRefs}
                      tracedSourceId={
                        traceState?.blockId === block.id ? traceState.sourceId : null
                      }
                      onSourceCardClick={(sourceId) => handleSourceCardClick(block.id, sourceId)}
                      onUpdateSource={(source) => updateSourceInBlock(block.id, source)}
                      onRemoveSource={(sourceId) => removeSourceFromBlock(block.id, sourceId)}
                      onPromptChange={(prompt) => updatePrompt(block.id, prompt)}
                      onAdditionalContextChange={(additionalContext) =>
                        updateAdditionalContext(block.id, additionalContext)
                      }
                      onAddHeadingAfter={addHeadingAfter}
                      onAddContentAfter={addContentAfter}
                    />
                  </Fragment>
                ))}
              </div>
            </div>
          )}

          {variant === "mapping" && (
            <MappingVariant
              subview={mappingSubview}
              storyline={{
                blocks,
                focusId: activeTocId,
                scrollTick: tocScrollTick,
                tracedSource: traceState
                  ? { blockId: traceState.blockId, sourceId: traceState.sourceId }
                  : null,
                onTraceSource: openTrace,
                onUpdateSource: updateSourceInBlock,
                onRemoveSource: removeSourceFromBlock,
                onMapStudySource: mapStudySourceToStorylineSection,
                onMapStudySources: mapStudySourcesToStorylineSection,
                onMapOutlineRefToSection: mapOutlineRefToSection,
                onMoveSource: moveSourceToSection,
                onMapStudySourceWithRole: mapStudySourceToSectionWithFormatRole,
                onPromptChange: updatePrompt,
                rolePickerMode: "format",
                onNavigateOutlineRef: navigateOutlineRef,
                tlfOnly,
              }}
              matrix={{
                blocks,
                activeBlockId: activeTocId,
                scrollTick: matrixScrollTick,
                columnMode: "format",
                rolePickerMode: "format",
                tracedSource: traceState
                  ? { blockId: traceState.blockId, sourceId: traceState.sourceId }
                  : null,
                onTraceSource: openTrace,
                onUpdateSource: updateSourceInBlock,
                onRemoveSource: removeSourceFromBlock,
                onMapStudySourceWithRole: mapStudySourceToSectionWithFormatRole,
                onMapStudySourcesWithRole: mapStudySourcesToSectionWithFormatRole,
                onMapOutlineRefWithRole: mapOutlineRefToSectionWithRole,
                onHeadingSlotDrop: matrixDropOnHeadingSlot,
                onMoveSourceToMatrixCell: moveSourceToMatrixCell,
                usageCountByStudySourceId,
                placementsByStudySourceId,
                onNavigateToPlacement: navigateToPlacement,
                onStudySourceSelect: handleStudySourceSelect,
                traceSource: tracedSource,
                traceSectionTitle: tracedSectionTitle,
                traceBlockSources: tracedBlockSources,
                traceSourceId: traceState?.sourceId ?? null,
                tracePanelMode: traceState?.view ?? "detail",
                onTraceSourceChange: handleTracedSourceChange,
                onCloseTrace: closeTrace,
                onUpdateMappedSource: handleTracedMappedSourceUpdate,
                onNavigateBlock: navigateMatrixBlock,
                onMoveBlock: moveBlockFromToc,
                onAddHeadingAfter: addHeadingAfter,
                onAddContentAfter: addContentAfter,
                onDeleteHeading: deleteHeading,
                onDeleteContent: deleteContentBlock,
                tlfOnly,
              }}
            />
          )}

          {variant === "twoColumn" && (
            <TwoColumnVariant
              blocks={blocks}
              focusId={activeTocId}
              scrollTick={tocScrollTick}
              tracedSource={
                traceState
                  ? { blockId: traceState.blockId, sourceId: traceState.sourceId }
                  : null
              }
              onTraceSource={openTrace}
              onUpdateSource={updateSourceInBlock}
              onRemoveSource={removeSourceFromBlock}
              onMapStudySource={mapStudySourceToSection}
              onMapStudySources={mapStudySourcesToSection}
              onMapOutlineRefToSection={mapOutlineRefToSection}
              onMoveSource={moveSourceToSection}
              onPromptChange={updatePrompt}
              onNavigateOutlineRef={navigateOutlineRef}
            />
          )}

          {variant === "matrix" && (
            <MatrixVariant
              blocks={blocks}
              activeBlockId={activeTocId}
              scrollTick={matrixScrollTick}
              tracedSource={
                traceState
                  ? { blockId: traceState.blockId, sourceId: traceState.sourceId }
                  : null
              }
              onTraceSource={openTrace}
              onUpdateSource={updateSourceInBlock}
              onRemoveSource={removeSourceFromBlock}
              onMapStudySourceWithRole={mapStudySourceToSectionWithRole}
              onMapStudySourcesWithRole={mapStudySourcesToSectionWithRole}
              onMapOutlineRefWithRole={mapOutlineRefToSectionWithRole}
              onHeadingSlotDrop={matrixDropOnHeadingSlot}
              onMoveSourceToMatrixCell={moveSourceToMatrixCell}
              usageCountByStudySourceId={usageCountByStudySourceId}
              placementsByStudySourceId={placementsByStudySourceId}
              onNavigateToPlacement={navigateToPlacement}
              onStudySourceSelect={handleStudySourceSelect}
              traceSource={tracedSource}
              traceSectionTitle={tracedSectionTitle}
              traceBlockSources={tracedBlockSources}
              traceSourceId={traceState?.sourceId ?? null}
              tracePanelMode={traceState?.view ?? "detail"}
              onTraceSourceChange={handleTracedSourceChange}
              onCloseTrace={closeTrace}
              onUpdateMappedSource={handleTracedMappedSourceUpdate}
              onNavigateBlock={navigateMatrixBlock}
              onMoveBlock={moveBlockFromToc}
              onAddHeadingAfter={addHeadingAfter}
              onAddContentAfter={addContentAfter}
              onDeleteHeading={deleteHeading}
              onDeleteContent={deleteContentBlock}
            />
          )}

          {variant === "sourceView" && (
            <SourceViewVariant
              blocks={blocks}
              tracedSource={
                traceState
                  ? { blockId: traceState.blockId, sourceId: traceState.sourceId }
                  : null
              }
              onTraceSource={openTrace}
              onUpdateSource={updateSourceInBlock}
              onRemoveSource={removeSourceFromBlock}
              onAddSource={addSourceToSection}
              onMapDataSource={mapDataSourceToSection}
            />
          )}

          {variant === "connectors" && (
            <div className="flex h-full min-h-0 w-full min-w-0 flex-1">
              <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                <ConnectorVariant
                  blocks={blocks}
                  tracedPlacement={
                    traceState && traceState.blockId !== LIBRARY_TRACE_BLOCK
                      ? { blockId: traceState.blockId, sourceId: traceState.sourceId }
                      : null
                  }
                  onMapStudySource={mapStudySourceToSectionWithRole}
                  onUnmapPlacement={removeSourceFromBlock}
                  onUpdatePlacementRole={updatePlacementRoleInSection}
                  onMapOutlineRef={mapOutlineRefToSectionWithRole}
                  onUnmapOutlineRef={unmapOutlineRef}
                  onUpdateOutlineRefRole={updateOutlineRefRole}
                  onTracePlacement={openTrace}
                  onTraceStudySource={openConnectorSourceTrace}
                  onClearTrace={closeTrace}
                />
              </div>
              {tracedSource && traceState && (
                <>
                  <button
                    type="button"
                    aria-label="Close datasource panel"
                    className="fixed inset-0 z-30 bg-black/20 md:hidden"
                    onClick={closeTrace}
                  />
                  <aside
                    data-datasource-panel=""
                    className="fixed inset-y-0 right-0 z-40 flex h-full w-[min(92vw,360px)] shrink-0 flex-col overflow-hidden border-l border-[#d4ced3] bg-[#fafafa] shadow-lg md:relative md:z-0 md:w-[360px] md:shadow-none"
                  >
                    <DataSourcePanel
                      embedded
                      source={tracedSource}
                      sectionTitle={tracedSectionTitle}
                      initialPanelMode={traceState.view === "list" ? "list" : "detail"}
                      blockSources={tracedBlockSources}
                      activeSourceId={traceState.sourceId}
                      onSourceChange={handleTracedSourceChange}
                      onUpdateMappedSource={handleTracedMappedSourceUpdate}
                      onClose={closeTrace}
                    />
                  </aside>
                </>
              )}
            </div>
          )}
        </main>

        {activePanel?.type === "version" && (
          <>
            <button
              type="button"
              aria-label="Close version history"
              className="fixed inset-0 z-30 bg-black/20 md:hidden"
              onClick={() => setActivePanel(null)}
            />
            <VersionPanel onClose={() => setActivePanel(null)} />
          </>
        )}

        {tracedSource && traceState && !matrixLayout && variant !== "connectors" && !v2DataPanelOpen ? (
          <>
            <button
              type="button"
              aria-label="Close datasource panel"
              className="fixed inset-0 z-30 bg-black/20 md:hidden"
              onClick={closeTrace}
            />
            <DataSourcePanel
              source={tracedSource}
              sectionTitle={tracedSectionTitle}
              initialPanelMode={traceState.view === "list" ? "list" : "detail"}
              blockSources={tracedBlockSources}
              activeSourceId={traceState.sourceId}
              onSourceChange={handleTracedSourceChange}
              onUpdateMappedSource={handleTracedMappedSourceUpdate}
              onClose={closeTrace}
            />
          </>
        ) : (
          storylineLayout &&
          v2DataPanelOpen && (
            <aside
              data-datasource-panel=""
              className="peer-library-sidebar fixed inset-y-0 right-0 z-40 shadow-lg md:relative md:z-0 md:shadow-none"
            >
              <StudyDataSourcesList
                enableMappingDrag
                tlfOnly={tlfOnly}
                usageCountByStudySourceId={usageCountByStudySourceId}
                placementsByStudySourceId={placementsByStudySourceId}
                onNavigateToPlacement={navigateToPlacement}
                onSelect={handleStudySourceSelect}
                onClose={() => setV2DataPanelOpen(false)}
                activeSourceId={
                  traceState?.blockId === LIBRARY_TRACE_BLOCK
                    ? traceState.sourceId
                    : traceState
                      ? Object.entries(placementsByStudySourceId).find(([, placements]) =>
                          placements.some(
                            (placement) =>
                              placement.blockId === traceState.blockId &&
                              placement.sourceId === traceState.sourceId,
                          ),
                        )?.[0]
                      : undefined
                }
              />
            </aside>
          )
        )}

      </div>

      {/* PROTOTYPE_DISABLED: study library overlay
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
      */}

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
          <aside className="w-[min(85vw,280px)] bg-white shadow-xl">
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

      {/* V3 matrix uses library + section-row drag only — picker disabled for matrix */}
      {sourcePicker && !matrixLayout && (
        <SourcePickerOverlay
          modeLabel={sourcePicker.modeLabel}
          modeColor={sourcePicker.modeColor}
          existingStudySourceIds={pickerExistingStudySourceIds}
          onConfirm={confirmSourcePicker}
          onClose={() => setSourcePicker(null)}
        />
      )}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}

function headingAddLabel(level: HeadingBlock["level"]): string {
  if (level === 1) return "Add heading";
  if (level === 2) return "Add heading";
  return "Add subheading";
}

function BlockRenderer({
  block,
  blocks,
  blockRefs,
  tracedSourceId,
  onSourceCardClick,
  onUpdateSource,
  onRemoveSource,
  onPromptChange,
  onAdditionalContextChange,
  onAddHeadingAfter,
  onAddContentAfter,
}: {
  block: DocumentBlock;
  blocks: DocumentBlock[];
  blockRefs: MutableRefObject<Record<string, HTMLElement | null>>;
  tracedSourceId: string | null;
  onSourceCardClick: (sourceId: string) => void;
  onUpdateSource: (source: RoadmapSource) => void;
  onRemoveSource: (sourceId: string) => void;
  onPromptChange: (prompt: string) => void;
  onAdditionalContextChange: (additionalContext: string) => void;
  onAddHeadingAfter: (blockId: string, level?: HeadingBlock["level"]) => void;
  onAddContentAfter: (blockId: string) => void;
}) {
  if (block.type === "heading") {
    const isH1 = block.level === 1;
    const isH2 = block.level === 2;
    const isH3 = block.level === 3;
    const Tag = isH1 ? "h1" : isH2 ? "h2" : "h3";
    const wrapperClassName = isH1
      ? "mt-8 sm:mt-10"
      : isH2
        ? "mt-6 sm:mt-8"
        : isH3
          ? "mt-5 sm:mt-6"
          : "mt-4";
    const tagClassName = isH1
      ? "text-[24px] font-semibold leading-8 text-[#333] sm:text-[28px] sm:leading-9"
      : isH2
        ? "text-[20px] font-semibold leading-7 text-[#333] sm:text-[24px] sm:leading-8"
        : isH3
          ? "text-[18px] font-semibold leading-7 text-[#333] sm:text-[20px]"
          : "text-[16px] font-semibold leading-6 text-[#333]";

    return (
      <div
        ref={(el) => {
          blockRefs.current[block.id] = el;
        }}
        className={`group flex items-center gap-2 first:mt-0 ${wrapperClassName}`}
      >
        <Tag className={`min-w-0 flex-1 ${tagClassName}`}>
          {block.number && <span>{block.number} </span>}
          {block.title}
        </Tag>
        <BlockAddButton
          addLabel={headingAddLabel(block.level)}
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
      className="group mb-4 mt-2 min-w-0 rounded-lg"
    >
      <div className="mb-1 flex justify-end">
        <BlockAddButton
          addLabel="Add section"
          onClick={() => onAddContentAfter(block.id)}
        />
      </div>
      <SectionContentBlock
        block={block}
        blocks={blocks}
        tracedSourceId={tracedSourceId}
        onSourceCardClick={onSourceCardClick}
        onUpdateSource={onUpdateSource}
        onRemoveSource={onRemoveSource}
        onPromptChange={onPromptChange}
        onAdditionalContextChange={onAdditionalContextChange}
      />
    </div>
  );
}

function BlockAddButton({
  addLabel,
  onClick,
}: {
  addLabel: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={addLabel}
      title={addLabel}
      onClick={onClick}
      className="flex h-7 shrink-0 items-center justify-center gap-1 rounded-full border border-[#d4ced3] bg-white px-2.5 text-[#636161] opacity-0 shadow-sm transition-all hover:border-[#ff4e49]/50 hover:bg-[#fff5f5] hover:text-[#ff4e49] group-hover:opacity-100 focus-visible:opacity-100"
    >
      <Plus size={14} strokeWidth={2} className="shrink-0" />
      <span className="whitespace-nowrap text-[12px] font-medium">{addLabel}</span>
    </button>
  );
}

/* PROTOTYPE_DISABLED: document view
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
*/

function VersionPanel({ onClose }: { onClose: () => void }) {
  return (
    <aside className="fixed inset-y-0 right-0 z-40 w-[min(90vw,300px)] shrink-0 overflow-y-auto border-l border-[#d4ced3] bg-white shadow-lg md:relative md:z-0 md:w-[300px] md:shadow-none">
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
