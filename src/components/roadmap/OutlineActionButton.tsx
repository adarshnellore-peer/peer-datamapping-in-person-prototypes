import type { ReactNode } from "react";

export function OutlineActionButton({
  label,
  onClick,
  variant = "default",
  children,
}: {
  label: string;
  onClick: () => void;
  variant?: "default" | "danger";
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded transition-colors ${
        variant === "danger"
          ? "text-[#bdbdbd] hover:bg-[#fff0f0] hover:text-[#ff4e49]"
          : "text-[#bdbdbd] hover:bg-black/[0.06] hover:text-[#636161]"
      }`}
    >
      {children}
    </button>
  );
}

export function OutlineRowActions({ children }: { children: ReactNode }) {
  return (
    <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover/toc-row:opacity-100 group-focus-within/toc-row:opacity-100 group-hover/outline-row:opacity-100 group-focus-within/outline-row:opacity-100">
      {children}
    </div>
  );
}
