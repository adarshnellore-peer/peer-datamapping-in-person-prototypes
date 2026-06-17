import { useEffect, useRef, useState } from "react";
import { PillFieldSummary, PillOptionPicker } from "./CollapsiblePillField";
import {
  CONTENT_OPTIONS,
  DATA_SOURCES,
  REFERENCE_SOURCE_OPTIONS,
  SOURCE_TYPES,
  SUBCONTENT_OPTIONS,
  enrichDataSourceSource,
  getReferenceKeysForDataSource,
  withSourceType,
  type RoadmapSource,
  type SourceType,
} from "../data/roadmap";

const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  DATA_SOURCE: "Data source",
  SUBCONTENT: "Subcontent",
  CONTENT: "Content",
  REFERENCE_SOURCE: "Reference source",
};

type ActiveField = "sourceType" | "dataSource" | "referenceKey" | "content" | "referenceSource";

function applySourceType(source: RoadmapSource, sourceType: SourceType): RoadmapSource {
  if (sourceType === "DATA_SOURCE") {
    return {
      id: source.id,
      status: source.status,
      sourceType: "DATA_SOURCE",
      dataSource: "",
      referenceKey: "",
    };
  }
  return withSourceType(source, sourceType);
}

function nextFieldAfterSourceType(sourceType: SourceType): ActiveField {
  if (sourceType === "DATA_SOURCE") return "dataSource";
  if (sourceType === "REFERENCE_SOURCE") return "referenceSource";
  return "content";
}

function PillFieldSection({
  children,
  picker,
}: {
  children: React.ReactNode;
  picker?: React.ReactNode;
}) {
  return (
    <div className="border-b border-[#e8e8e8] pb-4 last:border-0 last:pb-0">
      {children}
      {picker && <div className="mt-2.5">{picker}</div>}
    </div>
  );
}

export function SourceCardPillFields({
  source,
  onChange,
}: {
  source: RoadmapSource;
  onChange: (source: RoadmapSource) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [activeField, setActiveField] = useState<ActiveField | null>(null);

  useEffect(() => {
    if (activeField === "dataSource" && source.sourceType !== "DATA_SOURCE") {
      setActiveField(null);
    }
    if (
      activeField === "referenceKey" &&
      (source.sourceType !== "DATA_SOURCE" || !source.dataSource)
    ) {
      setActiveField(null);
    }
    if (
      activeField === "content" &&
      source.sourceType !== "SUBCONTENT" &&
      source.sourceType !== "CONTENT"
    ) {
      setActiveField(null);
    }
    if (activeField === "referenceSource" && source.sourceType !== "REFERENCE_SOURCE") {
      setActiveField(null);
    }
  }, [source, activeField]);

  useEffect(() => {
    if (!activeField) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setActiveField(null);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [activeField]);

  const openField = (field: ActiveField) => {
    setActiveField((current) => (current === field ? null : field));
  };

  return (
    <div ref={rootRef} className="flex flex-col gap-4">
      <PillFieldSection
        picker={
          activeField === "sourceType" ? (
            <PillOptionPicker
              value={source.sourceType}
              options={SOURCE_TYPES}
              getLabel={(value) => SOURCE_TYPE_LABELS[value as SourceType]}
              onSelect={(value) => {
                const sourceType = value as SourceType;
                onChange(applySourceType(source, sourceType));
                setActiveField(nextFieldAfterSourceType(sourceType));
              }}
            />
          ) : undefined
        }
      >
        <PillFieldSummary
          label="Source type"
          required
          value={source.sourceType}
          isActive={activeField === "sourceType"}
          getLabel={(value) => SOURCE_TYPE_LABELS[value as SourceType]}
          onClick={() => openField("sourceType")}
        />
      </PillFieldSection>

      {source.sourceType === "DATA_SOURCE" && (
        <>
          <PillFieldSection
            picker={
              activeField === "dataSource" ? (
                <PillOptionPicker
                  value={source.dataSource}
                  options={DATA_SOURCES}
                  onSelect={(dataSource) => {
                    onChange({
                      ...source,
                      dataSource,
                      referenceKey: "",
                      sectionName: undefined,
                      documentCategory: undefined,
                    });
                    setActiveField("referenceKey");
                  }}
                />
              ) : undefined
            }
          >
            <PillFieldSummary
              label="Data source"
              required
              value={source.dataSource}
              isActive={activeField === "dataSource"}
              onClick={() => openField("dataSource")}
            />
          </PillFieldSection>

          <PillFieldSection
            picker={
              activeField === "referenceKey" && source.dataSource ? (
                <PillOptionPicker
                  value={source.referenceKey}
                  options={getReferenceKeysForDataSource(source.dataSource)}
                  onSelect={(referenceKey) => {
                    onChange(
                      enrichDataSourceSource({
                        ...source,
                        referenceKey,
                        sectionName: undefined,
                      }),
                    );
                    setActiveField(null);
                  }}
                />
              ) : undefined
            }
          >
            <PillFieldSummary
              label="Data reference / pages"
              required
              value={source.referenceKey}
              isActive={activeField === "referenceKey"}
              disabled={!source.dataSource}
              onClick={() => source.dataSource && openField("referenceKey")}
            />
          </PillFieldSection>
        </>
      )}

      {(source.sourceType === "SUBCONTENT" || source.sourceType === "CONTENT") && (
        <PillFieldSection
          picker={
            activeField === "content" ? (
              <PillOptionPicker
                value={source.content}
                options={
                  source.sourceType === "SUBCONTENT" ? SUBCONTENT_OPTIONS : CONTENT_OPTIONS
                }
                onSelect={(content) => {
                  onChange({ ...source, content });
                  setActiveField(null);
                }}
              />
            ) : undefined
          }
        >
          <PillFieldSummary
            label="Content"
            required
            value={source.content}
            isActive={activeField === "content"}
            onClick={() => openField("content")}
          />
        </PillFieldSection>
      )}

      {source.sourceType === "REFERENCE_SOURCE" && (
        <PillFieldSection
          picker={
            activeField === "referenceSource" ? (
              <PillOptionPicker
                value={source.referenceSource}
                options={REFERENCE_SOURCE_OPTIONS}
                onSelect={(referenceSource) => {
                  onChange({ ...source, referenceSource });
                  setActiveField(null);
                }}
              />
            ) : undefined
          }
        >
          <PillFieldSummary
            label="Reference source"
            required
            value={source.referenceSource}
            isActive={activeField === "referenceSource"}
            onClick={() => openField("referenceSource")}
          />
        </PillFieldSection>
      )}
    </div>
  );
}
