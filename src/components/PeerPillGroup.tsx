type PeerPillGroupProps = {
  label: string;
  required?: boolean;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  getLabel?: (value: string) => string;
};

export function PeerPillGroup({
  label,
  required,
  value,
  options,
  onChange,
  getLabel = (option) => option,
}: PeerPillGroupProps) {
  return (
    <div>
      <span className="mb-2 block text-[13px] text-[#616161]">
        {label}
        {required && <span className="text-[#ff4e49]"> *</span>}
      </span>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = option === value;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option)}
              className={`rounded-full border px-3 py-1.5 text-left text-[13px] leading-snug transition-colors ${
                selected
                  ? "border-[#ff4e49]/60 bg-[#fedbda] font-medium text-[#302f2f]"
                  : "border-[#d4ced3] bg-white text-[#636161] hover:border-[#bdbdbd] hover:bg-[#fafafa]"
              }`}
            >
              {getLabel(option)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
