import type { DocumentBlock, TocItem } from "../types";
import type { DataSourceRoadmapSource, RoadmapSource, SourceRole } from "./roadmap";
import {
  consolidateDocumentBlocks,
} from "../utils/dataSourceReferences";

function src(
  id: string,
  dataSource: string,
  referenceKey: string,
  sectionName: string,
  documentCategory: string,
  status: "proposed" | "confirmed" = "confirmed",
  role: SourceRole = "primary",
): DataSourceRoadmapSource {
  return {
    id,
    status,
    role,
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
    "Clinical Study Report",
    "Study Design and Objectives: 84-112",
    "Study Design",
    "CSR",
    "proposed",
  ),
];

/** 1.5 — why research was needed */
const SOURCES_1_5: RoadmapSource[] = [
  src(
    "s-1-5-1",
    "Biogen Clinical Study Report Template",
    "Template Study Design: 142-148",
    "Template Study Design",
    "Template",
  ),
  src(
    "s-1-5-2",
    "Clinical Study Report",
    "CSR Intro Sections: 29-83",
    "CSR Intro Sections",
    "CSR",
    "confirmed",
    "supporting",
  ),
  src(
    "s-1-5-3",
    "Clinical Study Report",
    "CSR Intro Sections: 29-83",
    "CSR Intro Sections",
    "CSR",
    "proposed",
    "context",
  ),
];

/** 1.6 — eligibility */
const SOURCES_1_6_ELIGIBILITY: RoadmapSource[] = [
  src(
    "s-1-6e-1",
    "Clinical Study Report",
    "Study Design and Objectives: 84-112",
    "Study Design",
    "CSR",
  ),
  src(
    "s-1-6e-2",
    "Biogen Clinical Study Report Template",
    "Template CSR Intro Sections0.8: 168-174",
    "Template CSR Intro Sections0.8",
    "Template",
  ),
];

/** 1.6 — demographics table */
const SOURCES_1_6_DEMOGRAPHICS: RoadmapSource[] = [
  src(
    "s-1-6d-1",
    "TLF Package — Efficacy (Tables)",
    "Endpoint Definitions: 2-9",
    "Endpoint Definitions",
    "TLF",
  ),
  src(
    "s-1-6d-2",
    "TLF Package — Efficacy (Tables)",
    "Table 14.2.1 Primary Endpoint: 5-12",
    "Table 14.2.1 Primary Endpoint",
    "TLF",
    "confirmed",
    "supporting",
  ),
  src(
    "s-1-6d-3",
    "Clinical Study Report",
    "Study Design and Objectives: 84-112",
    "Study Design and Objectives",
    "CSR",
    "proposed",
    "context",
  ),
];

/** 1.7 — study design */
const SOURCES_1_7: RoadmapSource[] = [
  src(
    "s-1-7-1",
    "Clinical Study Report",
    "Study Design and Objectives: 84-112",
    "Study Design",
    "CSR",
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
    "Template Study Design: 142-148",
    "Template Study Design",
    "Template",
  ),
  src(
    "s-1-8n-2",
    "Clinical Study Report",
    "Study Design and Objectives: 84-112",
    "Study Design",
    "CSR",
  ),
];

/** 1.8 — visit schedule table */
const SOURCES_1_8_SCHEDULE: RoadmapSource[] = [
  src(
    "s-1-8t-1",
    "Biogen Clinical Study Report Template",
    "Template Study Design: 142-148",
    "Template Study Design",
    "Template",
  ),
  src(
    "s-1-8t-2",
    "Clinical Study Report",
    "Study Design and Objectives: 84-112",
    "Study Design",
    "CSR",
  ),
  src(
    "s-1-8t-3",
    "TLF Package — Efficacy (Tables)",
    "Endpoint Definitions: 2-9",
    "Introduction",
    "TLF",
    "proposed",
  ),
];

