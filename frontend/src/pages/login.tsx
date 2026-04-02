import { useEffect, useMemo, useState } from "react";
import axios from "axios";

import {
  authLogin,
  authConfirmForgotPassword,
  authForgotPassword,
  authRegisterApplicant,
  getMyProfile,
} from "../api";
import { Header } from "../components/header";

type LoginPageProps = {
  jobId?: string;
};

export function LoginPage({ jobId }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmationCode, setConfirmationCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup" | "forgot" | "reset">("signin");
  const [statusMessage, setStatusMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [hasToken, setHasToken] = useState<boolean>(() => Boolean(localStorage.getItem("auth_access_token")));
  const nextApplicantPath = useMemo(() => (jobId ? `/jobs/${jobId}` : "/applicant-dashboard"), [jobId]);
  const signupReturnToPath = useMemo(() => (jobId ? `/jobs/${jobId}/login` : "/login"), [jobId]);

  const isNortheasternEmail = (value: string): boolean => value.trim().toLowerCase().endsWith("@northeastern.edu");

  const useExistingAccount = () => {
    const isAdmin = localStorage.getItem("auth_is_admin") === "true";
    window.location.href = isAdmin ? "/admin-dashboard" : nextApplicantPath;
  };

  const getErrorDetail = (error: unknown, fallback: string): string => {
    if (axios.isAxiosError(error)) {
      const detail = error.response?.data?.detail;
      if (typeof detail === "string" && detail.trim().length > 0) return detail;
    }
    return fallback;
  };

  const finishLogin = async (accessToken: string, nextPath: string, useAdminRedirect = false) => {
    localStorage.setItem("auth_access_token", accessToken);
    setHasToken(true);
    if (useAdminRedirect) {
      window.location.href = "/admin-dashboard";
      return;
    }

    try {
      const profile = await getMyProfile(accessToken);
      localStorage.setItem("auth_user_email", profile.email);
      localStorage.setItem(
        "auth_user_name",
        `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || profile.email
      );
      const hasConsent = Boolean(profile.consented_at) || Boolean((profile.user_metadata as Record<string, unknown>)?.consent);
      if (!hasConsent) {
        window.location.href = `/consent?next=${encodeURIComponent(nextPath)}`;
        return;
      }
    } catch {
      window.location.href = `/consent?next=${encodeURIComponent(nextPath)}`;
      return;
    }

    window.location.href = nextPath;
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("verified") === "1") {
      setMode("signin");
      setStatusMessage("Email verified. Sign in with the email and password you created.");
    }
  }, []);

  const submitSignIn = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!isNortheasternEmail(normalizedEmail)) {
      setStatusMessage("Please use your @northeastern.edu email address.");
      return;
    }

    setIsBusy(true);
    setStatusMessage("");
    try {
      const auth = await authLogin({
        email: normalizedEmail,
        password,
      });
      localStorage.setItem("auth_id_token", auth.id_token);
      if (auth.refresh_token) {
        localStorage.setItem("auth_refresh_token", auth.refresh_token);
      }
      localStorage.setItem("auth_user_email", auth.email);
      localStorage.setItem("auth_user_name", `${auth.first_name ?? ""} ${auth.last_name ?? ""}`.trim() || auth.email);
      localStorage.setItem("auth_is_admin", auth.is_admin ? "true" : "false");
      await finishLogin(auth.access_token, nextApplicantPath, auth.is_admin);
    } catch (error) {
      setStatusMessage(getErrorDetail(error, "Sign in failed. Check your email verification and password."));
    } finally {
      setIsBusy(false);
    }
  };

  const submitSignUp = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!isNortheasternEmail(normalizedEmail)) {
      setStatusMessage("Please use your @northeastern.edu email address.");
      return;
    }

    setIsBusy(true);
    setStatusMessage("");
    try {
      await authRegisterApplicant({ email: normalizedEmail, password, return_to: signupReturnToPath });
      setStatusMessage("Signup received. Check your Northeastern inbox for the verification link, then sign in.");
      setMode("signup");
    } catch (error) {
      setStatusMessage(
        getErrorDetail(error, "Registration failed. Only @northeastern.edu applicant accounts are allowed.")
      );
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
    } catch (error) {
      setStatusMessage(getErrorDetail(error, "Unable to start reset flow. Ensure account email is valid."));
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
    } catch (error) {
      setStatusMessage(getErrorDetail(error, "Password reset failed. Verify code and try again."));
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 bg-[#f4f5f6] text-[#222]">
      <Header />

      <main className="flex-1 mx-auto w-full max-w-[1200px] max-h-[800px] px-6 py-20 pt-24 mt-[50px]">
        <div className="flex flex-col items-center gap-4 h-full">
          <div className="w-full max-w-[600px] h-full">
            {hasToken ? (
              <section className="mb-4 w-full rounded border border-[#b6d7cd] bg-[#e8f7f2] p-3">
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

            <section className="mx-auto w-[400px] h-[350px] rounded-sm border border-[#e3e3e3] bg-white p-[22px] flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-2 text-xs">
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

          {mode === "signin" || mode === "signup" || mode === "forgot" || mode === "reset" ? (
            <label className="block text-[13px] text-[#444] mt-[20px]">
              Email
              <input
                placeholder="example@northeastern.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 block w-full rounded-[3px] border border-[#d6d6d6] px-2.5 py-2 text-[13px]"
              />
            </label>
          ) : null}

          {mode === "signin" ? (
            <label className="block text-[13px] text-[#444] mt-[20px]">
              Password
              <input
                type="password"
                placeholder="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 block w-full rounded-[3px] border border-[#d6d6d6] px-2.5 py-2 text-[13px]"
              />
            </label>
          ) : null}
          {mode === "reset" ? (
            <>
              <label className="block text-[13px] text-[#444] mt-[20px]">
                Verification Code
                <input
                  placeholder="Code from email"
                  value={confirmationCode}
                  onChange={(e) => setConfirmationCode(e.target.value)}
                  className="mt-1.5 block w-full rounded-[3px] border border-[#d6d6d6] px-2.5 py-2 text-[13px]"
                />
              </label>
              <label className="block text-[13px] text-[#444] mt-[20px]">
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
          ) : mode !== "signin" ? (
            <label className="block text-[13px] text-[#444] mt-[20px]">
              Password
              <input
                type="password"
                placeholder="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 block w-full rounded-[3px] border border-[#d6d6d6] px-2.5 py-2 text-[13px]"
              />
            </label>
          ) : null}

          {mode === "signin" ? (
              <button
              type="button"
              disabled={isBusy}
              onClick={() => void submitSignIn()}
              className="inline-block w-full rounded bg-[#1f6f5f] px-3 py-[11px] text-center text-sm font-semibold text-white disabled:opacity-60"
            >
              {isBusy
                ? "Signing In..."
                : "Sign In"}
            </button>
          ) : null}

          {mode === "signup" ? (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => void submitSignUp()}
              className="inline-block w-full rounded bg-[#1f6f5f] px-3 py-[11px] text-center text-sm font-semibold text-white disabled:opacity-60 mt-[50px]"
            >
              {isBusy ? "Creating Account..." : "Create Applicant Account"}
            </button>
          ) : null}

          {mode === "forgot" ? (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => void submitForgotPassword()}
              className="inline-block w-full rounded bg-[#1f6f5f] px-3 py-[11px] text-center text-sm font-semibold text-white disabled:opacity-60 mt-[50px]"
            >
              {isBusy ? "Sending..." : "Send Reset Code"}
            </button>
          ) : null}

          {mode === "reset" ? (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => void submitResetPassword()}
              className="inline-block w-full rounded bg-[#1f6f5f] px-3 py-[11px] text-center text-sm font-semibold text-white disabled:opacity-60 mt-[50px]"
            >
              {isBusy ? "Resetting..." : "Confirm Password Reset"}
            </button>
          ) : null}

            {statusMessage ? <p className="text-center text-xs text-[#333]">{statusMessage}</p> : null}
            </section>
          </div>
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
