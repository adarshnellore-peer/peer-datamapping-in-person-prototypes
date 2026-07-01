import { STUDY_DATA_SOURCES } from "../data/studyDataSources";
import type { DocumentBlock } from "../types";
import { buildTocFlatList } from "./documentBlocks";
import { getDataSourceReferenceKeys } from "./dataSourceReferences";

export type StudySourcePlacement = {
  blockId: string;
  sourceId: string;
  blockNumber?: string;
  blockTitle: string;
};

function tocPartsForBlock(
  blocks: DocumentBlock[],
  blockId: string,
): { blockNumber?: string; blockTitle: string } | null {
  const item = buildTocFlatList(blocks).find((entry) => entry.id === blockId);
  if (item) {
    if (item.kind === "heading") {
      const number = item.heading.number?.trim();
      return {
        blockNumber: number || undefined,
        blockTitle: item.heading.title,
      };
    }
    const number = item.number.trim();
    return {
      blockNumber: number || undefined,
      blockTitle: item.block.title,
    };
  }

  const block = blocks.find((entry) => entry.id === blockId);
  if (!block) return null;
  if (block.type === "content") return { blockTitle: block.title };
  if (block.type === "heading") {
    const number = block.number?.trim();
    return { blockNumber: number || undefined, blockTitle: block.title };
  }
  return null;
}

function blockOrder(blocks: DocumentBlock[], blockId: string): number {
  const index = blocks.findIndex((block) => block.id === blockId);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

/** All roadmap sections where each study-library row is mapped. */
export function collectStudySourcePlacements(
  blocks: DocumentBlock[],
): Record<string, StudySourcePlacement[]> {
  const byStudyId: Record<string, StudySourcePlacement[]> = {};

  for (const block of blocks) {
    if (block.type !== "content" && block.type !== "heading") continue;
    const parts = tocPartsForBlock(blocks, block.id);
    if (!parts) continue;

    const sources = block.type === "content" ? block.sources : (block.sources ?? []);
    for (const source of sources) {
      if (source.sourceType !== "DATA_SOURCE") continue;
      const referenceKeys = getDataSourceReferenceKeys(source);

      for (const entry of STUDY_DATA_SOURCES) {
        if (entry.dataSource !== source.dataSource) continue;
        if (!referenceKeys.includes(entry.referenceKey)) continue;

        const list = byStudyId[entry.id] ?? [];
        const key = `${block.id}:${source.id}`;
        if (list.some((placement) => `${placement.blockId}:${placement.sourceId}` === key)) {
          continue;
        }
        list.push({
          blockId: block.id,
          sourceId: source.id,
          blockNumber: parts.blockNumber,
          blockTitle: parts.blockTitle,
        });
        byStudyId[entry.id] = list;
      }
    }
  }

  for (const studyId of Object.keys(byStudyId)) {
    byStudyId[studyId].sort(
      (a, b) => blockOrder(blocks, a.blockId) - blockOrder(blocks, b.blockId),
    );
  }

  return byStudyId;
}

export function findStudySourcePlacement(
  blocks: DocumentBlock[],
  studySourceId: string,
  preferredBlockId?: string,
): StudySourcePlacement | null {
  const placements = collectStudySourcePlacements(blocks)[studySourceId];
  if (!placements?.length) return null;
  if (preferredBlockId) {
    const preferred = placements.find((placement) => placement.blockId === preferredBlockId);
    if (preferred) return preferred;
  }
  return placements[0] ?? null;
}
