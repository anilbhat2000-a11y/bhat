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
import { updateCourseAction } from "../../../actions/account";
import { ACCEPT_ATTRIBUTE, FORMAT_LIST, formatLabel } from "../../../../lib/storage/formats";
import { resumePendingConversions } from "../../../../lib/learning/conversions";
import { assignCourseAction, unassignCourseAction } from "../../../actions/community";
import { feedbackSummary } from "../../../../lib/community/community";

function lessonTypeLabel(l: { type: string; captionFileKey: string | null; conversion: string | null; sourceFileKey: string | null }): string {
  const from = l.sourceFileKey ? ` from ${formatLabel(l.sourceFileKey)}` : "";
  const state = l.conversion === "PENDING" ? ", converting…" : l.conversion === "FAILED" ? ", could not be converted (download only)" : "";
  const captions = l.type === "VIDEO" ? (l.captionFileKey ? ", captions added" : ", captions needed to publish") : "";
  return `${l.type === "DOCUMENT" ? "Document" : l.type}${from}${state}${captions}`;
}

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
  // Picks up any conversion that stopped (for example after a restart); does not wait for it.
  if (course.lessons.some((l) => l.conversion === "PENDING")) void resumePendingConversions(course.id);
  const [instructors, assignments, people, feedback] = await Promise.all([
    prisma.instructor.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.courseAssignment.findMany({ where: { courseId: course.id }, orderBy: { createdAt: "asc" } }),
    prisma.user.findMany({ where: { active: true }, select: { id: true, name: true, department: true, jobTitle: true }, orderBy: { name: "asc" } }),
    feedbackSummary(course.id),
  ]);
  const nameOf = new Map(people.map((p) => [p.id, p.name]));
  const departments = [...new Set(people.map((p) => p.department).filter((x): x is string => !!x))].sort();
  const jobTitles = [...new Set(people.map((p) => p.jobTitle).filter((x): x is string => !!x))].sort();
  const TARGET = { USER: "Person", DEPARTMENT: "Department", JOB_TITLE: "Job title" } as const;
  const moduleSelect = course.modules.length > 0 ? (
    <label>Module{" "}
      <select aria-label="Module" name="moduleId" defaultValue="">
        <option value="">No module</option>
        {course.modules.map((m) => <option key={m.id} value={m.id}>{m.position}. {m.title}</option>)}
      </select>
    </label>
  ) : null;

  return (
    <main className="page">
      <h1>{course.title}</h1>
      <p>Status: {STATUS_LABEL[course.status]}. For: {course.departments.length === 0 ? "everyone" : course.departments.join(", ")}.</p>
      <nav className="subnav" aria-label="Sections on this page"><a href="#assignments">Assignments</a><a href="#feedback">Feedback</a><a href="#modules">Modules</a><a href="#lessons">Lessons</a><a href="#add-lesson">Add lesson</a><a href="#upload">Upload file</a></nav>
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
        <label>Pass mark <input aria-label="Pass mark percent" name="passMarkPercent" type="number" min={1} max={100} defaultValue={course.passMarkPercent} /></label>
        <fieldset>
          <legend>Completion rules</legend>
          <label>Videos: minimum watched before they can be completed (%){" "}
            <input name="minVideoWatchPercent" type="number" min={0} max={100} defaultValue={course.minVideoWatchPercent} aria-describedby="video-rule-help" />
          </label>
          <small id="video-rule-help"> 0 means no rule. Skipping ahead does not count as watched.</small>
          <br />
          <label><input name="requireAssessmentPass" type="checkbox" defaultChecked={course.requireAssessmentPass} /> The course is complete only after its assessment is passed</label>
        </fieldset>
        <fieldset>
          <legend>Who is this course for?</legend>
          <small className="fieldset-help">Leave every box empty to show the course to everyone. Tick departments to show it only to them (people outside can still take it if it is assigned to them).</small>
          <div className="check-grid">
            {[...new Set([...departments, ...course.departments])].sort().map((d) => (
              <label key={d}><input type="checkbox" name="department" value={d} defaultChecked={course.departments.includes(d)} /> {d}</label>
            ))}
          </div>
          <label>Other departments (comma-separated) <input name="otherDepartments" aria-label="Other departments" /></label>
        </fieldset>
        <button type="submit">Save course</button>
      </form>
      <p className="no-print"><a href={`/admin/courses/${course.id}/modify`}>Modify details and status</a> · <a href={`/admin/courses/${course.id}/delete`} className="danger-link">Delete this course</a></p>

      <div className="action-bar">
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
        <button type="submit" className={course.status === "ARCHIVED" ? "" : "btn-danger"}>{course.status === "ARCHIVED" ? "Restore to draft" : "Archive (retire) this course"}</button>
      </form>
      </div>

      <h2 id="assignments">Assignments</h2>
      <p>Make this course mandatory for a person, a whole department, or everyone with a job title. Department and job-title assignments include people who join later. Learners see assigned courses and due dates on their home page, and get reminders 3 days before, on the day, and when overdue.</p>
      {course.status !== "PUBLISHED" ? <p>Publish the course before assigning it.</p> : (
        <form data-test="assign-course" action={assignCourseAction}>
          <input type="hidden" name="courseId" value={course.id} />
          <input type="hidden" name="returnTo" value={`/admin/courses/${course.id}`} />
          <fieldset>
            <legend>Assign to</legend>
            <label>Who{" "}
              <select name="targetType" defaultValue="DEPARTMENT" aria-label="Assign to">
                <option value="DEPARTMENT">Department</option>
                <option value="JOB_TITLE">Job title</option>
                <option value="USER">Person (choose below)</option>
              </select>
            </label>{" "}
            <label>Department, job title or person{" "}
              <input name="targetValue" list="assign-targets" required aria-label="Department, job title or person" />
            </label>
            <datalist id="assign-targets">
              {departments.map((d) => <option key={`d-${d}`} value={d}>Department</option>)}
              {jobTitles.map((t) => <option key={`t-${t}`} value={t}>Job title</option>)}
              {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </datalist>{" "}
            <label>Due date (optional) <input name="dueDate" type="date" /></label>{" "}
            <button type="submit">Assign course</button>
          </fieldset>
        </form>
      )}
      {assignments.length === 0 ? <p>Not assigned to anyone yet.</p> : (
        <ul>
          {assignments.map((a) => (
            <li key={a.id}>
              {TARGET[a.targetType]}: {a.targetType === "USER" ? nameOf.get(a.targetValue) ?? "(removed user)" : a.targetValue}
              {a.dueAt ? `, due ${a.dueAt.toISOString().slice(0, 10)}` : ", no due date"}{" "}
              <form action={unassignCourseAction} style={{ display: "inline" }}>
                <input type="hidden" name="assignmentId" value={a.id} />
                <input type="hidden" name="returnTo" value={`/admin/courses/${course.id}`} />
                <button type="submit">Remove</button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <h2 id="feedback">Learner feedback</h2>
      {feedback.count === 0 ? <p>No feedback yet.</p> : (
        <>
          <p>{feedback.count} response{feedback.count === 1 ? "" : "s"}, average usefulness {feedback.average} of 5.</p>
          <ul>{feedback.comments.slice(0, 20).map((c, i) => <li key={i}>{c.rating}/5, {c.name}: {c.comment}</li>)}</ul>
        </>
      )}
      {course.status !== "DRAFT" ? <p><a href={`/learn/courses/${course.id}#qa`}>Open the course Q&amp;A to answer or moderate questions</a></p> : null}

      <h2 id="modules">Modules</h2>
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

      <h2 id="lessons">Lessons</h2>
      <LessonReorder
        courseId={course.id}
        lessons={course.lessons.map((l) => ({ id: l.id, title: l.title, type: lessonTypeLabel(l) }))}
      />

      <div className="card no-print" data-test="text-lesson-tools">
        <h3>Edit text and use the AI assistant</h3>
        {course.lessons.some((l) => l.type === "TEXT") ? (
          <ul>
            {course.lessons.filter((l) => l.type === "TEXT").map((l) => (
              <li key={l.id}>
                {l.title} · <a href={`/admin/courses/${course.id}/lessons/${l.id}`}>Edit text</a> · <a href={`/admin/ai?lesson=${l.id}`}>Improve with AI</a>
              </li>
            ))}
          </ul>
        ) : <p className="muted">This course has no text lessons.</p>}
        <p><a href={`/admin/ai?course=${course.id}`}>Write completion-check questions with AI</a></p>
      </div>

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

      <h2 id="add-lesson">Add a text, link, lab, or live session lesson</h2>
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

      <h2 id="upload">Upload a file lesson</h2>
      <p className="muted">Accepted: {FORMAT_LIST}. PowerPoint, Word and Excel files are converted to PDF so learners can read them in the browser, and MOV or MKV videos to MP4; learners can also download the original. Leave the title empty to use the file name.</p>
      <form data-test="upload-lesson" action="/api/upload/lesson" method="post" encType="multipart/form-data">
        <input type="hidden" name="courseId" value={course.id} />
        <input aria-label="Title" name="title" placeholder="Title (optional)" />{" "}
        {moduleSelect}{" "}
        <input aria-label="File" name="file" type="file" accept={ACCEPT_ATTRIBUTE} required />{" "}
        <button type="submit">Upload</button>
      </form>
      <p><a href="/admin/courses/bulk">Bulk upload courses from Excel</a></p>
    </main>
  );
}
