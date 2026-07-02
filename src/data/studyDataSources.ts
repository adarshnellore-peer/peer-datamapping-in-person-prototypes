import { DATA_SOURCES, enrichDataSourceSource, getDocumentCategory, getReferenceKeysForDataSource, inferSectionName, type SourceFormatRole } from "./roadmap";
import type { DataSourceRoadmapSource, RoadmapSource } from "./roadmap";

export type StudySourceStatus = "processed" | "uploaded";
export type StudySourceKind = "document" | "figure" | "listing";

export type StudyDataSource = {
  id: string;
  name: string;
  uploadedFile: string;
  status: StudySourceStatus;
  kind: StudySourceKind;
  dataSource: string;
  referenceKey: string;
};

const DOCUMENT_FILE_NAMES: Record<string, string> = {
  "Biogen Clinical Study Report Template": "biogen_csr_template.pdf",
  "Clinical Study Report": "clinical-study-report.pdf",
};

const FIGURE_NAMES = [
  "Figure Output 1 - Cumulative Incidence Curves of Time to First COVID-19 Occurrence",
  "Figure Output 2 - Kaplan-Meier Plot of Primary Efficacy Endpoint",
  "Figure Output 3 - Forest Plot of Subgroup Analyses",
  "Figure Output 4 - Mean Change from Baseline in Key Lab Parameters",
  "Figure Output 5 - Swimmer Plot of Treatment Duration",
];

const LISTING_NAMES = [
  "Listing 16.2.8.1 - Listing of Subjects with Serious Adverse Events",
  "Listing 16.2.8.2 - Listing of Subjects who Discontinued Study Treatment",
  "Listing 16.2.9.1 - Listing of Deaths",
  "Listing 16.2.10.1 - Listing of Deviations",
  "Listing 16.2.11.1 - Listing of Concomitant Medications",
];

const FIGURE_PLACEMENTS: ReadonlyArray<{ dataSource: string; referenceKey: string }> = [
  {
    dataSource: "TLF Package — Disposition & Demographics",
    referenceKey: "Table 14.1.1 Disposition: 1-4",
  },
  {
    dataSource: "Clinical Study Report",
    referenceKey: "Efficacy Results — Primary Endpoint: 198-224",
  },
  {
    dataSource: "TLF Package — Efficacy (Figures)",
    referenceKey: "Figure 14.2.4 Secondary Endpoints: 1-8",
  },
  {
    dataSource: "TLF Package — Safety (Figures)",
    referenceKey: "Figure 14.3.1 Lab Trends: 1-8",
  },
  {
    dataSource: "TLF Package — Safety (Figures)",
    referenceKey: "Figure 14.3.7 Vital Signs: 9-15",
  },
];

const LISTING_PLACEMENTS: ReadonlyArray<{ dataSource: string; referenceKey: string }> = [
  {
    dataSource: "TLF Package — Safety (Listings)",
    referenceKey: "Listing 16.2.7.2 SAE Listing: 1-40",
  },
  {
    dataSource: "TLF Package — Safety (Listings)",
    referenceKey: "Listing 16.2.8 Lab Abnormalities: 80-140",
  },
  {
    dataSource: "TLF Package — Efficacy (Listings)",
    referenceKey: "Listing 16.2.6 Subgroups: 30-72",
  },
  {
    dataSource: "TLF Package — Safety (Listings)",
    referenceKey: "Listing 16.2.7.2 SAE Listing: 1-40",
  },
  {
    dataSource: "TLF Package — Efficacy (Listings)",
    referenceKey: "Listing 16.2.6 Subgroups: 30-72",
  },
];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function buildStudySources(): StudyDataSource[] {
  const items: StudyDataSource[] = [];
  let index = 0;

  for (const dataSource of DATA_SOURCES) {
    const fileName = DOCUMENT_FILE_NAMES[dataSource] ?? `${slugify(dataSource)}.pdf`;
    const referenceKeys = getReferenceKeysForDataSource(dataSource);

    items.push({
      id: `study-doc-${index++}`,
      name: dataSource,
      uploadedFile: fileName,
      status: "processed",
      kind: "document",
      dataSource,
      referenceKey: referenceKeys[0] ?? "Table of Contents: 1-5",
    });

    for (let i = 1; i < referenceKeys.length; i++) {
      const referenceKey = referenceKeys[i];
      const sectionLabel = inferSectionName(dataSource, referenceKey);
      items.push({
        id: `study-doc-${index++}`,
        name: `${dataSource} — ${sectionLabel}`,
        uploadedFile: fileName,
        status: "processed",
        kind: "document",
        dataSource,
        referenceKey,
      });
    }
  }

  for (const [i, name] of FIGURE_NAMES.entries()) {
    const placement = FIGURE_PLACEMENTS[i] ?? FIGURE_PLACEMENTS[0];
    items.push({
      id: `study-fig-${index++}`,
      name,
      uploadedFile: `${slugify(name)}.pdf`,
      status: "processed",
      kind: "figure",
      dataSource: placement.dataSource,
      referenceKey: placement.referenceKey,
    });
  }

  for (const [i, name] of LISTING_NAMES.entries()) {
    const placement = LISTING_PLACEMENTS[i] ?? LISTING_PLACEMENTS[0];
    items.push({
      id: `study-list-${index++}`,
      name,
      uploadedFile: `${slugify(name)}.pdf`,
      status: i % 3 === 0 ? "uploaded" : "processed",
      kind: "listing",
      dataSource: placement.dataSource,
      referenceKey: placement.referenceKey,
    });
  }

  return items;
}

export const STUDY_DATA_SOURCES: StudyDataSource[] = buildStudySources();

/** Tables, listings, figures, and TLF-package documents. */
export function isTlfStudySource(entry: StudyDataSource): boolean {
  if (entry.kind === "figure" || entry.kind === "listing") return true;
  return getDocumentCategory(entry.dataSource) === "TLF";
}

export function isTlfRoadmapSource(source: RoadmapSource): boolean {
  if (source.sourceType !== "DATA_SOURCE") return false;
  if (getDocumentCategory(source.dataSource) === "TLF") return true;
  const study = findStudySourceForRoadmapSource(source);
  return study ? isTlfStudySource(study) : false;
}

export function defaultFormatRoleForStudySource(_entry: StudyDataSource): SourceFormatRole {
  return "source";
}

export function studySourceToRoadmapSource(entry: StudyDataSource): DataSourceRoadmapSource {
  const isFigureOrListing = entry.kind === "figure" || entry.kind === "listing";
  return enrichDataSourceSource({
    id: entry.id,
    sourceType: "DATA_SOURCE",
    dataSource: entry.dataSource,
    referenceKey: entry.referenceKey,
    status: "confirmed",
    ...(isFigureOrListing
      ? { studySourceId: entry.id, sectionName: entry.name }
      : {}),
  });
}

export function findStudySourceById(id: string): StudyDataSource | undefined {
  return STUDY_DATA_SOURCES.find((entry) => entry.id === id);
}

export function findStudySourceForRoadmapSource(source: DataSourceRoadmapSource): StudyDataSource | undefined {
  const keys = [source.referenceKey, ...(source.referenceKeys ?? [])].filter(Boolean);
  const matches = STUDY_DATA_SOURCES.filter(
    (entry) =>
      entry.dataSource === source.dataSource &&
      keys.some((key) => entry.referenceKey === key),
  );
  return (
    matches.find((entry) => entry.kind === "figure" || entry.kind === "listing") ?? matches[0]
  );
}
