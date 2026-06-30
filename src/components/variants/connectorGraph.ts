import { getDocumentCategory } from "../../data/roadmap";
import type { DocumentBlock } from "../../types";
import { CATEGORY_ORDER } from "./types";

/** A unique section node (left column). */
export type SectionNode = {
  blockId: string;
  title: string;
  headingLabel: string | null;
  sourceCount: number;
  proposedCount: number;
};

/** A unique source/document node (right column). */
export type SourceNode = {
  dataSource: string;
  category: string;
  sectionCount: number;
  proposedCount: number;
};

/** A unique mapping between one section and one document. */
export type ConnectorEdge = {
  blockId: string;
  dataSource: string;
  /** placements collapsed into this edge (e.g. same doc, two page ranges). */
  count: number;
  hasProposed: boolean;
};

/** Left-column render order: heading separators interleaved with section nodes. */
export type LeftItem =
  | { kind: "heading"; id: string; label: string }
  | { kind: "section"; node: SectionNode };

/** Right-column render order: category group label followed by its sources. */
export type SourceGroup = { category: string; sources: SourceNode[] };

export type ConnectorGraph = {
  leftItems: LeftItem[];
  sourceGroups: SourceGroup[];
  edges: ConnectorEdge[];
  sectionToSources: Map<string, Set<string>>;
  sourceToSections: Map<string, Set<string>>;
  sourceCategory: Map<string, string>;
  categories: string[];
};

/**
 * Build the bipartite mapping graph: a de-duplicated list of sections and of
 * documents, with one edge per unique (section, document) pair. Only
 * DATA_SOURCE sources have a document identity, so others are ignored.
 */
export function buildConnectorGraph(blocks: DocumentBlock[]): ConnectorGraph {
  const leftItems: LeftItem[] = [];
  const sectionToSources = new Map<string, Set<string>>();
  const sourceToSections = new Map<string, Set<string>>();
  const sourceProposed = new Map<string, number>();
  const sourceCategory = new Map<string, string>();
  const edgeMap = new Map<string, ConnectorEdge>();

  let heading: string | null = null;

  for (const block of blocks) {
    if (block.type === "heading") {
      heading = `${block.number ? block.number + " " : ""}${block.title}`;
      leftItems.push({ kind: "heading", id: block.id, label: heading });
      continue;
    }
    if (block.type !== "content") continue;

    const sources = new Set<string>();
    let proposedCount = 0;

    for (const source of block.sources) {
      if (source.sourceType !== "DATA_SOURCE") continue;
      const { dataSource } = source;
      const isProposed = source.status === "proposed";
      sources.add(dataSource);
      if (isProposed) proposedCount += 1;

      // Edge (collapse duplicate placements of the same doc in this section).
      const key = `${block.id}|${dataSource}`;
      const existing = edgeMap.get(key);
      if (existing) {
        existing.count += 1;
        existing.hasProposed = existing.hasProposed || isProposed;
      } else {
        edgeMap.set(key, { blockId: block.id, dataSource, count: 1, hasProposed: isProposed });
      }

      // Source-side aggregates.
      if (!sourceToSections.has(dataSource)) sourceToSections.set(dataSource, new Set());
      sourceToSections.get(dataSource)!.add(block.id);
      if (isProposed) sourceProposed.set(dataSource, (sourceProposed.get(dataSource) ?? 0) + 1);
      if (!sourceCategory.has(dataSource)) sourceCategory.set(dataSource, getDocumentCategory(dataSource));
    }

    sectionToSources.set(block.id, sources);
    leftItems.push({
      kind: "section",
      node: {
        blockId: block.id,
        title: block.title,
        headingLabel: heading,
        sourceCount: sources.size,
        proposedCount,
      },
    });
  }

  // Group sources by category in CATEGORY_ORDER, names sorted within.
  const order = [...CATEGORY_ORDER] as string[];
  const byCategory = new Map<string, SourceNode[]>();
  for (const [dataSource, sections] of sourceToSections) {
    const category = sourceCategory.get(dataSource) ?? "Document";
    const node: SourceNode = {
      dataSource,
      category,
      sectionCount: sections.size,
      proposedCount: sourceProposed.get(dataSource) ?? 0,
    };
    if (!byCategory.has(category)) byCategory.set(category, []);
    byCategory.get(category)!.push(node);
  }

  const orderedCategories = [
    ...order.filter((c) => byCategory.has(c)),
    ...[...byCategory.keys()].filter((c) => !order.includes(c)).sort(),
  ];

  const sourceGroups: SourceGroup[] = orderedCategories.map((category) => ({
    category,
    sources: (byCategory.get(category) ?? []).sort((a, b) =>
      a.dataSource.localeCompare(b.dataSource),
    ),
  }));

  return {
    leftItems,
    sourceGroups,
    edges: [...edgeMap.values()],
    sectionToSources,
    sourceToSections,
    sourceCategory,
    categories: orderedCategories,
  };
}
