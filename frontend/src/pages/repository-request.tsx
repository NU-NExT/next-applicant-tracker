import { type FormEvent, useEffect, useState } from "react";

import {
  createRepositoryRequest,
  getJobListingByPositionCode,
  getMyProfile,
  getRepositoryQuestions,
  getRepositoryQuestionsByPosition,
  type RepositoryQuestion,
  type UserProfile,
  uploadResumePdf,
} from "../api";
import {
  buildApplicantName,
  buildProfileDraft,
  buildProfileSnapshot,
  COLLEGE_YEAR_OPTIONS,
  emptyProfileDraft,
  type ProfileDraft,
} from "../lib/profile-draft";
import { Header } from "../components/header";

type RepositoryRequestPageProps = {
  jobId: string;
};

type FieldProps = {
  label: string;
  children: React.ReactNode;
  hint?: string;
};

const fallbackQuestions = [
  "Tell us about your relevant experience for this role.",
  "Describe a project where you collaborated with a team under deadlines.",
  "What interests you about working with NExT Consulting?",
];

const inputClassName =
  "mt-2 w-full rounded border border-[#d0d0d0] bg-white px-3 py-2 text-sm text-[#1f1f1f] outline-none transition focus:border-[#1f6f5f]";
const readOnlyClassName =
  "mt-2 w-full rounded border border-[#d0d0d0] bg-[#f4f4f4] px-3 py-2 text-sm text-[#4b4b4b]";
const sectionClassName = "rounded-xl border border-[#d7dad8] bg-[#fcfcfb] p-5";

