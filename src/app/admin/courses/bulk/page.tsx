import { connection } from "next/server";
import { guardPortal } from "../../../../lib/auth/portal";
import { prisma } from "../../../../lib/db/client";
import type { BulkReport } from "../../../../lib/import/bulk-courses";
import { FORMAT_LIST } from "../../../../lib/storage/formats";

// Bulk course upload: download the template, fill it in, upload it with the lesson files.
export default async function BulkUploadPage({ searchParams }: { searchParams: Promise<{ report?: string }> }) {
  await connection();
  await guardPortal(["ADMIN"]);
  const { report: reportId } = await searchParams;
  const event = reportId
    ? await prisma.auditEvent.findFirst({ where: { id: reportId, entityType: "BulkUpload" } })
    : null;
  const report = event?.after as (BulkReport & { workbook?: string }) | null;

  return (
    <main className="page">
      <p><a href="/admin/courses">← Course catalogue</a></p>
      <h1>Bulk upload courses</h1>
      <p className="muted">Create many courses at once from one Excel workbook, with their modules, lessons and completion-check questions. For a single course, <a href="/admin/courses/upload">Upload a course</a> is quicker.</p>

      {report ? <Report report={report} /> : null}

      <section className="card" aria-labelledby="h-step1">
        <h2 id="h-step1">1. Download and fill in the template</h2>
        <p><a className="btn" href="/api/templates/bulk-courses">Download the Excel template</a></p>
        <ul>
          <li><strong>Courses:</strong> one row per course: a short code (C1, C2 …), title, subject, level, description, departments, pass mark, publish (Yes/No), mandatory (Yes/No) and due date.</li>
          <li><strong>Modules</strong> (optional): course code, module number, title and minutes.</li>
          <li><strong>Lessons:</strong> one row per lesson, in order: course code, module number, title, type (<em>File</em>, <em>Text</em> or <em>Link</em>), and the file name, text or web address. Videos can name a .vtt captions file.</li>
          <li><strong>Questions</strong> (optional): course code plus type, question, options, correct answer, points and explanation, for each course&apos;s completion check.</li>
        </ul>
        <p className="muted">Lesson files can be {FORMAT_LIST}. PowerPoint, Word and Excel are converted to PDF, MOV and MKV to MP4, and the original is kept for download.</p>
      </section>

      <section className="card" aria-labelledby="h-step2">
        <h2 id="h-step2">2. Upload the workbook and the files</h2>
        <form data-test="bulk-upload" action="/api/upload/bulk" method="post" encType="multipart/form-data">
          <fieldset>
            <legend>Workbook</legend>
            <label>Filled-in template (.xlsx or .xls) <input type="file" name="workbook" accept=".xlsx,.xls" aria-label="Workbook" /></label>
          </fieldset>
          <fieldset>
            <legend>Lesson files: choose either or both</legend>
            <label>Lesson files (select them all, up to 500) <input type="file" name="files" multiple aria-label="Lesson files" /></label>
            <label>Or one ZIP file containing them <input type="file" name="package" accept=".zip,application/zip" aria-label="ZIP file" /></label>
            <small className="fieldset-help">File names must match the File name column exactly, including the extension. The workbook can also go inside the ZIP if its name contains &quot;courses&quot;, &quot;bulk&quot; or &quot;template&quot;.</small>
          </fieldset>
          <button type="submit">Upload and create courses</button>
        </form>
        <p className="muted">Everything is checked before anything is created. If something is wrong, nothing is created and you get a list of exactly what to fix. Large uploads can take several minutes; keep this page open.</p>
      </section>
    </main>
  );
}

function Report({ report }: { report: BulkReport & { workbook?: string } }) {
  if (!report.ok) {
    return (
      <section className="card report report-bad" aria-labelledby="h-report" role="alert">
        <h2 id="h-report">Nothing was created: {report.problems.length} thing{report.problems.length === 1 ? "" : "s"} to fix</h2>
        <p>Fix these in {report.workbook ? <strong>{report.workbook}</strong> : "the workbook"} or the files, then upload again.</p>
        <table className="data">
          <thead><tr><th scope="col">Where</th><th scope="col">What to fix</th></tr></thead>
          <tbody>{report.problems.map((p, i) => <tr key={i}><td className="nowrap">{p.where}</td><td>{p.reason}</td></tr>)}</tbody>
        </table>
      </section>
    );
  }
  const total = report.courses.reduce((n, c) => ({ lessons: n.lessons + c.lessons, questions: n.questions + c.questions }), { lessons: 0, questions: 0 });
  return (
    <section className="card report report-ok" aria-labelledby="h-report" role="status">
      <h2 id="h-report">Created {report.courses.length} course{report.courses.length === 1 ? "" : "s"} with {total.lessons} lessons and {total.questions} questions</h2>
      <p className="muted">PowerPoint, Word, Excel, MOV and MKV files are being converted in the background; open a course to see their progress.</p>
      <table className="data">
        <thead><tr><th scope="col">Course</th><th scope="col" className="num">Modules</th><th scope="col" className="num">Lessons</th><th scope="col" className="num">Questions</th><th scope="col">Status</th><th scope="col">Notes</th></tr></thead>
        <tbody>
          {report.courses.map((c) => (
            <tr key={c.id}>
              <td><a href={`/admin/courses/${c.id}`}>{c.title}</a></td>
              <td className="num">{c.modules}</td><td className="num">{c.lessons}</td><td className="num">{c.questions}</td>
              <td><span className={c.status === "Published" ? "badge badge-ok" : "badge badge-draft"}>{c.status}</span></td>
              <td>{c.notes.join(". ") || "–"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {report.warnings.length > 0 ? <ul>{report.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul> : null}
    </section>
  );
}
