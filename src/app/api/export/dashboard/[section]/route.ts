import { connection } from "next/server";
import { currentUser } from "../../../../../lib/auth/current-user";
import { toCsv } from "../../../../../lib/reports/aggregate";
import { parseFilters } from "../../../../../lib/reports/analytics";
import { adminDashboard, SECTIONS, type Section } from "../../../../../lib/reports/dashboard";

// One admin dashboard table as CSV (opens in Excel), with the same filters as the page.
export async function GET(request: Request, { params }: { params: Promise<{ section: string }> }) {
  await connection();
  const user = await currentUser();
  if (!user) return new Response("Not signed in", { status: 401 });
  if (user.role !== "ADMIN") return new Response("Forbidden", { status: 403 });
  const { section } = await params;
  if (!SECTIONS.includes(section as Section)) return new Response("Not found", { status: 404 });
  const filters = parseFilters(Object.fromEntries(new URL(request.url).searchParams));
  const table = (await adminDashboard(user, filters))[section as Section];
  // A UTF-8 byte order mark lets Excel open names in Indian scripts correctly.
  return new Response("﻿" + toCsv(table.rows, table.columns), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${section}.csv"`,
      "cache-control": "private, no-store",
    },
  });
}
