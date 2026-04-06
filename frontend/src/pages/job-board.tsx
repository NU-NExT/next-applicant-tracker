import { useEffect, useMemo, useState } from "react";
import { Header } from "../components/header";
import { getJobData, type JobDataRecord } from "../api";

type JobBoardItem = {
  jobId: string;
  role: string;
  semester: string;
  published: string | null;
  description: string | null;
};

export function JobBoardPage() {
  const [apiJobs, setApiJobs] = useState<JobDataRecord[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const data = await getJobData();
        setApiJobs(data);
      } catch {
        setApiJobs([]);
      }
    })();
  }, []);

  const jobs = useMemo<JobBoardItem[]>(() => {
    return apiJobs
      .map((job) => {
        const rawId = job.metadata_id ?? job.id;
        if (rawId === undefined || rawId === null) {
          return null;
        }

        const releaseDate = new Date(job.release_date);
        const published = Number.isNaN(releaseDate.getTime())
          ? null
          : `Published ${releaseDate.toLocaleDateString()}`;
        const description = typeof job.description === "string" ? job.description.trim() : "";

        return {
          jobId: String(rawId),
          role: job.role?.trim() || "Untitled role",
          semester: job.semester?.trim() || "Semester TBD",
          published,
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
              <li key={`${job.jobId}-${job.role}`} className="border-b border-[#8e8e8e] py-6">
                <div className="flex items-start justify-between">
                  <a href={`/jobs/${job.jobId}/login`} className="text-[40px] font-semibold text-[#1f6f5f] no-underline">
                    {job.role}
                  </a>
                  <div className="text-right">
                    <p className="text-[40px] leading-none font-semibold text-[#1f6f5f]">{job.semester}</p>
                    {job.published ? <p className="mt-1 text-lg text-[#7f7f7f]">{job.published}</p> : null}
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
