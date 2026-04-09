import { useEffect, useState } from "react";
import {
  type GlobalQuestionRecord,
  getGlobalQuestionBank,
  getPositionGlobalQuestions,
  setPositionGlobalQuestions,
} from "../api";

type Props = {
  token: string;
  listingId: number | null; // null = buffered/create mode
  onSelectionChange?: (ids: number[]) => void; // for buffered mode
};

export function GlobalQuestionPicker({ token, listingId, onSelectionChange }: Props) {
  const isBuffered = listingId === null;

  const [bank, setBank] = useState<GlobalQuestionRecord[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const allGlobal = await getGlobalQuestionBank(token);
        setBank(allGlobal);

        if (!isBuffered && listingId != null) {
          const selected = await getPositionGlobalQuestions(token, listingId);
          setSelectedIds(new Set(selected.map((q) => q.question_id)));
        }
      } catch {
        setStatusMessage("Failed to load global questions.");
      } finally {
        setLoading(false);
      }
    })();
  }, [token, listingId, isBuffered]);

  function toggleQuestion(questionId: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      if (isBuffered) {
        onSelectionChange?.(Array.from(next));
      }
      return next;
    });
  }

  function selectAll() {
    const allIds = new Set(bank.map((q) => q.question_id));
    setSelectedIds(allIds);
    if (isBuffered) {
      onSelectionChange?.(Array.from(allIds));
    }
  }

  function deselectAll() {
    setSelectedIds(new Set());
    if (isBuffered) {
      onSelectionChange?.([]);
    }
  }

  async function handleSave() {
    if (isBuffered || listingId === null) return;
    try {
      await setPositionGlobalQuestions(token, listingId, Array.from(selectedIds));
      setStatusMessage("Global questions updated.");
      setTimeout(() => setStatusMessage(""), 2000);
    } catch {
      setStatusMessage("Failed to save global questions.");
    }
  }

  if (loading) {
    return (
      <div className="mt-5 border-t border-[#e8e8e8] pt-4">
        <h3 className="mb-3 text-sm font-semibold text-[#2d2d2d]">Global Questions</h3>
        <p className="text-sm text-[#888]">Loading...</p>
      </div>
    );
  }

  return (
    <div className="mt-5 border-t border-[#e8e8e8] pt-4">
      <h3 className="mb-1 text-sm font-semibold text-[#2d2d2d]">Global Questions</h3>
      <p className="mb-3 text-xs text-[#888]">
        {isBuffered
          ? "Select which global questions to include for this position."
          : "Select which global questions appear for this position."}
      </p>

      {bank.length === 0 ? (
        <p className="text-sm text-[#888]">No global questions in bank.</p>
      ) : (
        <>
          <div className="mb-2 flex gap-2">
            <button
              type="button"
              onClick={selectAll}
              className="rounded border border-[#c7c7c7] px-2 py-0.5 text-xs text-[#555] hover:bg-[#f0f0f0]"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={deselectAll}
              className="rounded border border-[#c7c7c7] px-2 py-0.5 text-xs text-[#555] hover:bg-[#f0f0f0]"
            >
              Deselect All
            </button>
            <span className="ml-auto text-xs text-[#888]">
              {selectedIds.size} / {bank.length} selected
            </span>
          </div>

          <ul className="mb-3 space-y-1">
            {bank.map((q) => (
              <li
                key={q.question_id}
                className="flex items-center gap-2 rounded border border-[#e0e0e0] bg-[#fafafa] px-3 py-2"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(q.question_id)}
                  onChange={() => toggleQuestion(q.question_id)}
                  className="h-4 w-4 accent-[#1f6f5f]"
                />
                <span className="flex-1 text-sm text-[#1f1f1f]">{q.prompt}</span>
                {q.character_limit != null && (
                  <span className="shrink-0 rounded bg-[#e8e8e8] px-2 py-0.5 text-xs text-[#555]">
                    {q.character_limit} chars
                  </span>
                )}
              </li>
            ))}
          </ul>

          {!isBuffered && (
            <button
              type="button"
              onClick={() => void handleSave()}
              className="rounded bg-[#1f6f5f] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#185f50]"
            >
              Save Global Question Selection
            </button>
          )}
        </>
      )}

      {statusMessage && <p className="mt-2 text-xs text-[#555]">{statusMessage}</p>}
    </div>
  );
}
