import { useMemo, useState } from "react";

import { Header } from "../components/header";

type LoginPageProps = {
  jobId?: string;
  adminMode?: boolean;
};

export function LoginPage({ jobId, adminMode = false }: LoginPageProps) {
  const [hasToken, setHasToken] = useState<boolean>(() => Boolean(localStorage.getItem("mock_auth_token")));
  const nextApplicantPath = useMemo(() => (jobId ? `/jobs/${jobId}` : "/applicant-dashboard"), [jobId]);

  const useExistingAccount = () => {
    window.location.href = adminMode ? "/admin-dashboard" : nextApplicantPath;
  };

  const setMockToken = () => {
    localStorage.setItem("mock_auth_token", "mock-token");
    setHasToken(true);
  };

  return (
    <div className="min-h-screen bg-[#f4f5f6] text-[#222]">
      <Header />

      <main className="grid place-items-center px-16 py-20 pt-24">
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

        <section className="w-full max-w-[450px] h-full rounded-sms border border-[#e3e3e3] bg-white p-[22px]">
          <label className="mb-3 block text-[13px] text-[#444]">
            Email
            <input
              placeholder="example@northeastern.edu"
              className="mt-1.5 block w-full rounded-[3px] border border-[#d6d6d6] px-2.5 py-2 text-[13px]"
            />
          </label>
          <label className="mb-3 block text-[13px] text-[#444]">
            Password
            <input
              type="password"
              placeholder="password"
              className="mt-1.5 block w-full rounded-[3px] border border-[#d6d6d6] px-2.5 py-2 text-[13px]"
            />
          </label>

          <a
            href={nextApplicantPath}
            onClick={setMockToken}
            className="mt-2 inline-block w-full rounded bg-[#1f6f5f] px-3 py-[11px] text-center text-sm font-semibold text-white"
          >
            Sign In as Applicant
          </a>
          <a
            href="/admin-dashboard"
            onClick={setMockToken}
            className="mt-2 inline-block w-full rounded bg-[#1f6f5f] px-3 py-[11px] text-center text-sm font-semibold text-white"
          >
            Sign In as Admin
          </a>

          <p className="mt-3 text-center text-[13px] text-[#333]">
            Don&apos;t have an account yet?{" "}
            <a href="#" className="text-[#7283cc] no-underline">
              Sign up
            </a>
          </p>
          <p className="mt-2.5 text-center text-xs">
            <a href="#" className="text-[#8f8f8f] no-underline">
              Forgot Password?
            </a>
          </p>
        </section>

        <div className="flex w-full max-w-[760px] items-center gap-6 text-[#d0d0d0]">
          <div className="h-px flex-1 bg-[#dcdcdc]" />
          <img src="/img/NExT Logo Lockup.svg" alt="NExT Logo" className="h-[100px] w-auto opacity-90" />
          <div className="h-px flex-1 bg-[#dcdcdc]" />
        </div>
      </main>
    </div>
  );
}
