import { useState } from "react";
import type { FieldOptionRecord, ProfileFullUpdatePayload } from "../../api";

export type ProfileFormData = {
  full_legal_name: string;
  first_name: string;
  last_name: string;
  email: string;
  expected_graduation_date: string;
  current_year: string;
  coop_number: string;
  major: string;
  minor: string;
  concentration: string;
  college: string;
  gpa: string;
  github_url: string;
  linkedin_url: string;
  personal_website_url: string;
  club: string;
  past_experience_count: number | null;
  unique_experience_count: number | null;
};

type StepProfileFieldsProps = {
  data: ProfileFormData;
  fieldOptions: {
    major: FieldOptionRecord[];
    minor: FieldOptionRecord[];
    concentration: FieldOptionRecord[];
  };
  onChange: (updates: Partial<ProfileFormData>) => void;
  onSaveAndNext: (payload: ProfileFullUpdatePayload) => Promise<void>;
  onBack: () => void;
};

const YEAR_OPTIONS = [
  "1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year", "Graduate",
];

const COOP_OPTIONS = ["1st", "2nd", "3rd"];

const COLLEGE_OPTIONS = [
  "Khoury College of Computer Sciences",
  "D'Amore-McKim School of Business",
  "College of Engineering",
  "Bouv\u00e9 College of Health Sciences",
  "College of Arts Media and Design (CAMD)",
  "College of Science",
  "College of Social Sciences and Humanities",
  "School of Law",
  "School of Public Policy and Urban Affairs",
];

const REQUIRED_FIELDS: (keyof ProfileFormData)[] = [
  "full_legal_name", "expected_graduation_date", "current_year", "major",
];

