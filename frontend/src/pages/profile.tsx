import { type FormEvent, useEffect, useRef, useState } from "react";

import { getMyProfile, updateMyProfile } from "../api";
import { Header } from "../components/header";

type ProfileFormState = {
  fullLegalName: string;
  preferredName: string;
  pronouns: string;
  expectedGraduationDate: string;
  currentYear: string;
  major: string;
  minor: string;
  concentration: string;
  gpa: string;
  githubUrl: string;
  linkedinUrl: string;
  clubs: string[];
  paidExperienceCount: string;
  unpaidExperienceCount: string;
  otherRelevantInformation: string;
};

const EMPTY_PROFILE_FORM: ProfileFormState = {
  fullLegalName: "",
  preferredName: "",
  pronouns: "",
  expectedGraduationDate: "",
  currentYear: "",
  major: "",
  minor: "",
  concentration: "",
  gpa: "",
  githubUrl: "",
  linkedinUrl: "",
  clubs: [],
  paidExperienceCount: "0",
  unpaidExperienceCount: "0",
  otherRelevantInformation: "",
};

const GLOBAL_PROFILE_PROMPTS = {
  fullLegalName: "Full legal name",
  preferredName: "Preferred name (optional)",
  pronouns: "Pronouns",
  northeasternEmail: "Northeastern email",
  expectedGraduationDate: "Expected graduation date",
  currentYear: "Current year / grade level",
  coopNumber: "Co-op number (1st, 2nd, 3rd, etc.)",
  major: "Major(s) - selected from a maintained dropdown list",
  minor: "Minor(s) - selected from a maintained dropdown list (optional)",
  concentration: "Concentration - selected from a maintained dropdown list (optional)",
  gpa: "GPA (optional)",
  githubUrl: "GitHub URL (optional)",
  linkedinUrl: "LinkedIn URL (optional)",
  clubs: "Clubs and extracurricular activities (list)",
  paidExperienceCount: "Count of paid work experiences since high school graduation",
  unpaidExperienceCount: "Count of unpaid/volunteer experiences since high school graduation",
  otherRelevantInformation: "Any other information that would be relevant",
  resumeUpload: "Resume upload (PDF or DOCX, max 10MB)",
} as const;

const CURRENT_YEAR_OPTIONS = ["Freshman", "Sophomore", "Junior", "Senior", "5th Year+", "Graduate Student"] as const;

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function readString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string") {
      return value;
    }
    if (typeof value === "number") {
      return String(value);
    }
  }
  return "";
}

function readStringList(...values: unknown[]): string[] {
  for (const value of values) {
    if (Array.isArray(value)) {
      const clubs = value.filter((entry): entry is string => typeof entry === "string").map((entry) => entry.trim()).filter(Boolean);
      if (clubs.length > 0) {
        return clubs;
      }
    }
    if (typeof value === "string") {
      const clubs = value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
      if (clubs.length > 0) {
        return clubs;
      }
    }
  }
  return [];
}

