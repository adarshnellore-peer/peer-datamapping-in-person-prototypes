import type { ContentBlockData, DocumentBlock, HeadingBlock } from "../types";

export function isTocHeading(
  block: DocumentBlock,
): block is HeadingBlock {
  return block.type === "heading" && block.level <= 2;
}

export function findInsertIndexAfterHeadingSection(
  blocks: DocumentBlock[],
  headingId: string,
): number | null {
  const headingIndex = blocks.findIndex((b) => b.id === headingId);
  if (headingIndex === -1) return null;

  const heading = blocks[headingIndex];
  if (heading.type !== "heading") return null;

  for (let i = headingIndex + 1; i < blocks.length; i++) {
    const block = blocks[i];
    if (block.type === "heading" && block.level <= heading.level) {
      return i;
    }
  }

  return blocks.length;
}

export function getSubsectionsForHeading(
  blocks: DocumentBlock[],
  headingId: string,
): ContentBlockData[] {
  const headingIndex = blocks.findIndex((b) => b.id === headingId);
  if (headingIndex === -1) return [];

  const heading = blocks[headingIndex];
  if (heading.type !== "heading") return [];

  const subsections: ContentBlockData[] = [];
  for (let i = headingIndex + 1; i < blocks.length; i++) {
    const block = blocks[i];
    if (block.type === "heading" && block.level <= heading.level) break;
    if (block.type === "content") subsections.push(block);
  }
  return subsections;
}

/** True when a heading has no subcontent rows — used as an insert-new-heading slot in V3. */
export function isHeadingInsertionSlot(
  blocks: DocumentBlock[],
  headingId: string,
): boolean {
  return getSubsectionsForHeading(blocks, headingId).length === 0;
}

export type TocHeadingEntry = {
  heading: HeadingBlock;
  subsections: ContentBlockData[];
};

export function buildTocTree(blocks: DocumentBlock[]): TocHeadingEntry[] {
  const entries: TocHeadingEntry[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (!isTocHeading(block)) continue;

    entries.push({
      heading: block,
      subsections: getSubsectionsForHeading(blocks, block.id),
    });
  }

  return entries;
}

export type TocFlatItem =
  | {
      kind: "heading";
      id: string;
      depth: number;
      ancestorHeadingIds: string[];
      heading: HeadingBlock;
      hasChildren: boolean;
    }
  | {
      kind: "content";
      id: string;
      depth: number;
      ancestorHeadingIds: string[];
      block: ContentBlockData;
      /** Derived from parent heading number + sibling index (e.g. 5.2, 1.6.1). */
      number: string;
    };

function headingHasTocChildren(blocks: DocumentBlock[], headingIndex: number): boolean {
  const heading = blocks[headingIndex];
  if (heading.type !== "heading") return false;

  for (let i = headingIndex + 1; i < blocks.length; i++) {
    const block = blocks[i];
    if (block.type === "heading" && block.level <= heading.level) return false;
    if (block.type === "heading" || block.type === "content") return true;
  }
  return false;
}

export function formatSubsectionNumber(parentHeadingNumber: string, index: number): string {
  const parent = parentHeadingNumber.trim();
  if (!parent) return String(index);
  return formatHeadingNumber(`${parent}.`, index);
}

export function getTocFlatItemNumber(item: TocFlatItem): string | undefined {
  if (item.kind === "heading") {
    const number = item.heading.number?.trim();
    return number || undefined;
  }
  const number = item.number.trim();
  return number || undefined;
}

export function buildTocFlatList(blocks: DocumentBlock[]): TocFlatItem[] {
  const items: TocFlatItem[] = [];
  const ancestorStack: string[] = [];
  const headingNumbers = new Map<string, string>();
  const contentIndexByHeading = new Map<string, number>();

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (block.type === "pageBreak") continue;

    if (block.type === "heading") {
      const depth = block.level - 1;
      ancestorStack.length = depth;

      headingNumbers.set(block.id, block.number);

      items.push({
        kind: "heading",
        id: block.id,
        depth,
        ancestorHeadingIds: [...ancestorStack],
        heading: block,
        hasChildren: headingHasTocChildren(blocks, i),
      });

      ancestorStack[depth] = block.id;
      continue;
    }

    const parentId = ancestorStack[ancestorStack.length - 1];
    let number = "";
    if (parentId) {
      const parentNumber = headingNumbers.get(parentId) ?? "";
      const index = (contentIndexByHeading.get(parentId) ?? 0) + 1;
      contentIndexByHeading.set(parentId, index);
      number = formatSubsectionNumber(parentNumber, index);
    }

    items.push({
      kind: "content",
      id: block.id,
      depth: ancestorStack.length,
      ancestorHeadingIds: [...ancestorStack],
      block,
      number,
    });
  }

  return items;
}

export function deleteHeadingSection(
  blocks: DocumentBlock[],
  headingId: string,
): DocumentBlock[] {
  const headingIndex = blocks.findIndex((b) => b.id === headingId);
  if (headingIndex === -1) return blocks;

  const heading = blocks[headingIndex];
  if (heading.type !== "heading") return blocks;

  let endIndex = headingIndex + 1;
  for (; endIndex < blocks.length; endIndex++) {
    const block = blocks[endIndex];
    if (block.type === "heading" && block.level <= heading.level) break;
  }

  return [...blocks.slice(0, headingIndex), ...blocks.slice(endIndex)];
}

export function getHeadingSectionBlockIds(
  blocks: DocumentBlock[],
  headingId: string,
): string[] {
  const headingIndex = blocks.findIndex((b) => b.id === headingId);
  if (headingIndex === -1) return [];

  const heading = blocks[headingIndex];
  if (heading.type !== "heading") return [];

  const ids = [headingId];
  for (let i = headingIndex + 1; i < blocks.length; i++) {
    const block = blocks[i];
    if (block.type === "heading" && block.level <= heading.level) break;
    ids.push(block.id);
  }
  return ids;
}

