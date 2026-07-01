import { REFERENCE_KEYS, REFERENCE_DISPLAY_NAMES } from "./roadmap";
import type { RoadmapSource } from "./roadmap";
import { getReferenceSectionName, getSourceLabel } from "./sourceHelpers";

export type DocumentSection = {
  id: string;
  referenceKey: string;
  title: string;
  kind: "section" | "figure" | "listing" | "table";
  preview: string;
  isTemplateInstruction?: boolean;
};

export type TracePreview = {
  title: string;
  body: string;
  isTemplateInstruction: boolean;
};

export type DocumentPdfAsset = {
  file: string;
  pageCount: number;
};

/** Real PDFs served from public/pdfs/ (see public/pdfs/README.md). */
export const DOCUMENT_PDF_ASSETS: Record<string, DocumentPdfAsset> = {
  "Clinical Study Report": {
    file: "/pdfs/clinical-study-report.pdf",
    pageCount: 154,
  },
  "Biogen Clinical Study Report Template": {
    file: "/pdfs/generic-template.pdf",
    pageCount: 65,
  },
};

const DOCUMENT_PAGE_COUNTS: Record<string, number> = {
  "Biogen Clinical Study Report Template": 65,
  "Clinical Study Report": 420,
};

export function getDocumentPdfAsset(dataSource: string): DocumentPdfAsset | null {
  return DOCUMENT_PDF_ASSETS[dataSource] ?? null;
}

export function getDocumentPdfPageUrl(dataSource: string, page: number): string | null {
  const asset = getDocumentPdfAsset(dataSource);
  if (!asset) return null;
  const clamped = Math.max(1, Math.min(page, asset.pageCount));
  return `${asset.file}#page=${clamped}`;
}

const SECTION_PREVIEWS: Record<string, string> = {
  "Synopsis: 3-13":
    "Study synopsis including objectives, design, population, treatments, and key efficacy and safety results.",
  "Template Section 9.2: 142-148":
    "[Instructional text goes here. Use paragraphs as appropriate.]",
  "Template Section 10.8: 168-174":
    "[Instructional text goes here. Use paragraphs as appropriate.]",
};

function isTemplateDataSource(dataSource: string): boolean {
  return dataSource.includes("Template");
}

export function getDocumentSectionKind(
  dataSource: string,
  referenceKey: string,
): DocumentSection["kind"] {
  const sections = DOCUMENT_SECTIONS[dataSource];
  const hit = sections?.find((section) => section.referenceKey === referenceKey);
  if (hit) return hit.kind;
  return sectionKind(referenceKey);
}

function sectionKind(referenceKey: string): DocumentSection["kind"] {
  const name = getReferenceSectionName(referenceKey).toLowerCase();
  if (name.includes("table")) return "table";
  if (name.includes("figure") || name.includes("fig")) return "figure";
  if (name.includes("listing")) return "listing";
  return "section";
}

function defaultPreview(dataSource: string, referenceKey: string): string {
  if (SECTION_PREVIEWS[referenceKey]) return SECTION_PREVIEWS[referenceKey];
  const section = getReferenceSectionName(referenceKey);
  if (isTemplateDataSource(dataSource)) {
    return `[Instructional text for ${section}. Use paragraphs as appropriate.]`;
  }
  return `Content from ${section} of ${dataSource}.`;
}

function buildSection(dataSource: string, referenceKey: string, index: number): DocumentSection {
  const title = getReferenceSectionName(referenceKey);
  const template = isTemplateDataSource(dataSource);
  return {
    id: `${dataSource}-${index}`,
    referenceKey,
    title,
    kind: sectionKind(referenceKey),
    preview: defaultPreview(dataSource, referenceKey),
    isTemplateInstruction: template,
  };
}

function buildSectionsFromReferenceKeys(dataSource: string): DocumentSection[] {
  const keys = REFERENCE_KEYS[dataSource] ?? [];
  return keys.map((referenceKey, index) => buildSection(dataSource, referenceKey, index));
}

