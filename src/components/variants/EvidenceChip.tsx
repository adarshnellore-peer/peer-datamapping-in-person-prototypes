import { useMemo, useState, type DragEvent } from "react";
import {
  ChevronDown,
  ExternalLink,
  SquareArrowDownLeft,
  X,
} from "lucide-react";
import { getSourceLabel } from "../../data/sourceHelpers";
import type { RoadmapSource } from "../../data/roadmap";
import type { DocumentBlock } from "../../types";
import { getBundledSourcesForOutlineRef } from "../../utils/outlineRefEnrichment";
import {
  artifactTypeIcon,
  artifactTypeIconColor,
  artifactTypeLabel,
  getCompactEvidenceLabel,
  getOutlineRefTooltip,
  isInDocReferenceSource,
} from "./types";

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
  const bundled = useMemo(() => {
    if (!isInternal) return [];
    return getBundledSourcesForOutlineRef(source, blocks ?? []);
  }, [isInternal, source, blocks]);
  const [bundledOpen, setBundledOpen] = useState(false);

  const isPendingDescriptor =
    isInternal &&
    source.status === "proposed" &&
    !(source.sourceType === "CONTENT" || source.sourceType === "SUBCONTENT"
      ? source.aiDescriptor?.trim()
      : false);
  const label = isPendingDescriptor
    ? `${getCompactEvidenceLabel(source, blocks)}…`
    : getCompactEvidenceLabel(source, blocks);
  const tooltip = getOutlineRefTooltip(source) ?? label;
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
      className={`peer-evidence-chip-wrap ${bundled.length > 0 ? "has-bundled" : ""} ${
        bundledOpen ? "is-bundled-open" : ""
      }`}
    >
      <div
        className={`peer-evidence-chip group/chip ${isTraced ? "is-traced" : ""} ${
          isPendingDescriptor ? "is-pending-descriptor" : ""
        } ${isInternal ? "peer-evidence-chip--internal" : "peer-evidence-chip--external"}`}
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
        {bundled.length > 0 ? (
          <button
            type="button"
            aria-expanded={bundledOpen}
            aria-label={`${bundledOpen ? "Hide" : "Show"} ${bundled.length} bundled sources`}
            onClick={(event) => {
              event.stopPropagation();
              setBundledOpen((value) => !value);
            }}
            className="peer-evidence-chip-expand"
          >
            <ChevronDown
              size={11}
              strokeWidth={2}
              className={`peer-evidence-chip-expand-icon ${bundledOpen ? "is-open" : ""}`}
              aria-hidden
            />
          </button>
        ) : null}
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            handleClick();
          }}
          title={tooltip}
          className="peer-evidence-chip-main"
        >
          <Icon size={12} strokeWidth={1.75} className="peer-evidence-chip-icon" aria-hidden />
          <span className="peer-evidence-chip-label">{label}</span>
          {bundled.length > 0 && !bundledOpen ? (
            <span className="peer-evidence-chip-bundled-count">{bundled.length}</span>
          ) : null}
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

      {bundledOpen && bundled.length > 0 ? (
        <div className="peer-evidence-bundled-panel" role="region" aria-label="Bundled sources">
          <p className="peer-evidence-bundled-panel-label">From outline</p>
          <div className="peer-evidence-bundled-panel-chips">
            {bundled.map((item) => {
              const TypeIcon = artifactTypeIcon(item, blocks);
              const iconColor = artifactTypeIconColor(item, blocks);
              const typeLabel = artifactTypeLabel(item, blocks);
              const itemLabel = getSourceLabel(item);
              return (
                <div
                  key={`${item.id}-${itemLabel}`}
                  className="peer-evidence-chip peer-evidence-chip--external peer-evidence-chip--bundled-readonly"
                  title={itemLabel}
                >
                  <div className="peer-evidence-chip-main peer-evidence-chip-main--readonly">
                    <TypeIcon
                      size={12}
                      strokeWidth={1.75}
                      className="peer-evidence-chip-icon"
                      style={{ color: iconColor }}
                      aria-hidden
                    />
                    <span className="peer-evidence-chip-type">{typeLabel}</span>
                    <span className="peer-evidence-chip-label">{itemLabel}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
