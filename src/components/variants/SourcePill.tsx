import { useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { PillOptionPicker } from "../CollapsiblePillField";
import {
  CONTENT_OPTIONS,
  DATA_SOURCES,
  REFERENCE_SOURCE_OPTIONS,
  SOURCE_ROLES,
  SOURCE_TYPES,
  SUBCONTENT_OPTIONS,
  enrichDataSourceSource,
  getReferenceKeysForDataSource,
  withSourceType,
  type RoadmapSource,
  type SourceRole,
  type SourceType,
} from "../../data/roadmap";
import { getSourceTypeTag } from "../../data/sourceHelpers";
import {
  CATEGORY_DOT,
  ROLE_BADGE,
  SOURCE_KIND_BADGE,
  effectiveSourceRole,
  roleLabel,
} from "./types";

type ActiveField = "sourceType" | "document" | "pages" | "role" | null;

const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  DATA_SOURCE: "Data source",
  SUBCONTENT: "Subcontent",
  CONTENT: "Content",
  REFERENCE_SOURCE: "Reference source",
};

function sourceKindKey(
  source: RoadmapSource,
): keyof typeof SOURCE_KIND_BADGE | null {
  if (source.sourceType === "DATA_SOURCE") return "DATA_SOURCE";
  if (source.sourceType === "SUBCONTENT") return "SUBCONTENT";
  if (source.sourceType === "CONTENT") return "CONTENT";
  return null;
}

/**
 * A single source rendered as a compact pill. V2 mode: type badge, unified
 * usage tagging (incl. reference), click-to-trace, no type switcher.
 */
