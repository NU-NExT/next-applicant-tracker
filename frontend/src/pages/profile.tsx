import { type FormEvent, useEffect, useState } from "react";

import { getMyProfile, updateMyProfile } from "../api";
import { Header } from "../components/header";

export function ProfilePage() {
  const token = localStorage.getItem("auth_access_token") ?? "";
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [metadataText, setMetadataText] = useState("{}");
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    if (!token) return;
    void (async () => {
      try {
        const profile = await getMyProfile(token);
        setFirstName(profile.first_name);
        setLastName(profile.last_name);
        setEmail(profile.email);
        setMetadataText(JSON.stringify(profile.user_metadata ?? {}, null, 2));
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
      const metadata = JSON.parse(metadataText || "{}") as Record<string, unknown>;
      await updateMyProfile(token, {
        first_name: firstName,
        last_name: lastName,
        user_metadata: metadata,
      });
      localStorage.setItem("auth_user_email", email);
      localStorage.setItem("auth_user_name", `${firstName} ${lastName}`.trim() || email);
      setStatusMessage("Profile updated. Existing submissions remain unchanged snapshots.");
    } catch {
      setStatusMessage("Could not update profile. Ensure metadata is valid JSON.");
    }
  };

  return (
    <div className="flex flex-col flex-1 bg-[#ececec]">
      <Header />
      <main className="flex-1 mx-auto max-w-[900px] px-4 pb-8 pt-24">
        <section className="rounded border border-[#c7c7c7] bg-white p-5">
          <h1 className="text-3xl font-semibold text-[#1f1f1f]">My Profile</h1>
          <p className="mt-1 text-sm text-[#444]">Profile updates apply to future applications only.</p>

          <form onSubmit={onSave} className="mt-4 space-y-3">
            <label className="block text-sm">
              Email
              <input value={email} disabled className="mt-1 w-full rounded border border-[#d0d0d0] bg-[#f4f4f4] px-3 py-2" />
            </label>
            <label className="block text-sm">
              First name
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="mt-1 w-full rounded border border-[#d0d0d0] px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              Last name
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="mt-1 w-full rounded border border-[#d0d0d0] px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              User metadata (JSON)
              <textarea
                value={metadataText}
                onChange={(e) => setMetadataText(e.target.value)}
                className="mt-1 h-48 w-full rounded border border-[#d0d0d0] px-3 py-2 font-mono text-xs"
              />
            </label>

            <button type="submit" className="rounded bg-[#1f6f5f] px-4 py-2 text-sm text-white">
              Save Profile
            </button>
            {statusMessage ? <p className="text-sm text-[#333]">{statusMessage}</p> : null}
          </form>
        </section>
      </main>
    </div>
  );
}
