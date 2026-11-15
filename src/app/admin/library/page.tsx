import { connection } from "next/server";
import Link from "next/link";
import { guardPortal } from "../../../lib/auth/portal";
import { listLibrary, KIND_LABEL, sizeText, type LibraryFilters } from "../../../lib/library/library";
import { ACCEPT_ATTRIBUTE } from "../../../lib/storage/formats";
import type { FileFamily } from "../../../lib/storage/formats";

type Search = { q?: string; kind?: string; tag?: string; sort?: string; error?: string; notice?: string };
const KINDS: FileFamily[] = ["PDF", "VIDEO", "OFFICE", "IMAGE", "HTML"];
const KIND_ICON: Record<FileFamily, string> = { PDF: "PDF", VIDEO: "▶", OFFICE: "DOC", IMAGE: "IMG", HTML: "</>" };

const day = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

// The content library: upload once, find again, preview, and reuse in any course.
export default async function LibraryPage({ searchParams }: { searchParams: Promise<Search> }) {
  await connection();
  const actor = await guardPortal(["ADMIN"]);
  const sp = await searchParams;
  const filters: LibraryFilters = {
    q: sp.q?.trim().slice(0, 100) || undefined,
    kind: KINDS.find((k) => k === sp.kind),
    tag: sp.tag || undefined,
    sort: (["new", "old", "name", "size"] as const).find((s) => s === sp.sort) ?? "new",
  };
  const lib = await listLibrary(actor, filters);
  const docMb = Number(process.env.MAX_UPLOAD_MB_DOC ?? 50);
  const videoMb = Number(process.env.MAX_UPLOAD_MB_VIDEO ?? 500);
  const officeMb = Number(process.env.MAX_UPLOAD_MB_OFFICE ?? 100);
  const picMb = Number(process.env.MAX_UPLOAD_MB_PICTURE ?? 20);
  const htmlMb = Number(process.env.MAX_UPLOAD_MB_HTML ?? 50);
  const link = (patch: Partial<Search>) => {
    const p = new URLSearchParams();
    const merged = { q: filters.q, kind: filters.kind, tag: filters.tag, sort: filters.sort === "new" ? undefined : filters.sort, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s = p.toString();
    return `/admin/library${s ? `?${s}` : ""}`;
  };

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1>Content library</h1>
          <p className="muted">Store your training material in one place: PDFs, videos, PowerPoint, Word and Excel files, JPEG and PNG images, and HTML pages. Upload once, then add any file to one or more courses as a lesson. PowerPoint, Word and Excel files are converted to PDF and MOV or MKV videos to MP4 so they open in the browser; the original is always kept.</p>
        </div>
        <div className="page-actions"><a className="btn" href="#upload">Upload files</a></div>
      </div>
      {sp.error ? <p role="alert">{sp.error}</p> : null}
      {sp.notice ? <p role="status">{sp.notice}</p> : null}

      <section className="stat-row lib-stats" aria-label="Summary">
        <div><strong>{lib.total}</strong><span>Files</span></div>
        <div><strong>{sizeText(lib.totalBytes)}</strong><span>Storage used</span></div>
        {KINDS.map((k) => <div key={k}><strong>{lib.counts[k]}</strong><span>{KIND_LABEL[k]}{lib.counts[k] === 1 ? "" : "s"}</span></div>)}
      </section>

      <nav className="status-chips" aria-label="Filter by type">
        <Link href={link({ kind: undefined })} aria-current={!filters.kind ? "page" : undefined}>All <span>{lib.total}</span></Link>
        {KINDS.map((k) => <Link key={k} href={link({ kind: k })} aria-current={filters.kind === k ? "page" : undefined}>{KIND_LABEL[k]}s <span>{lib.counts[k]}</span></Link>)}
      </nav>
      <form method="get" className="toolbar" aria-label="Search the library">
        {filters.kind ? <input type="hidden" name="kind" value={filters.kind} /> : null}
        <label>Search <input type="search" name="q" defaultValue={filters.q ?? ""} placeholder="Title, file name or tag" aria-label="Search the library" /></label>
        <label>Tag
          <select name="tag" defaultValue={filters.tag ?? ""} aria-label="Tag">
            <option value="">All tags</option>
            {lib.tags.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label>Sort
          <select name="sort" defaultValue={filters.sort} aria-label="Sort">
            <option value="new">Newest first</option>
            <option value="old">Oldest first</option>
            <option value="name">Title A–Z</option>
            <option value="size">Largest first</option>
          </select>
        </label>
        <button type="submit">Apply</button>
        <a href="/admin/library" className="clear-link">Clear</a>
      </form>

      {lib.items.length === 0 ? (
        <p className="muted">{lib.total === 0 ? "The library is empty. Upload your first files below." : "No files match these filters."}</p>
      ) : (
        <ul className="lib-grid" data-test="library-grid">
          {lib.items.map((i) => {
            const kind = i.kind as FileFamily;
            return (
              <li key={i.id} className="lib-card">
                <a href={`/admin/library/${i.id}`} className="lib-thumb" data-kind={kind} aria-label={`Open ${i.title}`}>
                  {kind === "IMAGE"
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={`/api/library/${i.id}`} alt="" loading="lazy" />
                    : <span className="lib-icon" aria-hidden="true">{KIND_ICON[kind]}</span>}
                </a>
                <div className="lib-body">
                  <a href={`/admin/library/${i.id}`} className="lib-title">{i.title}</a>
                  <span className="lib-meta">
                    <span className={`lib-kind lib-kind-${kind.toLowerCase()}`}>{KIND_LABEL[kind]}</span>
                    {sizeText(i.sizeBytes)} · {day(i.createdAt)}
                  </span>
                  {i.conversion === "PENDING" ? <span className="lib-state">Converting for viewing…</span> : null}
                  {i.conversion === "FAILED" ? <span className="lib-state lib-bad">Could not be converted: download only</span> : null}
                  {i.tags.length > 0 ? <span className="lib-tags">{i.tags.map((t) => <a key={t} href={link({ tag: t })} className="lib-tag">{t}</a>)}</span> : null}
                  <span className="lib-used">{i.usedIn === 0 ? "Not used in a course yet" : `Used in ${i.usedIn} lesson${i.usedIn === 1 ? "" : "s"}`}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <section className="card" id="upload" aria-labelledby="h-up">
        <h2 id="h-up">Upload files</h2>
        <p className="muted">Choose up to 50 files at once. Size limits: PDF {docMb} MB, PowerPoint, Word and Excel {officeMb} MB, video {videoMb} MB, images {picMb} MB, HTML {htmlMb} MB each. An HTML page must be a single file (images inside it, or linked from the web).</p>
        <form action="/api/upload/library" method="post" encType="multipart/form-data" data-test="library-upload" className="lib-upload">
          <label className="field lib-drop">
            <span className="field-label">Files</span>
            <input type="file" name="files" multiple required accept={ACCEPT_ATTRIBUTE} aria-label="Files to upload" />
            <span className="field-help">PDF, PPT/PPTX, DOC/DOCX, XLS/XLSX, MP4, MOV, MKV, JPG/JPEG, PNG, HTML.</span>
          </label>
          <label className="field">
            <span className="field-label">Tags (optional)</span>
            <input name="tags" maxLength={600} placeholder="For example: Networking, Onboarding, 2026" aria-label="Tags" />
            <span className="field-help">Comma-separated. Applied to every file in this upload, to help you find them later.</span>
          </label>
          <details className="lib-more">
            <summary>Title and description (when uploading one file)</summary>
            <label className="field"><span className="field-label">Title</span><input name="title" maxLength={200} aria-label="Title" placeholder="Leave empty to use the file name" /></label>
            <label className="field"><span className="field-label">Description</span><textarea name="description" rows={2} maxLength={2000} aria-label="Description" /></label>
          </details>
          <div className="form-actions"><button type="submit" className="btn-primary">Upload to the library</button></div>
        </form>
      </section>
    </main>
  );
}
