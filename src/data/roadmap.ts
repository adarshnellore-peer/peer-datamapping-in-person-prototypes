export const SOURCE_TYPES = [
  "DATA_SOURCE",
  "SUBCONTENT",
  "CONTENT",
  "REFERENCE_SOURCE",
] as const;

export type SourceType = (typeof SOURCE_TYPES)[number];

export const DATA_SOURCES = [
  "Biogen Clinical Study Report Template",
  "Clinical Study Report",
  "Investigator's Brochure Edition 7",
  "Investigator's Brochure Edition 8",
  "TLF Package — Efficacy (Tables)",
  "TLF Package — Efficacy (Figures)",
  "TLF Package — Efficacy (Listings)",
  "TLF Package — Safety (Tables)",
  "TLF Package — Safety (Figures)",
  "TLF Package — Safety (Listings)",
  "TLF Package — Disposition & Demographics",
  "TLF Package — Pharmacokinetics",
  "Safety Tables — Treatment-Emergent AEs",
  "Safety Tables — Serious AEs",
  "Safety Tables — Laboratory Abnormalities",
  "ADaM Define.xml",
  "SDTM Annotated CRF",
  "Data Management Plan",
  "Clinical Data Review Listing",
  "Pharmacokinetic Analysis Report",
  "Bioanalytical Report",
  "DSUR 2024",
  "Risk Management Plan",
  "ICH E3 Reporting Guidance",
  "FDA Guidance — Clinical Study Reports",
  "EMA Guideline on Clinical Study Reports",
  "CSR Style Guide",
] as const;

export const DATA_SOURCE_CATEGORIES: Record<string, string> = {
  "Biogen Clinical Study Report Template": "Template",
  "Clinical Study Report": "CSR",
  "Investigator's Brochure Edition 7": "IB",
  "Investigator's Brochure Edition 8": "IB",
  "TLF Package — Efficacy (Tables)": "TLF",
  "TLF Package — Efficacy (Figures)": "TLF",
  "TLF Package — Efficacy (Listings)": "TLF",
  "TLF Package — Safety (Tables)": "TLF",
  "TLF Package — Safety (Figures)": "TLF",
  "TLF Package — Safety (Listings)": "TLF",
  "TLF Package — Disposition & Demographics": "TLF",
  "TLF Package — Pharmacokinetics": "TLF",
  "Safety Tables — Treatment-Emergent AEs": "TLF",
  "Safety Tables — Serious AEs": "TLF",
  "Safety Tables — Laboratory Abnormalities": "TLF",
  "ADaM Define.xml": "Data",
  "SDTM Annotated CRF": "Data",
  "Data Management Plan": "Data",
  "Clinical Data Review Listing": "Data",
  "Pharmacokinetic Analysis Report": "Report",
  "Bioanalytical Report": "Report",
  "DSUR 2024": "Report",
  "Risk Management Plan": "Report",
  "ICH E3 Reporting Guidance": "Reference",
  "FDA Guidance — Clinical Study Reports": "Reference",
  "EMA Guideline on Clinical Study Reports": "Reference",
  "CSR Style Guide": "Reference",
};

export const SUBCONTENT_OPTIONS = [
  "1 TITLE PAGE",
  "2 SYNOPSIS",
  "3 TABLE OF CONTENTS",
  "4 LIST OF ABBREVIATIONS",
  "5 ETHICS",
  "6 INVESTIGATORS AND STUDY ADMINISTRATIVE STRUCTURE",
] as const;

export const CONTENT_OPTIONS = [
  "Title Page Table",
  "Study Title",
  "Name of Study Treatment",
  "Indication",
  "Development Phase",
  "Sponsor",
] as const;

export const REFERENCE_SOURCE_OPTIONS = [
  "ICH E3 Clinical Study Report",
  "FDA Guidance — Clinical Study Reports",
  "EMA Guideline on Clinical Study Reports",
] as const;

