import { type FormEvent, useEffect, useState } from "react";

import { getMyFullProfile, updateMyFullProfile } from "../api";
import { Header } from "../components/header";
import { ProfileFieldsForm } from "../components/profile/ProfileFieldsForm";
import {
  EMPTY_PROFILE_FORM,
  profileFormToUpdatePayload,
  profileFullToProfileForm,
  type ProfileFormData,
} from "../components/profile/profileFormModel";

export function ProfilePage() {
  const token = localStorage.getItem("auth_access_token") ?? "";
  const [profileForm, setProfileForm] = useState<ProfileFormData>(EMPTY_PROFILE_FORM);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    if (!token) return;
    void (async () => {
      try {
        const profile = await getMyFullProfile(token);
        setProfileForm(profileFullToProfileForm(profile));
        setStatusMessage("");
      } catch {
        setStatusMessage("Could not load profile.");
      }
    })();
  }, [token]);

  const onSave = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) {
      setStatusMessage("Please sign in first.");
      return;
    }

    try {
      const { payload, clubs } = profileFormToUpdatePayload(profileForm);
      await updateMyFullProfile(token, payload);
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
            <ProfileFieldsForm
              data={profileForm}
              onChange={(updates) => setProfileForm((current) => ({ ...current, ...updates }))}
            />

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
