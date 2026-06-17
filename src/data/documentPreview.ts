export type DocumentSection = {
  id: string;
  referenceKey: string;
  title: string;
  kind: "section" | "figure" | "listing" | "table";
  preview: string;
};

export const DOCUMENT_SECTIONS: Record<string, DocumentSection[]> = {
  "Clinical Study Report": [
    {
      id: "csr-synopsis",
      referenceKey: "Synopsis: 3-13",
      title: "Synopsis",
      kind: "section",
      preview:
        "This Phase 3 study evaluated mirvetuximab soravtansine in platinum-resistant ovarian cancer…",
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
  "247HV101 Protocol Version 3": [
    {
      id: "prot-title",
      referenceKey: "Protocol Title Page: 1-1",
      title: "Title Page",
      kind: "section",
      preview: "Protocol title, sponsor, and amendment number.",
    },
    {
      id: "prot-s1",
      referenceKey: "Section 1: 17-34",
      title: "Section 1 — Background",
      kind: "section",
      preview: "Background, rationale, and study objectives.",
    },
    {
      id: "prot-s8",
      referenceKey: "Section 8: 84-102",
      title: "Section 8 — Study design",
      kind: "section",
      preview: "Study design, visit schedule, and procedures.",
    },
    {
      id: "prot-s92",
      referenceKey: "Section 9.2: 118-126",
      title: "Section 9.2 — Study duration",
      kind: "section",
      preview: "Study timelines, enrollment period, and follow-up.",
    },
  ],
  "C4591001 Protocol Amendment 9": [
    {
      id: "prot-title",
      referenceKey: "Protocol Title Page: 1-1",
      title: "Title Page",
      kind: "section",
      preview: "Protocol title, sponsor, and amendment number.",
    },
    {
      id: "prot-synopsis",
      referenceKey: "Table of Contents: 10-15",
      title: "Table of Contents",
      kind: "section",
      preview: "Protocol section listing.",
    },
  ],
};

export function getSectionsForDocument(dataSource: string): DocumentSection[] {
  return DOCUMENT_SECTIONS[dataSource] ?? [];
}

export function getDefaultSectionForDocument(dataSource: string): DocumentSection | undefined {
  return getSectionsForDocument(dataSource)[0];
}