export function SourcePill({
  source,
  isTraced,
  variant = "default",
  allowSourceTypeChange = false,
  onChange,
  onTrace,
  onRemove,
}: {
  source: RoadmapSource;
  isTraced: boolean;
  variant?: "default" | "v2";
  allowSourceTypeChange?: boolean;
  onChange: (next: RoadmapSource) => void;
  onTrace?: () => void;
  onRemove: () => void;
}) {
  const isV2 = variant === "v2";
  const rootRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<ActiveField>(null);

  useEffect(() => {
    if (!active) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setActive(null);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [active]);

  const toggle = (field: ActiveField) =>
    setActive((current) => (current === field ? null : field));

  const tag = getSourceTypeTag(source);
  const dot = CATEGORY_DOT[tag] ?? "bg-[#bdbdbd]";
  const isProposed = source.status === "proposed";
  const displayRole = effectiveSourceRole(source);
  const kindKey = sourceKindKey(source);
  const kindBadge = kindKey ? SOURCE_KIND_BADGE[kindKey] : null;

  const handleRootClick = () => {
    if (!isV2 || !onTrace || active) return;
    onTrace();
  };

  const setRole = (role: SourceRole) => {
    onChange({ ...source, role, isReference: role === "reference" ? true : undefined });
    setActive(null);
  };

  return (
    <div
      data-source-card=""
      ref={rootRef}
      onClick={handleRootClick}
      className={`rounded-md border bg-white transition-colors ${
        isV2 && onTrace ? "cursor-pointer" : ""
      } ${
        isTraced
          ? "border-[#ff4e49] shadow-sm shadow-[#ff4e49]/10"
          : isProposed
            ? "border-dashed border-[#c0b8be]"
            : "border-[#d4ced3]"
      }`}
    >
      <div className="flex items-center gap-1.5 px-2 py-1.5">
        {isV2 && kindBadge ? (
          <span
            className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${kindBadge.className}`}
          >
            {kindBadge.label}
          </span>
        ) : allowSourceTypeChange ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              toggle("sourceType");
            }}
            className={`h-2 w-2 shrink-0 rounded-full ${dot} ${
              active === "sourceType" ? "ring-2 ring-[#ff4e49] ring-offset-1" : ""
            }`}
            title={SOURCE_TYPE_LABELS[source.sourceType]}
            aria-label={`Source type: ${SOURCE_TYPE_LABELS[source.sourceType]}`}
          />
        ) : (
          <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} title={tag} aria-hidden />
        )}

        {source.sourceType === "DATA_SOURCE" ? (
          <>
            <FieldButton
              active={active === "document"}
              onClick={() => toggle("document")}
              className="min-w-0 flex-1"
            >
              <span className="truncate">{source.dataSource || "Select document…"}</span>
            </FieldButton>
            <FieldButton
              active={active === "pages"}
              onClick={() => source.dataSource && toggle("pages")}
              disabled={!source.dataSource}
              className="shrink-0 max-w-[38%]"
            >
              <span className="truncate">{source.referenceKey || "Pages…"}</span>
            </FieldButton>
          </>
        ) : (
          <FieldButton
            active={active === "document"}
            onClick={() => toggle("document")}
            className="min-w-0 flex-1"
          >
            <span className="truncate">{nonDataSourceLabel(source) || "Select…"}</span>
          </FieldButton>
        )}

        <RoleBadge
          role={displayRole}
          active={active === "role"}
          onClick={() => toggle("role")}
        />

        {isProposed && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onChange({ ...source, status: "confirmed" });
            }}
            aria-label="Confirm source"
            title="Confirm suggested source"
            className="shrink-0 rounded p-1 text-[#1a8a4a] hover:bg-[#e6f6ec]"
          >
            <Check size={14} strokeWidth={2.25} />
          </button>
        )}
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          aria-label="Remove source"
          title="Remove source"
          className="shrink-0 rounded p-1 text-[#9e9e9e] hover:bg-[#fff0f0] hover:text-[#ff4e49]"
        >
          <X size={14} strokeWidth={1.75} />
        </button>
      </div>

      {active && (
        <div className="border-t border-[#ececec] px-2.5 py-2.5">
          {active === "sourceType" && allowSourceTypeChange && (
            <PillOptionPicker
              value={SOURCE_TYPE_LABELS[source.sourceType]}
              options={SOURCE_TYPES.map((type) => SOURCE_TYPE_LABELS[type])}
              onSelect={(label) => {
                const nextType = SOURCE_TYPES.find(
                  (type) => SOURCE_TYPE_LABELS[type] === label,
                ) as SourceType;
                onChange(withSourceType(source, nextType));
                setActive("document");
              }}
            />
          )}
          {active === "role" && (
            <div className="flex flex-wrap gap-1.5">
              {SOURCE_ROLES.map((option) => {
                const selected = displayRole === option;
                return (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setRole(option)}
                    className={`rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors ${
                      selected
                        ? ROLE_BADGE[option]
                        : "border-[#d4ced3] bg-white text-[#636161] hover:bg-[#fafafa]"
                    }`}
                  >
                    {roleLabel(option)}
                  </button>
                );
              })}
            </div>
          )}
          {active === "document" && source.sourceType === "DATA_SOURCE" && (
            <PillOptionPicker
              value={source.dataSource}
              options={DATA_SOURCES}
              searchPlaceholder="Search data sources"
              onSelect={(dataSource) => {
                onChange({
                  ...source,
                  dataSource,
                  referenceKey: "",
                  sectionName: undefined,
                  documentCategory: undefined,
                });
                setActive("pages");
              }}
            />
          )}
          {active === "pages" && source.sourceType === "DATA_SOURCE" && source.dataSource && (
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

function RoleBadge({
  role,
  active,
  onClick,
}: {
  role: SourceRole | undefined;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      aria-label="Set usage"
      title="Set usage"
      className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors ${
        active
          ? "border-[#ff4e49] bg-[#fedbda] text-[#302f2f]"
          : role
            ? ROLE_BADGE[role]
            : "border-dashed border-[#c0b8be] bg-white text-[#9e9e9e]"
      }`}
    >
      {role ? roleLabel(role) : "Tag"}
    </button>
  );
}

function FieldButton({
  active,
  disabled = false,
  onClick,
  className = "",
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={`flex items-center rounded border px-2 py-1 text-left text-[13px] leading-snug transition-colors ${
        active
          ? "border-[#ff4e49] bg-[#fedbda] font-medium text-[#302f2f]"
          : "border-[#e4e4e4] bg-white text-[#454545] hover:border-[#bdbdbd] hover:bg-[#fafafa]"
      } ${disabled ? "cursor-not-allowed opacity-50" : ""} ${className}`}
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
