export const SOURCE_TYPES = [
  "DATA_SOURCE",
  "SUBCONTENT",
  "CONTENT",
  "REFERENCE_SOURCE",
] as const;

export type SourceType = (typeof SOURCE_TYPES)[number];

export const DATA_SOURCES = [
  "Biogen Clinical Study Report Template",
  "247HV101 Protocol Version 3",
  "109MS306 (CONNECT) LTE Statistical Analysis Plan",
  "Clinical Study Report",
  "C4591001 Protocol Amendment 9",
  "C4591001 Final Statistical Analysis Plan",
  // Additional study documents — a real CSR commonly references 30-40+ sources.
  "247HV101 Protocol Version 1",
  "247HV101 Protocol Version 2",
  "247HV101 Protocol Amendment 1",
  "247HV101 Protocol Amendment 2",
  "Investigator's Brochure Edition 7",
  "Investigator's Brochure Edition 8",
  "247HV101 SAP Version 2",
  "247HV101 SAP Amendment 1",
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
  "247HV101 Protocol Version 3": "Protocol",
  "109MS306 (CONNECT) LTE Statistical Analysis Plan": "SAP",
  "Clinical Study Report": "CSR",
  "C4591001 Protocol Amendment 9": "Protocol",
  "C4591001 Final Statistical Analysis Plan": "SAP",
  "247HV101 Protocol Version 1": "Protocol",
  "247HV101 Protocol Version 2": "Protocol",
  "247HV101 Protocol Amendment 1": "Protocol",
  "247HV101 Protocol Amendment 2": "Protocol",
  "Investigator's Brochure Edition 7": "IB",
  "Investigator's Brochure Edition 8": "IB",
  "247HV101 SAP Version 2": "SAP",
  "247HV101 SAP Amendment 1": "SAP",
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
  "247HV101 Protocol Version 3": [
    "Protocol Title Page: 1-1",
    "Section 1: 17-34",
    "Section 8: 84-102",
    "Section 9.2: 118-126",
    "Table of Contents: 10-15",
  ],
  "109MS306 (CONNECT) LTE Statistical Analysis Plan": [
    "Demographics and Baseline Characteristics: 42-51",
    "Analysis Populations: 6-14",
    "Introduction: 2-5",
    "Primary Efficacy Endpoints: 52-68",
    "Secondary Efficacy Endpoints: 69-88",
    "Safety Analyses — Treatment-Emergent Adverse Events: 112-128",
  ],
  "Clinical Study Report": [
    "Synopsis: 3-13",
    "CSR Intro Sections: 29-83",
    "Study Design and Objectives: 84-112",
    "Efficacy Results — Primary Endpoint: 198-224",
    "Safety Summary — Adverse Events: 312-348",
    "Table of Contents: 9-12",
  ],
  "C4591001 Protocol Amendment 9": [
    "Protocol Title Page: 1-1",
    "Protocol Amendment Summary of Changes / Document History: 2-9",
    "Table of Contents: 10-15",
    "List of Tables: 15-17",
    "Section 1: 17-34",
    "Section 1.1: 17-25",
    "Section 1.2: 25-26",
    "Section 1.3: 26-34",
  ],
  "C4591001 Final Statistical Analysis Plan": [
    "Cover Page: 1-1",
    "Introduction: 2-5",
    "Analysis Populations: 6-14",
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
  "Protocol Title Page: 1-1",
  "Table of Contents: 10-15",
] as const;

/** Human-readable labels for reference keys that use generic section numbers. */
export const REFERENCE_DISPLAY_NAMES: Record<string, Record<string, string>> = {
  "247HV101 Protocol Version 3": {
    "Section 1: 17-34": "Introduction & Study Objectives",
    "Section 8: 84-102": "Study Design",
    "Section 9.2: 118-126": "Inclusion & Exclusion Criteria",
  },
  "C4591001 Protocol Amendment 9": {
    "Section 1: 17-34": "Introduction",
    "Section 1.1: 17-25": "Background & Rationale",
    "Section 1.2: 25-26": "Study Objectives",
    "Section 1.3: 26-34": "Study Endpoints",
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
  "Generate the CSR Title-Page table. Use the exact two-column structure provided below; the left column labels must remain verbatim. Populate the right-hand cells with values extracted from the Protocol Title Page / Synopsis and the Sponsor corporate roster. If a value is missing, insert the text 'TBD.'";

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
  /** Human-readable section name shown on the card, e.g. "Template Section 9.2". */
  sectionName?: string;
  /** Short document-type tag, e.g. "Template", "Protocol", "SAP". */
  documentCategory?: string;
};

export type SubcontentRoadmapSource = RoadmapSourceBase & {
  sourceType: "SUBCONTENT";
  content: string;
  /** V3 matrix: points at another subcontent row used as evidence. */
  referencedBlockId?: string;
};

export type ContentRoadmapSource = RoadmapSourceBase & {
  sourceType: "CONTENT";
  content: string;
  /** V3 matrix: points at a content heading used as evidence. */
  referencedHeadingId?: string;
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
    dataSource: "C4591001 Protocol Amendment 9",
    referenceKey: "Protocol Title Page: 1-1",
    referenceKeys: [
      "Protocol Title Page: 1-1",
      "Protocol Amendment Summary of Changes / Document History: 2-9",
      "Table of Contents: 10-15",
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
  "Protocol",
  "SAP",
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
