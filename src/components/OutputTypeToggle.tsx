import { AlignLeft, Table2 } from "lucide-react";

const SUMMARY = "OUTPUT_TYPE_SUMMARY";
const TABLE = "OUTPUT_TYPE_TABLE";

const OPTIONS = [
  {
    value: SUMMARY,
    label: "Paragraph",
    icon: AlignLeft,
    description: "Narrative text output",
  },
  {
    value: TABLE,
    label: "Table",
    icon: Table2,
    description: "Structured table output",
  },
] as const;

export function OutputTypeToggle({
  value,
  onChange,
}: {
  value: string;
  onChange: (outputType: string) => void;
}) {
  return (
    <div
      className="flex shrink-0 overflow-hidden rounded-md border border-[#e4e4e4] bg-[#fafafa]"
      role="group"
      aria-label="Output format"
    >
        {OPTIONS.map((option, index) => {
          const Icon = option.icon;
          const selected = value === option.value;

          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              title={option.description}
              onClick={() => onChange(option.value)}
              className={`flex items-center gap-1 px-2 py-1 text-[12px] font-medium transition-colors ${
                index > 0 ? "border-l border-[#e8e8e8]" : ""
              } ${
                selected
                  ? "bg-[#fedbda] text-[#302f2f]"
                  : "text-[#636161] hover:bg-[#fafafa]"
              }`}
            >
              <Icon size={14} strokeWidth={1.75} />
              {option.label}
            </button>
          );
        })}
    </div>
  );
}
