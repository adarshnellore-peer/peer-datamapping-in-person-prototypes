import type { DocumentBlock, TocItem } from "../types";
import type { DataSourceRoadmapSource, RoadmapSource } from "./roadmap";

function src(
  id: string,
  dataSource: string,
  referenceKey: string,
  sectionName: string,
  documentCategory: string,
  status: "proposed" | "confirmed" = "confirmed",
): DataSourceRoadmapSource {
  return {
    id,
    status,
    sourceType: "DATA_SOURCE",
    dataSource,
    referenceKey,
    sectionName,
    documentCategory,
  };
}

/** 1.3 — trial timeline since study ended */
const SOURCES_1_3: RoadmapSource[] = [
  src(
    "s-1-3-1",
    "Clinical Study Report",
    "Synopsis: 3-13",
    "Synopsis",
    "CSR",
  ),
  src(
    "s-1-3-2",
    "247HV101 Protocol Version 3",
    "Section 9.2: 118-126",
    "Section 9.2",
    "Protocol",
    "proposed",
  ),
];

/** 1.5 — why research was needed */
const SOURCES_1_5: RoadmapSource[] = [
  src(
    "s-1-5-1",
    "Biogen Clinical Study Report Template",
    "Template Section 9.2: 142-148",
    "Template Section 9.2",
    "Template",
  ),
  src(
    "s-1-5-2",
    "247HV101 Protocol Version 3",
    "Section 1: 17-34",
    "Section 1",
    "Protocol",
  ),
  src(
    "s-1-5-3",
    "Clinical Study Report",
    "CSR Intro Sections: 29-83",
    "CSR Intro Sections",
    "CSR",
    "proposed",
  ),
];

/** 1.6 — eligibility */
const SOURCES_1_6_ELIGIBILITY: RoadmapSource[] = [
  src(
    "s-1-6e-1",
    "247HV101 Protocol Version 3",
    "Section 8: 84-102",
    "Section 8",
    "Protocol",
  ),
  src(
    "s-1-6e-2",
    "Biogen Clinical Study Report Template",
    "Template Section 10.8: 168-174",
    "Template Section 10.8",
    "Template",
  ),
];

/** 1.6 — demographics table */
const SOURCES_1_6_DEMOGRAPHICS: RoadmapSource[] = [
  src(
    "s-1-6d-1",
    "109MS306 (CONNECT) LTE Statistical Analysis Plan",
    "Demographics and Baseline Characteristics: 42-51",
    "Demographics and Baseline Characteristics",
    "SAP",
  ),
  src(
    "s-1-6d-2",
    "109MS306 (CONNECT) LTE Statistical Analysis Plan",
    "Analysis Populations: 6-14",
    "Analysis Populations",
    "SAP",
  ),
  src(
    "s-1-6d-3",
    "Clinical Study Report",
    "Study Design and Objectives: 84-112",
    "Study Design and Objectives",
    "CSR",
    "proposed",
  ),
];

/** 1.7 — study design */
const SOURCES_1_7: RoadmapSource[] = [
  src(
    "s-1-7-1",
    "247HV101 Protocol Version 3",
    "Section 8: 84-102",
    "Section 8",
    "Protocol",
  ),
  src(
    "s-1-7-2",
    "Clinical Study Report",
    "Study Design and Objectives: 84-112",
    "Study Design and Objectives",
    "CSR",
  ),
];

/** 1.8 — what happened (narrative) */
const SOURCES_1_8_NARRATIVE: RoadmapSource[] = [
  src(
    "s-1-8n-1",
    "Biogen Clinical Study Report Template",
    "Template Section 9.2: 142-148",
    "Template Section 9.2",
    "Template",
  ),
  src(
    "s-1-8n-2",
    "247HV101 Protocol Version 3",
    "Section 8: 84-102",
    "Section 8",
    "Protocol",
  ),
];

/** 1.8 — visit schedule table */
const SOURCES_1_8_SCHEDULE: RoadmapSource[] = [
  src(
    "s-1-8t-1",
    "Biogen Clinical Study Report Template",
    "Template Section 9.2: 142-148",
    "Template Section 9.2",
    "Template",
  ),
  src(
    "s-1-8t-2",
    "247HV101 Protocol Version 3",
    "Section 8: 84-102",
    "Section 8",
    "Protocol",
  ),
  src(
    "s-1-8t-3",
    "109MS306 (CONNECT) LTE Statistical Analysis Plan",
    "Introduction: 2-5",
    "Introduction",
    "SAP",
    "proposed",
  ),
];