/** 1.9 — efficacy results */
const SOURCES_1_9: RoadmapSource[] = [
  src(
    "s-1-9-1",
    "TLF Package — Efficacy (Tables)",
    "Table 14.2.1 Primary Endpoint: 5-12",
    "Table 14.2.1 Primary Endpoint",
    "TLF",
  ),
  src(
    "s-1-9-2",
    "TLF Package — Efficacy (Tables)",
    "Endpoint Definitions: 2-9",
    "Endpoint Definitions",
    "TLF",
    "confirmed",
    "supporting",
  ),
  src(
    "s-1-9-3",
    "Clinical Study Report",
    "Efficacy Results — Primary Endpoint: 198-224",
    "Efficacy Results — Primary Endpoint",
    "CSR",
    "confirmed",
    "supporting",
  ),
  src(
    "s-1-9-4",
    "Data Management Plan",
    "Table 14.2.1 Primary Endpoint: 5-12",
    "Table 14.2.1 Primary Endpoint",
    "TLF",
    "proposed",
    "context",
  ),
];

/** 1.10 — safety (aligned with CSR §12.2 AE mapping patterns) */
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
    "Safety Tables — Treatment-Emergent AEs",
    "TEAE Overview: 1-3",
    "TEAE Overview",
    "TLF",
    "confirmed",
    "primary",
  ),
  src(
    "s-1-10-3",
    "Safety Tables — Treatment-Emergent AEs",
    "TEAE by Maximum Severity: 30-35",
    "TEAE by Maximum Severity",
    "TLF",
    "confirmed",
    "supporting",
  ),
  src(
    "s-1-10-4",
    "TLF Package — Efficacy (Tables)",
    "Table 14.3.1 Exposure: 1-5",
    "Table 14.3.1 Exposure",
    "TLF",
    "confirmed",
    "reference",
  ),
  src(
    "s-1-10-5",
    "Biogen Clinical Study Report Template",
    "Template CSR Intro Sections1.9.2: 198-204",
    "Template CSR Intro Sections1.9.2",
    "Template",
    "proposed",
    "reference",
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
    "Template Study Design: 142-148",
    "Template Study Design",
    "Template",
  ),
];

