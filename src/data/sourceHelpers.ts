import {
  getDocumentCategory,
  inferSectionName,
  OUTPUT_TYPE_LABELS,
  type DataSourceRoadmapSource,
  type RoadmapSource,
} from "./roadmap";
import { getDocumentSectionKind } from "./documentPreview";
import { findStudySourceForRoadmapSource } from "./studyDataSources";
import { getDataSourceReferenceKeys } from "../utils/dataSourceReferences";
import type { DocumentBlock } from "../types";

type ArtifactKind = "table" | "figure" | "listing" | "text";

function kindToLabel(kind: ArtifactKind): string {
  if (kind === "table") return "Table";
  if (kind === "figure") return "Figure";
  if (kind === "listing") return "Listing";
  return "Text";
}

function defaultPackageKind(dataSource: string): ArtifactKind | null {
  const lower = dataSource.toLowerCase();
  if (lower.includes("(listings)") || lower.includes("listings)")) return "listing";
  if (lower.includes("(figures)") || lower.includes("figures)")) return "figure";
  if (
    lower.includes("(tables)") ||
    lower.includes("tables)") ||
    lower.includes("disposition & demographics") ||
    lower.startsWith("safety tables")
  ) {
    return "table";
  }
  return null;
}

function inferKindFromText(haystack: string, dataSource?: string): ArtifactKind {
  const lower = haystack.toLowerCase();
  if (lower.includes("listing")) return "listing";
  if (lower.includes("figure") || /\bfig\.?\b/.test(lower)) return "figure";
  if (lower.includes("table") && !lower.includes("table of contents")) return "table";

  const packageKind = dataSource ? defaultPackageKind(dataSource) : null;
  return packageKind ?? "text";
}

function kindFromReferencedBlock(
  source: RoadmapSource,
  blocks?: DocumentBlock[],
): ArtifactKind | null {
  if (!blocks) return null;

  if (source.sourceType === "SUBCONTENT" && source.referencedBlockId) {
    const block = blocks.find((item) => item.id === source.referencedBlockId);
    if (block?.type === "content") {
      if (block.outputType === "OUTPUT_TYPE_TABLE") return "table";
      if (block.outputType === "OUTPUT_TYPE_FIGURE") return "figure";
      return "text";
    }
  }

  if (source.sourceType === "CONTENT" && source.referencedHeadingId) {
    const heading = blocks.find((item) => item.id === source.referencedHeadingId);
    if (heading?.type === "heading") {
      const haystack = `${heading.number} ${heading.title}`.toLowerCase();
      const kind = inferKindFromText(haystack);
      return kind === "text" ? null : kind;
    }
  }

  return null;
}

const SOURCE_TYPE_TAGS: Record<RoadmapSource["sourceType"], string> = {
  DATA_SOURCE: "Data source",
  SUBCONTENT: "Subcontent",
  CONTENT: "Content",
  REFERENCE_SOURCE: "Reference",
};

export { getReferenceSectionName } from "./roadmap";

export function getSourceSectionName(source: RoadmapSource): string {
  if (source.sourceType === "DATA_SOURCE") {
    return source.sectionName ?? inferSectionName(source.dataSource, source.referenceKey);
  }
  if (source.sourceType === "REFERENCE_SOURCE") {
    return source.referenceSource || "Reference";
  }
  return source.content || "Untitled source";
}

export function getSourceDocumentCategory(source: RoadmapSource): string {
  if (source.sourceType === "DATA_SOURCE") {
    return source.documentCategory ?? getDocumentCategory(source.dataSource);
  }
  return SOURCE_TYPE_TAGS[source.sourceType];
}

/** Structured header for source cards — document vs section hierarchy. */
export function getSourceHeaderParts(source: RoadmapSource): {
  tag: string;
  primary: string;
  secondary: string | null;
} {
  if (source.sourceType === "DATA_SOURCE") {
    const section = getSourceSectionName(source);
    const category = getSourceDocumentCategory(source);
    if (category === "Template") {
      return { tag: category, primary: "Template", secondary: section };
    }
    return { tag: category, primary: source.dataSource, secondary: section };
  }
  if (source.sourceType === "REFERENCE_SOURCE") {
    return {
      tag: "Reference",
      primary: source.referenceSource || "Reference source",
      secondary: null,
    };
  }
  const role = SOURCE_TYPE_TAGS[source.sourceType];
  return {
    tag: role,
    primary: source.content || "Untitled source",
    secondary: null,
  };
}

/** Chip / trace label — matches production source chips. */
export function getSourceLabel(source: RoadmapSource): string {
  if (source.sourceType === "DATA_SOURCE") {
    const section = getSourceSectionName(source);
    const category = getSourceDocumentCategory(source);
    if (category === "Template") {
      return `Template : ${section}`;
    }
    return `${source.dataSource} : ${section}`;
  }
  if (source.sourceType === "REFERENCE_SOURCE") {
    return source.referenceSource || "Reference source";
  }
  if (source.sourceType === "SUBCONTENT" || source.sourceType === "CONTENT") {
    if (source.aiDescriptor?.trim()) return source.aiDescriptor.trim();
    return source.content || "Source";
  }
  return "Source";
}

