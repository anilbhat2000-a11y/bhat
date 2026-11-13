import { connection } from "next/server";
import { requireSession } from "../../../lib/auth/current-user";
import { prisma } from "../../../lib/db/client";
import { initialsFor } from "../../../lib/profile/initials";
import { saveProfileAction, uploadPhotoAction } from "../../actions/profile";
import { changePasswordAction } from "../../actions/account";

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  await connection();
  const viewer = await requireSession();
  const { error, notice } = await searchParams;
  const [user, subjects] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: viewer.id },
      include: { profileSkills: true, profileEducation: true, profileExperience: true, profileExternalCerts: true, profileLanguages: true },
    }),
    prisma.subject.findMany({ orderBy: { name: "asc" } }),
  ]);
  const skillOf = new Map(user.profileSkills.map((s) => [s.subjectId, s.selfRating]));
  const edu = [...user.profileEducation, null, null, null].slice(0, 3);
  const exp = [...user.profileExperience, null, null, null].slice(0, 3);
  const ext = [...user.profileExternalCerts, null, null, null].slice(0, 3);
  const lang = [...user.profileLanguages, null, null, null].slice(0, 3);

  return (
    <main style={{ padding: "16px", fontFamily: "system-ui, sans-serif" }}>
      <h1>My profile</h1>
      {error ? <p role="alert">{error}</p> : null}
      {notice ? <p role="status">{notice}</p> : null}

      <section>
        <h2>Photo</h2>
        {user.photoFileKey ? <img src={`/api/photos/${user.id}`} alt={`Photo of ${user.name}`} width={96} height={96} /> : <div aria-label="No photo" style={{ width: 96, height: 96, lineHeight: "96px", textAlign: "center", background: "#ddd" }}>{initialsFor(user.name)}</div>}
        <form action={uploadPhotoAction} encType="multipart/form-data">
          <input type="hidden" name="userId" value={user.id} />
          <input type="file" name="photo" accept="image/png,image/jpeg" required />{" "}
          <button type="submit">Upload photo</button>
        </form>
      </section>

      <section>
        <h2>Change password</h2>
        <form action={changePasswordAction}>
          <label>Current password <input name="current" type="password" autoComplete="current-password" required /></label>{" "}
          <label>New password (8+ characters) <input name="next" type="password" minLength={8} autoComplete="new-password" required /></label>{" "}
          <button type="submit">Change password</button>
        </form>
      </section>

      <form action={saveProfileAction}>
        <input type="hidden" name="userId" value={user.id} />
        <h2>Personal details</h2>
        <p>Employment: {user.department ?? "not set"} · {user.jobTitle ?? "no title"} (set by your administrator)</p>
        <label>Phone <input name="phone" defaultValue={user.phone ?? ""} /></label><br />
        <label>Location <input name="location" defaultValue={user.location ?? ""} /></label><br />
        <label>Bio (500 characters) <textarea name="bio" maxLength={500} rows={3} cols={60} defaultValue={user.bio ?? ""} /></label><br />
        <label>Preferred language <input name="preferredLanguage" defaultValue={user.preferredLanguage ?? ""} /></label>

        <h2>Skills (self-rated, 1 to 5)</h2>
        {subjects.map((s) => (
          <label key={s.id} style={{ display: "block" }}>
            {s.name} <input name={`skill_${s.id}`} type="number" min={1} max={5} defaultValue={skillOf.get(s.id) ?? ""} style={{ width: 60 }} />
          </label>
        ))}

        <h2>Education</h2>
        {edu.map((e, i) => (
          <fieldset key={i}>
            <input name={`edu_${i}_institution`} placeholder="Institution" defaultValue={e?.institution ?? ""} />{" "}
            <input name={`edu_${i}_qualification`} placeholder="Qualification" defaultValue={e?.qualification ?? ""} />{" "}
            <input name={`edu_${i}_fieldOfStudy`} placeholder="Field" defaultValue={e?.fieldOfStudy ?? ""} />{" "}
            <input name={`edu_${i}_startYear`} type="number" placeholder="From" defaultValue={e?.startYear ?? ""} />{" "}
            <input name={`edu_${i}_endYear`} type="number" placeholder="To" defaultValue={e?.endYear ?? ""} />
          </fieldset>
        ))}

        <h2>Work experience</h2>
        {exp.map((e, i) => (
          <fieldset key={i}>
            <input name={`exp_${i}_company`} placeholder="Company" defaultValue={e?.company ?? ""} />{" "}
            <input name={`exp_${i}_jobTitle`} placeholder="Job title" defaultValue={e?.jobTitle ?? ""} />{" "}
            <input name={`exp_${i}_startMonth`} placeholder="From (2024-03)" defaultValue={e?.startMonth ?? ""} />{" "}
            <input name={`exp_${i}_endMonth`} placeholder="To (blank if current)" defaultValue={e?.endMonth ?? ""} />{" "}
            <textarea name={`exp_${i}_description`} placeholder="What you did" maxLength={1000} defaultValue={e?.description ?? ""} />
          </fieldset>
        ))}

        <h2>External certifications</h2>
        {ext.map((c, i) => (
          <fieldset key={i}>
            <input name={`ext_${i}_name`} placeholder="Name" defaultValue={c?.name ?? ""} />{" "}
            <input name={`ext_${i}_issuingBody`} placeholder="Issuing body" defaultValue={c?.issuingBody ?? ""} />{" "}
            <input name={`ext_${i}_issuedOn`} type="date" defaultValue={c?.issuedOn ? c.issuedOn.toISOString().slice(0, 10) : ""} />{" "}
            <input name={`ext_${i}_proofUrl`} type="url" placeholder="Proof link" defaultValue={c?.proofUrl ?? ""} />
          </fieldset>
        ))}

        <h2>Languages</h2>
        {lang.map((l, i) => (
          <fieldset key={i}>
            <input name={`lang_${i}_language`} placeholder="Language" defaultValue={l?.language ?? ""} />{" "}
            <select name={`lang_${i}_level`} defaultValue={l?.level ?? "WORKING"}>
              <option value="BASIC">Basic</option>
              <option value="WORKING">Working</option>
              <option value="FLUENT">Fluent</option>
            </select>
          </fieldset>
        ))}

        <button type="submit">Save profile</button>
      </form>
    </main>
  );
}
