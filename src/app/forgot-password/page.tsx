"use client";

import { useActionState } from "react";
import { forgotPasswordAction, type ForgotState } from "../actions/password-reset";
import { LEGAL_NAME, LOGO_URL, PORTAL_NAME } from "../../lib/brand";

const initial: ForgotState = {};

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState(forgotPasswordAction, initial);
  return (
    <div className="login-wrap">
      <main className="login-card">
        <p className="login-logo">
          {/* eslint-disable-next-line @next/next/no-img-element -- a small local PNG */}
          <img src={LOGO_URL} alt={`${LEGAL_NAME} logo`} width={232} height={72} />
        </p>
        <p className="login-title">{PORTAL_NAME}</p>
        <h1>Forgot your password?</h1>
        {state.message ? (
          <>
            <p role="status" className="login-ok">{state.message}</p>
            <p className="login-links"><a href="/login">← Back to sign in</a></p>
          </>
        ) : (
          <>
            <p className="login-sub">Enter the work email address you sign in with. We will help you set a new password.</p>
            <form action={action}>
              <label>
                Work email
                <input aria-label="Email" name="email" type="email" autoComplete="username" required autoFocus />
              </label>
              {state.error ? <p role="alert">{state.error}</p> : null}
              <button type="submit" disabled={pending}>{pending ? "Sending…" : "Reset my password"}</button>
            </form>
            <p className="login-links"><a href="/login">← Back to sign in</a></p>
          </>
        )}
        <p className="login-foot">{LEGAL_NAME}</p>
      </main>
    </div>
  );
}
