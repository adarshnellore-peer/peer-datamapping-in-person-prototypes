import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { GripVertical, Plus, X } from "lucide-react";
import { PillOptionPicker } from "../CollapsiblePillField";
import {
  CONTENT_OPTIONS,
  DATA_SOURCES,
  DATA_SOURCE_CATEGORY_ORDER,
  REFERENCE_SOURCE_OPTIONS,
  SOURCE_ROLES,
  SOURCE_TYPES,
  SUBCONTENT_OPTIONS,
  enrichDataSourceSource,
  getDocumentCategory,
  getReferenceKeysForDataSource,
  withSourceType,
  type DataSourceRoadmapSource,
  type RoadmapSource,
  type SourceFormatRole,
  type SourceRole,
  type SourceType,
} from "../../data/roadmap";
import {
  FORMAT_ROLE_BADGE,
  FORMAT_ROLE_BADGE_PICKER,
  ROLE_BADGE,
  ROLE_BADGE_PICKER,
  SOURCE_FORMAT_ROLES,
  artifactTypeIconColor,
  effectiveFormatRole,
  effectiveSourceRole,
  formatRoleHint,
  formatRoleLabel,
  roleLabel,
  ROLE_HINT,
  artifactTypeLabel,
  artifactTypeIcon,
  artifactTypeIconKind,
} from "./types";
import {
  appendReferenceKeyToDataSource,
  getDataSourceReferenceKeys,
  removeReferenceKeyFromDataSource,
  replaceReferenceKeyOnDataSource,
} from "../../utils/dataSourceReferences";

type ActiveField = "sourceType" | "document" | "pages" | "role" | null;
type PagesTarget = string | "__add__";

function selectableReferenceKeys(
  dataSourceName: string,
  selectedKeys: string[],
  editingKey?: string | null,
): string[] {
  const taken = new Set(selectedKeys.filter((key) => key !== editingKey));
  return getReferenceKeysForDataSource(dataSourceName).filter((key) => !taken.has(key));
}

const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  DATA_SOURCE: "Data source",
  SUBCONTENT: "Subcontent",
  CONTENT: "Content",
  REFERENCE_SOURCE: "Reference source",
};

const ROLE_CHIP_BASE =
  "inline-flex h-[18px] shrink-0 items-center rounded-full border px-1.5 text-[10px] font-semibold leading-none transition-colors";

function OutlineTypeBadge({ sourceType }: { sourceType: "CONTENT" | "SUBCONTENT" }) {
  const label = sourceType === "CONTENT" ? "Content" : "Subcontent";
  const badgeClass =
    sourceType === "CONTENT"
      ? "border-[#94a3b8] bg-[#f1f5f9] text-[#475569]"
      : "border-[#cbd5e1] bg-[#f8fafc] text-[#64748b]";

  return (
    <span
      className={`${ROLE_CHIP_BASE} ${badgeClass}`}
      aria-label={`Type: ${label}`}
      title={label}
    >
      {label}
    </span>
  );
}

function FormatRoleToggle({
  formatRole,
  onSelectRole,
}: {
  formatRole: SourceFormatRole | undefined;
  onSelectRole: (role: SourceFormatRole) => void;
}) {
  const current = formatRole ?? "source";

  return (
    <div
      role="radiogroup"
      aria-label="Source or reference"
      className="peer-format-role-toggle"
      onClick={(event) => event.stopPropagation()}
    >
      {SOURCE_FORMAT_ROLES.map((option) => {
        const selected = current === option;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={selected}
            title={formatRoleHint(option)}
            onClick={() => {
              if (!selected) onSelectRole(option);
            }}
            className={`peer-format-role-toggle-btn peer-format-role-toggle-btn--${option} ${
              selected ? "is-selected" : ""
            }`}
          >
            {formatRoleLabel(option)}
          </button>
        );
      })}
    </div>
  );
}

