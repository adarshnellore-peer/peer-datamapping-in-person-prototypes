import { LayoutList, Table2 } from "lucide-react";
import type { StudyDataSource } from "../../data/studyDataSources";
import type { RoadmapSource } from "../../data/roadmap";
import type { OutlineRefPayload, V2DragPayload } from "../../utils/v2DragPayload";
import { MatrixVariant } from "./MatrixVariant";
import { TwoColumnVariant } from "./TwoColumnVariant";
import type { MatrixTagRole, VariantProps } from "./types";

export type MappingSubview = "storyline" | "matrix";

const SUBVIEWS: {
  id: MappingSubview;
  label: string;
  title: string;
  icon: typeof LayoutList;
}[] = [
  {
    id: "storyline",
    label: "Storyline",
    title: "Section cards with evidence pills",
    icon: LayoutList,
  },
  {
    id: "matrix",
    label: "Matrix",
    title: "Source and reference columns",
    icon: Table2,
  },
];

export function MappingSubviewControl({
  view,
  onChange,
  inline = false,
}: {
  view: MappingSubview;
  onChange: (view: MappingSubview) => void;
  inline?: boolean;
}) {
  return (
    <div
      role="tablist"
      aria-label="Mapping layout"
      className={`peer-mapping-toggle ${inline ? "peer-mapping-toggle--inline" : ""}`}
    >
      {SUBVIEWS.map((option) => {
        const active = view === option.id;
        const Icon = option.icon;
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={active}
            title={option.title}
            onClick={() => onChange(option.id)}
            className={`peer-mapping-tab ${active ? "is-active" : ""}`}
          >
            <Icon size={14} strokeWidth={active ? 2.25 : 1.75} aria-hidden />
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

type StorylineProps = Omit<VariantProps, "onAddSource"> & {
  focusId?: string | null;
  scrollTick?: number;
  onMapStudySource: (blockId: string, studySourceId: string) => void;
  onMapStudySources?: (blockId: string, studySourceIds: string[]) => void;
  onMapOutlineRefToSection: (
    blockId: string,
    payload: OutlineRefPayload,
  ) => void;
  onMoveSource?: (
    fromBlockId: string,
    sourceId: string,
    toBlockId: string,
    toIndex?: number,
    formatRole?: import("../../data/roadmap").SourceFormatRole,
  ) => void;
  onMapStudySourceWithRole?: (
    blockId: string,
    studySourceId: string,
    role: import("../../data/roadmap").SourceFormatRole,
  ) => void;
  onPromptChange?: (blockId: string, prompt: string) => void;
  rolePickerMode?: "usage" | "format";
  onNavigateOutlineRef?: (source: RoadmapSource) => void;
  tlfOnly?: boolean;
};

type MatrixProps = VariantProps & {
  activeBlockId?: string | null;
  scrollTick?: number;
  columnMode?: "usage" | "format";
  rolePickerMode?: "usage" | "format";
  onMapStudySourceWithRole: (
    blockId: string,
    studySourceId: string,
    role: MatrixTagRole,
  ) => void;
  onMapStudySourcesWithRole?: (
    blockId: string,
    studySourceIds: string[],
    role: MatrixTagRole,
  ) => void;
  onMapOutlineRefWithRole: (
    toBlockId: string,
    payload: OutlineRefPayload,
    role: MatrixTagRole,
  ) => void;
  onHeadingSlotDrop: (
    slotHeadingId: string,
    role: MatrixTagRole,
    payload: V2DragPayload,
  ) => void;
  onMoveSourceToMatrixCell: (
    fromBlockId: string,
    sourceId: string,
    toBlockId: string,
    role: MatrixTagRole,
  ) => void;
  usageCountByStudySourceId?: Record<string, number>;
  placementsByStudySourceId?: Record<string, import("../../utils/studySourcePlacements").StudySourcePlacement[]>;
  onNavigateToPlacement?: (placement: import("../../utils/studySourcePlacements").StudySourcePlacement) => void;
  onStudySourceSelect?: (entry: StudyDataSource) => void;
  traceSource?: RoadmapSource | null;
  traceSectionTitle?: string | null;
  traceBlockSources?: RoadmapSource[];
  traceSourceId?: string | null;
  tracePanelMode?: "detail" | "list" | "navigate";
  onTraceSourceChange?: (sourceId: string) => void;
  onCloseTrace?: () => void;
  onUpdateMappedSource?: (source: RoadmapSource) => void;
  onNavigateBlock?: (blockId: string) => void;
  onMoveBlock?: (blockId: string, dropFlatIndex: number) => void;
  onAddHeadingAfter?: (headingId: string) => void;
  onAddContentAfter?: (contentId: string) => void;
  onDuplicateHeading?: (headingId: string) => void;
  onDuplicateContent?: (contentId: string) => void;
  onDeleteHeading?: (headingId: string) => void;
  onDeleteContent?: (blockId: string) => void;
  tlfOnly?: boolean;
};

/**
 * V6 — Unified mapping: V2 storyline board and V3 mode matrix with an in-canvas layout toggle.
 */
export function MappingVariant({
  subview,
  storyline,
  matrix,
}: {
  subview: MappingSubview;
  storyline: StorylineProps;
  matrix: MatrixProps;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      {subview === "storyline" ? (
        <TwoColumnVariant {...storyline} />
      ) : (
        <MatrixVariant {...matrix} />
      )}
    </div>
  );
}

export function usesStorylineLayout(
  variant: string,
  mappingSubview: MappingSubview,
): boolean {
  return variant === "twoColumn" || (variant === "mapping" && mappingSubview === "storyline");
}

export function usesMatrixLayout(variant: string, mappingSubview: MappingSubview): boolean {
  return variant === "matrix" || (variant === "mapping" && mappingSubview === "matrix");
}

export function usesMappingToc(variant: string, mappingSubview: MappingSubview): boolean {
  if (variant === "baseline" || variant === "twoColumn") return true;
  if (variant === "mapping" && mappingSubview === "storyline") return true;
  return false;
}
