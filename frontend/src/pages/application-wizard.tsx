import { useEffect, useState } from "react";

import {
  createRepositoryRequest,
  getFieldOptions,
  getJobListingByPositionCode,
  getMyFullProfile,
  getMyRepositoryRequests,
  getRepositoryQuestions,
  getRepositoryQuestionsByPosition,
  updateMyFullProfile,
  type FieldOptionRecord,
  type ProfileFull,
  type RepositoryQuestion,
} from "../api";
import { Header } from "../components/header";
import { WizardStepper } from "../components/wizard/WizardStepper";
import { StepResumeUpload } from "../components/wizard/StepResumeUpload";
import { StepProfileFields, type ProfileFormData } from "../components/wizard/StepProfileFields";
import { StepGlobalQuestions } from "../components/wizard/StepGlobalQuestions";
import { StepPositionQuestions } from "../components/wizard/StepPositionQuestions";
import { StepReviewSubmit } from "../components/wizard/StepReviewSubmit";

type ApplicationWizardPageProps = {
  positionCode?: string;
  jobId?: string;
};

/** Map of global prompts (lowercase) to profile field names for building responses_json */
const GLOBAL_PROMPT_MAP: Record<string, keyof ProfileFormData> = {
  "full legal name": "full_legal_name",
  "preferred name (optional)": "first_name",
  "northeastern email": "email",
  "expected graduation date": "expected_graduation_date",
  "current year / grade level": "current_year",
  "co-op number (1st, 2nd, 3rd, etc.)": "coop_number",
  "major(s) - selected from a maintained dropdown list": "major",
  "minor(s) - selected from a maintained dropdown list (optional)": "minor",
  "concentration - selected from a maintained dropdown list (optional)": "concentration",
  "college / school within northeastern": "college",
  "gpa (optional)": "gpa",
  "github url (optional)": "github_url",
  "linkedin url (optional)": "linkedin_url",
  "clubs and extracurricular activities (list)": "club",
  "count of paid work experiences since high school graduation": "past_experience_count",
  "count of unpaid/volunteer experiences since high school graduation": "unique_experience_count",
};

function profileToFormData(p: ProfileFull): ProfileFormData {
  return {
    full_legal_name: p.full_legal_name ?? "",
    first_name: p.first_name ?? "",
    last_name: p.last_name ?? "",
    email: p.email ?? "",
    expected_graduation_date: p.expected_graduation_date ?? "",
    current_year: p.current_year ?? "",
    coop_number: p.coop_number ?? "",
    major: p.major ?? "",
    minor: p.minor ?? "",
    concentration: p.concentration ?? "",
    college: p.college ?? "",
    gpa: p.gpa ?? "",
    github_url: p.github_url ?? "",
    linkedin_url: p.linkedin_url ?? "",
    personal_website_url: p.personal_website_url ?? "",
    club: p.club ?? "",
    past_experience_count: p.past_experience_count,
    unique_experience_count: p.unique_experience_count,
  };
}

