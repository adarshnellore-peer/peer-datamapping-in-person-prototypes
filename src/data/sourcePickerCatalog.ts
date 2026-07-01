import { parsePageRange } from "./documentPreview";
import { getDocumentCategory } from "./roadmap";
import { STUDY_DATA_SOURCES, type StudyDataSource } from "./studyDataSources";

export type SourcePickerArtifact = {
  studySourceId: string;
  ref: string;
  label: string;
};

export type SourcePickerCategory = {
  id: string;
  label: string;
  color: string;
  artifacts: SourcePickerArtifact[];
};

const CATEGORY_ORDER = ["tfl", "csrTmpl", "csr", "ib", "data", "report", "reference", "doc"] as const;

const CATEGORY_META: Record<
  string,
  { id: (typeof CATEGORY_ORDER)[number]; label: string; color: string }
> = {
  Figures: { id: "tfl", label: "TFL", color: "#ec4899" },
  Listings: { id: "tfl", label: "TFL", color: "#ec4899" },
  Template: { id: "csrTmpl", label: "CSR Template", color: "#8b8b8b" },
  CSR: { id: "csr", label: "CSR", color: "#0a9e9a" },
  IB: { id: "ib", label: "IB", color: "#6366f1" },
  TLF: { id: "tfl", label: "TFL", color: "#ec4899" },
  Data: { id: "data", label: "Data", color: "#7c3aed" },
  Report: { id: "report", label: "Report", color: "#d97706" },
  Reference: { id: "reference", label: "Reference", color: "#64748b" },
  Document: { id: "doc", label: "Document", color: "#bdbdbd" },
};

function categoryIdFor(entry: StudyDataSource): (typeof CATEGORY_ORDER)[number] {
  if (entry.kind === "figure" || entry.kind === "listing") return "tfl";
  const cat = getDocumentCategory(entry.dataSource);
  return CATEGORY_META[cat]?.id ?? "doc";
}

function isSelectable(entry: StudyDataSource): boolean {
  if (entry.kind === "figure" || entry.kind === "listing") return true;
  return !entry.referenceKey.toLowerCase().startsWith("table of contents");
}

function artifactRef(entry: StudyDataSource): string {
  if (entry.kind === "figure" || entry.kind === "listing") {
    const prefix = entry.name.split(" - ")[0]?.trim();
    return prefix || entry.name;
  }
  return entry.referenceKey.split(":")[0]?.trim() ?? entry.referenceKey;
}

function artifactLabel(entry: StudyDataSource): string {
  if (entry.kind === "figure" || entry.kind === "listing") {
    const sep = entry.name.indexOf(" - ");
    return sep !== -1 ? entry.name.slice(sep + 3) : entry.name;
  }
  const sep = entry.name.indexOf(" — ");
  if (sep !== -1) return entry.name.slice(sep + 3);
  const fromRef = entry.referenceKey.split(":")[0]?.trim();
  if (fromRef) return fromRef;
  return entry.name;
}

function pageRefFor(entry: StudyDataSource): string | null {
  if (entry.kind === "figure" || entry.kind === "listing") return null;
  const { start, end } = parsePageRange(entry.referenceKey);
  if (start === end) return `p. ${start}`;
  return `pp. ${start}–${end}`;
}

export function buildSourcePickerCategories(): SourcePickerCategory[] {
  const buckets = new Map<string, SourcePickerArtifact[]>();
  const labels = new Map<string, string>();
  const colors = new Map<string, string>();

  for (const entry of STUDY_DATA_SOURCES) {
    if (!isSelectable(entry)) continue;

    const catId = categoryIdFor(entry);
    const meta =
      entry.kind === "figure" || entry.kind === "listing"
        ? CATEGORY_META.Figures
        : CATEGORY_META[getDocumentCategory(entry.dataSource)] ?? CATEGORY_META.Document;

    labels.set(catId, meta.label);
    colors.set(catId, meta.color);

    const pageRef = pageRefFor(entry);
    const items = buckets.get(catId) ?? [];
    items.push({
      studySourceId: entry.id,
      ref: artifactRef(entry),
      label: pageRef ? `${artifactLabel(entry)} · ${pageRef}` : artifactLabel(entry),
    });
    buckets.set(catId, items);
  }

  const ordered: SourcePickerCategory[] = [];
  for (const id of CATEGORY_ORDER) {
    const artifacts = buckets.get(id);
    if (!artifacts?.length) continue;
    ordered.push({
      id,
      label: labels.get(id) ?? id,
      color: colors.get(id) ?? "#bdbdbd",
      artifacts,
    });
  }

  for (const [id, artifacts] of buckets) {
    if (CATEGORY_ORDER.includes(id as (typeof CATEGORY_ORDER)[number])) continue;
    ordered.push({
      id,
      label: labels.get(id) ?? id,
      color: colors.get(id) ?? "#bdbdbd",
      artifacts,
    });
  }

  return ordered;
}
