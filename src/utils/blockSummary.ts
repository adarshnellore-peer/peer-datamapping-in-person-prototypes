import { getDocumentCategory, getReferenceSectionName } from "../data/roadmap";
import type { RoadmapSource } from "../data/roadmap";
import { getSourceSectionName, getSourceDocumentCategory } from "../data/sourceHelpers";

/**
 * Placeholder stand-in for an AI-generated block summary.
 * Uses the system prompt for intent and mapped sources for document-specific anchors.
 */

function clamp(text: string, max = 88): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function quotedPhrase(text: string): string | undefined {
  return text.match(/"([^"]+)"/)?.[1];
}

function compactPhrase(text: string, max = 40): string {
  let phrase = text
    .replace(/^the\s+/i, "")
    .replace(/\s+and\s+the\s+/gi, " and ")
    .replace(/\.\s*Return.*/i, "")
    .replace(/\.\s*Do not.*/i, "")
    .trim()
    .toLowerCase();

  if (phrase.length <= max) return phrase;

  const comma = phrase.lastIndexOf(",", max);
  if (comma > 16) phrase = phrase.slice(0, comma);

  if (phrase.length > max) {
    phrase = `${phrase.slice(0, max - 1).trimEnd()}…`;
  }

  return phrase;
}

function intentFromPrompt(prompt: string, outputType?: string): string | null {
  const collapsed = prompt.replace(/\s+/g, " ").trim();
  if (!collapsed) return null;

  const context =
    collapsed.match(/\[CONTEXT FOR THE MODEL\]\s*(.+?)(?:\s*\[REQUESTED TASK\]|$)/i)?.[1] ?? "";
  const task =
    collapsed.match(/\[REQUESTED TASK\]\s*(.+?)(?:\s*\[|$)/i)?.[1]?.trim() ?? "";

  const sectionName = quotedPhrase(context) ?? quotedPhrase(task);

  const isTable =
    outputType === "OUTPUT_TYPE_TABLE" || /html table|tabular portion/i.test(`${context} ${task}`);
  const isFigure = outputType === "OUTPUT_TYPE_FIGURE" || /\bfigure\b/i.test(`${context} ${task}`);

  if (isTable) {
    const tableSubject = task.match(
      /(?:html )?table that (?:outlines?|shows?|summarizes?)\s+(?:the\s+)?(.+?)(?:\.|,\s*and the|Return)/i,
    )?.[1];
    if (tableSubject) {
      return `Table of ${compactPhrase(tableSubject)}`;
    }
    if (sectionName) {
      return `Visit schedule table for ${sectionName.toLowerCase()}`;
    }
    return "Table of trial phases and procedures";
  }

  if (isFigure) {
    if (sectionName) return `Figure for ${sectionName.toLowerCase()}`;
    return "Figure of study results";
  }

  if (sectionName) {
    return `Section on ${sectionName.toLowerCase()}`;
  }

  const narrativeSubject = task.match(
    /\b(?:paragraphs?|explanation)\s+(?:\(.*?\)\s*)?(?:on|about|of)\s+(.+?)(?:\.|Do not)/i,
  )?.[1];
  if (narrativeSubject) {
    return `Narrative on ${compactPhrase(narrativeSubject)}`;
  }

  const youAre = context.match(
    /\byou are (?:creating|crafting|preparing|writing)\s+(?:the\s+)?(.+?)(?:\.|for a\b)/i,
  )?.[1];
  if (youAre) {
    const portion = youAre.match(
      /(?:narrative|tabular|eligibility|demographics) portion of (?:a )?(.+)/i,
    )?.[1];
    const topic = quotedPhrase(portion ?? youAre) ?? compactPhrase(portion ?? youAre);
    if (topic) return `Section on ${topic}`;
  }

  return null;
}

function anchorLabel(source: RoadmapSource): string | null {
  if (source.sourceType !== "DATA_SOURCE") return null;

  const category = getSourceDocumentCategory(source);
  const section = getSourceSectionName(source);

  if (category === "TLF") {
    const refName = getReferenceSectionName(source.referenceKey);
    const tlfLabel = refName.match(/^(Table|Figure|Listing)\s/i)
      ? refName.split(":")[0]?.trim()
      : section;
    return `TLF ${tlfLabel}`;
  }

  if (category === "CSR") {
    return `CSR §${section}`;
  }

  if (category === "Template") {
    return `Template §${section}`;
  }

  if (category === "IB") {
    return `IB §${section}`;
  }

  if (source.dataSource.toLowerCase().includes("protocol")) {
    const shortDoc = source.dataSource.replace(/\s+Version\s+\d+.*$/i, "").trim();
    return `${shortDoc} §${section}`;
  }

  const shortDoc =
    source.dataSource.length > 28
      ? getDocumentCategory(source.dataSource)
      : source.dataSource;
  return `${shortDoc} §${section}`;
}

function uniqueAnchors(sources: RoadmapSource[], limit = 3): string[] {
  const seen = new Set<string>();
  const labels: string[] = [];

  for (const source of sources) {
    if (source.sourceType !== "DATA_SOURCE") continue;
    const label = anchorLabel(source);
    if (!label || seen.has(label)) continue;
    seen.add(label);
    labels.push(label);
    if (labels.length >= limit) break;
  }

  return labels;
}

function formatAnchorList(anchors: string[]): string {
  if (anchors.length === 0) return "";
  if (anchors.length === 1) return anchors[0]!;
  if (anchors.length === 2) return `${anchors[0]} and ${anchors[1]}`;
  return `${anchors.slice(0, -1).join(", ")}, and ${anchors[anchors.length - 1]}`;
}

/** Sync placeholder summary from prompt intent + mapped drafting sources. */
export function generateBlockSummary(
  prompt: string,
  outputType?: string,
  draftSources: RoadmapSource[] = [],
): string {
  const intent = intentFromPrompt(prompt, outputType);
  const anchors = uniqueAnchors(draftSources);

  if (!intent && anchors.length === 0) {
    return "Summary will appear once generation instructions are added…";
  }

  if (!intent && anchors.length > 0) {
    return clamp(`Drafted from ${formatAnchorList(anchors)}`);
  }

  if (intent && anchors.length === 0) {
    return clamp(intent);
  }

  return clamp(`${intent} · ${formatAnchorList(anchors)}`);
}
