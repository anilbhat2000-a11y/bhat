import { connection } from "next/server";
import { notFound } from "next/navigation";
import { guardPortal } from "../../../../lib/auth/portal";
import { prisma } from "../../../../lib/db/client";
import { getLibraryItem, KIND_LABEL, sizeText } from "../../../../lib/library/library";
import { formatLabel, type FileFamily } from "../../../../lib/storage/formats";
import { deleteLibraryItemAction, updateLibraryItemAction, useInCourseAction } from "../../../actions/library";

const when = (d: Date) => d.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });

// One library file: preview it, edit its details, add it to a course, or delete it.
export default async function LibraryItemPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; notice?: string }> }) {
  await connection();
  const actor = await guardPortal(["ADMIN"]);
  const { id } = await params;
  const sp = await searchParams;
  const item = await getLibraryItem(actor, id);
  if (!item) notFound();
  const [courses, uploader] = await Promise.all([
    prisma.course.findMany({ where: { status: { not: "ARCHIVED" } }, orderBy: { title: "asc" }, select: { id: true, title: true, status: true } }),
    prisma.user.findUnique({ where: { id: item.uploadedById }, select: { name: true } }),
  ]);
  const kind = item.kind as FileFamily;
  const src = `/api/library/${item.id}`;
  const original = item.sourceFileKey ? `${src}?original=1` : `${src}?download=1`;
  const viewable = item.conversion !== "PENDING" && !(kind === "OFFICE" && item.conversion !== "DONE");

  return (
    <main className="page">
      {item.conversion === "PENDING" ? <meta httpEquiv="refresh" content="10" /> : null}
      <p><a href="/admin/library">← Content library</a></p>
      <div className="page-head">
        <div>
          <h1>{item.title}</h1>
          <p className="muted"><span className={`lib-kind lib-kind-${kind.toLowerCase()}`}>{KIND_LABEL[kind]}</span> {item.fileName} · {sizeText(item.sizeBytes)}</p>
        </div>
        <div className="page-actions"><a className="btn-outline" href={original}>Download {item.sourceFileKey ? `original ${formatLabel(item.sourceFileKey)}` : "file"}</a></div>
      </div>
      {sp.error ? <p role="alert">{sp.error}</p> : null}
      {sp.notice ? <p role="status">{sp.notice}</p> : null}

      <div className="lib-detail">
        <section className="card lib-preview" aria-label="Preview">
          {item.conversion === "PENDING" ? (
            <div className="lib-wait"><strong>Converting for viewing…</strong><p className="muted">PowerPoint, Word and Excel files become PDF, and MOV or MKV videos become MP4. This page refreshes by itself.</p></div>
          ) : !viewable ? (
            <div className="lib-wait"><strong>This file could not be converted for viewing.</strong><p className="muted">{item.conversionError ?? ""} It can still be downloaded, and added to a course as a download.</p></div>
          ) : kind === "VIDEO" ? (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video src={src} controls preload="metadata" className="lib-video" />
          ) : kind === "IMAGE" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt={item.title} className="lib-image" />
          ) : kind === "HTML" ? (
            <iframe src={src} title={`${item.title} (HTML page)`} className="html-frame" sandbox="allow-scripts allow-popups allow-forms allow-modals" />
          ) : (
            <iframe src={src} title={`${item.title} (document)`} className="pdf-frame" />
          )}
          {viewable ? <p className="muted"><a href={src} target="_blank" rel="noopener noreferrer">Open in a new tab</a>{kind === "HTML" ? " · HTML pages run in a sandbox and cannot reach the portal or anyone's session." : ""}</p> : null}
        </section>

        <div className="lib-side">
          <section className="card" aria-labelledby="h-use">
            <h2 id="h-use">Add to a course</h2>
            <p className="muted">Creates a new lesson at the end of the course, using this file. The file is shared, not copied.{kind === "VIDEO" ? " Videos need a caption file before the course can be published." : ""}</p>
            <form action={useInCourseAction} data-test="library-use">
              <input type="hidden" name="id" value={item.id} />
              <label className="field"><span className="field-label">Course</span>
                <select name="courseId" required defaultValue="" aria-label="Course">
                  <option value="" disabled>Choose a course</option>
                  {courses.map((c) => <option key={c.id} value={c.id}>{c.title}{c.status === "DRAFT" ? " (draft)" : ""}</option>)}
                </select>
              </label>
              <label className="field"><span className="field-label">Lesson title</span><input name="title" defaultValue={item.title} maxLength={200} aria-label="Lesson title" /></label>
              <div className="form-actions"><button type="submit" className="btn-primary" disabled={item.conversion === "PENDING"}>Add as a lesson</button></div>
            </form>
          </section>

          <section className="card" aria-labelledby="h-details">
            <h2 id="h-details">Details</h2>
            <form action={updateLibraryItemAction} data-test="library-edit">
              <input type="hidden" name="id" value={item.id} />
              <label className="field"><span className="field-label">Title</span><input name="title" required maxLength={200} defaultValue={item.title} aria-label="Title" /></label>
              <label className="field"><span className="field-label">Description</span><textarea name="description" rows={3} maxLength={2000} defaultValue={item.description ?? ""} aria-label="Description" /></label>
              <label className="field"><span className="field-label">Tags</span><input name="tags" maxLength={600} defaultValue={item.tags.join(", ")} aria-label="Tags" /><span className="field-help">Comma-separated.</span></label>
              <div className="form-actions"><button type="submit" className="btn-primary">Save details</button></div>
            </form>
            <dl className="lib-facts">
              <dt>File</dt><dd>{item.fileName}</dd>
              <dt>Type</dt><dd>{formatLabel(item.sourceFileKey ?? item.fileKey)}{item.conversion === "DONE" ? ` (shown as ${formatLabel(item.fileKey)})` : ""}</dd>
              <dt>Size</dt><dd>{sizeText(item.sizeBytes)}</dd>
              <dt>Uploaded</dt><dd>{when(item.createdAt)}{uploader ? ` by ${uploader.name}` : ""}</dd>
            </dl>
          </section>

          <section className="card" aria-labelledby="h-usedin">
            <h2 id="h-usedin">Used in</h2>
            {item.lessons.length === 0 ? <p className="muted">Not used in any course yet.</p> : (
              <ul>{item.lessons.map((l) => <li key={l.id}><a href={`/admin/courses/${l.course.id}`}>{l.course.title}</a>: {l.title}</li>)}</ul>
            )}
            {item.lessons.length === 0 ? (
              <form action={deleteLibraryItemAction}>
                <input type="hidden" name="id" value={item.id} />
                <button type="submit" className="btn-danger" data-test="library-delete">Delete from the library</button>
              </form>
            ) : <p className="muted">A file used in a lesson cannot be deleted. Remove the lessons first.</p>}
          </section>
        </div>
      </div>
    </main>
  );
}
