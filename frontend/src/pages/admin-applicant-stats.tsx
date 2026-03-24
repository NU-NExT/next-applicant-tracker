import { useEffect, useState } from "react";

import { getRepositoryRequests, type RepositoryRequestRecord } from "../api";
import { Header } from "../components/header";

export function AdminApplicantStatsPage() {
  const [submissions, setSubmissions] = useState<RepositoryRequestRecord[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        setSubmissions(await getRepositoryRequests());
      } catch {
        setSubmissions([]);
      }
    })();
  }, []);

  const extract = (key: "gender" | "ethnicity" | "disability"): Record<string, number> => {
    const totals: Record<string, number> = {};
    submissions.forEach((submission) => {
      try {
        const parsed = JSON.parse(submission.responses_json) as { demographics?: Record<string, string> };
        const value = parsed.demographics?.[key] ?? "Unknown";
        totals[value] = (totals[value] ?? 0) + 1;
      } catch {
        totals.Unknown = (totals.Unknown ?? 0) + 1;
      }
    });
    return totals;
  };

  const gender = extract("gender");
  const ethnicity = extract("ethnicity");
  const disability = extract("disability");

  return (
    <div className="min-h-screen bg-[#ececec]">
      <Header />
      <main className="mx-auto max-w-[1100px] px-4 pt-24">
        <section className="rounded border border-[#c7c7c7] bg-[#d8d8d8] p-5">
          <h1 className="text-4xl font-semibold text-[#1f1f1f]">Applicant Stats</h1>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <StatPie
              title="Gender"
              values={gender}
              colors={["#1f6f5f", "#3a8f7d", "#73b3a7", "#a9d3cc", "#d6ece8"]}
            />
            <StatPie
              title="Ethnicity"
              values={ethnicity}
              colors={["#2b3f6b", "#3f5f8f", "#6688b5", "#9cb4d3", "#d5dfef"]}
            />
            <StatPie
              title="Disability"
              values={disability}
              colors={["#5a2b6b", "#7c4892", "#9b6bb5", "#c3a0d6", "#eadcf2"]}
            />
          </div>
        </section>
      </main>
    </div>
  );
}

type StatPieProps = {
  title: string;
  values: Record<string, number>;
  colors: string[];
};

function StatPie({ title, values, colors }: StatPieProps) {
  const entries = Object.entries(values);
  const total = entries.reduce((acc, [, value]) => acc + value, 0) || 1;

  let start = 0;
  const segments = entries.map(([, value], idx) => {
    const pct = (value / total) * 100;
    const end = start + pct;
    const segment = `${colors[idx % colors.length]} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
    start = end;
    return segment;
  });

  const gradient = `conic-gradient(${segments.join(", ")})`;

  return (
    <div className="rounded border border-[#bdbdbd] bg-white p-4">
      <h2 className="text-2xl font-semibold text-[#1f1f1f]">{title}</h2>
      <div className="mt-3 flex justify-center">
        <div className="h-36 w-36 rounded-full border border-[#b5b5b5]" style={{ background: gradient }} />
      </div>
      <div className="mt-3 space-y-1 text-sm text-[#2d2d2d]">
        {entries.map(([label], idx) => (
          <div key={label} className="flex items-center gap-2">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: colors[idx % colors.length] }}
            />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
