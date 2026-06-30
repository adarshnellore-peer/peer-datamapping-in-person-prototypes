import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";

const pillBase =
  "rounded-full border px-3 py-1.5 text-left text-[13px] leading-snug transition-colors";
const pillEditing =
  "border-[#ff4e49] bg-[#fedbda] font-semibold text-[#302f2f]";
const pillConfirmed =
  "border-[#a8a8a8] bg-[#f5f5f5] font-medium text-[#1f1f1f] hover:border-[#888]";
const pillUnselected =
  "border-[#c8c8c8] bg-white text-[#454545] hover:border-[#999] hover:bg-[#fafafa]";
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
  /** Above this many options, switch to a searchable list (studies often have 30-40+ sources). */
  searchThreshold = 12,
  searchPlaceholder = "Search…",
}: {
  value: string;
  options: readonly string[];
  onSelect: (value: string) => void;
  getLabel?: (value: string) => string;
  searchThreshold?: number;
  searchPlaceholder?: string;
}) {
  if (options.length > searchThreshold) {
    return (
      <PillSearchPicker
        value={value}
        options={options}
        onSelect={onSelect}
        getLabel={getLabel}
        placeholder={searchPlaceholder}
      />
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const isCurrent = option === value;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={isCurrent}
            onClick={() => onSelect(option)}
            className={`inline-flex max-w-full w-fit ${pillBase} ${pillUnselected}`}
          >
            <span className="whitespace-normal break-words text-left">{getLabel(option)}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Searchable option list for fields with many options (e.g. the study's
 * 30-40+ data sources). Renders a filter input above a scrollable list so the
 * writer searches instead of scanning a huge pill cloud.
 */
export function PillSearchPicker({
  value,
  options,
  onSelect,
  getLabel = (option) => option,
  placeholder = "Search…",
}: {
  value: string;
  options: readonly string[];
  onSelect: (value: string) => void;
  getLabel?: (value: string) => string;
  placeholder?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const normalized = query.trim().toLowerCase();
  const filtered = normalized
    ? options.filter((option) => getLabel(option).toLowerCase().includes(normalized))
    : options;

  return (
    <div className="rounded-md border border-[#d4ced3] bg-white p-1.5">
      <div className="relative">
        <Search
          size={14}
          strokeWidth={2}
          className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[#9e9e9e]"
          aria-hidden
        />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`${placeholder} (${options.length})`}
          aria-label="Search options"
          className="mb-1 w-full rounded bg-black/[0.04] py-1.5 pl-7 pr-2 text-[13px] text-[#302f2f] placeholder:text-[#9e9e9e] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#d4ced3]"
        />
      </div>
      <div className="max-h-[200px] overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="px-2 py-3 text-center text-[12px] text-[#9e9e9e]">No matches</p>
        ) : (
          <ul className="space-y-0.5">
            {filtered.map((option) => {
              const isCurrent = option === value;
              return (
                <li key={option}>
                  <button
                    type="button"
                    aria-pressed={isCurrent}
                    onClick={() => onSelect(option)}
                    className={`block w-full rounded px-2 py-1.5 text-left text-[13px] leading-snug transition-colors ${
                      isCurrent
                        ? "bg-[#fedbda] font-medium text-[#302f2f]"
                        : "text-[#454545] hover:bg-[#f5f5f5]"
                    }`}
                  >
                    {getLabel(option)}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