/** 1.9 — efficacy results */
const SOURCES_1_9: RoadmapSource[] = [
  src(
    "s-1-9-1",
    "109MS306 (CONNECT) LTE Statistical Analysis Plan",
    "Primary Efficacy Endpoints: 52-68",
    "Primary Efficacy Endpoints",
    "SAP",
  ),
  src(
    "s-1-9-2",
    "109MS306 (CONNECT) LTE Statistical Analysis Plan",
    "Secondary Efficacy Endpoints: 69-88",
    "Secondary Efficacy Endpoints",
    "SAP",
  ),
  src(
    "s-1-9-3",
    "Clinical Study Report",
    "Efficacy Results — Primary Endpoint: 198-224",
    "Efficacy Results — Primary Endpoint",
    "CSR",
  ),
  src(
    "s-1-9-4",
    "C4591001 Final Statistical Analysis Plan",
    "Analysis Populations: 6-14",
    "Analysis Populations",
    "SAP",
    "proposed",
  ),
];

/** 1.10 — safety */
const SOURCES_1_10: RoadmapSource[] = [
  src(
    "s-1-10-1",
    "Clinical Study Report",
    "Safety Summary — Adverse Events: 312-348",
    "Safety Summary — Adverse Events",
    "CSR",
  ),
  src(
    "s-1-10-2",
    "109MS306 (CONNECT) LTE Statistical Analysis Plan",
    "Safety Analyses — Treatment-Emergent Adverse Events: 112-128",
    "Safety Analyses — Treatment-Emergent Adverse Events",
    "SAP",
  ),
  src(
    "s-1-10-3",
    "Biogen Clinical Study Report Template",
    "Template Section 11.9.2: 198-204",
    "Template Section 11.9.2",
    "Template",
    "proposed",
  ),
];

/** 1.11 — how trial helped */
const SOURCES_1_11: RoadmapSource[] = [
  src(
    "s-1-11-1",
    "Clinical Study Report",
    "Synopsis: 3-13",
    "Synopsis",
    "CSR",
  ),
  src(
    "s-1-11-2",
    "Biogen Clinical Study Report Template",
    "Template Section 9.2: 142-148",
    "Template Section 9.2",
    "Template",
  ),
];

/** 1.12 — where to learn more */
const SOURCES_1_12: RoadmapSource[] = [
  src(
    "s-1-12-1",
    "247HV101 Protocol Version 3",
    "Protocol Title Page: 1-1",
    "Protocol Title Page",
    "Protocol",
  ),
  src(
    "s-1-12-2",
    "Clinical Study Report",
    "Synopsis: 3-13",
    "Synopsis",
    "CSR",
  ),
  src(
    "s-1-12-3",
    "C4591001 Protocol Amendment 9",
    "Protocol Title Page: 1-1",
    "Protocol Title Page",
    "Protocol",
    "proposed",
  ),
];

const PROMPT_1_3 =
  "[CONTEXT FOR THE MODEL] You are crafting a short subsection 2of a plain language summary for a general audience. This paragraph should cover the timeline of the trial, when it began and ended, how long participants were enrolled, and note that a final report was created. It should be concise, neutral, and friendly. [REQUESTED TASK] After reading the appended CSR text, produce a brief paragraph (roughly 3-4 sentences) that: 1. Mentions how long the trial ran in total and how long participants took part. 2. States the trial's start and end dates. 3. Explains that the data was reviewed and a report was written. 4. Directs readers to additional resources for more details, if provided. Do not include headings or disclaimers, and do not repeat text from other sections.";

const PROMPT_1_5 =
  '[CONTEXT FOR THE MODEL] You are creating a section of a plain language summary for a general audience. This section, titled "Why was the research needed?", should be expressed in **2 or 3 short paragraphs** that explain: 1. The background of the medical condition or problem. 2. How or why the study drug or intervention might help with that problem. 3. The main questions or goals that researchers aimed to answer in this study. The style must be easy to understand, friendly, and **non-technical**. The output should be plain text, without headings, disclaimers, or repetition of other sections. [REQUESTED TASK] After reading the CSR text that I will append below, produce **2 or 3 short paragraphs** (each about 2–3 sentences) that: - Summarize the condition and any relevant symptoms or challenges. - Describe how the drug or intervention might address these challenges. - Mention the key questions or aims the researchers hoped to explore. Do **not** include any extra headings or disclaimers. Return only the short paragraphs as plain text.';


const PROMPT_1_7 =
  "[CONTEXT FOR THE MODEL] You are preparing a \"What kind of trial was this?\" section for a plain language summary that will be read by a general audience. This section should briefly explain the study's phase, design features (e.g., double-blind, randomized, placebo-controlled), and why those methods are used. Avoid jargon and keep it easy to understand. [REQUESTED TASK] After reading the relevant CSR text appended below, produce a concise explanation (about 4–6 sentences or short bullet points) that includes: 1. The trial's phase (for example, Phase 1, 2, or 3) and what that generally means. 2. Any special design aspects (e.g., double-blind, randomized, placebo-controlled). 3. A brief mention of how the treatments were assigned and why a placebo may have been used. 4. Plain, neutral language, with no headings, disclaimers, or repeated sections.";

