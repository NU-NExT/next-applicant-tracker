import { useEffect, useState } from "react";

import { getRepositoryRequests, type RepositoryRequestRecord } from "../api";
import { Header } from "../components/header";

function buildMockSubmission(index: number): RepositoryRequestRecord {
  const isX = index === 0;
  const name = isX ? "Applicant X" : `Applicant ${index}`;
  const demographics = [
    { gender: "Woman", ethnicity: "Asian", disability: "No" },
    { gender: "Man", ethnicity: "White", disability: "No" },
    { gender: "Non-binary", ethnicity: "Latino", disability: "Yes" },
    { gender: "Woman", ethnicity: "Black", disability: "No" },
    { gender: "Man", ethnicity: "Middle Eastern", disability: "No" },
  ][index % 5];

  return {
    id: 1000 + index,
    job_listing_id: 1,
    applicant_name: name,
    applicant_email: `applicant${isX ? "x" : index}@northeastern.edu`,
    status: "submitted",
    created_at: new Date(Date.now() - index * 86400000).toISOString(),
    responses_json: JSON.stringify({
      demographics: {
        email: `applicant${isX ? "x" : index}@northeastern.edu`,
        ...demographics,
      },
      answers: [
        {
          section: "introductory questions",
          question: "Tell us about your relevant experience for this role.",
          answer:
            "I have collaborated across product and engineering teams to deliver full-stack features, with strong ownership from design through release.",
        },
        {
          section: "role-specific questions/exp questions",
          question: "Describe a project where you collaborated under deadlines.",
          answer:
            "I worked on a five-person sprint team and coordinated API/frontend integration while keeping deployment deadlines and quality targets.",
        },
        {
          section: "classes taken",
          question: "Which courses best prepared you for this role?",
          answer:
            "Software engineering, databases, and distributed systems coursework most directly prepared me for this application and role scope.",
        },
        {
          section: "demographics",
          question: "Do you require interview accommodations?",
          answer: "No accommodations requested at this time.",
        },
      ],
    }),
  };
}

export function AdminReviewApplicationsPage() {
  const [submissions, setSubmissions] = useState<RepositoryRequestRecord[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    void (async () => {
      try {
        const rows = await getRepositoryRequests();
        const standardSWE = rows.filter((r) => r.job_listing_id === 1);
        const merged = [...standardSWE];
        for (let i = 0; merged.length < 10; i += 1) {
          merged.push(buildMockSubmission(i));
        }
        setSubmissions(merged.slice(0, 10));
      } catch {
        setSubmissions(Array.from({ length: 10 }, (_, idx) => buildMockSubmission(idx)));
      }
    })();
  }, []);

  const selectedSubmission = submissions[selectedIndex];
  const parsed = (() => {
    if (!selectedSubmission) return null;
    try {
      return JSON.parse(selectedSubmission.responses_json) as {
        demographics?: Record<string, string>;
        answers?: Array<{ section: string; question: string; answer: string }>;
      };
    } catch {
      return null;
    }
  })();

  const goPrev = () => setSelectedIndex((idx) => Math.max(0, idx - 1));
  const goNext = () => setSelectedIndex((idx) => Math.min(submissions.length - 1, idx + 1));

  return (
    <div className="min-h-screen bg-[#ececec]">
      <Header />
      <main className="mx-auto max-w-[1100px] px-4 pt-24">
        <section className="rounded border border-[#c7c7c7] bg-[#d8d8d8] p-5">
          <h1 className="text-4xl font-semibold text-[#1f1f1f]">Standard SWE Applications</h1>
          <p className="mt-2 text-lg text-[#2d2d2d]">Total Submissions: {submissions.length}</p>

          {submissions.length > 0 ? (
            <>
              <div className="mt-4 flex items-center gap-3">
                <label className="text-sm text-[#2d2d2d]" htmlFor="student-select">
                  Select Student
                </label>
                <select
                  id="student-select"
                  className="rounded border border-[#a5a5a5] px-2 py-1"
                  value={selectedIndex}
                  onChange={(e) => setSelectedIndex(Number(e.target.value))}
                >
                  {submissions.map((submission, idx) => (
                    <option key={submission.id} value={idx}>
                      {submission.applicant_name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={goPrev}
                  disabled={selectedIndex === 0}
                  className="rounded border border-[#8a8a8a] px-3 py-1 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  disabled={selectedIndex === submissions.length - 1}
                  className="rounded border border-[#8a8a8a] px-3 py-1 disabled:opacity-50"
                >
                  Next
                </button>
              </div>

              <div className="mt-5 rounded border border-[#b8b8b8] bg-white p-4">
                <h2 className="text-2xl font-semibold text-[#1f1f1f]"> Applicant {selectedSubmission.id}</h2>
                <p className="mt-1 text-sm text-[#4b4b4b]">
                  Submitted: {new Date(selectedSubmission.created_at).toLocaleString()}
                </p>

                <div className="mt-4 space-y-4">
                  {(parsed?.answers ?? []).length > 0 ? (
                    (parsed?.answers ?? []).map((entry, idx) => (
                      <div key={`${entry.question}-${idx}`} className="rounded border border-[#d6d6d6] bg-[#fafafa] p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#1f6f5f]">{entry.section}</p>
                        <p className="mt-1 font-semibold text-[#1f1f1f]">{entry.question}</p>
                        <p className="mt-1 leading-7 text-[#2f2f2f]">{entry.answer}</p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded border border-[#d6d6d6] bg-[#fff7d6] p-3 text-[#5c4a00]">
                      No questions were found for this submission.
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <p className="mt-4 text-lg text-[#2d2d2d]">No submissions found yet.</p>
          )}
        </section>
      </main>
    </div>
  );
}