/** 1.12 — where to learn more */
const SOURCES_1_12: RoadmapSource[] = [
  src(
    "s-1-12-1",
    "Clinical Study Report",
    "Synopsis: 3-13",
    "Synopsis",
    "CSR",
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
    "Biogen Clinical Study Report Template",
    "Synopsis: 3-13",
    "Synopsis",
    "CSR",
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

function h(id: string, level: 1 | 2 | 3, number: string, title: string): DocumentBlock {
  return { id, type: "heading", level, number, title };
}

function c(
  id: string,
  title: string,
  outputType: string,
  sources: RoadmapSource[],
): DocumentBlock {
  return {
    id,
    type: "content",
    title,
    previewText: "",
    prompt: "",
    outputType,
    sources,
  };
}

/**
 * Full CSR body (ICH E3 structure) so the section list reflects a realistic
 * document — dozens of sections, each mapped to several of the study's sources.
 */
const CSR_BODY: DocumentBlock[] = [
  h("h-2", 1, "2", "Synopsis"),
  c("c-2-1", "Study synopsis", "OUTPUT_TYPE_SUMMARY", [
    src("s-2-1-1", "Clinical Study Report", "Synopsis: 3-13", "Synopsis", "CSR"),
    src("s-2-1-2", "Clinical Study Report", "Synopsis: 3-13", "Synopsis", "CSR"),
  ]),

  h("h-3", 1, "3", "Introduction"),
  c("c-3-1", "Background and rationale", "OUTPUT_TYPE_SUMMARY", [
    src("s-3-1-1", "Clinical Study Report", "CSR Intro Sections: 29-83", "CSR Intro Sections", "CSR"),
    src("s-3-1-2", "Investigator's Brochure Edition 8", "Nonclinical Summary: 22-61", "Nonclinical Summary", "IB"),
    src("s-3-1-3", "Investigator's Brochure Edition 8", "Nonclinical Summary: 22-61", "CSR Intro Sections", "CSR", "proposed"),
  ]),

  h("h-4", 1, "4", "Study Objectives"),
  c("c-4-1", "Primary and secondary objectives", "OUTPUT_TYPE_SUMMARY", [
    src("s-4-1-1", "Clinical Study Report", "Study Design and Objectives: 84-112", "Study Objectives", "CSR"),
    src("s-4-1-2", "TLF Package — Efficacy (Tables)", "Endpoint Definitions: 2-9", "Endpoint Definitions", "TLF"),
  ]),

  h("h-5", 1, "5", "Investigational Plan"),
  c("c-5-1", "Overall study design", "OUTPUT_TYPE_SUMMARY", [
    src("s-5-1-1", "Clinical Study Report", "Study Design and Objectives: 84-112", "Study Design", "CSR"),
    src("s-5-1-2", "Clinical Study Report", "Study Design and Objectives: 84-112", "Study Design and Objectives", "CSR"),
  ]),
  c("c-5-2", "Selection of study population", "OUTPUT_TYPE_SUMMARY", [
    src("s-5-2-1", "Clinical Study Report", "CSR Intro Sections: 29-83", "Study Population", "CSR"),
    src("s-5-2-2", "TLF Package — Efficacy (Tables)", "Table 14.2.1 Primary Endpoint: 5-12", "Table 14.2.1 Primary Endpoint", "TLF"),
  ]),
  c("c-5-3", "Treatments administered", "OUTPUT_TYPE_SUMMARY", [
    src("s-5-3-1", "Clinical Study Report", "CSR Intro Sections: 29-83", "Treatments", "CSR"),
    src("s-5-3-2", "Investigator's Brochure Edition 8", "Pharmaceutical Information: 88-104", "Pharmaceutical Information", "IB", "proposed"),
  ]),
  c("c-5-4", "Efficacy and safety variables", "OUTPUT_TYPE_SUMMARY", [
    src("s-5-4-1", "TLF Package — Efficacy (Tables)", "Endpoint Definitions: 2-9", "Endpoint Definitions", "TLF"),
    src("s-5-4-2", "TLF Package — Efficacy (Tables)", "Endpoint Definitions: 2-9", "Endpoint Definitions", "TLF"),
  ]),
  c("c-5-5", "Statistical methods", "OUTPUT_TYPE_SUMMARY", [
    src("s-5-5-1", "TLF Package — Efficacy (Tables)", "Table 14.2.1 Primary Endpoint: 5-12", "Primary Endpoint Table", "TLF"),
    src("s-5-5-2", "TLF Package — Efficacy (Listings)", "Listing 16.2.6 Subgroups: 30-72", "Subgroup Listing", "TLF", "proposed"),
  ]),

  h("h-6", 1, "6", "Study Patients"),
  c("c-6-1", "Disposition of patients", "OUTPUT_TYPE_TABLE", [
    src("s-6-1-1", "TLF Package — Disposition & Demographics", "Table 14.1.1 Disposition: 1-4", "Table 14.1.1 Disposition", "TLF"),
    src("s-6-1-2", "Clinical Data Review Listing", "Subject Disposition Listing: 12-40", "Subject Disposition Listing", "Data"),
  ]),
  c("c-6-2", "Protocol deviations", "OUTPUT_TYPE_TABLE", [
    src("s-6-2-1", "Clinical Data Review Listing", "Subject Disposition Listing: 12-40", "Subject Disposition Listing", "Data"),
    src("s-6-2-2", "Data Management Plan", "Deviation Handling: 18-24", "Deviation Handling", "Data", "proposed"),
  ]),

  h("h-7", 1, "7", "Efficacy Evaluation"),
  c("c-7-1", "Primary endpoint results", "OUTPUT_TYPE_TABLE", [
    src("s-7-1-1", "TLF Package — Efficacy (Tables)", "Table 14.2.1 Primary Endpoint: 5-12", "Table 14.2.1 Primary Endpoint", "TLF"),
    src("s-7-1-2", "Clinical Study Report", "Efficacy Results — Primary Endpoint: 198-224", "Efficacy Results — Primary Endpoint", "CSR", "confirmed", "supporting"),
    src("s-7-1-3", "TLF Package — Efficacy (Tables)", "Table 14.2.1 Primary Endpoint: 5-12", "Primary Endpoint Table", "TLF", "confirmed", "context"),
  ]),
  c("c-7-2", "Secondary endpoint results", "OUTPUT_TYPE_TABLE", [
    src("s-7-2-1", "TLF Package — Efficacy (Figures)", "Figure 14.2.4 Secondary Endpoints: 1-8", "Figure 14.2.4 Secondary Endpoints", "TLF"),
    src("s-7-2-2", "TLF Package — Efficacy (Tables)", "Endpoint Definitions: 2-9", "Endpoint Definitions", "TLF"),
  ]),
  c("c-7-3", "Subgroup analyses", "OUTPUT_TYPE_TABLE", [
    src("s-7-3-1", "TLF Package — Efficacy (Listings)", "Listing 16.2.6 Subgroups: 30-72", "Listing 16.2.6 Subgroups", "TLF", "proposed"),
    src("s-7-3-2", "TLF Package — Efficacy (Tables)", "Listing 16.2.6 Subgroups: 30-72", "Subgroup Listing", "TLF"),
  ]),
  c("c-7-4", "Pharmacokinetic results", "OUTPUT_TYPE_TABLE", [
    src("s-7-4-1", "TLF Package — Pharmacokinetics", "Table 14.3.1 PK Parameters: 1-6", "Table 14.3.1 PK Parameters", "TLF"),
    src("s-7-4-2", "Pharmacokinetic Analysis Report", "Summary of PK Parameters: 14-39", "Summary of PK Parameters", "Report"),
    src("s-7-4-3", "Bioanalytical Report", "Assay Validation: 5-22", "Assay Validation", "Report", "proposed"),
  ]),

  h("h-8", 1, "8", "Safety Evaluation"),
  c("c-8-1", "Extent of exposure", "OUTPUT_TYPE_TABLE", [
    src("s-8-1-1", "TLF Package — Safety (Tables)", "Table 14.3.1 Exposure: 1-5", "Table 14.3.1 Exposure", "TLF"),
    src("s-8-1-2", "Safety Tables — Treatment-Emergent AEs", "Exposure Summary: 1-3", "Exposure Summary", "TLF", "confirmed", "primary"),
    src("s-8-1-3", "Biogen Clinical Study Report Template", "CSR Intro Sections2.1 Extent of Exposure: 41-42", "CSR Intro Sections2.1", "Template", "confirmed", "reference"),
    src("s-8-1-4", "TLF Package — Efficacy (Tables)", "Table 14.3.1 Exposure: 1-5", "Table 14.3.1 Exposure", "TLF", "confirmed", "reference"),
  ]),
  c("c-8-2", "Adverse events", "OUTPUT_TYPE_TABLE", [
    src("s-8-2-1", "Safety Tables — Treatment-Emergent AEs", "TEAE by System Organ Class: 4-28", "TEAE by System Organ Class", "TLF"),
    src("s-8-2-1b", "Safety Tables — Treatment-Emergent AEs", "TEAE Treatment-Related: 29-35", "Treatment-Related TEAEs", "TLF", "confirmed", "primary"),
    src("s-8-2-2", "Clinical Study Report", "Safety Summary — Adverse Events: 312-348", "Safety Summary — Adverse Events", "CSR", "confirmed", "supporting"),
    src("s-8-2-3", "TLF Package — Efficacy (Tables)", "Table 14.3.1 Exposure: 1-5", "Table 14.3.1 Exposure", "TLF", "confirmed", "reference"),
    src("s-8-2-4", "Biogen Clinical Study Report Template", "CSR Intro Sections2.2.2 Display of AEs: 44-45", "CSR Intro Sections2.2.2", "Template", "proposed"),
  ]),
  c("c-8-3", "Serious adverse events and deaths", "OUTPUT_TYPE_TABLE", [
    src("s-8-3-1", "Safety Tables — Serious AEs", "SAE Summary: 1-14", "SAE Summary", "TLF"),
    src("s-8-3-2", "TLF Package — Safety (Listings)", "Listing 16.2.7.2 SAE Listing: 1-40", "SAE Listing", "TLF", "confirmed", "primary"),
    src("s-8-3-3", "Clinical Study Report", "Safety Summary — SAEs: 312-348", "Safety Summary — SAEs", "CSR", "confirmed", "supporting"),
    src("s-8-3-4", "DSUR 2024", "Cumulative SAE Review: 22-46", "Cumulative SAE Review", "Report", "proposed", "reference"),
  ]),
  c("c-8-4", "Clinical laboratory evaluation", "OUTPUT_TYPE_TABLE", [
    src("s-8-4-1", "Safety Tables — Laboratory Abnormalities", "Lab Shift Tables: 1-19", "Lab Shift Tables", "TLF"),
    src("s-8-4-2", "TLF Package — Safety (Listings)", "Listing 16.2.8 Lab Abnormalities: 80-140", "Listing 16.2.8 Lab Abnormalities", "TLF", "confirmed", "primary"),
    src("s-8-4-3", "TLF Package — Safety (Figures)", "Figure 14.3.1 Lab Trends: 1-8", "Lab Trends Figure", "TLF", "confirmed", "supporting"),
    src("s-8-4-4", "TLF Package — Efficacy (Tables)", "Listing 16.2.8 Lab Abnormalities: 80-140", "Lab Abnormalities Listing", "TLF", "confirmed", "reference"),
  ]),
  c("c-8-5", "Vital signs and physical findings", "OUTPUT_TYPE_SUMMARY", [
    src("s-8-5-1", "TLF Package — Safety (Figures)", "Figure 14.3.7 Vital Signs: 9-15", "Figure 14.3.7 Vital Signs", "TLF"),
  ]),

  h("h-9", 1, "9", "Discussion and Overall Conclusions"),
  c("c-9-1", "Benefit-risk discussion", "OUTPUT_TYPE_SUMMARY", [
    src("s-9-1-1", "Clinical Study Report", "Discussion and Conclusions: 410-438", "Discussion and Conclusions", "CSR"),
    src("s-9-1-2", "Risk Management Plan", "Benefit-Risk Summary: 30-52", "Benefit-Risk Summary", "Report", "proposed"),
  ]),

  h("h-10", 1, "10", "Reference List"),
  c("c-10-1", "References", "OUTPUT_TYPE_SUMMARY", [
    src("s-10-1-1", "ICH E3 Reporting Guidance", "Full Guidance: 1-48", "Full Guidance", "Reference"),
    src("s-10-1-2", "FDA Guidance — Clinical Study Reports", "Full Guidance: 1-22", "Full Guidance", "Reference"),
    src("s-10-1-3", "EMA Guideline on Clinical Study Reports", "Full Guideline: 1-30", "Full Guideline", "Reference", "proposed"),
  ]),

  h("h-11", 1, "11", "Appendices"),
  c("c-11-1", "Study information appendix", "OUTPUT_TYPE_SUMMARY", [
    src("s-11-1-1", "ADaM Define.xml", "Dataset Definitions: 1-60", "Dataset Definitions", "Data"),
    src("s-11-1-2", "SDTM Annotated CRF", "Annotated CRF: 1-44", "Annotated CRF", "Data"),
    src("s-11-1-3", "CSR Style Guide", "Formatting Conventions: 4-12", "Formatting Conventions", "Reference", "proposed"),
  ]),
];

const RAW_DOCUMENT_BLOCKS: DocumentBlock[] = [
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
  ...CSR_BODY,
];

export const DOCUMENT_BLOCKS: DocumentBlock[] = consolidateDocumentBlocks(RAW_DOCUMENT_BLOCKS);

export const TOC_ITEMS: TocItem[] = DOCUMENT_BLOCKS.filter(
  (block): block is Extract<DocumentBlock, { type: "heading" }> =>
    block.type === "heading" && block.level <= 2 && block.number !== "",
).map((block) => ({
  id: block.id,
  label: `${block.number} ${block.title}`,
}));

export { getSourceLabel } from "./sourceHelpers";