const PROMPT_1_8_NARRATIVE =
  "[CONTEXT FOR THE MODEL] You are creating the narrative portion of a \"What happened during the trial?\" section for a Plain Language Summary. Describe, in clear everyday language, the steps participants went through before, during, and after treatment. [REQUESTED TASK] After reading the CSR text appended below, provide 2–3 short paragraphs on screening, visits, tests, and relevant time frames. Do not include a table in this output.";

const PROMPT_1_8_TABLE =
  "[CONTEXT FOR THE MODEL] You are creating the tabular portion of a \"What happened during the trial?\" section for a Plain Language Summary. [REQUESTED TASK] After reading the CSR text appended below, produce an HTML table that outlines the main trial phases or steps and the key procedures or checks at each stage. Return only the table markup with a brief caption if needed.";

const PROMPT_1_6_ELIGIBILITY =
  "[CONTEXT FOR THE MODEL] You are writing the eligibility portion of a Plain Language Summary section on who took part in the trial. [REQUESTED TASK] After reading the CSR text appended below, explain in plain language who could join the study — disease type, prior treatments, age, and other key criteria. Keep it to 1–2 short paragraphs.";

const PROMPT_1_6_DEMOGRAPHICS =
  "[CONTEXT FOR THE MODEL] You are writing the demographics portion of a Plain Language Summary section on who took part in the trial. [REQUESTED TASK] After reading the CSR text appended below, summarize how many people enrolled, age ranges, gender breakdown, and common reasons participants left early. Present as a concise table suitable for a general audience.";

const PROMPT_1_9 =
  "[CONTEXT FOR THE MODEL] You are creating a \"What were the results of the trial?\" section for a Plain Language Summary. The text will be read by non-experts, so it must be friendly, concise, and free of scientific jargon. [REQUESTED TASK] After you review the CSR text appended below, please produce a clearly organized explanation of the study's findings. Specifically: 1. **Summarize the key endpoints or questions**. 2. **Mention each dose group** and highlight how the results differed from the placebo group in plain language. 3. If relevant, include any numerical results in an easy-to-understand way.";

const PROMPT_1_10 =
  "[CONTEXT FOR THE MODEL] You are preparing a section titled \"What medical problems did the participants have during the trial?\" for a Plain Language Summary intended for a general public audience. The text must be written in clear, plain language and organized with level 3 subheadings (using \"###\") to structure the information. [REQUESTED TASK] After reading the CSR text appended below, produce content with subheadings for Serious Adverse Events, Adverse Events Summary, and Common Side Effects.";

const PROMPT_1_11 =
  '[CONTEXT FOR THE MODEL] You are writing a brief section for a Plain Language Summary intended for a general audience. The section heading ("How has this trial helped?") will be provided separately, so do not include any headings or subheadings in your output. [REQUESTED TASK] After reading the CSR text appended below, produce one or two short paragraphs that: 1. Explain how the trial results helped researchers learn about the drug\'s effects and safety. 2. Emphasize why such trials are important. 3. Note that this summary reflects only one trial\'s findings.';

const PROMPT_1_12 =
  "[CONTEXT FOR THE MODEL] You are preparing a \"Where can I learn more about this trial?\" section for a Plain Language Summary aimed at a general public audience. This section should clearly direct readers to additional sources of information about the trial, such as clinical trial registries, published reports, or official websites. [REQUESTED TASK] After reading the CSR text that I will append below, produce a final output in valid markdown format that: 1. In plain language, explains that readers can find more details about the trial at the websites provided. 2. Lists the relevant websites or online resources as bullet points.";

