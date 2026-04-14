import { useEffect, useState } from "react";

import {
  createRepositoryRequest,
  getJobListingByPositionCode,
  getMyFullProfile,
  getMyRepositoryRequests,
  getRepositoryQuestions,
  getRepositoryQuestionsByPosition,
  updateMyFullProfile,
  type RepositoryQuestion,
} from "../api";
import { Header } from "../components/header";
import {
  EMPTY_PROFILE_FORM,
  joinClubList,
  profileFullToProfileForm,
  type ProfileFormData,
} from "../components/profile/profileFormModel";
import { StepGlobalQuestions } from "../components/wizard/StepGlobalQuestions";
import { StepPositionQuestions } from "../components/wizard/StepPositionQuestions";
import { StepProfileFields } from "../components/wizard/StepProfileFields";
import { StepResumeUpload } from "../components/wizard/StepResumeUpload";
import { StepReviewSubmit } from "../components/wizard/StepReviewSubmit";
import { WizardStepper } from "../components/wizard/WizardStepper";

type ApplicationWizardPageProps = {
  positionCode?: string;
  jobId?: string;
};

type GlobalAnswerContext = {
  coopNumber: string;
  college: string;
};

function resolveGlobalAnswer(prompt: string, profile: ProfileFormData, context: GlobalAnswerContext): string {
  switch (prompt.toLowerCase()) {
    case "full legal name":
      return profile.fullLegalName;
    case "preferred name (optional)":
      return profile.preferredName;
    case "pronouns":
      return profile.pronouns;
    case "northeastern email":
      return profile.email;
    case "expected graduation date":
      return profile.expectedGraduationDate;
    case "current year / grade level":
      return profile.currentYear;
    case "co-op number (1st, 2nd, 3rd, etc.)":
      return context.coopNumber;
    case "major(s) - selected from a maintained dropdown list":
      return profile.major;
    case "minor(s) - selected from a maintained dropdown list (optional)":
      return profile.minor;
    case "concentration - selected from a maintained dropdown list (optional)":
      return profile.concentration;
    case "college / school within northeastern":
      return context.college;
    case "gpa (optional)":
      return profile.gpa;
    case "github url (optional)":
      return profile.githubUrl;
    case "linkedin url (optional)":
      return profile.linkedinUrl;
    case "clubs and extracurricular activities (list)":
      return joinClubList(profile.clubs);
    case "count of paid work experiences since high school graduation":
      return profile.paidExperienceCount;
    case "count of unpaid/volunteer experiences since high school graduation":
      return profile.unpaidExperienceCount;
    case "any other information that would be relevant":
      return profile.otherRelevantInformation;
    default:
      return "";
  }
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
  const [profileData, setProfileData] = useState<ProfileFormData>(EMPTY_PROFILE_FORM);

  // Global questions (step 3) — is_global === true
  const [globalQuestions, setGlobalQuestions] = useState<RepositoryQuestion[]>([]);
  const [globalAnswers, setGlobalAnswers] = useState<Record<number, string>>({});
  const [globalDropdownFallbacks, setGlobalDropdownFallbacks] = useState<Record<number, string>>({});

  // Position questions (step 4) — non-global only
  const [positionQuestions, setPositionQuestions] = useState<RepositoryQuestion[]>([]);
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
          profilePromise,
          questionsPromise,
          myAppsPromise,
          jobListingPromise,
        ]);

        const profileForm = profileFullToProfileForm(profile);
        const globalContext: GlobalAnswerContext = {
          coopNumber: profile.coop_number ?? "",
          college: profile.college ?? "",
        };
        setProfileData(profileForm);

        const globals = questions.filter((q) => q.is_global);
        setGlobalQuestions(globals);
        // Pre-fill global answers from profile where possible.
        const prefilled: Record<number, string> = {};
        globals.forEach((q, i) => {
          prefilled[i] = resolveGlobalAnswer(q.prompt, profileForm, globalContext);
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
        applicant_name: profileData.preferredName.trim() || profileData.fullLegalName,
        applicant_email: profileData.email,
        resume_s3_key: resumeS3Key || undefined,
        responses_json: JSON.stringify([...globalResponses, ...positionResponses]),
        status: "applied",
      },
      accessToken,
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
              onChange={(updates) => setProfileData((prev) => ({ ...prev, ...updates }))}
              onSaveAndNext={async (payload, normalizedClubs) => {
                await updateMyFullProfile(accessToken, payload);
                setProfileData((prev) => ({ ...prev, clubs: normalizedClubs }));
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
              jobListingId={resolvedJobListingId}
              accessToken={accessToken}
            />
          )}
        </section>
      </main>
    </div>
  );
}
