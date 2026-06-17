import { useEffect, useState } from "react";
import { PeerSelect } from "./PeerSelect";
import { SidePanel } from "./SidePanel";
import { OUTPUT_TYPES } from "../data/roadmap";

export function EditRulesPanel({
  prompt,
  outputType,
  onClose,
  onSave,
}: {
  prompt: string;
  outputType: string;
  onClose: () => void;
  onSave: (data: { prompt: string; outputType: string }) => void;
}) {
  const [draftPrompt, setDraftPrompt] = useState(prompt);
  const [draftOutput, setDraftOutput] = useState(outputType);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setDraftPrompt(prompt);
    setDraftOutput(outputType);
    setDirty(false);
  }, [prompt, outputType]);

  return (
    <SidePanel
      title="Section rules"
      subtitle="System prompt and output type for this entire section."
      onClose={onClose}
      footer={
        <button
          type="button"
          disabled={!dirty}
          onClick={() => onSave({ prompt: draftPrompt, outputType: draftOutput })}
          className="peer-btn-primary disabled:cursor-not-allowed disabled:bg-[#d4ced3]"
        >
          Save rules
        </button>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-[13px] text-[#616161]">
            Rules / system prompt
          </label>
          <textarea
            value={draftPrompt}
            onChange={(e) => {
              setDraftPrompt(e.target.value);
              setDirty(true);
            }}
            rows={14}
            className="w-full resize-y rounded border border-[#d4ced3] px-3 py-2.5 font-mono text-[13px] leading-relaxed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff4e49]/30"
          />
        </div>
        <PeerSelect
          label="Output type"
          required
          value={draftOutput}
          options={OUTPUT_TYPES}
          onChange={(value) => {
            setDraftOutput(value);
            setDirty(true);
          }}
        />
      </div>
    </SidePanel>
  );
}
