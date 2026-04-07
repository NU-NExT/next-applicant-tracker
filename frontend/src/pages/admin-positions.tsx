import { useEffect, useState } from "react";
import { GlobalQuestionPicker } from "../components/global-question-picker";
import { PositionQuestionBuilder } from "../components/position-question-builder";
import {
  type AdminJobListingRecord,
  type AdminJobListingCreatePayload,
  type AdminJobListingUpdatePayload,
  createAdminJobListing,
  createPositionQuestion,
  deactivateJobListing,
  getAdminJobListing,
  getAdminJobListings,
  updateAdminJobListing,
} from "../api";
import { Header } from "../components/header";

type FormState = {
  position_title: string;
  code_id: string;
  description: string;

  target_start_date: string;
  listing_date_end: string;
  nuworks_url: string;
  nuworks_position_id: string;
};

const emptyForm: FormState = {
  position_title: "",
  code_id: "",
  description: "",

  target_start_date: "",
  listing_date_end: "",
  nuworks_url: "",
  nuworks_position_id: "",
};

function toIsoDate(value: string): string | null {
  if (!value) return null;
  return new Date(value).toISOString();
}

function fromIsoDate(value: string | null | undefined): string {
  if (!value) return "";
  return value.slice(0, 10); // "YYYY-MM-DD" for <input type="date">
}

