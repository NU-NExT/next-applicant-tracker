import { useEffect, useState } from "react";

import { getMyRepositoryRequests, type RepositoryRequestRecord } from "../api";
import { Header } from "../components/header";

export function ApplicantDashboardPage() {
  const [applications, setApplications] = useState<RepositoryRequestRecord[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("auth_access_token");
    if (!token) {
      setApplications([]);
      return;
    }
    void (async () => {
      try {
        const rows = await getMyRepositoryRequests(token);
        setApplications(rows);
      } catch {
        setApplications([]);
      }
    })();
  }, []);

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
          {applications.length > 0 ? (
            <div className="mt-3 space-y-2 text-[#2d2d2d]">
              {applications.map((app) => (
                <div key={app.id} className="grid grid-cols-[1fr_1fr_1fr] gap-x-6 text-[18px]">
                  <p>Application #{app.id}</p>
                  <p>{app.status}</p>
                  <p>{new Date(app.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-lg text-[#2d2d2d]">No submitted applications yet.</p>
          )}
        </section>
      </main>
    </div>
  );
}
