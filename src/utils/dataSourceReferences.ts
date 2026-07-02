import {
  enrichDataSourceSource,
  type DataSourceRoadmapSource,
  type RoadmapSource,
} from "../data/roadmap";
import type { DocumentBlock } from "../types";

export function getDataSourceReferenceKeys(source: DataSourceRoadmapSource): string[] {
  const fromArray = source.referenceKeys?.filter((key) => key.trim()) ?? [];
  if (fromArray.length > 0) {
    return [...new Set(fromArray)];
  }
  if (source.referenceKey.trim()) {
    return [source.referenceKey];
  }
  return [];
}

export function normalizeDataSourceReferenceKeys(
  source: DataSourceRoadmapSource,
): DataSourceRoadmapSource {
  const keys = getDataSourceReferenceKeys(source);
  if (keys.length === 0) {
    return { ...source, referenceKey: "", referenceKeys: undefined };
  }
  if (keys.length === 1) {
    return enrichDataSourceSource({
      ...source,
      referenceKey: keys[0],
      referenceKeys: undefined,
      sectionName: undefined,
    });
  }
  return enrichDataSourceSource({
    ...source,
    referenceKey: keys[0],
    referenceKeys: keys,
    sectionName: undefined,
  });
}

export function appendReferenceKeyToDataSource(
  source: DataSourceRoadmapSource,
  referenceKey: string,
): DataSourceRoadmapSource {
  const trimmed = referenceKey.trim();
  if (!trimmed) return source;
  const keys = getDataSourceReferenceKeys(source);
  if (keys.includes(trimmed)) return source;
  return normalizeDataSourceReferenceKeys({
    ...source,
    referenceKey: keys[0] ?? trimmed,
    referenceKeys: keys.length > 0 ? [...keys, trimmed] : undefined,
  });
}

export function setDataSourceReferenceKeys(
  source: DataSourceRoadmapSource,
  keys: string[],
): DataSourceRoadmapSource {
  const unique = [...new Set(keys.map((key) => key.trim()).filter(Boolean))];
  return normalizeDataSourceReferenceKeys({
    ...source,
    referenceKey: unique[0] ?? "",
    referenceKeys: unique.length > 1 ? unique : undefined,
  });
}

export function removeReferenceKeyFromDataSource(
  source: DataSourceRoadmapSource,
  referenceKey: string,
): DataSourceRoadmapSource {
  const keys = getDataSourceReferenceKeys(source).filter((key) => key !== referenceKey);
  return normalizeDataSourceReferenceKeys({
    ...source,
    referenceKey: keys[0] ?? "",
    referenceKeys: keys.length > 1 ? keys : undefined,
  });
}

export function replaceReferenceKeyOnDataSource(
  source: DataSourceRoadmapSource,
  fromKey: string,
  toKey: string,
): DataSourceRoadmapSource {
  const keys = getDataSourceReferenceKeys(source).map((key) =>
    key === fromKey ? toKey.trim() : key,
  );
  return setDataSourceReferenceKeys(source, keys);
}

function sourcesSerialized(sources: RoadmapSource[]): string {
  return JSON.stringify(
    sources.map((source) => {
      if (source.sourceType !== "DATA_SOURCE") return source;
      return {
        ...source,
        referenceKeys: getDataSourceReferenceKeys(source),
      };
    }),
  );
}

/** Stable merge key: same document + usage + source/reference tag fold together. */
export function dataSourceConsolidationKey(source: RoadmapSource): string {
  if (source.sourceType !== "DATA_SOURCE" || !source.dataSource) {
    return `id:${source.id}`;
  }

  const usage =
    source.role === "primary" ||
    source.role === "supporting" ||
    source.role === "context" ||
    source.role === "reference"
      ? source.role
      : source.isReference
        ? "reference"
        : "primary";

  const format =
    source.role === "source" || source.role === "reference"
      ? source.role
      : usage === "reference"
        ? "reference"
        : "source";

  if (source.studySourceId) {
    return `study:${source.studySourceId}::${usage}::${format}`;
  }

  return `${source.dataSource}::${usage}::${format}`;
}

/** Merge duplicate data-source rows that share document + role tag. */
export function consolidateDataSourceEntries(
  sources: RoadmapSource[],
  mergeRoleKey: (source: RoadmapSource) => string,
): RoadmapSource[] {
  const result: RoadmapSource[] = [];
  const indexByMergeKey = new Map<string, number>();

  for (const source of sources) {
    if (source.sourceType !== "DATA_SOURCE" || !source.dataSource) {
      result.push(source);
      continue;
    }

    const mergeKey = `${source.dataSource}::${mergeRoleKey(source)}`;
    const existingIndex = indexByMergeKey.get(mergeKey);

    if (existingIndex === undefined) {
      indexByMergeKey.set(mergeKey, result.length);
      result.push(normalizeDataSourceReferenceKeys(source));
      continue;
    }

    const existing = result[existingIndex] as DataSourceRoadmapSource;
    let merged = existing;
    for (const referenceKey of getDataSourceReferenceKeys(source)) {
      merged = appendReferenceKeyToDataSource(merged, referenceKey);
    }
    result[existingIndex] = { ...merged, id: existing.id, role: existing.role ?? source.role };
  }

  return result;
}

export function consolidateContentBlockSourcesIfNeeded(
  sources: RoadmapSource[],
  mergeRoleKey: (source: RoadmapSource) => string = dataSourceConsolidationKey,
): { sources: RoadmapSource[]; changed: boolean } {
  const consolidated = consolidateDataSourceEntries(sources, mergeRoleKey);
  const changed = sourcesSerialized(sources) !== sourcesSerialized(consolidated);
  return { sources: consolidated, changed };
}

export function consolidateDocumentBlock(block: DocumentBlock): DocumentBlock {
  if (block.type === "content") {
    return {
      ...block,
      sources: consolidateDataSourceEntries(block.sources, dataSourceConsolidationKey),
    };
  }
  if (block.type === "heading" && block.sources?.length) {
    return {
      ...block,
      sources: consolidateDataSourceEntries(block.sources, dataSourceConsolidationKey),
    };
  }
  return block;
}

export function consolidateDocumentBlocks(blocks: DocumentBlock[]): DocumentBlock[] {
  return blocks.map(consolidateDocumentBlock);
}
