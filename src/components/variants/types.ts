import {
  BookMarked,
  FileText,
  Image,
  List,
  Table2,
  type LucideIcon,
} from "lucide-react";
import {
  normalizeSourceFormatRole,
  SOURCE_FORMAT_ROLE_LABELS,
  SOURCE_FORMAT_ROLES,
  SOURCE_ROLE_LABELS,
  SOURCE_ROLES,
  type RoadmapSource,
  type SourceFormatRole,
  type SourceRole,
} from "../../data/roadmap";
import { getArtifactTypeLabel, getSourceDocumentCategory, getSourceLabel, getSourceTypeTag } from "../../data/sourceHelpers";
import type { DocumentBlock } from "../../types";

export type SourceRef = { blockId: string; sourceId: string };

export type VariantProps = {
  blocks: DocumentBlock[];
  tracedSource: SourceRef | null;
  onTraceSource?: (blockId: string, sourceId: string) => void;
  onUpdateSource: (blockId: string, source: RoadmapSource) => void;
  onRemoveSource: (blockId: string, sourceId: string) => void;
  onAddSource?: (blockId: string) => void;
};

/** Stable display order for document categories in the V3 library column. */
export const CATEGORY_ORDER = [
  "Template",
  "CSR",
  "IB",
  "TLF",
  "Data",
  "Report",
  "Reference",
] as const;

/** Color dot per document category — a quick scan cue for a section's sources. */
export const CATEGORY_DOT: Record<string, string> = {
  Template: "bg-[#6b7280]",
  CSR: "bg-[#0d9488]",
  IB: "bg-[#d97706]",
  TLF: "bg-[#db2777]",
  Data: "bg-[#059669]",
  Report: "bg-[#4f46e5]",
  Reference: "bg-[#64748b]",
  Content: "bg-[#475569]",
  Subcontent: "bg-[#94a3b8]",
  Document: "bg-[#9ca3af]",
};

/** Richer chip styling per document category for source rows. */
export const CATEGORY_CHIP: Record<string, { badge: string; field: string; accent: string }> = {
  Template: {
    badge: "border-[#9ca3af] bg-[#f3f4f6] text-[#374151]",
    field: "border-[#c4c9d1] bg-[#f8f9fa]",
    accent: "#6b7280",
  },
  CSR: {
    badge: "border-[#2dd4bf] bg-[#ccfbf1] text-[#115e59]",
    field: "border-[#5eead4] bg-[#f0fdfa]",
    accent: "#0d9488",
  },
  IB: {
    badge: "border-[#fbbf24] bg-[#fef3c7] text-[#92400e]",
    field: "border-[#fcd34d] bg-[#fffbeb]",
    accent: "#d97706",
  },
  TLF: {
    badge: "border-[#f472b6] bg-[#fce7f3] text-[#9d174d]",
    field: "border-[#f9a8d4] bg-[#fdf2f8]",
    accent: "#db2777",
  },
  Data: {
    badge: "border-[#34d399] bg-[#d1fae5] text-[#065f46]",
    field: "border-[#6ee7b7] bg-[#ecfdf5]",
    accent: "#059669",
  },
  Report: {
    badge: "border-[#818cf8] bg-[#e0e7ff] text-[#3730a3]",
    field: "border-[#a5b4fc] bg-[#eef2ff]",
    accent: "#4f46e5",
  },
  Reference: {
    badge: "border-[#94a3b8] bg-[#f1f5f9] text-[#334155]",
    field: "border-[#cbd5e1] bg-[#f8fafc]",
    accent: "#64748b",
  },
  Content: {
    badge: "border-[#64748b] bg-[#f1f5f9] text-[#1e293b]",
    field: "border-[#94a3b8] bg-[#f8fafc]",
    accent: "#475569",
  },
  Subcontent: {
    badge: "border-[#94a3b8] bg-[#f8fafc] text-[#334155]",
    field: "border-[#cbd5e1] bg-[#f8fafc]",
    accent: "#64748b",
  },
  Document: {
    badge: "border-[#9ca3af] bg-[#f3f4f6] text-[#374151]",
    field: "border-[#c4c9d1] bg-[#f8f9fa]",
    accent: "#9ca3af",
  },
};

export function categoryChip(tag: string) {
  return CATEGORY_CHIP[tag] ?? CATEGORY_CHIP.Document;
}

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
  primary: "border-[var(--peer-primary-border)] bg-[var(--peer-primary-tint)] text-[#9a1c12] font-semibold",
  supporting: "border-[#bcd0ff] bg-[#eef3ff] text-[#2b5bd7] font-semibold",
  context: "border-[#dcdcdc] bg-[#f3f3f3] text-[#636161] font-semibold",
  reference: "border-[#d8b4fe] bg-[#f3e8ff] text-[#5b21b6] font-semibold",
};

