import { ChevronDown } from "lucide-react";
import { DropdownMenu, MenuItem } from "./EditRoadmapPanel";

export type VariantId =
  | "baseline"
  | "outline"
  | "twoColumn"
  | "matrix"
  | "spine"
  | "sourceView"
  | "connectors";

export const VARIANTS: { id: VariantId; name: string; description: string }[] = [
  {
    id: "baseline",
    name: "V1 \u00b7 Current",
    description: "Inline source cards in the document",
  },
  {
    id: "outline",
    name: "V2 \u00b7 Expandable outline",
    description: "Scan every section's sources, expand to edit",
  },
  {
    id: "twoColumn",
    name: "V3 \u00b7 Two-column",
    description: "Section list left, its sources right",
  },
  {
    id: "matrix",
    name: "V4 \u00b7 Usage matrix",
    description: "Sections \u00d7 usage; drag sources between Primary/Supporting/Context",
  },
  {
    id: "spine",
    name: "V5 \u00b7 Narrative spine",
    description: "Each section is a claim with evidence on a timeline",
  },
  {
    id: "sourceView",
    name: "V6 \u00b7 Source view",
    description: "Group by document; see every section a source feeds",
  },
  {
    id: "connectors",
    name: "V7 \u00b7 Connector map",
    description: "Sections and sources joined by lines; click to trace one",
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
