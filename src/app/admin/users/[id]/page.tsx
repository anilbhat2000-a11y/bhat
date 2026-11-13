import { connection } from "next/server";
import { guardPortal } from "../../../../lib/auth/portal";
import { notFound } from "next/navigation";
import { prisma } from "../../../../lib/db/client";
import { setActiveAction, updateUserAction, uploadUserPhotoAction } from "../../../actions/users";
import { setUserPasswordAction } from "../../../actions/account";

export default async function UserPage({
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
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) notFound();
  const managers = await prisma.user.findMany({ where: { role: { not: "EMPLOYEE" }, NOT: { id } }, orderBy: { name: "asc" } });

  return (
    <main style={{ padding: "16px", fontFamily: "system-ui, sans-serif" }}>
      <h1>{user.name}</h1>
      {error ? <p role="alert">{error}</p> : null}
      {notice ? <p role="status">{notice}</p> : null}

      <form action={updateUserAction}>
        <input type="hidden" name="id" value={user.id} />
        <label>Name <input name="name" defaultValue={user.name} required /></label><br />
        <label>Role
          <select name="role" defaultValue={user.role}>
            <option value="EMPLOYEE">Employee</option>
            <option value="MANAGER">Manager</option>
            <option value="ADMIN">Admin</option>
          </select>
        </label><br />
        <label>Department <input name="department" defaultValue={user.department ?? ""} /></label><br />
        <label>Job title <input name="jobTitle" defaultValue={user.jobTitle ?? ""} /></label><br />
        <label>Manager
          <select name="managerId" defaultValue={user.managerId ?? ""}>
            <option value="">None</option>
            {managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </label><br />
        <button type="submit">Save</button>
      </form>

      <h2>Photo</h2>
      {user.photoFileKey ? <img src={`/api/photos/${user.id}`} alt={`Photo of ${user.name}`} width={96} height={96} /> : <p>No photo yet.</p>}
      <form action={uploadUserPhotoAction} encType="multipart/form-data">
        <input type="hidden" name="id" value={user.id} />
        <input type="file" name="photo" accept="image/png,image/jpeg" required />{" "}
        <button type="submit">Upload photo</button>
      </form>

      <h2>Reset password</h2>
      <form action={setUserPasswordAction}>
        <input type="hidden" name="id" value={user.id} />
        <label>New password (8+ characters) <input name="next" type="password" minLength={8} autoComplete="new-password" required /></label>{" "}
        <button type="submit">Set password</button>
      </form>

      <form action={setActiveAction}>
        <input type="hidden" name="id" value={user.id} />
        <input type="hidden" name="active" value={user.active ? "false" : "true"} />
        <button type="submit">{user.active ? "Deactivate" : "Reactivate"}</button>
      </form>
    </main>
  );
}
