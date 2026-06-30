import {
  SOURCE_ROLES,
  getDocumentCategory,
  type DataSourceRoadmapSource,
  type SourceRole,
} from "../../data/roadmap";
import type { DocumentBlock } from "../../types";
import { CATEGORY_ORDER } from "./types";

/** One place a document is mapped: a section + its per-placement page range / usage. */
export type Placement = {
  blockId: string;
  blockTitle: string;
  headingLabel: string | null;
  source: DataSourceRoadmapSource;
  /** role differs from the document's computed default usage. */
  isOverride: boolean;
};

/** A de-duplicated document (Figma "main component") and all its placements. */
export type DocNode = {
  dataSource: string;
  category: string;
  placements: Placement[];
  proposedCount: number;
  /** Most common defined role across placements; null when none set. */
  defaultUsage: SourceRole | null;
  overrideCount: number;
};

export type TypeGroup = {
  category: string;
  docs: DocNode[];
  proposedCount: number;
};

/** Most common defined role; ties resolved by SOURCE_ROLES order. */
function computeDefaultUsage(sources: DataSourceRoadmapSource[]): SourceRole | null {
  const counts = new Map<SourceRole, number>();
  for (const source of sources) {
    if (source.role) counts.set(source.role, (counts.get(source.role) ?? 0) + 1);
  }
  if (counts.size === 0) return null;
  let best: SourceRole | null = null;
  let bestCount = -1;
  for (const role of SOURCE_ROLES) {
    const count = counts.get(role) ?? 0;
    if (count > bestCount) {
      bestCount = count;
      best = role;
    }
  }
  return best;
}

/**
 * Invert the section-centric document into a document-centric tree:
 * Type group -> Document -> Placements. Only DATA_SOURCE sources carry a
 * document identity, so other source types are ignored here.
 */
export function buildSourceTree(blocks: DocumentBlock[]): TypeGroup[] {
  // Gather placements per document, tracking the nearest preceding heading.
  const byDoc = new Map<
    string,
    { blockId: string; blockTitle: string; headingLabel: string | null; source: DataSourceRoadmapSource }[]
  >();
  let headingLabel: string | null = null;

  for (const block of blocks) {
    if (block.type === "heading") {
      headingLabel = `${block.number ? block.number + " " : ""}${block.title}`;
      continue;
    }
    if (block.type !== "content") continue;
    for (const source of block.sources) {
      if (source.sourceType !== "DATA_SOURCE") continue;
      const list = byDoc.get(source.dataSource) ?? [];
      list.push({
        blockId: block.id,
        blockTitle: block.title,
        headingLabel,
        source,
      });
      byDoc.set(source.dataSource, list);
    }
  }

  // Build DocNodes with computed default usage + override/proposed counts.
  const docs: DocNode[] = [];
  for (const [dataSource, raw] of byDoc) {
    const defaultUsage = computeDefaultUsage(raw.map((r) => r.source));
    const placements: Placement[] = raw.map((r) => ({
      ...r,
      isOverride:
        defaultUsage !== null && r.source.role != null && r.source.role !== defaultUsage,
    }));
    docs.push({
      dataSource,
      category: getDocumentCategory(dataSource),
      placements,
      proposedCount: placements.filter((p) => p.source.status === "proposed").length,
      defaultUsage,
      overrideCount: placements.filter((p) => p.isOverride).length,
    });
  }

  // Group by category in CATEGORY_ORDER; trailing unknown categories last.
  const order = [...CATEGORY_ORDER] as string[];
  const groups = new Map<string, DocNode[]>();
  for (const doc of docs) {
    const list = groups.get(doc.category) ?? [];
    list.push(doc);
    groups.set(doc.category, list);
  }

  const orderedCategories = [
    ...order.filter((c) => groups.has(c)),
    ...[...groups.keys()].filter((c) => !order.includes(c)).sort(),
  ];

  return orderedCategories.map((category) => {
    const groupDocs = (groups.get(category) ?? []).sort((a, b) =>
      a.dataSource.localeCompare(b.dataSource),
    );
    return {
      category,
      docs: groupDocs,
      proposedCount: groupDocs.reduce((sum, d) => sum + d.proposedCount, 0),
    };
  });
}