export const DOCUMENT_BLOCKS: DocumentBlock[] = [
  {
    id: "h-1-3",
    type: "heading",
    level: 2,
    number: "1.3",
    title: "What has happened since the trial ended?",
  },
  {
    id: "c-1-3",
    type: "content",
    title: "Trial timeline",
    previewText: PROMPT_1_3.slice(0, 120) + "…",
    prompt: PROMPT_1_3,
    outputType: "OUTPUT_TYPE_SUMMARY",
    sources: SOURCES_1_3,
  },
  {
    id: "h-1-4",
    type: "heading",
    level: 2,
    number: "1.4",
    title: "New Heading",
  },
  {
    id: "h-1-5",
    type: "heading",
    level: 2,
    number: "1.5",
    title: "Why was the research needed?",
  },
  {
    id: "c-1-5",
    type: "content",
    title: "Background and study goals",
    previewText: PROMPT_1_5.slice(0, 120) + "…",
    prompt: PROMPT_1_5,
    outputType: "OUTPUT_TYPE_SUMMARY",
    sources: SOURCES_1_5,
  },
  {
    id: "h-1-6",
    type: "heading",
    level: 2,
    number: "1.6",
    title: "Who took part in the trial?",
  },
  {
    id: "c-1-6-eligibility",
    type: "content",
    title: "Who could take part",
    previewText: PROMPT_1_6_ELIGIBILITY.slice(0, 120) + "…",
    prompt: PROMPT_1_6_ELIGIBILITY,
    outputType: "OUTPUT_TYPE_SUMMARY",
    sources: SOURCES_1_6_ELIGIBILITY,
  },
  {
    id: "c-1-6-demographics",
    type: "content",
    title: "Participant numbers and demographics",
    previewText: PROMPT_1_6_DEMOGRAPHICS.slice(0, 120) + "…",
    prompt: PROMPT_1_6_DEMOGRAPHICS,
    outputType: "OUTPUT_TYPE_TABLE",
    sources: SOURCES_1_6_DEMOGRAPHICS,
  },
  {
    id: "h-1-7",
    type: "heading",
    level: 2,
    number: "1.7",
    title: "What kind of trial was this?",
  },
  {
    id: "c-1-7",
    type: "content",
    title: "Study design overview",
    previewText: PROMPT_1_7.slice(0, 120) + "…",
    prompt: PROMPT_1_7,
    outputType: "OUTPUT_TYPE_SUMMARY",
    sources: SOURCES_1_7,
  },
  {
    id: "h-1-8",
    type: "heading",
    level: 2,
    number: "1.8",
    title: "What happened during the trial?",
  },
  {
    id: "c-1-8-narrative",
    type: "content",
    title: "What participants did",
    previewText: PROMPT_1_8_NARRATIVE.slice(0, 120) + "…",
    prompt: PROMPT_1_8_NARRATIVE,
    outputType: "OUTPUT_TYPE_SUMMARY",
    sources: SOURCES_1_8_NARRATIVE,
  },
  {
    id: "c-1-8-schedule",
    type: "content",
    title: "Visit schedule",
    previewText: PROMPT_1_8_TABLE.slice(0, 120) + "…",
    prompt: PROMPT_1_8_TABLE,
    outputType: "OUTPUT_TYPE_TABLE",
    sources: SOURCES_1_8_SCHEDULE,
  },
  {
    id: "h-1-9",
    type: "heading",
    level: 2,
    number: "1.9",
    title: "What were the results of the trial?",
  },
  {
    id: "c-1-9",
    type: "content",
    title: "Key efficacy results",
    previewText: PROMPT_1_9.slice(0, 120) + "…",
    prompt: PROMPT_1_9,
    outputType: "OUTPUT_TYPE_SUMMARY",
    sources: SOURCES_1_9,
  },
  {
    id: "h-1-10",
    type: "heading",
    level: 2,
    number: "1.10",
    title: "What medical problems did the participants have during the trial?",
  },
  {
    id: "c-1-10",
    type: "content",
    title: "Safety and side effects",
    previewText: PROMPT_1_10.slice(0, 120) + "…",
    prompt: PROMPT_1_10,
    outputType: "OUTPUT_TYPE_SUMMARY",
    sources: SOURCES_1_10,
  },
  {
    id: "h-1-11",
    type: "heading",
    level: 2,
    number: "1.11",
    title: "How has this trial helped?",
  },
  {
    id: "c-1-11",
    type: "content",
    title: "What we learned",
    previewText: PROMPT_1_11.slice(0, 120) + "…",
    prompt: PROMPT_1_11,
    outputType: "OUTPUT_TYPE_SUMMARY",
    sources: SOURCES_1_11,
  },
  {
    id: "h-1-12",
    type: "heading",
    level: 2,
    number: "1.12",
    title: "Where can I learn more about this trial?",
  },
  {
    id: "c-1-12",
    type: "content",
    title: "Where to find more information",
    previewText: PROMPT_1_12.slice(0, 120) + "…",
    prompt: PROMPT_1_12,
    outputType: "OUTPUT_TYPE_SUMMARY",
    sources: SOURCES_1_12,
  },
  {
    id: "h-2",
    type: "heading",
    level: 1,
    number: "2",
    title: "Table of Contents",
  },
];

export const TOC_ITEMS: TocItem[] = DOCUMENT_BLOCKS.filter(
  (block): block is Extract<DocumentBlock, { type: "heading" }> =>
    block.type === "heading" && block.level <= 2 && block.number !== "",
).map((block) => ({
  id: block.id,
  label: `${block.number} ${block.title}`,
}));

export { getSourceLabel } from "./sourceHelpers";
