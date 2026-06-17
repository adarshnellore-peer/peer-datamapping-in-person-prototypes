import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

type PeerSelectProps = {
  label: string;
  required?: boolean;
  placeholder?: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  truncate?: boolean;
};

export function PeerSelect({
  label,
  required,
  placeholder,
  value,
  options,
  onChange,
  truncate = true,
}: PeerSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

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
    <div ref={rootRef} className="relative">
      <label className="mb-1.5 block text-[13px] text-[#616161]">
        {label}
        {required && <span className="text-[#ff4e49]"> *</span>}
      </label>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-3 rounded border border-[#d4ced3] bg-white px-3 py-2.5 text-left text-[14px] leading-snug text-[#1a1a1a] transition-colors hover:border-[#bdbdbd] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff4e49]/30"
      >
        <span
          className={`min-w-0 flex-1 ${!value && placeholder ? "text-[#9e9e9e]" : "text-[#1a1a1a]"} ${truncate ? "truncate" : "break-words"}`}
        >
          {value || placeholder}
        </span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-[#757575] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded border border-[#d4ced3] bg-white py-1 shadow-lg"
        >
          {options.map((option) => {
            const selected = option === value;
            return (
              <li key={option} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(option);
                    setOpen(false);
                  }}
                  className={`w-full px-3 py-2.5 text-left text-[14px] leading-snug transition-colors ${
                    selected
                      ? "bg-[#fedbda] text-[#1a1a1a]"
                      : "text-[#1a1a1a] hover:bg-[#fafafa]"
                  }`}
                >
                  {option}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
