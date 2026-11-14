import { connection } from "next/server";
import { guardPortal } from "../../../lib/auth/portal";
import { prisma } from "../../../lib/db/client";
import { createUserAction, importUsersAction } from "../../actions/users";

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  await connection();
  await guardPortal(["ADMIN"]);
  const { error, notice } = await searchParams;
  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    include: { manager: { select: { name: true } } },
  });
  const managers = users.filter((u) => u.role !== "EMPLOYEE");

  return (
    <main className="page">
      <h1>Users</h1>
      {error ? <p role="alert">{error}</p> : null}
      {notice ? <p role="status">{notice}</p> : null}

      <table>
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Department</th><th>Manager</th><th>Status</th></tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td><a href={`/admin/users/${u.id}`}>{u.name}</a></td>
              <td>{u.email}</td>
              <td><span className="badge">{u.role.charAt(0) + u.role.slice(1).toLowerCase()}</span></td>
              <td>{u.department ?? ""}</td>
              <td>{u.manager?.name ?? ""}</td>
              <td><span className={u.active ? "badge badge-ok" : "badge badge-off"}>{u.active ? "Active" : "Deactivated"}</span></td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Add a user</h2>
      <form data-test="create-user" action={createUserAction}>
        <label>Name <input aria-label="Name" name="name" required /></label>{" "}
        <label>Email <input aria-label="Email" name="email" type="email" required /></label>{" "}
        <label>Role
          <select aria-label="Role" name="role" defaultValue="EMPLOYEE">
            <option value="EMPLOYEE">Employee</option>
            <option value="MANAGER">Manager</option>
            <option value="ADMIN">Admin</option>
          </select>
        </label>{" "}
        <label>Department <input aria-label="Department" name="department" /></label>{" "}
        <label>Job title <input aria-label="Job title" name="jobTitle" /></label>{" "}
        <label>Manager
          <select aria-label="Manager" name="managerId" defaultValue="">
            <option value="">None</option>
            {managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </label>{" "}
        <label>Initial password <input aria-label="Password" name="password" type="password" minLength={8} required /></label>{" "}
        <button type="submit">Create user</button>
      </form>

      <h2>Import users from CSV</h2>
      <p>Columns: name, email, role, department, managerEmail, password. The first row is the header.</p>
      <form data-test="import-users" action={importUsersAction}>
        <textarea aria-label="Csv" name="csv" rows={6} cols={80} required />
        <br />
        <button type="submit">Import</button>
      </form>
    </main>
  );
}
