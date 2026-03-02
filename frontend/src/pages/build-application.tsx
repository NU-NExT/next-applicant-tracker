import { type FormEvent, useMemo, useState } from "react";
import { BlockNoteViewRaw, useCreateBlockNote } from "@blocknote/react";
import "@blocknote/react/style.css";

import { createJobListing } from "../api";
import { Header } from "../components/header";

type Template = {
  id: string;
  title: string;
  description: string;
};

const templates: Template[] = [
  { id: "standard", title: "Standard SWE", description: "General software engineering application template." },
  { id: "data", title: "Data + Analytics", description: "Role template focused on analytics workflows and SQL." },
  { id: "infra", title: "Infrastructure", description: "Template for platform/devops aligned job postings." },
];

const sampleQuestions = [
  "Tell us about your relevant experience for this role.",
  "Describe a project where you collaborated with a team under deadlines.",
  "What interests you about working with NExT Consulting?",
];

export function BuildApplicationPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [job, setJob] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const initialBlocks = useMemo(
    () =>
      sampleQuestions.map((question) => ({
        type: "paragraph" as const,
        content: question,
      })),
    []
  );

  const editor = useCreateBlockNote({
    initialContent: initialBlocks,
  });

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedTemplate || !job || !dateEnd) {
      setStatusMessage("Select a template and fill required fields.");
      return;
    }

    setIsSaving(true);
    setStatusMessage("");
    try {
      await createJobListing({
        date_created: new Date().toISOString(),
        date_end: new Date(dateEnd).toISOString(),
        job,
        description: JSON.stringify(editor.document),
      });
      setStatusMessage("Job listing created successfully.");
    } catch {
      setStatusMessage("Failed to create listing. Please verify backend connectivity.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#efefef]">
      <Header />

      <main className="mx-auto max-w-[1200px] px-4 pb-8 pt-24">
        <h1 className="mb-2 text-4xl font-semibold text-[#1f1f1f]">Build Application</h1>
        <p className="mb-6 text-lg text-[#4d4d4d]">Select a template, refine questions, and publish a listing.</p>

        <section className="grid gap-4 md:grid-cols-3">
          {templates.map((template) => {
            const isSelected = selectedTemplate?.id === template.id;
            return (
              <button
                key={template.id}
                type="button"
                onClick={() => {
                  setSelectedTemplate(template);
                  setJob(template.title);
                }}
                className={`rounded-md border p-5 text-left transition ${
                  isSelected ? "border-[#1f6f5f] bg-white shadow-sm" : "border-[#c7c7c7] bg-[#d8d8d8]"
                }`}
              >
                <h2 className="text-2xl font-semibold text-[#1f1f1f]">{template.title}</h2>
                <p className="mt-2 text-base text-[#444]">{template.description}</p>
              </button>
            );
          })}
        </section>

        <form onSubmit={onSubmit} className="mt-6 rounded-md border border-[#c7c7c7] bg-white p-5">
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

          <div className="mt-4">
            <h3 className="mb-2 text-lg font-medium text-[#1f1f1f]">Question Editor (BlockNote)</h3>
            <div className="min-h-[300px] rounded border border-[#d0d0d0] p-2">
              <BlockNoteViewRaw
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

          <div className="mt-4 flex items-center gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-md bg-[#1f6f5f] px-4 py-2 text-white disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Create Listing"}
            </button>
            {statusMessage ? <p className="text-sm text-[#444]">{statusMessage}</p> : null}
          </div>
        </form>
      </main>
    </div>
  );
}
