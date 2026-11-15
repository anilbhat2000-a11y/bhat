import { connection } from "next/server";
import ExcelJS from "exceljs";
import { currentUser } from "../../../../lib/auth/current-user";
import { trainingReport, filterTrainingReport, parseTrainingFilters } from "../../../../lib/reports/training";

const day = (d: Date | null) => (d ? d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) : "");

// The employee training report as an Excel workbook: a summary per employee and every
// assigned training. Admins get everyone; managers get their reporting line.
export async function GET(request: Request) {
  await connection();
  const user = await currentUser();
  if (!user) return new Response("Not signed in", { status: 401 });
  if (user.role !== "ADMIN" && user.role !== "MANAGER") return new Response("Forbidden", { status: 403 });
  const url = new URL(request.url);
  const rows = filterTrainingReport(await trainingReport(user), parseTrainingFilters(Object.fromEntries(url.searchParams)));

  const wb = new ExcelJS.Workbook();
  wb.created = new Date();
  const header = (ws: ExcelJS.Worksheet) => {
    ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1701C1" } };
    ws.views = [{ state: "frozen", ySplit: 1 }];
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws.columnCount } };
  };

  const summary = wb.addWorksheet("Employees");
  summary.columns = [
    { header: "Employee", key: "name", width: 26 }, { header: "Email", key: "email", width: 30 }, { header: "Department", key: "department", width: 22 },
    { header: "Job title", key: "jobTitle", width: 22 }, { header: "Manager", key: "manager", width: 22 }, { header: "Assigned", key: "assigned", width: 10 },
    { header: "Completed", key: "completed", width: 11 }, { header: "In progress", key: "inProgress", width: 12 }, { header: "Not started", key: "notStarted", width: 12 },
    { header: "Overdue", key: "overdue", width: 10 }, { header: "Completion %", key: "completionPercent", width: 13 }, { header: "Average progress %", key: "progressPercent", width: 18 },
  ];
  for (const e of rows) summary.addRow(e);
  header(summary);

  const detail = wb.addWorksheet("Trainings");
  detail.columns = [
    { header: "Employee", key: "name", width: 26 }, { header: "Email", key: "email", width: 30 }, { header: "Department", key: "department", width: 22 },
    { header: "Training", key: "course", width: 44 }, { header: "Subject area", key: "subject", width: 20 }, { header: "Assigned through", key: "via", width: 24 },
    { header: "Assigned on", key: "assignedAt", width: 14 }, { header: "Due by", key: "dueAt", width: 14 }, { header: "Lessons done", key: "lessonsDone", width: 13 },
    { header: "Lessons total", key: "lessonsTotal", width: 13 }, { header: "Progress %", key: "percent", width: 11 }, { header: "Status", key: "status", width: 13 },
    { header: "Completed on", key: "completedAt", width: 14 },
  ];
  for (const e of rows) {
    for (const t of e.trainings) {
      detail.addRow({ name: e.name, email: e.email, department: e.department, course: t.course, subject: t.subject, via: t.assignedVia,
        assignedAt: day(t.assignedAt), dueAt: t.dueAt ? day(t.dueAt) : "No due date", lessonsDone: t.lessonsDone, lessonsTotal: t.lessonsTotal,
        percent: t.percent, status: t.status, completedAt: day(t.completedAt) });
    }
  }
  header(detail);

  const body = Buffer.from(await wb.xlsx.writeBuffer());
  const stamp = new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);
  return new Response(body, {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="training-report-${stamp}.xlsx"`,
      "cache-control": "private, no-store",
    },
  });
}