export function ApplicationWizardPage({ positionCode, jobId }: ApplicationWizardPageProps) {
  const accessToken = localStorage.getItem("auth_access_token") ?? "";
  const identifier = positionCode ?? jobId ?? "";
  const numericId = Number(identifier);
  const isNumeric = Number.isFinite(numericId) && numericId > 0;

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Resume state (step 1)
  const [resumeS3Key, setResumeS3Key] = useState("");
  const [resumeViewUrl, setResumeViewUrl] = useState("");

  // Profile state (step 2)
  const [profileData, setProfileData] = useState<ProfileFormData>({
    full_legal_name: "", first_name: "", last_name: "", email: "",
    expected_graduation_date: "", current_year: "", coop_number: "",
    major: "", minor: "", concentration: "", college: "", gpa: "",
    github_url: "", linkedin_url: "", personal_website_url: "", club: "",
    past_experience_count: null, unique_experience_count: null,
  });

  // Field options for dropdowns
  const [fieldOptions, setFieldOptions] = useState<{
    major: FieldOptionRecord[];
    minor: FieldOptionRecord[];
    concentration: FieldOptionRecord[];
  }>({ major: [], minor: [], concentration: [] });

  // Global questions (step 3) — is_global === true
  const [globalQuestions, setGlobalQuestions] = useState<RepositoryQuestion[]>([]);
  const [globalAnswers, setGlobalAnswers] = useState<Record<number, string>>({});
  const [globalDropdownFallbacks, setGlobalDropdownFallbacks] = useState<Record<number, string>>({});

  // Position questions (step 4) — non-global only
  const [positionQuestions, setPositionQuestions] = useState<RepositoryQuestion[]>([]);
  const [allQuestions, setAllQuestions] = useState<RepositoryQuestion[]>([]);
  const [positionAnswers, setPositionAnswers] = useState<Record<number, string>>({});
  const [dropdownFallbacks, setDropdownFallbacks] = useState<Record<number, string>>({});

  // Duplicate check
  const [alreadyApplied, setAlreadyApplied] = useState(false);

  // Resolved job listing id for submission
  const [resolvedJobListingId, setResolvedJobListingId] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!accessToken) {
      setError("Please log in to apply.");
      setLoading(false);
      return;
    }
    void (async () => {
      // Fetch field options independently — they shouldn't fail with other requests
      const optionsPromise = Promise.all([
        getFieldOptions("major").catch(() => [] as FieldOptionRecord[]),
        getFieldOptions("minor").catch(() => [] as FieldOptionRecord[]),
        getFieldOptions("concentration").catch(() => [] as FieldOptionRecord[]),
      ]);

      try {
        const profilePromise = getMyFullProfile(accessToken);
        const questionsPromise = isNumeric
          ? getRepositoryQuestions(numericId)
          : getRepositoryQuestionsByPosition(identifier.toUpperCase());
        const myAppsPromise = getMyRepositoryRequests(accessToken);
        // Job listing lookup can 404 if position code doesn't exist yet — don't let it fail the whole fetch
        const jobListingPromise = isNumeric
          ? Promise.resolve(null)
          : getJobListingByPositionCode(identifier.toUpperCase()).catch(() => null);

        const [profile, questions, myApps, jobListing] = await Promise.all([
          profilePromise, questionsPromise, myAppsPromise, jobListingPromise,
        ]);

        const [majors, minors, concentrations] = await optionsPromise;

        setProfileData(profileToFormData(profile));
        setFieldOptions({ major: majors, minor: minors, concentration: concentrations });

        setAllQuestions(questions);
        const globals = questions.filter((q) => q.is_global);
        setGlobalQuestions(globals);
        // Pre-fill global answers from profile data where possible
        const prefilled: Record<number, string> = {};
        globals.forEach((q, i) => {
          const fieldKey = GLOBAL_PROMPT_MAP[q.prompt.toLowerCase()];
          if (fieldKey) {
            prefilled[i] = String(profileToFormData(profile)[fieldKey] ?? "");
          }
        });
        setGlobalAnswers(prefilled);
        setPositionQuestions(questions.filter((q) => !q.is_global));

        // Resolve the job listing ID for submission
        const listingId = isNumeric
          ? numericId
          : (jobListing?.listing_id as number | undefined);
        setResolvedJobListingId(listingId);

        if (listingId) {
          setAlreadyApplied(myApps.some((a) => a.job_listing_id === listingId));
        }
      } catch {
        // Still try to populate field options even if other fetches fail
        const [majors, minors, concentrations] = await optionsPromise;
        setFieldOptions({ major: majors, minor: minors, concentration: concentrations });
        setError("Failed to load application data. Please try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, [accessToken, identifier, isNumeric, numericId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#efefef]">
        <Header />
        <main className="mx-auto max-w-[1100px] px-4 pb-8 pt-24">
          <p className="text-[#666]">Loading application...</p>
        </main>
      </div>
    );
  }

  if (!accessToken) {
    return (
      <div className="min-h-screen bg-[#efefef]">
        <Header />
        <main className="mx-auto max-w-[1100px] px-4 pb-8 pt-24">
          <section className="rounded-md border border-[#c7c7c7] bg-white p-6">
            <p className="text-[#444]">Please <a href="/login" className="underline">log in</a> to apply.</p>
          </section>
        </main>
      </div>
    );
  }

  if (alreadyApplied) {
    return (
      <div className="min-h-screen bg-[#efefef]">
        <Header />
        <main className="mx-auto max-w-[1100px] px-4 pb-8 pt-24">
          <section className="rounded-md border border-[#c7c7c7] bg-white p-6">
            <h1 className="text-2xl font-semibold text-[#1f1f1f]">Already Applied</h1>
            <p className="mt-2 text-[#444]">
              You have already submitted an application for this position.{" "}
              <a href="/applicant-dashboard" className="underline">Go to dashboard</a>
            </p>
          </section>
        </main>
      </div>
    );
  }

  const handleSubmit = async () => {
    // Build responses_json: global answers from step 3 + position answers from step 4
    const globalResponses = globalQuestions.map((q, i) => {
      const raw = globalAnswers[i] ?? "";
      const answer =
        q.question_type === "dropdown" && raw === "__other__"
          ? globalDropdownFallbacks[i] ?? ""
          : raw;
      return {
        question: q.prompt,
        question_type: q.question_type ?? "free_text",
        is_global: true,
        answer,
      };
    });

    const positionResponses = positionQuestions.map((q, i) => {
      const raw = positionAnswers[i] ?? "";
      const answer =
        q.question_type === "dropdown" && raw === "__other__"
          ? dropdownFallbacks[i] ?? ""
          : raw;
      return {
        question: q.prompt,
        question_type: q.question_type ?? "free_text",
        is_global: false,
        answer,
      };
    });

    await createRepositoryRequest(
      {
        job_listing_id: resolvedJobListingId,
        applicant_name: `${profileData.first_name} ${profileData.last_name}`.trim() || profileData.full_legal_name,
        applicant_email: profileData.email,
        resume_s3_key: resumeS3Key || undefined,
        responses_json: JSON.stringify([...globalResponses, ...positionResponses]),
        status: "applied",
      },
      accessToken
    );
  };

  return (
    <div className="min-h-screen bg-[#efefef]">
      <Header />

      <main className="mx-auto max-w-[1100px] px-4 pb-8 pt-24">
        <section className="rounded-md border border-[#c7c7c7] bg-white p-6">
          <h1 className="mb-1 text-3xl font-semibold text-[#1f1f1f]">Apply: Position {identifier}</h1>
          <p className="mb-6 text-sm text-[#4d4d4d]">Complete all steps to submit your application.</p>

          <div className="mb-8">
            <WizardStepper currentStep={step} />
          </div>

          {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

          {step === 0 && (
            <StepResumeUpload
              resumeS3Key={resumeS3Key}
              resumeViewUrl={resumeViewUrl}
              accessToken={accessToken}
              onUploaded={(key, url) => {
                setResumeS3Key(key);
                setResumeViewUrl(url);
              }}
              onNext={() => setStep(1)}
            />
          )}

          {step === 1 && (
            <StepProfileFields
              data={profileData}
              fieldOptions={fieldOptions}
              onChange={(updates) => setProfileData((prev) => ({ ...prev, ...updates }))}
              onSaveAndNext={async (payload) => {
                await updateMyFullProfile(accessToken, payload);
                setStep(2);
              }}
              onBack={() => setStep(0)}
            />
          )}

          {step === 2 && (
            <StepGlobalQuestions
              questions={globalQuestions}
              answers={globalAnswers}
              dropdownFallbacks={globalDropdownFallbacks}
              onAnswerChange={(i, v) => setGlobalAnswers((prev) => ({ ...prev, [i]: v }))}
              onFallbackChange={(i, v) => setGlobalDropdownFallbacks((prev) => ({ ...prev, [i]: v }))}
              onNext={() => setStep(3)}
              onBack={() => setStep(1)}
            />
          )}

          {step === 3 && (
            <StepPositionQuestions
              questions={positionQuestions}
              answers={positionAnswers}
              dropdownFallbacks={dropdownFallbacks}
              onAnswerChange={(i, v) => setPositionAnswers((prev) => ({ ...prev, [i]: v }))}
              onFallbackChange={(i, v) => setDropdownFallbacks((prev) => ({ ...prev, [i]: v }))}
              onNext={() => setStep(4)}
              onBack={() => setStep(2)}
            />
          )}

          {step === 4 && (
            <StepReviewSubmit
              positionLabel={identifier}
              resumeViewUrl={resumeViewUrl}
              profile={profileData}
              globalQuestions={globalQuestions}
              globalAnswers={globalAnswers}
              globalDropdownFallbacks={globalDropdownFallbacks}
              questions={positionQuestions}
              answers={positionAnswers}
              dropdownFallbacks={dropdownFallbacks}
              onSubmit={handleSubmit}
              onBack={() => setStep(3)}
            />
          )}
        </section>
      </main>
    </div>
  );
}
