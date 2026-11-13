import { connection } from "next/server";
import { guardPortal } from "../../../../lib/auth/portal";
import { notFound } from "next/navigation";
import { prisma } from "../../../../lib/db/client";
import { addLessonAction, addModuleAction, assignModulesAction, deleteModuleAction, setArchivedAction, setPublishedAction } from "../../../actions/courses";

const STATUS_LABEL = { DRAFT: "Draft", PUBLISHED: "Published", ARCHIVED: "Archived" } as const;
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
      modules: { orderBy: { position: "asc" }, include: { _count: { select: { lessons: true } } } },
    },
  });
  if (!course) notFound();
  const instructors = await prisma.instructor.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  const moduleSelect = course.modules.length > 0 ? (
    <label>Module{" "}
      <select aria-label="Module" name="moduleId" defaultValue="">
        <option value="">No module</option>
        {course.modules.map((m) => <option key={m.id} value={m.id}>{m.position}. {m.title}</option>)}
      </select>
    </label>
  ) : null;

  return (
    <main style={{ padding: "16px", fontFamily: "system-ui, sans-serif" }}>
      <h1>{course.title}</h1>
      <p>Status: {STATUS_LABEL[course.status]}</p>
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

      {course.status !== "ARCHIVED" ? (
        <form data-test="publish" action={setPublishedAction}>
          <input type="hidden" name="courseId" value={course.id} />
          <input type="hidden" name="published" value={course.status === "PUBLISHED" ? "false" : "true"} />
          <button type="submit">{course.status === "PUBLISHED" ? "Unpublish" : "Publish"}</button>
        </form>
      ) : null}
      <form action={setArchivedAction}>
        <input type="hidden" name="courseId" value={course.id} />
        <input type="hidden" name="archived" value={course.status === "ARCHIVED" ? "false" : "true"} />
        <button type="submit">{course.status === "ARCHIVED" ? "Restore to draft" : "Archive (retire) this course"}</button>
      </form>

      <h2>Modules</h2>
      <p>Group lessons into modules. Learners see the modules in this order, each with its estimated time.</p>
      {course.modules.length > 0 ? (
        <ol>
          {course.modules.map((m) => (
            <li key={m.id}>
              {m.title}{m.estimatedMinutes ? ` (${m.estimatedMinutes} min)` : ""} · {m._count.lessons} lesson{m._count.lessons === 1 ? "" : "s"}{" "}
              <form action={deleteModuleAction} style={{ display: "inline" }}>
                <input type="hidden" name="courseId" value={course.id} />
                <input type="hidden" name="moduleId" value={m.id} />
                <button type="submit" aria-label={`Remove module ${m.title}`}>Remove</button>
              </form>
            </li>
          ))}
        </ol>
      ) : <p>No modules yet.</p>}
      <form data-test="add-module" action={addModuleAction}>
        <input type="hidden" name="courseId" value={course.id} />
        <label>Module title <input aria-label="Module title" name="title" required /></label>{" "}
        <label>Estimated minutes <input aria-label="Estimated minutes" name="estimatedMinutes" type="number" min={1} max={10000} /></label>{" "}
        <button type="submit">Add module</button>
      </form>

      <h2>Lessons</h2>
      <LessonReorder
        courseId={course.id}
        lessons={course.lessons.map((l) => ({ id: l.id, title: l.title, type: l.type + (l.type === "VIDEO" ? (l.captionFileKey ? ", captions added" : ", captions needed to publish") : "") }))}
      />

      {course.modules.length > 0 && course.lessons.length > 0 ? (
        <form data-test="assign-modules" action={assignModulesAction}>
          <h3>Lesson modules</h3>
          <input type="hidden" name="courseId" value={course.id} />
          {course.lessons.map((l) => (
            <label key={l.id} style={{ display: "block" }}>
              {l.title}{" "}
              <select aria-label={`Module for ${l.title}`} name={`module-${l.id}`} defaultValue={l.moduleId ?? ""}>
                <option value="">No module</option>
                {course.modules.map((m) => <option key={m.id} value={m.id}>{m.position}. {m.title}</option>)}
              </select>
            </label>
          ))}
          <button type="submit">Save lesson modules</button>
        </form>
      ) : null}

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
        {moduleSelect}{" "}
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
        {moduleSelect}{" "}
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
