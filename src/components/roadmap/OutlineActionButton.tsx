import type { ReactNode } from "react";
import { Copy, Plus, Trash2 } from "lucide-react";

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
      className={`peer-ol-action-btn ${variant === "danger" ? "peer-ol-action-btn--danger" : ""}`}
    >
      {children}
    </button>
  );
}

export function OutlineRowActions({ children }: { children: ReactNode }) {
  return <div className="peer-ol-row-actions">{children}</div>;
}

export function OutlineHeadingActions({
  onAdd,
  onDuplicate,
  onDelete,
  showAdd = true,
}: {
  onAdd?: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  showAdd?: boolean;
}) {
  return (
    <OutlineRowActions>
      {showAdd && onAdd ? (
        <OutlineActionButton label="Add heading" onClick={onAdd}>
          <Plus size={13} strokeWidth={2} />
        </OutlineActionButton>
      ) : null}
      <OutlineActionButton label="Duplicate heading" onClick={onDuplicate}>
        <Copy size={12} strokeWidth={2} />
      </OutlineActionButton>
      <OutlineActionButton label="Delete heading" variant="danger" onClick={onDelete}>
        <Trash2 size={12} strokeWidth={2} />
      </OutlineActionButton>
    </OutlineRowActions>
  );
}

export function OutlineContentActions({
  onAdd,
  onDuplicate,
  onDelete,
  showAdd = true,
}: {
  onAdd?: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  showAdd?: boolean;
}) {
  return (
    <OutlineRowActions>
      {showAdd && onAdd ? (
        <OutlineActionButton label="Add section below" onClick={onAdd}>
          <Plus size={13} strokeWidth={2} />
        </OutlineActionButton>
      ) : null}
      <OutlineActionButton label="Duplicate section" onClick={onDuplicate}>
        <Copy size={12} strokeWidth={2} />
      </OutlineActionButton>
      <OutlineActionButton label="Delete section" variant="danger" onClick={onDelete}>
        <Trash2 size={12} strokeWidth={2} />
      </OutlineActionButton>
    </OutlineRowActions>
  );
}