function SourceTypeAndRole({
  source,
  role,
  formatRole,
  rolePickerMode,
  activeField,
  allowSourceTypeChange,
  onToggleType,
  onToggleRole,
  onSelectFormatRole,
  artifactBlocks,
  iconSize = "md",
}: {
  source: RoadmapSource;
  role: SourceRole | undefined;
  formatRole: SourceFormatRole | undefined;
  rolePickerMode: "usage" | "format";
  activeField: ActiveField;
  allowSourceTypeChange: boolean;
  onToggleType: () => void;
  onToggleRole: () => void;
  onSelectFormatRole: (role: SourceFormatRole) => void;
  artifactBlocks?: import("../../types").DocumentBlock[];
  iconSize?: "sm" | "md";
}) {
  if (source.sourceType === "CONTENT" || source.sourceType === "SUBCONTENT") {
    return (
      <div className="flex min-w-0 shrink-0 items-center gap-1.5">
        <ArtifactTypeTag
          source={source}
          active={activeField === "sourceType"}
          allowSourceTypeChange={allowSourceTypeChange}
          onToggleType={onToggleType}
          artifactBlocks={artifactBlocks}
          size={iconSize}
        />
        <OutlineTypeBadge sourceType={source.sourceType} />
      </div>
    );
  }

  return (
    <div className="flex min-w-0 shrink-0 items-center gap-2">
      <ArtifactTypeTag
          source={source}
          active={activeField === "sourceType"}
          allowSourceTypeChange={allowSourceTypeChange}
          onToggleType={onToggleType}
          artifactBlocks={artifactBlocks}
          size={iconSize}
      />
      {rolePickerMode === "format" ? (
        <FormatRoleToggle formatRole={formatRole} onSelectRole={onSelectFormatRole} />
      ) : (
        <RoleBadge
          role={role}
          active={activeField === "role"}
          onClick={onToggleRole}
        />
      )}
    </div>
  );
}

function ArtifactTypeTag({
  source,
  active,
  allowSourceTypeChange,
  onToggleType,
  artifactBlocks,
  size = "md",
}: {
  source: RoadmapSource;
  active: boolean;
  allowSourceTypeChange: boolean;
  onToggleType: () => void;
  artifactBlocks?: import("../../types").DocumentBlock[];
  size?: "sm" | "md";
}) {
  const typeLabel = artifactTypeLabel(source, artifactBlocks);
  const TypeIcon = artifactTypeIcon(source, artifactBlocks);
  const iconKind = artifactTypeIconKind(source, artifactBlocks);
  const iconColor = artifactTypeIconColor(source, artifactBlocks);
  const pixelSize = size === "md" ? 20 : 15;
  const strokeWidth = size === "md" ? 2.25 : 2;

  const icon = (
    <span
      className={`peer-artifact-icon peer-artifact-icon--${size} peer-artifact-icon--${iconKind}`}
      style={{ color: iconColor }}
      title={typeLabel}
      aria-label={typeLabel}
    >
      <TypeIcon size={pixelSize} strokeWidth={strokeWidth} aria-hidden />
    </span>
  );

  if (!allowSourceTypeChange) {
    return icon;
  }

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onToggleType();
      }}
      aria-expanded={active}
      aria-haspopup="listbox"
      title={`Change source type (${typeLabel})`}
      aria-label={`Source type: ${typeLabel}. Click to change.`}
      className={`peer-artifact-icon-btn ${active ? "is-active" : ""}`}
    >
      {icon}
    </button>
  );
}

/**
 * A single source rendered as a compact pill. V2 mode: type badge, unified
 * usage tagging (incl. reference), click-to-trace, no type switcher.
 */
