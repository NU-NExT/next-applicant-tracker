import { type FormEvent, useEffect, useState } from "react";

import { createRepositoryRequest, getRepositoryQuestions } from "../api";
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
  const numericJobId = Number(jobId) || 1;
  const [questions, setQuestions] = useState<string[]>(fallbackQuestions);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [statusMessage, setStatusMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const data = await getRepositoryQuestions(numericJobId);
        if (data.length > 0) {
          setQuestions(data.map((q) => q.prompt));
        }
      } catch {
        setQuestions(fallbackQuestions);
      }
    })();
  }, [numericJobId]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setStatusMessage("");

    try {
      await createRepositoryRequest({
        job_listing_id: numericJobId,
        applicant_name: "X Applicant",
        applicant_email: "applicant@example.edu",
        responses_json: JSON.stringify(
          questions.map((question, index) => ({
            question,
            answer: answers[index] ?? "",
          }))
        ),
        status: "submitted",
      });
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
          <h1 className="text-4xl font-semibold text-[#1f1f1f]">Repository Request: Job {jobId}</h1>
          <p className="mt-2 text-base text-[#4d4d4d]">Complete all questions to submit your application.</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-5">
            {questions.map((question, index) => (
              <label key={`${question}-${index}`} className="block">
                <span className="mb-2 block text-lg font-medium text-[#2d2d2d]">{question}</span>
                <textarea
                  value={answers[index] ?? ""}
                  onChange={(e) =>
                    setAnswers((prev) => ({
                      ...prev,
                      [index]: e.target.value,
                    }))
                  }
                  className="h-24 w-full rounded border border-[#c3c3c3] px-3 py-2"
                  placeholder="Your response"
                />
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