/** Badge styling per V1/V6 storyline format role. */
export const FORMAT_ROLE_BADGE: Record<SourceFormatRole, string> = {
  source:
    "border-[var(--peer-primary-border)] bg-[var(--peer-primary-tint)] text-[#9a1c12] font-semibold",
  reference: "border-[#d8b4fe] bg-[#f3e8ff] text-[#5b21b6] font-semibold",
};

/** Faded chips in the inline role picker (unselected). */
export const ROLE_BADGE_PICKER: Record<SourceRole, string> = {
  primary:
    "border-[var(--peer-primary-border)]/30 bg-[var(--peer-primary-tint)]/35 text-[#9a1c12]/65",
  supporting: "border-[#bcd0ff]/35 bg-[#eef3ff]/40 text-[#2b5bd7]/65",
  context: "border-[#dcdcdc]/50 bg-[#f3f3f3]/50 text-[#636161]/65",
  reference: "border-[#d8b4fe]/35 bg-[#f3e8ff]/40 text-[#5b21b6]/65",
};

export const FORMAT_ROLE_BADGE_PICKER: Record<SourceFormatRole, string> = {
  source:
    "border-[var(--peer-primary-border)]/30 bg-[var(--peer-primary-tint)]/35 text-[#9a1c12]/65",
  reference: "border-[#d8b4fe]/35 bg-[#f3e8ff]/40 text-[#5b21b6]/65",
};

export function roleLabel(role: SourceRole): string {
  return SOURCE_ROLE_LABELS[role];
}

export function formatRoleLabel(role: SourceFormatRole): string {
  return SOURCE_FORMAT_ROLE_LABELS[role];
}

/** Tooltip copy for V6 storyline source / reference tags. */
export const FORMAT_ROLE_HINT: Record<SourceFormatRole, string> = {
  source: "Draft from this evidence — pull values in and interpret them.",
  reference: "Cross-check only — cite for traceability, not drafted from directly.",
};

export function formatRoleHint(role: SourceFormatRole): string {
  return FORMAT_ROLE_HINT[role];
}

/** V6 matrix: two columns aligned with storyline Source / Reference tags. */
export type FormatMatrixColumnId = "source" | "reference";

export const FORMAT_MATRIX_COLUMNS: {
  id: FormatMatrixColumnId;
  role: SourceFormatRole;
  label: string;
  hint: string;
  dotHex: string;
  text: string;
  cellTint: string;
  cellAccent: string;
}[] = [
  {
    id: "source",
    role: "source",
    label: "Source",
    hint: FORMAT_ROLE_HINT.source,
    dotHex: "#fe9591",
    text: "matrix-col-source-text",
    cellTint: "matrix-col-source",
    cellAccent: "matrix-col-source-accent",
  },
  {
    id: "reference",
    role: "reference",
    label: "Reference",
    hint: FORMAT_ROLE_HINT.reference,
    dotHex: "#c084fc",
    text: "matrix-col-reference-text",
    cellTint: "matrix-col-reference",
    cellAccent: "matrix-col-reference-accent",
  },
];

export function matrixColumnForFormatSource(source: RoadmapSource): FormatMatrixColumnId {
  return effectiveFormatRole(source) === "reference" ? "reference" : "source";
}

export function formatRoleForFormatMatrixColumn(col: FormatMatrixColumnId): SourceFormatRole {
  return FORMAT_MATRIX_COLUMNS.find((c) => c.id === col)!.role;
}

export type MatrixTagRole = SourceRole | SourceFormatRole;

/** Short hint describing how a source is used in the section — shown in matrix column heads. */
export const ROLE_HINT: Record<SourceRole, string> = {
  primary:
    "Report results and interpretation from this source directly in the section text.",
  supporting:
    "Inform background or discussion; summarize\u2014do not reproduce tables or listings verbatim.",
  context: "Cross-check facts and maintain traceability; not drafted from.",
  reference: "Cross-check facts and maintain traceability; not drafted from.",
};

/** Three-column mode matrix layout (Claude prototype alignment). */
export type MatrixColumnId = "insert" | "interpret" | "reference";

