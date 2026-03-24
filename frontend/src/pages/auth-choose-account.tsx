import { Header } from "../components/header";

export function AuthChooseAccountPage() {
  return (
    <div className="min-h-screen bg-[#efefef]">
      <Header />

      <main className="mx-auto max-w-[900px] px-4 pt-24">
        <section className="rounded-md border border-[#c7c7c7] bg-white p-6">
          <h1 className="text-3xl font-semibold text-[#1f1f1f]">Use Existing Account?</h1>
          <p className="mt-2 text-[#4d4d4d]">
            Mock token detected. Choose whether to continue with this account or sign in with a different one.
          </p>
          <div className="mt-4 flex gap-3">
            <a href="/applicant-dashboard" className="rounded bg-[#1f6f5f] px-4 py-2 text-white no-underline">
              Use Existing Account
            </a>
            <a href="/login" className="rounded border border-[#969696] px-4 py-2 text-[#1f1f1f] no-underline">
              Sign In with Different Account
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
