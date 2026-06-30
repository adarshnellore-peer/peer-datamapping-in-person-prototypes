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
};

export const DEFAULT_REFERENCE_KEYS = [
  "Protocol Title Page: 1-1",
  "Table of Contents: 10-15",
] as const;

export const OUTPUT_TYPES = [
  "OUTPUT_TYPE_SUMMARY",
  "OUTPUT_TYPE_TABLE",
  "OUTPUT_TYPE_TEXT",
] as const;

export const DEFAULT_PROMPT =
  "Generate the CSR Title-Page table. Use the exact two-column structure provided below; the left column labels must remain verbatim. Populate the right-hand cells with values extracted from the Protocol Title Page / Synopsis and the Sponsor corporate roster. If a value is missing, insert the text 'TBD.'";

export const SOURCE_ROLES = ["primary", "supporting", "context"] as const;

export type SourceRole = (typeof SOURCE_ROLES)[number];

export const SOURCE_ROLE_LABELS: Record<SourceRole, string> = {
  primary: "Primary",
  supporting: "Supporting",
  context: "Context",
};

type RoadmapSourceBase = {
  id: string;
  status?: "proposed" | "confirmed";
  /** How the source is used in this section: primary / supporting / context. */
  role?: SourceRole;
};

export type DataSourceRoadmapSource = RoadmapSourceBase & {
  sourceType: "DATA_SOURCE";
  dataSource: string;
  referenceKey: string;
  /** Human-readable section name shown on the card, e.g. "Template Section 9.2". */
  sectionName?: string;
  /** Short document-type tag, e.g. "Template", "Protocol", "SAP". */
  documentCategory?: string;
};

export type SubcontentRoadmapSource = RoadmapSourceBase & {
  sourceType: "SUBCONTENT";
  content: string;
};

export type ContentRoadmapSource = RoadmapSourceBase & {
  sourceType: "CONTENT";
  content: string;
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

export const INITIAL_SOURCES: RoadmapSource[] = [
  {
    id: "1",
    sourceType: "DATA_SOURCE",
    dataSource: "C4591001 Protocol Amendment 9",
    referenceKey: "Protocol Title Page: 1-1",
  },
  {
    id: "2",
    sourceType: "DATA_SOURCE",
    dataSource: "C4591001 Protocol Amendment 9",
    referenceKey:
      "Protocol Amendment Summary of Changes / Document History: 2-9",
  },
  {
    id: "3",
    sourceType: "DATA_SOURCE",
    dataSource: "C4591001 Protocol Amendment 9",
    referenceKey: "Table of Contents: 10-15",
  },
  {
    id: "4",
    sourceType: "SUBCONTENT",
    content: "",
  },
];

export function getDocumentCategory(dataSource: string): string {
  return DATA_SOURCE_CATEGORIES[dataSource] ?? "Document";
}

export function getReferenceSectionName(referenceKey: string): string {
  const colon = referenceKey.indexOf(":");
  if (colon === -1) return referenceKey;
  return referenceKey.slice(0, colon).trim();
}

export function inferSectionName(_dataSource: string, referenceKey: string): string {
  return getReferenceSectionName(referenceKey);
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
  options?: { status?: "proposed" | "confirmed"; dataSource?: string },
): RoadmapSource {
  const id = crypto.randomUUID();
  const status = options?.status ?? "proposed";
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
      return { id, status, sourceType: "SUBCONTENT", content: "" };
    case "CONTENT":
      return { id, status, sourceType: "CONTENT", content: "" };
    case "REFERENCE_SOURCE":
      return { id, status, sourceType: "REFERENCE_SOURCE", referenceSource: "" };
  }
}

export function withSourceType(
  source: RoadmapSource,
  sourceType: SourceType,
): RoadmapSource {
  if (source.sourceType === sourceType) return source;
  return { ...createSourceForType(sourceType), id: source.id };
}
