import { useEffect, useState } from "react";

import {
  createFieldOption,
  deleteFieldOption,
  getAdminJobListings,
  getJobListing,
  getFieldOptions,
  type FieldOptionRecord,
  type JobListingRecord,
  updateJobListing,
} from "../api";
import { Header } from "../components/header";

type QuestionEditorRow = {
  prompt: string;
  question_type: "free_text" | "dropdown" | "number" | "date";
  character_limit: number | null;
  managedCategory: "" | "major" | "minor" | "concentration";
  options: string[];
  is_global: boolean;
};

function toQuestionRows(listing: JobListingRecord | null): QuestionEditorRow[] {
  if (!listing?.questions?.length) {
    return [
      {
        prompt: "",
        question_type: "free_text",
        character_limit: null,
        managedCategory: "",
        options: [],
        is_global: false,
      },
    ];
  }
  return listing.questions
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((question) => {
      const cfg = (question.question_config_json ?? {}) as { options?: string[]; options_source?: string };
      const source = cfg.options_source;
      return {
        prompt: question.prompt,
        question_type: (question.question_type as QuestionEditorRow["question_type"]) ?? "free_text",
        character_limit: question.character_limit ?? null,
        managedCategory: source === "major" || source === "minor" || source === "concentration" ? source : "",
        options: Array.isArray(cfg.options) ? cfg.options : [],
        is_global: Boolean(question.is_global),
      };
    });
}

