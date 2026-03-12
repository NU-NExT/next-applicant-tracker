import { useEffect, useMemo, useState } from "react";

import {
  addCandidateReviewComment,
  addCandidateReviewScore,
  getCandidateReviewDetail,
  searchCandidateReviews,
  type CandidateReviewDetail,
  type CandidateReviewSearchRow,
} from "../api";
import { Header } from "../components/header";

export function AdminReviewApplicationsPage() {
  const token = localStorage.getItem("auth_access_token") ?? "";
  const [allResults, setAllResults] = useState<CandidateReviewSearchRow[]>([]);
  const [results, setResults] = useState<CandidateReviewSearchRow[]>([]);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<number | null>(null);
  const [detail, setDetail] = useState<CandidateReviewDetail | null>(null);
  const [newScore, setNewScore] = useState("85");
  const [newComment, setNewComment] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({
    candidate_name: "",
    northeastern_email: "",
    major: "",
    college: "",
    grad_start: "",
    grad_end: "",
    coop_number: "",
    year_grade_level: "",
    position: "",
    cycle: "",
    application_status: "",
  });

  const selectedRow = useMemo(
    () => results.find((row) => row.submission_id === selectedSubmissionId) ?? null,
    [results, selectedSubmissionId]
  );
  const selectedIndex = useMemo(
    () => results.findIndex((row) => row.submission_id === selectedSubmissionId),
    [results, selectedSubmissionId]
  );

  useEffect(() => {
    if (!token) {
      setStatusMessage("No active session found. Please sign in from /login first.");
      setResults([]);
      setAllResults([]);
      setSelectedSubmissionId(null);
      return;
    }
    void (async () => {
      try {
        const rows = await searchCandidateReviews(token, {});
        setAllResults(rows);
        setResults(rows);
        setStatusMessage("");
        if (rows.length > 0) {
          setSelectedSubmissionId(rows[0].submission_id);
        }
      } catch {
        setResults([]);
        setStatusMessage("Could not load applicants. Ensure you are signed in with an admin account.");
      }
    })();
  }, [token]);

  useEffect(() => {
    if (!token || !selectedSubmissionId) {
      setDetail(null);
      return;
    }
    void (async () => {
      try {
        const payload = await getCandidateReviewDetail(selectedSubmissionId, token);
        setDetail(payload);
      } catch {
        setDetail(null);
      }
    })();
  }, [selectedSubmissionId, token]);

  const runSearch = async () => {
    if (!token) return;
    setStatusMessage("");
    try {
      const cleanFilters = Object.fromEntries(Object.entries(filters).filter(([, v]) => v.trim().length > 0));
      const rows = await searchCandidateReviews(token, cleanFilters);
      setResults(rows);
      setSelectedSubmissionId(rows[0]?.submission_id ?? null);
    } catch {
      setStatusMessage("Search failed.");
    }
  };

  const resetToAllApplicants = () => {
    setFilters({
      candidate_name: "",
      northeastern_email: "",
      major: "",
      college: "",
      grad_start: "",
      grad_end: "",
      coop_number: "",
      year_grade_level: "",
      position: "",
      cycle: "",
      application_status: "",
    });
    setResults(allResults);
    setSelectedSubmissionId(allResults[0]?.submission_id ?? null);
    setStatusMessage("");
  };

  const goToPreviousApplicant = () => {
    if (selectedIndex <= 0) return;
    setSelectedSubmissionId(results[selectedIndex - 1].submission_id);
  };

  const goToNextApplicant = () => {
    if (selectedIndex < 0 || selectedIndex >= results.length - 1) return;
    setSelectedSubmissionId(results[selectedIndex + 1].submission_id);
  };

  return (
    <div className="min-h-screen bg-[#ececec]">
      <Header />
      <main className="mx-auto max-w-[1300px] px-4 pt-24">
        <section className="rounded border border-[#c7c7c7] bg-[#d8d8d8] p-5">
          <h1 className="text-4xl font-semibold text-[#1f1f1f]">Application Review</h1>
          <p className="mt-2 text-lg text-[#2d2d2d]">Search for candidate</p>

          <div className="mt-3 grid gap-2 md:grid-cols-4">
            {Object.keys(filters).map((key) => (
              <input
                key={key}
                value={filters[key]}
                onChange={(e) => setFilters((prev) => ({ ...prev, [key]: e.target.value }))}
                placeholder={key.split("_").join(" ")}
                className="rounded border border-[#bdbdbd] px-2 py-1 text-sm"
              />
            ))}
            <button type="button" onClick={() => void runSearch()} className="rounded border border-[#8a8a8a] px-3 py-1 text-sm">
              Search
            </button>
            <button type="button" onClick={resetToAllApplicants} className="rounded border border-[#8a8a8a] px-3 py-1 text-sm">
              View All Applicants
            </button>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-[1fr_2fr]">
            <div className="rounded border border-[#b8b8b8] bg-white p-3">
              <p className="mb-2 text-sm font-semibold text-[#2d2d2d]">Results ({results.length})</p>
              <div className="space-y-2">
                {results.map((row) => (
                  <button
                    key={row.submission_id}
                    type="button"
                    onClick={() => setSelectedSubmissionId(row.submission_id)}
                    className={`w-full rounded border px-2 py-2 text-left text-sm ${
                      row.submission_id === selectedSubmissionId ? "border-[#1f6f5f]" : "border-[#d0d0d0]"
                    }`}
                  >
                    <p className="font-semibold">{row.candidate_name}</p>
                    <p>{row.major ?? "N/A"} | {row.graduation_date ?? "N/A"} | {row.coop_number ?? "N/A"}</p>
                    <p>Status: {row.application_status}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded border border-[#b8b8b8] bg-white p-4">
              {detail ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-[#555]">
                      Applicant {selectedIndex >= 0 ? selectedIndex + 1 : 0} of {results.length}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="rounded border border-[#8a8a8a] px-2 py-1 text-xs disabled:opacity-50"
                        onClick={goToPreviousApplicant}
                        disabled={selectedIndex <= 0}
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        className="rounded border border-[#8a8a8a] px-2 py-1 text-xs disabled:opacity-50"
                        onClick={goToNextApplicant}
                        disabled={selectedIndex < 0 || selectedIndex >= results.length - 1}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                  <h2 className="text-2xl font-semibold text-[#1f1f1f]">
                    {selectedRow?.candidate_name ?? detail.submission.applicant_name} - {detail.position_title}
                  </h2>
                  <p className="text-sm text-[#4b4b4b]">Position Code: {detail.position_code}</p>
                  <p className="text-sm text-[#4b4b4b]">Status: {detail.submission.status}</p>

                  <div>
                    <p className="font-semibold">Global Profile Fields</p>
                    <div className="mt-2 grid grid-cols-1 gap-1 text-sm md:grid-cols-2">
                      {Object.entries(detail.global_profile_fields ?? {}).map(([key, value]) => (
                        <p key={key}>
                          <span className="font-medium">{key}:</span> {String(value)}
                        </p>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="font-semibold">Resume</p>
                    {detail.resume_view_url ? (
                      <iframe title="Resume Preview" src={detail.resume_view_url} className="mt-2 h-72 w-full rounded border" />
                    ) : null}
                    <div className="mt-2">
                      {detail.resume_view_url ? (
                        <a href={detail.resume_view_url} target="_blank" rel="noreferrer" className="underline">
                          Download resume
                        </a>
                      ) : (
                        <p className="text-sm text-[#666]">No resume uploaded.</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="font-semibold">Position-specific Answers</p>
                    <div className="mt-2 space-y-2">
                      {(detail.position_question_answers ?? []).map((entry, idx) => (
                        <div key={`ans-${idx}`} className="rounded border border-[#d6d6d6] bg-[#fafafa] p-2">
                          <p className="font-medium">{String(entry.question ?? "Question")}</p>
                          <p>{String(entry.answer ?? "")}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="font-semibold">Scores</p>
                      <div className="mt-2 space-y-1 text-sm">
                        {detail.scores.map((score) => (
                          <p key={score.id}>
                            {score.reviewer_name}: {score.score} ({new Date(score.created_at).toLocaleString()})
                          </p>
                        ))}
                      </div>
                      <div className="mt-2 flex gap-2">
                        <input
                          value={newScore}
                          onChange={(e) => setNewScore(e.target.value)}
                          className="w-20 rounded border border-[#c3c3c3] px-2 py-1 text-sm"
                        />
                        <button
                          type="button"
                          className="rounded border border-[#8a8a8a] px-3 py-1 text-sm"
                          onClick={async () => {
                            if (!token || !selectedSubmissionId) return;
                            await addCandidateReviewScore(selectedSubmissionId, Number(newScore), token);
                            const refreshed = await getCandidateReviewDetail(selectedSubmissionId, token);
                            setDetail(refreshed);
                          }}
                        >
                          Add Score
                        </button>
                      </div>
                    </div>

                    <div>
                      <p className="font-semibold">Comments</p>
                      <div className="mt-2 max-h-40 space-y-1 overflow-auto text-sm">
                        {detail.comments.map((comment) => (
                          <p key={comment.id}>
                            <span className="font-medium">{comment.reviewer_name}:</span> {comment.comment}
                          </p>
                        ))}
                      </div>
                      <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="mt-2 h-20 w-full rounded border border-[#c3c3c3] px-2 py-1 text-sm"
                        placeholder="Add reviewer comment"
                      />
                      <button
                        type="button"
                        className="mt-2 rounded border border-[#8a8a8a] px-3 py-1 text-sm"
                        onClick={async () => {
                          if (!token || !selectedSubmissionId || !newComment.trim()) return;
                          await addCandidateReviewComment(selectedSubmissionId, newComment.trim(), token);
                          setNewComment("");
                          const refreshed = await getCandidateReviewDetail(selectedSubmissionId, token);
                          setDetail(refreshed);
                        }}
                      >
                        Add Comment
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-[#444]">Select a candidate result to open full profile and application.</p>
              )}
            </div>
          </div>
          {statusMessage ? <p className="mt-3 text-sm text-[#444]">{statusMessage}</p> : null}
        </section>
      </main>
    </div>
  );
}
