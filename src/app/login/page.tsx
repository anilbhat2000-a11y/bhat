"use client";

import { useActionState } from "react";
import { login, type LoginState } from "../actions/auth";
import { LEGAL_NAME, LOGO_URL, PORTAL_NAME } from "../../lib/brand";

const initial: LoginState = {};

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, initial);
  return (
    <div className="login-wrap">
      <main className="login-card">
        <p className="login-logo">
          {/* eslint-disable-next-line @next/next/no-img-element -- a small local PNG */}
          <img src={LOGO_URL} alt={`${LEGAL_NAME} logo`} width={232} height={72} />
        </p>
        <p className="login-title">{PORTAL_NAME}</p>
        <p className="login-sub">Training, assessments and certification</p>
        <h1>Sign in</h1>
        <form action={action}>
          <label>
            Email
            <input aria-label="Email" name="email" type="email" autoComplete="username" required />
          </label>
          <label>
            Password
            <input aria-label="Password" name="password" type="password" autoComplete="current-password" required />
          </label>
          {state.error ? <p role="alert">{state.error}</p> : null}
          <button type="submit" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
        </form>
        <p className="login-foot">{LEGAL_NAME}</p>
      </main>
    </div>
  );
}
