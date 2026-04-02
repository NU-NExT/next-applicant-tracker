import { useState } from "react";
import type { RepositoryQuestion } from "../../api";
import { joinClubList, type ProfileFormData } from "../profile/profileFormModel";

type StepReviewSubmitProps = {
  positionLabel: string;
  resumeViewUrl: string;
  profile: ProfileFormData;
  globalQuestions: RepositoryQuestion[];
  globalAnswers: Record<number, string>;
  globalDropdownFallbacks: Record<number, string>;
  questions: RepositoryQuestion[];
  answers: Record<number, string>;
  dropdownFallbacks: Record<number, string>;
  onSubmit: () => Promise<void>;
  onBack: () => void;
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 py-1.5 text-sm">
      <span className="w-56 shrink-0 font-medium text-[#2d2d2d]">{label}</span>
      <span className="text-[#444]">{value || "\u2014"}</span>
    </div>
  );
}

export function StepReviewSubmit({
  positionLabel,
  resumeViewUrl,
  profile,
  globalQuestions,
  globalAnswers,
  globalDropdownFallbacks,
  questions,
  answers,
  dropdownFallbacks,
  onSubmit,
  onBack,
}: StepReviewSubmitProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submittedAt, setSubmittedAt] = useState("");

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      await onSubmit();
      setSubmittedAt(new Date().toLocaleString());
      setSubmitted(true);
    } catch (err: unknown) {
      const detail =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      setError(detail ?? "Submission failed. Please try again.");
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center py-12 text-center">
        <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#1f6f5f] text-3xl text-white">
          {"\u2713"}
        </span>
        <h2 className="text-2xl font-semibold text-[#1f1f1f]">Application Submitted!</h2>
        <p className="mt-2 text-[#4d4d4d]">
          Your application for position <strong>{positionLabel}</strong> has been received.
        </p>
        <p className="mt-1 text-sm text-[#888]">Submitted on {submittedAt}</p>
        <button
          type="button"
          onClick={() => { window.location.href = "/applicant-dashboard"; }}
          className="mt-8 rounded-md bg-[#1f6f5f] px-6 py-2.5 text-white"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-[#1f1f1f]">Step 5: Review & Submit</h2>
      <p className="text-sm text-[#4d4d4d]">Please review your information before submitting.</p>

      {/* Resume */}
      <section>
        <h3 className="mb-2 text-lg font-semibold text-[#1f1f1f]">Resume</h3>
        {resumeViewUrl ? (
          <a href={resumeViewUrl} target="_blank" rel="noreferrer" className="text-sm underline">
            View uploaded resume
          </a>
        ) : (
          <p className="text-sm text-[#888]">No resume uploaded</p>
        )}
      </section>

      {/* Profile */}
      <section>
        <h3 className="mb-2 text-lg font-semibold text-[#1f1f1f]">Profile</h3>
        <div className="divide-y divide-[#eee]">
          <Row label="Full Legal Name" value={profile.fullLegalName} />
          <Row label="Preferred Name" value={profile.preferredName} />
          <Row label="Pronouns" value={profile.pronouns} />
          <Row label="Email" value={profile.email} />
          <Row label="Expected Graduation" value={profile.expectedGraduationDate} />
          <Row label="Year / Grade" value={profile.currentYear} />
          <Row label="Major" value={profile.major} />
          <Row label="Minor" value={profile.minor} />
          <Row label="Concentration" value={profile.concentration} />
          <Row label="GPA" value={profile.gpa} />
          <Row label="GitHub" value={profile.githubUrl} />
          <Row label="LinkedIn" value={profile.linkedinUrl} />
          <Row label="Clubs / Extracurriculars" value={joinClubList(profile.clubs)} />
          <Row label="Paid Experiences" value={profile.paidExperienceCount} />
          <Row label="Unpaid Experiences" value={profile.unpaidExperienceCount} />
          <Row label="Additional Information" value={profile.otherRelevantInformation} />
        </div>
      </section>

      {/* Global questions */}
      {globalQuestions.length > 0 && (
        <section>
          <h3 className="mb-2 text-lg font-semibold text-[#1f1f1f]">General Questions</h3>
          <div className="divide-y divide-[#eee]">
            {globalQuestions.map((q, i) => {
              const raw = globalAnswers[i] ?? "";
              const value = q.question_type === "dropdown" && raw === "__other__"
                ? globalDropdownFallbacks[i] ?? ""
                : raw;
              return <Row key={i} label={q.prompt} value={value} />;
            })}
          </div>
        </section>
      )}

      {/* Position questions */}
      {questions.length > 0 && (
        <section>
          <h3 className="mb-2 text-lg font-semibold text-[#1f1f1f]">Position Questions</h3>
          <div className="divide-y divide-[#eee]">
            {questions.map((q, i) => {
              const raw = answers[i] ?? "";
              const value = q.question_type === "dropdown" && raw === "__other__"
                ? dropdownFallbacks[i] ?? ""
                : raw;
              return <Row key={i} label={q.prompt} value={value} />;
            })}
          </div>
        </section>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-between">
        <button type="button" onClick={onBack} className="rounded-md border border-[#c7c7c7] px-5 py-2 text-[#333]">
          Back
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={handleSubmit}
          className="rounded-md bg-[#1f6f5f] px-5 py-2 text-white disabled:opacity-60"
        >
          {submitting ? "Submitting..." : "Submit Application"}
        </button>
      </div>
    </div>
  );
}