export function StepProfileFields({
  data,
  fieldOptions,
  onChange,
  onSaveAndNext,
  onBack,
}: StepProfileFieldsProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // "Other" free-text fallbacks for dropdowns
  const [majorOther, setMajorOther] = useState("");
  const [minorOther, setMinorOther] = useState("");
  const [concentrationOther, setConcentrationOther] = useState("");
  const [collegeOther, setCollegeOther] = useState("");

  const missingRequired = REQUIRED_FIELDS.filter((f) => !data[f]);

  // Check if a value is a custom "other" entry (not in the options list)
  const isOtherSelected = (field: "major" | "minor" | "concentration") => data[field] === "__other__";
  const isCollegeOther = data.college === "__other__";

  const resolveValue = (field: "major" | "minor" | "concentration", otherVal: string) =>
    data[field] === "__other__" ? otherVal : data[field];

  const handleNext = async () => {
    // Resolve "Other" values before validation
    const resolvedMajor = resolveValue("major", majorOther);
    const resolvedMinor = resolveValue("minor", minorOther);
    const resolvedConcentration = resolveValue("concentration", concentrationOther);
    const resolvedCollege = isCollegeOther ? collegeOther : data.college;

    // Check required fields with resolved values
    const effectiveData = { ...data, major: resolvedMajor, minor: resolvedMinor, concentration: resolvedConcentration, college: resolvedCollege };
    const missing = REQUIRED_FIELDS.filter((f) => !effectiveData[f]);
    if (missing.length > 0) {
      setError("Please fill in all required fields.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await onSaveAndNext({
        first_name: data.first_name || undefined,
        last_name: data.last_name || undefined,
        full_legal_name: data.full_legal_name || undefined,
        expected_graduation_date: data.expected_graduation_date || undefined,
        current_year: data.current_year || undefined,
        coop_number: data.coop_number || undefined,
        major: resolvedMajor || undefined,
        minor: resolvedMinor || undefined,
        concentration: resolvedConcentration || undefined,
        college: resolvedCollege || undefined,
        gpa: data.gpa || undefined,
        github_url: data.github_url || undefined,
        linkedin_url: data.linkedin_url || undefined,
        personal_website_url: data.personal_website_url || undefined,
        club: data.club || undefined,
        past_experience_count: data.past_experience_count ?? undefined,
        unique_experience_count: data.unique_experience_count ?? undefined,
      });
    } catch {
      setError("Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const input = (className = "") =>
    `w-full rounded border border-[#c3c3c3] px-3 py-2 ${className}`;

  const label = (text: string, required = false) => (
    <span className="mb-1 block text-sm font-medium text-[#2d2d2d]">
      {text}{required && <span className="text-red-600"> *</span>}
    </span>
  );

  /** Dropdown with "Other" free-text fallback */
  const selectWithOther = (
    fieldKey: "major" | "minor" | "concentration",
    options: FieldOptionRecord[],
    otherVal: string,
    setOtherVal: (v: string) => void,
  ) => (
    <>
      <select
        className={input()}
        value={data[fieldKey]}
        onChange={(e) => {
          onChange({ [fieldKey]: e.target.value });
          if (e.target.value !== "__other__") setOtherVal("");
        }}
      >
        <option value="">Select...</option>
        {options.map((o) => <option key={o.id ?? o.value} value={o.value}>{o.value}</option>)}
        <option value="__other__">Other (type manually)</option>
      </select>
      {isOtherSelected(fieldKey) && (
        <input
          className={`${input()} mt-2`}
          placeholder="Enter custom value"
          value={otherVal}
          onChange={(e) => setOtherVal(e.target.value)}
        />
      )}
    </>
  );

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-semibold text-[#1f1f1f]">Step 2: Profile Information</h2>
      <p className="text-sm text-[#4d4d4d]">
        This information is saved to your profile and reused for future applications.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Full legal name */}
        <div>
          {label("Full Legal Name", true)}
          <input className={input()} value={data.full_legal_name} onChange={(e) => onChange({ full_legal_name: e.target.value })} />
        </div>

        {/* Preferred name (first name) */}
        <div>
          {label("Preferred Name (optional)")}
          <input className={input()} value={data.first_name} onChange={(e) => onChange({ first_name: e.target.value })} />
        </div>

        {/* Email (read-only) */}
        <div>
          {label("Northeastern Email")}
          <input className={input("bg-[#f5f5f5]")} value={data.email} disabled />
        </div>

        {/* Graduation date */}
        <div>
          {label("Expected Graduation Date", true)}
          <input type="date" className={input()} value={data.expected_graduation_date} onChange={(e) => onChange({ expected_graduation_date: e.target.value })} />
        </div>

        {/* Current year */}
        <div>
          {label("Current Year / Grade Level", true)}
          <select className={input()} value={data.current_year} onChange={(e) => onChange({ current_year: e.target.value })}>
            <option value="">Select...</option>
            {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        {/* Co-op number */}
        <div>
          {label("Co-op Number")}
          <select className={input()} value={data.coop_number} onChange={(e) => onChange({ coop_number: e.target.value })}>
            <option value="">Select...</option>
            {COOP_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Major */}
        <div>
          {label("Major(s)", true)}
          {selectWithOther("major", fieldOptions.major, majorOther, setMajorOther)}
        </div>

        {/* Minor */}
        <div>
          {label("Minor(s) (optional)")}
          {selectWithOther("minor", fieldOptions.minor, minorOther, setMinorOther)}
        </div>

        {/* Concentration */}
        <div>
          {label("Concentration (optional)")}
          {selectWithOther("concentration", fieldOptions.concentration, concentrationOther, setConcentrationOther)}
        </div>

        {/* College */}
        <div>
          {label("College / School within Northeastern")}
          <select
            className={input()}
            value={data.college}
            onChange={(e) => {
              onChange({ college: e.target.value });
              if (e.target.value !== "__other__") setCollegeOther("");
            }}
          >
            <option value="">Select...</option>
            {COLLEGE_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
            <option value="__other__">Other (type manually)</option>
          </select>
          {isCollegeOther && (
            <input
              className={`${input()} mt-2`}
              placeholder="Enter custom value"
              value={collegeOther}
              onChange={(e) => setCollegeOther(e.target.value)}
            />
          )}
        </div>

        {/* GPA */}
        <div>
          {label("GPA (optional)")}
          <input className={input()} value={data.gpa} placeholder="e.g. 3.50" onChange={(e) => onChange({ gpa: e.target.value })} />
        </div>

        {/* GitHub */}
        <div>
          {label("GitHub URL (optional)")}
          <input className={input()} value={data.github_url} placeholder="https://github.com/..." onChange={(e) => onChange({ github_url: e.target.value })} />
        </div>

        {/* LinkedIn */}
        <div>
          {label("LinkedIn URL (optional)")}
          <input className={input()} value={data.linkedin_url} placeholder="https://linkedin.com/in/..." onChange={(e) => onChange({ linkedin_url: e.target.value })} />
        </div>

        {/* Personal Website */}
        <div>
          {label("Personal Website (optional)")}
          <input className={input()} value={data.personal_website_url} placeholder="https://yoursite.com" onChange={(e) => onChange({ personal_website_url: e.target.value })} />
        </div>

        {/* Clubs */}
        <div className="sm:col-span-2">
          {label("Clubs and Extracurricular Activities")}
          <textarea className={`${input()} h-20`} value={data.club} placeholder="List your clubs and extracurriculars" onChange={(e) => onChange({ club: e.target.value })} />
        </div>

        {/* Paid experience count */}
        <div>
          {label("Paid Work Experiences (since HS graduation)")}
          <input type="number" min={0} className={input()} value={data.past_experience_count ?? ""} onChange={(e) => onChange({ past_experience_count: e.target.value ? Number(e.target.value) : null })} />
        </div>

        {/* Unpaid experience count */}
        <div>
          {label("Unpaid/Volunteer Experiences (since HS graduation)")}
          <input type="number" min={0} className={input()} value={data.unique_experience_count ?? ""} onChange={(e) => onChange({ unique_experience_count: e.target.value ? Number(e.target.value) : null })} />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-between">
        <button type="button" onClick={onBack} className="rounded-md border border-[#c7c7c7] px-5 py-2 text-[#333]">
          Back
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={handleNext}
          className="rounded-md bg-[#1f6f5f] px-5 py-2 text-white disabled:opacity-60"
        >
          {saving ? "Saving..." : "Next"}
        </button>
      </div>
    </div>
  );
}
