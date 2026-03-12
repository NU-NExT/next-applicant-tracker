import { useMemo, useState } from "react";

import {
  authConfirmForgotPassword,
  authForgotPassword,
  authLogin,
  authRegisterApplicant,
  getMyProfile,
} from "../api";
import { Header } from "../components/header";

type LoginPageProps = {
  jobId?: string;
  adminMode?: boolean;
};

export function LoginPage({ jobId, adminMode = false }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmationCode, setConfirmationCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup" | "forgot" | "reset">(adminMode ? "signin" : "signin");
  const [statusMessage, setStatusMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [hasToken, setHasToken] = useState<boolean>(() => Boolean(localStorage.getItem("auth_access_token")));
  const nextApplicantPath = useMemo(() => (jobId ? `/jobs/${jobId}` : "/applicant-dashboard"), [jobId]);

  const useExistingAccount = () => {
    window.location.href = adminMode ? "/admin-dashboard" : nextApplicantPath;
  };

  const submitSignIn = async () => {
    setIsBusy(true);
    setStatusMessage("");
    try {
      const data = await authLogin({
        email,
        password,
        admin_mode: adminMode,
      });
      localStorage.setItem("auth_access_token", data.access_token);
      localStorage.setItem("auth_id_token", data.id_token);
      if (data.refresh_token) {
        localStorage.setItem("auth_refresh_token", data.refresh_token);
      }
      setHasToken(true);
      if (adminMode) {
        window.location.href = "/admin-dashboard";
        return;
      }
      try {
        const profile = await getMyProfile(data.access_token);
        const hasConsent = Boolean(profile.consented_at) || Boolean((profile.user_metadata as Record<string, unknown>)?.consent);
        if (!hasConsent) {
          window.location.href = `/consent?next=${encodeURIComponent(nextApplicantPath)}`;
          return;
        }
      } catch {
        // If profile lookup fails, force consent screen once.
        window.location.href = `/consent?next=${encodeURIComponent(nextApplicantPath)}`;
        return;
      }
      window.location.href = nextApplicantPath;
    } catch (error) {
      setStatusMessage("Sign in failed. Check credentials and use your @northeastern.edu account.");
    } finally {
      setIsBusy(false);
    }
  };

  const submitSignUp = async () => {
    setIsBusy(true);
    setStatusMessage("");
    try {
      await authRegisterApplicant({ email, password });
      setStatusMessage("Applicant account created. Please sign in.");
      setMode("signin");
    } catch {
      setStatusMessage("Registration failed. Only @northeastern.edu applicant accounts are allowed.");
    } finally {
      setIsBusy(false);
    }
  };

  const submitForgotPassword = async () => {
    setIsBusy(true);
    setStatusMessage("");
    try {
      await authForgotPassword({ email });
      setStatusMessage("Verification code sent to your Northeastern email.");
      setMode("reset");
    } catch {
      setStatusMessage("Unable to start reset flow. Ensure account email is valid.");
    } finally {
      setIsBusy(false);
    }
  };

  const submitResetPassword = async () => {
    setIsBusy(true);
    setStatusMessage("");
    try {
      await authConfirmForgotPassword({
        email,
        confirmation_code: confirmationCode,
        new_password: newPassword,
      });
      setStatusMessage("Password reset complete. Sign in with your new password.");
      setMode("signin");
    } catch {
      setStatusMessage("Password reset failed. Verify code and try again.");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f5f6] text-[#222]">
      <Header />

      <main className="mx-auto w-full max-w-[980px] px-6 py-20 pt-24">
        <div className="grid gap-4 md:grid-cols-[1fr_280px]">
          <div>
            {hasToken ? (
              <section className="mb-4 w-full max-w-[450px] rounded border border-[#b6d7cd] bg-[#e8f7f2] p-3">
                <p className="text-sm text-[#1f463d]">
                  Existing account token detected. Use existing account for this session?
                </p>
                <button
                  type="button"
                  onClick={useExistingAccount}
                  className="mt-2 rounded bg-[#1f6f5f] px-3 py-1.5 text-xs font-semibold text-white"
                >
                  Use Existing Account
                </button>
              </section>
            ) : null}

            <section className="w-full max-w-[450px] rounded-sms border border-[#e3e3e3] bg-white p-[22px]">
          {!adminMode ? (
            <div className="mb-3 grid grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                className={`rounded border px-2 py-1 ${mode === "signin" ? "bg-[#1f6f5f] text-white" : "bg-white"}`}
                onClick={() => setMode("signin")}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`rounded border px-2 py-1 ${mode === "signup" ? "bg-[#1f6f5f] text-white" : "bg-white"}`}
                onClick={() => setMode("signup")}
              >
                Sign Up
              </button>
              <button
                type="button"
                className={`rounded border px-2 py-1 ${mode === "forgot" || mode === "reset" ? "bg-[#1f6f5f] text-white" : "bg-white"}`}
                onClick={() => setMode("forgot")}
              >
                Reset
              </button>
            </div>
          ) : (
            <p className="mb-3 text-sm text-[#333]">Administrator Sign In (ADMIN only)</p>
          )}

          <label className="mb-3 block text-[13px] text-[#444]">
            Email
            <input
              placeholder="example@northeastern.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 block w-full rounded-[3px] border border-[#d6d6d6] px-2.5 py-2 text-[13px]"
            />
          </label>
          {mode !== "reset" ? (
            <label className="mb-3 block text-[13px] text-[#444]">
              Password
              <input
                type="password"
                placeholder="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 block w-full rounded-[3px] border border-[#d6d6d6] px-2.5 py-2 text-[13px]"
              />
            </label>
          ) : (
            <>
              <label className="mb-3 block text-[13px] text-[#444]">
                Verification Code
                <input
                  placeholder="Code from email"
                  value={confirmationCode}
                  onChange={(e) => setConfirmationCode(e.target.value)}
                  className="mt-1.5 block w-full rounded-[3px] border border-[#d6d6d6] px-2.5 py-2 text-[13px]"
                />
              </label>
              <label className="mb-3 block text-[13px] text-[#444]">
                New Password
                <input
                  type="password"
                  placeholder="new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-1.5 block w-full rounded-[3px] border border-[#d6d6d6] px-2.5 py-2 text-[13px]"
                />
              </label>
            </>
          )}

          {mode === "signin" ? (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => void submitSignIn()}
              className="mt-2 inline-block w-full rounded bg-[#1f6f5f] px-3 py-[11px] text-center text-sm font-semibold text-white disabled:opacity-60"
            >
              {isBusy ? "Signing In..." : adminMode ? "Sign In as Admin" : "Sign In as Applicant"}
            </button>
          ) : null}

          {mode === "signup" && !adminMode ? (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => void submitSignUp()}
              className="mt-2 inline-block w-full rounded bg-[#1f6f5f] px-3 py-[11px] text-center text-sm font-semibold text-white disabled:opacity-60"
            >
              {isBusy ? "Creating Account..." : "Create Applicant Account"}
            </button>
          ) : null}

          {mode === "forgot" ? (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => void submitForgotPassword()}
              className="mt-2 inline-block w-full rounded bg-[#1f6f5f] px-3 py-[11px] text-center text-sm font-semibold text-white disabled:opacity-60"
            >
              {isBusy ? "Sending..." : "Send Reset Code"}
            </button>
          ) : null}

          {mode === "reset" ? (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => void submitResetPassword()}
              className="mt-2 inline-block w-full rounded bg-[#1f6f5f] px-3 py-[11px] text-center text-sm font-semibold text-white disabled:opacity-60"
            >
              {isBusy ? "Resetting..." : "Confirm Password Reset"}
            </button>
          ) : null}

            {statusMessage ? <p className="mt-3 text-center text-xs text-[#333]">{statusMessage}</p> : null}
            </section>
          </div>

          <aside className="h-fit rounded border border-[#e3e3e3] bg-white p-4">
            <p className="text-sm font-semibold text-[#222]">Admin Account</p>
            <p className="mt-1 text-xs text-[#555]">
              Use this quick panel to jump directly into the admin account login page.
            </p>
            <button
              type="button"
              onClick={() => {
                window.location.href = adminMode ? "/login" : "/login?admin=1";
              }}
              className="mt-3 w-full rounded border border-[#c8c8c8] px-3 py-2 text-sm transition hover:bg-[#f3f3f3]"
            >
              {adminMode ? "Go to Applicant Login" : "Go to Admin Login"}
            </button>
          </aside>
        </div>

        <div className="mt-8 flex w-full items-center gap-6 text-[#d0d0d0]">
          <div className="h-px flex-1 bg-[#dcdcdc]" />
          <img src="/img/NExT Logo Lockup.svg" alt="NExT Logo" className="h-[100px] w-auto opacity-90" />
          <div className="h-px flex-1 bg-[#dcdcdc]" />
        </div>
      </main>
    </div>
  );
}