function parseOptionalNumber(value: string, fieldLabel: string, allowFloat = false): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = allowFloat ? Number(trimmed) : Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${fieldLabel} must be a valid number.`);
  }
  return parsed;
}

export function ProfilePage() {
  const token = localStorage.getItem("auth_access_token") ?? "";
  const [email, setEmail] = useState("");
  const [profileForm, setProfileForm] = useState<ProfileFormState>(EMPTY_PROFILE_FORM);
  const [statusMessage, setStatusMessage] = useState("");
  const clubInputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (!token) return;
    void (async () => {
      try {
        const profile = await getMyProfile(token);
        const metadata = asRecord(profile.user_metadata);
        const candidateProfile = asRecord(metadata.candidate_profile);
        const globalProfile = asRecord(metadata.global_profile);

        setEmail(profile.email);
        setProfileForm({
          fullLegalName: readString(candidateProfile.full_legal_name, globalProfile[GLOBAL_PROFILE_PROMPTS.fullLegalName]),
          preferredName: readString(
            candidateProfile.preferred_name,
            globalProfile[GLOBAL_PROFILE_PROMPTS.preferredName],
            profile.first_name
          ),
          pronouns: readString(candidateProfile.pronouns, globalProfile[GLOBAL_PROFILE_PROMPTS.pronouns]),
          expectedGraduationDate: readString(
            candidateProfile.expected_graduation_date,
            globalProfile[GLOBAL_PROFILE_PROMPTS.expectedGraduationDate]
          ),
          currentYear: readString(candidateProfile.current_year, globalProfile[GLOBAL_PROFILE_PROMPTS.currentYear]),
          major: readString(candidateProfile.major, globalProfile[GLOBAL_PROFILE_PROMPTS.major]),
          minor: readString(candidateProfile.minor, globalProfile[GLOBAL_PROFILE_PROMPTS.minor]),
          concentration: readString(candidateProfile.concentration, globalProfile[GLOBAL_PROFILE_PROMPTS.concentration]),
          gpa: readString(candidateProfile.gpa, globalProfile[GLOBAL_PROFILE_PROMPTS.gpa]),
          githubUrl: readString(candidateProfile.github_url, globalProfile[GLOBAL_PROFILE_PROMPTS.githubUrl]),
          linkedinUrl: readString(candidateProfile.linkedin_url, globalProfile[GLOBAL_PROFILE_PROMPTS.linkedinUrl]),
          clubs: readStringList(candidateProfile.clubs, globalProfile[GLOBAL_PROFILE_PROMPTS.clubs]),
          paidExperienceCount:
            readString(candidateProfile.paid_experience_count, globalProfile[GLOBAL_PROFILE_PROMPTS.paidExperienceCount]) || "0",
          unpaidExperienceCount:
            readString(candidateProfile.unpaid_experience_count, globalProfile[GLOBAL_PROFILE_PROMPTS.unpaidExperienceCount]) || "0",
          otherRelevantInformation: readString(
            candidateProfile.other_relevant_information,
            globalProfile[GLOBAL_PROFILE_PROMPTS.otherRelevantInformation]
          ),
        });
        setStatusMessage("");
      } catch {
        setStatusMessage("Could not load profile.");
      }
    })();
  }, [token]);

  const updateField = <Key extends keyof ProfileFormState>(key: Key, value: ProfileFormState[Key]) => {
    setProfileForm((current) => ({ ...current, [key]: value }));
  };

  const updateClub = (index: number, value: string) => {
    setProfileForm((current) => ({
      ...current,
      clubs: current.clubs.map((club, clubIndex) => (clubIndex === index ? value : club)),
    }));
  };

  const addClub = () => {
    setProfileForm((current) => ({ ...current, clubs: [...current.clubs, ""] }));
  };

  const insertClubAfter = (index: number) => {
    setProfileForm((current) => ({
      ...current,
      clubs: [...current.clubs.slice(0, index + 1), "", ...current.clubs.slice(index + 1)],
    }));
    requestAnimationFrame(() => {
      clubInputRefs.current[index + 1]?.focus();
    });
  };

  const removeClub = (index: number) => {
    setProfileForm((current) => ({
      ...current,
      clubs: current.clubs.filter((_, clubIndex) => clubIndex !== index),
    }));
  };

  const onSave = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) {
      setStatusMessage("Please sign in first.");
      return;
    }

    try {
      const fullLegalName = profileForm.fullLegalName.trim();
      const preferredName = profileForm.preferredName.trim();
      const pronouns = profileForm.pronouns.trim();
      const expectedGraduationDate = profileForm.expectedGraduationDate.trim();
      const currentYear = profileForm.currentYear.trim();
      const major = profileForm.major.trim();
      const minor = profileForm.minor.trim();
      const concentration = profileForm.concentration.trim();
      const githubUrl = profileForm.githubUrl.trim();
      const linkedinUrl = profileForm.linkedinUrl.trim();
      const clubs = profileForm.clubs.map((club) => club.trim()).filter(Boolean);
      const paidExperienceCount = parseOptionalNumber(profileForm.paidExperienceCount, "Paid experience count");
      const unpaidExperienceCount = parseOptionalNumber(profileForm.unpaidExperienceCount, "Unpaid experience count");
      const gpa = parseOptionalNumber(profileForm.gpa, "GPA", true);
      const otherRelevantInformation = profileForm.otherRelevantInformation.trim();

      if (!fullLegalName || !expectedGraduationDate || !currentYear || !major || gpa === null || paidExperienceCount === null || unpaidExperienceCount === null) {
        throw new Error("Fill in all required fields before saving.");
      }

      const normalizedProfile = {
        full_legal_name: fullLegalName,
        preferred_name: preferredName,
        pronouns,
        expected_graduation_date: expectedGraduationDate,
        current_year: currentYear,
        coop_number: null,
        major,
        minor,
        concentration,
        gpa,
        github_url: githubUrl,
        linkedin_url: linkedinUrl,
        clubs,
        paid_experience_count: paidExperienceCount,
        unpaid_experience_count: unpaidExperienceCount,
        other_relevant_information: otherRelevantInformation,
        resume_s3_key: "",
      };

      const globalProfile = {
        [GLOBAL_PROFILE_PROMPTS.fullLegalName]: normalizedProfile.full_legal_name,
        [GLOBAL_PROFILE_PROMPTS.preferredName]: normalizedProfile.preferred_name,
        [GLOBAL_PROFILE_PROMPTS.pronouns]: normalizedProfile.pronouns,
        [GLOBAL_PROFILE_PROMPTS.northeasternEmail]: email,
        [GLOBAL_PROFILE_PROMPTS.expectedGraduationDate]: expectedGraduationDate,
        [GLOBAL_PROFILE_PROMPTS.currentYear]: normalizedProfile.current_year,
        [GLOBAL_PROFILE_PROMPTS.coopNumber]: "",
        [GLOBAL_PROFILE_PROMPTS.major]: normalizedProfile.major,
        [GLOBAL_PROFILE_PROMPTS.minor]: normalizedProfile.minor,
        [GLOBAL_PROFILE_PROMPTS.concentration]: normalizedProfile.concentration,
        [GLOBAL_PROFILE_PROMPTS.gpa]: profileForm.gpa.trim(),
        [GLOBAL_PROFILE_PROMPTS.githubUrl]: normalizedProfile.github_url,
        [GLOBAL_PROFILE_PROMPTS.linkedinUrl]: normalizedProfile.linkedin_url,
        [GLOBAL_PROFILE_PROMPTS.clubs]: clubs.join(", "),
        [GLOBAL_PROFILE_PROMPTS.paidExperienceCount]: paidExperienceCount === null ? "" : String(paidExperienceCount),
        [GLOBAL_PROFILE_PROMPTS.unpaidExperienceCount]: unpaidExperienceCount === null ? "" : String(unpaidExperienceCount),
        [GLOBAL_PROFILE_PROMPTS.otherRelevantInformation]: otherRelevantInformation,
        [GLOBAL_PROFILE_PROMPTS.resumeUpload]: "",
      };

      await updateMyProfile(token, {
        user_metadata: {
          candidate_profile: normalizedProfile,
          global_profile: globalProfile,
        },
      });
      setProfileForm((current) => ({ ...current, clubs }));
      setStatusMessage("Profile updated. Existing submissions remain unchanged snapshots.");
    } catch (error) {
      if (error instanceof Error && error.message) {
        setStatusMessage(error.message);
        return;
      }
      setStatusMessage("Could not update profile.");
    }
  };

  return (
    <div className="min-h-screen bg-[#ececec]">
      <Header />
      <main className="mx-auto max-w-[1200px] px-4 pb-8 pt-24">
        <section className="rounded border border-[#c7c7c7] bg-white p-5">
          <h1 className="text-3xl font-semibold text-[#1f1f1f]">My Profile</h1>
          <p className="mt-1 text-sm text-[#444]">Profile updates apply to future applications only.</p>

          <form
            onSubmit={onSave}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !(e.target instanceof HTMLTextAreaElement)) {
                e.preventDefault();
              }
            }}
            className="mt-6 space-y-6"
          >
            <div className="space-y-4">
              <h2 className="border-b border-[#d8d8d8] pb-2 text-lg font-semibold text-[#1f1f1f]">About Me</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="block max-w-md text-sm">
                  Full legal name *
                  <input
                    value={profileForm.fullLegalName}
                    onChange={(e) => updateField("fullLegalName", e.target.value)}
                    className="mt-1 w-full rounded border border-[#d0d0d0] px-3 py-2"
                    required
                  />
                </label>

                <label className="block max-w-md text-sm">
                  Preferred name
                  <input
                    value={profileForm.preferredName}
                    onChange={(e) => updateField("preferredName", e.target.value)}
                    className="mt-1 w-full rounded border border-[#d0d0d0] px-3 py-2"
                  />
                </label>

                <label className="block max-w-md text-sm">
                  Pronouns
                  <input
                    value={profileForm.pronouns}
                    onChange={(e) => updateField("pronouns", e.target.value)}
                    className="mt-1 w-full rounded border border-[#d0d0d0] px-3 py-2"
                    placeholder="e.g. she/her"
                  />
                </label>

                <label className="block max-w-md text-sm">
                  Northeastern email
                  <input value={email} disabled className="mt-1 w-full rounded border border-[#d0d0d0] bg-[#f4f4f4] px-3 py-2" />
                </label>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="border-b border-[#d8d8d8] pb-2 text-lg font-semibold text-[#1f1f1f]">Academics</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="block max-w-md text-sm">
                  Expected graduation date *
                  <input
                    value={profileForm.expectedGraduationDate}
                    onChange={(e) => updateField("expectedGraduationDate", e.target.value)}
                    className="mt-1 w-full rounded border border-[#d0d0d0] px-3 py-2"
                    placeholder="May 2026"
                    required
                  />
                </label>

                <label className="block max-w-md text-sm">
                  Current year *
                  <select
                    value={profileForm.currentYear}
                    onChange={(e) => updateField("currentYear", e.target.value)}
                    className="mt-1 w-full rounded border border-[#d0d0d0] px-3 py-2"
                    required
                  >
                    <option value="">Select current year</option>
                    {CURRENT_YEAR_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block max-w-md text-sm">
                  Major *
                  <input
                    value={profileForm.major}
                    onChange={(e) => updateField("major", e.target.value)}
                    className="mt-1 w-full rounded border border-[#d0d0d0] px-3 py-2"
                    required
                  />
                </label>

                <label className="block max-w-md text-sm">
                  Minor
                  <input
                    value={profileForm.minor}
                    onChange={(e) => updateField("minor", e.target.value)}
                    className="mt-1 w-full rounded border border-[#d0d0d0] px-3 py-2"
                  />
                </label>

                <label className="block max-w-md text-sm">
                  Concentration
                  <input
                    value={profileForm.concentration}
                    onChange={(e) => updateField("concentration", e.target.value)}
                    className="mt-1 w-full rounded border border-[#d0d0d0] px-3 py-2"
                  />
                </label>

                <label className="block max-w-md text-sm">
                  GPA *
                  <input
                    type="number"
                    min="0"
                    max="4.0"
                    step="0.01"
                    value={profileForm.gpa}
                    onChange={(e) => updateField("gpa", e.target.value)}
                    className="mt-1 w-full rounded border border-[#d0d0d0] px-3 py-2"
                    required
                  />
                </label>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="border-b border-[#d8d8d8] pb-2 text-lg font-semibold text-[#1f1f1f]">Experience</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

                <label className="block max-w-md text-sm">
                  <span className="flex items-center gap-2">
                    <span>Paid co-op/internship count *</span>
                    <span className="group relative inline-flex h-4 w-4 items-center justify-center rounded-full border border-[#b8b8b8] text-[10px] text-[#555]">
                      ?
                      <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 hidden w-56 -translate-x-1/2 rounded border border-[#d0d0d0] bg-white px-2 py-1 text-xs text-[#333] shadow-sm group-hover:block">
                        Paid co-ops/interships you have completed related to your major
                      </span>
                    </span>
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={profileForm.paidExperienceCount}
                    onChange={(e) => updateField("paidExperienceCount", e.target.value)}
                    className="mt-1 w-full rounded border border-[#d0d0d0] px-3 py-2"
                    required
                  />
                </label>

                <label className="block max-w-md text-sm">
                  Unpaid co-op/internship count *
                  <input
                    type="number"
                    min="0"
                    value={profileForm.unpaidExperienceCount}
                    onChange={(e) => updateField("unpaidExperienceCount", e.target.value)}
                    className="mt-1 w-full rounded border border-[#d0d0d0] px-3 py-2"
                    required
                  />
                </label>

                <label className="block max-w-md text-sm">
                  GitHub URL
                  <input
                    type="url"
                    value={profileForm.githubUrl}
                    onChange={(e) => updateField("githubUrl", e.target.value)}
                    className="mt-1 w-full rounded border border-[#d0d0d0] px-3 py-2"
                  />
                </label>

                <label className="block max-w-md text-sm">
                  LinkedIn URL
                  <input
                    type="url"
                    value={profileForm.linkedinUrl}
                    onChange={(e) => updateField("linkedinUrl", e.target.value)}
                    className="mt-1 w-full rounded border border-[#d0d0d0] px-3 py-2"
                  />
                </label>
              </div>
            </div>

            <div className="max-w-3xl text-sm">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                <div>
                  <p className="font-medium text-[#1f1f1f]">Clubs and extracurricular activities</p>
                  <p className="text-xs text-[#666]">Add one club per row.</p>
                </div>
                <button
                  type="button"
                  onClick={addClub}
                  className="rounded border border-[#b8b8b8] px-3 py-1.5 text-xs text-[#1f1f1f]"
                >
                  Add club
                </button>
              </div>

              <div className="mt-3 space-y-2">
                {profileForm.clubs.length === 0 ? (
                  <p className="rounded border border-dashed border-[#d0d0d0] px-3 py-3 text-sm text-[#666]">No clubs added yet.</p>
                ) : null}

                {profileForm.clubs.map((club, index) => (
                  <div key={`club-${index}`} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <input
                      ref={(element) => {
                        clubInputRefs.current[index] = element;
                      }}
                      value={club}
                      onChange={(e) => updateClub(index, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          insertClubAfter(index);
                        }
                      }}
                      className="w-full rounded border border-[#d0d0d0] px-3 py-2"
                      placeholder="Club or extracurricular"
                    />
                    <button
                      type="button"
                      onClick={() => removeClub(index)}
                      className="rounded border border-[#b8b8b8] px-3 py-2 text-xs text-[#7a1d1d]"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <label className="block max-w-3xl text-sm">
              <p className="font-medium text-[#1f1f1f]">Additional information</p>
              <textarea
                value={profileForm.otherRelevantInformation}
                onChange={(e) => updateField("otherRelevantInformation", e.target.value)}
                className="mt-1 h-28 w-full rounded border border-[#d0d0d0] px-3 py-2 [font-family:inherit]"
                placeholder="Anything else you'd like reviewers to know (e.g. portfolio, personal website, notable distinctions)"
              />
            </label>

            <div className="flex items-center gap-3">
              <button type="submit" className="rounded bg-[#1f6f5f] px-4 py-2 text-sm text-white">
                Save Profile
              </button>
              {statusMessage ? <p className="text-sm text-[#333]">{statusMessage}</p> : null}
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