export function SourcePill({
  source,
  isTraced,
  variant = "default",
  layout = "default",
  compact = false,
  allowSourceTypeChange = false,
  rolePickerMode = "usage",
  traceOnFieldClick = false,
  matrixDrag,
  matrixCellDrop,
  dragHandleAlwaysVisible = false,
  onChange,
  onTrace,
  onNavigateOutlineRef,
  onRemove,
  artifactBlocks,
}: {
  source: RoadmapSource;
  isTraced: boolean;
  variant?: "default" | "v2";
  /** V3 matrix: title → section → tags; calmer hierarchy than beat-card pills. */
  layout?: "default" | "matrix";
  compact?: boolean;
  allowSourceTypeChange?: boolean;
  /** V6 storyline: Paragraph / Table / Figure instead of usage roles. */
  rolePickerMode?: "usage" | "format";
  /** When true, document/pages fields open trace panel instead of inline pickers. */
  traceOnFieldClick?: boolean;
  /** V3 matrix: drag handle wired to retag / move across cells. */
  matrixDrag?: {
    onDragStart: (event: DragEvent) => void;
    onDragEnd: () => void;
  };
  /** Let drops land on top of existing cards in matrix cells. */
  matrixCellDrop?: {
    onDragOver: (event: DragEvent) => void;
    onDrop: (event: DragEvent) => void;
  };
  /** Show the in-pill drag grip without hovering (e.g. primary column). */
  dragHandleAlwaysVisible?: boolean;
  onChange: (next: RoadmapSource) => void;
  onTrace?: () => void;
  onNavigateOutlineRef?: () => void;
  onRemove: () => void;
  /** Used to infer table / figure tags from referenced outline blocks. */
  artifactBlocks?: import("../../types").DocumentBlock[];
}) {
  const isV2 = variant === "v2";
  const isMatrixLayout = isV2 && layout === "matrix";
  const isOutlineRef =
    isV2 &&
    (source.sourceType === "CONTENT" || source.sourceType === "SUBCONTENT");
  const usesV2CardChrome = isV2 && !isOutlineRef;
  const artifactIconSize: "sm" | "md" = isMatrixLayout || compact ? "sm" : "md";
  const rootRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<ActiveField>(null);
  const [pagesTarget, setPagesTarget] = useState<PagesTarget | null>(null);
  const fieldOpensTrace = traceOnFieldClick && !!onTrace;

  useEffect(() => {
    if (!active && pagesTarget === null) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setActive(null);
        setPagesTarget(null);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [active, pagesTarget]);

  const toggle = (field: ActiveField) => {
    setPagesTarget(null);
    setActive((current) => (current === field ? null : field));
  };

  const dataSource =
    source.sourceType === "DATA_SOURCE" ? (source as DataSourceRoadmapSource) : null;
  const referenceKeys = dataSource ? getDataSourceReferenceKeys(dataSource) : [];
  const multiRange = rolePickerMode === "format" && !!dataSource;

  const sectionPickerOptions = useMemo(() => {
    if (!dataSource?.dataSource || !pagesTarget) return [];
    const editingKey = pagesTarget === "__add__" ? null : pagesTarget;
    return selectableReferenceKeys(dataSource.dataSource, referenceKeys, editingKey);
  }, [dataSource, pagesTarget, referenceKeys]);

  const canAddMoreSections = useMemo(() => {
    if (!dataSource?.dataSource || !multiRange) return true;
    return selectableReferenceKeys(dataSource.dataSource, referenceKeys).length > 0;
  }, [dataSource, multiRange, referenceKeys]);

  const displayRole = effectiveSourceRole(source);
  const displayFormatRole = effectiveFormatRole(source);

  const handleRootClick = (event: React.MouseEvent) => {
    if ((event.target as Element).closest("button, .peer-field-chip, .peer-outline-ref-title, .peer-source-actions")) {
      return;
    }
    if (!isV2 || !onTrace || isMatrixLayout || active || pagesTarget) return;
    onTrace();
  };

  const handleFieldClick = (field: "document" | "pages") => {
    if (fieldOpensTrace && onTrace) {
      onTrace();
      return;
    }
    if (
      field === "pages" &&
      source.sourceType === "DATA_SOURCE" &&
      !source.dataSource
    ) {
      return;
    }
    toggle(field);
  };

  const setRole = (role: SourceRole | SourceFormatRole) => {
    if (rolePickerMode === "format") {
      const formatRole = role as SourceFormatRole;
      onChange({
        ...source,
        role: formatRole,
        isReference: formatRole === "reference" ? true : undefined,
      });
    } else {
      onChange({
        ...source,
        role: role as SourceRole,
        isReference: role === "reference" ? true : undefined,
      });
    }
    setActive(null);
  };

  const handleToggleRole = () => {
    if (rolePickerMode === "format") {
      const current = displayFormatRole ?? "source";
      const next: SourceFormatRole = current === "reference" ? "source" : "reference";
      setRole(next);
      return;
    }
    toggle("role");
  };

  const selectSourceType = (nextType: SourceType) => {
    onChange(withSourceType(source, nextType));
    setActive("document");
  };

  const menuOpen =
    active === "document" ||
    active === "pages" ||
    active === "role" ||
    active === "sourceType" ||
    pagesTarget !== null;

  const primaryTitle =
    source.sourceType === "DATA_SOURCE"
      ? source.dataSource || "Select document…"
      : nonDataSourceLabel(source) || "Select…";

  const dragHandleClass = (outlineRef = false) => {
    const classes = [
      "peer-source-drag-handle",
      "touch-none",
      "active:cursor-grabbing",
    ];
    if (outlineRef) classes.push("peer-outline-ref-drag");
    if (dragHandleAlwaysVisible) {
      classes.push("is-visible");
    } else if (isMatrixLayout) {
      classes.push(
        outlineRef
          ? "opacity-40 group-hover/cell:opacity-70 group-hover/pill:opacity-100"
          : "opacity-40 group-hover/cell:opacity-70 group-hover/pill:opacity-70",
      );
    } else {
      classes.push("peer-source-drag-handle--storyline-hover");
    }
    return classes.join(" ");
  };

  return (
    <div
      data-source-card=""
      ref={rootRef}
      onDragOver={
        matrixCellDrop && isMatrixLayout
          ? (event) => {
              event.preventDefault();
              event.stopPropagation();
              matrixCellDrop.onDragOver(event);
            }
          : undefined
      }
      onDrop={
        matrixCellDrop && isMatrixLayout
          ? (event) => {
              event.preventDefault();
              event.stopPropagation();
              matrixCellDrop.onDrop(event);
            }
          : undefined
      }
      onClick={handleRootClick}
      className={`peer-source-shell group/pill ${compact ? "is-compact" : ""} ${isMatrixLayout ? "is-matrix" : ""} ${isOutlineRef ? "peer-source-shell--outline-ref" : ""} ${menuOpen ? "is-menu-open" : ""} ${isV2 && onTrace && !isMatrixLayout && !isOutlineRef ? "cursor-pointer" : ""} ${
        isTraced ? "is-traced" : ""
      }`}
    >
      {isV2 ? (
        isOutlineRef ? (
          <>
            <div className="peer-outline-ref-row">
              {matrixDrag && (
                <div
                  draggable
                  onDragStart={(event) => {
                    event.stopPropagation();
                    matrixDrag.onDragStart(event);
                  }}
                  onDragEnd={(event) => {
                    event.stopPropagation();
                    matrixDrag.onDragEnd();
                  }}
                  aria-label="Drag to move or reorder"
                  title="Drag to move or reorder"
                  className={dragHandleClass(true)}
                >
                  <GripVertical size={12} strokeWidth={1.75} aria-hidden />
                </div>
              )}
              <button
                type="button"
                title={onNavigateOutlineRef ? "Go to outline section" : undefined}
                onClick={(event) => {
                  event.stopPropagation();
                  if (onNavigateOutlineRef) {
                    onNavigateOutlineRef();
                    return;
                  }
                  handleFieldClick("document");
                }}
                className={`peer-outline-ref-title min-w-0 flex-1 truncate text-left ${
                  active === "document" ? "is-active" : ""
                } ${onNavigateOutlineRef || fieldOpensTrace ? "cursor-pointer" : ""}`}
              >
                {primaryTitle}
              </button>
              <span
                className={`peer-outline-ref-tag peer-outline-ref-tag--${
                  source.sourceType === "CONTENT" ? "content" : "subcontent"
                }`}
                aria-hidden
              >
                {source.sourceType === "CONTENT" ? "Content" : "Subcontent"}
              </span>
              <div className="peer-source-actions peer-source-actions--outline">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onRemove();
                  }}
                  aria-label="Remove linked content"
                  title="Remove linked content"
                  className="shrink-0 rounded p-1 text-[#bdbdbd] opacity-0 transition-opacity hover:bg-[#fff0f0] hover:text-[var(--peer-primary)] group-hover/pill:opacity-100"
                >
                  <X size={13} strokeWidth={1.75} />
                </button>
              </div>
            </div>
          </>
        ) : (
        <>
          <div
            className={`peer-source-meta ${isMatrixLayout ? "peer-source-meta--matrix" : usesV2CardChrome ? "peer-source-meta--storyline" : ""} ${!isMatrixLayout && (active === "role" || active === "sourceType") ? "is-expanded" : ""}`}
          >
            <div
              className={`peer-source-head ${isMatrixLayout ? "peer-source-head--matrix" : ""}`}
            >
              <div className="peer-source-head-start">
                {matrixDrag && (
                  <div
                    draggable
                    onDragStart={(event) => {
                      event.stopPropagation();
                      matrixDrag.onDragStart(event);
                    }}
                    onDragEnd={(event) => {
                      event.stopPropagation();
                      matrixDrag.onDragEnd();
                    }}
                    aria-label="Drag to move or reorder"
                    title="Drag to move or reorder"
                    className={dragHandleClass()}
                  >
                    <GripVertical size={12} strokeWidth={1.75} aria-hidden />
                  </div>
                )}
                {isMatrixLayout ? (
                  <>
                    <ArtifactTypeTag
                      source={source}
                      active={active === "sourceType"}
                      allowSourceTypeChange={allowSourceTypeChange}
                      onToggleType={() => toggle("sourceType")}
                      artifactBlocks={artifactBlocks}
                      size={artifactIconSize}
                    />
                    <FieldButton
                      active={!fieldOpensTrace && active === "document"}
                      onClick={() => handleFieldClick("document")}
                      className="peer-matrix-inline-title min-w-0 flex-1"
                      compact={compact}
                      traceHint={fieldOpensTrace}
                      tier="title"
                    >
                      <span className="truncate font-semibold text-[var(--peer-text)]">
                        {primaryTitle}
                      </span>
                    </FieldButton>
                  </>
                ) : (
                  <SourceTypeAndRole
                    source={source}
                    role={displayRole}
                    formatRole={displayFormatRole}
                    rolePickerMode={rolePickerMode}
                    activeField={active}
                    allowSourceTypeChange={allowSourceTypeChange}
                    onToggleType={() => toggle("sourceType")}
                    onToggleRole={handleToggleRole}
                    onSelectFormatRole={setRole}
                    artifactBlocks={artifactBlocks}
                    iconSize={artifactIconSize}
                  />
                )}
              </div>
              <div className="peer-source-actions">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onRemove();
                  }}
                  aria-label="Remove source"
                  title="Remove source"
                  className="shrink-0 rounded p-1 text-[#9e9e9e] hover:bg-[#fff0f0] hover:text-[var(--peer-primary)]"
                >
                  <X size={13} strokeWidth={1.75} />
                </button>
              </div>
            </div>
            {!isMatrixLayout && active === "role" && rolePickerMode !== "format" && (
              <RolePickerInline
                rolePickerMode={rolePickerMode}
                role={displayRole}
                formatRole={displayFormatRole}
                onSelectRole={setRole}
              />
            )}
            {!isMatrixLayout && allowSourceTypeChange && active === "sourceType" && (
              <SourceTypePickerInline
                source={source}
                onSelectSourceType={selectSourceType}
              />
            )}
          </div>
          <div
            className={`peer-source-body ${isMatrixLayout ? "peer-source-body--matrix" : usesV2CardChrome ? "peer-source-body--storyline" : ""} ${!isMatrixLayout && multiRange ? "flex-col !items-stretch" : ""}`}
          >
            {isMatrixLayout ? (
              dataSource && multiRange ? (
                <DataSourceReferenceKeys
                  keys={referenceKeys}
                  activeKey={pagesTarget}
                  disabled={!dataSource.dataSource}
                  addDisabled={!canAddMoreSections}
                  traceHint={fieldOpensTrace && !multiRange}
                  sectionStyle
                  onSelectKey={(key) => {
                    if (fieldOpensTrace && !multiRange && onTrace) {
                      onTrace();
                      return;
                    }
                    setActive(null);
                    setPagesTarget((current) => (current === key ? null : key));
                  }}
                  onAddKey={() => {
                    if (!dataSource.dataSource) return;
                    setActive(null);
                    setPagesTarget("__add__");
                  }}
                  onRemoveKey={(key) => {
                    onChange(removeReferenceKeyFromDataSource(dataSource, key));
                    setPagesTarget((current) => (current === key ? null : current));
                  }}
                />
              ) : null
            ) : dataSource ? (
              multiRange ? (
                <>
                  <FieldButton
                    active={!fieldOpensTrace && active === "document"}
                    onClick={() => handleFieldClick("document")}
                    className="min-w-0 w-full"
                    compact={compact}
                    traceHint={fieldOpensTrace}
                    tier="title"
                  >
                    <span className="truncate font-medium text-[#1f1f1f]">
                      {dataSource.dataSource || "Select document…"}
                    </span>
                  </FieldButton>
                  <DataSourceReferenceKeys
                    keys={referenceKeys}
                    activeKey={pagesTarget}
                    disabled={!dataSource.dataSource}
                    addDisabled={!canAddMoreSections}
                    traceHint={fieldOpensTrace && !multiRange}
                    sectionStyle
                    onSelectKey={(key) => {
                      if (fieldOpensTrace && !multiRange && onTrace) {
                        onTrace();
                        return;
                      }
                      setActive(null);
                      setPagesTarget((current) => (current === key ? null : key));
                    }}
                    onAddKey={() => {
                      if (!dataSource.dataSource) return;
                      setActive(null);
                      setPagesTarget("__add__");
                    }}
                    onRemoveKey={(key) => {
                      onChange(removeReferenceKeyFromDataSource(dataSource, key));
                      setPagesTarget((current) => (current === key ? null : current));
                    }}
                  />
                </>
              ) : (
              <>
                <FieldButton
                  active={!fieldOpensTrace && active === "document"}
                  onClick={() => handleFieldClick("document")}
                  className="min-w-0 flex-1"
                  compact={compact}
                  traceHint={fieldOpensTrace}
                >
                  <span className="truncate font-medium text-[#1f1f1f]">
                    {dataSource.dataSource || "Select document…"}
                  </span>
                </FieldButton>
                <FieldButton
                  active={!fieldOpensTrace && active === "pages"}
                  onClick={() => handleFieldClick("pages")}
                  disabled={!dataSource.dataSource && !fieldOpensTrace}
                  className="shrink-0 max-w-[46%]"
                  compact={compact}
                  traceHint={fieldOpensTrace}
                >
                  <span className="truncate text-[#454545]">
                    {dataSource.referenceKey || "Pages…"}
                  </span>
                </FieldButton>
              </>
              )
            ) : (
              <FieldButton
                active={!fieldOpensTrace && active === "document"}
                onClick={() => handleFieldClick("document")}
                className="min-w-0 flex-1"
                compact={compact}
                traceHint={fieldOpensTrace}
                tier="title"
              >
                <span className="truncate font-medium text-[#1f1f1f]">
                  {nonDataSourceLabel(source) || "Select…"}
                </span>
              </FieldButton>
            )}
          </div>
        </>
        )
      ) : (
        <>
          <div className="peer-source-bar">
            <SourceTypeAndRole
              source={source}
              role={displayRole}
              formatRole={displayFormatRole}
              rolePickerMode={rolePickerMode}
              activeField={active}
              allowSourceTypeChange={allowSourceTypeChange}
              onToggleType={() => toggle("sourceType")}
              onToggleRole={handleToggleRole}
              onSelectFormatRole={setRole}
              artifactBlocks={artifactBlocks}
              iconSize={artifactIconSize}
            />

            {source.sourceType === "DATA_SOURCE" ? (
              <>
                <FieldButton
                  active={active === "document"}
                  onClick={() => toggle("document")}
                  className="min-w-0 flex-1"
                >
                  <span className="truncate text-[14px] font-semibold leading-snug text-[#1f1f1f]">
                    {source.dataSource || "Select document…"}
                  </span>
                </FieldButton>
                <FieldButton
                  active={active === "pages"}
                  onClick={() => source.dataSource && toggle("pages")}
                  disabled={!source.dataSource}
                  className="shrink-0 max-w-[42%]"
                >
                  <span className="truncate text-[13px] leading-snug text-[#454545]">
                    {source.referenceKey || "Pages…"}
                  </span>
                </FieldButton>
              </>
            ) : (
              <FieldButton
                active={active === "document"}
                onClick={() => toggle("document")}
                className="min-w-0 flex-1"
              >
                <span className="truncate text-[14px] font-semibold leading-snug text-[#1f1f1f]">
                  {nonDataSourceLabel(source) || "Select…"}
                </span>
              </FieldButton>
            )}

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onRemove();
              }}
              aria-label="Remove source"
              title="Remove source"
              className="shrink-0 rounded p-1.5 text-[#525252] hover:bg-[#fff0f0] hover:text-[var(--peer-primary)] sm:p-1"
            >
              <X size={14} strokeWidth={1.75} />
            </button>
          </div>
          {active === "role" && rolePickerMode !== "format" && (
            <RolePickerInline
              rolePickerMode={rolePickerMode}
              role={displayRole}
              formatRole={displayFormatRole}
              onSelectRole={setRole}
            />
          )}
          {allowSourceTypeChange && active === "sourceType" && (
            <SourceTypePickerInline
              source={source}
              onSelectSourceType={selectSourceType}
            />
          )}
        </>
      )}

      {(active || pagesTarget) &&
        (!fieldOpensTrace || (multiRange && pagesTarget)) &&
        active !== "role" &&
        active !== "sourceType" && (
        <div
          className={
            isOutlineRef
              ? `peer-outline-ref-picker border-t border-[var(--peer-border-subtle)] py-2 ${
                  isMatrixLayout ? "px-1.5" : ""
                }`
              : isMatrixLayout
                ? "border-t border-[var(--peer-border-subtle)] px-1.5 py-1.5"
                : "border-t border-[#ececec] px-3 py-2.5 sm:px-3"
          }
        >
          {active === "document" && source.sourceType === "DATA_SOURCE" && !fieldOpensTrace && (
            <PillOptionPicker
              value={source.dataSource}
              options={DATA_SOURCES}
              getCategory={getDocumentCategory}
              categoryOrder={DATA_SOURCE_CATEGORY_ORDER}
              searchPlaceholder="Search data sources"
              onSelect={(dataSourceName) => {
                onChange({
                  ...source,
                  dataSource: dataSourceName,
                  referenceKey: "",
                  referenceKeys: undefined,
                  sectionName: undefined,
                  documentCategory: undefined,
                });
                if (multiRange) {
                  setActive(null);
                  setPagesTarget("__add__");
                } else {
                  setActive("pages");
                }
              }}
            />
          )}
          {active === "pages" &&
            source.sourceType === "DATA_SOURCE" &&
            source.dataSource &&
            !multiRange && (
            <PillOptionPicker
              value={source.referenceKey}
              options={getReferenceKeysForDataSource(source.dataSource)}
              onSelect={(referenceKey) => {
                onChange(
                  enrichDataSourceSource({ ...source, referenceKey, sectionName: undefined }),
                );
                setActive(null);
              }}
            />
          )}
          {pagesTarget &&
            dataSource?.dataSource && (
            sectionPickerOptions.length > 0 ? (
            <PillOptionPicker
              value={pagesTarget === "__add__" ? "" : pagesTarget}
              options={sectionPickerOptions}
              onSelect={(referenceKey) => {
                if (pagesTarget === "__add__") {
                  onChange(appendReferenceKeyToDataSource(dataSource, referenceKey));
                } else {
                  onChange(
                    replaceReferenceKeyOnDataSource(dataSource, pagesTarget, referenceKey),
                  );
                }
                setPagesTarget(null);
              }}
            />
            ) : (
              <p className="text-[12px] text-[#9e9e9e]">All sections for this document are already mapped.</p>
            )
          )}
          {active === "document" &&
            (source.sourceType === "SUBCONTENT" || source.sourceType === "CONTENT") && (
              <PillOptionPicker
                value={source.content}
                options={
                  source.sourceType === "SUBCONTENT" ? SUBCONTENT_OPTIONS : CONTENT_OPTIONS
                }
                onSelect={(content) => {
                  onChange({ ...source, content });
                  setActive(null);
                }}
              />
            )}
          {active === "document" && source.sourceType === "REFERENCE_SOURCE" && (
            <PillOptionPicker
              value={source.referenceSource}
              options={REFERENCE_SOURCE_OPTIONS}
              onSelect={(referenceSource) => {
                onChange({ ...source, referenceSource, role: "reference" });
                setActive(null);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

function DataSourceReferenceKeys({
  keys,
  activeKey,
  disabled,
  addDisabled = false,
  traceHint,
  sectionStyle = false,
  onSelectKey,
  onAddKey,
  onRemoveKey,
}: {
  keys: string[];
  activeKey: PagesTarget | null;
  disabled?: boolean;
  addDisabled?: boolean;
  traceHint?: boolean;
  sectionStyle?: boolean;
  onSelectKey: (key: string) => void;
  onAddKey: () => void;
  onRemoveKey: (key: string) => void;
}) {
  return (
    <div className={sectionStyle ? "peer-source-sections" : "flex flex-wrap items-center gap-1"}>
      {keys.map((key) => {
        const isActive = activeKey === key;
        return (
          <span
            key={key}
            className={`peer-field-chip ${sectionStyle ? "peer-field-chip--section" : ""} group/ref-key inline-flex max-w-full items-center gap-0.5 ${
              isActive ? "ring-2 ring-[var(--peer-primary)] ring-offset-1" : ""
            }`}
          >
            <button
              type="button"
              disabled={disabled}
              title={traceHint ? "Trace to data" : key}
              onClick={(event) => {
                event.stopPropagation();
                onSelectKey(key);
              }}
              className="min-w-0 truncate text-left text-[12px] leading-snug text-[#454545] disabled:opacity-50"
            >
              {key}
            </button>
            <button
              type="button"
              aria-label={`Remove ${key}`}
              title="Remove section"
              onClick={(event) => {
                event.stopPropagation();
                onRemoveKey(key);
              }}
              className="shrink-0 rounded p-0.5 text-[#bdbdbd] opacity-0 transition-opacity hover:bg-[#fff0f0] hover:text-[var(--peer-primary)] group-hover/ref-key:opacity-100"
            >
              <X size={10} strokeWidth={2} />
            </button>
          </span>
        );
      })}
      <button
        type="button"
        disabled={disabled || addDisabled}
        onClick={(event) => {
          event.stopPropagation();
          onAddKey();
        }}
        title={
          addDisabled
            ? "All sections for this document are already mapped"
            : "Add section or page range"
        }
        className={`inline-flex items-center gap-0.5 ${
          sectionStyle
            ? "peer-section-add-btn"
            : "rounded-md border border-dashed border-[#d4ced3] px-1.5 py-0.5 text-[11px] font-medium text-[#757575] transition-colors hover:border-[#bdbdbd] hover:bg-[#fafafa] hover:text-[#302f2f]"
        } disabled:opacity-50`}
      >
        <Plus size={11} strokeWidth={2} aria-hidden />
        Section
      </button>
    </div>
  );
}

function RoleBadge({
  role,
  active,
  onClick,
}: {
  role: SourceRole | undefined;
  active: boolean;
  onClick: () => void;
}) {
  const label = role ? roleLabel(role) : "Role";
  const badgeClass = role
    ? ROLE_BADGE[role]
    : "border-dashed border-[#c0b8be] bg-white text-[var(--peer-muted)]";
  const hint = role
    ? ROLE_HINT[role]
    : "Choose how this source is used in the section.";

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      aria-expanded={active}
      aria-haspopup="listbox"
      aria-label={`Section role: ${label}`}
      title={hint}
      className={`${ROLE_CHIP_BASE} ${
        active
          ? "border-[var(--peer-primary)] bg-[var(--peer-primary-tint)] text-[var(--peer-text)]"
          : badgeClass
      }`}
    >
      {label}
    </button>
  );
}

function RolePickerInline({
  rolePickerMode,
  role,
  formatRole,
  onSelectRole,
}: {
  rolePickerMode: "usage" | "format";
  role: SourceRole | undefined;
  formatRole: SourceFormatRole | undefined;
  onSelectRole: (role: SourceRole | SourceFormatRole) => void;
}) {
  if (rolePickerMode === "format") {
    return (
      <div
        role="listbox"
        aria-label="Source format"
        className="peer-source-inline-picker"
        onClick={(event) => event.stopPropagation()}
      >
        {SOURCE_FORMAT_ROLES.map((option) => {
          const selected = formatRole === option;
          return (
            <button
              key={option}
              type="button"
              role="option"
              aria-selected={selected}
              title={formatRoleHint(option)}
              onClick={() => onSelectRole(option)}
              className={`${ROLE_CHIP_BASE} ${
                selected
                  ? FORMAT_ROLE_BADGE[option]
                  : `${FORMAT_ROLE_BADGE_PICKER[option]} hover:border-opacity-60 hover:bg-opacity-70`
              }`}
            >
              {formatRoleLabel(option)}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      role="listbox"
      aria-label="Section role"
      className="peer-source-inline-picker"
      onClick={(event) => event.stopPropagation()}
    >
      {SOURCE_ROLES.map((option) => {
        const selected = role === option;
        return (
          <button
            key={option}
            type="button"
            role="option"
            aria-selected={selected}
            title={ROLE_HINT[option]}
            onClick={() => onSelectRole(option)}
            className={`${ROLE_CHIP_BASE} ${
              selected
                ? ROLE_BADGE[option]
                : `${ROLE_BADGE_PICKER[option]} hover:border-opacity-60 hover:bg-opacity-70`
            }`}
          >
            {roleLabel(option)}
          </button>
        );
      })}
    </div>
  );
}

function SourceTypePickerInline({
  source,
  onSelectSourceType,
}: {
  source: RoadmapSource;
  onSelectSourceType: (sourceType: SourceType) => void;
}) {
  return (
    <div
      className="peer-source-inline-picker peer-source-inline-picker--type"
      onClick={(event) => event.stopPropagation()}
    >
      <PillOptionPicker
        value={SOURCE_TYPE_LABELS[source.sourceType]}
        options={SOURCE_TYPES.map((type) => SOURCE_TYPE_LABELS[type])}
        onSelect={(label) => {
          const nextType = SOURCE_TYPES.find(
            (type) => SOURCE_TYPE_LABELS[type] === label,
          ) as SourceType;
          onSelectSourceType(nextType);
        }}
      />
    </div>
  );
}

function FieldButton({
  active,
  disabled = false,
  onClick,
  className = "",
  compact = false,
  traceHint = false,
  tier = "default",
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  className?: string;
  compact?: boolean;
  traceHint?: boolean;
  tier?: "title" | "section" | "default";
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={traceHint ? "Trace to data" : undefined}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={`peer-field-chip ${
        tier === "title" ? "peer-field-chip--title" : ""
      } ${tier === "section" ? "peer-field-chip--section" : ""} ${active ? "is-active" : ""} ${
        compact ? "text-[11px]" : "text-[13px]"
      } ${traceHint ? "cursor-pointer" : ""} ${disabled ? "cursor-not-allowed opacity-50" : ""} ${className}`}
    >
      {children}
    </button>
  );
}

function nonDataSourceLabel(source: RoadmapSource): string {
  if (source.sourceType === "REFERENCE_SOURCE") return source.referenceSource || "";
  if (source.sourceType === "SUBCONTENT" || source.sourceType === "CONTENT") {
    return source.content || "";
  }
  return "";
}
