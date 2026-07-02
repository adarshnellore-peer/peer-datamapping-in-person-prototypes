import {
  blockOutputTypeIcon,
  blockOutputTypeLabel,
} from "../variants/types";

export function BlockOutputTypeIcon({
  outputType,
  size = "sm",
  className = "",
}: {
  outputType?: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const Icon = blockOutputTypeIcon(outputType);
  const label = blockOutputTypeLabel(outputType);
  const pixelSize = size === "md" ? 14 : 13;

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center text-[var(--peer-text-secondary)] ${className}`}
      title={label}
      aria-label={label}
    >
      <Icon size={pixelSize} strokeWidth={1.75} aria-hidden />
    </span>
  );
}
