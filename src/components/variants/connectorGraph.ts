import { getReferenceDisplayName, parsePageRange } from "../../data/documentPreview";
import { getDocumentCategory, type SourceRole } from "../../data/roadmap";
import {
  findStudySourceForRoadmapSource,
  STUDY_DATA_SOURCES,
  type StudyDataSource,
} from "../../data/studyDataSources";
import type { DocumentBlock, HeadingBlock } from "../../types";
import { CATEGORY_ORDER, effectiveSourceRole } from "./types";

export type HeadingNode = {
  headingId: string;
  label: string;
  outlineInCount: number;
  proposedCount: number;
};

export type SectionNode = {
  blockId: string;
  title: string;
  headingLabel: string | null;
  sourceCount: number;
  outlineInCount: number;
  proposedCount: number;
};

/** One library section / page range that can be wired to outline rows. */
export type ReferenceNode = {
  studySourceId: string;
  dataSource: string;
  referenceKey: string;
  label: string;
  pageRef: string | null;
  category: string;
  sectionCount: number;
  proposedCount: number;
};

export type SourceDocNode = {
  dataSource: string;
  category: string;
  label: string;
  references: ReferenceNode[];
  sectionCount: number;
  proposedCount: number;
};

export type SourceCatalogEntry =
  | { kind: "document"; doc: SourceDocNode }
  | { kind: "standalone"; ref: ReferenceNode };

export type SourceCatalogGroup = {
  category: string;
  entries: SourceCatalogEntry[];
};

/** External link: one mapped placement (document section → outline row). */
export type ConnectorEdge = {
  blockId: string;
  studySourceId: string;
  dataSource: string;
  referenceKey: string;
  sourceId: string;
  hasProposed: boolean;
  role?: SourceRole;
  refLabel: string;
};

export type OutlineEdge = {
  toBlockId: string;
  refKind: "section" | "heading";
  refId: string;
  sourceId: string;
  sourceType: "SUBCONTENT" | "CONTENT";
  hasProposed: boolean;
  role?: SourceRole;
  refLabel: string;
};

export type LeftItem =
  | { kind: "heading"; node: HeadingNode }
  | { kind: "section"; node: SectionNode };

export type ConnectorGraph = {
  leftItems: LeftItem[];
  sourceCatalog: SourceCatalogGroup[];
  edges: ConnectorEdge[];
  outlineEdges: OutlineEdge[];
  sectionToStudySources: Map<string, Set<string>>;
  studySourceToSections: Map<string, Set<string>>;
  dataSourceToSections: Map<string, Set<string>>;
  studySourceCategory: Map<string, string>;
  blockToOutlineRefs: Map<string, Set<string>>;
  refToConsumers: Map<string, Set<string>>;
  categories: string[];
};

function headingLabel(block: HeadingBlock): string {
  return `${block.number ? block.number + " " : ""}${block.title}`;
}

function outlineRefKey(refKind: "section" | "heading", refId: string): string {
  return `${refKind}|${refId}`;
}

function pageRefFor(referenceKey: string): string | null {
  const { start, end } = parsePageRange(referenceKey);
  if (start === end) return `p. ${start}`;
  return `pp. ${start}–${end}`;
}

function documentLabel(entry: StudyDataSource): string {
  const separator = entry.name.indexOf(" — ");
  if (separator !== -1) return entry.name.slice(0, separator);
  return entry.name;
}

function sectionLabel(entry: StudyDataSource): string {
  if (entry.kind === "figure" || entry.kind === "listing") return entry.name;
  return getReferenceDisplayName(entry.dataSource, entry.referenceKey);
}

function categoryForStudySource(entry: StudyDataSource): string {
  if (entry.kind === "figure") return "Figures";
  if (entry.kind === "listing") return "Listings";
  return getDocumentCategory(entry.dataSource);
}

function collectOutlineSources(block: DocumentBlock): {
  sources: import("../../data/roadmap").RoadmapSource[];
} {
  if (block.type === "content") return { sources: block.sources };
  if (block.type === "heading") return { sources: block.sources ?? [] };
  return { sources: [] };
}

type PlacementStats = Map<string, { sectionCount: number; proposedCount: number }>;

function buildPlacementStats(blocks: DocumentBlock[]): PlacementStats {
  const stats: PlacementStats = new Map();
  for (const block of blocks) {
    if (block.type !== "content") continue;
    for (const source of block.sources) {
      if (source.sourceType !== "DATA_SOURCE") continue;
      const entry = findStudySourceForRoadmapSource(source);
      if (!entry) continue;
      const current = stats.get(entry.id) ?? { sectionCount: 0, proposedCount: 0 };
      current.sectionCount += 1;
      if (source.status === "proposed") current.proposedCount += 1;
      stats.set(entry.id, current);
    }
  }
  return stats;
}

