import { useEffect, useMemo, useState } from "react";
import { Header } from "./components/header";
import { getJobData, type JobDataRecord } from "./api";

const fallbackJobs = [
  {
    role: "Job 1",
    semester: "Semester I Year",
    published: "Published XX/XX/XXXX",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
  },
  {
    role: "Job 2",
    semester: "Semester II Year",
    published: "Published XX/XX/XXXX",
    description:
      "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
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
      role: job.role,
      semester: job.semester,
      published: `Published ${new Date(job.release_date).toLocaleDateString()}`,
      description: job.description,
    }));
  }, [apiJobs]);

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <section className="grid min-h-[330px] grid-cols-[35%_65%] bg-[#17191b] pt-16 text-white">
        <aside className="flex flex-col justify-center gap-3.5 px-12 py-10">
          <img src="/img/NExT Logo Lockup.svg" alt="NExT logo" className="h-[200px] w-auto object-contain" />
          <h2 className="text-[42px] leading-tight">Join the Team</h2>
          <a
            href="#open-roles"
            className="mt-1 inline-flex h-[40px] w-[108px] items-center justify-center rounded-[6px] bg-[#1f6f5f] text-sm"
          >
            View Jobs
          </a>
        </aside>

        <div className="relative overflow-hidden">
          <img
            src="/img/next-fa25-team (1).jpeg"
            alt="NExT team"
            className="h-full w-full object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-black/25" />
        </div>
      </section>

      <section id="open-roles" className="mx-auto mt-3 max-w-[1140px] px-5 pb-8">
        <h1 className="mb-8 text-center text-[54px] font-normal text-[#222]">Open Roles</h1>

        <ul className="list-none p-0">
          {jobs.map((job) => (
            <li key={job.role} className="border-b border-[#8e8e8e] py-6">
              <div className="flex items-start justify-between">
                <h2 className="text-[40px] font-semibold text-[#1f6f5f]">{job.role}</h2>
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
