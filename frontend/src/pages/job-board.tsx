import { useEffect, useMemo, useState } from "react";
import { Header } from "../components/header";
import { getJobData, type JobDataRecord } from "../api";

const fallbackJobs = [
  {
    jobId: "1",
    role: "Job 1",
    semester: "Semester I Year",
    published: "Published XX/XX/XXXX",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
  },
];

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

  const jobs = useMemo(() => {
    if (apiJobs.length === 0) {
      return fallbackJobs;
    }

    return apiJobs.map((job) => ({
      jobId: String(job.id),
      role: job.role,
      semester: job.semester,
      published: `Published ${new Date(job.release_date).toLocaleDateString()}`,
      description: job.description,
    }));
  }, [apiJobs]);

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="relative overflow-hidden h-[600px]">
        <img
          src="/img/next-fa25-team (1).jpeg"
          alt="NExT team"
          className="h-full w-full object-cover opacity-90"
          />
        <div className="absolute inset-0 bg-black/25" />
      </div>

      <div className="absolute inset-0 flex items-center justify-center">
        <h2 className="text-white text-[100px] font-bold p-4 top-1/2 transform -translate-y-1/2">
          Open Roles
        </h2>
      </div>

      <section id="open-roles" className="mx-auto mt-3 max-w-[1140px] px-5 pb-8">
        <ul className="list-none p-0">
          {jobs.map((job) => (
            <li key={`${job.jobId}-${job.role}`} className="border-b border-[#8e8e8e] py-6">
              <div className="flex items-start justify-between">
                <a href={`/jobs/${job.jobId}/login`} className="text-[40px] font-semibold text-[#1f6f5f] no-underline">
                  {job.role}
                </a>
                <div className="text-right">
                  <p className="text-[40px] leading-none font-semibold text-[#1f6f5f]">{job.semester}</p>
                  <p className="mt-1 text-lg text-[#7f7f7f]">{job.published}</p>
                </div>
              </div>
              <p className="mt-4 max-w-[95%] text-base leading-relaxed text-[#2a2a2a]">{job.description}</p>
              <p className="mt-3 max-w-[95%] text-base leading-relaxed text-[#2a2a2a]">
                Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo
                consequat. Duis aute irure
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
