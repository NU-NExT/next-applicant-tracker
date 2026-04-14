import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";

import {
  addCandidateReviewComment,
  addCandidateReviewScore,
  exportCandidateReviewsCsv,
  getCandidateReviewDetail,
  searchCandidateReviews,
  type CandidateReviewDetail,
  type CandidateReviewSearchRow,
} from "../api";
import { Header } from "../components/header";
import { Button } from "../components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "../components/ui/drawer";
import { ChevronsUpDownIcon } from "../components/ui/lucide-chevrons-up-down";

export function AdminReviewApplicationsPage() {
  const token = localStorage.getItem("auth_access_token") ?? "";
  const currentReviewerName = (localStorage.getItem("auth_user_name") ?? "").trim().toLowerCase();
  const [allResults, setAllResults] = useState<CandidateReviewSearchRow[]>([]);
  const [results, setResults] = useState<CandidateReviewSearchRow[]>([]);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<number | null>(null);
  const [detail, setDetail] = useState<CandidateReviewDetail | null>(null);
  const [newScore, setNewScore] = useState("");
  const [newComment, setNewComment] = useState("");
  const [isSearchDrawerOpen, setIsSearchDrawerOpen] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [showExportToast, setShowExportToast] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [activeCommentsTab, setActiveCommentsTab] = useState<"thread" | "add">("thread");
  const [openQuestionIndexes, setOpenQuestionIndexes] = useState<Set<number>>(new Set());
  const [filters, setFilters] = useState<Record<string, string>>({
    candidate_name: "",
    coop_number: "",
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

  useEffect(() => {
    setNewComment("");
    setActiveCommentsTab("thread");
    setOpenQuestionIndexes(new Set());
  }, [selectedSubmissionId]);

  useEffect(() => {
    if (!showExportToast) return;
    const timer = window.setTimeout(() => setShowExportToast(false), 2200);
    return () => window.clearTimeout(timer);
  }, [showExportToast]);

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
      coop_number: "",
    });
    setResults(allResults);
    setSelectedSubmissionId(allResults[0]?.submission_id ?? null);
    setStatusMessage("");
  };

  const averageScoreRounded = useMemo(() => {
    if (!detail || detail.scores.length === 0) return null;
    const avg = detail.scores.reduce((sum, score) => sum + score.score, 0) / detail.scores.length;
    return Math.round(avg);
  }, [detail]);

  const currentReviewerScore = useMemo(() => {
    if (!detail || !currentReviewerName) return null;
    return detail.scores.find((score) => score.reviewer_name.trim().toLowerCase() === currentReviewerName) ?? null;
  }, [detail, currentReviewerName]);

  const estDateTimeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }),
    []
  );

  const formatCommentTimestampEst = (rawTimestamp: string) => {
    if (!rawTimestamp) return "Unknown date";
    const normalized = rawTimestamp.includes("T") ? rawTimestamp : rawTimestamp.replace(" ", "T");
    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) return "Unknown date";
    return `${estDateTimeFormatter.format(parsed)} EST`;
  };

  const toggleQuestion = (index: number) => {
    setOpenQuestionIndexes((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const goToPreviousApplicant = () => {
    if (selectedIndex <= 0) return;
    setSelectedSubmissionId(results[selectedIndex - 1].submission_id);
  };

  const goToNextApplicant = () => {
    if (selectedIndex < 0 || selectedIndex >= results.length - 1) return;
    setSelectedSubmissionId(results[selectedIndex + 1].submission_id);
  };

  const exportCsv = async () => {
    if (!token) {
      setStatusMessage("No active session found. Please sign in from /login first.");
      return;
    }
    setIsExportingCsv(true);
    setStatusMessage("");
    try {
      const cleanFilters = Object.fromEntries(Object.entries(filters).filter(([, v]) => v.trim().length > 0));
      const csvBlob = await exportCandidateReviewsCsv(token, cleanFilters);
      const downloadUrl = window.URL.createObjectURL(csvBlob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = "candidate-review-export.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      setShowExportToast(true);
    } catch {
      setStatusMessage("Export failed.");
    } finally {
      setIsExportingCsv(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#ececec]">
      {showExportToast ? (
        <div className="fixed top-20 left-1/2 z-50 -translate-x-1/2 rounded-md bg-[#1f6f5f] px-4 py-2 text-sm font-medium text-white shadow-md">
          CSV Exported!
        </div>
      ) : null}
      <Header />
      <main className="px-4 pt-24 pb-6">
        <section className="mx-auto rounded p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <Drawer open={isSearchDrawerOpen} onOpenChange={setIsSearchDrawerOpen} direction="left">
              <DrawerTrigger asChild>
                <Button variant="outline" className="bg-white">
                  <Search className="h-4 w-4" />
                  Search Candidates
                </Button>
              </DrawerTrigger>
              <DrawerContent className="h-full max-h-none w-[92vw] max-w-[460px] bg-white" hideOverlay>
                <DrawerHeader className="border-b pb-3">
                  <DrawerTitle>Search for Candidate</DrawerTitle>
                </DrawerHeader>
                <div className="space-y-3 overflow-y-auto p-4">
                  <div className="grid gap-2">
                    <input
                      value={filters.candidate_name}
                      onChange={(e) => setFilters((prev) => ({ ...prev, candidate_name: e.target.value }))}
                      placeholder="candidate name"
                      className="rounded border border-[#bdbdbd] px-2 py-2 text-sm"
                    />
                    <input
                      value={filters.coop_number}
                      onChange={(e) => setFilters((prev) => ({ ...prev, coop_number: e.target.value }))}
                      placeholder="coop number"
                      className="rounded border border-[#bdbdbd] px-2 py-2 text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="bg-white"
                      onClick={() => {
                        void runSearch();
                      }}
                    >
                      Search
                    </Button>
                    <Button type="button" variant="outline" className="bg-white" onClick={resetToAllApplicants}>
                      View All
                    </Button>
                  </div>
                  <div>
                    <p className="mb-2 text-sm font-semibold text-[#2d2d2d]">Results ({results.length})</p>
                    <div className="space-y-2">
                      {results.map((row) => (
                        <button
                          key={row.submission_id}
                          type="button"
                          onClick={() => {
                            setSelectedSubmissionId(row.submission_id);
                            setIsSearchDrawerOpen(false);
                          }}
                          className={`w-full rounded border px-2 py-2 text-left text-sm ${
                            row.submission_id === selectedSubmissionId ? "border-[#1f6f5f]" : "border-[#d0d0d0]"
                          }`}
                        >
                          <p className="font-semibold">{row.candidate_name}</p>
                          <p>
                            {row.major ?? "N/A"} | {row.graduation_date ?? "N/A"} | {row.coop_number ?? "N/A"}
                          </p>
                          <p>Status: {row.application_status}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </DrawerContent>
            </Drawer>
            <Button
              type="button"
              className="rounded-md bg-[#1f6f5f] px-4 py-2 text-sm text-white hover:bg-[#18574b] disabled:opacity-60"
              onClick={() => {
                void exportCsv();
              }}
              disabled={isExportingCsv}
            >
              {isExportingCsv ? "Exporting..." : "Export Applicants"}
            </Button>
          </div>

          <div className="rounded border border-[#b8b8b8] bg-white p-4">
            {detail ? (
              <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs text-[#555]">
                      <span>Applicant</span>
                      <select
                        value={selectedSubmissionId ?? ""}
                        onChange={(e) => {
                          const nextSubmissionId = Number(e.target.value);
                          if (!Number.isNaN(nextSubmissionId) && nextSubmissionId > 0) {
                            setSelectedSubmissionId(nextSubmissionId);
                          }
                        }}
                        className="min-w-[25px] rounded border border-[#c3c3c3] bg-white px-2 py-1 text-xs text-[#1f1f1f]"
                      >
                        {results.length === 0 ? <option value="">No applicants</option> : null}
                        {results.map((row, idx) => (
                          <option key={row.submission_id} value={row.submission_id}>
                            {idx + 1}
                          </option>
                        ))}
                      </select>
                      <span>of {results.length}</span>
                    </div>
                    <div className="ml-auto flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="bg-white text-xs disabled:opacity-50"
                        onClick={goToPreviousApplicant}
                        disabled={selectedIndex <= 0}
                      >
                        Previous
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="bg-white text-xs disabled:opacity-50"
                        onClick={goToNextApplicant}
                        disabled={selectedIndex < 0 || selectedIndex >= results.length - 1}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
                    <div className="flex-1 rounded border border-[#d5d5d5] bg-[#f7f7f7] px-4 py-3">
                      <h2 className="text-2xl text-center font-semibold text-[#1f1f1f]">
                        {selectedRow?.candidate_name ?? detail.submission.applicant_name} 
                      </h2>
                      <p className="text-sm text-center text-[#3f3f3f]">
                        {detail.submission.applicant_email} | {detail.position_title} ({detail.position_code}) | Status:{" "}
                        {detail.submission.status}
                      </p>
                    </div>
                    <aside className="flex min-w-[200px] flex-col items-end justify-center bg-white px-4 py-3">
                      <p className="text-right text-sm font-semibold text-[#1f1f1f]">
                        Avg Score: {averageScoreRounded ?? "N/A"}
                      </p>
                      {currentReviewerScore ? (
                        <p className="mt-2 text-right text-xs text-[#555]">Your score: {currentReviewerScore.score}</p>
                      ) : (
                        <div className="mt-2 flex items-center gap-2">
                          <input
                            value={newScore}
                            onChange={(e) => setNewScore(e.target.value)}
                            className="w-20 rounded border border-[#c3c3c3] bg-white px-2 py-1 text-sm"
                            placeholder="score"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            className="bg-white text-xs"
                            onClick={async () => {
                              if (!token || !selectedSubmissionId) return;
                              await addCandidateReviewScore(selectedSubmissionId, Number(newScore), token);
                              setNewScore("");
                              const refreshed = await getCandidateReviewDetail(selectedSubmissionId, token);
                              setDetail(refreshed);
                            }}
                          >
                            Add Score
                          </Button>
                        </div>
                      )}
                    </aside>
                  </div>

                  <div className="relative grid gap-4 lg:grid-cols-3">
                    <section className="rounded bg-white p-3 lg:col-span-1">
                      <p className="font-semibold text-[#1f1f1f]">Application Questions & Answers</p>
                      <div className="mt-3 space-y-2">
                        {(detail.position_question_answers ?? []).map((entry, idx) => (
                          <div key={`ans-${idx}`} className="rounded border border-[#e2e2e2] bg-[#fafafa] text-sm">
                            <button
                              type="button"
                              className="flex w-full items-center justify-between gap-2 px-2 py-2 text-left font-medium"
                              onClick={() => toggleQuestion(idx)}
                            >
                              <span>{String(entry.question ?? "Question")}</span>
                              <ChevronsUpDownIcon className="h-4 w-4 shrink-0 text-[#666]" />
                            </button>
                            <div
                              className={`overflow-hidden px-2 transition-all duration-200 ${
                                openQuestionIndexes.has(idx) ? "max-h-[240px] pb-2 opacity-100" : "max-h-0 opacity-0"
                              }`}
                            >
                              <p className="whitespace-pre-wrap">{String(entry.answer ?? "")}</p>
                            </div>
                          </div>
                        ))}
                        {detail.position_question_answers.length === 0 ? (
                          <p className="text-sm text-[#666]">No submitted answers available.</p>
                        ) : null}
                      </div>
                    </section>

                    <section className="rounded border border-[#d8d8d8] bg-white p-3 lg:col-span-2">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-[#1f1f1f]">Resume Preview</p>
                      </div>
                      <div className="mt-3 rounded border border-[#ececec] bg-[#fcfcfc] p-2">
                        {detail.resume_view_url ? (
                          <iframe title="Resume Preview" src={detail.resume_view_url} className="h-[420px] w-full rounded border" />
                        ) : (
                          <p className="text-sm text-[#666]">No resume uploaded.</p>
                        )}
                      </div>
                      {detail.resume_view_url ? (
                        <a href={detail.resume_view_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm underline">
                          Open full resume
                        </a>
                      ) : null}
                    </section>

                  </div>

                  <div className="rounded border border-[#d8d8d8] bg-[#fafafa] p-3">
                    <div className="mb-3 flex items-center gap-2 border-b border-[#dedede] pb-2">
                      <button
                        type="button"
                        className={`rounded px-3 py-1 text-sm ${
                          activeCommentsTab === "thread" ? "bg-white font-semibold text-[#1f1f1f]" : "text-[#555]"
                        }`}
                        onClick={() => setActiveCommentsTab("thread")}
                      >
                        Comments
                      </button>
                      <button
                        type="button"
                        className={`rounded px-3 py-1 text-sm ${
                          activeCommentsTab === "add" ? "bg-white font-semibold text-[#1f1f1f]" : "text-[#555]"
                        }`}
                        onClick={() => setActiveCommentsTab("add")}
                      >
                        Add Comment
                      </button>
                    </div>
                    {activeCommentsTab === "thread" ? (
                      <div className="max-h-56 space-y-2 overflow-auto text-sm">
                        {detail.comments.map((comment) => (
                          <div key={comment.id} className="rounded border border-[#ececec] bg-white px-2 py-1">
                            <p className="font-medium text-[#2d2d2d]">
                              {comment.reviewer_name} - {formatCommentTimestampEst(comment.created_at)}
                            </p>
                            <p className="mt-1 whitespace-pre-wrap">{comment.comment}</p>
                          </div>
                        ))}
                        {detail.comments.length === 0 ? <p className="text-[#666]">No comments yet.</p> : null}
                      </div>
                    ) : (
                      <div>
                        <textarea
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          className="h-24 w-full rounded border border-[#c3c3c3] bg-white px-2 py-1 text-sm"
                          placeholder="Add reviewer comment"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="mt-2 bg-white"
                          onClick={async () => {
                            if (!token || !selectedSubmissionId || !newComment.trim()) return;
                            await addCandidateReviewComment(selectedSubmissionId, newComment.trim(), token);
                            setNewComment("");
                            setActiveCommentsTab("thread");
                            const refreshed = await getCandidateReviewDetail(selectedSubmissionId, token);
                            setDetail(refreshed);
                          }}
                        >
                          Add Comment
                        </Button>
                      </div>
                    )}
                  </div>
              </div>
            ) : (
              <p className="text-[#444]">Select a candidate result to open full profile and application.</p>
            )}
          </div>
          {statusMessage ? <p className="mt-3 text-sm text-[#444]">{statusMessage}</p> : null}
        </section>
      </main>
    </div>
  );
}
