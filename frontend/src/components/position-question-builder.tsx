import { useEffect, useState } from "react";
import {
  type PositionQuestionRecord,
  createPositionQuestion,
  deletePositionQuestion,
  getPositionQuestions,
  reorderPositionQuestions,
  updatePositionQuestion,
} from "../api";

// Used in buffered (create) mode — client-only, never sent to server
type LocalQuestion = {
  _localId: number;
  prompt: string;
  character_limit: number | null;
};

export type BufferedQuestion = { prompt: string; character_limit: number | null };

type Props = {
  listingId: number | null; // null = buffered/create mode
  token: string;
  onQuestionsChange?: (questions: BufferedQuestion[]) => void;
};

type EditForm = { prompt: string; characterLimit: string };
type NewForm = { prompt: string; characterLimit: string };

const emptyNewForm: NewForm = { prompt: "", characterLimit: "" };

function parseCharacterLimit(value: string): number | null {
  const n = parseInt(value, 10);
  return isNaN(n) || n <= 0 ? null : n;
}

export function PositionQuestionBuilder({ listingId, token, onQuestionsChange }: Props) {
  const isBuffered = listingId === null;

  // Edit-mode state (API-backed)
  const [questions, setQuestions] = useState<PositionQuestionRecord[]>([]);

  // Buffered-mode state (local only)
  const [localQuestions, setLocalQuestions] = useState<LocalQuestion[]>([]);
  const [localIdCounter, setLocalIdCounter] = useState(0);

  // Shared state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ prompt: "", characterLimit: "" });
  const [adding, setAdding] = useState(false);
  const [newForm, setNewForm] = useState<NewForm>(emptyNewForm);
  const [statusMessage, setStatusMessage] = useState("");

  // Fetch questions when in edit mode
  useEffect(() => {
    if (isBuffered) return;
    void (async () => {
      try {
        const data = await getPositionQuestions(token, listingId);
        setQuestions(data);
      } catch {
        setStatusMessage("Failed to load questions.");
      }
    })();
  }, [token, listingId, isBuffered]);

  // Reset buffered state if listingId ever switches from null to a number
  useEffect(() => {
    if (!isBuffered) {
      setLocalQuestions([]);
      setLocalIdCounter(0);
    }
  }, [isBuffered]);

  // Notify parent of buffered question changes
  function notifyBuffered(updated: LocalQuestion[]) {
    onQuestionsChange?.(updated.map(({ prompt, character_limit }) => ({ prompt, character_limit })));
  }

  // ── Move up / down ──────────────────────────────────────────────────────

  async function handleMoveUp(index: number) {
    if (index === 0) return;
    if (isBuffered) {
      const next = [...localQuestions];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      setLocalQuestions(next);
      notifyBuffered(next);
    } else {
      const newOrder = questions.map((q) => q.question_id);
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
      try {
        const updated = await reorderPositionQuestions(token, listingId, newOrder);
        setQuestions(updated);
      } catch {
        setStatusMessage("Failed to reorder.");
      }
    }
  }

  async function handleMoveDown(index: number) {
    const listLen = isBuffered ? localQuestions.length : questions.length;
    if (index === listLen - 1) return;
    if (isBuffered) {
      const next = [...localQuestions];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      setLocalQuestions(next);
      notifyBuffered(next);
    } else {
      const newOrder = questions.map((q) => q.question_id);
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      try {
        const updated = await reorderPositionQuestions(token, listingId, newOrder);
        setQuestions(updated);
      } catch {
        setStatusMessage("Failed to reorder.");
      }
    }
  }

  // ── Edit ────────────────────────────────────────────────────────────────

  function startEditLocal(q: LocalQuestion) {
    setEditingId(q._localId);
    setEditForm({
      prompt: q.prompt,
      characterLimit: q.character_limit != null ? String(q.character_limit) : "",
    });
    setAdding(false);
  }

  function startEditRemote(q: PositionQuestionRecord) {
    setEditingId(q.question_id);
    setEditForm({
      prompt: q.prompt,
      characterLimit: q.character_limit != null ? String(q.character_limit) : "",
    });
    setAdding(false);
  }

  async function handleSaveEdit(key: number) {
    if (!editForm.prompt.trim()) {
      setStatusMessage("Prompt is required.");
      return;
    }
    if (isBuffered) {
      const next = localQuestions.map((q) =>
        q._localId === key
          ? { ...q, prompt: editForm.prompt.trim(), character_limit: parseCharacterLimit(editForm.characterLimit) }
          : q
      );
      setLocalQuestions(next);
      notifyBuffered(next);
      setEditingId(null);
      setStatusMessage("");
    } else {
      try {
        const updated = await updatePositionQuestion(token, listingId, key, {
          prompt: editForm.prompt.trim(),
          character_limit: parseCharacterLimit(editForm.characterLimit),
        });
        setQuestions((prev) => prev.map((q) => (q.question_id === updated.question_id ? updated : q)));
        setEditingId(null);
        setStatusMessage("");
      } catch {
        setStatusMessage("Failed to save.");
      }
    }
  }

  // ── Delete ──────────────────────────────────────────────────────────────

  async function handleDelete(key: number) {
    const confirmed = window.confirm("Delete this question? This cannot be undone.");
    if (!confirmed) return;
    if (isBuffered) {
      const next = localQuestions.filter((q) => q._localId !== key);
      setLocalQuestions(next);
      notifyBuffered(next);
      if (editingId === key) setEditingId(null);
      setStatusMessage("");
    } else {
      try {
        await deletePositionQuestion(token, listingId, key);
        const refreshed = await getPositionQuestions(token, listingId);
        setQuestions(refreshed);
        if (editingId === key) setEditingId(null);
        setStatusMessage("");
      } catch {
        setStatusMessage("Failed to delete.");
      }
    }
  }

  // ── Add ─────────────────────────────────────────────────────────────────

  async function handleAdd() {
    if (!newForm.prompt.trim()) {
      setStatusMessage("Prompt is required.");
      return;
    }
    if (isBuffered) {
      const newQ: LocalQuestion = {
        _localId: localIdCounter,
        prompt: newForm.prompt.trim(),
        character_limit: parseCharacterLimit(newForm.characterLimit),
      };
      const next = [...localQuestions, newQ];
      setLocalQuestions(next);
      setLocalIdCounter((c) => c + 1);
      notifyBuffered(next);
      setAdding(false);
      setNewForm(emptyNewForm);
      setStatusMessage("");
    } else {
      try {
        await createPositionQuestion(token, listingId, {
          prompt: newForm.prompt.trim(),
          character_limit: parseCharacterLimit(newForm.characterLimit),
        });
        const refreshed = await getPositionQuestions(token, listingId);
        setQuestions(refreshed);
        setAdding(false);
        setNewForm(emptyNewForm);
        setStatusMessage("");
      } catch {
        setStatusMessage("Failed to add question.");
      }
    }
  }

  // ── Render helpers ───────────────────────────────────────────────────────

  const displayList = isBuffered
    ? localQuestions.map((q) => ({
        key: q._localId,
        prompt: q.prompt,
        character_limit: q.character_limit,
        onStartEdit: () => startEditLocal(q),
        onDelete: () => void handleDelete(q._localId),
        isEditing: editingId === q._localId,
        editKey: q._localId,
      }))
    : questions.map((q) => ({
        key: q.question_id,
        prompt: q.prompt,
        character_limit: q.character_limit,
        onStartEdit: () => startEditRemote(q),
        onDelete: () => void handleDelete(q.question_id),
        isEditing: editingId === q.question_id,
        editKey: q.question_id,
      }));

  return (
    <div className="mt-5 border-t border-[#e8e8e8] pt-4">
      <h3 className="mb-3 text-sm font-semibold text-[#2d2d2d]">Position Questions</h3>

      {isBuffered && (
        <p className="mb-2 text-xs italic text-[#888]">
          Questions will be saved when you create the position.
        </p>
      )}

      {displayList.length === 0 && !adding && (
        <p className="mb-3 text-sm text-[#888]">No questions yet.</p>
      )}

      {displayList.length > 0 && (
        <ul className="mb-3 space-y-2">
          {displayList.map((item, index) =>
            item.isEditing ? (
              /* Inline edit row */
              <li key={item.key} className="rounded border border-[#1f6f5f] bg-[#f8fffe] p-3">
                <textarea
                  value={editForm.prompt}
                  onChange={(e) => setEditForm((f) => ({ ...f, prompt: e.target.value }))}
                  rows={2}
                  className="w-full rounded border border-[#d0d0d0] px-2 py-1 text-sm"
                  placeholder="Question prompt"
                />
                <div className="mt-2 flex items-center gap-3">
                  <label className="flex items-center gap-1 text-xs text-[#555]">
                    Char limit
                    <input
                      type="number"
                      min={1}
                      value={editForm.characterLimit}
                      onChange={(e) => setEditForm((f) => ({ ...f, characterLimit: e.target.value }))}
                      className="w-20 rounded border border-[#d0d0d0] px-2 py-1 text-xs"
                      placeholder="none"
                    />
                  </label>
                  <button
                    onClick={() => void handleSaveEdit(item.editKey)}
                    className="rounded bg-[#1f6f5f] px-3 py-1 text-xs font-medium text-white hover:bg-[#185f50]"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="rounded border border-[#c7c7c7] px-3 py-1 text-xs text-[#555] hover:bg-[#f0f0f0]"
                  >
                    Cancel
                  </button>
                </div>
              </li>
            ) : (
              /* Normal row */
              <li
                key={item.key}
                className="flex items-start gap-2 rounded border border-[#e0e0e0] bg-[#fafafa] px-3 py-2"
              >
                {/* Up/down controls */}
                <div className="flex shrink-0 flex-col gap-0.5 pt-0.5">
                  <button
                    onClick={() => void handleMoveUp(index)}
                    disabled={index === 0}
                    className="rounded px-1 py-0.5 text-xs text-[#888] hover:bg-[#e8e8e8] disabled:opacity-30"
                    title="Move up"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => void handleMoveDown(index)}
                    disabled={index === displayList.length - 1}
                    className="rounded px-1 py-0.5 text-xs text-[#888] hover:bg-[#e8e8e8] disabled:opacity-30"
                    title="Move down"
                  >
                    ▼
                  </button>
                </div>

                {/* Prompt */}
                <p className="flex-1 text-sm text-[#1f1f1f]">{item.prompt}</p>

                {/* Character limit badge */}
                {item.character_limit != null && (
                  <span className="shrink-0 rounded bg-[#e8e8e8] px-2 py-0.5 text-xs text-[#555]">
                    {item.character_limit} chars
                  </span>
                )}

                {/* Actions */}
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={item.onStartEdit}
                    className="rounded border border-[#c7c7c7] px-2 py-0.5 text-xs text-[#2d2d2d] hover:bg-[#f0f0f0]"
                  >
                    Edit
                  </button>
                  <button
                    onClick={item.onDelete}
                    className="rounded border border-[#c7c7c7] px-2 py-0.5 text-xs text-[#7a1d1d] hover:bg-[#fdf0f0]"
                  >
                    Delete
                  </button>
                </div>
              </li>
            )
          )}
        </ul>
      )}

      {/* Add question form */}
      {adding && (
        <div className="mb-3 rounded border border-[#1f6f5f] bg-[#f8fffe] p-3">
          <textarea
            value={newForm.prompt}
            onChange={(e) => setNewForm((f) => ({ ...f, prompt: e.target.value }))}
            rows={2}
            className="w-full rounded border border-[#d0d0d0] px-2 py-1 text-sm"
            placeholder="Question prompt *"
            autoFocus
          />
          <div className="mt-2 flex items-center gap-3">
            <label className="flex items-center gap-1 text-xs text-[#555]">
              Char limit
              <input
                type="number"
                min={1}
                value={newForm.characterLimit}
                onChange={(e) => setNewForm((f) => ({ ...f, characterLimit: e.target.value }))}
                className="w-20 rounded border border-[#d0d0d0] px-2 py-1 text-xs"
                placeholder="none"
              />
            </label>
            <button
              onClick={() => void handleAdd()}
              className="rounded bg-[#1f6f5f] px-3 py-1 text-xs font-medium text-white hover:bg-[#185f50]"
            >
              Add
            </button>
            <button
              onClick={() => {
                setAdding(false);
                setNewForm(emptyNewForm);
                setStatusMessage("");
              }}
              className="rounded border border-[#c7c7c7] px-3 py-1 text-xs text-[#555] hover:bg-[#f0f0f0]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!adding && (
        <button
          onClick={() => {
            setAdding(true);
            setEditingId(null);
          }}
          className="rounded border border-[#1f6f5f] px-3 py-1.5 text-xs font-medium text-[#1f6f5f] hover:bg-[#f0faf7]"
        >
          + Add Question
        </button>
      )}

      {statusMessage && <p className="mt-2 text-xs text-[#555]">{statusMessage}</p>}
    </div>
  );
}
