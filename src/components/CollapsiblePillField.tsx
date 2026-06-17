const pillBase =
  "rounded-full border px-3 py-1.5 text-left text-[13px] leading-snug transition-colors";
const pillEditing =
  "border-[#ff4e49] bg-[#fedbda] font-semibold text-[#302f2f]";
const pillConfirmed =
  "border-[#a8a8a8] bg-[#f5f5f5] font-medium text-[#1f1f1f] hover:border-[#888]";
const pillUnselected =
  "border-[#c8c8c8] bg-white text-[#454545] hover:border-[#999] hover:bg-[#fafafa]";
const pillPickerCurrent =
  "border-[#ff4e49] bg-[#fff5f5] font-semibold text-[#302f2f]";
const pillEmpty =
  "border-dashed border-[#999] bg-white text-[#666] hover:border-[#666] hover:text-[#302f2f]";

export function PillFieldSummary({
  label,
  required,
  value,
  placeholder = "Select…",
  getLabel = (option) => option,
  layout = "vertical",
  isActive = false,
  disabled = false,
  onClick,
}: {
  label: string;
  required?: boolean;
  value: string;
  placeholder?: string;
  getLabel?: (value: string) => string;
  layout?: "vertical" | "horizontal";
  isActive?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  const horizontal = layout === "horizontal";
  const hasValue = Boolean(value);

  const pillStyle = isActive ? pillEditing : hasValue ? pillConfirmed : pillEmpty;

  return (
    <div className={horizontal ? "min-w-0 flex-1" : undefined}>
      <span
        className={`mb-1.5 block text-[12px] font-semibold text-[#454545] ${horizontal ? "truncate" : ""}`}
      >
        {label}
        {required && <span className="text-[#ff4e49]"> *</span>}
      </span>
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        title={hasValue ? getLabel(value) : placeholder}
        className={`inline-flex w-fit max-w-full ${pillBase} ${pillStyle} ${
          disabled ? "cursor-not-allowed opacity-50" : ""
        }`}
      >
        <span className="whitespace-normal break-words text-left">
          {hasValue ? getLabel(value) : placeholder}
        </span>
      </button>
    </div>
  );
}

export function PillOptionPicker({
  value,
  options,
  onSelect,
  getLabel = (option) => option,
}: {
  value: string;
  options: readonly string[];
  onSelect: (value: string) => void;
  getLabel?: (value: string) => string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5 rounded-md border border-[#e4e4e4] bg-[#fafafa] p-2.5">
      {options.map((option) => {
        const isCurrent = option === value;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={isCurrent}
            onClick={() => onSelect(option)}
            className={`inline-flex max-w-full w-fit ${pillBase} ${
              isCurrent ? pillPickerCurrent : pillUnselected
            }`}
          >
            <span className="whitespace-normal break-words text-left">{getLabel(option)}</span>
          </button>
        );
      })}
    </div>
  );
}
