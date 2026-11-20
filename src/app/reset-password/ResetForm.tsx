"use client";

import { useActionState } from "react";
import { resetPasswordAction, type ResetState } from "../actions/password-reset";

const initial: ResetState = {};

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, initial);
  return (
    <form action={action}>
      <input type="hidden" name="token" value={token} />
      <label>
        New password
        <input aria-label="New password" name="password" type="password" autoComplete="new-password" minLength={8} required autoFocus />
      </label>
      <label>
        Type it again
        <input aria-label="Confirm new password" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
      </label>
      <p className="login-hint">At least 8 characters, with at least one letter and one number.</p>
      {state.error ? <p role="alert">{state.error}</p> : null}
      <button type="submit" disabled={pending}>{pending ? "Saving…" : "Set new password"}</button>
    </form>
  );
}