function Field({ label, children, hint }: FieldProps) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-[#2f3b39]">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-[#68736f]">{hint}</span> : null}
    </label>
  );
}

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
  const [profileEmail, setProfileEmail] = useState("");
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>(() => emptyProfileDraft());
  const [loadedProfile, setLoadedProfile] = useState<UserProfile | null>(null);
  const [positionTitle, setPositionTitle] = useState("");
  const [jobListingSlug, setJobListingSlug] = useState<string>("");
  const [isProfileExpanded, setIsProfileExpanded] = useState(false);
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

  useEffect(() => {
    if (isNumericJobId) {
      setPositionTitle(`Position ${numericJobId}`);
      return;
    }

    void (async () => {
      try {
        const listing = await getJobListingByPositionCode(normalizedJobId.toUpperCase());
        setPositionTitle(listing.position_title || listing.job || `Position ${normalizedJobId}`);
        setJobListingSlug(listing.slug ?? "");
      } catch {
        setPositionTitle(`Position ${normalizedJobId}`);
      }
    })();
  }, [isNumericJobId, normalizedJobId, numericJobId]);

  useEffect(() => {
    if (!accessToken) {
      setStatusMessage("Please log in before submitting.");
      return;
    }

    void (async () => {
      try {
        const profile = await getMyProfile(accessToken);
        setLoadedProfile(profile);
        setProfileEmail(profile.email);
        setProfileDraft(buildProfileDraft(profile));
        setStatusMessage("");
      } catch {
        setStatusMessage("Could not load your profile for prefill.");
      }
    })();
  }, [accessToken]);

  const updateProfileDraft = (field: keyof ProfileDraft, value: string) => {
    setProfileDraft((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!accessToken) {
      setStatusMessage("Please log in before submitting.");
      return;
    }
    if (!loadedProfile) {
      setStatusMessage("We could not prefill your profile. Reload and try again.");
      return;
    }

    setIsSubmitting(true);
    setStatusMessage("");

    try {
      await createRepositoryRequest(
        {
          job_listing_id: isNumericJobId ? numericJobId : undefined,
          job_listing_slug: isNumericJobId ? undefined : jobListingSlug || undefined,
          applicant_name: buildApplicantName(profileDraft, loadedProfile),
          applicant_email: profileEmail || loadedProfile.email,
          resume_s3_key: resumeKey || undefined,
          profile_snapshot_json: buildProfileSnapshot(loadedProfile, profileDraft),
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
        },
        accessToken
      );
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
    <div className="min-h-screen bg-[#ececec]">
      <Header />

      <main className="mx-auto max-w-[1200px] px-4 pb-8 pt-24">
        <section className="rounded-2xl border border-[#c7c7c7] bg-white p-6 shadow-[0_18px_50px_rgba(0,0,0,0.06)]">
          <div className="flex flex-col gap-3 border-b border-[#e1e3e1] pb-5">
            <div>
              <h1 className="text-3xl font-semibold text-[#1f1f1f]">{positionTitle || `Application for ${jobId}`}</h1>
              <p className="mt-1 text-sm text-[#4e5754]">
                Review your profile snapshot, upload your resume, and complete the application questions below.
              </p>
            </div>
            <div className="rounded-xl border border-[#d9dfdb] bg-[#f4f8f5] px-4 py-3 text-sm text-[#35564c]">
              Your profile data is prefilled from the information you already entered. Expand the dropdown below if you want
              to adjust the snapshot for this application before submitting.
            </div>
            {statusMessage ? (
              <div className="rounded-xl border border-[#e1c7c7] bg-[#fdf2f2] px-4 py-3 text-sm text-[#8a3c3c]">
                {statusMessage}
              </div>
            ) : null}
          </div>

          <form onSubmit={onSubmit} className="mt-6 space-y-5">
            <details
              open={isProfileExpanded}
              onToggle={(event) => setIsProfileExpanded((event.currentTarget as HTMLDetailsElement).open)}
              className="overflow-hidden rounded-xl border border-[#d7dad8] bg-[#fcfcfb]"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4">
                <div>
                  <h2 className="text-lg font-semibold text-[#1f2a28]">Profile</h2>
                  <p className="mt-1 text-sm text-[#68736f]">
                    Prefilled from your saved profile. Expand it if you want to review or adjust it for this application.
                  </p>
                </div>
                <span className="rounded-full border border-[#ccd4d0] bg-white px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] text-[#557068]">
                  {isProfileExpanded ? "Expanded" : "Collapsed"}
                </span>
              </summary>

              <div className="border-t border-[#e1e3e1] bg-[#fcfcfb] p-5">
                <div className="grid gap-5">
                  <section className={sectionClassName}>
                    <div className="mb-4">
                      <h3 className="text-base font-semibold text-[#1f2a28]">Identity</h3>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Email">
                        <input value={profileEmail} disabled className={readOnlyClassName} />
                      </Field>
                      <Field label="Preferred name">
                        <input
                          value={profileDraft.preferredName}
                          onChange={(event) => updateProfileDraft("preferredName", event.target.value)}
                          className={inputClassName}
                          placeholder="How should we address you?"
                        />
                      </Field>
                      <Field label="Full name">
                        <input
                          value={profileDraft.fullName}
                          onChange={(event) => updateProfileDraft("fullName", event.target.value)}
                          className={inputClassName}
                          placeholder="Full legal or primary name"
                        />
                      </Field>
                    </div>
                  </section>

                  <section className={sectionClassName}>
                    <div className="mb-4">
                      <h3 className="text-base font-semibold text-[#1f2a28]">Academics</h3>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Expected graduation date">
                        <input
                          type="date"
                          value={profileDraft.expectedGraduationDate}
                          onChange={(event) => updateProfileDraft("expectedGraduationDate", event.target.value)}
                          className={inputClassName}
                        />
                      </Field>
                      <Field label="Current college year">
                        <select
                          value={profileDraft.currentCollegeYear}
                          onChange={(event) => updateProfileDraft("currentCollegeYear", event.target.value)}
                          className={inputClassName}
                        >
                          <option value="">Select year</option>
                          {COLLEGE_YEAR_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Major">
                        <input
                          value={profileDraft.major}
                          onChange={(event) => updateProfileDraft("major", event.target.value)}
                          className={inputClassName}
                        />
                      </Field>
                      <Field label="Minor">
                        <input
                          value={profileDraft.minor}
                          onChange={(event) => updateProfileDraft("minor", event.target.value)}
                          className={inputClassName}
                        />
                      </Field>
                      <Field label="Concentration">
                        <input
                          value={profileDraft.concentration}
                          onChange={(event) => updateProfileDraft("concentration", event.target.value)}
                          className={inputClassName}
                        />
                      </Field>
                      <Field label="GPA">
                        <input
                          value={profileDraft.gpa}
                          onChange={(event) => updateProfileDraft("gpa", event.target.value)}
                          className={inputClassName}
                          placeholder="e.g. 3.8 or 3.80 / 4.0"
                        />
                      </Field>
                    </div>
                  </section>

                  <section className={sectionClassName}>
                    <div className="mb-4">
                      <h3 className="text-base font-semibold text-[#1f2a28]">Links and Activities</h3>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="GitHub URL">
                        <input
                          type="url"
                          value={profileDraft.githubUrl}
                          onChange={(event) => updateProfileDraft("githubUrl", event.target.value)}
                          className={inputClassName}
                        />
                      </Field>
                      <Field label="LinkedIn URL">
                        <input
                          type="url"
                          value={profileDraft.linkedinUrl}
                          onChange={(event) => updateProfileDraft("linkedinUrl", event.target.value)}
                          className={inputClassName}
                        />
                      </Field>
                      <div className="md:col-span-2">
                        <Field label="Clubs / extracurriculars">
                          <textarea
                            value={profileDraft.clubsExtracurriculars}
                            onChange={(event) => updateProfileDraft("clubsExtracurriculars", event.target.value)}
                            className={`${inputClassName} min-h-[128px] resize-y`}
                            placeholder="Student organizations, leadership, athletics, volunteer work, and other activities"
                          />
                        </Field>
                      </div>
                    </div>
                  </section>

                  <section className={sectionClassName}>
                    <div className="mb-4">
                      <h3 className="text-base font-semibold text-[#1f2a28]">Experience Summary</h3>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Paid experience count">
                        <input
                          type="number"
                          min="0"
                          value={profileDraft.paidExperienceCount}
                          onChange={(event) => updateProfileDraft("paidExperienceCount", event.target.value)}
                          className={inputClassName}
                          placeholder="0"
                        />
                      </Field>
                      <Field label="Unpaid experience count">
                        <input
                          type="number"
                          min="0"
                          value={profileDraft.unpaidExperienceCount}
                          onChange={(event) => updateProfileDraft("unpaidExperienceCount", event.target.value)}
                          className={inputClassName}
                          placeholder="0"
                        />
                      </Field>
                    </div>
                  </section>
                </div>
              </div>
            </details>

            <section className={sectionClassName}>
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-[#1f2a28]">Resume</h2>
                <p className="mt-1 text-sm text-[#68736f]">Upload the PDF version you want attached to this application.</p>
              </div>
              <label className="block">
                <span className="text-sm font-medium text-[#2f3b39]">Resume file (PDF, max 1MB)</span>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
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
                  className={inputClassName}
                />
              </label>
              {resumeStatus ? <p className="mt-3 text-sm text-[#4e5754]">{resumeStatus}</p> : null}
              {resumeUrl ? (
                <a href={resumeUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm underline">
                  View uploaded resume
                </a>
              ) : null}
            </section>

            <section className={sectionClassName}>
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-[#1f2a28]">Application questions</h2>
                <p className="mt-1 text-sm text-[#68736f]">Complete each response before submitting your application.</p>
              </div>

              <div className="space-y-5">
                {questions.map((question, index) => (
                  <label key={`${question.prompt}-${index}`} className="block">
                    <span className="text-sm font-medium text-[#2f3b39]">{question.prompt}</span>
                    {question.question_type === "dropdown" ? (
                      <>
                        <select
                          value={answers[index] ?? ""}
                          onChange={(event) =>
                            setAnswers((prev) => ({
                              ...prev,
                              [index]: event.target.value,
                            }))
                          }
                          className={inputClassName}
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
                            className={inputClassName}
                            placeholder="Enter custom value"
                            value={dropdownFallbackValues[index] ?? ""}
                            onChange={(event) =>
                              setDropdownFallbackValues((prev) => ({
                                ...prev,
                                [index]: event.target.value,
                              }))
                            }
                          />
                        ) : null}
                      </>
                    ) : (
                      <textarea
                        value={answers[index] ?? ""}
                        onChange={(event) =>
                          setAnswers((prev) => ({
                            ...prev,
                            [index]: event.target.value,
                          }))
                        }
                        maxLength={question.character_limit ?? undefined}
                        className={`${inputClassName} min-h-[128px] resize-y`}
                        placeholder="Your response"
                      />
                    )}
                  </label>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-dashed border-[#c4cdc9] bg-[#f8faf8] p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-[#1f2a28]">Ready to submit?</h2>
                  <p className="mt-1 text-sm text-[#68736f]">
                    Your edited profile snapshot, resume, and question responses will be attached to this application.
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting || (!isNumericJobId && !jobListingSlug) || !loadedProfile}
                  className="rounded bg-[#1f6f5f] px-5 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {isSubmitting ? "Submitting..." : "Submit Application"}
                </button>
              </div>
            </section>
          </form>
        </section>
      </main>
    </div>
  );
}
