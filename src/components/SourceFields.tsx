import { PeerSelect } from "./PeerSelect";
import {
  CONTENT_OPTIONS,
  DATA_SOURCES,
  enrichDataSourceSource,
  getReferenceKeysForDataSource,
  REFERENCE_SOURCE_OPTIONS,
  SUBCONTENT_OPTIONS,
  type RoadmapSource,
} from "../data/roadmap";

type SourceFieldsProps = {
  source: RoadmapSource;
  onChange: (next: RoadmapSource) => void;
  layout?: "stacked" | "inline";
};

export function SourceFields({ source, onChange, layout = "stacked" }: SourceFieldsProps) {
  const inline = layout === "inline";

  switch (source.sourceType) {
    case "DATA_SOURCE":
      if (inline) {
        return (
          <>
            <PeerSelect
              label="Data source"
              required
              value={source.dataSource}
              options={DATA_SOURCES}
              truncate={false}
              onChange={(dataSource) => {
                const keys = getReferenceKeysForDataSource(dataSource);
                onChange(
                  enrichDataSourceSource({
                    ...source,
                    dataSource,
                    referenceKey: keys[0] ?? source.referenceKey,
                    sectionName: undefined,
                  }),
                );
              }}
            />
            <PeerSelect
              label="Data reference / pages"
              required
              value={source.referenceKey}
              options={getReferenceKeysForDataSource(source.dataSource)}
              truncate={false}
              onChange={(referenceKey) =>
                onChange(
                  enrichDataSourceSource({
                    ...source,
                    referenceKey,
                    sectionName: undefined,
                  }),
                )
              }
            />
          </>
        );
      }
      return (
        <>
          <PeerSelect
            label="Data Source"
            required
            value={source.dataSource}
            options={DATA_SOURCES}
            onChange={(dataSource) => {
              const keys = getReferenceKeysForDataSource(dataSource);
              onChange({
                ...source,
                dataSource,
                referenceKey: keys[0] ?? source.referenceKey,
              });
            }}
          />
          <PeerSelect
            label="Data Source Reference Key (Page Ranges)"
            required
            value={source.referenceKey}
            options={getReferenceKeysForDataSource(source.dataSource)}
            onChange={(referenceKey) => onChange({ ...source, referenceKey })}
          />
        </>
      );

    case "SUBCONTENT":
      return (
        <PeerSelect
          label="Content"
          required
          placeholder="Select subcontent"
          value={source.content}
          options={SUBCONTENT_OPTIONS}
          truncate={false}
          onChange={(content) => onChange({ ...source, content })}
        />
      );

    case "CONTENT":
      return (
        <PeerSelect
          label="Content"
          required
          placeholder="Select content"
          value={source.content}
          options={CONTENT_OPTIONS}
          truncate={false}
          onChange={(content) => onChange({ ...source, content })}
        />
      );

    case "REFERENCE_SOURCE":
      return (
        <PeerSelect
          label="Reference Source"
          required
          placeholder="Select reference source"
          value={source.referenceSource}
          options={REFERENCE_SOURCE_OPTIONS}
          truncate={false}
          onChange={(referenceSource) => onChange({ ...source, referenceSource })}
        />
      );
  }
}
