import { useEffect, useMemo, useRef, useState } from "react";
import { deleteScore, fetchScoreSummary, submitScore } from "../api";
import type { ScoreLabel, ScoreSummaryResponse } from "../api";

interface ScorePanelProps {
  applicationId: number | null;
  token: string;
}

const SCORE_OPTIONS: ScoreLabel[] = ["Strong", "Potential", "Defer", "Deny"];

const LABEL_BG: Record<ScoreLabel, string> = {
  Strong: "bg-green-600",
  Potential: "bg-amber-500",
  Defer: "bg-blue-500",
  Deny: "bg-red-600",
};

const LABEL_COLORS: Record<ScoreLabel, string> = {
  Strong: "bg-green-100 text-green-800",
  Potential: "bg-amber-100 text-amber-800",
  Defer: "bg-blue-100 text-blue-800",
  Deny: "bg-red-100 text-red-800",
};

const estFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

function formatTimestamp(raw: string): string {
  if (!raw) return "Unknown date";
  const normalized = raw.includes("T") ? raw : raw.replace(" ", "T");
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return "Unknown date";
  return `${estFormatter.format(parsed)} EST`;
}

export function ScorePanel({ applicationId, token }: ScorePanelProps) {
  const currentUserEmail = localStorage.getItem("auth_user_email") ?? "";
  const [summary, setSummary] = useState<ScoreSummaryResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [scoreOpen, setScoreOpen] = useState(false);
  const [reviewsOpen, setReviewsOpen] = useState(false);

  const scoreRef = useRef<HTMLDivElement>(null);
  const reviewsRef = useRef<HTMLDivElement>(null);

  const loadSummary = useMemo(
    () => async () => {
      if (!applicationId || !token) {
        setSummary(null);
        return;
      }
      try {
        const data = await fetchScoreSummary(applicationId, token);
        setSummary(data);
        setError("");
      } catch {
        setSummary(null);
        setError("Could not load scores.");
      }
    },
    [applicationId, token]
  );

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (scoreRef.current && !scoreRef.current.contains(e.target as Node)) {
        setScoreOpen(false);
      }
      if (reviewsRef.current && !reviewsRef.current.contains(e.target as Node)) {
        setReviewsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const myScore =
    summary?.individual_scores.find((s) => s.reviewer_email === currentUserEmail) ?? null;

  const handleSubmit = async (label: ScoreLabel) => {
    if (!applicationId || !token || isSubmitting) return;
    setScoreOpen(false);
    setIsSubmitting(true);
    setError("");
    try {
      if (myScore?.score_label === label) {
        await deleteScore(applicationId, token);
      } else {
        await submitScore(applicationId, label, token);
      }
      await loadSummary();
    } catch {
      setError("Failed to update score.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalReviews = summary?.total_reviews ?? 0;

  return (
    <aside className="flex min-w-[220px] flex-col gap-2 rounded border border-[#d8d8d8] bg-[#fafafa] px-4 py-3">
      <p className="text-sm font-semibold text-[#1f1f1f]">Score</p>

      <div className="flex items-center gap-2">
        {/* Score selector dropdown */}
        <div ref={scoreRef} className="relative">
          <button
            type="button"
            onClick={() => setScoreOpen((v) => !v)}
            disabled={isSubmitting}
            className={[
              "flex items-center gap-1.5 rounded border px-3 py-1.5 text-xs font-medium disabled:opacity-60",
              myScore
                ? `${LABEL_BG[myScore.score_label]} border-transparent text-white`
                : "border-[#c3c3c3] bg-white text-[#555]",
            ].join(" ")}
          >
            {myScore ? myScore.score_label : "Select score"}
            <span className="text-[10px]">▾</span>
          </button>
          {scoreOpen ? (
            <div className="absolute top-full left-0 z-10 mt-1 w-36 rounded border border-[#d0d0d0] bg-white shadow-sm">
              {SCORE_OPTIONS.map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => { void handleSubmit(label); }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-[#f5f5f5]"
                >
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${LABEL_BG[label]}`} />
                  <span className={myScore?.score_label === label ? "font-semibold" : ""}>{label}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {/* Reviews popover */}
        <div ref={reviewsRef} className="relative">
          <button
            type="button"
            onClick={() => setReviewsOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded border border-[#c3c3c3] bg-white px-3 py-1.5 text-xs text-[#555]"
          >
            Reviews ({totalReviews})
            <span className="text-[10px]">▾</span>
          </button>
          {reviewsOpen ? (
            <div className="absolute top-full right-0 z-10 mt-1 min-w-[230px] rounded border border-[#d0d0d0] bg-white shadow-sm">
              {!summary || summary.individual_scores.length === 0 ? (
                <p className="px-3 py-2 text-xs text-[#888]">No reviews yet.</p>
              ) : (
                summary.individual_scores.map((s) => (
                  <div
                    key={s.application_review_score_id}
                    className="border-b border-[#f0f0f0] px-3 py-2 last:border-0"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-[#2d2d2d]">{s.reviewer_name}</span>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${LABEL_COLORS[s.score_label]}`}>
                        {s.score_label}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-[#888]">{formatTimestamp(s.created_at)}</p>
                  </div>
                ))
              )}
            </div>
          ) : null}
        </div>
      </div>

      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </aside>
  );
}
