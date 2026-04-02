import { type DragEvent, type FormEvent, useEffect, useState } from "react";
import { GripVertical, Pencil, Plus, Trash2 } from "lucide-react";

import { createFieldOption, createJobListing, deleteFieldOption, getFieldOptions, type FieldOptionRecord } from "../api";
import { Header } from "../components/header";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";

type QuestionnairePage = {
  id: number;
  title: string;
  description: string;
  questions: QuestionDraft[];
};

type QuestionType = "free_text" | "dropdown" | "number" | "date";

type QuestionDraft = {
  id: string;
  prompt: string;
  question_type: QuestionType;
  character_limit: number | null;
  options: string[];
  managedCategory: "" | "major" | "minor" | "concentration";
  is_global: boolean;
};

const makeQuestion = (
  prompt: string,
  type: QuestionType = "free_text",
  opts?: Partial<Omit<QuestionDraft, "id" | "prompt" | "question_type">>
): QuestionDraft => ({
  id: `${Date.now()}-${Math.random()}`,
  prompt,
  question_type: type,
  character_limit: opts?.character_limit ?? null,
  options: opts?.options ?? [],
  managedCategory: opts?.managedCategory ?? "",
  is_global: opts?.is_global ?? false,
});

const defaultQuestionnairePagesSeed: Array<Omit<QuestionnairePage, "id">> = [
  {
    title: "Global Questions",
    description: "Global structured fields",
    questions: [
      makeQuestion("Full legal name", "free_text", { is_global: true }),
      makeQuestion("Preferred name (optional)", "free_text", { is_global: true }),
      makeQuestion("Northeastern email", "free_text", { is_global: true }),
      makeQuestion("Expected graduation date", "date", { is_global: true }),
      makeQuestion("Current year / grade level", "free_text", { is_global: true }),
      makeQuestion("Co-op number (1st, 2nd, 3rd, etc.)", "number", { is_global: true }),
      makeQuestion("Major(s) - selected from a maintained dropdown list", "dropdown", {
        is_global: true,
        managedCategory: "major",
      }),
      makeQuestion("Minor(s) - selected from a maintained dropdown list (optional)", "dropdown", {
        is_global: true,
        managedCategory: "minor",
      }),
      makeQuestion("Concentration - selected from a maintained dropdown list (optional)", "dropdown", {
        is_global: true,
        managedCategory: "concentration",
      }),
      makeQuestion("College / school within Northeastern", "free_text", { is_global: true }),
      makeQuestion("GPA (optional)", "free_text", { is_global: true }),
      makeQuestion("GitHub URL (optional)", "free_text", { is_global: true }),
      makeQuestion("LinkedIn URL (optional)", "free_text", { is_global: true }),
      makeQuestion("Clubs and extracurricular activities (list)", "free_text", { is_global: true }),
      makeQuestion("Count of paid work experiences since high school graduation", "number", { is_global: true }),
      makeQuestion("Count of unpaid/volunteer experiences since high school graduation", "number", { is_global: true }),
      makeQuestion("Resume upload (PDF, max 1MB)", "free_text", { is_global: true }),
    ],
  },
  {
    title: "Role Questions",
    description: "Role-specific and technical prompts",
    questions: [
      makeQuestion("Describe a project where you collaborated with a team under deadlines."),
      makeQuestion("What technical strengths are most relevant to this role?"),
      makeQuestion("How do you approach ambiguous requirements?"),
    ],
  },
  {
    title: "Demographics Questions",
    description: "Optional demographic prompts",
    questions: [
      makeQuestion("Please share any demographic information you are comfortable disclosing."),
      makeQuestion("Do you require accommodations during the interview process?"),
    ],
  },
];