function referenceNodeFromStudySource(
  entry: StudyDataSource,
  stats: PlacementStats,
): ReferenceNode {
  const placement = stats.get(entry.id);
  return {
    studySourceId: entry.id,
    dataSource: entry.dataSource,
    referenceKey: entry.referenceKey,
    label: sectionLabel(entry),
    pageRef: entry.kind === "document" ? pageRefFor(entry.referenceKey) : null,
    category: categoryForStudySource(entry),
    sectionCount: placement?.sectionCount ?? 0,
    proposedCount: placement?.proposedCount ?? 0,
  };
}

function buildSourceCatalog(stats: PlacementStats): {
  catalog: SourceCatalogGroup[];
  studySourceCategory: Map<string, string>;
  categories: string[];
} {
  const byDataSource = new Map<string, StudyDataSource[]>();
  const standalones: StudyDataSource[] = [];

  for (const entry of STUDY_DATA_SOURCES) {
    if (entry.kind === "document") {
      const list = byDataSource.get(entry.dataSource) ?? [];
      list.push(entry);
      byDataSource.set(entry.dataSource, list);
    } else {
      standalones.push(entry);
    }
  }

  const studySourceCategory = new Map<string, string>();
  const entriesByCategory = new Map<string, SourceCatalogEntry[]>();

  const addEntry = (category: string, entry: SourceCatalogEntry) => {
    if (!entriesByCategory.has(category)) entriesByCategory.set(category, []);
    entriesByCategory.get(category)!.push(entry);
  };

  for (const [dataSource, groupEntries] of byDataSource) {
    const references = groupEntries.map((entry) => {
      const ref = referenceNodeFromStudySource(entry, stats);
      studySourceCategory.set(entry.id, ref.category);
      return ref;
    });
    const category = references[0]?.category ?? "Document";
    const sectionCount = references.reduce((sum, ref) => sum + ref.sectionCount, 0);
    const proposedCount = references.reduce((sum, ref) => sum + ref.proposedCount, 0);
    addEntry(category, {
      kind: "document",
      doc: {
        dataSource,
        category,
        label: documentLabel(groupEntries[0]),
        references,
        sectionCount,
        proposedCount,
      },
    });
  }

  for (const entry of standalones) {
    const ref = referenceNodeFromStudySource(entry, stats);
    studySourceCategory.set(entry.id, ref.category);
    addEntry(ref.category, { kind: "standalone", ref });
  }

  const order = [...CATEGORY_ORDER, "Figures", "Listings"] as string[];
  const orderedCategories = [
    ...order.filter((category) => entriesByCategory.has(category)),
    ...[...entriesByCategory.keys()].filter((category) => !order.includes(category)).sort(),
  ];

  const catalog: SourceCatalogGroup[] = orderedCategories.map((category) => ({
    category,
    entries: (entriesByCategory.get(category) ?? []).sort((a, b) => {
      const labelA = a.kind === "document" ? a.doc.label : a.ref.label;
      const labelB = b.kind === "document" ? b.doc.label : b.ref.label;
      return labelA.localeCompare(labelB);
    }),
  }));

  return { catalog, studySourceCategory, categories: orderedCategories };
}

