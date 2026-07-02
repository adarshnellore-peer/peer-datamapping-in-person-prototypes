import { useMemo, useRef, useState, type DragEvent } from "react";
import {
  ExternalLink,
  SquareArrowDownLeft,
  X,
} from "lucide-react";
import { getSourceLabel } from "../../data/sourceHelpers";
import type { RoadmapSource } from "../../data/roadmap";
import type { DocumentBlock } from "../../types";
import { getBundledSourcesForOutlineRef } from "../../utils/outlineRefEnrichment";
import { PortalPillDropdown } from "../shared/PortalPillDropdown";
import {
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
  const chipRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const label = getCompactEvidenceLabel(source, blocks);
  const tooltip = getOutlineRefTooltip(source) ?? label;
  const Icon = isInternal ? SquareArrowDownLeft : ExternalLink;
  const hasBundled = bundled.length > 0;
  const displayLabel = hasBundled ? `${label} (${bundled.length})` : label;
  const bundledMenuLabel = `Bundled sources for ${label}`;

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
            handleMainClick();
          }}
          aria-expanded={hasBundled ? bundledOpen : undefined}
          aria-haspopup={hasBundled ? "menu" : undefined}
          title={tooltip}
          className={`peer-evidence-chip-main ${hasBundled ? "peer-evidence-chip-main--expandable" : ""}`}
        >
          <Icon size={12} strokeWidth={1.75} className="peer-evidence-chip-icon" aria-hidden />
          <span className="peer-evidence-chip-label">{displayLabel}</span>
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

      {hasBundled ? (
        <PortalPillDropdown
          open={bundledOpen}
          anchorRef={chipRef}
          menuRef={menuRef}
          onClose={() => setBundledOpen(false)}
          ariaLabel={bundledMenuLabel}
          header={<span className="peer-library-eyebrow">Bundled sources</span>}
          items={bundled.map((item) => {
            const itemLabel = getSourceLabel(item);
            return {
              key: `${item.id}-${itemLabel}`,
              label: itemLabel,
              title: itemLabel,
            };
          })}
        />
      ) : null}
    </div>
  );
}
