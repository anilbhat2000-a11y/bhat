import { connection } from "next/server";
import { guardPortal } from "../../../../lib/auth/portal";
import { trainingReport, filterTrainingReport, parseTrainingFilters } from "../../../../lib/reports/training";
import { TrainingReport } from "../../../../components/TrainingReport";
import { PrintButton } from "../../../../components/PrintButton";

export default async function AdminTrainingReport({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const viewer = await guardPortal(["ADMIN"]);
  const sp = await searchParams;
  const filters = parseTrainingFilters(sp);
  const all = await trainingReport(viewer);
  const departments = [...new Set(all.map((e) => e.department).filter(Boolean))].sort();
  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1>Employee training report</h1>
          <p className="muted">Each employee&apos;s assigned trainings, the assignment period, what they have completed and their percentage of completion. Click an employee to see their trainings.</p>
        </div>
        <div className="page-actions no-print"><a className="btn-outline" href="/admin/dashboard">Other reports</a><PrintButton /></div>
      </div>
      <TrainingReport rows={filterTrainingReport(all, filters)} all={all.length} filters={filters} departments={departments}
        page={Number(sp.page) || 1} basePath="/admin/reports/training" exportHref="/api/export/training" scopeNote="All active employees." />
    </main>
  );
}
