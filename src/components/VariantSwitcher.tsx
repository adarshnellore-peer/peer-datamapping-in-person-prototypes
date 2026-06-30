import { ChevronDown } from "lucide-react";
import { DropdownMenu, MenuItem } from "./EditRoadmapPanel";

export type VariantId =
  | "baseline"
  | "twoColumn"
  | "matrix"
  | "connectors"
  | "sourceView";

export const VARIANTS: { id: VariantId; name: string; description: string }[] = [
  {
    id: "baseline",
    name: "V1 \u00b7 Current",
    description: "Inline document with V2-style source pills; trace panel on the right",
  },
  {
    id: "twoColumn",
    name: "V2 \u00b7 Storyline mapping",
    description: "Evidence-first cards; drag from outline and data sources",
  },
  {
    id: "matrix",
    name: "V3 \u00b7 Mode matrix",
    description: "Sections \u00d7 Insert / Interpret / Reference with document library",
  },
  {
    id: "connectors",
    name: "V5 \u00b7 Connector map",
    description: "Sections and sources joined by lines; click to trace one",
  },
  {
    id: "sourceView",
    name: "V6 \u00b7 Source view",
    description: "Group by document; see every section a source feeds",
  },
];

export function VariantSwitcher({
  variant,
  onChange,
}: {
  variant: VariantId;
  onChange: (id: VariantId) => void;
}) {
  const current = VARIANTS.find((v) => v.id === variant) ?? VARIANTS[0];

  return (
    <DropdownMenu
      align="left"
      trigger={
        <button
          type="button"
          className="flex items-center gap-2 rounded-md border border-[#d4ced3] bg-white px-3 py-1.5 text-[13px] font-medium text-[#302f2f] hover:bg-[#fafafa]"
        >
          <span className="text-[#9e9e9e]">Version</span>
          <span>{current.name}</span>
          <ChevronDown size={14} className="text-[#636161]" />
        </button>
      }
    >
      {VARIANTS.map((v) => (
        <MenuItem
          key={v.id}
          title={v.name}
          description={v.description}
          active={v.id === variant}
          onClick={() => onChange(v.id)}
        />
      ))}
    </DropdownMenu>
  );
}
