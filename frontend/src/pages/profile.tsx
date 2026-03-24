import { useEffect, useState } from "react";

import { getMyProfile, type UserProfile } from "../api";
import { Header } from "../components/header";
import { buildProfileDraft, COLLEGE_YEAR_OPTIONS, emptyProfileDraft, type ProfileDraft } from "../lib/profile-draft";

const inputClassName =
  "mt-2 w-full rounded border border-[#d0d0d0] bg-white px-3 py-2 text-sm text-[#1f1f1f] outline-none transition focus:border-[#1f6f5f]";
const readOnlyClassName =
  "mt-2 w-full rounded border border-[#d0d0d0] bg-[#f4f4f4] px-3 py-2 text-sm text-[#4b4b4b]";
const sectionClassName = "rounded-xl border border-[#d7dad8] bg-[#fcfcfb] p-5";

type FieldProps = {
  label: string;
  children: React.ReactNode;
  hint?: string;
};

function Field({ label, children, hint }: FieldProps) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-[#2f3b39]">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-[#68736f]">{hint}</span> : null}
    </label>
  );
}

export function ProfilePage() {
  const token = localStorage.getItem("auth_access_token") ?? "";
  const [email, setEmail] = useState("");
  const [draft, setDraft] = useState<ProfileDraft>(() => emptyProfileDraft());
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatusMessage("Please sign in to view your profile.");
      return;
    }

    void (async () => {
      try {
        const profile = await getMyProfile(token);
        setEmail(profile.email);
        setDraft(buildProfileDraft(profile));
        setStatusMessage("");
      } catch {
        setStatusMessage("Could not load profile.");
      }
    })();
  }, [token]);

  const updateDraft = (field: keyof ProfileDraft, value: string) => {
    setDraft((current) => ({
      ...current,
      [field]: value,
    }));
  };

  return (
    <div className="min-h-screen bg-[#ececec]">
      <Header />
      <main className="mx-auto max-w-[1200px] px-4 pb-8 pt-24">
        <section className="rounded-2xl border border-[#c7c7c7] bg-white p-6 shadow-[0_18px_50px_rgba(0,0,0,0.06)]">
          <div className="flex flex-col gap-3 border-b border-[#e1e3e1] pb-5">
            <div>
              <h1 className="text-3xl font-semibold text-[#1f1f1f]">My Profile</h1>
              <p className="mt-1 text-sm text-[#4e5754]">
                Structured profile editing is in design mode. These fields are for frontend prototyping only.
              </p>
            </div>
            <div className="rounded-xl border border-[#d9dfdb] bg-[#f4f8f5] px-4 py-3 text-sm text-[#35564c]">
              This profile editor is a frontend prototype. Changes here are not saved yet.
            </div>
            {statusMessage ? (
              <div className="rounded-xl border border-[#e1c7c7] bg-[#fdf2f2] px-4 py-3 text-sm text-[#8a3c3c]">
                {statusMessage}
              </div>
            ) : null}
          </div>

          <div className="mt-6 space-y-5">
            <section className={sectionClassName}>
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-[#1f2a28]">Identity</h2>
                <p className="mt-1 text-sm text-[#68736f]">The basics a candidate would expect to confirm first.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Email">
                  <input value={email} disabled className={readOnlyClassName} />
                </Field>
                <Field label="Preferred name">
                  <input
                    value={draft.preferredName}
                    onChange={(event) => updateDraft("preferredName", event.target.value)}
                    className={inputClassName}
                    placeholder="How should we address you?"
                  />
                </Field>
                <Field label="Full name">
                  <input
                    value={draft.fullName}
                    onChange={(event) => updateDraft("fullName", event.target.value)}
                    className={inputClassName}
                    placeholder="Full legal or primary name"
                  />
                </Field>
              </div>
            </section>

            <section className={sectionClassName}>
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-[#1f2a28]">Academics</h2>
                <p className="mt-1 text-sm text-[#68736f]">A prototype layout for student background and degree details.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Expected graduation date">
                  <input
                    type="date"
                    value={draft.expectedGraduationDate}
                    onChange={(event) => updateDraft("expectedGraduationDate", event.target.value)}
                    className={inputClassName}
                  />
                </Field>
                <Field label="Current college year">
                  <select
                    value={draft.currentCollegeYear}
                    onChange={(event) => updateDraft("currentCollegeYear", event.target.value)}
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
                    value={draft.major}
                    onChange={(event) => updateDraft("major", event.target.value)}
                    className={inputClassName}
                    placeholder="Primary major"
                  />
                </Field>
                <Field label="Minor">
                  <input
                    value={draft.minor}
                    onChange={(event) => updateDraft("minor", event.target.value)}
                    className={inputClassName}
                    placeholder="Minor or secondary field"
                  />
                </Field>
                <Field label="Concentration">
                  <input
                    value={draft.concentration}
                    onChange={(event) => updateDraft("concentration", event.target.value)}
                    className={inputClassName}
                    placeholder="Concentration or specialization"
                  />
                </Field>
                <Field label="GPA" hint="Stored as text in this prototype to avoid format assumptions.">
                  <input
                    value={draft.gpa}
                    onChange={(event) => updateDraft("gpa", event.target.value)}
                    className={inputClassName}
                    placeholder="e.g. 3.8 or 3.80 / 4.0"
                  />
                </Field>
              </div>
            </section>

            <section className={sectionClassName}>
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-[#1f2a28]">Links and Activities</h2>
                <p className="mt-1 text-sm text-[#68736f]">Personal links and campus involvement shown as a richer form layout.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="GitHub URL">
                  <input
                    type="url"
                    value={draft.githubUrl}
                    onChange={(event) => updateDraft("githubUrl", event.target.value)}
                    className={inputClassName}
                    placeholder="https://github.com/username"
                  />
                </Field>
                <Field label="LinkedIn URL">
                  <input
                    type="url"
                    value={draft.linkedinUrl}
                    onChange={(event) => updateDraft("linkedinUrl", event.target.value)}
                    className={inputClassName}
                    placeholder="https://linkedin.com/in/username"
                  />
                </Field>
                <div className="md:col-span-2">
                  <Field label="Clubs / extracurriculars">
                    <textarea
                      value={draft.clubsExtracurriculars}
                      onChange={(event) => updateDraft("clubsExtracurriculars", event.target.value)}
                      className={`${inputClassName} min-h-[128px] resize-y`}
                      placeholder="Student organizations, leadership, athletics, volunteer work, and other activities"
                    />
                  </Field>
                </div>
              </div>
            </section>

            <section className={sectionClassName}>
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-[#1f2a28]">Experience Summary</h2>
                <p className="mt-1 text-sm text-[#68736f]">Simple count fields to visualize application profile completeness.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Paid experience count">
                  <input
                    type="number"
                    min="0"
                    value={draft.paidExperienceCount}
                    onChange={(event) => updateDraft("paidExperienceCount", event.target.value)}
                    className={inputClassName}
                    placeholder="0"
                  />
                </Field>
                <Field label="Unpaid experience count">
                  <input
                    type="number"
                    min="0"
                    value={draft.unpaidExperienceCount}
                    onChange={(event) => updateDraft("unpaidExperienceCount", event.target.value)}
                    className={inputClassName}
                    placeholder="0"
                  />
                </Field>
              </div>
            </section>

            <section className="rounded-2xl border border-dashed border-[#c4cdc9] bg-[#f8faf8] p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-[#1f2a28]">Prototype Footer</h2>
                  <p className="mt-1 text-sm text-[#68736f]">
                    The button stays visible to show the eventual interaction, but persistence is intentionally disabled.
                  </p>
                </div>
                <button
                  type="button"
                  disabled
                  className="rounded bg-[#1f6f5f] px-5 py-2 text-sm font-medium text-white opacity-50"
                >
                  Save Profile
                </button>
              </div>
            </section>
          </div>
        </section>
      </main>
    </div>
  );
}