export const MATRIX_COLUMNS: {
  id: MatrixColumnId;
  role: SourceRole;
  label: string;
  hint: string;
  dotHex: string;
  text: string;
  cellTint: string;
  /** Subtle top stripe on header + cells for column role. */
  cellAccent: string;
}[] = [
  {
    id: "insert",
    role: "primary",
    label: "Primary narrative",
    hint: ROLE_HINT.primary,
    dotHex: "#1a8a4a",
    text: "text-[#1a8a4a]",
    cellTint: "bg-[#edf7f1]",
    cellAccent: "shadow-[inset_0_3px_0_0_rgba(26,138,74,0.22)]",
  },
  {
    id: "interpret",
    role: "supporting",
    label: "Supporting evidence",
    hint: ROLE_HINT.supporting,
    dotHex: "#2b5bd7",
    text: "text-[#2b5bd7]",
    cellTint: "bg-[#eef3fc]",
    cellAccent: "shadow-[inset_0_3px_0_0_rgba(43,91,215,0.2)]",
  },
  {
    id: "reference",
    role: "context",
    label: "Background reference",
    hint: ROLE_HINT.context,
    dotHex: "#9e9e9e",
    text: "text-[#636161]",
    cellTint: "bg-[#f2f2f2]",
    cellAccent: "shadow-[inset_0_3px_0_0_rgba(158,158,158,0.28)]",
  },
];

export function isInDocReferenceSource(source: RoadmapSource): boolean {
  return source.sourceType === "CONTENT" || source.sourceType === "SUBCONTENT";
}

/** Which compressed evidence row a mapped source belongs in. */
export function evidenceSectionForSource(
  source: RoadmapSource,
  rolePickerMode: "usage" | "format" = "format",
): "source" | "reference" {
  if (isInDocReferenceSource(source)) return "reference";
  if (rolePickerMode === "format") {
    return effectiveFormatRole(source) === "reference" ? "reference" : "source";
  }
  if (source.sourceType === "REFERENCE_SOURCE") return "reference";
  if (effectiveSourceRole(source) === "reference") return "reference";
  return "source";
}

export function matrixColumnForSource(source: RoadmapSource): MatrixColumnId {
  const role = effectiveSourceRole(source);
  if (role === "primary") return "insert";
  if (role === "supporting") return "interpret";
  return "reference";
}

export function roleForMatrixColumn(col: MatrixColumnId): SourceRole {
  return MATRIX_COLUMNS.find((c) => c.id === col)!.role;
}

export function isOutlineReferenceSource(source: RoadmapSource): boolean {
  if (
    source.sourceType === "SUBCONTENT" &&
    "referencedBlockId" in source &&
    source.referencedBlockId
  ) {
    return true;
  }
  if (
    source.sourceType === "CONTENT" &&
    "referencedHeadingId" in source &&
    source.referencedHeadingId
  ) {
    return true;
  }
  return false;
}

/** TOC block id for an outline-linked content or subcontent pill. */
export function outlineRefTocTargetId(
  source: RoadmapSource,
  blocks: DocumentBlock[],
): string | null {
  if (source.sourceType === "SUBCONTENT") {
    if (source.referencedBlockId) return source.referencedBlockId;
    const match = blocks.find(
      (block) => block.type === "content" && block.title === source.content,
    );
    return match?.id ?? null;
  }
  if (source.sourceType === "CONTENT") {
    if (source.referencedHeadingId) return source.referencedHeadingId;
    const match = blocks.find(
      (block) => block.type === "heading" && block.title === source.content,
    );
    return match?.id ?? null;
  }
  return null;
}

/** Short chip label for compressed storyline evidence rows. */
export function getCompactEvidenceLabel(
  source: RoadmapSource,
  blocks?: DocumentBlock[],
): string {
  if (isInDocReferenceSource(source)) {
    if (
      (source.sourceType === "CONTENT" || source.sourceType === "SUBCONTENT") &&
      source.aiDescriptor?.trim()
    ) {
      return source.aiDescriptor.trim();
    }

    const targetId = outlineRefTocTargetId(source, blocks ?? []);
    if (targetId) {
      const match = targetId.match(/^c-(\d+)-(\d+)$/);
      if (match) return `sec_${match[1]}_${match[2]}`;
      return targetId;
    }
    const content =
      source.sourceType === "CONTENT" || source.sourceType === "SUBCONTENT"
        ? source.content || ""
        : "";
    if (content.length > 28) return `${content.slice(0, 26)}…`;
    return content || "Reference";
  }
  return getSourceLabel(source);
}

export function getOutlineRefTooltip(
  source: RoadmapSource,
): string | undefined {
  if (source.sourceType !== "CONTENT" && source.sourceType !== "SUBCONTENT") {
    return undefined;
  }
  const parts: string[] = [];
  if (source.content?.trim()) parts.push(source.content.trim());
  if (source.aiDescriptor?.trim()) parts.push(source.aiDescriptor.trim());
  if (source.outlineContext?.trim()) parts.push(source.outlineContext.trim());
  if (parts.length === 0) return undefined;
  return parts.join("\n\n");
}

export function artifactTypeLabel(source: RoadmapSource, blocks?: import("../../types").DocumentBlock[]): string {
  return getArtifactTypeLabel(source, blocks);
}

