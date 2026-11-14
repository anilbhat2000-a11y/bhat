import { connection } from "next/server";
import { guardPortal } from "../../../../lib/auth/portal";
import { prisma } from "../../../../lib/db/client";
import { ACCEPT_ATTRIBUTE, FORMAT_LIST } from "../../../../lib/storage/formats";
import { QUESTION_FILE_ACCEPT } from "../../../../lib/import/question-files";

// Upload a course: an admin builds a course from their own PDF and MP4 files and chooses
// the departments it is for. The form posts to /api/upload/course (streamed upload).
export default async function UploadCoursePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await connection();
  await guardPortal(["ADMIN"]);
  const { error } = await searchParams;
  const [subjects, people] = await Promise.all([
    prisma.subject.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { active: true }, select: { department: true } }),
  ]);
  const departments = [...new Set(people.map((p) => p.department).filter((x): x is string => !!x))].sort();
  const docMb = Number(process.env.MAX_UPLOAD_MB_DOC ?? 50);
  const videoMb = Number(process.env.MAX_UPLOAD_MB_VIDEO ?? 500);
  const officeMb = Number(process.env.MAX_UPLOAD_MB_OFFICE ?? 100);

  return (
    <main className="page">
      <p><a href="/admin/courses">← Courses</a></p>
      <h1>Upload a course</h1>
      <p>Turn your own training material into a course. Each file becomes one lesson, in the order you choose them: {FORMAT_LIST}. PowerPoint, Word and Excel files are converted to PDF so learners can read them in the browser, and MOV or MKV videos to MP4; learners can also download the original. You can rename, reorder and add lessons and modules afterwards.</p>
      <p className="muted">Creating many courses at once? Use <a href="/admin/courses/bulk">Bulk upload from Excel</a>.</p>
      {error ? <p role="alert">{error}</p> : null}

      <form data-test="upload-course" action="/api/upload/course" method="post" encType="multipart/form-data" className="card">
        <fieldset>
          <legend>1. About the course</legend>
          <label>Course title <input name="title" required maxLength={200} aria-label="Course title" /></label>
          <br />
          <label>Subject{" "}
            <select name="subjectId" required defaultValue="" aria-label="Subject">
              <option value="" disabled>Choose a subject</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>{" "}
          <label>Level{" "}
            <select name="level" defaultValue="BASIC" aria-label="Level">
              <option value="BASIC">Basic</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="ADVANCED">Advanced</option>
            </select>
          </label>
          <br />
          <label>Short description <input name="description" maxLength={500} aria-label="Short description" style={{ width: "100%", maxWidth: 560 }} /></label>
        </fieldset>

        <fieldset>
          <legend>2. Which departments is it for?</legend>
          <small className="fieldset-help">Leave every box empty to show the course to everyone in the company.</small>
          <div className="check-grid">
            {departments.map((d) => (
              <label key={d}><input type="checkbox" name="department" value={d} /> {d}</label>
            ))}
          </div>
          <label>Other departments (comma-separated) <input name="otherDepartments" aria-label="Other departments" /></label>
        </fieldset>

        <fieldset>
          <legend>3. Publish and assign</legend>
          <div className="check-grid" style={{ gridTemplateColumns: "1fr" }}>
            <label><input type="checkbox" name="publish" /> Publish now (otherwise it is saved as a draft for review)</label>
            <label><input type="checkbox" name="mandatory" /> Make it mandatory for the departments above (needs Publish now)</label>
          </div>
          <label>Due date (optional) <input type="date" name="dueDate" aria-label="Due date" /></label>
          <p><small>Videos need a caption file before a course can be published. A course with videos is saved as a draft; add captions on the course page, then publish.</small></p>
        </fieldset>

        <fieldset>
          <legend>4. Course files</legend>
          <label>Lesson files (up to 30){" "}
            <input type="file" name="files" multiple required accept={ACCEPT_ATTRIBUTE} aria-label="Course files" />
          </label>
          <small className="fieldset-help">Size limits: PDF {docMb} MB, PowerPoint, Word and Excel {officeMb} MB, video {videoMb} MB each. Name files in order, for example &quot;01 Introduction.pptx&quot;, &quot;02 Process.pdf&quot;: the file name becomes the lesson title.</small>
        </fieldset>

        <fieldset>
          <legend>5. Completion check questions (optional)</legend>
          <label>Questions file{" "}
            <input type="file" name="questions" accept={QUESTION_FILE_ACCEPT} aria-label="Questions file" />
          </label>
          <small className="fieldset-help">Excel (.xlsx, .xls), CSV or Word (.docx, .doc). Learners take the completion check after finishing every lesson. <a href="/api/templates/questions">Excel template</a> · <a href="/api/templates/questions-word">Word example</a></small>
        </fieldset>

        <button type="submit">Upload and create course</button>
      </form>
    </main>
  );
}