export const REFERENCE_KEYS: Record<string, readonly string[]> = {
  "Biogen Clinical Study Report Template": [
    "Template Section 9.2: 142-148",
    "Template Section 10.8: 168-174",
    "Template Section 11.9.2: 198-204",
    "Synopsis: 2-8",
    "Table of Contents: 9-12",
  ],
  "Clinical Study Report": [
    "Synopsis: 3-13",
    "CSR Intro Sections: 29-83",
    "Study Design and Objectives: 84-112",
    "Efficacy Results — Primary Endpoint: 198-224",
    "Safety Summary — Adverse Events: 312-348",
    "Table of Contents: 9-12",
  ],
  "Investigator's Brochure Edition 8": [
    "Nonclinical Summary: 22-61",
    "Pharmaceutical Information: 88-104",
    "Table of Contents: 5-8",
  ],
  "Investigator's Brochure Edition 7": [
    "Nonclinical Summary: 20-55",
    "Table of Contents: 5-8",
  ],
  "Data Management Plan": [
    "Deviation Handling: 18-24",
    "Data Review Plan: 30-42",
  ],
  "Clinical Data Review Listing": [
    "Subject Disposition Listing: 12-40",
    "Subject Disposition Listing: 41-58",
  ],
  "TLF Package — Disposition & Demographics": ["Table 14.1.1 Disposition: 1-4"],
  "TLF Package — Efficacy (Tables)": [
    "Endpoint Definitions: 2-9",
    "Table 14.2.1 Primary Endpoint: 5-12",
  ],
  "TLF Package — Efficacy (Figures)": ["Figure 14.2.4 Secondary Endpoints: 1-8"],
  "TLF Package — Efficacy (Listings)": ["Listing 16.2.6 Subgroups: 30-72"],
  "TLF Package — Safety (Tables)": ["Table 14.3.1 Exposure: 1-5"],
  "TLF Package — Safety (Figures)": [
    "Figure 14.3.1 Lab Trends: 1-8",
    "Figure 14.3.7 Vital Signs: 9-15",
  ],
  "TLF Package — Safety (Listings)": [
    "Listing 16.2.7.2 SAE Listing: 1-40",
    "Listing 16.2.8 Lab Abnormalities: 80-140",
  ],
  "TLF Package — Pharmacokinetics": ["Table 14.3.1 PK Parameters: 1-6"],
};

export const DEFAULT_REFERENCE_KEYS = [
  "Synopsis: 3-13",
  "Table of Contents: 9-12",
] as const;

/** Human-readable labels for reference keys that use generic section numbers. */
export const REFERENCE_DISPLAY_NAMES: Record<string, Record<string, string>> = {
  "Clinical Study Report": {
    "CSR Intro Sections: 29-83": "Introduction & Study Objectives",
    "Study Design and Objectives: 84-112": "Study Design",
  },
  "Biogen Clinical Study Report Template": {
    "Template Section 9.2: 142-148": "Efficacy Results",
    "Template Section 10.8: 168-174": "Safety Evaluation",
    "Template Section 11.9.2: 198-204": "Discussion & Conclusions",
  },
};

export const OUTPUT_TYPES = [
  "OUTPUT_TYPE_SUMMARY",
  "OUTPUT_TYPE_TABLE",
  "OUTPUT_TYPE_FIGURE",
] as const;

export const OUTPUT_TYPE_LABELS: Record<(typeof OUTPUT_TYPES)[number], string> = {
  OUTPUT_TYPE_SUMMARY: "Paragraph",
  OUTPUT_TYPE_TABLE: "Table",
  OUTPUT_TYPE_FIGURE: "Figure",
};

export const DEFAULT_PROMPT =
  "Generate the CSR Title-Page table. Use the exact two-column structure provided below; the left column labels must remain verbatim. Populate the right-hand cells with values extracted from the synopsis and the sponsor corporate roster. If a value is missing, insert the text 'TBD.'";

export const SOURCE_ROLES = ["primary", "supporting", "context", "reference"] as const;

export type SourceRole = (typeof SOURCE_ROLES)[number];

export const SOURCE_ROLE_LABELS: Record<SourceRole, string> = {
  primary: "Primary",
  supporting: "Supporting",
  context: "Context",
  reference: "Reference",
};

/** V1 / V6 storyline: source vs reference tagging on mapped evidence. */
export const SOURCE_FORMAT_ROLES = ["source", "reference"] as const;

export type SourceFormatRole = (typeof SOURCE_FORMAT_ROLES)[number];

export const SOURCE_FORMAT_ROLE_LABELS: Record<SourceFormatRole, string> = {
  source: "Source",
  reference: "Reference",
};

export function isSourceFormatRole(role: string): role is SourceFormatRole {
  return (SOURCE_FORMAT_ROLES as readonly string[]).includes(role);
}

/** Legacy V6 format values stored before source/reference rename. */
export function normalizeSourceFormatRole(role: string): SourceFormatRole | undefined {
  if (isSourceFormatRole(role)) return role;
  if (role === "paragraph" || role === "table") return "source";
  if (role === "figure") return "reference";
  return undefined;
}

type RoadmapSourceBase = {
  id: string;
  status?: "proposed" | "confirmed";
  /** Usage role (matrix) or format role (V1/V6 storyline). */
  role?: SourceRole | SourceFormatRole;
  /** Bibliographic / citation reference — orthogonal to usage role. */
  isReference?: boolean;
};

