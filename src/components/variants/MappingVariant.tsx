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

function MappingSubviewControl({
  view,
  onChange,
}: {
  view: MappingSubview;
  onChange: (view: MappingSubview) => void;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center px-4 sm:top-4">
      <div
        role="tablist"
        aria-label="Mapping layout"
        className="pointer-events-auto inline-flex items-center rounded-full border border-[#e4dfe3] bg-white/90 p-1 shadow-[0_4px_20px_rgba(48,47,47,0.07)] backdrop-blur-md"
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
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-medium leading-none transition-all duration-200 ${
                active
                  ? "bg-[#302f2f] text-white shadow-[0_1px_2px_rgba(0,0,0,0.12)]"
                  : "text-[#636161] hover:bg-[#f7f4f6] hover:text-[#302f2f]"
              }`}
            >
              <Icon size={14} strokeWidth={active ? 2.25 : 1.75} aria-hidden />
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

type StorylineProps = Omit<VariantProps, "onAddSource"> & {
  focusId?: string | null;
  onMapStudySource: (blockId: string, studySourceId: string) => void;
  onMapStudySources?: (blockId: string, studySourceIds: string[]) => void;
  onMapOutlineToSection: (
    blockId: string,
    sourceType: "SUBCONTENT" | "CONTENT",
    label: string,
  ) => void;
  onMoveSource?: (
    fromBlockId: string,
    sourceId: string,
    toBlockId: string,
    toIndex?: number,
  ) => void;
  onPromptChange?: (blockId: string, prompt: string) => void;
  onOutputTypeChange?: (blockId: string, outputType: string) => void;
  rolePickerMode?: "usage" | "format";
};

type MatrixProps = VariantProps & {
  activeBlockId?: string | null;
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
  onStudySourceSelect?: (entry: StudyDataSource) => void;
  traceSource?: RoadmapSource | null;
  traceSectionTitle?: string | null;
  traceBlockSources?: RoadmapSource[];
  traceSourceId?: string | null;
  tracePanelMode?: "detail" | "list";
  onTraceSourceChange?: (sourceId: string) => void;
  onCloseTrace?: () => void;
  onUpdateMappedSource?: (source: RoadmapSource) => void;
};

/**
 * V6 — Unified mapping: V2 storyline board and V3 mode matrix with an in-canvas layout toggle.
 */
export function MappingVariant({
  subview,
  onSubviewChange,
  storyline,
  matrix,
}: {
  subview: MappingSubview;
  onSubviewChange: (view: MappingSubview) => void;
  storyline: StorylineProps;
  matrix: MatrixProps;
}) {
  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <MappingSubviewControl view={subview} onChange={onSubviewChange} />
      <div className="min-h-0 flex-1 pt-12">
        {subview === "storyline" ? (
          <TwoColumnVariant {...storyline} />
        ) : (
          <MatrixVariant {...matrix} />
        )}
      </div>
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
