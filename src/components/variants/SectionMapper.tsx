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
  allowSourceTypeChange = false,
}: {
  block: ContentBlockData;
  tracedSourceId: string | null;
  onTrace?: (sourceId: string) => void;
  onUpdateSource: (source: RoadmapSource) => void;
  onRemoveSource: (sourceId: string) => void;
  allowSourceTypeChange?: boolean;
}) {
  const traceOnFieldClick = Boolean(onTrace) && !allowSourceTypeChange;
  return (
    <div className="space-y-1.5">
      {block.sources.length === 0 ? (
        <p className="py-1 text-center text-[13px] text-[#9e9e9e]">
          No sources mapped to this section.
        </p>
      ) : (
        block.sources.map((source) => (
          <SourcePill
            key={source.id}
            source={source}
            variant="v2"
            allowSourceTypeChange={allowSourceTypeChange}
            traceOnFieldClick={traceOnFieldClick}
            isTraced={tracedSourceId === source.id}
            onChange={onUpdateSource}
            onTrace={onTrace ? () => onTrace(source.id) : undefined}
            onRemove={() => onRemoveSource(source.id)}
          />
        ))
      )}
    </div>
  );
}
