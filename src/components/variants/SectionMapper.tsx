import { Plus } from "lucide-react";
import type { RoadmapSource } from "../../data/roadmap";
import type { ContentBlockData } from "../../types";
import { SourcePill } from "./SourcePill";

/**
 * The sources area for a single section. Renders each source as an inline
 * SourcePill (confirm / swap / usage), shared by V2's expanded rows and V3's
 * mapping pane.
 */
export function SectionMapper({
  block,
  tracedSourceId,
  onTrace,
  onUpdateSource,
  onRemoveSource,
  onAddSource,
}: {
  block: ContentBlockData;
  tracedSourceId: string | null;
  onTrace?: (sourceId: string) => void;
  onUpdateSource: (source: RoadmapSource) => void;
  onRemoveSource: (sourceId: string) => void;
  onAddSource: () => void;
}) {
  return (
    <div className="space-y-2">
      {block.sources.length === 0 ? (
        <p className="py-1 text-center text-[13px] text-[#9e9e9e]">
          No sources mapped to this section.
        </p>
      ) : (
        block.sources.map((source) => (
          <SourcePill
            key={source.id}
            source={source}
            isTraced={tracedSourceId === source.id}
            onChange={onUpdateSource}
            onTrace={onTrace ? () => onTrace(source.id) : undefined}
            onRemove={() => onRemoveSource(source.id)}
          />
        ))
      )}
      <button
        type="button"
        onClick={onAddSource}
        className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-[#d4ced3] py-2 text-[13px] font-medium text-[#636161] transition-colors hover:border-[#ff4e49]/40 hover:bg-[#fffafa] hover:text-[#302f2f]"
      >
        <Plus size={14} /> Add source
      </button>
    </div>
  );
}