export function buildConnectorGraph(blocks: DocumentBlock[]): ConnectorGraph {
  const placementStats = buildPlacementStats(blocks);
  const { catalog, studySourceCategory, categories } = buildSourceCatalog(placementStats);

  const leftItems: LeftItem[] = [];
  const sectionToStudySources = new Map<string, Set<string>>();
  const studySourceToSections = new Map<string, Set<string>>();
  const dataSourceToSections = new Map<string, Set<string>>();
  const edges: ConnectorEdge[] = [];
  const outlineEdgeMap = new Map<string, OutlineEdge>();
  const blockToOutlineRefs = new Map<string, Set<string>>();
  const refToConsumers = new Map<string, Set<string>>();
  const outlineInByBlock = new Map<string, number>();
  const outlineProposedByBlock = new Map<string, number>();
  const refLabels = new Map<string, string>();

  for (const block of blocks) {
    if (block.type === "heading") {
      refLabels.set(outlineRefKey("heading", block.id), headingLabel(block));
    }
    if (block.type === "content") {
      refLabels.set(outlineRefKey("section", block.id), block.title);
    }
  }

  let currentHeading: string | null = null;

  for (const block of blocks) {
    if (block.type === "heading") {
      currentHeading = headingLabel(block);
      leftItems.push({
        kind: "heading",
        node: {
          headingId: block.id,
          label: currentHeading,
          outlineInCount: 0,
          proposedCount: 0,
        },
      });
      continue;
    }
    if (block.type !== "content") continue;

    const studySources = new Set<string>();
    let placementCount = 0;
    let proposedCount = 0;

    for (const source of block.sources) {
      if (source.sourceType !== "DATA_SOURCE") continue;
      const entry = findStudySourceForRoadmapSource(source);
      if (!entry) continue;

      const isProposed = source.status === "proposed";
      placementCount += 1;
      if (isProposed) proposedCount += 1;
      studySources.add(entry.id);

      edges.push({
        blockId: block.id,
        studySourceId: entry.id,
        dataSource: source.dataSource,
        referenceKey: source.referenceKey,
        sourceId: source.id,
        hasProposed: isProposed,
        role: effectiveSourceRole(source),
        refLabel: sectionLabel(entry),
      });

      if (!studySourceToSections.has(entry.id)) studySourceToSections.set(entry.id, new Set());
      studySourceToSections.get(entry.id)!.add(block.id);

      if (!dataSourceToSections.has(source.dataSource)) {
        dataSourceToSections.set(source.dataSource, new Set());
      }
      dataSourceToSections.get(source.dataSource)!.add(block.id);
    }

    sectionToStudySources.set(block.id, studySources);
    leftItems.push({
      kind: "section",
      node: {
        blockId: block.id,
        title: block.title,
        headingLabel: currentHeading,
        sourceCount: placementCount,
        outlineInCount: 0,
        proposedCount,
      },
    });
  }

  for (const block of blocks) {
    if (block.type !== "content" && block.type !== "heading") continue;
    const { sources } = collectOutlineSources(block);

    for (const source of sources) {
      let refKind: "section" | "heading" | null = null;
      let refId: string | null = null;
      let sourceType: "SUBCONTENT" | "CONTENT" | null = null;

      if (source.sourceType === "SUBCONTENT" && source.referencedBlockId) {
        refKind = "section";
        refId = source.referencedBlockId;
        sourceType = "SUBCONTENT";
      } else if (source.sourceType === "CONTENT" && source.referencedHeadingId) {
        refKind = "heading";
        refId = source.referencedHeadingId;
        sourceType = "CONTENT";
      } else {
        continue;
      }

      const isProposed = source.status === "proposed";
      const refKey = outlineRefKey(refKind, refId);
      const edgeKey = `${block.id}|${refKey}`;

      outlineEdgeMap.set(edgeKey, {
        toBlockId: block.id,
        refKind,
        refId,
        sourceId: source.id,
        sourceType,
        hasProposed: isProposed,
        role: effectiveSourceRole(source),
        refLabel: refLabels.get(refKey) ?? source.content ?? refId,
      });

      if (!blockToOutlineRefs.has(block.id)) blockToOutlineRefs.set(block.id, new Set());
      blockToOutlineRefs.get(block.id)!.add(refKey);

      if (!refToConsumers.has(refId)) refToConsumers.set(refId, new Set());
      refToConsumers.get(refId)!.add(block.id);

      outlineInByBlock.set(block.id, (outlineInByBlock.get(block.id) ?? 0) + 1);
      if (isProposed) {
        outlineProposedByBlock.set(
          block.id,
          (outlineProposedByBlock.get(block.id) ?? 0) + 1,
        );
      }
    }
  }

  for (const item of leftItems) {
    if (item.kind === "section") {
      item.node.outlineInCount = outlineInByBlock.get(item.node.blockId) ?? 0;
      item.node.proposedCount += outlineProposedByBlock.get(item.node.blockId) ?? 0;
    } else {
      item.node.outlineInCount = outlineInByBlock.get(item.node.headingId) ?? 0;
      item.node.proposedCount = outlineProposedByBlock.get(item.node.headingId) ?? 0;
    }
  }

  return {
    leftItems,
    sourceCatalog: catalog,
    edges,
    outlineEdges: [...outlineEdgeMap.values()],
    sectionToStudySources,
    studySourceToSections,
    dataSourceToSections,
    studySourceCategory,
    blockToOutlineRefs,
    refToConsumers,
    categories,
  };
}

export function outlineEdgeKey(edge: Pick<OutlineEdge, "toBlockId" | "refKind" | "refId">): string {
  return `${edge.toBlockId}|${edge.refKind}|${edge.refId}`;
}

export { findStudySourcePlacement } from "../../utils/studySourcePlacements";

/** @deprecated Use findStudySourcePlacement */
export function findDataSourcePlacement(
  blocks: DocumentBlock[],
  dataSource: string,
  preferredBlockId?: string,
): { blockId: string; sourceId: string } | null {
  const matchInBlock = (block: DocumentBlock) => {
    if (block.type !== "content") return null;
    const source = block.sources.find(
      (s) => s.sourceType === "DATA_SOURCE" && s.dataSource === dataSource,
    );
    return source ? { blockId: block.id, sourceId: source.id } : null;
  };

  if (preferredBlockId) {
    const preferred = blocks.find((b) => b.id === preferredBlockId);
    const hit = preferred ? matchInBlock(preferred) : null;
    if (hit) return hit;
  }

  for (const block of blocks) {
    const hit = matchInBlock(block);
    if (hit) return hit;
  }
  return null;
}
