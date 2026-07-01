import {
  createSourceForType,
  type RoadmapSource,
  type SourceRole,
  type SourceFormatRole,
} from "../data/roadmap";
import type { ContentBlockData, DocumentBlock } from "../types";
import { getSubsectionsForHeading } from "./documentBlocks";
import type { OutlineRefPayload } from "./v2DragPayload";

type OutlineRefRole = SourceRole | SourceFormatRole | undefined;

function stripPromptBoilerplate(text: string): string {
  return text
    .replace(/\[CONTEXT FOR THE MODEL\]/gi, "")
    .replace(/\[\/CONTEXT\]/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function formatContentBlockContext(block: ContentBlockData): string {
  const lines: string[] = [];
  if (block.title.trim()) lines.push(block.title.trim());
  if (block.previewText?.trim()) lines.push(stripPromptBoilerplate(block.previewText));
  if (block.prompt?.trim()) lines.push(stripPromptBoilerplate(block.prompt));
  if (block.additionalContext?.trim()) lines.push(stripPromptBoilerplate(block.additionalContext));
  return lines.join("\n");
}

/** Text bundled from the outline row and anything nested under it. */
export function extractOutlineContext(
  blocks: DocumentBlock[],
  payload: OutlineRefPayload,
): string {
  if (payload.sourceType === "SUBCONTENT" && payload.fromBlockId) {
    const block = blocks.find((item) => item.id === payload.fromBlockId);
    if (block?.type === "content") {
      return formatContentBlockContext(block);
    }
  }

  if (payload.sourceType === "CONTENT" && payload.fromHeadingId) {
    const heading = blocks.find((item) => item.id === payload.fromHeadingId);
    const subsections = getSubsectionsForHeading(blocks, payload.fromHeadingId);
    const headingLine =
      heading?.type === "heading"
        ? [heading.number, heading.title].filter(Boolean).join(" ").trim()
        : payload.label;

    if (subsections.length === 0) {
      return headingLine || payload.label;
    }

    const body = subsections.map(formatContentBlockContext).filter(Boolean).join("\n\n");
    return headingLine ? `${headingLine}\n\n${body}` : body;
  }

  return payload.label;
}

function snapshotBundledSources(sources: RoadmapSource[]): RoadmapSource[] {
  return sources.map((source) => ({ ...source }));
}

/** Sources (tables, figures, listings, etc.) on the dragged outline row(s). */
export function extractBundledSources(
  blocks: DocumentBlock[],
  payload: OutlineRefPayload,
): RoadmapSource[] {
  if (payload.sourceType === "SUBCONTENT" && payload.fromBlockId) {
    const block = blocks.find((item) => item.id === payload.fromBlockId);
    if (block?.type === "content") {
      return snapshotBundledSources(block.sources);
    }
  }

  if (payload.sourceType === "CONTENT" && payload.fromHeadingId) {
    const subsections = getSubsectionsForHeading(blocks, payload.fromHeadingId);
    return snapshotBundledSources(subsections.flatMap((section) => section.sources));
  }

  return [];
}

export function getBundledSourcesForOutlineRef(
  source: RoadmapSource,
  blocks: DocumentBlock[],
): RoadmapSource[] {
  if (source.sourceType === "SUBCONTENT" || source.sourceType === "CONTENT") {
    if (source.bundledSources?.length) return source.bundledSources;
  }

  if (source.sourceType === "SUBCONTENT" && source.referencedBlockId) {
    const block = blocks.find((item) => item.id === source.referencedBlockId);
    if (block?.type === "content") return block.sources;
  }

  if (source.sourceType === "CONTENT" && source.referencedHeadingId) {
    const subsections = getSubsectionsForHeading(blocks, source.referencedHeadingId);
    return subsections.flatMap((section) => section.sources);
  }

  return [];
}

function outputKindLabel(outputType: string | undefined): string {
  if (!outputType) return "Section";
  if (outputType.includes("TABLE")) return "Table";
  if (outputType.includes("FIGURE")) return "Figure";
  return "Section";
}

function clampDescriptor(value: string, max = 56): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function summarizeTask(text: string, fallback: string): string {
  const stripped = stripPromptBoilerplate(text);
  const youAre = stripped.match(/\byou are (.{12,90}?)(?:\.|$)/i);
  if (youAre?.[1]) return youAre[1].trim();

  const writeMatch = stripped.match(/\bwrite (.{12,90}?)(?:\.|$)/i);
  if (writeMatch?.[1]) return writeMatch[1].trim();

  const generateMatch = stripped.match(/\bgenerate (.{12,90}?)(?:\.|$)/i);
  if (generateMatch?.[1]) return generateMatch[1].trim();

  const firstSentence = stripped.match(/^(.{16,100}?)[.!?](?:\s|$)/);
  if (firstSentence?.[1]) return firstSentence[1].trim();

  return fallback;
}

function buildDescriptorHeuristic(
  context: string,
  payload: OutlineRefPayload,
  blocks: DocumentBlock[],
): string {
  if (payload.sourceType === "SUBCONTENT" && payload.fromBlockId) {
    const block = blocks.find((item) => item.id === payload.fromBlockId);
    if (block?.type === "content") {
      const kind = outputKindLabel(block.outputType);
      const task = summarizeTask(context, block.title);
      return clampDescriptor(`${kind}: ${task}`);
    }
  }

  if (payload.sourceType === "CONTENT" && payload.fromHeadingId) {
    const subsections = getSubsectionsForHeading(blocks, payload.fromHeadingId);
    if (subsections.length === 1) {
      const block = subsections[0]!;
      const kind = outputKindLabel(block.outputType);
      const task = summarizeTask(formatContentBlockContext(block), block.title);
      return clampDescriptor(`${kind}: ${task}`);
    }
    if (subsections.length > 1) {
      return clampDescriptor(`${payload.label} (${subsections.length} subsections)`);
    }
  }

  const task = summarizeTask(context, payload.label);
  return clampDescriptor(`${payload.label} — ${task}`);
}

/**
 * Prototype LLM stand-in — async so a real API call can replace this later.
 */
export async function generateOutlineRefDescriptor(
  context: string,
  payload: OutlineRefPayload,
  blocks: DocumentBlock[],
): Promise<string> {
  await new Promise((resolve) => window.setTimeout(resolve, 350));
  return buildDescriptorHeuristic(context, payload, blocks);
}

export function buildOutlineRefSource(
  payload: OutlineRefPayload,
  outlineContext: string,
  options?: {
    id?: string;
    role?: OutlineRefRole;
    aiDescriptor?: string;
    bundledSources?: RoadmapSource[];
    status?: "proposed" | "confirmed";
  },
): RoadmapSource {
  const id = options?.id ?? crypto.randomUUID();
  const hasDescriptor = Boolean(options?.aiDescriptor?.trim());
  const base = createSourceForType(payload.sourceType, {
    content: payload.label,
    status: options?.status ?? (hasDescriptor ? "confirmed" : "proposed"),
  });

  const withRefs =
    payload.sourceType === "SUBCONTENT"
      ? ({
          ...base,
          referencedBlockId: payload.fromBlockId,
        } as import("../data/roadmap").SubcontentRoadmapSource)
      : ({
          ...base,
          referencedHeadingId: payload.fromHeadingId,
        } as import("../data/roadmap").ContentRoadmapSource);

  const enriched = {
    ...withRefs,
    id,
    outlineContext,
    aiDescriptor: options?.aiDescriptor,
    bundledSources: options?.bundledSources,
    ...(options?.role !== undefined
      ? {
          role: options.role,
          isReference: options.role === "reference" ? true : undefined,
        }
      : {}),
  };

  return enriched;
}
