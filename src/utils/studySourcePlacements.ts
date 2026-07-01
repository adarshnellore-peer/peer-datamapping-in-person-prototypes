import { STUDY_DATA_SOURCES } from "../data/studyDataSources";
import type { DocumentBlock } from "../types";
import { getDataSourceReferenceKeys } from "./dataSourceReferences";

export type StudySourcePlacement = {
  blockId: string;
  sourceId: string;
  blockTitle: string;
};

function blockTitleFor(block: DocumentBlock): string | null {
  if (block.type === "content") return block.title;
  if (block.type === "heading") {
    return block.number ? `${block.number} ${block.title}` : block.title;
  }
  return null;
}

/** All roadmap sections where each study-library row is mapped. */
export function collectStudySourcePlacements(
  blocks: DocumentBlock[],
): Record<string, StudySourcePlacement[]> {
  const byStudyId: Record<string, StudySourcePlacement[]> = {};

  for (const block of blocks) {
    if (block.type !== "content" && block.type !== "heading") continue;
    const title = blockTitleFor(block);
    if (!title) continue;

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
        list.push({ blockId: block.id, sourceId: source.id, blockTitle: title });
        byStudyId[entry.id] = list;
      }
    }
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
