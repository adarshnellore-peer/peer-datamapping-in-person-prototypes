import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { OUTPUT_TYPE_LABELS, OUTPUT_TYPES } from "../data/roadmap";

const OPTIONS = OUTPUT_TYPES.map((value) => ({
  value,
  label: OUTPUT_TYPE_LABELS[value],
}));

export function GenerateAsSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (outputType: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = OPTIONS.find((o) => o.value === value) ?? OPTIONS[0];

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative flex shrink-0 items-center gap-1.5 sm:gap-2">
      <span className="hidden text-[12px] font-medium text-[#636161] sm:inline">
        Generate as
      </span>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1.5 rounded-md border border-[#d4ced3] bg-white px-2.5 py-1.5 text-[13px] font-medium text-[#302f2f] transition-colors hover:border-[#bdbdbd] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff4e49]/30"
      >
        {selected.label}
        <ChevronDown
          size={14}
          className={`text-[#757575] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-auto top-full z-20 mt-1 min-w-[9rem] overflow-hidden rounded-md border border-[#d4ced3] bg-white py-1 shadow-lg sm:left-auto sm:right-0"
        >
          {OPTIONS.map((option) => {
            const isSelected = option.value === value;
            return (
              <li key={option.value} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-left text-[13px] transition-colors ${
                    isSelected
                      ? "bg-[#fedbda] font-medium text-[#302f2f]"
                      : "text-[#302f2f] hover:bg-[#fafafa]"
                  }`}
                >
                  {option.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
