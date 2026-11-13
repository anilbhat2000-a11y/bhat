import { connection } from "next/server";
import { currentUser } from "../../../../lib/auth/current-user";
import { certificationRows, companyHealthRows } from "../../../../lib/reports/queries";
import { toCsv } from "../../../../lib/reports/aggregate";

const COLUMNS = ["name", "email", "department", "subject", "level", "issued", "expires", "status"] as const;
const HEALTH_COLUMNS = ["department", "attempts", "passed", "pass_rate_percent", "overdue_periods"] as const;

// Admins get every report. Managers get only their team's certifications.
export async function GET(_request: Request, { params }: { params: Promise<{ report: string }> }) {
  await connection();
  const user = await currentUser();
  if (!user) return new Response("Not signed in", { status: 401 });
  const { report } = await params;

  let rows: Record<string, unknown>[] | null = null;
  let columns: readonly string[] = COLUMNS;
  if (report === "certifications" && user.role === "ADMIN") {
    rows = (await certificationRows(user)).map((r) => Object.fromEntries(COLUMNS.map((c) => [c, r[c]])));
  } else if (report === "team" && (user.role === "MANAGER" || user.role === "ADMIN")) {
    rows = (await certificationRows(user)).map((r) => Object.fromEntries(COLUMNS.map((c) => [c, r[c]])));
  } else if (report === "company-health" && user.role === "ADMIN") {
    rows = (await companyHealthRows(user)) as Record<string, unknown>[];
    columns = HEALTH_COLUMNS;
  } else if (["certifications", "company-health", "team"].includes(report)) {
    return new Response("Forbidden", { status: 403 });
  }
  if (rows === null) return new Response("Not found", { status: 404 });

  return new Response(toCsv(rows, columns), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${report}.csv"`,
      "cache-control": "private, no-store",
    },
  });
}
