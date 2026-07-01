import { useState } from "react";
import { Plus } from "lucide-react";
import { acceptsV2Drag, getActiveV2DragPayload } from "../../utils/v2DragPayload";

export function AddEvidenceDropZone({
  onDrop,
  solo = false,
}: {
  onDrop: (dataTransfer: DataTransfer) => void;
  /** Empty beat card: flush layout without top margin. */
  solo?: boolean;
}) {
  const [dragOver, setDragOver] = useState(false);

  const acceptsDrag = (dataTransfer: DataTransfer | null) => acceptsV2Drag(dataTransfer);

  const handleDragEnter = (event: React.DragEvent) => {
    if (!acceptsDrag(event.dataTransfer)) return;
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragOver = (event: React.DragEvent) => {
    if (!acceptsDrag(event.dataTransfer)) return;
    event.preventDefault();
    event.stopPropagation();
    const payload = getActiveV2DragPayload();
    event.dataTransfer.dropEffect = payload?.kind === "mapped" ? "move" : "copy";
    setDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    const next = event.relatedTarget as Node | null;
    if (!next || !event.currentTarget.contains(next)) {
      setDragOver(false);
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    if (!acceptsDrag(event.dataTransfer)) return;
    event.preventDefault();
    event.stopPropagation();
    setDragOver(false);
    onDrop(event.dataTransfer);
  };

  return (
    <div
      aria-label="Add source or content — drag from the library or outline"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`peer-add-source-zone peer-add-evidence-zone is-expanded ${solo ? "peer-add-evidence-zone--solo" : ""} ${
        dragOver ? "is-drag-over" : ""
      }`}
    >
      <span className="peer-add-source-zone-icon" aria-hidden>
        <Plus size={14} strokeWidth={2} />
      </span>
      <span className="peer-add-source-zone-text">Add source or content</span>
      <span className="peer-add-source-zone-hint">Drag from the library or outline</span>
    </div>
  );
}
