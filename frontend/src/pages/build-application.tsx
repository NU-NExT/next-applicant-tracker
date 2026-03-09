import { type DragEvent, type FormEvent, useEffect, useState } from "react";
import { BlockNoteViewRaw, useCreateBlockNote } from "@blocknote/react";
import "@blocknote/react/style.css";
import { GripVertical, Pencil, Plus, Trash2 } from "lucide-react";

import { createJobListing } from "../api";
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

type LessonSection = {
  id: number;
  title: string;
  description: string;
  document: unknown[];
};

const defaultLessonsSeed: Array<Omit<LessonSection, "id">> = [
  {
    title: "Introductory Questions",
    description: "General candidate introduction prompts.",
    document: [
      { type: "paragraph", content: "Tell us about your relevant experience for this role." },
      { type: "paragraph", content: "Why are you interested in NExT Consulting?" },
      { type: "paragraph", content: "What kind of team environment helps you thrive?" },
    ],
  },
  {
    title: "Role-specific Questions / Experience Questions",
    description: "Role depth and project experience.",
    document: [
      { type: "paragraph", content: "Describe a project where you collaborated with a team under deadlines." },
      { type: "paragraph", content: "What technical strengths are most relevant to this role?" },
      { type: "paragraph", content: "How do you approach ambiguous requirements?" },
    ],
  },
  {
    title: "Classes Taken",
    description: "Academic preparation and coursework.",
    document: [
      { type: "paragraph", content: "Which courses best prepared you for this role?" },
      { type: "paragraph", content: "What coursework project best demonstrates your skills?" },
      { type: "paragraph", content: "What technical concepts are you currently learning?" },
    ],
  },
  {
    title: "Demographics",
    description: "Optional demographic information prompts.",
    document: [
      { type: "paragraph", content: "Please share any demographic information you are comfortable disclosing." },
      { type: "paragraph", content: "Do you require accommodations during the interview process?" },
    ],
  },
];

const templatePresets: Array<Omit<LessonSection, "id">> = [
  {
    title: "Template: Standard SWE Core",
    description: "Reusable core prompts for SWE listings.",
    document: [
      { type: "paragraph", content: "Tell us about your most impactful engineering project." },
      { type: "paragraph", content: "How do you debug and validate a production issue?" },
      { type: "paragraph", content: "Describe a time you gave or received technical feedback." },
    ],
  },
  {
    title: "Template: Behavioral + Collaboration",
    description: "Collaboration, ownership, and communication prompts.",
    document: [
      { type: "paragraph", content: "Describe a conflict in a team and how you resolved it." },
      { type: "paragraph", content: "Tell us about a deadline you had to renegotiate." },
      { type: "paragraph", content: "How do you communicate trade-offs to non-technical stakeholders?" },
    ],
  },
];

function toPlainText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((node) => {
      if (typeof node === "string") return node;
      if (!node || typeof node !== "object") return "";
      if ("text" in node && typeof node.text === "string") return node.text;
      if ("content" in node) return toPlainText(node.content);
      return "";
    })
    .join("")
    .trim();
}

function promptsFromDocument(documentBlocks: unknown[]): string[] {
  return documentBlocks
    .flatMap((block) => {
      if (!block || typeof block !== "object") return [];
      const typedBlock = block as { content?: unknown; children?: unknown[] };
      const current = toPlainText(typedBlock.content);
      const childPrompts = Array.isArray(typedBlock.children) ? promptsFromDocument(typedBlock.children) : [];
      return [current, ...childPrompts];
    })
    .map((prompt) => prompt.trim())
    .filter((prompt) => prompt.length > 0);
}

