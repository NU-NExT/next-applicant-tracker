import { Header } from "../components/header";

export function ApplicantDashboardPage() {
  return (
    <div className="min-h-screen bg-[#ececec]">
      <Header />

      <main className="mx-auto max-w-[1200px] px-4 pb-6 pt-24">
        <h1 className="mb-4 text-5xl font-medium text-[#1f1f1f]">Welcome, X!</h1>

        <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
          <section className="border border-[#c7c7c7] bg-[#d8d8d8] p-4 h-[clamp(220px,34vh,360px)]">
            <h2 className="border-b border-[#b5b5b5] pb-1 text-3xl text-[#2d2d2d]">My Tasks</h2>
            <ul className="mt-4 space-y-3 text-[22px] text-[#1f1f1f] underline">
              <li>Schedule Meeting</li>
              <li>Complete Coding Assessment</li>
              <li>Fill out X optional info</li>
            </ul>
          </section>

          <section className="border border-[#c7c7c7] bg-[#d8d8d8] p-4 h-[clamp(220px,34vh,360px)]">
            <h2 className="border-b border-[#b5b5b5] pb-1 text-3xl text-[#2d2d2d]">About NExT</h2>
            <img
              src="/img/next-fa25-team (1).jpeg"
              alt="NExT team"
              className="mt-3 h-[45%] w-full object-cover"
            />
            <p className="mt-3 text-sm leading-6 text-[#2d2d2d]">
              Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam
              rem aperiam.
            </p>
          </section>
        </div>

        <section className="mt-5 border border-[#c7c7c7] bg-[#d8d8d8] p-4 h-[clamp(180px,26vh,280px)]">
          <h2 className="border-b border-[#b5b5b5] pb-1 text-3xl text-[#2d2d2d]">My Applications</h2>
          <div className="mt-3 grid grid-cols-[1.4fr_1fr_1fr] gap-x-6 text-[22px] text-[#2d2d2d]">
            <p>Job 1</p>
            <p>Status</p>
            <p>Date Applied</p>
          </div>
        </section>
      </main>
    </div>
  );
}
