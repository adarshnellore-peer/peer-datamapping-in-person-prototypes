import { type DragEvent } from "react";
import { ExternalLink, SquareArrowDownLeft, X } from "lucide-react";
import type { RoadmapSource } from "../../data/roadmap";
import type { DocumentBlock } from "../../types";
import { getCompactEvidenceLabel, isInDocReferenceSource } from "./types";

export function EvidenceChip({
  source,
  blocks,
  isTraced,
  inDoc,
  onTrace,
  onNavigateOutlineRef,
  onRemove,
  mappedDrag,
}: {
  source: RoadmapSource;
  blocks?: DocumentBlock[];
  isTraced: boolean;
  inDoc?: boolean;
  onTrace?: () => void;
  onNavigateOutlineRef?: () => void;
  onRemove: () => void;
  mappedDrag?: {
    onDragStart: (event: DragEvent) => void;
    onDragEnd: () => void;
  };
}) {
  const isInternal = inDoc ?? isInDocReferenceSource(source);
  const label = getCompactEvidenceLabel(source, blocks);
  const Icon = isInternal ? SquareArrowDownLeft : ExternalLink;

  const handleClick = () => {
    if (isInternal && onNavigateOutlineRef) {
      onNavigateOutlineRef();
      return;
    }
    onTrace?.();
  };

  return (
    <div
      className={`peer-evidence-chip group/chip ${isTraced ? "is-traced" : ""} ${
        isInternal ? "peer-evidence-chip--internal" : "peer-evidence-chip--external"
      }`}
      draggable={Boolean(mappedDrag)}
      onDragStart={(event) => {
        event.stopPropagation();
        mappedDrag?.onDragStart(event);
      }}
      onDragEnd={(event) => {
        event.stopPropagation();
        mappedDrag?.onDragEnd();
      }}
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          handleClick();
        }}
        title={label}
        className="peer-evidence-chip-main"
      >
        <Icon size={12} strokeWidth={1.75} className="peer-evidence-chip-icon" aria-hidden />
        <span className="peer-evidence-chip-label">{label}</span>
      </button>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onRemove();
        }}
        aria-label="Remove"
        title="Remove"
        className="peer-evidence-chip-remove"
      >
        <X size={11} strokeWidth={1.75} />
      </button>
    </div>
  );
}
