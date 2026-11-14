"use client";

import { useActionState } from "react";
import { login, type LoginState } from "../actions/auth";
import { LEGAL_NAME, LOGO_URL, PORTAL_NAME } from "../../lib/brand";

const initial: LoginState = {};

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, initial);
  return (
    <main style={{ maxWidth: 360, margin: "4rem auto", padding: "0 16px", fontFamily: "system-ui, sans-serif" }}>
      <p style={{ textAlign: "center", margin: "0 0 8px" }}>
        <span className="logo-chip">
          {/* eslint-disable-next-line @next/next/no-img-element -- a small local PNG */}
          <img src={LOGO_URL} alt={`${LEGAL_NAME} logo`} width={240} height={75} style={{ height: 75, width: "auto" }} />
        </span>
      </p>
      <p style={{ textAlign: "center", fontWeight: 700, margin: "0 0 24px" }}>{PORTAL_NAME}</p>
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