export type DataSourceRoadmapSource = RoadmapSourceBase & {
  sourceType: "DATA_SOURCE";
  dataSource: string;
  /** Primary section / page range — first of `referenceKeys` when multiple. */
  referenceKey: string;
  /** Additional sections from the same document on one mapped entry. */
  referenceKeys?: string[];
  /** Study library row this mapping came from (figures/listings). */
  studySourceId?: string;
  /** Human-readable section name shown on the card, e.g. "Template Section 9.2". */
  sectionName?: string;
  /** Short document-type tag, e.g. "Template", "CSR", "TLF". */
  documentCategory?: string;
};

export type SubcontentRoadmapSource = RoadmapSourceBase & {
  sourceType: "SUBCONTENT";
  content: string;
  /** V3 matrix: points at another subcontent row used as evidence. */
  referencedBlockId?: string;
  /** Snapshot of outline text under the linked row when mapped. */
  outlineContext?: string;
  /** Short LLM-generated label for chips and pickers. */
  aiDescriptor?: string;
  /** Data sources already mapped on the linked outline row(s). */
  bundledSources?: RoadmapSource[];
};

export type ContentRoadmapSource = RoadmapSourceBase & {
  sourceType: "CONTENT";
  content: string;
  /** V3 matrix: points at a content heading used as evidence. */
  referencedHeadingId?: string;
  outlineContext?: string;
  aiDescriptor?: string;
  bundledSources?: RoadmapSource[];
};

export type ReferenceSourceRoadmapSource = RoadmapSourceBase & {
  sourceType: "REFERENCE_SOURCE";
  referenceSource: string;
};

export type RoadmapSource =
  | DataSourceRoadmapSource
  | SubcontentRoadmapSource
  | ContentRoadmapSource
  | ReferenceSourceRoadmapSource;

import { normalizeDataSourceReferenceKeys } from "../utils/dataSourceReferences";

export const INITIAL_SOURCES: RoadmapSource[] = [
  normalizeDataSourceReferenceKeys({
    id: "1",
    sourceType: "DATA_SOURCE",
    dataSource: "Biogen Clinical Study Report Template",
    referenceKey: "Synopsis: 2-8",
    referenceKeys: [
      "Synopsis: 2-8",
      "Template Section 9.2: 142-148",
      "Table of Contents: 9-12",
    ],
  }),
  {
    id: "4",
    sourceType: "SUBCONTENT",
    content: "",
  },
];

export const DATA_SOURCE_CATEGORY_ORDER = [
  "Template",
  "CSR",
  "IB",
  "TLF",
  "Data",
  "Report",
  "Reference",
  "Document",
] as const;

export function getDocumentCategory(dataSource: string): string {
  return DATA_SOURCE_CATEGORIES[dataSource] ?? "Document";
}

export function getReferenceSectionName(referenceKey: string): string {
  const colon = referenceKey.indexOf(":");
  if (colon === -1) return referenceKey;
  return referenceKey.slice(0, colon).trim();
}

export function inferSectionName(dataSource: string, referenceKey: string): string {
  return REFERENCE_DISPLAY_NAMES[dataSource]?.[referenceKey] ?? getReferenceSectionName(referenceKey);
}

export function enrichDataSourceSource(
  source: DataSourceRoadmapSource,
): DataSourceRoadmapSource {
  return {
    ...source,
    documentCategory: source.documentCategory ?? getDocumentCategory(source.dataSource),
    sectionName:
      source.sectionName ?? inferSectionName(source.dataSource, source.referenceKey),
  };
}

export function getReferenceKeysForDataSource(dataSource: string): string[] {
  return [...(REFERENCE_KEYS[dataSource] ?? DEFAULT_REFERENCE_KEYS)];
}

export function createSourceForType(
  sourceType: SourceType = "DATA_SOURCE",
  options?: {
    status?: "proposed" | "confirmed";
    dataSource?: string;
    content?: string;
    referenceSource?: string;
  },
): RoadmapSource {
  const id = crypto.randomUUID();
  const status = options?.status ?? "confirmed";
  const dataSource = options?.dataSource ?? DATA_SOURCES[0];

  switch (sourceType) {
    case "DATA_SOURCE": {
      const referenceKey = getReferenceKeysForDataSource(dataSource)[0];
      return enrichDataSourceSource({
        id,
        status,
        sourceType: "DATA_SOURCE",
        dataSource,
        referenceKey,
      });
    }
    case "SUBCONTENT":
      return {
        id,
        status,
        sourceType: "SUBCONTENT",
        content: options?.content ?? "",
      };
    case "CONTENT":
      return {
        id,
        status,
        sourceType: "CONTENT",
        content: options?.content ?? "",
      };
    case "REFERENCE_SOURCE":
      return {
        id,
        status,
        sourceType: "REFERENCE_SOURCE",
        referenceSource: options?.referenceSource ?? "",
      };
  }
}

export function withSourceType(
  source: RoadmapSource,
  sourceType: SourceType,
): RoadmapSource {
  if (source.sourceType === sourceType) return source;
  return { ...createSourceForType(sourceType), id: source.id };
}
