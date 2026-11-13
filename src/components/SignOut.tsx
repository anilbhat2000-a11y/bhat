import { logout } from "../app/actions/auth";

// A plain form, so it works without JavaScript.
export function SignOut() {
  return (
    <form action={logout} style={{ textAlign: "right", padding: "8px 16px" }}>
      <button type="submit">Sign out</button>
    </form>
  );
}
