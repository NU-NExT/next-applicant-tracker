import { type FormEvent, useEffect, useState } from "react";

import {
  createRepositoryRequest,
  getRepositoryQuestions,
  getRepositoryQuestionsByPosition,
  getMyProfile,
  type RepositoryQuestion,
  uploadResumePdf,
} from "../api";
import { Header } from "../components/header";

type RepositoryRequestPageProps = {
  jobId: string;
};

const fallbackQuestions = [
  "Tell us about your relevant experience for this role.",
  "Describe a project where you collaborated with a team under deadlines.",
  "What interests you about working with NExT Consulting?",
];

export function RepositoryRequestPage({ jobId }: RepositoryRequestPageProps) {
  const normalizedJobId = String(jobId).trim();
  const numericJobId = Number(normalizedJobId);
  const isNumericJobId = Number.isFinite(numericJobId) && numericJobId > 0;
  const [questions, setQuestions] = useState<RepositoryQuestion[]>(
    fallbackQuestions.map((prompt) => ({ prompt, question_type: "free_text" }))
  );
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [dropdownFallbackValues, setDropdownFallbackValues] = useState<Record<number, string>>({});
  const [statusMessage, setStatusMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resumeKey, setResumeKey] = useState<string>("");
  const [resumeUrl, setResumeUrl] = useState<string>("");
  const [resumeStatus, setResumeStatus] = useState("");
  const accessToken = localStorage.getItem("auth_access_token") ?? "";

  useEffect(() => {
    void (async () => {
      try {
        const data = isNumericJobId
          ? await getRepositoryQuestions(numericJobId)
          : await getRepositoryQuestionsByPosition(normalizedJobId);
        if (data.length > 0) {
          setQuestions(data);
        }
      } catch {
        setQuestions(fallbackQuestions.map((prompt) => ({ prompt, question_type: "free_text" })));
      }
    })();
  }, [isNumericJobId, normalizedJobId, numericJobId]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!accessToken) {
      setStatusMessage("Please log in before submitting.");
      return;
    }
    setIsSubmitting(true);
    setStatusMessage("");

    try {
      const profile = await getMyProfile(accessToken);
      await createRepositoryRequest({
        job_listing_id: isNumericJobId ? numericJobId : undefined,
        job_listing_slug: isNumericJobId ? undefined : normalizedJobId.toLowerCase(),
        applicant_name: `${profile.first_name} ${profile.last_name}`.trim(),
        applicant_email: profile.email,
        resume_s3_key: resumeKey || undefined,
        profile_snapshot_json: {
          email: profile.email,
          first_name: profile.first_name,
          last_name: profile.last_name,
          user_metadata: profile.user_metadata,
        },
        responses_json: JSON.stringify(
          questions.map((question, index) => ({
            question: question.prompt,
            question_type: question.question_type ?? "free_text",
            is_global: Boolean(question.is_global),
            answer:
              question.question_type === "dropdown" && (answers[index] ?? "") === "__other__"
                ? dropdownFallbackValues[index] ?? ""
                : answers[index] ?? "",
          }))
        ),
        status: "applied",
      }, accessToken);
      setStatusMessage("Application submitted. Redirecting to dashboard...");
      setTimeout(() => {
        window.location.href = "/applicant-dashboard";
      }, 900);
    } catch {
      setStatusMessage("Could not submit application. Please retry.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#efefef]">
      <Header />

      <main className="mx-auto max-w-[1100px] px-4 pb-8 pt-24">
        <section className="rounded-md border border-[#c7c7c7] bg-white p-6">
          <h1 className="text-4xl font-semibold text-[#1f1f1f]">Repository Request: Position {jobId}</h1>
          <p className="mt-2 text-base text-[#4d4d4d]">Complete all questions to submit your application.</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-5">
            <label className="block">
              <span className="mb-2 block text-lg font-medium text-[#2d2d2d]">Resume (PDF, max 1MB)</span>
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (!accessToken) {
                    setResumeStatus("Please log in before uploading a resume.");
                    return;
                  }
                  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
                    setResumeStatus("Resume must be a PDF.");
                    return;
                  }
                  if (file.size > 1024 * 1024) {
                    setResumeStatus("Resume exceeds 1MB.");
                    return;
                  }
                  try {
                    setResumeStatus("Uploading...");
                    const uploaded = await uploadResumePdf(file, accessToken);
                    setResumeKey(uploaded.resume_s3_key);
                    setResumeUrl(uploaded.resume_view_url);
                    setResumeStatus("Resume uploaded.");
                  } catch {
                    setResumeStatus("Resume upload failed.");
                  }
                }}
                className="w-full rounded border border-[#c3c3c3] px-3 py-2"
              />
              {resumeStatus ? <p className="mt-2 text-sm text-[#444]">{resumeStatus}</p> : null}
              {resumeUrl ? (
                <a href={resumeUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm underline">
                  View uploaded resume
                </a>
              ) : null}
            </label>

            {questions.map((question, index) => (
              <label key={`${question.prompt}-${index}`} className="block">
                <span className="mb-2 block text-lg font-medium text-[#2d2d2d]">{question.prompt}</span>
                {question.question_type === "dropdown" ? (
                  <>
                    <select
                      value={answers[index] ?? ""}
                      onChange={(e) =>
                        setAnswers((prev) => ({
                          ...prev,
                          [index]: e.target.value,
                        }))
                      }
                      className="w-full rounded border border-[#c3c3c3] px-3 py-2"
                    >
                      <option value="">Select an option</option>
                      {Array.isArray(question.question_config_json?.options)
                        ? (question.question_config_json?.options as string[]).map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))
                        : null}
                      <option value="__other__">Other (type manually)</option>
                    </select>
                    {(answers[index] ?? "") === "__other__" ? (
                      <input
                        className="mt-2 w-full rounded border border-[#c3c3c3] px-3 py-2"
                        placeholder="Enter custom value"
                        value={dropdownFallbackValues[index] ?? ""}
                        onChange={(e) =>
                          setDropdownFallbackValues((prev) => ({
                            ...prev,
                            [index]: e.target.value,
                          }))
                        }
                      />
                    ) : null}
                  </>
                ) : (
                  <textarea
                    value={answers[index] ?? ""}
                    onChange={(e) =>
                      setAnswers((prev) => ({
                        ...prev,
                        [index]: e.target.value,
                      }))
                    }
                    maxLength={question.character_limit ?? undefined}
                    className="h-24 w-full rounded border border-[#c3c3c3] px-3 py-2"
                    placeholder="Your response"
                  />
                )}
              </label>
            ))}

            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-[#1f6f5f] px-5 py-2 text-white disabled:opacity-60"
            >
              {isSubmitting ? "Submitting..." : "Submit Application"}
            </button>

            {statusMessage ? <p className="text-sm text-[#444]">{statusMessage}</p> : null}
          </form>
        </section>
      </main>
    </div>
  );
}
