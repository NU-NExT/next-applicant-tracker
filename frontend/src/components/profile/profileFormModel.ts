import type { ProfileFull, ProfileFullUpdatePayload } from "../../api";

export type ProfileFormData = {
  fullLegalName: string;
  preferredName: string;
  pronouns: string;
  email: string;
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

export const EMPTY_PROFILE_FORM: ProfileFormData = {
  fullLegalName: "",
  preferredName: "",
  pronouns: "",
  email: "",
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

export const CURRENT_YEAR_OPTIONS = [
  "Freshman",
  "Sophomore",
  "Junior",
  "Senior",
  "5th Year+",
  "Graduate Student",
] as const;

function readString(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number") {
    return String(value);
  }
  return "";
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readStringWithFallback(...values: unknown[]): string {
  for (const value of values) {
    const parsed = readString(value);
    if (parsed) {
      return parsed;
    }
  }
  return "";
}

export function parseClubList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/\r?\n|,/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [];
}

export function joinClubList(clubs: string[]): string {
  return clubs
    .map((club) => club.trim())
    .filter(Boolean)
    .join(", ");
}

export function parseOptionalNumber(value: string, fieldLabel: string, allowFloat = false): number | null {
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

export function profileFullToProfileForm(profile: ProfileFull): ProfileFormData {
  const metadata = asRecord(profile.user_metadata);
  const candidateProfile = asRecord(metadata.candidate_profile);
  const globalProfile = asRecord(metadata.global_profile);

  const clubs =
    parseClubList(profile.club).length > 0
      ? parseClubList(profile.club)
      : parseClubList(candidateProfile.clubs).length > 0
        ? parseClubList(candidateProfile.clubs)
        : parseClubList(globalProfile["Clubs and extracurricular activities (list)"]);

  return {
    fullLegalName: readStringWithFallback(
      profile.full_legal_name,
      candidateProfile.full_legal_name,
      globalProfile["Full legal name"],
    ),
    preferredName: readStringWithFallback(profile.first_name, candidateProfile.preferred_name),
    pronouns: readStringWithFallback(profile.pronouns, candidateProfile.pronouns, globalProfile.Pronouns),
    email: readString(profile.email),
    expectedGraduationDate: readStringWithFallback(
      profile.expected_graduation_date,
      candidateProfile.expected_graduation_date,
      globalProfile["Expected graduation date"],
    ),
    currentYear: readStringWithFallback(
      profile.current_year,
      candidateProfile.current_year,
      globalProfile["Current year / grade level"],
    ),
    major: readStringWithFallback(
      profile.major,
      candidateProfile.major,
      globalProfile["Major(s) - selected from a maintained dropdown list"],
    ),
    minor: readStringWithFallback(
      profile.minor,
      candidateProfile.minor,
      globalProfile["Minor(s) - selected from a maintained dropdown list (optional)"],
    ),
    concentration: readStringWithFallback(
      profile.concentration,
      candidateProfile.concentration,
      globalProfile["Concentration - selected from a maintained dropdown list (optional)"],
    ),
    gpa: readStringWithFallback(profile.gpa, candidateProfile.gpa, globalProfile["GPA (optional)"]),
    githubUrl: readStringWithFallback(profile.github_url, candidateProfile.github_url, globalProfile["GitHub URL (optional)"]),
    linkedinUrl: readStringWithFallback(
      profile.linkedin_url,
      candidateProfile.linkedin_url,
      globalProfile["LinkedIn URL (optional)"],
    ),
    clubs,
    paidExperienceCount:
      readStringWithFallback(
        profile.past_experience_count,
        candidateProfile.paid_experience_count,
        globalProfile["Count of paid work experiences since high school graduation"],
      ) || "0",
    unpaidExperienceCount:
      readStringWithFallback(
        profile.unique_experience_count,
        candidateProfile.unpaid_experience_count,
        globalProfile["Count of unpaid/volunteer experiences since high school graduation"],
      ) || "0",
    otherRelevantInformation: readStringWithFallback(
      profile.other_relevant_information,
      candidateProfile.other_relevant_information,
      globalProfile["Any other information that would be relevant"],
    ),
  };
}

export function profileFormToUpdatePayload(form: ProfileFormData): {
  payload: ProfileFullUpdatePayload;
  clubs: string[];
} {
  const fullLegalName = form.fullLegalName.trim();
  const preferredName = form.preferredName.trim();
  const pronouns = form.pronouns.trim();
  const expectedGraduationDate = form.expectedGraduationDate.trim();
  const currentYear = form.currentYear.trim();
  const major = form.major.trim();
  const minor = form.minor.trim();
  const concentration = form.concentration.trim();
  const githubUrl = form.githubUrl.trim();
  const linkedinUrl = form.linkedinUrl.trim();
  const clubs = form.clubs.map((club) => club.trim()).filter(Boolean);
  const paidExperienceCount = parseOptionalNumber(form.paidExperienceCount, "Paid experience count");
  const unpaidExperienceCount = parseOptionalNumber(form.unpaidExperienceCount, "Unpaid experience count");
  const gpa = parseOptionalNumber(form.gpa, "GPA", true);
  const otherRelevantInformation = form.otherRelevantInformation.trim();

  if (!fullLegalName || !expectedGraduationDate || !currentYear || !major || gpa === null || paidExperienceCount === null || unpaidExperienceCount === null) {
    throw new Error("Fill in all required fields before saving.");
  }

  return {
    payload: {
      first_name: preferredName || undefined,
      full_legal_name: fullLegalName,
      pronouns,
      expected_graduation_date: expectedGraduationDate,
      current_year: currentYear,
      major,
      minor,
      concentration,
      gpa: form.gpa.trim(),
      github_url: githubUrl,
      linkedin_url: linkedinUrl,
      club: clubs.length > 0 ? joinClubList(clubs) : "",
      past_experience_count: paidExperienceCount ?? undefined,
      unique_experience_count: unpaidExperienceCount ?? undefined,
      other_relevant_information: otherRelevantInformation,
    },
    clubs,
  };
}
