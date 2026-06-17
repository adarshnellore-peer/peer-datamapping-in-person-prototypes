import type { RoadmapSource } from "./data/roadmap";

export type ViewMode = "roadmap" | "document";

export type HeadingBlock = {
  id: string;
  type: "heading";
  level: 1 | 2 | 3;
  number: string;
  title: string;
};

export type ContentBlockData = {
  id: string;
  type: "content";
  title: string;
  previewText: string;
  prompt: string;
  outputType: string;
  sources: RoadmapSource[];
};

export type PageBreakBlock = {
  id: string;
  type: "pageBreak";
};

export type DocumentBlock = HeadingBlock | ContentBlockData | PageBreakBlock;

export type TocItem = {
  id: string;
  label: string;
};
