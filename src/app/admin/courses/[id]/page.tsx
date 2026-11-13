import { connection } from "next/server";
import { notFound } from "next/navigation";
import { prisma } from "../../../../lib/db/client";
import { addLessonAction, moveLessonAction, setPublishedAction, uploadLessonAction } from "../../../actions/courses";

export default async function CoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  await connection();
  const { id } = await params;
  const { error, notice } = await searchParams;
  const course = await prisma.course.findUnique({
    where: { id },
    include: { lessons: { orderBy: { position: "asc" } } },
  });
  if (!course) notFound();

  return (
    <main style={{ padding: "16px", fontFamily: "system-ui, sans-serif" }}>
      <h1>{course.title}</h1>
      <p>Status: {course.status === "PUBLISHED" ? "Published" : "Draft"}</p>
      {error ? <p role="alert">{error}</p> : null}
      {notice ? <p role="status">{notice}</p> : null}

      <form data-test="publish" action={setPublishedAction}>
        <input type="hidden" name="courseId" value={course.id} />
        <input type="hidden" name="published" value={course.status === "PUBLISHED" ? "false" : "true"} />
        <button type="submit">{course.status === "PUBLISHED" ? "Unpublish" : "Publish"}</button>
      </form>

      <h2>Lessons</h2>
      <ol>
        {course.lessons.map((l) => (
          <li key={l.id}>
            {l.title} <small>({l.type})</small>{" "}
            <form action={moveLessonAction} style={{ display: "inline" }}>
              <input type="hidden" name="lessonId" value={l.id} />
              <button name="direction" value="up" type="submit">Up</button>
              <button name="direction" value="down" type="submit">Down</button>
            </form>
          </li>
        ))}
      </ol>

      <h2>Add a text or link lesson</h2>
      <form data-test="add-lesson" action={addLessonAction}>
        <input type="hidden" name="courseId" value={course.id} />
        <input name="title" placeholder="Title" required />{" "}
        <select name="type" defaultValue="TEXT">
          <option value="TEXT">Text</option>
          <option value="LINK">Link</option>
        </select>
        <br />
        <textarea name="body" rows={4} cols={60} placeholder="Lesson text (for text lessons)" />
        <br />
        <input name="url" type="url" placeholder="https://… (for link lessons)" />{" "}
        <button type="submit">Add lesson</button>
      </form>

      <h2>Upload a file lesson</h2>
      <form data-test="upload-lesson" action={uploadLessonAction} encType="multipart/form-data">
        <input type="hidden" name="courseId" value={course.id} />
        <input name="title" placeholder="Title" required />{" "}
        <select name="type" defaultValue="PDF">
          <option value="PDF">PDF document</option>
          <option value="VIDEO">Video (MP4)</option>
        </select>{" "}
        <input name="file" type="file" accept="application/pdf,video/mp4" required />{" "}
        <button type="submit">Upload</button>
      </form>
    </main>
  );
}
