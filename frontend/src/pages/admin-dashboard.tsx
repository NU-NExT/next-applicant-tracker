import { Header } from "../components/header";

export function AdminDashboardPage() {
  return (
    <div className="min-h-screen bg-[#ececec]">
      <Header />

      <main className="mx-auto max-w-[1200px] px-4 pb-6 pt-24">
        <h1 className="mb-4 text-5xl font-medium text-[#1f1f1f]">Welcome, JCD!</h1>

        <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
          <section className="border border-[#c7c7c7] bg-[#d8d8d8] p-4 h-[clamp(220px,34vh,360px)]">
            <h2 className="border-b border-[#b5b5b5] pb-1 text-3xl text-[#2d2d2d]">Open Roles</h2>
            <div className="mt-3 space-y-3 text-[22px] text-[#2d2d2d]">
              <div className="grid grid-cols-[1.2fr_1fr_1fr]">
                <p className="underline">Job 1</p>
                <p className="underline">Status</p>
                <p className="underline">Date Opened</p>
              </div>
              <div className="grid grid-cols-[1.2fr_1fr_1fr]">
                <p className="underline">Job 2</p>
                <p className="underline">Status</p>
                <p className="underline">Date Opened</p>
              </div>
              <div className="grid grid-cols-[1.2fr_1fr_1fr]">
                <p className="underline">Job 3</p>
                <p className="underline">Status</p>
                <p className="underline">Date Opened</p>
              </div>
            </div>
          </section>

          <section className="border border-[#c7c7c7] bg-[#d8d8d8] p-4 h-[clamp(220px,34vh,360px)]">
            <h2 className="border-b border-[#b5b5b5] pb-1 text-3xl text-[#2d2d2d]">Quick Actions</h2>
            <div className="mt-4 flex flex-col gap-3">
              <button className="w-fit rounded-md bg-[#1f6f5f] px-4 py-2 text-lg text-white">Create New Job Post</button>
              <button className="w-fit rounded-md bg-[#1f6f5f] px-4 py-2 text-lg text-white">View Fall 2025 Applicant Stats</button>
              <button className="w-fit rounded-md bg-[#1f6f5f] px-4 py-2 text-lg text-white">Edit a Job Post</button>
              <button className="w-fit rounded-md bg-[#1f6f5f] px-4 py-2 text-lg text-white">Review Applications for [JOB 1]</button>
            </div>
          </section>
        </div>

        <section className="mt-5 border border-[#c7c7c7] bg-[#d8d8d8] p-4 h-[clamp(180px,26vh,280px)]">
          <h2 className="border-b border-[#b5b5b5] pb-1 text-3xl text-[#2d2d2d]">Past Applications</h2>
          <div className="mt-3 grid grid-cols-[1.4fr_1fr_1fr] gap-x-6 text-[22px] text-[#2d2d2d]">
            <p>Job 1</p>
            <p>Status</p>
            <p>Date Closed</p>
          </div>
        </section>
      </main>
    </div>
  );
}
