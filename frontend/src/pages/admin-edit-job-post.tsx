import { useEffect, useState } from "react";
import { BlockNoteViewRaw, useCreateBlockNote } from "@blocknote/react";
import "@blocknote/react/style.css";

import { getJobListings, type JobListingRecord, updateJobListing } from "../api";
import { Header } from "../components/header";

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

function toQuestionPrompts(documentBlocks: unknown[]): string[] {
  return documentBlocks
    .flatMap((block) => {
      if (!block || typeof block !== "object") return [];
      const typedBlock = block as { content?: unknown; children?: unknown[] };
      const current = toPlainText(typedBlock.content);
      const childPrompts = Array.isArray(typedBlock.children) ? toQuestionPrompts(typedBlock.children) : [];
      return [current, ...childPrompts];
    })
    .map((prompt) => prompt.trim())
    .filter((prompt) => prompt.length > 0);
}

function toDescriptionBlocks(raw: string): Array<{ type: "paragraph"; content: string }> {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed as Array<{ type: "paragraph"; content: string }>;
    }
  } catch {
    // Fallback to paragraph text below.
  }
  return [{ type: "paragraph", content: raw }];
}

export function AdminEditJobPostPage() {
  const [selected, setSelected] = useState<JobListingRecord | null>(null);
  const [listings, setListings] = useState<JobListingRecord[]>([]);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const rows = await getJobListings();
        const now = new Date();
        setListings(rows.filter((row) => new Date(row.date_end) >= now || new Date(row.date_created) >= now));
      } catch {
        setListings([]);
      }
    })();
  }, []);

  const descriptionEditor = useCreateBlockNote({
    initialContent: [{ type: "paragraph", content: "Select a role to edit its content." }],
  });

  const questionsEditor = useCreateBlockNote({
    initialContent: [{ type: "paragraph", content: "Select a role to edit its questions." }],
  });

  useEffect(() => {
    if (!selected) return;

    const descriptionBlocks = toDescriptionBlocks(selected.description);
    void descriptionEditor.replaceBlocks(descriptionEditor.document, descriptionBlocks);

    const questionPrompts = (selected.questions ?? [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((q) => q.prompt.trim())
      .filter((q) => q.length > 0);

    const questionBlocks =
      questionPrompts.length > 0
        ? questionPrompts.map((prompt) => ({ type: "paragraph" as const, content: prompt }))
        : [{ type: "paragraph" as const, content: "No questions yet. Add prompts here." }];

    void questionsEditor.replaceBlocks(questionsEditor.document, questionBlocks);
  }, [selected, descriptionEditor, questionsEditor]);

  const onSave = async () => {
    if (!selected) return;
    try {
      const prompts = toQuestionPrompts(questionsEditor.document as unknown[]);
      await updateJobListing(selected.id, {
        description: JSON.stringify(descriptionEditor.document),
        questions: prompts.map((prompt, idx) => ({
          prompt,
          sort_order: idx,
        })),
      });
      const refreshed = await getJobListings();
      const now = new Date();
      const openOrFuture = refreshed.filter(
        (row) => new Date(row.date_end) >= now || new Date(row.date_created) >= now
      );
      setListings(openOrFuture);
      const latestSelected = refreshed.find((row) => row.id === selected.id) ?? null;
      setSelected(latestSelected);
      setStatusMessage("Updated listing description and questions in Postgres.");
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
          <p className="mt-2 text-[#2d2d2d]">Open/future roles from Postgres:</p>
          <div className="mt-3 flex flex-wrap gap-3">
            {listings.map((listing) => (
              <button
                key={listing.id}
                type="button"
                className="rounded border border-[#8f8f8f] bg-white px-3 py-1.5 underline"
                onClick={() => setSelected(listing)}
              >
                {listing.job}
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="min-h-[320px] rounded border border-[#d0d0d0] bg-white p-2">
              <p className="mb-2 text-sm font-semibold text-[#2d2d2d]">Job Description (BlockNote)</p>
              <BlockNoteViewRaw
                editor={descriptionEditor}
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
            <div className="min-h-[320px] rounded border border-[#d0d0d0] bg-white p-2">
              <p className="mb-2 text-sm font-semibold text-[#2d2d2d]">Questions (BlockNote)</p>
              <BlockNoteViewRaw
                editor={questionsEditor}
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