/** Card title — same as production source chip text. */
export function getSourceDisplayLabel(source: RoadmapSource): string {
  return getSourceLabel(source);
}

export function getSourceTitle(source: RoadmapSource): string {
  return getSourceLabel(source);
}

/** Short tag: Template, CSR, TLF, etc. */
export function getSourceTypeTag(source: RoadmapSource): string {
  return getSourceDocumentCategory(source);
}

export function getSourceRoleLabel(source: RoadmapSource): string {
  return SOURCE_TYPE_TAGS[source.sourceType];
}

export function getSourceFieldPreview(source: RoadmapSource): {
  role: string;
  document: string;
  pages: string;
} {
  if (source.sourceType === "DATA_SOURCE") {
    return {
      role: SOURCE_TYPE_TAGS.DATA_SOURCE,
      document: source.dataSource,
      pages: source.referenceKey,
    };
  }
  if (source.sourceType === "REFERENCE_SOURCE") {
    return {
      role: SOURCE_TYPE_TAGS.REFERENCE_SOURCE,
      document: source.referenceSource || "—",
      pages: "—",
    };
  }
  return {
    role: SOURCE_TYPE_TAGS[source.sourceType],
    document: source.content || "—",
    pages: "—",
  };
}

export function getSourceName(source: RoadmapSource): string {
  if (source.sourceType === "DATA_SOURCE") {
    return source.dataSource;
  }
  if (source.sourceType === "REFERENCE_SOURCE") {
    return source.referenceSource || "Reference";
  }
  return source.content || "Subcontent";
}

export function getPageRange(source: RoadmapSource): string {
  if (source.sourceType === "DATA_SOURCE") {
    const keys = getDataSourceReferenceKeys(source);
    if (keys.length === 0) return "";
    if (keys.length === 1) return keys[0];
    return keys.join(" · ");
  }
  if (source.sourceType === "SUBCONTENT" || source.sourceType === "CONTENT") {
    return source.content || "—";
  }
  return "—";
}

/** Mono ref + label for mode-matrix chips (Claude-style TFL rows). */
export function getMatrixChipLines(source: RoadmapSource): { ref: string; label: string } {
  if (source.sourceType === "DATA_SOURCE") {
    const section = getSourceSectionName(source);
    const refPart = source.referenceKey.split(":")[0]?.trim() ?? source.referenceKey;
    return { ref: refPart, label: section };
  }
  if (source.sourceType === "REFERENCE_SOURCE") {
    return { ref: "Ref", label: source.referenceSource || "Reference" };
  }
  const text = source.content || "Source";
  return { ref: SOURCE_TYPE_TAGS[source.sourceType], label: text };
}

export function getSourceSecondaryLabel(source: RoadmapSource): string {
  if (source.sourceType === "DATA_SOURCE") {
    return getSourceDocumentCategory(source);
  }
  return source.sourceType.replace("_", " ").toLowerCase();
}

export function sourceKey(blockId: string, sourceId: string) {
  return `${blockId}:${sourceId}`;
}

export function formatOutputType(outputType: string): string {
  if (outputType in OUTPUT_TYPE_LABELS) {
    return OUTPUT_TYPE_LABELS[outputType as keyof typeof OUTPUT_TYPE_LABELS].toLowerCase();
  }
  return outputType.replace("OUTPUT_TYPE_", "").toLowerCase();
}

export function isDataSourceSource(source: RoadmapSource): source is DataSourceRoadmapSource {
  return source.sourceType === "DATA_SOURCE";
}

/** Matrix / pill artifact tag — text, table, figure, listing (material form, not outline role). */
export function getArtifactTypeLabel(source: RoadmapSource, blocks?: DocumentBlock[]): string {
  const referencedKind = kindFromReferencedBlock(source, blocks);
  if (referencedKind) {
    return kindToLabel(referencedKind);
  }

  if (source.sourceType === "SUBCONTENT" || source.sourceType === "CONTENT") {
    const kind = inferKindFromText(source.content || "");
    return kindToLabel(kind);
  }
  if (source.sourceType === "REFERENCE_SOURCE") return "Reference";

  if (source.sourceType === "DATA_SOURCE") {
    const studyMatch = findStudySourceForRoadmapSource(source);
    if (studyMatch?.kind === "figure") return "Figure";
    if (studyMatch?.kind === "listing") return "Listing";
    return kindToLabel(inferDataSourceArtifactKind(source));
  }

  return "Text";
}

function inferDataSourceArtifactKind(source: DataSourceRoadmapSource): ArtifactKind {
  const keys = getDataSourceReferenceKeys(source);
  let strongest: ArtifactKind = "text";

  for (const key of keys) {
    const docKind = getDocumentSectionKind(source.dataSource, key);
    if (docKind === "listing" || docKind === "figure" || docKind === "table") {
      return docKind;
    }
  }

  const names = [
    source.sectionName ?? "",
    ...keys.map((key) => inferSectionName(source.dataSource, key)),
    ...keys,
    getDocumentCategory(source.dataSource),
  ];
  const fromText = inferKindFromText(names.join(" "), source.dataSource);
  if (fromText !== "text") return fromText;

  const packageKind = defaultPackageKind(source.dataSource);
  if (packageKind) return packageKind;

  return strongest;
}