export function AdminEditJobPostPage() {
  const token = localStorage.getItem("auth_access_token") ?? "";
  const [selected, setSelected] = useState<JobListingRecord | null>(null);
  const [listings, setListings] = useState<JobListingRecord[]>([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [descriptionText, setDescriptionText] = useState("");
  const [questionRows, setQuestionRows] = useState<QuestionEditorRow[]>([]);
  const [fieldOptions, setFieldOptions] = useState<Record<string, FieldOptionRecord[]>>({
    major: [],
    minor: [],
    concentration: [],
  });
  const [newManagedOption, setNewManagedOption] = useState<Record<string, string>>({
    major: "",
    minor: "",
    concentration: "",
  });

  const refreshFieldOptions = async () => {
    const [major, minor, concentration] = await Promise.all([
      getFieldOptions("major"),
      getFieldOptions("minor"),
      getFieldOptions("concentration"),
    ]);
    setFieldOptions({ major, minor, concentration });
  };

  useEffect(() => {
    void (async () => {
      try {
        if (!token) {
          setListings([]);
          return;
        }
        const adminListings = await getAdminJobListings(token);
        const unpostedIds = adminListings.filter((row) => !row.listing_date_posted).map((row) => row.listing_id);
        const rows = await Promise.all(unpostedIds.map((id) => getJobListing(id)));
        setListings(rows);
      } catch {
        setListings([]);
      }
    })();
    void refreshFieldOptions();
  }, [token]);

  useEffect(() => {
    if (!selected) return;
    setDescriptionText(selected.description ?? "");
    setQuestionRows(toQuestionRows(selected));
  }, [selected]);

  const onSave = async () => {
    if (!selected) return;
    try {
      await updateJobListing(selected.id, {
        description: descriptionText,
        questions: questionRows
          .filter((question) => question.prompt.trim().length > 0)
          .map((question, idx) => ({
            prompt: question.prompt.trim(),
            sort_order: idx,
            question_type: question.question_type,
            character_limit: question.character_limit,
            is_global: question.is_global,
            question_config_json:
              question.question_type === "dropdown"
                ? {
                    options_source: question.managedCategory || "custom",
                    options:
                      question.managedCategory && fieldOptions[question.managedCategory]
                        ? fieldOptions[question.managedCategory].map((option) => option.value)
                        : question.options,
                  }
                : null,
          })),
      });
      if (!token) return;
      const adminListings = await getAdminJobListings(token);
      const unpostedIds = adminListings.filter((row) => !row.listing_date_posted).map((row) => row.listing_id);
      const refreshed = await Promise.all(unpostedIds.map((id) => getJobListing(id)));
      setListings(refreshed);
      const latestSelected = refreshed.find((row) => row.id === selected.id) ?? null;
      setSelected(latestSelected);
      setStatusMessage("Updated listing questions, types, limits, and dropdown options in Postgres.");
    } catch {
      setStatusMessage("Failed to update listing.");
    }
  };

  return (
    <div className="min-h-screen bg-[#ececec]">
      <Header />
      <main className="mx-auto max-w-[1200px] px-4 pt-24">
        <section className="rounded border border-[#c7c7c7] bg-[#d8d8d8] p-5">
          <h1 className="text-4xl font-semibold text-[#1f1f1f]">Edit Job Post</h1>
          <p className="mt-2 text-[#2d2d2d]">Unposted roles from Postgres:</p>
          <div className="mt-3 flex flex-wrap gap-3">
            {listings.map((listing) => (
              <button
                key={listing.id}
                type="button"
                className="rounded border border-[#8f8f8f] bg-white px-3 py-1.5 underline"
                onClick={() => setSelected(listing)}
              >
                {listing.position_title ?? listing.job}
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="min-h-[320px] rounded border border-[#d0d0d0] bg-white p-3">
              <p className="mb-2 text-sm font-semibold text-[#2d2d2d]">Position Description</p>
              <textarea
                value={descriptionText}
                onChange={(e) => setDescriptionText(e.target.value)}
                className="h-[280px] w-full rounded border border-[#c3c3c3] px-2 py-2"
              />
            </div>
            <div className="min-h-[320px] rounded border border-[#d0d0d0] bg-white p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-[#2d2d2d]">Questions</p>
                <button
                  type="button"
                  className="rounded border border-[#b8b8b8] px-2 py-1 text-xs"
                  onClick={() =>
                    setQuestionRows((prev) => [
                      ...prev,
                      {
                        prompt: "",
                        question_type: "free_text",
                        character_limit: null,
                        managedCategory: "",
                        options: [],
                        is_global: false,
                      },
                    ])
                  }
                >
                  + Question
                </button>
              </div>
              <div className="max-h-[520px] space-y-2 overflow-auto">
                {questionRows.map((question, index) => {
                  const managed = question.managedCategory;
                  const managedOptions = managed ? fieldOptions[managed] ?? [] : [];
                  return (
                    <div key={`${index}-${question.prompt}`} className="rounded border border-[#d8d8d8] bg-[#fafafa] p-2">
                      <div className="grid gap-2 md:grid-cols-[1fr_150px_120px]">
                        <input
                          value={question.prompt}
                          onChange={(e) =>
                            setQuestionRows((prev) => prev.map((q, idx) => (idx === index ? { ...q, prompt: e.target.value } : q)))
                          }
                          placeholder="Question prompt"
                          className="rounded border border-[#c3c3c3] px-2 py-1 text-sm"
                        />
                        <select
                          value={question.question_type}
                          onChange={(e) =>
                            setQuestionRows((prev) =>
                              prev.map((q, idx) =>
                                idx === index ? { ...q, question_type: e.target.value as QuestionEditorRow["question_type"] } : q
                              )
                            )
                          }
                          className="rounded border border-[#c3c3c3] px-2 py-1 text-sm"
                        >
                          <option value="free_text">free_text</option>
                          <option value="dropdown">dropdown</option>
                          <option value="number">number</option>
                          <option value="date">date</option>
                        </select>
                        <input
                          type="number"
                          value={question.character_limit ?? ""}
                          onChange={(e) =>
                            setQuestionRows((prev) =>
                              prev.map((q, idx) =>
                                idx === index ? { ...q, character_limit: e.target.value ? Number(e.target.value) : null } : q
                              )
                            )
                          }
                          placeholder="Char limit"
                          className="rounded border border-[#c3c3c3] px-2 py-1 text-sm"
                        />
                      </div>

                      <label className="mt-2 flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={question.is_global}
                          onChange={(e) =>
                            setQuestionRows((prev) => prev.map((q, idx) => (idx === index ? { ...q, is_global: e.target.checked } : q)))
                          }
                        />
                        Mark as global profile field
                      </label>

                      {question.question_type === "dropdown" ? (
                        <div className="mt-2 space-y-2 rounded border border-[#e0e0e0] bg-white p-2">
                          <select
                            value={question.managedCategory}
                            onChange={(e) =>
                              setQuestionRows((prev) =>
                                prev.map((q, idx) =>
                                  idx === index
                                    ? { ...q, managedCategory: e.target.value as QuestionEditorRow["managedCategory"] }
                                    : q
                                )
                              )
                            }
                            className="rounded border border-[#c3c3c3] px-2 py-1 text-xs"
                          >
                            <option value="">Custom options</option>
                            <option value="major">Major list</option>
                            <option value="minor">Minor list</option>
                            <option value="concentration">Concentration list</option>
                          </select>
                          {managed ? (
                            <>
                              <div className="flex flex-wrap gap-1 text-xs">
                                {managedOptions.map((option) => (
                                  <span key={option.id} className="rounded border border-[#d0d0d0] px-2 py-0.5">
                                    {option.value}
                                    <button
                                      type="button"
                                      className="ml-1 text-[#7a1d1d]"
                                      onClick={async () => {
                                        if (!token) return;
                                        await deleteFieldOption(option.id, token);
                                        await refreshFieldOptions();
                                      }}
                                    >
                                      x
                                    </button>
                                  </span>
                                ))}
                              </div>
                              <div className="flex gap-2">
                                <input
                                  value={newManagedOption[managed]}
                                  onChange={(e) => setNewManagedOption((prev) => ({ ...prev, [managed]: e.target.value }))}
                                  placeholder={`Add ${managed} option`}
                                  className="min-w-0 flex-1 rounded border border-[#c3c3c3] px-2 py-1 text-xs"
                                />
                                <button
                                  type="button"
                                  className="rounded border border-[#b8b8b8] px-2 py-1 text-xs"
                                  onClick={async () => {
                                    if (!token || !newManagedOption[managed].trim()) return;
                                    await createFieldOption({ category: managed, value: newManagedOption[managed].trim() }, token);
                                    setNewManagedOption((prev) => ({ ...prev, [managed]: "" }));
                                    await refreshFieldOptions();
                                  }}
                                >
                                  Add
                                </button>
                              </div>
                            </>
                          ) : (
                            <textarea
                              value={question.options.join("\n")}
                              onChange={(e) =>
                                setQuestionRows((prev) =>
                                  prev.map((q, idx) =>
                                    idx === index
                                      ? {
                                          ...q,
                                          options: e.target.value
                                            .split("\n")
                                            .map((line) => line.trim())
                                            .filter((line) => line.length > 0),
                                        }
                                      : q
                                  )
                                )
                              }
                              className="h-16 w-full rounded border border-[#c3c3c3] px-2 py-1 text-xs"
                              placeholder="One option per line"
                            />
                          )}
                        </div>
                      ) : null}

                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          className="rounded border border-[#b8b8b8] px-2 py-1 text-xs"
                          onClick={() =>
                            setQuestionRows((prev) => {
                              if (index === 0) return prev;
                              const next = [...prev];
                              const [moved] = next.splice(index, 1);
                              next.splice(index - 1, 0, moved);
                              return next;
                            })
                          }
                        >
                          Up
                        </button>
                        <button
                          type="button"
                          className="rounded border border-[#b8b8b8] px-2 py-1 text-xs"
                          onClick={() =>
                            setQuestionRows((prev) => {
                              if (index >= prev.length - 1) return prev;
                              const next = [...prev];
                              const [moved] = next.splice(index, 1);
                              next.splice(index + 1, 0, moved);
                              return next;
                            })
                          }
                        >
                          Down
                        </button>
                        <button
                          type="button"
                          className="rounded border border-[#b8b8b8] px-2 py-1 text-xs text-[#7a1d1d]"
                          onClick={() => setQuestionRows((prev) => prev.filter((_, idx) => idx !== index))}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button type="button" onClick={onSave} className="rounded bg-[#1f6f5f] px-4 py-2 text-white">
              Save Updates
            </button>
            {statusMessage ? <p className="text-sm text-[#333]">{statusMessage}</p> : null}
          </div>
        </section>
      </main>
    </div>
  );
}
