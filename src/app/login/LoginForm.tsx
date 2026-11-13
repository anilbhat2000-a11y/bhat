"use client";

import { useActionState } from "react";
import { login, type LoginState } from "../actions/auth";

const initial: LoginState = {};

export default function LoginForm() {
  const [state, action, pending] = useActionState(login, initial);
  return (
    <main style={{ maxWidth: 360, margin: "4rem auto", padding: "0 16px", fontFamily: "system-ui, sans-serif" }}>
      <h1>Sign in</h1>
      <form action={action}>
        <label>
          Email
          <input aria-label="Email" name="email" type="email" autoComplete="username" required style={{ display: "block", width: "100%", marginBottom: 12 }} />
        </label>
        <label>
          Password
          <input aria-label="Password" name="password" type="password" autoComplete="current-password" required style={{ display: "block", width: "100%", marginBottom: 12 }} />
        </label>
        {state.error ? <p role="alert">{state.error}</p> : null}
        <button type="submit" disabled={pending}>Sign in</button>
      </form>
    </main>
  );
}
