import {
  getDocumentCategory,
  inferSectionName,
  type DataSourceRoadmapSource,
  type RoadmapSource,
} from "./roadmap";

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
  return source.content || "Source";
}

/** Card title — same as production source chip text. */
export function getSourceDisplayLabel(source: RoadmapSource): string {
  return getSourceLabel(source);
}

export function getSourceTitle(source: RoadmapSource): string {
  return getSourceLabel(source);
}

/** Short tag: Template, Protocol, SAP, etc. */
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
    return source.referenceKey;
  }
  if (source.sourceType === "SUBCONTENT" || source.sourceType === "CONTENT") {
    return source.content || "—";
  }
  return "—";
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
  return outputType.replace("OUTPUT_TYPE_", "").toLowerCase();
}

export function isDataSourceSource(source: RoadmapSource): source is DataSourceRoadmapSource {
  return source.sourceType === "DATA_SOURCE";
}
