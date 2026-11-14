import { connection } from "next/server";
import { notFound } from "next/navigation";
import { guardPortal } from "../../../../../../lib/auth/portal";
import { prisma } from "../../../../../../lib/db/client";
import { LessonText } from "../../../../../../components/LessonText";
import { updateLessonTextAction } from "../../../../../actions/courses";

// Edit a text lesson's title and content by hand. The previous version is kept in the audit log.
export default async function EditLessonPage({ params, searchParams }: { params: Promise<{ id: string; lessonId: string }>; searchParams: Promise<{ error?: string; notice?: string }> }) {
  await connection();
  await guardPortal(["ADMIN"]);
  const { id, lessonId } = await params;
  const sp = await searchParams;
  const lesson = await prisma.lesson.findFirst({ where: { id: lessonId, courseId: id }, include: { course: { select: { title: true } } } });
  if (!lesson) notFound();
  return (
    <main className="page">
      <p><a href={`/admin/courses/${id}`}>← {lesson.course.title}</a></p>
      <h1>Edit lesson</h1>
      {sp.error ? <p role="alert">{sp.error}</p> : null}
      {sp.notice ? <p role="status">{sp.notice}</p> : null}
      {lesson.type !== "TEXT" ? <p role="alert">Only text lessons can be edited here. Replace a file lesson by uploading a new file on the course page.</p> : (
        <>
          <p className="muted">Formatting: a blank line starts a paragraph; &quot;- &quot; a bullet; &quot;1. &quot; a numbered step; &quot;## &quot; a heading; &quot;&gt; &quot; a highlighted note; **bold**, *italic*. Or let the <a href={`/admin/ai?lesson=${lesson.id}`}>AI assistant</a> suggest an improved version.</p>
          <div className="ai-two">
            <form action={updateLessonTextAction} data-test="edit-lesson" className="card">
              <input type="hidden" name="courseId" value={id} />
              <input type="hidden" name="lessonId" value={lesson.id} />
              <label>Title <input name="title" defaultValue={lesson.title} required aria-label="Lesson title" style={{ width: "100%" }} /></label>
              <label>Text<textarea name="body" rows={30} defaultValue={lesson.body ?? ""} required aria-label="Lesson text" className="ai-body" /></label>
              <button type="submit">Save lesson</button>
            </form>
            <div><span className="muted">Current version as learners see it</span><div className="card ai-preview"><LessonText body={lesson.body ?? ""} /></div></div>
          </div>
        </>
      )}
    </main>
  );
}
