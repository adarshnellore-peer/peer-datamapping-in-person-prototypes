import { SOURCE_ROLE_LABELS, type RoadmapSource, type SourceRole } from "../../data/roadmap";
import { getSourceTypeTag } from "../../data/sourceHelpers";
import type { DocumentBlock } from "../../types";

export type SourceRef = { blockId: string; sourceId: string };

export type VariantProps = {
  blocks: DocumentBlock[];
  tracedSource: SourceRef | null;
  onTraceSource?: (blockId: string, sourceId: string) => void;
  onUpdateSource: (blockId: string, source: RoadmapSource) => void;
  onRemoveSource: (blockId: string, sourceId: string) => void;
  onAddSource: (blockId: string) => void;
};

/** Stable display order for document categories in the V3 library column. */
export const CATEGORY_ORDER = [
  "Template",
  "Protocol",
  "SAP",
  "CSR",
  "IB",
  "TLF",
  "Data",
  "Report",
  "Reference",
] as const;

/** Color dot per document category — a quick scan cue for a section's sources. */
export const CATEGORY_DOT: Record<string, string> = {
  Template: "bg-[#8b8b8b]",
  Protocol: "bg-[#4f7cff]",
  SAP: "bg-[#8b5cf6]",
  CSR: "bg-[#0ea5a4]",
  IB: "bg-[#f59e0b]",
  TLF: "bg-[#ec4899]",
  Data: "bg-[#10b981]",
  Report: "bg-[#6366f1]",
  Reference: "bg-[#94a3b8]",
  Content: "bg-[#64748b]",
  Subcontent: "bg-[#cbd5e1]",
};

/** Unique document categories present on a block's sources, in first-seen order. */
export function sourceCategories(sources: RoadmapSource[]): string[] {
  const seen: string[] = [];
  for (const source of sources) {
    const category = getSourceTypeTag(source);
    if (!seen.includes(category)) seen.push(category);
  }
  return seen;
}

/** Badge styling per usage role. */
export const ROLE_BADGE: Record<SourceRole, string> = {
  primary: "border-[#fe9591] bg-[#fedbda] text-[#b3261e]",
  supporting: "border-[#bcd0ff] bg-[#eef3ff] text-[#2b5bd7]",
  context: "border-[#dcdcdc] bg-[#f3f3f3] text-[#636161]",
  reference: "border-[#d8b4fe] bg-[#f3e8ff] text-[#5b21b6]",
};

export function roleLabel(role: SourceRole): string {
  return SOURCE_ROLE_LABELS[role];
}

/** Short hint describing how a usage role is drafted from — shown in V4 column heads. */
export const ROLE_HINT: Record<SourceRole, string> = {
  primary: "Drafted from directly \u2014 load-bearing.",
  supporting: "Reinforces or contextualizes the section.",
  context: "Background / cross-check only; not drafted from.",
  reference: "Bibliographic citation; not drafted from directly.",
};

/** Accent classes per usage role, used by the matrix columns and spine nodes. */
export const ROLE_ACCENT: Record<
  SourceRole,
  { text: string; cellTint: string; dotHex: string }
> = {
  primary: { text: "text-[#b3261e]", cellTint: "bg-[#fff6f5]", dotHex: "#fe9591" },
  supporting: { text: "text-[#2b5bd7]", cellTint: "bg-[#f6f9ff]", dotHex: "#7ea2f0" },
  context: { text: "text-[#636161]", cellTint: "bg-[#f8f8f8]", dotHex: "#bdbdbd" },
  reference: { text: "text-[#5b21b6]", cellTint: "bg-[#faf5ff]", dotHex: "#c084fc" },
};

/** V2 pill badge for mapped source origin type. */
export const SOURCE_KIND_BADGE: Record<
  "DATA_SOURCE" | "SUBCONTENT" | "CONTENT",
  { label: string; className: string }
> = {
  DATA_SOURCE: {
    label: "Document",
    className: "border-[#bcd0ff] bg-[#eef3ff] text-[#2b5bd7]",
  },
  SUBCONTENT: {
    label: "Subcontent",
    className: "border-[#cbd5e1] bg-[#f1f5f9] text-[#475569]",
  },
  CONTENT: {
    label: "Content",
    className: "border-[#a7f3d0] bg-[#ecfdf5] text-[#047857]",
  },
};

/** Derived mapping state for a section, from its sources' status + usage roles. */
export type MappingState = "ready" | "review" | "needsPrimary" | "empty";

export function effectiveSourceRole(source: RoadmapSource): SourceRole | undefined {
  if (source.role) return source.role;
  if (source.isReference || source.sourceType === "REFERENCE_SOURCE") return "reference";
  return undefined;
}

export function mappingStatus(sources: RoadmapSource[]): MappingState {
  if (sources.length === 0) return "empty";
  if (sources.some((s) => s.status === "proposed")) return "review";
  if (!sources.some((s) => effectiveSourceRole(s) === "primary")) return "needsPrimary";
  return "ready";
}

export const MAPPING_BADGE: Record<
  MappingState,
  { label: string; badge: string; dot: string }
> = {
  ready: { label: "Ready", badge: "bg-[#e6f6ec] text-[#1a8a4a]", dot: "bg-[#1a8a4a]" },
  review: { label: "In review", badge: "bg-[#eef3ff] text-[#2b5bd7]", dot: "bg-[#2b5bd7]" },
  needsPrimary: {
    label: "Needs primary",
    badge: "bg-[#fff3cd] text-[#9a6700]",
    dot: "bg-[#e0a800]",
  },
  empty: { label: "No sources", badge: "bg-[#fff3cd] text-[#9a6700]", dot: "bg-[#d0a000]" },
};

/**
 * Compact text summary of a section's sources for collapsed rows, e.g.
 * "3 sources · Protocol, CSR, SAP". Appends "· N proposed" when any are
 * unconfirmed.
 */
export function categorySummary(sources: RoadmapSource[]): string {
  if (sources.length === 0) return "No sources";
  const count = `${sources.length} source${sources.length === 1 ? "" : "s"}`;
  const cats = sourceCategories(sources).join(", ");
  const proposed = sources.filter((s) => s.status === "proposed").length;
  const parts = [count, cats].filter(Boolean);
  let summary = parts.join(" \u00b7 ");
  if (proposed > 0) summary += ` \u00b7 ${proposed} proposed`;
  return summary;
}
