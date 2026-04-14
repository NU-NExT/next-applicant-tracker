import { useEffect, useMemo, useState } from "react";
import { Header } from "../components/header";
import { getPublicJobListings, type PublicJobListingRecord } from "../api";
import { slugifyUrlValue } from "../lib/utils";

type JobBoardItem = {
  cycleSlug: string;
  title: string;
  detailUrl: string;
  role: string;
  detailLabel: string;
  description: string | null;
};

export function JobBoardPage() {
  const [apiJobs, setApiJobs] = useState<PublicJobListingRecord[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const data = await getPublicJobListings();
        setApiJobs(data);
      } catch {
        setApiJobs([]);
      }
    })();
  }, []);

  const jobs = useMemo<JobBoardItem[]>(() => {
    return apiJobs
      .map((job) => {
        const cycleSlug = (job.cycle_slug ?? "").trim().toLowerCase();
        const title = (job.position_title ?? "").trim();
        if (!cycleSlug || !title) {
          return null;
        }

        const startDate = new Date(job.target_start_date ?? "");
        const detailLabel = Number.isNaN(startDate.getTime())
          ? "Open Role"
          : `Starts ${startDate.toLocaleDateString()}`;
        const description = typeof job.description === "string" ? job.description.trim() : "";

        return {
          cycleSlug,
          title,
          detailUrl: `/jobs/${cycleSlug}/${slugifyUrlValue(title)}`,
          role: title || "Untitled role",
          detailLabel,
          description: description.length > 0 ? description : null,
        };
      })
      .filter((job): job is JobBoardItem => job !== null);
  }, [apiJobs]);

  const hasJobs = jobs.length > 0;

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="relative h-[600px] overflow-hidden">
        <img src="/img/next-fa25-team (1).jpeg" alt="NExT team" className="h-full w-full object-cover opacity-90" />
        <div className="absolute inset-0 bg-black/25" />
        <div className="absolute inset-0 flex items-center justify-center">
          <h2 className="p-4 text-[100px] font-bold text-white">Open Roles</h2>
        </div>
      </div>

      <section id="open-roles" className="mx-auto mt-3 max-w-[1140px] px-5 pb-8">
        {!hasJobs ? (
          <p className="py-6 text-lg text-[#2a2a2a]">No jobs found.</p>
        ) : (
          <ul className="list-none p-0">
            {jobs.map((job) => (
              <li key={`${job.cycleSlug}-${job.title}`} className="border-b border-[#8e8e8e] py-6">
                <div className="flex items-start justify-between">
                  <a href={job.detailUrl} className="text-[40px] font-semibold text-[#1f6f5f] no-underline">
                    {job.role}
                  </a>
                  <div className="text-right">
                    <p className="text-[24px] leading-none font-semibold text-[#1f6f5f]">{job.detailLabel}</p>
                  </div>
                </div>
                {job.description ? (
                  <p className="mt-4 max-w-[95%] text-base leading-relaxed text-[#2a2a2a]">{job.description}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