const templatePresets: Array<Omit<QuestionnairePage, "id">> = [
  {
    title: "Template: Standard SWE Core",
    description: "Reusable core prompts for SWE listings",
    questions: [
      makeQuestion("Tell us about your most impactful engineering project."),
      makeQuestion("How do you debug and validate a production issue?"),
      makeQuestion("Describe a time you gave or received technical feedback."),
    ],
  },
  {
    title: "Template: Behavioral + Collaboration",
    description: "Collaboration, ownership, and communication prompts",
    questions: [
      makeQuestion("Describe a conflict in a team and how you resolved it."),
      makeQuestion("Tell us about a deadline you had to renegotiate."),
      makeQuestion("How do you communicate trade-offs to non-technical stakeholders?"),
    ],
  },
];

export function BuildApplicationPage() {
  const token = localStorage.getItem("auth_access_token") ?? "";
  const [questionnairePages, setQuestionnairePages] = useState<QuestionnairePage[]>(
    defaultQuestionnairePagesSeed.map((page, index) => ({ ...page, id: index + 1 }))
  );
  const [nextQuestionnairePageId, setNextQuestionnairePageId] = useState(defaultQuestionnairePagesSeed.length + 1);
  const [activeTabId, setActiveTabId] = useState<number>(1);
  const [draggedTabId, setDraggedTabId] = useState<number | null>(null);
  const [job, setJob] = useState("Standard SWE");
  const [dateEnd, setDateEnd] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [editingTabId, setEditingTabId] = useState<number | null>(null);
  const [editingTabTitle, setEditingTabTitle] = useState("");
  const [descriptionText, setDescriptionText] = useState("Describe the position and expectations.");
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

  const activeQuestionnairePage = questionnairePages.find((page) => page.id === activeTabId) ?? null;

  const refreshFieldOptions = async () => {
    const [major, minor, concentration] = await Promise.all([
      getFieldOptions("major"),
      getFieldOptions("minor"),
      getFieldOptions("concentration"),
    ]);
    setFieldOptions({ major, minor, concentration });
  };

  useEffect(() => {
    void refreshFieldOptions();
  }, []);

  const addQuestionnairePage = (seed?: Omit<QuestionnairePage, "id">) => {
    const newId = nextQuestionnairePageId;
    const payload: Omit<QuestionnairePage, "id"> = seed ?? {
      title: "New Questionnaire Page",
      description: "Custom question type section",
      questions: [makeQuestion("New prompt")],
    };
    setQuestionnairePages((prev) => [...prev, { id: newId, ...payload }]);
    setNextQuestionnairePageId((id) => id + 1);
    setActiveTabId(newId);
    setEditingTabId(newId);
    setEditingTabTitle(payload.title);
  };

  const deleteQuestionnairePage = (tabId: number) => {
    setQuestionnairePages((prev) => {
      if (prev.length === 1) return prev;
      const next = prev.filter((page) => page.id !== tabId);
      if (activeTabId === tabId && next.length > 0) {
        setActiveTabId(next[0].id);
      }
      return next;
    });
  };

  const onDragStartTab = (tabId: number) => setDraggedTabId(tabId);

  const onDropTab = (targetTabId: number) => {
    if (draggedTabId === null || draggedTabId === targetTabId) return;
    setQuestionnairePages((prev) => {
      const sourceIndex = prev.findIndex((item) => item.id === draggedTabId);
      const targetIndex = prev.findIndex((item) => item.id === targetTabId);
      if (sourceIndex < 0 || targetIndex < 0) return prev;
      const next = [...prev];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
    setDraggedTabId(null);
  };

  const startRename = (page: QuestionnairePage) => {
    setEditingTabId(page.id);
    setEditingTabTitle(page.title);
  };

  const commitRename = (tabId: number) => {
    const trimmed = editingTabTitle.trim();
    if (trimmed) {
      setQuestionnairePages((prev) => prev.map((item) => (item.id === tabId ? { ...item, title: trimmed } : item)));
    }
    setEditingTabId(null);
    setEditingTabTitle("");
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!job || !dateEnd) {
      setStatusMessage("Fill required fields.");
      return;
    }
    if (!window.confirm("Publish this listing now?")) return;

    setIsSaving(true);
    setStatusMessage("");
    try {
      await createJobListing({
        date_created: new Date().toISOString(),
        date_end: new Date(dateEnd).toISOString(),
        position_title: job,
        job,
        description: descriptionText,
        questions: questionnairePages.flatMap((page, groupIndex) =>
          page.questions
            .filter((question) => question.prompt.trim().length > 0)
            .map((question, questionIndex) => ({
              prompt: question.prompt.trim(),
              sort_order: groupIndex * 100 + questionIndex,
              question_type: question.question_type,
              character_limit: question.character_limit,
              is_global: question.is_global || page.title.toLowerCase().includes("global"),
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
            }))
        ),
      });
      setStatusMessage("Listing published successfully.");
    } catch {
      setStatusMessage("Failed to publish listing. Please verify backend connectivity.");
    } finally {
      setIsSaving(false);
    }
  };

  const updateActivePage = (updater: (page: QuestionnairePage) => QuestionnairePage) => {
    if (!activeQuestionnairePage) return;
    setQuestionnairePages((prev) => prev.map((page) => (page.id === activeQuestionnairePage.id ? updater(page) : page)));
  };

  const addQuestionToActivePage = (type: QuestionType) => {
    updateActivePage((page) => ({
      ...page,
      questions: [...page.questions, makeQuestion("New question prompt", type)],
    }));
  };

  const moveQuestion = (index: number, direction: -1 | 1) => {
    updateActivePage((page) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= page.questions.length) return page;
      const questions = [...page.questions];
      const [moved] = questions.splice(index, 1);
      questions.splice(nextIndex, 0, moved);
      return { ...page, questions };
    });
  };

  return (
    <div className="flex flex-col flex-1 bg-[#efefef]">
      <Header />
      <main className="flex-1 mx-auto max-w-[1200px] px-4 pb-8 pt-24">
        <h1 className="mb-2 text-4xl font-semibold text-[#1f1f1f]">Build Application</h1>

        <form onSubmit={onSubmit} className="rounded-md border border-[#c7c7c7] bg-white p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-[#333]">Job title</span>
              <input
                value={job}
                onChange={(e) => setJob(e.target.value)}
                className="rounded border border-[#bfbfbf] px-3 py-2"
                placeholder="Job title"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-[#333]">Date end</span>
              <input
                type="datetime-local"
                value={dateEnd}
                onChange={(e) => setDateEnd(e.target.value)}
                className="rounded border border-[#bfbfbf] px-3 py-2"
              />
            </label>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-[300px_1fr]">
            <aside className="flex flex-col gap-2 border-r border-[#d8d8d8] pr-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#606060]">Questionnaire Pages</p>
              {questionnairePages.map((page) => {
                const active = page.id === activeTabId;
                const handleDrop = (event: DragEvent<HTMLDivElement>) => {
                  event.preventDefault();
                  onDropTab(page.id);
                };
                return (
                  <div
                    key={page.id}
                    draggable
                    onDragStart={() => onDragStartTab(page.id)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={handleDrop}
                    className={`rounded border px-2 py-2 transition-colors ${
                      active ? "border-[#7f7f7f]" : "border-[#d0d0d0] hover:bg-[#f6f6f6]"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <GripVertical className="mt-0.5 h-4 w-4 text-[#8a8a8a]" />
                      <div className="min-w-0 flex-1">
                        {editingTabId === page.id ? (
                          <input
                            autoFocus
                            value={editingTabTitle}
                            onChange={(e) => setEditingTabTitle(e.target.value)}
                            onBlur={() => commitRename(page.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") commitRename(page.id);
                              if (e.key === "Escape") {
                                setEditingTabId(null);
                                setEditingTabTitle("");
                              }
                            }}
                            className="w-full rounded border border-[#c3c3c3] px-2 py-1 text-sm"
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => setActiveTabId(page.id)}
                            className="block w-full text-left text-sm font-medium text-[#2d2d2d]"
                          >
                            {page.title}
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-[#666]">{page.description}</p>
                    <div className="mt-2 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => startRename(page)}
                        className="rounded p-1 text-[#5f5f5f] transition-colors hover:bg-[#efefef] hover:text-[#222]"
                        aria-label={`Rename ${page.title}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteQuestionnairePage(page.id)}
                        disabled={questionnairePages.length === 1}
                        className="rounded p-1 text-[#5f5f5f] transition-colors hover:bg-[#efefef] hover:text-[#222] disabled:opacity-50"
                        aria-label={`Delete ${page.title}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="mt-1 flex w-full items-center justify-center rounded border border-dashed border-[#c5c5c5] py-2 text-[#555] transition-colors hover:bg-[#f6f6f6] hover:text-[#222]"
                    aria-label="Create new questionnaire page"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64">
                  <DropdownMenuItem onSelect={() => addQuestionnairePage()}>New Questionnaire Page</DropdownMenuItem>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>Templates</DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-64">
                      {templatePresets.map((preset) => (
                        <DropdownMenuItem key={preset.title} onSelect={() => addQuestionnairePage(preset)}>
                          {preset.title}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                </DropdownMenuContent>
              </DropdownMenu>
            </aside>

            <div className="space-y-3">
              <div className="rounded border border-[#d0d0d0] bg-[#f8f8f8] p-3">
                <p className="mt-1 text-xs text-[#5a5a5a]">
                  Use the + dropdown in the sidebar to add questionnaire pages and templates. Use the 6-dot handle to
                  reorder questionnaire pages. Manage each question's type, character limit, and dropdown options below.
                </p>
              </div>

              <div className="rounded border border-[#d0d0d0] bg-white p-3">
                <label className="block text-sm text-[#2d2d2d]">
                  Position description
                  <textarea
                    value={descriptionText}
                    onChange={(e) => setDescriptionText(e.target.value)}
                    className="mt-1 h-24 w-full rounded border border-[#c3c3c3] px-3 py-2"
                  />
                </label>
              </div>

              <div className="rounded border border-[#d0d0d0] bg-white p-3">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-[#2d2d2d]">
                    Questions for: {activeQuestionnairePage?.title ?? "No page selected"}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => addQuestionToActivePage("free_text")}
                      className="rounded border border-[#b8b8b8] px-2 py-1 text-xs"
                    >
                      + Textbox
                    </button>
                    <button
                      type="button"
                      onClick={() => addQuestionToActivePage("dropdown")}
                      className="rounded border border-[#b8b8b8] px-2 py-1 text-xs"
                    >
                      + Dropdown
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  {(activeQuestionnairePage?.questions ?? []).map((question, index) => {
                    const managed = question.managedCategory;
                    const managedOptions = managed ? fieldOptions[managed] ?? [] : [];
                    return (
                      <div key={question.id} className="rounded border border-[#d8d8d8] bg-[#fafafa] p-3">
                        <div className="grid gap-2 md:grid-cols-[1fr_180px_130px]">
                          <input
                            value={question.prompt}
                            onChange={(e) =>
                              updateActivePage((page) => ({
                                ...page,
                                questions: page.questions.map((q, idx) =>
                                  idx === index ? { ...q, prompt: e.target.value } : q
                                ),
                              }))
                            }
                            placeholder="Question prompt"
                            className="rounded border border-[#c3c3c3] px-2 py-1 text-sm"
                          />
                          <select
                            value={question.question_type}
                            onChange={(e) =>
                              updateActivePage((page) => ({
                                ...page,
                                questions: page.questions.map((q, idx) =>
                                  idx === index ? { ...q, question_type: e.target.value as QuestionType } : q
                                ),
                              }))
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
                              updateActivePage((page) => ({
                                ...page,
                                questions: page.questions.map((q, idx) =>
                                  idx === index
                                    ? { ...q, character_limit: e.target.value ? Number(e.target.value) : null }
                                    : q
                                ),
                              }))
                            }
                            placeholder="Char limit"
                            className="rounded border border-[#c3c3c3] px-2 py-1 text-sm"
                          />
                        </div>

                        {question.question_type === "dropdown" ? (
                          <div className="mt-2 space-y-2 rounded border border-[#e0e0e0] bg-white p-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-[#555]">Option source</span>
                              <select
                                value={question.managedCategory}
                                onChange={(e) =>
                                  updateActivePage((page) => ({
                                    ...page,
                                    questions: page.questions.map((q, idx) =>
                                      idx === index
                                        ? { ...q, managedCategory: e.target.value as QuestionDraft["managedCategory"] }
                                        : q
                                    ),
                                  }))
                                }
                                className="rounded border border-[#c3c3c3] px-2 py-1 text-xs"
                              >
                                <option value="">Custom options</option>
                                <option value="major">Major list</option>
                                <option value="minor">Minor list</option>
                                <option value="concentration">Concentration list</option>
                              </select>
                            </div>

                            {managed ? (
                              <div>
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
                                <div className="mt-2 flex gap-2">
                                  <input
                                    value={newManagedOption[managed]}
                                    onChange={(e) =>
                                      setNewManagedOption((prev) => ({ ...prev, [managed]: e.target.value }))
                                    }
                                    placeholder={`Add ${managed} option`}
                                    className="min-w-0 flex-1 rounded border border-[#c3c3c3] px-2 py-1 text-xs"
                                  />
                                  <button
                                    type="button"
                                    className="rounded border border-[#b8b8b8] px-2 py-1 text-xs"
                                    onClick={async () => {
                                      if (!token || !newManagedOption[managed].trim()) return;
                                      await createFieldOption(
                                        { category: managed, value: newManagedOption[managed].trim() },
                                        token
                                      );
                                      setNewManagedOption((prev) => ({ ...prev, [managed]: "" }));
                                      await refreshFieldOptions();
                                    }}
                                  >
                                    Add
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <textarea
                                value={question.options.join("\n")}
                                onChange={(e) =>
                                  updateActivePage((page) => ({
                                    ...page,
                                    questions: page.questions.map((q, idx) =>
                                      idx === index
                                        ? {
                                            ...q,
                                            options: e.target.value
                                              .split("\n")
                                              .map((line) => line.trim())
                                              .filter((line) => line.length > 0),
                                          }
                                        : q
                                    ),
                                  }))
                                }
                                className="h-20 w-full rounded border border-[#c3c3c3] px-2 py-1 text-xs"
                                placeholder="One dropdown option per line"
                              />
                            )}
                          </div>
                        ) : null}

                        <div className="mt-2 flex gap-2">
                          <button type="button" className="rounded border border-[#b8b8b8] px-2 py-1 text-xs" onClick={() => moveQuestion(index, -1)}>
                            Up
                          </button>
                          <button type="button" className="rounded border border-[#b8b8b8] px-2 py-1 text-xs" onClick={() => moveQuestion(index, 1)}>
                            Down
                          </button>
                          <button
                            type="button"
                            className="rounded border border-[#b8b8b8] px-2 py-1 text-xs text-[#7a1d1d]"
                            onClick={() =>
                              updateActivePage((page) => ({
                                ...page,
                                questions: page.questions.filter((_, idx) => idx !== index),
                              }))
                            }
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
          </div>

          <div className="mt-8 border-t border-[#d8d8d8] pt-4">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded border border-[#b0b0b0] px-4 py-2 text-sm text-[#222] transition-colors hover:bg-[#f2f2f2] disabled:opacity-60"
            >
              {isSaving ? "Publishing..." : "Publish Listing"}
            </button>
            {statusMessage ? <p className="mt-2 text-sm text-[#444]">{statusMessage}</p> : null}
          </div>
        </form>
      </main>
    </div>
  );
}
