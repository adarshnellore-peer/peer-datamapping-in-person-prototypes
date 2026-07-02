import { useMemo, useRef, useState, type DragEvent } from "react";
import {
  ExternalLink,
  SquareArrowDownLeft,
  X,
} from "lucide-react";
import type { RoadmapSource } from "../../data/roadmap";
import type { DocumentBlock } from "../../types";
import { getBundledSourcesForOutlineRef } from "../../utils/outlineRefEnrichment";
import { PortalPillDropdown } from "../shared/PortalPillDropdown";
import {
  getCompactEvidenceLabel,
  getOutlineRefSubsectionCount,
  getOutlineRefTooltip,
  isInDocReferenceSource,
} from "./types";

function BundledEvidenceChip({
  source,
  blocks,
  onTrace,
  onNavigateOutlineRef,
}: {
  source: RoadmapSource;
  blocks?: DocumentBlock[];
  onTrace?: () => void;
  onNavigateOutlineRef?: () => void;
}) {
  return (
    <EvidenceChip
      source={source}
      blocks={blocks}
      isTraced={false}
      readOnly
      inDoc={isInDocReferenceSource(source)}
      onTrace={onTrace}
      onNavigateOutlineRef={onNavigateOutlineRef}
      onRemove={() => {}}
    />
  );
}

export function EvidenceChip({
  source,
  blocks,
  isTraced,
  inDoc,
  readOnly = false,
  onTrace,
  onRemove,
  onNavigateOutlineRef,
  mappedDrag,
}: {
  source: RoadmapSource;
  blocks?: DocumentBlock[];
  isTraced: boolean;
  inDoc?: boolean;
  readOnly?: boolean;
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
  const chipRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const label = getCompactEvidenceLabel(source, blocks);
  const tooltip = getOutlineRefTooltip(source) ?? label;
  const Icon = isInternal ? SquareArrowDownLeft : ExternalLink;
  const hasBundled = bundled.length > 0;
  const subsectionCount =
    blocks && blocks.length > 0 ? getOutlineRefSubsectionCount(source, blocks) : undefined;
  const bundledMenuLabel = `Sources in ${label}`;

  const handleMainClick = () => {
    if (hasBundled) {
      setBundledOpen((value) => !value);
      return;
    }
    if (!isInternal) {
      onTrace?.();
    }
  };

  return (
    <div
      ref={chipRef}
      className={`peer-evidence-chip-wrap ${hasBundled ? "has-bundled" : ""} ${
        bundledOpen ? "is-bundled-open" : ""
      }`}
    >
      <div
        className={`peer-evidence-chip group/chip ${isTraced ? "is-traced" : ""} ${
          isInternal ? "peer-evidence-chip--internal" : "peer-evidence-chip--external"
        } ${bundledOpen ? "is-menu-open" : ""}`}
        draggable={Boolean(mappedDrag) && !readOnly}
        onDragStart={(event) => {
          if (readOnly) return;
          event.stopPropagation();
          mappedDrag?.onDragStart(event);
        }}
        onDragEnd={(event) => {
          if (readOnly) return;
          event.stopPropagation();
          mappedDrag?.onDragEnd();
        }}
      >
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            handleMainClick();
          }}
          aria-expanded={hasBundled ? bundledOpen : undefined}
          aria-haspopup={hasBundled ? "menu" : undefined}
          title={tooltip}
          className={`peer-evidence-chip-main ${hasBundled ? "peer-evidence-chip-main--expandable" : ""}`}
        >
          <Icon size={12} strokeWidth={1.75} className="peer-evidence-chip-icon" aria-hidden />
          <span className="peer-evidence-chip-label-wrap">
            <span className="peer-evidence-chip-label">{label}</span>
            {subsectionCount != null ? (
              <span className="peer-evidence-chip-count">({subsectionCount})</span>
            ) : null}
          </span>
        </button>
        {!readOnly ? (
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
        ) : null}
      </div>

      {hasBundled ? (
        <PortalPillDropdown
          open={bundledOpen}
          anchorRef={chipRef}
          menuRef={menuRef}
          onClose={() => setBundledOpen(false)}
          ariaLabel={bundledMenuLabel}
          className="peer-bundled-evidence-menu"
        >
          <div className="peer-evidence-chip-row peer-evidence-chip-row--menu">
            {bundled.map((item) => (
              <BundledEvidenceChip
                key={item.id}
                source={item}
                blocks={blocks}
                onTrace={
                  !isInDocReferenceSource(item) && onTrace ? () => onTrace() : undefined
                }
                onNavigateOutlineRef={onNavigateOutlineRef}
              />
            ))}
          </div>
        </PortalPillDropdown>
      ) : null}
    </div>
  );
}
