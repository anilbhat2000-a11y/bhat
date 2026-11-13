import { connection } from "next/server";
import { guardPortal } from "../../../../lib/auth/portal";
import { notFound } from "next/navigation";
import { prisma } from "../../../../lib/db/client";
import { addLessonAction, moveLessonAction, setPublishedAction } from "../../../actions/courses";
import { markAttendanceAction } from "../../../actions/live";
import { LocalTime } from "../../../../components/LocalTime";
import { ScheduleSessionForm } from "../../../../components/ScheduleSessionForm";
import { attachCaptionAction } from "../../../actions/courses";
import { LessonReorder } from "../../../../components/LessonReorder";
import { deleteCourseAction, updateCourseAction } from "../../../actions/account";

export default async function CoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  await connection();
  await guardPortal(["ADMIN"]);
  const { id } = await params;
  const { error, notice } = await searchParams;
  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      lessons: { orderBy: { position: "asc" }, include: { liveSession: { include: { registrations: { include: { user: true } } } } } },
    },
  });
  if (!course) notFound();
  const instructors = await prisma.instructor.findMany({ where: { active: true }, orderBy: { name: "asc" } });

  return (
    <main style={{ padding: "16px", fontFamily: "system-ui, sans-serif" }}>
      <h1>{course.title}</h1>
      <p>Status: {course.status === "PUBLISHED" ? "Published" : "Draft"}</p>
      {error ? <p role="alert">{error}</p> : null}
      {notice ? <p role="status">{notice}</p> : null}

      <form action={updateCourseAction}>
        <input type="hidden" name="id" value={course.id} />
        <label>Title <input aria-label="Title" name="title" defaultValue={course.title} required /></label>{" "}
        <label>Description <input aria-label="Description" name="description" defaultValue={course.description ?? ""} /></label>{" "}
        <label>Level
          <select aria-label="Level" name="level" defaultValue={course.level}>
            <option value="BASIC">Basic</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="ADVANCED">Advanced</option>
          </select>
        </label>{" "}
        <label>Pass mark <input aria-label="Pass mark percent" name="passMarkPercent" type="number" min={1} max={100} defaultValue={course.passMarkPercent} /></label>{" "}
        <button type="submit">Save course</button>
      </form>
      {course.status === "DRAFT" ? (
        <form action={deleteCourseAction}>
          <input type="hidden" name="id" value={course.id} />
          <button type="submit">Delete this draft course</button>
        </form>
      ) : null}

      <form data-test="publish" action={setPublishedAction}>
        <input type="hidden" name="courseId" value={course.id} />
        <input type="hidden" name="published" value={course.status === "PUBLISHED" ? "false" : "true"} />
        <button type="submit">{course.status === "PUBLISHED" ? "Unpublish" : "Publish"}</button>
      </form>

      <h2>Lessons</h2>
      <LessonReorder
        courseId={course.id}
        lessons={course.lessons.map((l) => ({ id: l.id, title: l.title, type: l.type + (l.type === "VIDEO" ? (l.captionFileKey ? ", captions added" : ", captions needed to publish") : "") }))}
      />

      <h2>Add a text, link, lab, or live session lesson</h2>
      <p>For a lab, the text is the instructions, with one '- [ ] step' line per checklist item.</p>
      <form data-test="add-lesson" action={addLessonAction}>
        <input type="hidden" name="courseId" value={course.id} />
        <input aria-label="Title" name="title" placeholder="Title" required />{" "}
        <select aria-label="Type" name="type" defaultValue="TEXT">
          <option value="TEXT">Text</option>
          <option value="LINK">Link</option>
          <option value="LAB">Hands-on lab (checklist)</option>
          <option value="LIVE_SESSION">Live session</option>
        </select>
        <br />
        <textarea aria-label="Lesson text (for text lessons)" name="body" rows={4} cols={60} placeholder="Lesson text (for text lessons)" />
        <br />
        <input aria-label="https://… (for link lessons)" name="url" type="url" placeholder="https://… (for link lessons)" />{" "}
        <button type="submit">Add lesson</button>
      </form>

      {course.lessons.filter((l) => l.type === "LIVE_SESSION").map((l) => (
        <section key={`live-${l.id}`}>
          <h2>Live session: {l.title}</h2>
          {l.liveSession ? (
            <>
              <p><LocalTime iso={l.liveSession.startsAt.toISOString()} /> to <LocalTime iso={l.liveSession.endsAt.toISOString()} /> · {l.liveSession.registrations.length} registered{l.liveSession.capacity !== null ? ` of ${l.liveSession.capacity}` : ""}</p>
              <form action={markAttendanceAction}>
                <input type="hidden" name="sessionId" value={l.liveSession.id} />
                {l.liveSession.registrations.map((r) => (
                  <label key={r.id} style={{ display: "block" }}>
                    <input type="checkbox" name="attendeeIds" value={r.userId} defaultChecked={r.attended} /> {r.user.name}
                  </label>
                ))}
                <button type="submit">Save attendance</button>
              </form>
            </>
          ) : <p>Not scheduled yet.</p>}
          <ScheduleSessionForm lessonId={l.id} instructors={instructors} />
        </section>
      ))}

      {course.lessons.filter((l) => l.type === "VIDEO").map((l) => (
        <form key={`cap-${l.id}`} action={attachCaptionAction} encType="multipart/form-data">
          <input type="hidden" name="lessonId" value={l.id} />
          <label>Captions for {l.title} (.vtt) <input aria-label="Captions" name="captions" type="file" accept=".vtt,text/vtt" required /></label>{" "}
          <button type="submit">Upload captions</button>
        </form>
      ))}

      <h2>Upload a file lesson</h2>
      <form data-test="upload-lesson" action="/api/upload/lesson" method="post" encType="multipart/form-data">
        <input type="hidden" name="courseId" value={course.id} />
        <input aria-label="Title" name="title" placeholder="Title" required />{" "}
        <select aria-label="Type" name="type" defaultValue="PDF">
          <option value="PDF">PDF document</option>
          <option value="VIDEO">Video (MP4)</option>
        </select>{" "}
        <input aria-label="File" name="file" type="file" accept="application/pdf,video/mp4" required />{" "}
        <button type="submit">Upload</button>
      </form>
    </main>
  );
}