const ARTIFACT_LABEL_ICON: Record<string, LucideIcon> = {
  Text: FileText,
  Table: Table2,
  Figure: Image,
  Listing: List,
  Reference: BookMarked,
};

export function artifactTypeIcon(
  source: RoadmapSource,
  blocks?: DocumentBlock[],
): LucideIcon {
  const label = getArtifactTypeLabel(source, blocks);
  return ARTIFACT_LABEL_ICON[label] ?? FileText;
}

export function artifactTypeIconKind(
  source: RoadmapSource,
  blocks?: DocumentBlock[],
): string {
  return getArtifactTypeLabel(source, blocks).toLowerCase();
}

/** Semantic accent per artifact — category tint for documents, kind tint for TLF types. */
export function artifactTypeIconColor(
  source: RoadmapSource,
  blocks?: DocumentBlock[],
): string {
  const label = getArtifactTypeLabel(source, blocks);
  const byKind: Record<string, string> = {
    Table: CATEGORY_CHIP.TLF?.accent ?? "#2563eb",
    Figure: "#db2777",
    Listing: CATEGORY_CHIP.Data?.accent ?? "#059669",
    Reference: "#7c3aed",
    Text: "#636161",
  };
  if (source.sourceType === "CONTENT" || source.sourceType === "SUBCONTENT") {
    return "#64748b";
  }
  if (label === "Text" && source.sourceType === "DATA_SOURCE") {
    const category = getSourceDocumentCategory(source);
    return CATEGORY_CHIP[category]?.accent ?? byKind.Text;
  }
  return byKind[label] ?? byKind.Text;
}

export function matrixStatusLabel(state: MappingState): string {
  if (state === "ready") return "Ready";
  if (state === "review") return "In review";
  return "Needs decision";
}

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

/** Compact chip per mapped artifact origin type (data source, content, etc.). */
export const ARTIFACT_TYPE_CHIP: Record<
  import("../../data/roadmap").RoadmapSource["sourceType"],
  { label: string; badge: string; field: string }
> = {
  DATA_SOURCE: {
    label: "Data source",
    badge: "peer-type-tag",
    field: "peer-field-chip",
  },
  SUBCONTENT: {
    label: "Text",
    badge: "peer-type-tag",
    field: "peer-field-chip",
  },
  CONTENT: {
    label: "Text",
    badge: "peer-type-tag",
    field: "peer-field-chip",
  },
  REFERENCE_SOURCE: {
    label: "Reference",
    badge: "peer-type-tag",
    field: "peer-field-chip",
  },
};

/** @deprecated Use ARTIFACT_TYPE_CHIP */
export const SOURCE_KIND_BADGE: Record<
  "DATA_SOURCE" | "SUBCONTENT" | "CONTENT",
  { label: string; className: string }
> = {
  DATA_SOURCE: {
    label: "Data source",
    className: ARTIFACT_TYPE_CHIP.DATA_SOURCE.badge,
  },
  SUBCONTENT: {
    label: "Subcontent",
    className: ARTIFACT_TYPE_CHIP.SUBCONTENT.badge,
  },
  CONTENT: {
    label: "Content",
    className: ARTIFACT_TYPE_CHIP.CONTENT.badge,
  },
};

/** Derived mapping state for a section, from its sources' status + usage roles. */
export type MappingState = "ready" | "review" | "needsPrimary" | "empty";

export const NODE_HEX: Record<MappingState, string> = {
  ready: "#1a8a4a",
  review: "#2b5bd7",
  needsPrimary: "#e0a800",
  empty: "#d0a000",
};

function coerceSourceRole(role: string): SourceRole | undefined {
  if (role === "source" || role === "paragraph" || role === "text") return "primary";
  if (role === "table") return "supporting";
  if (role === "figure") return "context";
  if (role === "reference") return "reference";
  if ((SOURCE_ROLES as readonly string[]).includes(role)) return role as SourceRole;
  return undefined;
}

export function effectiveSourceRole(source: RoadmapSource): SourceRole | undefined {
  if (source.role) {
    const coerced = coerceSourceRole(String(source.role));
    if (coerced) return coerced;
  }
  if (source.isReference || source.sourceType === "REFERENCE_SOURCE") return "reference";
  return undefined;
}

export function effectiveFormatRole(source: RoadmapSource): SourceFormatRole | undefined {
  const role = source.role;
  if (role) {
    const normalized = normalizeSourceFormatRole(String(role));
    if (normalized) return normalized;
  }
  const usage = effectiveSourceRole(source);
  if (usage === "reference") return "reference";
  if (usage) return "source";
  return undefined;
}

export { SOURCE_FORMAT_ROLES };

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
 * "3 sources · CSR, TLF, Data". Appends "· N proposed" when any are
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