export function BuildApplicationPage() {
  const [lessons, setLessons] = useState<LessonSection[]>(
    defaultLessonsSeed.map((template, index) => ({ ...template, id: index + 1 }))
  );
  const [nextLessonId, setNextLessonId] = useState(defaultLessonsSeed.length + 1);
  const [activeTabId, setActiveTabId] = useState<number>(1);
  const [draggedTabId, setDraggedTabId] = useState<number | null>(null);
  const [job, setJob] = useState("Standard SWE");
  const [dateEnd, setDateEnd] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [editingTabId, setEditingTabId] = useState<number | null>(null);
  const [editingTabTitle, setEditingTabTitle] = useState("");

  const activeLesson = lessons.find((lesson) => lesson.id === activeTabId) ?? null;
  const editor = useCreateBlockNote();

  useEffect(() => {
    if (!activeLesson) return;
    void editor.replaceBlocks(editor.document, activeLesson.document as never[]);
  }, [activeLesson, editor]);

  const syncActiveLessonDocument = () => {
    if (!activeLesson) return;
    setLessons((prev) =>
      prev.map((lesson) =>
        lesson.id === activeLesson.id
          ? { ...lesson, document: editor.document as unknown[] }
          : lesson
      )
    );
  };

  const addLesson = (seed?: Omit<LessonSection, "id">) => {
    const newId = nextLessonId;
    const payload: Omit<LessonSection, "id"> = seed ?? {
      title: "New Lesson",
      description: "Custom question type section.",
      document: [{ type: "paragraph", content: "Type / to insert blocks, headings, lists, and more." }],
    };
    syncActiveLessonDocument();
    setLessons((prev) => [
      ...prev,
      {
        id: newId,
        ...payload,
      },
    ]);
    setNextLessonId((id) => id + 1);
    setActiveTabId(newId);
    setEditingTabId(newId);
    setEditingTabTitle(payload.title);
  };

  const deleteTemplateTab = (tabId: number) => {
    setLessons((prev) => {
      if (prev.length === 1) return prev;
      const next = prev.filter((template) => template.id !== tabId);
      if (activeTabId === tabId && next.length > 0) {
        setActiveTabId(next[0].id);
      }
      return next;
    });
  };

  const onDragStartTab = (tabId: number) => {
    setDraggedTabId(tabId);
  };

  const onDropTab = (targetTabId: number) => {
    if (draggedTabId === null || draggedTabId === targetTabId) return;
    setLessons((prev) => {
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

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!job || !dateEnd) {
      setStatusMessage("Fill required fields.");
      return;
    }
    if (!window.confirm("Publish this listing now?")) return;
    syncActiveLessonDocument();

    setIsSaving(true);
    setStatusMessage("");
    try {
      await createJobListing({
        date_created: new Date().toISOString(),
        date_end: new Date(dateEnd).toISOString(),
        job,
        description: JSON.stringify(editor.document),
        questions: lessons.flatMap((lesson, groupIndex) =>
          promptsFromDocument(lesson.document as unknown[]).map((prompt, questionIndex) => ({
            prompt,
            sort_order: groupIndex * 100 + questionIndex,
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

  const startRename = (template: LessonSection) => {
    setEditingTabId(template.id);
    setEditingTabTitle(template.title);
  };

  const commitRename = (tabId: number) => {
    const trimmed = editingTabTitle.trim();
    if (trimmed) {
      setLessons((prev) => prev.map((item) => (item.id === tabId ? { ...item, title: trimmed } : item)));
    }
    setEditingTabId(null);
    setEditingTabTitle("");
  };

  return (
    <div className="min-h-screen bg-[#efefef]">
      <Header />

      <main className="mx-auto max-w-[1200px] px-4 pb-8 pt-24">
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

          <div className="mt-4 grid gap-4 md:grid-cols-[280px_1fr]">
            <aside className="flex flex-col gap-2 border-r border-[#d8d8d8] pr-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#606060]">Lessons</p>
              {lessons.map((template) => {
                const active = template.id === activeTabId;
                const handleDrop = (event: DragEvent<HTMLDivElement>) => {
                  event.preventDefault();
                  onDropTab(template.id);
                };
                return (
                  <div
                    key={template.id}
                    draggable
                    onDragStart={() => onDragStartTab(template.id)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={handleDrop}
                    className={`rounded border px-2 py-2 transition-colors ${
                      active ? "border-[#7f7f7f]" : "border-[#d0d0d0] hover:bg-[#f6f6f6]"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <GripVertical className="mt-0.5 h-4 w-4 text-[#8a8a8a]" />
                      <button
                          type="button"
                          onClick={() => {
                            syncActiveLessonDocument();
                            setActiveTabId(template.id);
                          }}
                          className="block w-full text-left text-sm font-medium text-[#2d2d2d]"
                        >
                          {editingTabId === template.id ? (
                          <input
                            autoFocus
                            value={editingTabTitle}
                            onChange={(e) => setEditingTabTitle(e.target.value)}
                            onBlur={() => commitRename(template.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") commitRename(template.id);
                              if (e.key === "Escape") {
                                setEditingTabId(null);
                                setEditingTabTitle("");
                              }
                            }}
                            className="w-full rounded border border-[#c3c3c3] px-2 py-1 text-sm"
                          />
                        ) : (
                          <span>{template.title}</span>
                        )}
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-[#666]">{template.description}</p>
                    <div className="mt-2 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => startRename(template)}
                        className="rounded p-1 text-[#5f5f5f] transition-colors hover:bg-[#efefef] hover:text-[#222]"
                        aria-label={`Rename ${template.title}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteTemplateTab(template.id)}
                        disabled={lessons.length === 1}
                        className="rounded p-1 text-[#5f5f5f] transition-colors hover:bg-[#efefef] hover:text-[#222] disabled:opacity-50"
                        aria-label={`Delete ${template.title}`}
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
                    aria-label="Create new question page"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64">
                  <DropdownMenuItem onSelect={() => addLesson()}>
                    New Question Page
                  </DropdownMenuItem>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>Templates</DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-64">
                      {templatePresets.map((preset) => (
                        <DropdownMenuItem key={preset.title} onSelect={() => addLesson(preset)}>
                          {preset.title}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                </DropdownMenuContent>
              </DropdownMenu>
            </aside>

            <div className="space-y-3">
              <div className="rounded p-3">
                <p className="mt-1 text-xs text-[#5a5a5a]">
                  Use the + dropdown in the sidebar to add question-type lessons and templates. In the editor, you can
                  still add/format content blocks and use <span className="font-mono">Ctrl/Cmd+B</span> for bold.
                </p>
              </div>

              <div className="rounded border border-[#d0d0d0] p-2">
                <BlockNoteViewRaw
                  key={activeTabId}
                  editor={editor}
                  formattingToolbar={false}
                  linkToolbar={false}
                  slashMenu={false}
                  sideMenu={false}
                  filePanel={false}
                  tableHandles={false}
                  emojiPicker={false}
                  comments={false}
                />
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