export function AdminPositionsPage() {
  const token = localStorage.getItem("auth_access_token") ?? "";
  const [positions, setPositions] = useState<AdminJobListingRecord[]>([]);
  const [mode, setMode] = useState<"idle" | "create" | "edit">("idle");
  const [selected, setSelected] = useState<AdminJobListingRecord | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [statusMessage, setStatusMessage] = useState("");
  const [copyLabel, setCopyLabel] = useState("Copy");
  const [bufferedQuestions, setBufferedQuestions] = useState<
    { prompt: string; character_limit: number | null }[]
  >([]);
  const [selectedGlobalIds, setSelectedGlobalIds] = useState<number[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const data = await getAdminJobListings(token);
        setPositions(data);
      } catch {
        setStatusMessage("Failed to load positions.");
      }
    })();
  }, [token]);

  function selectPosition(pos: AdminJobListingRecord) {
    setSelected(pos);
    setMode("edit");
    setStatusMessage("");
    setCopyLabel("Copy");
    setBufferedQuestions([]);
    setForm({
      position_title: pos.position_title,
      code_id: pos.code_id ?? "",
      description: pos.description,

      target_start_date: fromIsoDate(pos.target_start_date),
      listing_date_end: fromIsoDate(pos.listing_date_end),
      nuworks_url: pos.nuworks_url ?? "",
      nuworks_position_id: pos.nuworks_position_id ?? "",
    });
  }

  function startCreate() {
    setSelected(null);
    setMode("create");
    setStatusMessage("");
    setForm(emptyForm);
    setBufferedQuestions([]);
  }

  async function handleSave() {
    if (!form.position_title.trim()) {
      setStatusMessage("Title is required.");
      return;
    }
    if (mode === "create" && !form.code_id.trim()) {
      setStatusMessage("Position code is required.");
      return;
    }
    if (!form.description.trim()) {
      setStatusMessage("Description is required.");
      return;
    }

    try {
      if (mode === "create") {
        const payload: AdminJobListingCreatePayload = {
          position_title: form.position_title.trim(),
          code_id: form.code_id.trim().toUpperCase(),
          description: form.description.trim(),

          target_start_date: toIsoDate(form.target_start_date),
          listing_date_end: toIsoDate(form.listing_date_end),
          nuworks_url: form.nuworks_url.trim() || null,
          nuworks_position_id: form.nuworks_position_id.trim() || null,
          global_question_ids: selectedGlobalIds,
        };
        const created = await createAdminJobListing(token, payload);
        for (const q of bufferedQuestions) {
          await createPositionQuestion(token, created.listing_id, q);
        }
        setBufferedQuestions([]);
        setSelectedGlobalIds([]);
        const refreshed = await getAdminJobListing(token, created.listing_id);
        setPositions((prev) => [refreshed, ...prev]);
        selectPosition(refreshed);
        setStatusMessage("Position created.");
      } else if (mode === "edit" && selected) {
        const payload: AdminJobListingUpdatePayload = {
          position_title: form.position_title.trim(),
          description: form.description.trim(),

          target_start_date: toIsoDate(form.target_start_date),
          listing_date_end: toIsoDate(form.listing_date_end),
          nuworks_url: form.nuworks_url.trim() || null,
          nuworks_position_id: form.nuworks_position_id.trim() || null,
        };
        const updated = await updateAdminJobListing(token, selected.listing_id, payload);
        setPositions((prev) => prev.map((p) => (p.listing_id === updated.listing_id ? updated : p)));
        setSelected(updated);
        setStatusMessage("Saved.");
      }
    } catch {
      setStatusMessage("Failed to save. Please try again.");
    }
  }

  async function handleDeactivate() {
    if (!selected) return;
    const confirmed = window.confirm(
      "Deactivate this position? It will no longer appear on the application form."
    );
    if (!confirmed) return;
    try {
      const updated = await deactivateJobListing(token, selected.listing_id);
      setPositions((prev) => prev.map((p) => (p.listing_id === updated.listing_id ? updated : p)));
      setSelected(updated);
      setStatusMessage("Position deactivated.");
    } catch {
      setStatusMessage("Failed to deactivate.");
    }
  }

  async function handleReactivate() {
    if (!selected) return;
    const confirmed = window.confirm(
      "Reactivate this position? It will appear on the application form again."
    );
    if (!confirmed) return;
    try {
      const updated = await updateAdminJobListing(token, selected.listing_id, { is_active: true });
      setPositions((prev) => prev.map((p) => (p.listing_id === updated.listing_id ? updated : p)));
      setSelected(updated);
      setStatusMessage("Position reactivated.");
    } catch {
      setStatusMessage("Failed to reactivate.");
    }
  }

  function handleCopyIntakeUrl() {
    if (!selected?.intake_url) return;
    void navigator.clipboard.writeText(selected.intake_url).then(() => {
      setCopyLabel("Copied!");
      setTimeout(() => setCopyLabel("Copy"), 2000);
    });
  }

  return (
    <div className="min-h-screen bg-[#ececec]">
      <Header />
      <main className="mx-auto max-w-[1200px] px-4 pb-8 pt-24">
        <div className="rounded border border-[#c7c7c7] bg-[#d8d8d8] p-5">
          <h1 className="text-3xl font-semibold text-[#1f1f1f]">Positions</h1>

          <div className="mt-5 grid gap-5 md:grid-cols-[280px_1fr]">
            {/* Left panel — position list */}
            <div>
              <button
                onClick={startCreate}
                className="mb-3 w-full rounded bg-[#1f6f5f] px-4 py-2 text-sm font-medium text-white hover:bg-[#185f50]"
              >
                + New Position
              </button>
              <div className="space-y-2">
                {positions.map((pos) => (
                  <button
                    key={pos.listing_id}
                    onClick={() => selectPosition(pos)}
                    className={`w-full rounded border px-3 py-2 text-left text-sm transition-colors ${
                      selected?.listing_id === pos.listing_id
                        ? "border-[#1f6f5f] bg-white"
                        : "border-[#c7c7c7] bg-[#f0f0f0] hover:bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium text-[#1f1f1f]">
                        {pos.position_title}
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                          pos.is_active
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-200 text-gray-500"
                        }`}
                      >
                        {pos.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs text-[#666]">{pos.code_id}</div>
                  </button>
                ))}
                {positions.length === 0 && (
                  <p className="text-sm text-[#888]">No positions yet.</p>
                )}
              </div>
            </div>

            {/* Right panel — form */}
            {mode !== "idle" && (
              <div className="rounded border border-[#c7c7c7] bg-white p-5">
                <h2 className="mb-4 border-b border-[#d8d8d8] pb-2 text-lg font-semibold text-[#1f1f1f]">
                  {mode === "create" ? "New Position" : "Edit Position"}
                </h2>

                <div className="space-y-4">
                  {/* Title */}
                  <label className="block text-sm font-medium text-[#2d2d2d]">
                    Title *
                    <input
                      value={form.position_title}
                      onChange={(e) => setForm((f) => ({ ...f, position_title: e.target.value }))}
                      className="mt-1 w-full rounded border border-[#d0d0d0] px-3 py-2 text-sm"
                      placeholder="e.g. Software Engineer"
                    />
                  </label>

                  {/* Position Code */}
                  {mode === "create" ? (
                    <label className="block text-sm font-medium text-[#2d2d2d]">
                      Position Code *
                      <input
                        value={form.code_id}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, code_id: e.target.value.toUpperCase() }))
                        }
                        className="mt-1 w-full rounded border border-[#d0d0d0] px-3 py-2 text-sm font-mono"
                        placeholder="e.g. SWE-2025"
                      />
                      <span className="mt-1 block text-xs text-[#888]">
                        Uppercase letters, numbers, hyphens. Cannot be changed after creation.
                      </span>
                    </label>
                  ) : (
                    <div className="text-sm">
                      <p className="font-medium text-[#2d2d2d]">Position Code</p>
                      <p className="mt-1 font-mono text-[#555]">{selected?.code_id}</p>
                    </div>
                  )}

                  {/* Description */}
                  <label className="block text-sm font-medium text-[#2d2d2d]">
                    Description *
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      rows={4}
                      className="mt-1 w-full rounded border border-[#d0d0d0] px-3 py-2 text-sm"
                      placeholder="Describe the role..."
                    />
                  </label>

                  {/* Dates */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm font-medium text-[#2d2d2d]">
                      Target Start Date
                      <input
                        type="date"
                        value={form.target_start_date}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, target_start_date: e.target.value }))
                        }
                        className="mt-1 w-full rounded border border-[#d0d0d0] px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="block text-sm font-medium text-[#2d2d2d]">
                      Application Deadline
                      <input
                        type="date"
                        value={form.listing_date_end}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, listing_date_end: e.target.value }))
                        }
                        className="mt-1 w-full rounded border border-[#d0d0d0] px-3 py-2 text-sm"
                      />
                    </label>
                  </div>

                  {/* NUworks */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm font-medium text-[#2d2d2d]">
                      NUworks URL
                      <input
                        value={form.nuworks_url}
                        onChange={(e) => setForm((f) => ({ ...f, nuworks_url: e.target.value }))}
                        className="mt-1 w-full rounded border border-[#d0d0d0] px-3 py-2 text-sm"
                        placeholder="https://northeastern.joinhandshake.com/..."
                      />
                    </label>
                    <label className="block text-sm font-medium text-[#2d2d2d]">
                      NUworks Position ID
                      <input
                        value={form.nuworks_position_id}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, nuworks_position_id: e.target.value }))
                        }
                        className="mt-1 w-full rounded border border-[#d0d0d0] px-3 py-2 text-sm"
                        placeholder="e.g. 12345678"
                      />
                    </label>
                  </div>

                  {/* Intake URL (edit only) */}
                  {mode === "edit" && selected && (
                    <div>
                      <p className="mb-1 text-sm font-medium text-[#2d2d2d]">Intake URL</p>
                      <div className="flex gap-2">
                        <input
                          readOnly
                          value={selected.intake_url}
                          className="flex-1 rounded border border-[#d0d0d0] bg-[#f8f8f8] px-3 py-2 text-sm font-mono text-[#555]"
                        />
                        <button
                          onClick={handleCopyIntakeUrl}
                          className="rounded border border-[#c7c7c7] bg-white px-3 py-2 text-sm text-[#2d2d2d] hover:bg-[#f0f0f0]"
                        >
                          {copyLabel}
                        </button>
                      </div>
                      <p className="mt-1 text-xs text-[#888]">
                        Share this URL with candidates to apply for this position.
                      </p>
                    </div>
                  )}

                  {/* Stats (edit only) */}
                  {mode === "edit" && selected && (
                    <div className="flex gap-6 text-sm text-[#555]">
                      <span>{selected.application_count} application{selected.application_count !== 1 ? "s" : ""}</span>
                      <span>{selected.question_count} question{selected.question_count !== 1 ? "s" : ""}</span>
                    </div>
                  )}

                  {/* Global question picker */}
                  {mode === "edit" && selected && (
                    <GlobalQuestionPicker listingId={selected.listing_id} token={token} />
                  )}
                  {mode === "create" && (
                    <GlobalQuestionPicker
                      listingId={null}
                      token={token}
                      onSelectionChange={setSelectedGlobalIds}
                    />
                  )}

                  {/* Position-specific question builder */}
                  {mode === "edit" && selected && (
                    <PositionQuestionBuilder listingId={selected.listing_id} token={token} />
                  )}
                  {mode === "create" && (
                    <PositionQuestionBuilder
                      listingId={null}
                      token={token}
                      onQuestionsChange={setBufferedQuestions}
                    />
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-3 border-t border-[#e8e8e8] pt-4">
                    <button
                      onClick={() => void handleSave()}
                      className="rounded bg-[#1f6f5f] px-5 py-2 text-sm font-medium text-white hover:bg-[#185f50]"
                    >
                      {mode === "create" ? "Create Position" : "Save Changes"}
                    </button>

                    {mode === "edit" && selected?.is_active && (
                      <button
                        onClick={() => void handleDeactivate()}
                        className="rounded border border-[#b8b8b8] px-4 py-2 text-sm text-[#7a1d1d] hover:bg-[#fdf0f0]"
                      >
                        Deactivate
                      </button>
                    )}

                    {mode === "edit" && !selected?.is_active && (
                      <button
                        onClick={() => void handleReactivate()}
                        className="rounded border border-[#1f6f5f] px-4 py-2 text-sm text-[#1f6f5f] hover:bg-[#f0faf7]"
                      >
                        Reactivate
                      </button>
                    )}
                  </div>

                  {statusMessage && (
                    <p className="text-sm text-[#555]">{statusMessage}</p>
                  )}
                </div>
              </div>
            )}

            {mode === "idle" && (
              <div className="flex items-center justify-center rounded border border-dashed border-[#c7c7c7] bg-white p-12 text-sm text-[#888]">
                Select a position to edit, or create a new one.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
