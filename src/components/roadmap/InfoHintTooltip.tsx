import { Info } from "lucide-react";

export function InfoHintTooltip({
  hint,
  className = "",
}: {
  hint: string;
  className?: string;
}) {
  return (
    <span className={`group/hint relative z-20 inline-flex shrink-0 ${className}`}>
      <button
        type="button"
        aria-label={hint}
        className="flex h-4 w-4 items-center justify-center rounded text-[#bdbdbd] transition-colors hover:bg-black/[0.05] hover:text-[#636161] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff4e49]/30"
      >
        <Info size={12} strokeWidth={2} aria-hidden />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-[calc(100%+6px)] top-1/2 z-[200] hidden max-w-[min(28rem,calc(100vw-2rem))] -translate-y-1/2 whitespace-nowrap rounded-md border border-[#d4ced3] bg-white px-2.5 py-1.5 text-[11px] leading-none text-[#636161] shadow-[0_4px_12px_rgba(48,47,47,0.12)] group-hover/hint:block group-focus-within/hint:block"
      >
        {hint}
      </span>
    </span>
  );
}
