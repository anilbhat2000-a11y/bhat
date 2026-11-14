import { connection } from "next/server";
import { currentUser } from "../../../../lib/auth/current-user";
import { prisma } from "../../../../lib/db/client";
import { bulkCourseTemplate, questionsTemplate, questionsWordExample } from "../../../../lib/import/templates";

const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

// Templates for question import and bulk course upload. Admins only.
export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  await connection();
  const user = await currentUser();
  if (!user || user.role !== "ADMIN") return new Response("Not found", { status: 404 });
  const { name } = await params;
  let body: Buffer;
  let type = XLSX;
  let filename: string;
  if (name === "questions") {
    body = await questionsTemplate();
    filename = "questions-template.xlsx";
  } else if (name === "questions-word") {
    body = await questionsWordExample();
    type = DOCX;
    filename = "questions-word-example.docx";
  } else if (name === "bulk-courses") {
    const [subjects, people] = await Promise.all([
      prisma.subject.findMany({ orderBy: { name: "asc" }, select: { name: true } }),
      prisma.user.findMany({ where: { active: true }, select: { department: true } }),
    ]);
    const departments = [...new Set(people.map((p) => p.department).filter((d): d is string => !!d))].sort();
    body = await bulkCourseTemplate(subjects.map((s) => s.name), departments);
    filename = "bulk-course-upload-template.xlsx";
  } else {
    return new Response("Not found", { status: 404 });
  }
  return new Response(new Uint8Array(body), {
    headers: { "content-type": type, "content-disposition": `attachment; filename="${filename}"`, "cache-control": "no-store", "x-content-type-options": "nosniff" },
  });
}