export const DOCUMENT_SECTIONS: Record<string, DocumentSection[]> = {
  "Clinical Study Report": [
    {
      id: "csr-synopsis",
      referenceKey: "Synopsis: 3-13",
      title: "Synopsis",
      kind: "section",
      preview: SECTION_PREVIEWS["Synopsis: 3-13"],
    },
    {
      id: "csr-intro",
      referenceKey: "CSR Intro Sections: 29-83",
      title: "Introduction & Background",
      kind: "section",
      preview:
        "Ovarian cancer remains a leading cause of gynecologic cancer mortality. Prior platinum-based therapy…",
    },
    {
      id: "csr-design",
      referenceKey: "Study Design and Objectives: 84-112",
      title: "Study Design and Objectives",
      kind: "section",
      preview: "Study objectives, endpoints, and overall design summary.",
    },
    {
      id: "csr-efficacy",
      referenceKey: "Efficacy Results — Primary Endpoint: 198-224",
      title: "Efficacy Results — Primary Endpoint",
      kind: "section",
      preview: "Primary endpoint analysis and key efficacy findings.",
    },
    {
      id: "csr-safety",
      referenceKey: "Safety Summary — Adverse Events: 312-348",
      title: "Safety Summary — Adverse Events",
      kind: "section",
      preview: "Overview of treatment-emergent adverse events by system organ class.",
    },
    {
      id: "csr-toc",
      referenceKey: "Table of Contents: 9-12",
      title: "Table of Contents",
      kind: "section",
      preview: "Document outline and section page references.",
    },
  ],
  "Biogen Clinical Study Report Template": buildSectionsFromReferenceKeys(
    "Biogen Clinical Study Report Template",
  ).map((s) => {
    const titles: Record<string, string> = {
      "Template Section 9.2: 142-148": "Efficacy Results",
      "Template Section 10.8: 168-174": "Safety Evaluation",
      "Template Section 11.9.2: 198-204": "Discussion & Conclusions",
      "Synopsis: 2-8": "Synopsis",
      "Table of Contents: 9-12": "Table of Contents",
    };
    return {
      ...s,
      title: titles[s.referenceKey] ?? s.title,
      isTemplateInstruction: true,
    };
  }),
};

export function getSectionsForDocument(dataSource: string): DocumentSection[] {
  if (DOCUMENT_SECTIONS[dataSource]) return DOCUMENT_SECTIONS[dataSource];
  return buildSectionsFromReferenceKeys(dataSource);
}

/** Human-readable section title for library rows and chips. */
export function getReferenceDisplayName(dataSource: string, referenceKey: string): string {
  const matched = findSectionByReferenceKey(dataSource, referenceKey);
  if (matched) return matched.title;
  return REFERENCE_DISPLAY_NAMES[dataSource]?.[referenceKey] ?? getReferenceSectionName(referenceKey);
}

export function getDefaultSectionForDocument(dataSource: string): DocumentSection | undefined {
  return getSectionsForDocument(dataSource)[0];
}

export function parsePageRange(referenceKey: string): {
  start: number;
  end: number;
  chip: string;
} {
  const colon = referenceKey.lastIndexOf(":");
  const rangePart = colon === -1 ? referenceKey.trim() : referenceKey.slice(colon + 1).trim();
  const match = rangePart.match(/(\d+)\s*-\s*(\d+)/);
  if (!match) {
    const single = Number.parseInt(rangePart, 10);
    const page = Number.isFinite(single) ? single : 1;
    return { start: page, end: page, chip: String(page) };
  }
  const start = Number.parseInt(match[1], 10);
  const end = Number.parseInt(match[2], 10);
  return { start, end, chip: `${start}-${end}` };
}

export function getDocumentPageCount(dataSource: string): number {
  const pdfAsset = getDocumentPdfAsset(dataSource);
  if (pdfAsset) return pdfAsset.pageCount;

  const sections = getSectionsForDocument(dataSource);
  if (sections.length === 0) return DOCUMENT_PAGE_COUNTS[dataSource] ?? 100;
  const maxEnd = sections.reduce((max, section) => {
    const { end } = parsePageRange(section.referenceKey);
    return Math.max(max, end);
  }, 1);
  return Math.max(DOCUMENT_PAGE_COUNTS[dataSource] ?? 0, maxEnd);
}

export function getPageRangeChips(dataSource: string): string[] {
  const chips = getSectionsForDocument(dataSource).map((s) => parsePageRange(s.referenceKey).chip);
  return [...new Set(chips)];
}

export function findSectionByReferenceKey(
  dataSource: string,
  referenceKey: string,
): DocumentSection | undefined {
  return getSectionsForDocument(dataSource).find((s) => s.referenceKey === referenceKey);
}

export function getPreviewForSource(source: RoadmapSource, page: number): TracePreview {
  if (source.sourceType !== "DATA_SOURCE") {
    return {
      title: getSourceLabel(source),
      body: "Preview not available for this source type.",
      isTemplateInstruction: false,
    };
  }

  const sections = getSectionsForDocument(source.dataSource);
  const matched =
    sections.find((s) => {
      const { start, end } = parsePageRange(s.referenceKey);
      return page >= start && page <= end;
    }) ?? findSectionByReferenceKey(source.dataSource, source.referenceKey);

  const title = matched?.title ?? getReferenceSectionName(source.referenceKey);
  const body = matched?.preview ?? defaultPreview(source.dataSource, source.referenceKey);
  const isTemplateInstruction =
    matched?.isTemplateInstruction ?? isTemplateDataSource(source.dataSource);

  return { title, body, isTemplateInstruction };
}

export function getInitialPageForSource(source: RoadmapSource): number {
  if (source.sourceType !== "DATA_SOURCE") return 1;
  return parsePageRange(source.referenceKey).start;
}