export function parseHeadingNumber(
  number: string,
): { parentPrefix: string; segment: number } | null {
  const trimmed = number.trim();
  if (!trimmed) return null;

  const lastDot = trimmed.lastIndexOf(".");
  if (lastDot === -1) {
    const segment = Number.parseInt(trimmed, 10);
    return Number.isNaN(segment) ? null : { parentPrefix: "", segment };
  }

  const segment = Number.parseInt(trimmed.slice(lastDot + 1), 10);
  if (Number.isNaN(segment)) return null;
  return { parentPrefix: trimmed.slice(0, lastDot + 1), segment };
}

export function formatHeadingNumber(parentPrefix: string, segment: number): string {
  return parentPrefix ? `${parentPrefix}${segment}` : String(segment);
}

export function nextSiblingHeadingNumber(
  blocks: DocumentBlock[],
  afterHeadingIndex: number,
): string {
  const after = blocks[afterHeadingIndex];
  if (after.type !== "heading") return "";

  const parsed = parseHeadingNumber(after.number);
  if (parsed) {
    return formatHeadingNumber(parsed.parentPrefix, parsed.segment + 1);
  }

  let parentPrefix = "";
  let lastSegment = 0;
  for (let i = 0; i <= afterHeadingIndex; i++) {
    const block = blocks[i];
    if (block.type !== "heading" || block.level !== after.level) continue;
    const parts = parseHeadingNumber(block.number);
    if (!parts) continue;
    parentPrefix = parts.parentPrefix;
    lastSegment = parts.segment;
  }

  return lastSegment > 0 ? formatHeadingNumber(parentPrefix, lastSegment + 1) : "";
}

export function bumpSubsequentHeadingNumbers(
  blocks: DocumentBlock[],
  insertedIndex: number,
  level: HeadingBlock["level"],
  insertedNumber: string,
): DocumentBlock[] {
  const inserted = parseHeadingNumber(insertedNumber);
  if (!inserted) return blocks;

  return blocks.map((block, index) => {
    if (index <= insertedIndex || block.type !== "heading" || block.level !== level) {
      return block;
    }

    const parsed = parseHeadingNumber(block.number);
    if (!parsed || parsed.parentPrefix !== inserted.parentPrefix) return block;
    if (parsed.segment < inserted.segment) return block;

    return {
      ...block,
      number: formatHeadingNumber(parsed.parentPrefix, parsed.segment + 1),
    };
  });
}

/** Inclusive start, exclusive end — headings drag their nested section. */
export function getDragBlockSpan(
  blocks: DocumentBlock[],
  blockId: string,
): { start: number; end: number } | null {
  const start = blocks.findIndex((block) => block.id === blockId);
  if (start === -1) return null;

  const block = blocks[start];
  if (block.type === "heading") {
    let end = start + 1;
    for (; end < blocks.length; end++) {
      const candidate = blocks[end];
      if (candidate.type === "heading" && candidate.level <= block.level) break;
    }
    return { start, end };
  }

  if (block.type === "content" || block.type === "pageBreak") {
    return { start, end: start + 1 };
  }

  return null;
}

export function resolveTocDropIndex(
  blocks: DocumentBlock[],
  flatItems: TocFlatItem[],
  dropFlatIndex: number,
): number {
  if (flatItems.length === 0) return 0;

  if (dropFlatIndex <= 0) {
    return blocks.findIndex((block) => block.id === flatItems[0].id);
  }

  if (dropFlatIndex >= flatItems.length) {
    const lastId = flatItems[flatItems.length - 1].id;
    const span = getDragBlockSpan(blocks, lastId);
    return span ? span.end : blocks.length;
  }

  return blocks.findIndex((block) => block.id === flatItems[dropFlatIndex].id);
}

export function isInvalidTocDrop(
  blocks: DocumentBlock[],
  draggedId: string,
  dropFlatIndex: number,
  flatItems: TocFlatItem[],
): boolean {
  const span = getDragBlockSpan(blocks, draggedId);
  if (!span) return true;

  const targetIndex = resolveTocDropIndex(blocks, flatItems, dropFlatIndex);
  if (targetIndex < 0) return true;

  return targetIndex > span.start && targetIndex < span.end;
}

export function moveDocumentBlocks(
  blocks: DocumentBlock[],
  blockId: string,
  toIndex: number,
): DocumentBlock[] {
  const span = getDragBlockSpan(blocks, blockId);
  if (!span) return blocks;

  const moving = blocks.slice(span.start, span.end);
  const remaining = [...blocks.slice(0, span.start), ...blocks.slice(span.end)];

  let insertAt = toIndex;
  if (toIndex > span.start) {
    insertAt = toIndex - (span.end - span.start);
  }
  insertAt = Math.max(0, Math.min(insertAt, remaining.length));

  if (insertAt === span.start) return blocks;

  return [
    ...remaining.slice(0, insertAt),
    ...moving,
    ...remaining.slice(insertAt),
  ];
}

export function moveDocumentBlockFromTocDrop(
  blocks: DocumentBlock[],
  blockId: string,
  dropFlatIndex: number,
): DocumentBlock[] {
  const flatItems = buildTocFlatList(blocks);
  if (isInvalidTocDrop(blocks, blockId, dropFlatIndex, flatItems)) {
    return blocks;
  }
  const toIndex = resolveTocDropIndex(blocks, flatItems, dropFlatIndex);
  if (toIndex < 0) return blocks;
  return moveDocumentBlocks(blocks, blockId, toIndex);
}
